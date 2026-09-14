#!/usr/bin/env node
/** Workflow v2 atomic package, round-trip, portability, and repair tests. */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { reporter } from './it-helpers.mjs';
import {
  dispatchPipelineCommand,
  parsePipelineInvocation,
} from '../templates/contextkit/tools/scripts/pipeline.mjs';
import { createTaskRecord } from '../templates/contextkit/tools/scripts/tasks-schema.mjs';
import {
  createWaveWorkflow,
  repairWorkflowScaffold,
} from '../templates/contextkit/tools/scripts/workflow/create.mjs';
import {
  advanceWorkflow,
  completeWorkflow,
  listWorkflows,
  loadWorkflowPack,
  moveCompletedWorkflow,
  planWorkflowDonePlacement,
  readWorkflow,
} from '../templates/contextkit/tools/scripts/workflow-pack.mjs';
import { requiredWorkflowArtifacts } from '../templates/contextkit/tools/scripts/workflow/catalog.mjs';
import { renderWorkflowPack } from '../templates/contextkit/tools/scripts/workflow/render.mjs';
import { validatePack } from '../templates/contextkit/tools/scripts/workflow/validate.mjs';

const rep = reporter();
const NOW = '2026-08-08T12:00:00.000Z';
const tempBase = mkdtempSync(join(tmpdir(), 'contextkit-wf-v2-'));
const root = join(tempBase, 'non git windows path');
mkdirSync(root, { recursive: true });

/** Report a boolean assertion. */
function check(condition, success, failure = success) {
  condition ? rep.ok(success) : rep.bad(failure);
}

/** Complete ADR-0165 proof-of-done block for closeout report fixtures. */
const PROOF_BLOCK = [
  '```proof-of-done',
  'typecheck: passed tsc --noEmit exit 0',
  'lint: passed eslint exit 0',
  'affected-tests: passed vitest run exit 0',
  'regression: skipped no shared module touched',
  'migrations: skipped no schema change',
  'runtime-check: passed local stack booted',
  'logs-sanitized: passed no PII fields',
  'main-flow: passed create -> read -> complete',
  'edge-cases: passed empty, duplicate, out-of-order',
  'acceptance-review: passed AC1-AC5 checked',
  'diff-review: passed full diff read',
  'architecture-review: passed no duplicated authority',
  '```',
].join('\n');

/** Fill every phase-gated section so `advance` may leave prd and spec. */
function fillAuthoredDocuments(directory) {
  writeFileSync(join(directory, 'prd.md'), '# PRD/PDR — fixture\n\n## Problem\n\nSomething.\n\n## Goals\n\nProve it.\n', 'utf8');
  writeFileSync(join(directory, 'spec.md'), [
    '# SPEC — fixture',
    '',
    ...['Problem', 'Expected behavior', 'Domain rules and invariants', 'Data', 'Interfaces and contracts', 'Edge cases', 'Acceptance criteria', 'Expected tests']
      .flatMap((heading) => [`## ${heading}`, '', `${heading} content.`, '']),
  ].join('\n'), 'utf8');
}

/** Advance until conclusion, filling documents once so the phase gates pass. */
function advanceToConclusion(workflowRoot, workflowId, directory, now) {
  fillAuthoredDocuments(directory);
  let cursor = readWorkflow(workflowRoot, workflowId);
  while (cursor.currentPhase !== 'conclusion') {
    cursor = advanceWorkflow(workflowRoot, workflowId, '', { now, expectedRevision: cursor.revision });
  }
  return cursor;
}

try {
  check(!existsSync(join(root, '.git')), 'fixture is genuinely non-Git');

  const created = createWaveWorkflow(root, 'portable-flow', {
    id: 'WF-0042',
    title: 'Portable flow',
    objective: 'Prove the Workflow v2 package contract',
    now: NOW,
  });
  check(created.dir.includes('non git windows path'), 'creation works in a non-Git path containing spaces');
  check(created.dir.endsWith(join('workflows', 'WF-0042-portable-flow')), 'canonical path uses WF id and platform separators');
  const neutralDoneRoot = join(root, 'contextkit', 'memory', 'workflows', 'done');
  check(existsSync(neutralDoneRoot), 'neutral workflow creation guarantees the done directory');
  const continuationPath = join(created.dir, 'CONTINUATION-PROMPT.md');
  check(existsSync(continuationPath), 'creation emits the mandatory continuation prompt without a flag');

  for (const artifact of requiredWorkflowArtifacts()) {
    check(existsSync(join(created.dir, artifact.filename)), `create emits required ${artifact.kind}: ${artifact.filename}`);
  }
  check(readdirSync(join(created.dir, 'reports')).length === 0, 'reports directory exists even when initially empty');

  const creationVerdict = validatePack(created.dir);
  check(creationVerdict.valid, 'validatePack accepts the complete created package', JSON.stringify(creationVerdict.errors));
  check(creationVerdict.pack.definition.schemaVersion === 2, 'workflow.json uses schemaVersion 2');
  check(creationVerdict.pack.state.schemaVersion === 2 && creationVerdict.pack.state.revision === 0, 'workflow-state.json starts complete at revision 0');
  check(creationVerdict.pack.tasks.schemaVersion === 2 && creationVerdict.pack.tasks.scopeRef === 'WF-0042', 'tasks.json comes from the W06 v2 contract');
  check(
    creationVerdict.pack.manifest.schemaVersion === 2
      && creationVerdict.pack.manifest.required.includes('CONTINUATION-PROMPT.md')
      && !creationVerdict.pack.manifest.optional.includes('CONTINUATION-PROMPT.md'),
    'context manifest v2 requires the continuation prompt',
  );
  check(creationVerdict.pack.definition.owner.kind === 'none' && creationVerdict.pack.definition.owner.id === null, 'none is an explicit valid owner');
  check(!Object.hasOwn(creationVerdict.pack.definition, 'status') && !Object.hasOwn(creationVerdict.pack.state, 'taskStates'), 'definition, aggregate state, and task authority remain separate');

  const initialContinuation = existsSync(continuationPath) ? readFileSync(continuationPath, 'utf8') : '';
  check(
    initialContinuation.includes('node cdx.mjs workflow validate WF-0042')
      && initialContinuation.includes('node cdx.mjs workflow load WF-0042')
      && initialContinuation.includes('Prove the Workflow v2 package contract')
      && initialContinuation.includes('Generated projection'),
    'continuation is copy/paste-ready and grounded in canonical workflow inputs',
  );

  const firstRender = renderWorkflowPack(created.dir);
  check(!firstRender.tasksChanged && !firstRender.indexChanged && !firstRender.continuationChanged, 'first re-render is byte-idempotent');
  const secondRender = renderWorkflowPack(created.dir);
  check(!secondRender.tasksChanged && !secondRender.indexChanged && !secondRender.continuationChanged, 'second re-render remains a no-op');

  writeFileSync(join(created.dir, 'reports', '0001.md'), `# Report\n\nTests passed.\n\n${PROOF_BLOCK}\n`, 'utf8');
  const loaded = loadWorkflowPack(root, 'WF-0042');
  check(
    ['## Problem', '## Expected behavior', '## Domain rules and invariants', '## Data', '## Interfaces and contracts', '## Edge cases', '## Acceptance criteria', '## Expected tests', '## Impact analysis', '## Development sequence']
      .every((heading) => loaded.documents.spec.includes(`${heading}\n`)),
    'fresh spec.md seeds the ADR-0165 method sections',
  );
  check(typeof loaded.documents.continuation === 'string' && loaded.documents.continuation === initialContinuation, 'read-only loader requires and returns the generated continuation prompt');
  check(loaded.definition.id === loaded.state.workflowId && loaded.tasks.scopeRef === loaded.definition.id, 'create → read preserves cross-file identity');
  check(loaded.documents.prd.includes('# PRD/PDR') && loaded.documents.spec.includes('# SPEC') && loaded.documents.decisions.includes('# Decisions'), 'read-only loader includes governed document contents');
  check(loaded.reports.length === 1 && loaded.reports[0].content.includes('Tests passed.'), 'read-only loader includes ordered report contents');
  check(validatePack(loaded.dir).valid, 'create → read → render → validate round-trip passes');

  const concise = readWorkflow(root, 'portable-flow');
  check(concise.id === 'WF-0042' && concise.currentPhase === 'intake', 'reader resolves by slug without parsing index.md');
  check(listWorkflows(root).some((workflow) => workflow.id === 'WF-0042'), 'catalog lists the neutral v2 workflow');

  const canonicalTasks = readFileSync(join(created.dir, 'pipeline', 'tasks.json'), 'utf8');
  writeFileSync(join(created.dir, 'pipeline', 'tasks.md'), '# drift\n', 'utf8');
  check(validatePack(created.dir).errors.some((error) => error.code === 'projection-drift'), 'validator detects generated Markdown drift');
  check(renderWorkflowPack(created.dir).tasksChanged, 'renderer repairs tasks.md from canonical JSON');
  check(readFileSync(join(created.dir, 'pipeline', 'tasks.json'), 'utf8') === canonicalTasks, 'projection repair never mutates tasks.json');
  check(!renderWorkflowPack(created.dir).tasksChanged, 'projection repair is idempotent');

  writeFileSync(continuationPath, '# hand-edited continuation\n', 'utf8');
  check(
    validatePack(created.dir).errors.some((error) => error.code === 'projection-drift' && error.path === 'CONTINUATION-PROMPT.md'),
    'validator detects continuation projection drift',
  );
  check(renderWorkflowPack(created.dir).continuationChanged, 'renderer repairs continuation from canonical JSON');
  check(readFileSync(continuationPath, 'utf8') === initialContinuation, 'continuation repair restores byte-identical output');

  const absenceRoot = join(tempBase, 'absence-fixtures');
  mkdirSync(absenceRoot, { recursive: true });
  for (const artifact of requiredWorkflowArtifacts()) {
    const fixture = join(absenceRoot, artifact.id);
    cpSync(created.dir, fixture, { recursive: true });
    rmSync(join(fixture, artifact.filename), { recursive: true, force: true });
    const verdict = validatePack(fixture);
    check(!verdict.valid && verdict.errors.some((error) => error.path === artifact.filename), `validatePack detects missing ${artifact.filename}`);
  }

  const priorV2Fixture = join(absenceRoot, 'manifest-v1-without-continuation');
  cpSync(created.dir, priorV2Fixture, { recursive: true });
  const priorManifestPath = join(priorV2Fixture, 'context-manifest.json');
  const priorManifest = JSON.parse(readFileSync(priorManifestPath, 'utf8'));
  priorManifest.schemaVersion = 1;
  priorManifest.required = priorManifest.required.filter((ref) => ref !== 'CONTINUATION-PROMPT.md');
  priorManifest.optional = [...new Set([...priorManifest.optional, 'CONTINUATION-PROMPT.md'])];
  writeFileSync(priorManifestPath, `${JSON.stringify(priorManifest, null, 2)}\n`, 'utf8');
  rmSync(join(priorV2Fixture, 'CONTINUATION-PROMPT.md'));
  const priorDryRun = repairWorkflowScaffold(priorV2Fixture, { write: false, now: NOW });
  check(
    priorDryRun.status === 'repair-required'
      && priorDryRun.missing.includes('context-manifest.json')
      && priorDryRun.missing.includes('CONTINUATION-PROMPT.md'),
    'repair dry-run identifies the manifest-v1 continuation upgrade without writing',
  );
  const priorRepaired = repairWorkflowScaffold(priorV2Fixture, { write: true, now: NOW });
  const upgradedManifest = JSON.parse(readFileSync(priorManifestPath, 'utf8'));
  check(
    priorRepaired.status === 'repaired'
      && upgradedManifest.schemaVersion === 2
      && upgradedManifest.required.includes('CONTINUATION-PROMPT.md')
      && validatePack(priorV2Fixture).valid,
    'explicit scaffold repair upgrades manifest v1 and creates the mandatory continuation',
  );

  rmSync(join(created.dir, 'workflow-state.json'));
  const dryRun = repairWorkflowScaffold(created.dir, { write: false, now: NOW });
  check(dryRun.status === 'repair-required' && dryRun.missing.includes('workflow-state.json'), 'incomplete v2 scaffold repair is explicit and dry-run first');
  check(!existsSync(join(created.dir, 'workflow-state.json')), 'repair dry-run performs zero writes');
  const repaired = repairWorkflowScaffold(created.dir, { write: true, now: NOW });
  check(repaired.status === 'repaired' && validatePack(created.dir).valid, 'write repair stages, validates, swaps, and restores a complete package');
  const parentEntries = readdirSync(join(root, 'contextkit', 'memory', 'workflows'));
  check(!parentEntries.some((name) => name.includes('.repair-') || name.includes('.previous')), 'repair leaves no staging or backup directory');

  const advanced = advanceWorkflow(root, 'WF-0042', '', { now: '2026-08-08T12:01:00.000Z', expectedRevision: 0 });
  check(advanced.revision === 1 && advanced.currentPhase === 'prd' && advanced.status === 'working', 'aggregate state advances with monotonic CAS revision');
  check(validatePack(created.dir).valid, 'aggregate state advance regenerates projections and leaves the package valid');

  let earlyCompletionRefused = false;
  try {
    completeWorkflow(root, 'WF-0042', {
      qaStatus: 'passed',
      qaEvidenceRefs: ['runs/final-suite.json'],
      reportRef: 'reports/0001.md',
    }, { now: '2026-08-08T12:02:00.000Z', expectedRevision: 1 });
  } catch (error) {
    earlyCompletionRefused = /phase conclusion/.test(error.message);
  }
  check(earlyCompletionRefused, 'workflow completion refuses before the conclusion phase');

  let emptyPrdRefused = '';
  try {
    advanceWorkflow(root, 'WF-0042', '', { now: '2026-08-08T12:02:30.000Z', expectedRevision: advanced.revision });
  } catch (error) {
    emptyPrdRefused = error.message;
  }
  check(/prd cannot advance/.test(emptyPrdRefused) && /"## Problem"/.test(emptyPrdRefused) && /"## Goals"/.test(emptyPrdRefused), 'advance refuses to leave prd while Problem and Goals are empty, naming them');
  writeFileSync(join(created.dir, 'prd.md'), '# PRD/PDR — fixture\n\n## Problem\n\nSomething.\n\n## Goals\n\nProve it.\n', 'utf8');
  let phaseCursor = advanceWorkflow(root, 'WF-0042', '', { now: '2026-08-08T12:02:40.000Z', expectedRevision: advanced.revision });
  check(phaseCursor.currentPhase === 'spec', 'filled prd leaves the phase without --force');
  let emptySpecRefused = '';
  try {
    advanceWorkflow(root, 'WF-0042', '', { now: '2026-08-08T12:02:50.000Z', expectedRevision: phaseCursor.revision });
  } catch (error) {
    emptySpecRefused = error.message;
  }
  check(/spec cannot advance/.test(emptySpecRefused) && /"## Expected behavior"/.test(emptySpecRefused) && /"## Expected tests"/.test(emptySpecRefused), 'advance refuses to leave spec while method sections are empty, naming them');
  const forcedSpec = advanceWorkflow(root, 'WF-0042', '', { now: '2026-08-08T12:02:55.000Z', expectedRevision: phaseCursor.revision, force: true });
  check(forcedSpec.currentPhase === 'adr', 'explicit --force is the only bypass of the document gate');
  phaseCursor = forcedSpec;
  while (phaseCursor.currentPhase !== 'conclusion') {
    phaseCursor = advanceWorkflow(root, 'WF-0042', '', {
      now: '2026-08-08T12:03:00.000Z',
      expectedRevision: phaseCursor.revision,
    });
  }
  const completionInput = {
    qaStatus: 'passed',
    qaEvidenceRefs: ['runs/final-suite.json'],
    reportRef: 'reports/0001.md',
    reviewer: 'reviewer-agent',
    author: 'author-agent',
  };
  const completionRefusals = [];
  for (const [label, input, pattern] of [
    ['missing reviewer', { ...completionInput, reviewer: undefined }, /requires a reviewer/],
    ['reviewer equals author', { ...completionInput, reviewer: 'Author-Agent' }, /different from the author/],
  ]) {
    try {
      completeWorkflow(root, 'WF-0042', input, { now: '2026-08-08T12:03:30.000Z', expectedRevision: phaseCursor.revision });
      completionRefusals.push(`${label}: not refused`);
    } catch (error) {
      if (!pattern.test(error.message)) completionRefusals.push(`${label}: ${error.message}`);
    }
  }
  writeFileSync(join(created.dir, 'reports', '0002.md'), '# Report without proof\n\n```proof-of-done\ntypecheck: passed\nlint: failed eslint exit 1\nregression: skipped\n```\n', 'utf8');
  try {
    completeWorkflow(root, 'WF-0042', { ...completionInput, reportRef: 'reports/0002.md' }, { now: '2026-08-08T12:03:40.000Z', expectedRevision: phaseCursor.revision });
    completionRefusals.push('incomplete proof: not refused');
  } catch (error) {
    if (!/proof-of-done/.test(error.message) || !/"lint" failed: eslint exit 1/.test(error.message) || !/"regression" skipped without a reason/.test(error.message) || !/missing items: .*affected-tests/.test(error.message)) {
      completionRefusals.push(`incomplete proof: ${error.message}`);
    }
  }
  rmSync(join(created.dir, 'reports', '0002.md'));
  check(completionRefusals.length === 0, 'completion refuses a missing reviewer, an author reviewing their own work, and an incomplete proof-of-done', `completion refusals drifted: ${completionRefusals.join(' | ')}`);
  const completed = completeWorkflow(root, 'WF-0042', completionInput, {
    now: '2026-08-08T12:04:00.000Z',
    expectedRevision: phaseCursor.revision,
  });
  check(completed.status === 'done' && completed.currentPhase === 'conclusion', 'explicit completion transitions conclusion to done');
  check(completed.state.qa.status === 'passed' && completed.state.qa.evidenceRefs[0] === 'runs/final-suite.json', 'completion persists explicit QA evidence');
  check(
    completed.state.qa.reviewer === 'reviewer-agent'
      && completed.state.qa.author === 'author-agent'
      && Object.keys(completed.state.qa.proofOfDone ?? {}).length === 12
      && completed.state.qa.proofOfDone.regression.status === 'skipped'
      && completed.state.qa.proofOfDone.regression.note === 'no shared module touched',
    'completion persists the reviewer and the parsed proof-of-done items',
  );
  check(completed.state.activeTaskIds.length === 0 && completed.state.lastReportRef === 'reports/0001.md', 'completion clears active tasks and binds the factual report');
  check(completed.dir === join(neutralDoneRoot, 'WF-0042-portable-flow'), 'neutral completion moves the whole package under workflows/done');
  check(!existsSync(created.dir) && existsSync(completed.dir), 'completion removes the active placement and publishes the completed placement');
  for (const artifact of requiredWorkflowArtifacts()) {
    check(existsSync(join(completed.dir, artifact.filename)), `completed package retains required ${artifact.kind}: ${artifact.filename}`);
  }
  check(validatePack(completed.dir).valid, 'completed package remains fully valid');
  check(readdirSync(join(completed.dir, 'pipeline')).sort().join(',') === 'tasks.json,tasks.md', 'completed tasks retain JSON authority and Markdown projection without status directories');
  check(readWorkflow(root, 'WF-0042').dir === completed.dir, 'reader resolves the completed package from done');
  check(listWorkflows(root).some((workflow) => workflow.id === 'WF-0042' && workflow.dir === completed.dir), 'catalog lists completed workflows from done');

  renameSync(completed.dir, created.dir);
  const recoveryPlan = planWorkflowDonePlacement(root, 'WF-0042');
  check(recoveryPlan.status === 'dry-run' && recoveryPlan.stateStatus === 'done', 'placement planner detects a JSON-done 4.0.0 package left active');
  const recoveryDryRun = moveCompletedWorkflow(root, 'WF-0042');
  check(recoveryDryRun.status === 'dry-run' && existsSync(created.dir) && !existsSync(completed.dir), 'done-move is dry-run by default and writes nothing');

  const cli = join(process.cwd(), 'templates', 'contextkit', 'tools', 'scripts', 'workflow.mjs');
  const cliMove = spawnSync(process.execPath, [cli, 'done-move', 'WF-0042', '--apply'], {
    cwd: root,
    encoding: 'utf8',
  });
  check(cliMove.status === 0 && cliMove.stdout.includes('"status": "applied"') && existsSync(completed.dir), 'v2 CLI applies JSON-only done placement recovery');
  const recoveryNoop = moveCompletedWorkflow(root, 'WF-0042', { apply: true });
  check(recoveryNoop.status === 'noop' && recoveryNoop.target === completed.dir, 'done placement recovery is idempotent');

  const idempotentCompletion = completeWorkflow(root, 'WF-0042', completionInput, { expectedRevision: completed.revision });
  check(idempotentCompletion.revision === completed.revision && idempotentCompletion.dir === completed.dir, 'repeating the same completion receipt is idempotent');

  writeFileSync(join(completed.dir, 'workflow-plan.json'), '{}\n', 'utf8');
  check(validatePack(completed.dir).errors.some((error) => error.code === 'duplicate-authority'), 'validator rejects workflow-plan.json as a duplicate runtime authority');
  rmSync(join(completed.dir, 'workflow-plan.json'));

  let duplicateDoneRefused = false;
  try {
    createWaveWorkflow(root, 'portable-flow', { id: 'WF-0098', objective: 'Duplicate done slug', now: NOW });
  } catch (error) {
    duplicateDoneRefused = /already exists/.test(error.message);
  }
  check(duplicateDoneRefused, 'creation detects duplicate slugs in completed roots');

  const allocatedAfterDone = createWaveWorkflow(root, 'allocated-after-done', {
    objective: 'Prove completed workflows participate in id allocation',
    now: NOW,
  });
  check(allocatedAfterDone.id === 'WF-0043', 'workflow id allocation scans completed roots');

  const collision = createWaveWorkflow(root, 'collision', {
    id: 'WF-0044',
    objective: 'Prove target collision is preflighted',
    now: NOW,
  });
  writeFileSync(join(collision.dir, 'reports', '0001.md'), `# Collision report\n\n${PROOF_BLOCK}\n`, 'utf8');
  const collisionCursor = advanceToConclusion(root, collision.id, collision.dir, '2026-08-08T12:05:00.000Z');
  const collisionTarget = join(neutralDoneRoot, 'WF-0044-collision');
  mkdirSync(collisionTarget);
  const collisionStateBefore = readFileSync(join(collision.dir, 'workflow-state.json'), 'utf8');
  let collisionRefused = false;
  try {
    completeWorkflow(root, collision.dir, completionInput, {
      now: '2026-08-08T12:06:00.000Z',
      expectedRevision: collisionCursor.revision,
    });
  } catch (error) {
    collisionRefused = /target collision/.test(error.message);
  }
  check(collisionRefused, 'done target collision refuses completion');
  check(readFileSync(join(collision.dir, 'workflow-state.json'), 'utf8') === collisionStateBefore, 'collision refusal leaves workflow JSON and revision untouched');
  rmSync(collisionTarget, { recursive: true, force: true });

  const operationDirectory = join(root, 'contextkit', 'memory', 'operations', 'OP-0001-demo');
  mkdirSync(operationDirectory, { recursive: true });
  const owned = createWaveWorkflow(root, 'owned-flow', {
    id: 'WF-0045',
    owner: 'OP-0001',
    objective: 'Prove owner-scoped completed placement',
    now: NOW,
    tasks: [createTaskRecord({
      id: 'T-001',
      title: 'Owner workflow QA cycle',
      status: 'done',
      evidenceRefs: ['suite:initial-green'],
    }, { now: NOW })],
  });
  const ownerDoneRoot = join(operationDirectory, 'done');
  check(existsSync(ownerDoneRoot), 'owner-scoped workflow creation guarantees the owner done directory');
  writeFileSync(join(owned.dir, 'reports', '0001.md'), `# Owner report\n\n${PROOF_BLOCK}\n`, 'utf8');
  const ownerCursor = advanceToConclusion(root, owned.id, owned.dir, '2026-08-08T12:07:00.000Z');
  const ownedCompleted = completeWorkflow(root, owned.id, completionInput, {
    now: '2026-08-08T12:08:00.000Z',
    expectedRevision: ownerCursor.revision,
  });
  check(ownedCompleted.dir === join(ownerDoneRoot, 'WF-0045-owned-flow') && !existsSync(owned.dir), 'owner-scoped completion moves the whole package under owner done');
  check(requiredWorkflowArtifacts().every((artifact) => existsSync(join(ownedCompleted.dir, artifact.filename))), 'owner completed package retains every required v2 artifact');

  const pipelineEnvironment = {
    root,
    out: () => {},
    session: { attach: async () => {}, detach: async () => {} },
  };
  const pipelineInvocation = (scope, commandArgs) => parsePipelineInvocation([
    ...commandArgs,
    '--tasks', scope,
  ], {});
  mkdirSync(owned.dir);
  const completedOwnerStateBeforeCollision = readFileSync(join(ownedCompleted.dir, 'workflow-state.json'), 'utf8');
  let reopenCollisionRefused = false;
  try {
    await dispatchPipelineCommand(
      pipelineInvocation(ownedCompleted.dir, ['qa-reject', 'T-001', 'Collision probe']),
      pipelineEnvironment,
    );
  } catch (error) {
    reopenCollisionRefused = /active target collision/.test(error.message);
  }
  check(reopenCollisionRefused, 'active target collision refuses workflow reopen before aggregate mutation');
  check(readFileSync(join(ownedCompleted.dir, 'workflow-state.json'), 'utf8') === completedOwnerStateBeforeCollision, 'reopen collision leaves completed workflow JSON untouched');
  rmSync(owned.dir, { recursive: true, force: true });
  await dispatchPipelineCommand(
    pipelineInvocation(ownedCompleted.dir, ['qa-reject', 'T-001', 'Human requested an adjustment']),
    pipelineEnvironment,
  );
  const reopenedOwned = readWorkflow(root, owned.id);
  const reopenedTask = reopenedOwned.tasks.tasks.find((task) => task.id === 'T-001');
  check(reopenedOwned.dir === owned.dir && reopenedOwned.status === 'working' && reopenedOwned.currentPhase === 'ship', 'human feedback reopens a completed workflow and returns its package to workflows');
  check(reopenedOwned.state.qa.status === 'pending' && reopenedOwned.state.completedAt === null, 'workflow reopen resets aggregate completion evidence without resetting revision history');
  check(reopenedTask.status === 'backlog' && reopenedTask.evidenceRefs.length === 0, 'human feedback restarts the done task at backlog with stale current evidence cleared');
  await dispatchPipelineCommand(pipelineInvocation(reopenedOwned.dir, ['start', 'T-001']), pipelineEnvironment);
  await dispatchPipelineCommand(pipelineInvocation(reopenedOwned.dir, ['auto-transition', 'T-001', 'testing']), pipelineEnvironment);
  await dispatchPipelineCommand(pipelineInvocation(reopenedOwned.dir, ['auto-transition', 'T-001', 'done', '--evidence', 'suite:retest-green']), pipelineEnvironment);
  const retestedOwned = readWorkflow(root, owned.id);
  check(retestedOwned.tasks.tasks[0].status === 'done' && retestedOwned.tasks.tasks[0].evidenceRefs.join(',') === 'suite:retest-green', 'automated retest completes the reopened task with fresh evidence');
  let recloseCursor = retestedOwned;
  while (recloseCursor.currentPhase !== 'conclusion') {
    recloseCursor = advanceWorkflow(root, owned.id, '', {
      now: '2026-08-08T12:09:00.000Z',
      expectedRevision: recloseCursor.revision,
      force: true,
    });
  }
  const reclosedOwned = completeWorkflow(root, owned.id, {
    ...completionInput,
    qaEvidenceRefs: ['runs/retest-suite.json'],
  }, {
    now: '2026-08-08T12:10:00.000Z',
    expectedRevision: recloseCursor.revision,
  });
  check(reclosedOwned.status === 'done' && reclosedOwned.dir === ownedCompleted.dir, 'retested workflow completes again and returns to owner done');

  let creationFailed = false;
  try {
    createWaveWorkflow(root, 'invalid-task', {
      id: 'WF-0099',
      objective: 'Force a staged validation failure',
      now: NOW,
      tasks: [{ id: 'T-001' }],
    });
  } catch {
    creationFailed = true;
  }
  check(creationFailed, 'invalid tasks refuse creation before publication');
  check(!existsSync(join(root, 'contextkit', 'memory', 'workflows', 'WF-0099-invalid-task')), 'failed creation publishes no partial target');
  check(!readdirSync(join(root, 'contextkit', 'memory', 'workflows')).some((name) => name.startsWith('.workflow-create-')), 'failed creation removes its staging directory');

  const removedPlanHash = spawnSync(process.execPath, [cli, 'conclude', 'WF-0042', '--adopt-plan-hash'], {
    cwd: root,
    encoding: 'utf8',
  });
  check(removedPlanHash.status === 1 && removedPlanHash.stderr.includes('explicit offline migrate-v3-to-v4'), 'v2 CLI fences the staged ADR-0156 plan-hash surface with explicit migration guidance');

  const cliCompletion = spawnSync(process.execPath, [
    cli, 'complete', 'WF-0042',
    '--qa-status', 'passed',
    '--qa-evidence', 'runs/final-suite.json',
    '--ref', 'reports/0001.md',
    '--reviewer', 'reviewer-agent',
    '--author', 'author-agent',
    '--expected-revision', String(completed.revision),
  ], { cwd: root, encoding: 'utf8' });
  check(cliCompletion.status === 0 && cliCompletion.stdout.includes('done/conclusion'), 'v2 CLI completes idempotently with explicit QA evidence and CAS');
  const cliSelfReview = spawnSync(process.execPath, [
    cli, 'complete', 'WF-0042',
    '--qa-status', 'passed',
    '--qa-evidence', 'runs/final-suite.json',
    '--ref', 'reports/0001.md',
    '--reviewer', 'author-agent',
    '--expected-revision', String(completed.revision),
  ], { cwd: root, encoding: 'utf8' });
  check(cliSelfReview.status !== 0 && /different QA evidence/.test(cliSelfReview.stderr), 'v2 CLI refuses to re-close a done workflow under a different reviewer');
} finally {
  rmSync(tempBase, { recursive: true, force: true });
}

rep.finish('workflow-v2');
