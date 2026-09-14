/**
 * Boot-context content readers — pure I/O for `governance-session-context.mjs`.
 *
 * Each function reads ONE source artifact and returns a Markdown snippet (or
 * null when missing/empty). All helpers are defensive — they never throw.
 * Zero third-party deps.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CHANGELOG, MEMORY_DIR, pathsFor } from '../config/paths.mjs';
import { parseSessionLog, renderDigest } from './session-digest-core.mjs';
import { clip, stripMd } from './md-extract.mjs';
import {
  readGovernedWorkflowContext as loadGovernedWorkflowContext,
  renderGovernedWorkflowContext as renderLoadedWorkflowContext,
} from '../authority-reader.mjs';

const SECTION_LIMIT = 60;

/** Matches `<YYYY-MM-DD>-<NN>-<slug>.md`. Slug allows `a-z0-9._-`. */
const ENTRY_PATTERN = /^(\d{4}-\d{2}-\d{2})-(\d{2,})-([a-z0-9._-]+)\.md$/;
const WORKFLOW_REFERENCE_PATTERN = /\bWF-\d{4}\b/g;

async function readSafe(root, relPath) {
  try {
    return await readFile(resolve(root, relPath), 'utf-8');
  } catch {
    return null;
  }
}

export async function exists(root, relPath) {
  try {
    await stat(resolve(root, relPath));
    return true;
  } catch {
    return false;
  }
}

/** Newest session file (canonical number; later DATE breaks a numbering tie) + its content. */
async function latestSessionEntry(root) {
  const paths = pathsFor(root);
  let files = [];
  try {
    files = await readdir(paths.sessions);
  } catch {
    return null;
  }
  const entries = files
    .map((f) => ENTRY_PATTERN.exec(f))
    .filter(Boolean)
    .map((m) => ({ filename: m[0], date: m[1], num: Number.parseInt(m[2], 10) }))
    // Session number is canonical; on a number collision the later DATE wins so
    // the boot banner never shows a stale entry just because of a numbering clash.
    .sort((a, b) => b.num - a.num || b.date.localeCompare(a.date));
  if (entries.length === 0) return null;
  const sessionPath = resolve(paths.sessions, entries[0].filename);
  const content = await readFile(sessionPath, 'utf-8').catch(() => null);
  if (!content) return null;
  return { filename: entries[0].filename, content, path: sessionPath };
}

/** Most recent registered session as a raw-truncated Markdown snippet + its path. */
export async function extractLatestSession(root) {
  const entry = await latestSessionEntry(root);
  if (!entry) return null;
  const lines = entry.content.split('\n').slice(0, SECTION_LIMIT);
  return { path: entry.path, content: lines.join('\n').trim() };
}

/**
 * Compact ~6-line digest of the latest session for the boot banner [ADR-0027].
 * Falls back to the raw-truncated snippet when the log can't be parsed — a digest
 * miss degrades visibly, it never empties the banner (rules 2 & 8).
 * @returns {Promise<?{path:string, content:string, mode:'digest'|'raw'}>}
 */
export async function digestLatestSession(root) {
  const entry = await latestSessionEntry(root);
  if (!entry) return null;
  const workflowRef = [...new Set(entry.content.match(WORKFLOW_REFERENCE_PATTERN) ?? [])][0] ?? null;
  const governedContext = workflowRef
    ? readGovernedWorkflowContext(root, workflowRef)
    : null;
  const governedContextText = governedContext
    ? renderGovernedWorkflowContext(governedContext)
    : null;
  const digest = renderDigest(parseSessionLog(entry.content, entry.filename));
  if (digest) return { path: entry.path, content: digest, mode: 'digest', governedContext, governedContextText };
  const lines = entry.content.split('\n').slice(0, SECTION_LIMIT);
  return { path: entry.path, content: lines.join('\n').trim(), mode: 'raw', governedContext, governedContextText };
}

/**
 * Loads the validated governed workflow pack without a compatibility fallback.
 * Dependency injection keeps cold-boot and corrupt-state tests deterministic.
 *
 * @param {string} root project root
 * @param {string} workflowRef workflow id, slug, or canonical path
 * @param {object} [dependencies]
 * @returns {{ status: string, workflowRef: string, pack?: object, diagnostic?: object }}
 */
export function readGovernedWorkflowContext(root, workflowRef, dependencies = {}) {
  return loadGovernedWorkflowContext(root, workflowRef, dependencies);
}

/**
 * Renders every required governed document into one host-neutral context block.
 * Reports are already relevance-bounded and ordered by the W05 loader.
 *
 * @param {{ status: string, workflowRef: string, pack?: object, diagnostic?: object }} context
 * @returns {string}
 */
export function renderGovernedWorkflowContext(context) {
  return renderLoadedWorkflowContext(context);
}

/** Extracts the `[Unreleased]` block from a CHANGELOG-shaped string. */
export function extractUnreleased(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => /^##\s+\[Unreleased\]/i.test(l));
  if (startIdx === -1) return null;
  const slice = lines.slice(startIdx + 1);
  const endRel = slice.findIndex((l) => l.trim() === '---' || /^##\s+\[/.test(l));
  const end = endRel === -1 ? slice.length : endRel;
  const truncated = end > SECTION_LIMIT;
  const content = slice.slice(0, Math.min(end, SECTION_LIMIT)).join('\n').trim();
  if (!content || /add your changes|empty|vazio/i.test(content)) return null;
  // Tell the reader the boot banner is showing a clipped view, not the whole list.
  return truncated ? `${content}\n… (truncated — full [Unreleased] in docs/CHANGELOG.md)` : content;
}

/** The raw lines of the `[Unreleased]` block (before any clipping), or []. */
function unreleasedLines(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => /^##\s+\[Unreleased\]/i.test(l));
  if (startIdx === -1) return [];
  const slice = lines.slice(startIdx + 1);
  const endRel = slice.findIndex((l) => l.trim() === '---' || /^##\s+\[/.test(l));
  return slice.slice(0, endRel === -1 ? slice.length : endRel);
}

/**
 * A compact digest of the `[Unreleased]` block (ADR-0044 D2): a count-by-type
 * tally (`### Added` / `### Changed` / …) plus the most recent few entry titles —
 * ~8 lines instead of the raw wall. Same contract as the ADR-0027 boot digest:
 * returns `null` on ANY parse miss (no `###` subsections, no bullets) so the
 * caller falls back to the raw-truncated {@link extractUnreleased}.
 *
 * @param {string} text — CHANGELOG-shaped string
 * @param {number} [topN] — how many recent entry titles to list
 * @returns {string|null}
 */
export function digestUnreleased(text, topN = 5) {
  const lines = unreleasedLines(text);
  if (!lines.length) return null;
  const counts = [];
  const entries = [];
  let current = null;
  for (const raw of lines) {
    const heading = /^###\s+(.+?)\s*$/.exec(raw);
    if (heading) {
      current = { type: heading[1].trim(), n: 0 };
      counts.push(current);
      continue;
    }
    // Column-0 bullets only — a top-level entry. Indented sub-bullets (`  - …`) are
    // detail of the entry above, not new entries, so they must not inflate the count.
    if (current && /^[-*]\s+/.test(raw)) {
      current.n += 1;
      if (entries.length < topN) entries.push(`- ${clip(stripMd(raw.replace(/^[-*]\s+/, '')), 90)} _(${current.type})_`);
    }
  }
  const tallied = counts.filter((c) => c.n > 0);
  if (!tallied.length) return null; // no typed entries → let the caller use the raw view
  const total = tallied.reduce((sum, c) => sum + c.n, 0);
  const header = `${tallied.map((c) => `${c.type} ${c.n}`).join(' · ')} (${total} entr${total === 1 ? 'y' : 'ies'})`;
  return [header, '', ...entries].join('\n');
}

/** Active-session table from WORKSPACE.md (first ~12 lines after the header). */
export async function readWorkspaceSummary(root) {
  const md = await readFile(pathsFor(root).workspaceIndex, 'utf-8').catch(() => null);
  if (!md) return null;
  const lines = md.split('\n');
  const startIdx = lines.findIndex((l) => /^##\s+🟢\s+Active/.test(l));
  if (startIdx === -1) return null;
  return lines.slice(startIdx).slice(0, 12).join('\n').trim();
}

export async function readChangelog(root) {
  return readSafe(root, CHANGELOG);
}

export async function readSessionsIndex(root) {
  return readFile(pathsFor(root).sessionsIndex, 'utf-8').catch(() => null);
}

/** Personalization Markdown relative to the memory root (installer-owned name). */
const PERSONALIZATION_RELATIVE = 'preferences/personalization.md';
/** Placeholder the installer seeds; a file that still carries it holds no owner text. */
const PERSONALIZATION_PLACEHOLDER = '_Add project-specific instructions here._';
const OWNER_GUIDANCE_HEADING_LIMIT = 24;

/**
 * Renders explicit owner preferences and the personalization pointer as one
 * recommendation-only block for session context (ADR-0165). Inferred preferences
 * are omitted: only explicit owner guidance earns a place in the agent's context.
 * Never throws; returns null when neither source has content.
 *
 * @param {string} root project root
 * @returns {Promise<string|null>} Markdown block or null
 */
export async function renderOwnerGuidance(root) {
  const lines = [];
  try {
    const personalization = await readFile(resolve(root, MEMORY_DIR, PERSONALIZATION_RELATIVE), 'utf-8').catch(() => null);
    if (personalization && !personalization.includes(PERSONALIZATION_PLACEHOLDER)) {
      const headings = personalization
        .split(/\r?\n/)
        .filter((line) => /^###?\s+\S/.test(line))
        .map((line) => stripMd(line.replace(/^#+\s+/, '')))
        .slice(0, OWNER_GUIDANCE_HEADING_LIMIT);
      const lineCount = personalization.split(/\r?\n/).length;
      lines.push(`- personalization: \`${MEMORY_DIR}/${PERSONALIZATION_RELATIVE}\` (${lineCount} lines; read before any mutation)`);
      if (headings.length > 0) lines.push(`  - sections: ${headings.join(' · ')}`);
    }
  } catch {
    /* pointer is optional */
  }
  try {
    const { listOwnerPreferences } = await import('../preferences/owner-preferences.mjs');
    const store = listOwnerPreferences(root);
    const explicit = (store.preferences ?? []).filter((preference) => preference.source === 'explicit');
    if (store.status === 'unavailable') {
      lines.push(`- preferences: store unavailable (${clip(String(store.diagnostic ?? 'invalid'), 80)}); not repaired`);
    } else if (explicit.length > 0) {
      lines.push(`- preferences (explicit, revision ${store.revision}, ${store.authority}):`);
      for (const preference of explicit) lines.push(`  - ${preference.key}: ${clip(String(preference.value), 160)}`);
    }
  } catch {
    /* preferences are optional */
  }
  if (lines.length === 0) return null;
  return ['## Owner guidance (recommendation-only)', ...lines].join('\n');
}
