/**
 * Proof-of-done contract for workflow completion (ADR-0165, WF-0118).
 *
 * A closeout report proves completion through one fenced ` ```proof-of-done ` block
 * whose lines read `<item>: <passed|skipped> <note>`. Every item of the fixed
 * vocabulary must be present; `skipped` needs a reason; `failed` or an unknown item
 * refuses. Parsing is deterministic and never infers a missing item as passed.
 */

/** Fixed twelve-item vocabulary; order is the recommended execution order. */
export const PROOF_OF_DONE_ITEMS = Object.freeze([
  'typecheck',
  'lint',
  'affected-tests',
  'regression',
  'migrations',
  'runtime-check',
  'logs-sanitized',
  'main-flow',
  'edge-cases',
  'acceptance-review',
  'diff-review',
  'architecture-review',
]);

/** Statuses that satisfy an item. `failed` is recognised only to refuse explicitly. */
export const PROOF_OF_DONE_STATUSES = Object.freeze(['passed', 'skipped']);

const FENCE_OPEN = /^```proof-of-done\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const ITEM_LINE = /^([a-z][a-z0-9-]*)\s*:\s*(passed|skipped|failed)\b\s*(.*)$/i;

/**
 * Extracts the first proof-of-done block from Markdown.
 *
 * @param {string} markdown report content
 * @returns {string[]|null} block lines, or null when no block exists
 */
export function extractProofOfDoneBlock(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => FENCE_OPEN.test(line));
  if (start < 0) return null;
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (FENCE_CLOSE.test(lines[index])) return body;
    body.push(lines[index]);
  }
  return null; // unterminated fence is not a block
}

/**
 * Parses and validates the proof-of-done block of one report.
 *
 * @param {string} markdown report content
 * @returns {{ok:boolean,status:'missing'|'invalid'|'complete',items:Record<string,{status:string,note:string}>,errors:string[]}}
 */
export function parseProofOfDone(markdown) {
  const block = extractProofOfDoneBlock(markdown);
  if (block === null) {
    return {
      ok: false,
      status: 'missing',
      items: {},
      errors: [`no \`\`\`proof-of-done block; expected items: ${PROOF_OF_DONE_ITEMS.join(', ')}`],
    };
  }
  const items = {};
  const errors = [];
  for (const rawLine of block) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = ITEM_LINE.exec(line);
    if (!match) {
      errors.push(`unreadable line "${line}" (expected "<item>: passed|skipped <note>")`);
      continue;
    }
    const key = match[1].toLowerCase();
    const status = match[2].toLowerCase();
    const note = match[3].trim();
    if (!PROOF_OF_DONE_ITEMS.includes(key)) {
      errors.push(`unknown item "${key}"`);
      continue;
    }
    if (Object.hasOwn(items, key)) {
      errors.push(`duplicate item "${key}"`);
      continue;
    }
    if (status === 'failed') {
      errors.push(`item "${key}" failed${note ? `: ${note}` : ''}`);
      continue;
    }
    if (status === 'skipped' && note === '') {
      errors.push(`item "${key}" skipped without a reason`);
      continue;
    }
    items[key] = { status, note };
  }
  const missing = PROOF_OF_DONE_ITEMS.filter((key) => !Object.hasOwn(items, key));
  if (missing.length > 0) errors.push(`missing items: ${missing.join(', ')}`);
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? 'complete' : 'invalid',
    items,
    errors,
  };
}

/**
 * Validates a persisted `qa.proofOfDone` map (state file shape).
 *
 * @param {unknown} candidate persisted items map
 * @returns {string[]} validation errors (empty when valid)
 */
export function validateProofOfDoneItems(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return ['qa.proofOfDone must be an object keyed by item'];
  }
  const errors = [];
  for (const [key, value] of Object.entries(candidate)) {
    if (!PROOF_OF_DONE_ITEMS.includes(key)) errors.push(`qa.proofOfDone contains unknown item "${key}"`);
    if (!value || typeof value !== 'object' || !PROOF_OF_DONE_STATUSES.includes(value.status) || typeof value.note !== 'string') {
      errors.push(`qa.proofOfDone.${key} must contain status passed|skipped and a note string`);
    }
  }
  for (const key of PROOF_OF_DONE_ITEMS) {
    if (!Object.hasOwn(candidate, key)) errors.push(`qa.proofOfDone is missing item "${key}"`);
  }
  return errors;
}
