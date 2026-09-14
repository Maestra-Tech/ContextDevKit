/**
 * Complete, read-only validation for Workflow v2 packages (ADR-0158 / W05).
 *
 * Validation covers all canonical JSON contracts, required paths, cross-file
 * references, duplicate authorities, and byte-identical Markdown projections.
 * It never repairs or writes; callers receive every observed error at once.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, normalize, relative } from 'node:path';
import { validateTasksDocument } from '../tasks-validate.mjs';
import { validateProofOfDoneItems } from './proof-of-done.mjs';
import {
  CONTEXT_MANIFEST_SCHEMA_VERSION,
  optionalContextFiles,
  requiredContextFiles,
  requiredWorkflowArtifacts,
  WORKFLOW_PHASES,
  WORKFLOW_SCHEMA_VERSION,
  WORKFLOW_STATE_SCHEMA_VERSION,
  WORKFLOW_STATUSES,
} from './catalog.mjs';
import {
  renderContinuationMarkdown,
  renderIndexMarkdown,
  renderTasksMarkdown,
} from './render.mjs';

const WORKFLOW_ID_RE = /^WF-\d{4,}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;
const OWNER_IDS = Object.freeze({ business: /^BIZ-\d{4,}$/, operation: /^OP-\d{4,}$/ });
const FORBIDDEN_AUTHORITIES = Object.freeze([
  'workflow-plan.json', 'tasks.json', 'pipeline/backlog', 'pipeline/working',
  'pipeline/testing', 'pipeline/conclusion',
]);

/** Build a stable typed validation error. */
function fail(code, message, path = '') {
  return { code, message, path };
}

/** True when a value is a non-empty string. */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validate one array of unique non-empty strings. */
function validateStringArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(fail('invalid-array', `${path} must be an array`, path));
    return;
  }
  const seen = new Set();
  for (const entry of value) {
    if (!isNonEmptyString(entry)) errors.push(fail('invalid-array-entry', `${path} must contain non-empty strings`, path));
    else if (seen.has(entry)) errors.push(fail('duplicate-array-entry', `${path} contains duplicate "${entry}"`, path));
    seen.add(entry);
  }
}

/** True when a value is null or a valid ISO-8601 timestamp. */
function isOptionalTimestamp(value) {
  return value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
}

/** Read one JSON artifact while preserving parse diagnostics. */
function readJsonArtifact(path, errors, logicalPath) {
  if (!existsSync(path)) {
    errors.push(fail('missing-file', `Required file is missing: ${logicalPath}`, logicalPath));
    return null;
  }
  try {
    const source = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(source);
  } catch (error) {
    errors.push(fail('invalid-json', `Invalid JSON in ${logicalPath}: ${error.message}`, logicalPath));
    return null;
  }
}

/** Validate that an artifact reference stays relative and contained. */
function validateRelativeRef(value, path, errors, { directory = false } = {}) {
  if (!isNonEmptyString(value)) {
    errors.push(fail('invalid-reference', `${path} must be a non-empty relative path`, path));
    return;
  }
  const slashPath = value.replace(/\\/g, '/');
  const normalized = normalize(slashPath).replace(/\\/g, '/');
  if (isAbsolute(value) || slashPath.includes(':') || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    errors.push(fail('path-escape', `${path} escapes the workflow directory`, path));
  }
  if (directory && !slashPath.endsWith('/')) {
    errors.push(fail('invalid-reference', `${path} must end with "/"`, path));
  }
}

/**
 * Validate the stable `workflow.json` definition contract.
 * @param {unknown} definition candidate document
 * @returns {{valid:boolean,errors:object[]}}
 */
export function validateWorkflowDefinition(definition) {
  const errors = [];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    return { valid: false, errors: [fail('invalid-workflow', 'workflow.json must contain an object', 'workflow.json')] };
  }
  if (definition.schemaVersion !== WORKFLOW_SCHEMA_VERSION) {
    errors.push(fail('invalid-schema-version', `workflow.json schemaVersion must be ${WORKFLOW_SCHEMA_VERSION}`, 'workflow.json.schemaVersion'));
  }
  if (!WORKFLOW_ID_RE.test(definition.id ?? '')) errors.push(fail('invalid-id', 'workflow.json id must match WF-####', 'workflow.json.id'));
  if (!SLUG_RE.test(definition.slug ?? '')) errors.push(fail('invalid-slug', `workflow.json slug must match ${SLUG_RE}`, 'workflow.json.slug'));
  for (const field of ['title', 'objective']) {
    if (!isNonEmptyString(definition[field])) errors.push(fail('missing-field', `${field} must be a non-empty string`, `workflow.json.${field}`));
  }
  const owner = definition.owner;
  if (!owner || typeof owner !== 'object' || !['business', 'operation', 'none'].includes(owner.kind)) {
    errors.push(fail('invalid-owner', 'owner.kind must be business, operation, or none', 'workflow.json.owner'));
  } else if (owner.kind === 'none') {
    if (owner.id !== null) errors.push(fail('invalid-owner', 'owner.id must be null when owner.kind is none', 'workflow.json.owner.id'));
  } else if (!OWNER_IDS[owner.kind].test(owner.id ?? '')) {
    errors.push(fail('invalid-owner', `owner.id does not match ${owner.kind}`, 'workflow.json.owner.id'));
  }
  for (const field of ['acceptance', 'dependencies']) validateStringArray(definition[field], `workflow.json.${field}`, errors);
  if (!definition.scope || !Array.isArray(definition.scope.included) || !Array.isArray(definition.scope.excluded)) {
    errors.push(fail('invalid-scope', 'scope.included and scope.excluded must be arrays', 'workflow.json.scope'));
  } else {
    validateStringArray(definition.scope.included, 'workflow.json.scope.included', errors);
    validateStringArray(definition.scope.excluded, 'workflow.json.scope.excluded', errors);
  }
  if (!definition.structure || definition.structure.mode !== 'workflow' || !Array.isArray(definition.structure.waves)) {
    errors.push(fail('invalid-structure', 'structure must declare mode "workflow" and a waves array', 'workflow.json.structure'));
  } else {
    const waveIds = new Set();
    definition.structure.waves.forEach((wave, index) => {
      const wavePath = `workflow.json.structure.waves[${index}]`;
      if (!wave || typeof wave !== 'object' || !isNonEmptyString(wave.id)) {
        errors.push(fail('invalid-wave', 'Each wave must have a non-empty id', wavePath));
        return;
      }
      if (waveIds.has(wave.id)) errors.push(fail('duplicate-wave', `Duplicate wave id "${wave.id}"`, `${wavePath}.id`));
      waveIds.add(wave.id);
      validateStringArray(wave.dependsOn ?? [], `${wavePath}.dependsOn`, errors);
      if (Object.hasOwn(wave, 'tasks') || Object.hasOwn(wave, 'status')) {
        errors.push(fail('duplicate-authority', 'Wave topology must not duplicate tasks or execution status', wavePath));
      }
    });
    definition.structure.waves.forEach((wave, index) => {
      for (const dependency of wave?.dependsOn ?? []) {
        if (!waveIds.has(dependency)) errors.push(fail('unknown-wave-dependency', `Unknown wave dependency "${dependency}"`, `workflow.json.structure.waves[${index}].dependsOn`));
      }
    });
  }
  const expectedArtifacts = {
    prd: 'prd.md', spec: 'spec.md', decisions: 'decisions.md',
    tasks: 'pipeline/tasks.json', state: 'workflow-state.json', reports: 'reports/',
  };
  for (const [key, expected] of Object.entries(expectedArtifacts)) {
    if (definition.artifacts?.[key] !== expected) {
      errors.push(fail('invalid-artifact-reference', `artifacts.${key} must be "${expected}"`, `workflow.json.artifacts.${key}`));
    }
  }
  for (const key of Object.keys(definition.artifacts ?? {})) {
    if (!Object.hasOwn(expectedArtifacts, key)) errors.push(fail('unsupported-artifact-reference', `Unsupported artifacts key "${key}"`, `workflow.json.artifacts.${key}`));
  }
  if (!isOptionalTimestamp(definition.createdAt) || definition.createdAt === null) errors.push(fail('invalid-timestamp', 'createdAt must be an ISO-8601 timestamp', 'workflow.json.createdAt'));
  if (!isOptionalTimestamp(definition.updatedAt) || definition.updatedAt === null) errors.push(fail('invalid-timestamp', 'updatedAt must be an ISO-8601 timestamp', 'workflow.json.updatedAt'));
  for (const forbidden of ['status', 'phase', 'revision', 'taskStates', 'tasks']) {
    if (Object.hasOwn(definition, forbidden)) errors.push(fail('duplicate-authority', `workflow.json must not contain execution field "${forbidden}"`, `workflow.json.${forbidden}`));
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate the small aggregate `workflow-state.json` contract.
 * @param {unknown} state candidate document
 * @returns {{valid:boolean,errors:object[]}}
 */
export function validateWorkflowState(state) {
  const errors = [];
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { valid: false, errors: [fail('invalid-state', 'workflow-state.json must contain an object', 'workflow-state.json')] };
  }
  if (state.schemaVersion !== WORKFLOW_STATE_SCHEMA_VERSION) errors.push(fail('invalid-schema-version', `workflow-state.json schemaVersion must be ${WORKFLOW_STATE_SCHEMA_VERSION}`, 'workflow-state.json.schemaVersion'));
  if (!WORKFLOW_ID_RE.test(state.workflowId ?? '')) errors.push(fail('invalid-id', 'workflowId must match WF-####', 'workflow-state.json.workflowId'));
  if (!WORKFLOW_STATUSES.includes(state.status)) errors.push(fail('invalid-status', `status must be one of ${WORKFLOW_STATUSES.join(', ')}`, 'workflow-state.json.status'));
  if (!WORKFLOW_PHASES.includes(state.phase)) errors.push(fail('invalid-phase', `phase must be one of ${WORKFLOW_PHASES.join(', ')}`, 'workflow-state.json.phase'));
  if (!Number.isInteger(state.revision) || state.revision < 0) errors.push(fail('invalid-revision', 'revision must be a non-negative integer', 'workflow-state.json.revision'));
  for (const field of ['activeTaskIds', 'blockers']) validateStringArray(state[field], `workflow-state.json.${field}`, errors);
  if (!state.qa || !['pending', 'passed', 'failed', 'skipped'].includes(state.qa.status) || !Array.isArray(state.qa.evidenceRefs)) {
    errors.push(fail('invalid-qa', 'qa must contain a supported status and evidenceRefs array', 'workflow-state.json.qa'));
  } else {
    validateStringArray(state.qa.evidenceRefs, 'workflow-state.json.qa.evidenceRefs', errors);
    // ADR-0165 completion receipt fields are optional (older packs) but never malformed.
    for (const field of ['reviewer', 'author']) {
      if (state.qa[field] !== undefined && !isNonEmptyString(state.qa[field])) {
        errors.push(fail('invalid-qa', `qa.${field} must be a non-empty string when present`, `workflow-state.json.qa.${field}`));
      }
    }
    if (isNonEmptyString(state.qa.reviewer) && isNonEmptyString(state.qa.author)
      && state.qa.reviewer.trim().toLowerCase() === state.qa.author.trim().toLowerCase()) {
      errors.push(fail('invalid-qa', 'qa.reviewer must differ from qa.author', 'workflow-state.json.qa.reviewer'));
    }
    if (state.qa.proofOfDone !== undefined) {
      for (const message of validateProofOfDoneItems(state.qa.proofOfDone)) {
        errors.push(fail('invalid-qa', message, 'workflow-state.json.qa.proofOfDone'));
      }
    }
  }
  if (!(state.lastReportRef === null || isNonEmptyString(state.lastReportRef))) errors.push(fail('invalid-reference', 'lastReportRef must be null or a non-empty string', 'workflow-state.json.lastReportRef'));
  for (const field of ['startedAt', 'updatedAt', 'completedAt']) {
    if (!isOptionalTimestamp(state[field])) errors.push(fail('invalid-timestamp', `${field} must be null or ISO-8601`, `workflow-state.json.${field}`));
  }
  if (state.updatedAt === null) errors.push(fail('invalid-timestamp', 'updatedAt must not be null', 'workflow-state.json.updatedAt'));
  for (const forbidden of ['taskStates', 'waveStates', 'runs', 'events', 'gateResults', 'planHash', 'waves', 'tasks']) {
    if (Object.hasOwn(state, forbidden)) errors.push(fail('duplicate-authority', `workflow-state.json must not contain "${forbidden}"`, `workflow-state.json.${forbidden}`));
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate the workflow context manifest and its contained relative references.
 * @param {unknown} manifest candidate document
 * @returns {{valid:boolean,errors:object[]}}
 */
export function validateContextManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { valid: false, errors: [fail('invalid-manifest', 'context-manifest.json must contain an object', 'context-manifest.json')] };
  }
  if (manifest.schemaVersion !== CONTEXT_MANIFEST_SCHEMA_VERSION) errors.push(fail('invalid-schema-version', `context-manifest schemaVersion must be ${CONTEXT_MANIFEST_SCHEMA_VERSION}`, 'context-manifest.json.schemaVersion'));
  if (!WORKFLOW_ID_RE.test(manifest.workflowId ?? '')) errors.push(fail('invalid-id', 'context manifest workflowId must match WF-####', 'context-manifest.json.workflowId'));
  for (const field of ['required', 'optional']) {
    if (!Array.isArray(manifest[field])) {
      errors.push(fail('invalid-array', `${field} must be an array`, `context-manifest.json.${field}`));
      continue;
    }
    manifest[field].forEach((ref, index) => validateRelativeRef(ref, `context-manifest.json.${field}[${index}]`, errors, { directory: String(ref).endsWith('/') }));
    if (new Set(manifest[field]).size !== manifest[field].length) errors.push(fail('duplicate-context-reference', `${field} must not contain duplicate references`, `context-manifest.json.${field}`));
  }
  for (const requiredRef of requiredContextFiles()) {
    if (!manifest.required?.includes(requiredRef)) errors.push(fail('missing-context-reference', `context manifest must require ${requiredRef}`, 'context-manifest.json.required'));
  }
  if (JSON.stringify(manifest.required) !== JSON.stringify(requiredContextFiles())) {
    errors.push(fail('invalid-context-contract', 'context manifest required refs must match the canonical ordered set', 'context-manifest.json.required'));
  }
  if (JSON.stringify(manifest.optional) !== JSON.stringify(optionalContextFiles())) {
    errors.push(fail('invalid-context-contract', 'context manifest optional refs must match the canonical ordered set', 'context-manifest.json.optional'));
  }
  return { valid: errors.length === 0, errors };
}

/** Append child validation errors under one result key. */
function collect(errors, verdict) {
  errors.push(...verdict.errors);
}

/** Verify the catalog's required file and directory paths. */
function validateRequiredArtifacts(packDirectory, errors) {
  for (const artifact of requiredWorkflowArtifacts()) {
    const artifactPath = join(packDirectory, artifact.filename);
    if (!existsSync(artifactPath)) {
      errors.push(fail(artifact.kind === 'directory' ? 'missing-directory' : 'missing-file', `Required ${artifact.kind} is missing: ${artifact.filename}`, artifact.filename));
      continue;
    }
    const stats = statSync(artifactPath);
    if (artifact.kind === 'directory' ? !stats.isDirectory() : !stats.isFile()) {
      errors.push(fail('wrong-artifact-kind', `${artifact.filename} must be a ${artifact.kind}`, artifact.filename));
    }
  }
}

/** Verify refs and authority separation across the three canonical documents. */
function validateCrossReferences(packDirectory, definition, state, tasks, manifest, errors) {
  if (!definition || !state || !tasks || !manifest) return;
  for (const [path, value] of [
    ['workflow-state.json.workflowId', state.workflowId],
    ['pipeline/tasks.json.scopeRef', tasks.scopeRef],
    ['context-manifest.json.workflowId', manifest.workflowId],
  ]) {
    if (value !== definition.id) errors.push(fail('workflow-id-mismatch', `${path} must equal ${definition.id}`, path));
  }
  const taskIds = new Set((tasks.tasks ?? []).map((task) => task.id));
  for (const taskId of state.activeTaskIds ?? []) {
    if (!taskIds.has(taskId)) errors.push(fail('unknown-active-task', `activeTaskIds references unknown task "${taskId}"`, 'workflow-state.json.activeTaskIds'));
  }
  const reportRefs = [
    ...(state.lastReportRef ? [['workflow-state.json.lastReportRef', state.lastReportRef]] : []),
    ...(tasks.tasks ?? []).flatMap((task, taskIndex) => (task.reportRefs ?? []).map((ref, reportIndex) => [
      `pipeline/tasks.json.tasks[${taskIndex}].reportRefs[${reportIndex}]`, ref,
    ])),
  ];
  for (const [path, ref] of reportRefs) {
    validateRelativeRef(ref, path, errors);
    const normalizedRef = String(ref).replace(/\\/g, '/');
    if (!normalizedRef.startsWith('reports/')) errors.push(fail('invalid-report-reference', `${path} must point inside reports/`, path));
    else if (!existsSync(join(packDirectory, normalizedRef))) errors.push(fail('missing-report-reference', `${path} points to a missing report: ${ref}`, path));
  }
  for (const [key, ref] of Object.entries(definition.artifacts ?? {})) {
    validateRelativeRef(ref, `workflow.json.artifacts.${key}`, errors, { directory: key === 'reports' });
  }
}

/** Verify that generated Markdown equals the pure renderer output. */
function validateProjections(packDirectory, definition, state, tasks, manifest, errors) {
  if (!definition || !state || !tasks || !manifest) return;
  const projections = [
    ['index.md', renderIndexMarkdown(definition, state, tasks)],
    ['pipeline/tasks.md', renderTasksMarkdown(definition, tasks)],
    ['CONTINUATION-PROMPT.md', renderContinuationMarkdown(definition, state, tasks, manifest)],
  ];
  for (const [relativePath, expected] of projections) {
    const path = join(packDirectory, relativePath);
    if (!existsSync(path)) continue;
    const actual = readFileSync(path, 'utf8');
    if (actual !== expected) errors.push(fail('projection-drift', `${relativePath} differs from its canonical JSON inputs`, relativePath));
  }
}

/**
 * Validate a complete Workflow v2 package without side effects.
 * @param {string} packDirectory absolute or project-relative workflow directory
 * @returns {{valid:boolean,errors:object[],pack:{definition:object|null,state:object|null,tasks:object|null,manifest:object|null}}}
 */
export function validatePack(packDirectory) {
  if (!isNonEmptyString(packDirectory)) throw new TypeError('validatePack: packDirectory is required');
  const errors = [];
  validateRequiredArtifacts(packDirectory, errors);
  for (const forbidden of FORBIDDEN_AUTHORITIES) {
    if (existsSync(join(packDirectory, forbidden))) errors.push(fail('duplicate-authority', `Legacy or duplicate authority must not exist: ${forbidden}`, forbidden));
  }
  const definition = readJsonArtifact(join(packDirectory, 'workflow.json'), errors, 'workflow.json');
  const state = readJsonArtifact(join(packDirectory, 'workflow-state.json'), errors, 'workflow-state.json');
  const tasks = readJsonArtifact(join(packDirectory, 'pipeline', 'tasks.json'), errors, 'pipeline/tasks.json');
  const manifest = readJsonArtifact(join(packDirectory, 'context-manifest.json'), errors, 'context-manifest.json');
  if (definition) collect(errors, validateWorkflowDefinition(definition));
  if (state) collect(errors, validateWorkflowState(state));
  if (tasks) {
    const tasksVerdict = validateTasksDocument(tasks);
    if (!tasksVerdict.ok) {
      for (const message of tasksVerdict.errors) errors.push(fail('invalid-tasks', message, 'pipeline/tasks.json'));
    }
  }
  if (manifest) collect(errors, validateContextManifest(manifest));
  validateCrossReferences(packDirectory, definition, state, tasks, manifest, errors);
  validateProjections(packDirectory, definition, state, tasks, manifest, errors);
  return { valid: errors.length === 0, errors, pack: { definition, state, tasks, manifest } };
}

/**
 * Throw one readable error when a package is invalid; otherwise return its JSON.
 * @param {string} packDirectory workflow directory
 * @returns {{definition:object,state:object,tasks:object,manifest:object}}
 * @throws {Error} containing every validation failure
 */
export function assertValidPack(packDirectory) {
  const verdict = validatePack(packDirectory);
  if (!verdict.valid) {
    const detail = verdict.errors.map((error) => `${error.path || '(pack)'}: ${error.message}`).join('\n  - ');
    throw new Error(`Invalid Workflow v2 package at ${packDirectory}:\n  - ${detail}`);
  }
  return verdict.pack;
}

/**
 * Check that a resolved child path remains inside its package.
 * @param {string} packDirectory package root
 * @param {string} childPath candidate child
 * @returns {boolean}
 */
export function isPathInsidePack(packDirectory, childPath) {
  const rel = relative(packDirectory, childPath);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
