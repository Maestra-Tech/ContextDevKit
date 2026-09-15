/**
 * Write-risk observation for the `simulation` gate (ADR-0165, WF-0118).
 *
 * Produces one domain fact for a write-preflight event: the target path matches a
 * configured high-risk path or contract glob (`config.l5`), and whether an explicit
 * blast-radius prediction (`mark-simulation.mjs`) already covers that path for this
 * session. The gate stays canary; this module never decides, it only observes.
 *
 * Zero third-party dependencies; every failure degrades to `null` (no observation),
 * never to a fabricated `passed`.
 */
import { closeSync, existsSync, openSync, readSync, readdirSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { loadConfigSync } from '../config/load.mjs';
import { PLATFORM_DIR, pathsFor } from '../config/paths.mjs';
import { matchHighRisk } from './path-classification.mjs';

/** Host tools whose payload names one target file. Bash and MCP writes are opaque. */
const FILE_WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

/** Same identity keys `mark-simulation.mjs` uses to stamp a prediction id. */
const SESSION_ENV_KEYS = Object.freeze([
  'CONTEXTKIT_SESSION_ID',
  'CODEX_THREAD_ID',
  'CLAUDE_SESSION_ID',
  'ANTIGRAVITY_SESSION_ID',
  'AGY_SESSION_ID',
  'GROK_SESSION_ID',
]);

/** Bounded read: prediction metadata lives in the first lines of the file. */
const PREDICTION_HEAD_LINES = 24;
/** Bytes read per candidate prediction; the metadata head never exceeds this. */
const PREDICTION_HEAD_BYTES = 4096;

/**
 * Reads only the head of a file. A prediction store can hold hundreds of files;
 * reading each one whole costs hundreds of milliseconds inside a hook.
 *
 * @param {string} path absolute file path
 * @returns {string} first bytes decoded as UTF-8
 */
function readHead(path) {
  const descriptor = openSync(path, 'r');
  try {
    const buffer = Buffer.alloc(PREDICTION_HEAD_BYTES);
    const bytesRead = readSync(descriptor, buffer, 0, PREDICTION_HEAD_BYTES, 0);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    closeSync(descriptor);
  }
}

/** @param {string} value @returns {string} */
function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/**
 * Resolves the repo-relative, forward-slashed path a file-writing tool targets.
 *
 * @param {Record<string, any>} payload normalized host payload
 * @param {string} root project root
 * @returns {string|null} contained relative path, or null when absent or escaping
 */
export function resolveWritePath(payload, root) {
  const toolName = String(payload?.tool_name ?? payload?.toolName ?? payload?.tool?.name ?? '');
  if (!FILE_WRITE_TOOLS.has(toolName)) return null;
  const input = payload?.tool_input ?? payload?.toolInput ?? {};
  const candidate = input.file_path ?? input.filePath ?? input.notebook_path ?? input.path;
  if (typeof candidate !== 'string' || candidate.trim() === '') return null;
  const absolutePath = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate);
  const relativePath = relative(resolve(root), absolutePath).replaceAll('\\', '/');
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith('../')) return null;
  return relativePath;
}

/**
 * Converts one contract glob (`**`, `*`, `?`) into an anchored RegExp.
 *
 * @param {string} glob forward-slashed glob
 * @returns {RegExp} anchored matcher
 */
export function globToRegExp(glob) {
  let pattern = '';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === '*') {
      if (glob[index + 1] === '*') {
        const swallowSlash = glob[index + 2] === '/';
        pattern += swallowSlash ? '(?:.*/)?' : '.*';
        index += swallowSlash ? 2 : 1;
      } else {
        pattern += '[^/]*';
      }
    } else if (character === '?') {
      pattern += '[^/]';
    } else {
      pattern += character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${pattern}$`);
}

/**
 * Returns the first `config.l5.contractGlobs` entry matching the target, or null.
 *
 * @param {string} targetPath repo-relative, forward-slashed
 * @param {unknown} contractGlobs configured globs
 * @returns {string|null}
 */
export function matchContractGlob(targetPath, contractGlobs) {
  if (!Array.isArray(contractGlobs)) return null;
  for (const entry of contractGlobs) {
    if (typeof entry !== 'string' || entry.trim() === '') continue;
    const glob = entry.trim().replaceAll('\\', '/');
    try {
      if (globToRegExp(glob).test(targetPath)) return glob;
    } catch {
      /* a malformed glob never matches; it is reported by config validation, not here */
    }
  }
  return null;
}

/** @param {NodeJS.ProcessEnv|Record<string, any>} env @returns {string} slugified identity or '' */
function sessionIdentity(env) {
  for (const key of SESSION_ENV_KEYS) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim() !== '') return slugify(value).slice(0, 20);
  }
  return '';
}

/**
 * Parses the metadata head of one prediction file written by `mark-simulation.mjs`.
 *
 * @param {string} content file content
 * @returns {{predictionId:string,date:string,coveredPaths:string[]}|null}
 */
export function parsePredictionHead(content) {
  const lines = String(content ?? '').split(/\r?\n/).slice(0, PREDICTION_HEAD_LINES);
  const predictionId = lines.find((line) => /^- \*\*Prediction ID\*\*:/.test(line))?.replace(/^- \*\*Prediction ID\*\*:\s*/, '').trim() ?? '';
  const date = lines.find((line) => /^- \*\*Date\*\*:/.test(line))?.replace(/^- \*\*Date\*\*:\s*/, '').trim() ?? '';
  const coveredLine = lines.find((line) => /^- \*\*Covered paths\*\*:/.test(line));
  if (!coveredLine) return null;
  const coveredPaths = coveredLine
    .replace(/^- \*\*Covered paths\*\*:\s*/, '')
    .split(',')
    .map((entry) => entry.trim().replaceAll('\\', '/'))
    .filter((entry) => entry !== '' && entry !== '—');
  return { predictionId, date, coveredPaths };
}

/** @param {string} targetPath @param {string} coveredPath @returns {boolean} */
function coveredPathMatches(targetPath, coveredPath) {
  if (coveredPath === '.' || coveredPath === './') return true;
  if (coveredPath.endsWith('/')) return targetPath.startsWith(coveredPath);
  return targetPath === coveredPath;
}

/**
 * Finds an explicit prediction that covers the target for this session. A
 * prediction counts when its covered paths include the target and it was either
 * stamped with the current session identity or written today — an older prediction
 * from another session is not evidence for this write.
 *
 * @param {string} root project root
 * @param {string} targetPath repo-relative, forward-slashed
 * @param {NodeJS.ProcessEnv|Record<string, any>} env process environment
 * @param {{today?:string}} [options] injectable clock (ISO date)
 * @returns {{covered:boolean,predictionId:string|null}}
 */
export function findCoveringPrediction(root, targetPath, env, options = {}) {
  const predictionsDirectory = pathsFor(root).predictions;
  if (!existsSync(predictionsDirectory)) return { covered: false, predictionId: null };
  const identity = sessionIdentity(env);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  let files = [];
  try {
    // The coverage rule (same session identity or written today) is visible in the
    // file name `<date>-<identity>-<slug>.md`, so every other file is skipped unread.
    files = readdirSync(predictionsDirectory)
      .filter((name) => name.endsWith('.md') && (name.startsWith(today) || (identity !== '' && name.includes(`-${identity}-`))))
      .sort()
      .reverse();
  } catch {
    return { covered: false, predictionId: null };
  }
  for (const file of files) {
    let head;
    try {
      head = parsePredictionHead(readHead(resolve(predictionsDirectory, file)));
    } catch {
      continue;
    }
    if (!head || !head.coveredPaths.some((coveredPath) => coveredPathMatches(targetPath, coveredPath))) continue;
    const sameSession = identity !== '' && head.predictionId.includes(`-${identity}-`);
    if (sameSession || head.date === today) return { covered: true, predictionId: head.predictionId || file };
  }
  return { covered: false, predictionId: null };
}

/**
 * Observes one file write against `config.l5.highRiskPaths` / `contractGlobs`.
 *
 * @param {string} root project root
 * @param {Record<string, any>} payload normalized host payload
 * @param {NodeJS.ProcessEnv|Record<string, any>} env process environment
 * @param {{today?:string}} [options] injectable clock
 * @returns {object|null} `simulation` observation, or null when the write is not
 *   a configured risk (or when the fact cannot be established)
 */
export function observeWriteRisk(root, payload, env = process.env, options = {}) {
  try {
    const targetPath = resolveWritePath(payload, root);
    if (!targetPath) return null;
    const level5 = loadConfigSync(root)?.l5 ?? {};
    const riskEntry = matchHighRisk(targetPath, level5.highRiskPaths) ?? matchContractGlob(targetPath, level5.contractGlobs);
    if (!riskEntry) return null;
    const coverage = findCoveringPrediction(root, targetPath, env, options);
    const base = { deterministic: true, applicable: true, evidenced: true, targetPath, riskEntry };
    if (coverage.covered) {
      return { ...base, status: 'passed', predictionId: coverage.predictionId };
    }
    return {
      ...base,
      status: 'violated',
      problemKey: `simulation:${riskEntry}`,
      visibleMessage: `Impact analysis before write: "${targetPath}" matches the high-risk/contract entry "${riskEntry}" and no prediction covers it for this session. Read the bounded blast radius first (node ${PLATFORM_DIR}/tools/scripts/graph.mjs impact ${targetPath} --top 8), then record it: node ${PLATFORM_DIR}/tools/scripts/mark-simulation.mjs --write "<objective>" ${targetPath}`,
    };
  } catch {
    return null;
  }
}
