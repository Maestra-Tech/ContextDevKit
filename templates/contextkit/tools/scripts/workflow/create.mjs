/**
 * Atomic Workflow v2 package creation and explicit scaffold repair (ADR-0158).
 *
 * New packages are assembled and fully validated in a same-volume sibling
 * staging directory, then published with one directory rename. Repair follows
 * the same stage/validate/swap/rollback sequence and is dry-run by default.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathsFor } from '../../../runtime/config/paths.mjs';
import { createTasksDocument } from '../tasks-schema.mjs';
import { assertTasksDocument } from '../tasks-validate.mjs';
import { PRD_SEED_SECTIONS, SPEC_SEED_SECTIONS } from './catalog.mjs';
import {
  CONTEXT_MANIFEST_SCHEMA_VERSION,
  optionalContextFiles,
  requiredContextFiles,
  WORKFLOW_SCHEMA_VERSION,
  WORKFLOW_STATE_SCHEMA_VERSION,
} from './catalog.mjs';
import { readJsonSafe, writeFileAtomicSync, writeJsonStable } from './io.mjs';
import { renderWorkflowPack } from './render.mjs';
import { assertValidPack, validateWorkflowDefinition } from './validate.mjs';
import { resolvePattern, waveSkeleton } from './patterns.mjs';
import { resolveProfile } from './profiles.mjs';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;
const ID_RE = /^WF-(\d{4,})$/;

/** Ensure `candidate` is contained by `parent`. */
function assertContained(parent, candidate, label) {
  const resolvedParent = existsSync(parent) ? realpathSync(parent) : resolve(parent);
  const resolvedCandidate = existsSync(candidate)
    ? realpathSync(candidate)
    : join(realpathSync(dirname(candidate)), basename(candidate));
  const rel = relative(resolvedParent, resolvedCandidate);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${label} escapes its allowed parent: ${candidate}`);
}

/** Normalize a nullable/string owner into the v2 owner value object. */
function normalizeOwner(owner) {
  if (owner === null || owner === undefined || owner === '') return { kind: 'none', id: null };
  if (typeof owner === 'object' && owner !== null) return { kind: owner.kind, id: owner.id ?? null };
  if (typeof owner !== 'string') throw new TypeError('owner must be null, an owner id, or an owner value object');
  if (/^OP-\d{4,}$/.test(owner)) return { kind: 'operation', id: owner };
  if (/^BIZ-\d{4,}$/.test(owner)) return { kind: 'business', id: owner };
  throw new Error(`owner must match OP-#### or BIZ-#### (got "${owner}")`);
}

/** Canonical active and completed workflow-holding roots under the project. */
function localWorkflowRoots(root) {
  const paths = pathsFor(root);
  const neutralRoot = join(paths.memory, 'workflows');
  const roots = [neutralRoot, join(neutralRoot, 'done')];
  for (const [contextsRoot] of [[paths.business], [paths.operations]]) {
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

/** Allocate from local canonical artifacts only; no Git/worktree metadata is consulted. */
function allocateLocalWorkflowId(root) {
  let highest = 0;
  for (const workflowsRoot of localWorkflowRoots(root)) {
    if (!existsSync(workflowsRoot)) continue;
    for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const folderMatch = entry.name.match(/^WF-(\d{4,})-/);
      if (folderMatch) highest = Math.max(highest, Number(folderMatch[1]));
      const definition = readJsonSafe(join(workflowsRoot, entry.name, 'workflow.json'), null);
      const idMatch = definition?.id?.match(ID_RE);
      if (idMatch) highest = Math.max(highest, Number(idMatch[1]));
    }
  }
  return `WF-${String(highest + 1).padStart(4, '0')}`;
}

/** Locate an existing Business/Operation context folder. */
function ownerContextDirectory(root, owner) {
  const paths = pathsFor(root);
  const parent = owner.kind === 'operation' ? paths.operations : paths.business;
  if (!existsSync(parent)) throw new Error(`Owner ${owner.id} has no context directory under ${parent}`);
  const entry = readdirSync(parent, { withFileTypes: true })
    .find((candidate) => candidate.isDirectory() && (candidate.name === owner.id || candidate.name.startsWith(`${owner.id}-`)));
  if (!entry) throw new Error(`Owner ${owner.id} has no context directory under ${parent}`);
  return join(parent, entry.name);
}

/**
 * Resolve the bounded active and completed roots for one workflow owner.
 * Directory placement is a human projection; lifecycle status remains JSON.
 *
 * @param {string} root project root
 * @param {string|object|null} ownerInput workflow owner
 * @returns {{activeRoot:string,doneRoot:string}}
 * @throws {Error} when a declared owner context does not exist
 */
export function workflowStorageRoots(root, ownerInput) {
  const owner = normalizeOwner(ownerInput);
  if (owner.kind === 'none') {
    const activeRoot = join(pathsFor(root).memory, 'workflows');
    return { activeRoot, doneRoot: join(activeRoot, 'done') };
  }
  const ownerDirectory = ownerContextDirectory(root, owner);
  return {
    activeRoot: join(ownerDirectory, 'workflows'),
    doneRoot: join(ownerDirectory, 'done'),
  };
}

/** Refuse duplicate ids or slugs across active and completed roots. */
function assertWorkflowAbsent(root, id, slug) {
  for (const workflowsRoot of localWorkflowRoots(root)) {
    if (!existsSync(workflowsRoot)) continue;
    for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const definition = readJsonSafe(join(workflowsRoot, entry.name, 'workflow.json'), null);
      if (definition?.id === id || definition?.slug === slug || entry.name === `${id}-${slug}`) {
        throw new Error(`Workflow "${id}" or slug "${slug}" already exists at ${join(workflowsRoot, entry.name)}`);
      }
    }
  }
}

/**
 * Build the stable workflow definition authority.
 * @param {object} input validated creation input
 * @returns {object}
 */
export function createWorkflowDefinition(input) {
  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    id: input.id,
    title: input.title,
    slug: input.slug,
    owner: normalizeOwner(input.owner),
    objective: input.objective,
    scope: {
      included: [...(input.scope?.included ?? [])],
      excluded: [...(input.scope?.excluded ?? [])],
    },
    acceptance: [...(input.acceptance ?? [])],
    dependencies: [...(input.dependencies ?? [])],
    structure: {
      mode: 'workflow',
      waves: structuredClone(input.structure?.waves ?? []),
    },
    artifacts: {
      prd: 'prd.md',
      spec: 'spec.md',
      decisions: 'decisions.md',
      tasks: 'pipeline/tasks.json',
      state: 'workflow-state.json',
      reports: 'reports/',
    },
    createdAt: input.now,
    updatedAt: input.now,
  };
}

/**
 * Build the small aggregate workflow state. Task state belongs to W06.
 * @param {{workflowId:string,now:string}} input identity and injected clock
 * @returns {object}
 */
export function createWorkflowState({ workflowId, now }) {
  return {
    schemaVersion: WORKFLOW_STATE_SCHEMA_VERSION,
    workflowId,
    status: 'backlog',
    phase: 'intake',
    revision: 0,
    activeTaskIds: [],
    blockers: [],
    qa: { status: 'pending', evidenceRefs: [] },
    lastReportRef: null,
    startedAt: null,
    updatedAt: now,
    completedAt: null,
  };
}

/**
 * Build the host-neutral context-loading contract.
 * @param {string} workflowId canonical workflow id
 * @returns {object}
 */
export function createContextManifest(workflowId) {
  return {
    schemaVersion: CONTEXT_MANIFEST_SCHEMA_VERSION,
    workflowId,
    required: requiredContextFiles(),
    optional: optionalContextFiles(),
  };
}

/** Seed a human-authored document without claiming it is phase-complete. */
function authoredDocument(title, sections) {
  return [`# ${title}`, '', ...sections.flatMap((section) => [`## ${section}`, '']), ''].join('\n');
}

/** Write every canonical and authored artifact into an empty staging directory. */
function writeInitialPack(stagingDirectory, definition, options) {
  mkdirSync(join(stagingDirectory, 'pipeline'), { recursive: true });
  mkdirSync(join(stagingDirectory, 'reports'), { recursive: true });
  writeJsonStable(join(stagingDirectory, 'workflow.json'), definition);
  writeJsonStable(join(stagingDirectory, 'workflow-state.json'), createWorkflowState({ workflowId: definition.id, now: options.now }));
  const tasks = assertTasksDocument(createTasksDocument(definition.id, { tasks: options.tasks ?? [] }));
  writeJsonStable(join(stagingDirectory, 'pipeline', 'tasks.json'), tasks);
  writeJsonStable(join(stagingDirectory, 'context-manifest.json'), createContextManifest(definition.id));
  writeFileAtomicSync(join(stagingDirectory, 'prd.md'), authoredDocument(`PRD/PDR — ${definition.title}`, PRD_SEED_SECTIONS));
  writeFileAtomicSync(join(stagingDirectory, 'spec.md'), authoredDocument(`SPEC — ${definition.title}`, SPEC_SEED_SECTIONS));
  writeFileAtomicSync(join(stagingDirectory, 'decisions.md'), `# Decisions — ${definition.title}\n\nReference accepted ADRs here; do not duplicate their content.\n\n| Decision | Status | Relevance |\n| --- | --- | --- |\n`);
  renderWorkflowPack(stagingDirectory);
}

/**
 * Materializes and validates a complete Workflow v2 package in an empty
 * caller-owned directory. This is the aggregate-composition seam used when a
 * workflow must be published atomically with its Business/Operation owner.
 *
 * @param {string} directory empty target directory
 * @param {object} options complete workflow creation inputs
 * @returns {{dir:string,id:string,slug:string,definition:object}}
 * @throws {Error} on invalid input, a non-empty target, or failed validation
 */
export function materializeWorkflowPack(directory, options = {}) {
  const targetDirectory = resolve(directory);
  const parentDirectory = dirname(targetDirectory);
  mkdirSync(parentDirectory, { recursive: true });
  assertContained(parentDirectory, targetDirectory, 'workflow package target');
  if (existsSync(targetDirectory) && readdirSync(targetDirectory).length > 0) {
    throw new Error(`Workflow package target is not empty: ${targetDirectory}`);
  }
  if (!ID_RE.test(options.id ?? '')) throw new Error(`workflow id must match WF-#### (got "${options.id ?? ''}")`);
  if (!SLUG_RE.test(options.slug ?? '')) throw new Error(`slug must match ${SLUG_RE} (got "${options.slug ?? ''}")`);
  if (typeof options.now !== 'string' || Number.isNaN(Date.parse(options.now))) {
    throw new Error('materializeWorkflowPack: a valid ISO `now` is required');
  }
  const owner = normalizeOwner(options.owner);
  const definition = createWorkflowDefinition({
    id: options.id,
    slug: options.slug,
    title: options.title ?? options.slug,
    owner,
    objective: options.objective ?? options.title ?? options.slug,
    scope: options.scope,
    acceptance: options.acceptance,
    dependencies: options.dependencies,
    structure: structureFor(options),
    now: options.now,
  });
  const definitionVerdict = validateWorkflowDefinition(definition);
  if (!definitionVerdict.valid) throw new Error(definitionVerdict.errors.map((entry) => entry.message).join('; '));
  mkdirSync(targetDirectory, { recursive: true });
  try {
    writeInitialPack(targetDirectory, definition, options);
    assertValidPack(targetDirectory);
  } catch (error) {
    rmSync(targetDirectory, { recursive: true, force: true });
    throw error;
  }
  return { dir: targetDirectory, id: definition.id, slug: definition.slug, definition };
}

/** Convert a profile/pattern request into v2 topology without carrying task status. */
function structureFor(options) {
  if (options.structure) return options.structure;
  if (!options.profile) return { waves: [] };
  const profile = resolveProfile(options.profile);
  const patternId = options.pattern ?? profile.defaultPattern ?? null;
  if (!patternId) return { waves: [] };
  resolvePattern(patternId);
  return {
    waves: waveSkeleton(patternId).map((wave) => ({
      id: wave.id,
      title: wave.title ?? wave.id,
      dependsOn: [...(wave.dependsOn ?? [])],
      gate: wave.gate ?? null,
    })),
  };
}

/**
 * Create a complete Workflow v2 package atomically.
 * @param {string} root project root
 * @param {string} slug URL/path-safe workflow slug
 * @param {object} options creation options with injected `now`
 * @returns {{dir:string,id:string,number:string,slug:string,files:string[]}}
 * @throws {Error} without leaving a partial target
 */
export function createWaveWorkflow(root, slug, options = {}) {
  if (!SLUG_RE.test(slug ?? '')) throw new Error(`slug must match ${SLUG_RE} (got "${slug ?? ''}")`);
  if (typeof options.now !== 'string' || Number.isNaN(Date.parse(options.now))) throw new Error('createWaveWorkflow: a valid ISO `now` is required');
  if (options.plan) throw new Error('workflow-plan.json input is not accepted by runtime creation; use the explicit v3-to-v4 migrator');
  const owner = normalizeOwner(options.owner);
  const id = options.id ?? (options.number ? `WF-${String(options.number).replace(/^WF-/, '')}` : allocateLocalWorkflowId(root));
  if (!ID_RE.test(id)) throw new Error(`workflow id must match WF-#### (got "${id}")`);
  assertWorkflowAbsent(root, id, slug);
  const { activeRoot: workflowsRoot, doneRoot } = workflowStorageRoots(root, owner);
  mkdirSync(workflowsRoot, { recursive: true });
  mkdirSync(doneRoot, { recursive: true });
  assertContained(pathsFor(root).memory, doneRoot, 'workflow done root');
  const targetDirectory = join(workflowsRoot, `${id}-${slug}`);
  assertContained(workflowsRoot, targetDirectory, 'workflow target');
  if (existsSync(targetDirectory)) throw new Error(`Workflow target already exists: ${targetDirectory}`);
  const stagingDirectory = mkdtempSync(join(workflowsRoot, '.workflow-create-'));
  assertContained(workflowsRoot, stagingDirectory, 'workflow staging directory');
  try {
    materializeWorkflowPack(stagingDirectory, {
      ...options,
      id,
      slug,
      owner,
    });
    renameSync(stagingDirectory, targetDirectory);
  } catch (error) {
    rmSync(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
  return {
    dir: targetDirectory,
    id,
    number: id.slice(3),
    slug,
    files: [
      'context-manifest.json', 'decisions.md', 'index.md', 'pipeline/tasks.json',
      'pipeline/tasks.md', 'prd.md', 'reports/', 'spec.md', 'workflow-state.json',
      'workflow.json', 'CONTINUATION-PROMPT.md',
    ].sort(),
  };
}

/** Reject symlinks/reparse-like entries before copying an existing scaffold. */
function assertCopyableTree(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (lstatSync(path).isSymbolicLink()) throw new Error(`Scaffold repair refuses symbolic link: ${path}`);
    if (entry.isDirectory()) assertCopyableTree(path);
  }
}

/** Copy a directory's contents into an already-created staging directory. */
function copyDirectoryContents(source, target) {
  assertCopyableTree(source);
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    cpSync(join(source, entry.name), join(target, entry.name), { recursive: true, errorOnExist: true });
  }
}

/** True when the generated context manifest differs from the v2 contract. */
function contextManifestRequiresRepair(packDirectory, workflowId) {
  const current = readJsonSafe(join(packDirectory, 'context-manifest.json'), null);
  const expected = createContextManifest(workflowId);
  return !current
    || current.schemaVersion !== expected.schemaVersion
    || current.workflowId !== expected.workflowId
    || JSON.stringify(current.required) !== JSON.stringify(expected.required)
    || JSON.stringify(current.optional) !== JSON.stringify(expected.optional);
}

/** List missing or version-stale artifacts in an incomplete v2 scaffold. */
function missingScaffoldArtifacts(packDirectory, definition) {
  const missing = [
    'workflow-state.json', 'pipeline', 'pipeline/tasks.json', 'pipeline/tasks.md',
    'reports', 'context-manifest.json', 'prd.md', 'spec.md', 'decisions.md', 'index.md',
    'CONTINUATION-PROMPT.md',
  ].filter((artifact) => !existsSync(join(packDirectory, artifact)));
  if (
    contextManifestRequiresRepair(packDirectory, definition.id)
    && !missing.includes('context-manifest.json')
  ) {
    missing.push('context-manifest.json');
  }
  return missing;
}

/** Fill missing v2 artifacts in staging without overwriting authored/canonical files. */
function fillMissingScaffold(stagingDirectory, definition, now) {
  mkdirSync(join(stagingDirectory, 'pipeline'), { recursive: true });
  mkdirSync(join(stagingDirectory, 'reports'), { recursive: true });
  if (!existsSync(join(stagingDirectory, 'workflow-state.json'))) writeJsonStable(join(stagingDirectory, 'workflow-state.json'), createWorkflowState({ workflowId: definition.id, now }));
  if (!existsSync(join(stagingDirectory, 'pipeline', 'tasks.json'))) writeJsonStable(join(stagingDirectory, 'pipeline', 'tasks.json'), assertTasksDocument(createTasksDocument(definition.id)));
  if (contextManifestRequiresRepair(stagingDirectory, definition.id)) {
    writeJsonStable(join(stagingDirectory, 'context-manifest.json'), createContextManifest(definition.id));
  }
  if (!existsSync(join(stagingDirectory, 'prd.md'))) writeFileAtomicSync(join(stagingDirectory, 'prd.md'), authoredDocument(`PRD/PDR — ${definition.title}`, PRD_SEED_SECTIONS));
  if (!existsSync(join(stagingDirectory, 'spec.md'))) writeFileAtomicSync(join(stagingDirectory, 'spec.md'), authoredDocument(`SPEC — ${definition.title}`, SPEC_SEED_SECTIONS));
  if (!existsSync(join(stagingDirectory, 'decisions.md'))) writeFileAtomicSync(join(stagingDirectory, 'decisions.md'), `# Decisions — ${definition.title}\n\nReference accepted ADRs here; do not duplicate their content.\n`);
  renderWorkflowPack(stagingDirectory);
}

/**
 * Repair a Workflow v2 scaffold explicitly. Dry-run is the default. This is not
 * a v3 reader: absence of `workflow.json` refuses and points to the offline
 * migrator. Write mode stages, validates, swaps, and rolls back on failure.
 * @param {string} packDirectory existing Workflow v2 directory
 * @param {{write?:boolean,now:string}} options repair options
 * @returns {{status:string,write:boolean,missing:string[],directory:string}}
 */
export function repairWorkflowScaffold(packDirectory, { write = false, now } = {}) {
  const targetDirectory = resolve(packDirectory);
  if (!existsSync(targetDirectory)) throw new Error(`Workflow scaffold does not exist: ${targetDirectory}`);
  if (lstatSync(targetDirectory).isSymbolicLink()) throw new Error(`Workflow scaffold repair refuses a symbolic-link target: ${targetDirectory}`);
  const definitionPath = join(targetDirectory, 'workflow.json');
  if (!existsSync(definitionPath)) throw new Error('workflow.json is missing; use the explicit v3-to-v4 migrator (runtime repair never reads workflow-plan.json)');
  const definition = readJsonSafe(definitionPath, null);
  const verdict = validateWorkflowDefinition(definition);
  if (!verdict.valid) throw new Error(`Cannot repair invalid workflow.json: ${verdict.errors.map((entry) => entry.message).join('; ')}`);
  const missing = missingScaffoldArtifacts(targetDirectory, definition);
  if (!write) return { status: missing.length > 0 ? 'repair-required' : 'complete', write: false, missing, directory: targetDirectory };
  if (typeof now !== 'string' || Number.isNaN(Date.parse(now))) throw new Error('repairWorkflowScaffold: a valid ISO `now` is required in write mode');
  const parent = dirname(targetDirectory);
  const stagingDirectory = mkdtempSync(join(parent, `.${basename(targetDirectory)}.repair-`));
  const backupDirectory = `${stagingDirectory}.previous`;
  assertContained(parent, stagingDirectory, 'repair staging directory');
  assertContained(parent, backupDirectory, 'repair backup directory');
  let targetMoved = false;
  try {
    copyDirectoryContents(targetDirectory, stagingDirectory);
    fillMissingScaffold(stagingDirectory, definition, now);
    assertValidPack(stagingDirectory);
    renameSync(targetDirectory, backupDirectory);
    targetMoved = true;
    renameSync(stagingDirectory, targetDirectory);
    targetMoved = false;
    rmSync(backupDirectory, { recursive: true, force: true });
  } catch (error) {
    if (targetMoved && !existsSync(targetDirectory) && existsSync(backupDirectory)) renameSync(backupDirectory, targetDirectory);
    rmSync(stagingDirectory, { recursive: true, force: true });
    rmSync(backupDirectory, { recursive: true, force: true });
    throw error;
  }
  return { status: 'repaired', write: true, missing, directory: targetDirectory };
}
