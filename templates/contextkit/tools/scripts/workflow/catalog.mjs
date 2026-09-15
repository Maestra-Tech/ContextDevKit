/**
 * Canonical Workflow v2 artifact catalog (ADR-0158 / WF-0111 W05).
 *
 * The catalog is code-owned and intentionally small: it defines the files that
 * form one authoritative workflow package and labels every Markdown artifact as
 * authored input or generated projection. It never inspects Git or the host.
 */

export const WORKFLOW_SCHEMA_VERSION = 2;
export const WORKFLOW_STATE_SCHEMA_VERSION = 2;
export const CONTEXT_MANIFEST_SCHEMA_VERSION = 2;

export const WORKFLOW_STATUSES = Object.freeze([
  'backlog', 'working', 'blocked', 'testing', 'done', 'cancelled',
]);

export const WORKFLOW_PHASES = Object.freeze([
  'intake', 'prd', 'spec', 'adr', 'roadmap', 'pipeline', 'ship', 'testing', 'conclusion',
]);

const ARTIFACTS = Object.freeze({
  workflow: {
    id: 'workflow', filename: 'workflow.json', kind: 'file', required: true,
    authorship: 'canonical', sourceOfTruth: 'workflow definition and topology',
    purpose: 'Stable workflow identity, ownership, scope, acceptance, dependencies, topology, and artifact references.',
  },
  'workflow-state': {
    id: 'workflow-state', filename: 'workflow-state.json', kind: 'file', required: true,
    authorship: 'canonical', sourceOfTruth: 'aggregate workflow execution state',
    purpose: 'Small aggregate lifecycle state with monotonic revision; never duplicates task state or topology.',
  },
  'tasks-json': {
    id: 'tasks-json', filename: 'pipeline/tasks.json', kind: 'file', required: true,
    authorship: 'canonical', sourceOfTruth: 'task definitions and task status',
    purpose: 'The sole authority for workflow tasks and their statuses.',
  },
  tasks: {
    id: 'tasks', filename: 'pipeline/tasks.md', kind: 'file', required: true,
    authorship: 'generated', sourceOfTruth: 'projection of pipeline/tasks.json',
    purpose: 'Idempotent human projection of task status, dependencies, acceptance, evidence, and reports.',
  },
  'context-manifest': {
    id: 'context-manifest', filename: 'context-manifest.json', kind: 'file', required: true,
    authorship: 'canonical', sourceOfTruth: 'workflow context-loading contract',
    purpose: 'Declares required and optional workflow context files for host-neutral loading.',
  },
  prd: {
    id: 'prd', filename: 'prd.md', kind: 'file', required: true,
    authorship: 'human', sourceOfTruth: 'product intent', purpose: 'Product problem, goals, users, non-goals, and success measures.',
  },
  spec: {
    id: 'spec', filename: 'spec.md', kind: 'file', required: true,
    authorship: 'human', sourceOfTruth: 'implementation contract', purpose: 'Technical design, interfaces, impact, sequence, and tests.',
  },
  decisions: {
    id: 'decisions', filename: 'decisions.md', kind: 'file', required: true,
    authorship: 'human', sourceOfTruth: 'decision references', purpose: 'References accepted decisions without duplicating ADR content.',
  },
  reports: {
    id: 'reports', filename: 'reports', kind: 'directory', required: true,
    authorship: 'mixed', sourceOfTruth: 'factual execution reports', purpose: 'Factual reports and evidence referenced by state and tasks.',
  },
  index: {
    id: 'index', filename: 'index.md', kind: 'file', required: true,
    authorship: 'generated', sourceOfTruth: 'projection of workflow.json, workflow-state.json, and pipeline/tasks.json',
    purpose: 'Idempotent human summary of workflow identity and aggregate state.',
  },
  continuation: {
    id: 'continuation', filename: 'CONTINUATION-PROMPT.md', kind: 'file', required: true,
    authorship: 'generated',
    sourceOfTruth: 'projection of workflow.json, workflow-state.json, pipeline/tasks.json, and context-manifest.json',
    purpose: 'Mandatory host-neutral and copy/paste-ready workflow resumption contract.',
  },
});

/**
 * Return an immutable copy of the canonical workflow artifact catalog.
 * @returns {{schemaVersion:number,artifacts:Record<string,object>}}
 */
export function loadWorkflowCatalog() {
  return { schemaVersion: 2, artifacts: structuredClone(ARTIFACTS) };
}

/**
 * Resolve one artifact definition.
 * @param {string} artifactId canonical artifact id
 * @returns {object}
 * @throws {Error} when the id is unknown
 */
export function workflowArtifact(artifactId) {
  const artifact = ARTIFACTS[artifactId];
  if (!artifact) {
    throw new Error(`Unknown Workflow v2 artifact "${artifactId}". Known artifacts: ${Object.keys(ARTIFACTS).sort().join(', ')}.`);
  }
  return structuredClone(artifact);
}

/**
 * Required artifact definitions in deterministic filename order.
 * @returns {object[]}
 */
export function requiredWorkflowArtifacts() {
  return Object.values(ARTIFACTS)
    .filter((artifact) => artifact.required)
    .map((artifact) => structuredClone(artifact))
    .sort((left, right) => left.filename.localeCompare(right.filename));
}

/**
 * Required file references for context loading. The continuation prompt is the
 * one generated Markdown exception because every resumed host must receive the
 * same human handoff contract in addition to the canonical JSON authorities.
 * @returns {string[]}
 */
export function requiredContextFiles() {
  return [
    'workflow.json', 'workflow-state.json', 'prd.md', 'spec.md', 'decisions.md',
    'pipeline/tasks.json', 'CONTINUATION-PROMPT.md',
  ];
}

/** @returns {string[]} optional context references in stable order. */
export function optionalContextFiles() {
  return ['reports/'];
}

/**
 * Authored-document section vocabularies (ADR-0165). The PRD keeps its original
 * seed; the SPEC seed carries the AI engineering method fields so a task reaches
 * implementation with problem, behavior, invariants, data, interfaces, edge cases,
 * acceptance criteria and expected tests already written down.
 */
export const PRD_SEED_SECTIONS = Object.freeze([
  'Problem', 'Goals', 'Users / Jobs', 'Non-goals', 'Success metrics', 'Open questions',
]);
/** Sections that must be filled before `advanceWorkflow` may leave `prd`. */
export const PRD_REQUIRED_SECTIONS = Object.freeze(['Problem', 'Goals']);
/** Sections that must be filled before `advanceWorkflow` may leave `spec`. */
export const SPEC_METHOD_SECTIONS = Object.freeze([
  'Problem',
  'Expected behavior',
  'Domain rules and invariants',
  'Data',
  'Interfaces and contracts',
  'Edge cases',
  'Acceptance criteria',
  'Expected tests',
]);
/** Full SPEC seed: the method fields plus the two planning sections kept from 4.0. */
export const SPEC_SEED_SECTIONS = Object.freeze([...SPEC_METHOD_SECTIONS, 'Impact analysis', 'Development sequence']);
