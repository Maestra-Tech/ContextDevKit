/**
 * Read-only Workflow v2 package loader and small aggregate lifecycle facade.
 *
 * Runtime readers never fall back to `workflow-plan.json`, Markdown frontmatter,
 * or physical status placement. Historical v3 input belongs exclusively to the
 * explicit offline migrator.
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathsFor } from '../../runtime/config/paths.mjs';
import {
  createWaveWorkflow,
  repairWorkflowScaffold,
  workflowStorageRoots,
} from './workflow/create.mjs';
import { WORKFLOW_PHASES } from './workflow/catalog.mjs';
import { readJsonSafe, writeJsonStable } from './workflow/io.mjs';
import { parseProofOfDone } from './workflow/proof-of-done.mjs';
import { renderWorkflowPack } from './workflow/render.mjs';
import { assertValidPack, validatePack } from './workflow/validate.mjs';
import { DOCUMENT_GATED_PHASES, checkPhaseGaps } from './workflow-gate.mjs';

export { repairWorkflowScaffold };
export const PHASES = [...WORKFLOW_PHASES];
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

/** Normalize a path for containment and stable returned references. */
function slash(value) {
  return String(value).replace(/\\/g, '/');
}

/** True when `candidate` is inside `parent`. */
function isContained(parent, candidate) {
  const rel = relative(resolve(parent), resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/** Compare resolved paths using host path-case semantics. */
function isSamePath(left, right) {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

/** Enumerate active and completed workflow roots without creating paths. */
function workflowRoots(root) {
  const paths = pathsFor(root);
  const neutralRoot = join(paths.memory, 'workflows');
  const roots = [neutralRoot, join(neutralRoot, 'done')];
  for (const contextsRoot of [paths.business, paths.operations]) {
    if (!existsSync(contextsRoot)) continue;
    for (const entry of readdirSync(contextsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        roots.push(join(contextsRoot, entry.name, 'workflows'));
        roots.push(join(contextsRoot, entry.name, 'done'));
      }
    }
  }
  return roots;
}

/** Enumerate directories that actually contain a canonical workflow definition. */
function workflowDirectories(root) {
  const directories = [];
  for (const workflowsRoot of workflowRoots(root)) {
    if (!existsSync(workflowsRoot)) continue;
    for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === '_TEMPLATE') continue;
      const directory = join(workflowsRoot, entry.name);
      if (existsSync(join(directory, 'workflow.json'))) directories.push(directory);
    }
  }
  return directories.sort((left, right) => slash(left).localeCompare(slash(right)));
}

/**
 * Resolve a workflow id, slug, folder, or contained path to its canonical dir.
 * @param {string} root project root
 * @param {string} ref workflow reference
 * @returns {string}
 * @throws {Error} when missing, ambiguous, or outside the memory root
 */
export function resolveWorkflowDirectory(root, ref) {
  if (typeof ref !== 'string' || ref.trim().length === 0) throw new TypeError('workflow reference is required');
  const memoryRoot = pathsFor(root).memory;
  const pathCandidate = isAbsolute(ref) ? resolve(ref) : resolve(root, ref);
  if (existsSync(pathCandidate) && statSync(pathCandidate).isDirectory() && existsSync(join(pathCandidate, 'workflow.json'))) {
    if (lstatSync(pathCandidate).isSymbolicLink()) throw new Error(`Workflow path must not be a symbolic link: ${pathCandidate}`);
    const canonicalCandidate = realpathSync(pathCandidate);
    const canonicalMemory = realpathSync(memoryRoot);
    if (!isContained(canonicalMemory, canonicalCandidate)) throw new Error(`Workflow path escapes the memory root: ${pathCandidate}`);
    return canonicalCandidate;
  }
  const matches = [];
  for (const directory of workflowDirectories(root)) {
    const definition = readJsonSafe(join(directory, 'workflow.json'), null);
    if (definition?.id === ref || definition?.slug === ref || directory.endsWith(`${ref}`)) matches.push(directory);
  }
  if (matches.length === 0) throw new Error(`Workflow "${ref}" not found`);
  if (matches.length > 1) throw new Error(`Workflow reference "${ref}" is ambiguous: ${matches.join(', ')}`);
  return matches[0];
}

/** Absolute pack directory for an existing v2 workflow. */
export function packDir(root, ref) {
  return resolveWorkflowDirectory(root, ref);
}

/** Read a UTF-8 document, returning null only for an optional absent file. */
function readDocument(path, optional = false) {
  if (!existsSync(path)) {
    if (optional) return null;
    throw new Error(`Required workflow document is missing: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

/** Read factual report contents recursively in stable path order. */
function readReports(packDirectory) {
  const reportsRoot = join(packDirectory, 'reports');
  const reports = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) reports.push({ ref: slash(relative(packDirectory, path)), content: readFileSync(path, 'utf8') });
      else if (entry.isSymbolicLink()) throw new Error(`Workflow report must not be a symbolic link: ${path}`);
    }
  };
  visit(reportsRoot);
  return reports;
}

/**
 * Load and validate the complete governed context before workflow mutation.
 * This function is strictly read-only and includes authored docs and reports,
 * not merely their references.
 * @param {string} root project root
 * @param {string} ref workflow id, slug, folder, or contained absolute path
 * @returns {{dir:string,definition:object,state:object,tasks:object,manifest:object,documents:object,reports:Array<{ref:string,content:string}>,diagnostics:object[]}}
 */
export function loadWorkflowPack(root, ref) {
  const directory = resolveWorkflowDirectory(root, ref);
  const verdict = validatePack(directory);
  const blockingErrors = verdict.errors.filter((error) => error.code !== 'projection-drift');
  if (blockingErrors.length > 0) {
    const detail = blockingErrors.map((error) => `${error.path || '(pack)'}: ${error.message}`).join('\n  - ');
    throw new Error(`Invalid Workflow v2 package at ${directory}:\n  - ${detail}`);
  }
  const { definition, state, tasks, manifest } = verdict.pack;
  return {
    dir: directory,
    definition,
    state,
    tasks,
    manifest,
    documents: {
      prd: readDocument(join(directory, 'prd.md')),
      spec: readDocument(join(directory, 'spec.md')),
      decisions: readDocument(join(directory, 'decisions.md')),
      continuation: readDocument(join(directory, 'CONTINUATION-PROMPT.md')),
    },
    reports: readReports(directory),
    diagnostics: verdict.errors.filter((error) => error.code === 'projection-drift'),
  };
}

/**
 * Compatibility-shaped view for callers that need a concise workflow row. All
 * values still originate in canonical v2 JSON; `index.md` is never parsed.
 */
export function readWorkflow(root, ref) {
  const pack = loadWorkflowPack(root, ref);
  return {
    format: 'v2',
    id: pack.definition.id,
    number: pack.definition.id.slice(3),
    slug: pack.definition.slug,
    title: pack.definition.title,
    owner: pack.definition.owner,
    currentPhase: pack.state.phase,
    status: pack.state.status,
    revision: pack.state.revision,
    started: pack.definition.createdAt,
    path: join(pack.dir, 'index.md'),
    dir: pack.dir,
    definition: pack.definition,
    state: pack.state,
    tasks: pack.tasks,
    manifest: pack.manifest,
    diagnostics: pack.diagnostics,
  };
}

/** List every active or completed v2 workflow; invalid packs stay visible. */
export function listWorkflows(root) {
  return workflowDirectories(root).map((directory) => {
    try {
      return readWorkflow(root, directory);
    } catch (error) {
      return { malformed: true, format: 'v2', path: directory, error: error.message };
    }
  }).sort((left, right) => String(right.started ?? '').localeCompare(String(left.started ?? '')));
}

/**
 * Compute the derived completed location for an already-loaded workflow pack.
 * Lifecycle status is never inferred from either source or target path.
 *
 * @param {string} root project root
 * @param {ReturnType<typeof loadWorkflowPack>} pack validated workflow pack
 * @returns {{source:string,target:string,doneRoot:string,alreadyPlaced:boolean}}
 * @throws {Error} on path drift, reparse roots, or target collision
 */
function workflowDonePlacement(root, pack) {
  const memoryRoot = pathsFor(root).memory;
  const { activeRoot, doneRoot } = workflowStorageRoots(root, pack.definition.owner);
  const source = resolve(pack.dir);
  const resolvedDoneRoot = resolve(doneRoot);
  const sourceParent = dirname(source);
  const alreadyPlaced = isSamePath(sourceParent, resolvedDoneRoot);
  if (!alreadyPlaced && !isSamePath(sourceParent, activeRoot)) {
    throw new Error(`Workflow directory is outside its active/completed roots: ${source}`);
  }
  if (existsSync(doneRoot) && lstatSync(doneRoot).isSymbolicLink()) {
    throw new Error(`Workflow done root must not be a symbolic link: ${doneRoot}`);
  }
  const target = alreadyPlaced ? source : join(resolvedDoneRoot, basename(source));
  if (!isContained(memoryRoot, target)) throw new Error(`Workflow done target escapes the memory root: ${target}`);
  if (!alreadyPlaced && existsSync(target)) {
    throw new Error(`Workflow done target collision: source and target both exist (${source} / ${target})`);
  }
  return { source, target, doneRoot: resolvedDoneRoot, alreadyPlaced };
}

/** Compute the derived active location for a validated workflow pack. */
function workflowActivePlacement(root, pack) {
  const memoryRoot = pathsFor(root).memory;
  const { activeRoot, doneRoot } = workflowStorageRoots(root, pack.definition.owner);
  const source = resolve(pack.dir);
  const resolvedActiveRoot = resolve(activeRoot);
  const sourceParent = dirname(source);
  const alreadyPlaced = isSamePath(sourceParent, resolvedActiveRoot);
  if (!alreadyPlaced && !isSamePath(sourceParent, doneRoot)) {
    throw new Error(`Workflow directory is outside its active/completed roots: ${source}`);
  }
  if (existsSync(activeRoot) && lstatSync(activeRoot).isSymbolicLink()) {
    throw new Error(`Workflow active root must not be a symbolic link: ${activeRoot}`);
  }
  const target = alreadyPlaced ? source : join(resolvedActiveRoot, basename(source));
  if (!isContained(memoryRoot, target)) throw new Error(`Workflow active target escapes the memory root: ${target}`);
  if (!alreadyPlaced && existsSync(target)) {
    throw new Error(`Workflow active target collision: source and target both exist (${source} / ${target})`);
  }
  return { source, target, activeRoot: resolvedActiveRoot, alreadyPlaced };
}

/**
 * Plan the human-facing completed placement without changing state or files.
 *
 * @param {string} root project root
 * @param {string} ref workflow id, slug, or path
 * @returns {{status:string,applied:false,stateStatus:string,source:string,target:string}}
 */
export function planWorkflowDonePlacement(root, ref) {
  const pack = loadWorkflowPack(root, ref);
  const placement = workflowDonePlacement(root, pack);
  return {
    status: pack.state.status !== 'done'
      ? 'not-completed'
      : placement.alreadyPlaced ? 'noop' : 'dry-run',
    applied: false,
    stateStatus: pack.state.status,
    source: placement.source,
    target: placement.target,
  };
}

/**
 * Move one JSON-completed Workflow v2 package to its derived `done/` root.
 * The command is dry-run by default and never mutates lifecycle state.
 *
 * @param {string} root project root
 * @param {string} ref workflow id, slug, or path
 * @param {{apply?:boolean}} [options]
 * @returns {{status:'dry-run'|'noop'|'applied',applied:boolean,stateStatus:'done',source:string,target:string}}
 * @throws {Error} when JSON is not done or placement is unsafe
 */
export function moveCompletedWorkflow(root, ref, { apply = false } = {}) {
  const pack = loadWorkflowPack(root, ref);
  if (pack.state.status !== 'done') {
    throw new Error(`done-move requires workflow-state.json status done, found ${pack.state.status}`);
  }
  const placement = workflowDonePlacement(root, pack);
  const baseReceipt = {
    applied: false,
    stateStatus: 'done',
    source: placement.source,
    target: placement.target,
  };
  if (placement.alreadyPlaced) return { status: 'noop', ...baseReceipt };
  if (!apply) return { status: 'dry-run', ...baseReceipt };
  mkdirSync(placement.doneRoot, { recursive: true });
  if (lstatSync(placement.doneRoot).isSymbolicLink()) {
    throw new Error(`Workflow done root must not be a symbolic link: ${placement.doneRoot}`);
  }
  renameSync(placement.source, placement.target);
  return { status: 'applied', ...baseReceipt, applied: true };
}

/**
 * Reopen a completed workflow before a human-feedback task reset. Aggregate
 * JSON is committed first, projections are repaired, and the complete package
 * then returns to its active root. A retry after a post-state move failure is
 * idempotent.
 *
 * @param {string} root project root
 * @param {string} ref workflow id, slug, or path
 * @param {{expectedRevision?:number,now?:string}} [options]
 * @returns {ReturnType<typeof readWorkflow>}
 * @throws {Error} on an unsafe placement, stale revision, or unrelated state
 */
export function reopenCompletedWorkflow(root, ref, options = {}) {
  const pack = loadWorkflowPack(root, ref);
  if (options.expectedRevision !== undefined && options.expectedRevision !== pack.state.revision) {
    throw new Error(`Workflow state CAS refused: expected revision ${options.expectedRevision}, found ${pack.state.revision}`);
  }
  const placement = workflowActivePlacement(root, pack);
  const alreadyReopened = pack.state.status === 'working'
    && pack.state.phase === 'ship'
    && pack.state.qa?.status === 'pending'
    && pack.state.completedAt === null;
  if (pack.state.status !== 'done' && !alreadyReopened) {
    throw new Error(`Workflow reopen requires status done, found ${pack.state.status}/${pack.state.phase}`);
  }
  let revision = pack.state.revision;
  if (pack.state.status === 'done') {
    const now = options.now ?? new Date().toISOString();
    const next = {
      ...pack.state,
      status: 'working',
      phase: 'ship',
      revision: pack.state.revision + 1,
      activeTaskIds: [],
      blockers: [],
      qa: { status: 'pending', evidenceRefs: [] },
      updatedAt: now,
      completedAt: null,
    };
    writeWorkflowStateCas(join(pack.dir, 'workflow-state.json'), pack.state, next);
    revision = next.revision;
  }
  try {
    renderWorkflowPack(pack.dir);
  } catch (error) {
    throw new Error(`Workflow reopen committed at revision ${revision}, but projection repair failed: ${error.message}`);
  }
  try {
    if (!placement.alreadyPlaced) {
      mkdirSync(placement.activeRoot, { recursive: true });
      if (lstatSync(placement.activeRoot).isSymbolicLink()) {
        throw new Error(`Workflow active root must not be a symbolic link: ${placement.activeRoot}`);
      }
      renameSync(placement.source, placement.target);
    }
    return readWorkflow(root, placement.target);
  } catch (error) {
    throw new Error(`Workflow reopen committed at revision ${revision}, but active placement failed; retry the same qa-reject command: ${error.message}`);
  }
}

/** Create through the one atomic Workflow v2 creator. */
export function createWorkflow(root, slug, kind = 'feature', owner = null, options = {}) {
  return readWorkflow(root, createWaveWorkflow(root, slug, {
    ...options,
    owner,
    now: options.now ?? new Date().toISOString(),
    objective: options.objective ?? `${kind}: ${slug}`,
  }).dir);
}

/** Return full-pack validation gaps without reading Markdown as authority. */
export function checkWorkflow(root, ref) {
  const directory = resolveWorkflowDirectory(root, ref);
  const verdict = validatePack(directory);
  const state = readJsonSafe(join(directory, 'workflow-state.json'), null);
  return {
    currentPhase: state?.phase ?? 'unknown',
    missing: verdict.errors.map((error) => `${error.path || '(pack)'}: ${error.message}`),
    valid: verdict.valid,
  };
}

/** Persist workflow aggregate state with a monotonic revision guard. */
function writeWorkflowStateCas(path, current, next) {
  const persisted = readJsonSafe(path, null);
  if (!persisted || persisted.revision !== current.revision) {
    throw new Error(`Workflow state CAS refused: expected revision ${current.revision}, found ${persisted?.revision ?? 'missing'}`);
  }
  if (next.revision !== current.revision + 1) throw new Error('Workflow state revision must increment by exactly one');
  return writeJsonStable(path, next);
}

/** Advance only the aggregate workflow phase; task state remains W06-owned. */
export function advanceWorkflow(root, ref, evidenceRef = '', options = {}) {
  const pack = loadWorkflowPack(root, ref);
  if (options.expectedRevision !== undefined && options.expectedRevision !== pack.state.revision) {
    throw new Error(`Workflow state CAS refused: expected revision ${options.expectedRevision}, found ${pack.state.revision}`);
  }
  const phaseIndex = PHASES.indexOf(pack.state.phase);
  if (phaseIndex < 0) throw new Error(`Unknown workflow phase: ${pack.state.phase}`);
  if (phaseIndex === PHASES.length - 1) {
    throw new Error('Workflow completion requires completeWorkflow with explicit QA evidence');
  }
  if (options.force !== true && DOCUMENT_GATED_PHASES.includes(pack.state.phase)) {
    const gaps = checkPhaseGaps(pack.dir, pack.state.phase, pack.definition);
    if (gaps.length > 0) {
      throw new Error(`Workflow phase ${pack.state.phase} cannot advance: ${gaps.join('; ')} (pass --force to override explicitly)`);
    }
  }
  const nextPhase = PHASES[phaseIndex + 1] ?? pack.state.phase;
  const now = options.now ?? new Date().toISOString();
  const next = {
    ...pack.state,
    status: pack.state.status === 'backlog' ? 'working' : pack.state.status,
    phase: nextPhase,
    revision: pack.state.revision + 1,
    lastReportRef: evidenceRef || pack.state.lastReportRef,
    startedAt: pack.state.startedAt ?? now,
    updatedAt: now,
    completedAt: pack.state.completedAt,
  };
  writeWorkflowStateCas(join(pack.dir, 'workflow-state.json'), pack.state, next);
  try {
    renderWorkflowPack(pack.dir);
  } catch (error) {
    throw new Error(`Workflow state committed at revision ${next.revision}, but projection repair failed: ${error.message}`);
  }
  return readWorkflow(root, pack.dir);
}

/**
 * Complete a workflow through the aggregate CAS writer after every task is
 * terminal and an explicit QA receipt exists. This is the only supported path
 * from `conclusion` to `done`; phase advancement cannot infer QA success.
 *
 * @param {string} root project root
 * @param {string} ref workflow id, slug, folder, or contained absolute path
 * @param {{qaStatus:'passed'|'skipped',qaEvidenceRefs:string[],reportRef:string}} completion
 * @param {{expectedRevision?:number,now?:string}} [options]
 * @returns {ReturnType<typeof readWorkflow>}
 * @throws {Error} when completion evidence, task state, phase, or CAS is invalid
 */
export function completeWorkflow(root, ref, completion, options = {}) {
  const pack = loadWorkflowPack(root, ref);
  if (options.expectedRevision !== undefined && options.expectedRevision !== pack.state.revision) {
    throw new Error(`Workflow state CAS refused: expected revision ${options.expectedRevision}, found ${pack.state.revision}`);
  }
  if (pack.state.status === 'done') {
    const sameReviewer = pack.state.qa?.reviewer === undefined
      || pack.state.qa.reviewer === String(completion?.reviewer ?? '').trim();
    const sameReceipt = pack.state.qa?.status === completion?.qaStatus
      && pack.state.lastReportRef === completion?.reportRef
      && sameReviewer
      && JSON.stringify(pack.state.qa?.evidenceRefs ?? []) === JSON.stringify(completion?.qaEvidenceRefs ?? []);
    if (!sameReceipt) throw new Error('Workflow is already done with different QA evidence');
    workflowDonePlacement(root, pack);
    try {
      renderWorkflowPack(pack.dir);
    } catch (error) {
      throw new Error(`Workflow is done at revision ${pack.state.revision}, but projection repair failed before done placement retry: ${error.message}`);
    }
    try {
      const move = moveCompletedWorkflow(root, pack.dir, { apply: true });
      return readWorkflow(root, move.target);
    } catch (error) {
      throw new Error(`Workflow is done at revision ${pack.state.revision}, but done placement failed; retry workflow done-move ${pack.definition.id} --apply: ${error.message}`);
    }
  }
  if (pack.state.phase !== PHASES[PHASES.length - 1]) {
    throw new Error(`Workflow completion requires phase conclusion, found ${pack.state.phase}`);
  }
  if (!completion || !['passed', 'skipped'].includes(completion.qaStatus)) {
    throw new Error('Workflow completion requires qaStatus passed or skipped');
  }
  if (!Array.isArray(completion.qaEvidenceRefs)
    || completion.qaEvidenceRefs.some((reference) => typeof reference !== 'string' || reference.trim() === '')
    || (completion.qaStatus === 'passed' && completion.qaEvidenceRefs.length === 0)) {
    throw new Error('Workflow completion requires explicit QA evidence references');
  }
  if (typeof completion.reportRef !== 'string' || !completion.reportRef.startsWith('reports/')) {
    throw new Error('Workflow completion requires a reportRef inside reports/');
  }
  const completionReport = pack.reports.find((report) => report.ref === completion.reportRef);
  if (!completionReport) {
    throw new Error(`Workflow completion report does not exist: ${completion.reportRef}`);
  }
  // ADR-0165: a second pair of eyes and a machine-readable proof of done are part of
  // the completion receipt; neither can be inferred from a green QA status.
  const reviewer = typeof completion.reviewer === 'string' ? completion.reviewer.trim() : '';
  if (reviewer === '') {
    throw new Error('Workflow completion requires a reviewer (--reviewer) distinct from the author');
  }
  const author = typeof completion.author === 'string' ? completion.author.trim() : '';
  if (author !== '' && author.toLowerCase() === reviewer.toLowerCase()) {
    throw new Error(`Workflow completion requires a reviewer different from the author "${author}"`);
  }
  const proofOfDone = parseProofOfDone(completionReport.content);
  if (!proofOfDone.ok) {
    throw new Error(`Workflow completion requires a complete proof-of-done block in ${completion.reportRef}: ${proofOfDone.errors.join('; ')}`);
  }
  const unfinishedTasks = pack.tasks.tasks.filter((task) => !['done', 'cancelled'].includes(task.status));
  if (unfinishedTasks.length > 0) {
    throw new Error(`Workflow completion requires terminal tasks: ${unfinishedTasks.map((task) => task.id).join(', ')}`);
  }
  if (pack.state.blockers.length > 0) {
    throw new Error(`Workflow completion requires zero blockers: ${pack.state.blockers.join(', ')}`);
  }
  workflowDonePlacement(root, pack);
  const now = options.now ?? new Date().toISOString();
  const next = {
    ...pack.state,
    status: 'done',
    phase: PHASES[PHASES.length - 1],
    revision: pack.state.revision + 1,
    activeTaskIds: [],
    blockers: [],
    qa: {
      status: completion.qaStatus,
      evidenceRefs: [...new Set(completion.qaEvidenceRefs.map((reference) => reference.trim()))],
      reviewer,
      ...(author !== '' ? { author } : {}),
      proofOfDone: proofOfDone.items,
    },
    lastReportRef: completion.reportRef,
    startedAt: pack.state.startedAt ?? now,
    updatedAt: now,
    completedAt: now,
  };
  writeWorkflowStateCas(join(pack.dir, 'workflow-state.json'), pack.state, next);
  try {
    renderWorkflowPack(pack.dir);
  } catch (error) {
    throw new Error(`Workflow completion committed at revision ${next.revision}, but projection repair failed: ${error.message}`);
  }
  try {
    const move = moveCompletedWorkflow(root, pack.dir, { apply: true });
    return readWorkflow(root, move.target);
  } catch (error) {
    throw new Error(`Workflow completion committed at revision ${next.revision}, but done placement failed; retry workflow done-move ${pack.definition.id} --apply: ${error.message}`);
  }
}

/** Optional Git branch enrichment; absence is a valid non-Git result. */
export function currentBranch(root) {
  let gitDirectory = join(root, '.git');
  try {
    const pointer = readFileSync(gitDirectory, 'utf8').match(/^gitdir:\s*(.+)$/m);
    if (pointer) gitDirectory = resolve(root, pointer[1].trim());
  } catch { /* a normal repository stores .git as a directory */ }
  try {
    return readFileSync(join(gitDirectory, 'HEAD'), 'utf8').trim().match(/^ref:\s*refs\/heads\/(.+)$/)?.[1] ?? null;
  } catch {
    return null;
  }
}
