#!/usr/bin/env node
/** Workflow v2 CLI — canonical JSON only (ADR-0158 / WF-0111 W05). */
import {
  advanceWorkflow,
  checkWorkflow,
  completeWorkflow,
  listWorkflows,
  loadWorkflowPack,
  moveCompletedWorkflow,
  readWorkflow,
  repairWorkflowScaffold,
  resolveWorkflowDirectory,
} from './workflow-pack.mjs';
import { createWaveWorkflow } from './workflow/create.mjs';
import { renderWorkflowPack } from './workflow/render.mjs';
import { explainFile, requiredFiles } from './workflow/files.mjs';

const ROOT = process.cwd();

/** Return one CLI option value. */
function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

/** Return positional arguments after the command, excluding option values. */
function positional() {
  const values = [];
  for (let index = 3; index < process.argv.length; index += 1) {
    const token = process.argv[index];
    if (token.startsWith('--')) {
      if (process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) index += 1;
      continue;
    }
    values.push(token);
  }
  return values;
}

/** Resolve explicit owner flags without inferring an Operation or Business. */
function ownerArg() {
  const operation = arg('operation');
  const business = arg('business');
  if (operation && business) throw new Error('Choose either --operation or --business, not both');
  return operation || business || null;
}

/** Parse one required non-negative integer option. */
function requiredRevisionArg() {
  const rawRevision = arg('expected-revision');
  if (!/^\d+$/.test(rawRevision)) throw new Error('complete requires --expected-revision <non-negative integer>');
  return Number(rawRevision);
}

/** Print one compact workflow row. */
function printWorkflow(workflow) {
  if (workflow.malformed) {
    console.log(`  invalid: ${workflow.path} — ${workflow.error}`);
    return;
  }
  console.log(`  ${workflow.id} ${workflow.slug} — ${workflow.status}/${workflow.currentPhase} (revision ${workflow.revision})`);
}

/** Explicit fence for v3 runtime verbs and the staged ADR-0156 plan-hash flag. */
function refuseRemovedV3Surface(command) {
  const removedCommands = new Set(['conclude', 'migrate-plan', 'migrate']);
  if (removedCommands.has(command) || process.argv.includes('--adopt-plan-hash')) {
    throw new Error('This v3 plan/hash surface is not available in Workflow v2. Use the explicit offline migrate-v3-to-v4 tool.');
  }
}

/** Dispatch the Workflow v2 CLI. */
function run() {
  const command = process.argv[2];
  refuseRemovedV3Surface(command);
  if (command === 'new') {
    const [slug] = positional();
    if (!slug) throw new Error('new requires a workflow slug');
    const kind = arg('kind', 'feature');
    const created = createWaveWorkflow(ROOT, slug, {
      profile: arg('profile') || undefined,
      pattern: arg('pattern') || undefined,
      shape: arg('shape') || undefined,
      owner: ownerArg(),
      title: arg('title') || slug,
      objective: arg('objective') || `${kind}: ${slug}`,
      now: new Date().toISOString(),
    });
    console.log(`Workflow "${created.id}" created atomically at ${created.dir}`);
    return;
  }
  if (command === 'status') {
    const [ref] = positional();
    const workflows = ref ? [readWorkflow(ROOT, ref)] : listWorkflows(ROOT);
    if (process.argv.includes('--json')) console.log(JSON.stringify(workflows, null, 2));
    else if (workflows.length === 0) console.log('  No Workflow v2 packages found.');
    else workflows.forEach(printWorkflow);
    return;
  }
  if (command === 'load') {
    const [ref] = positional();
    console.log(JSON.stringify(loadWorkflowPack(ROOT, ref), null, 2));
    return;
  }
  if (command === 'render' || command === 'refresh') {
    const [ref] = positional();
    const pack = loadWorkflowPack(ROOT, ref);
    const outcome = renderWorkflowPack(pack.dir);
    console.log(JSON.stringify(outcome));
    return;
  }
  if (command === 'validate' || command === 'check') {
    const [ref] = positional();
    const outcome = checkWorkflow(ROOT, ref);
    console.log(JSON.stringify(outcome, null, 2));
    if (!outcome.valid) process.exitCode = 1;
    return;
  }
  if (command === 'advance') {
    const [ref] = positional();
    const workflow = advanceWorkflow(ROOT, ref, arg('ref'), {
      now: new Date().toISOString(),
      force: process.argv.includes('--force'),
    });
    printWorkflow(workflow);
    return;
  }
  if (command === 'complete') {
    const [ref] = positional();
    if (!ref) throw new Error('complete requires a workflow reference');
    const qaEvidenceRefs = arg('qa-evidence').split(',').map((reference) => reference.trim()).filter(Boolean);
    const workflow = completeWorkflow(ROOT, ref, {
      qaStatus: arg('qa-status'),
      qaEvidenceRefs,
      reportRef: arg('ref'),
      reviewer: arg('reviewer'),
      author: arg('author') || undefined,
    }, {
      expectedRevision: requiredRevisionArg(),
      now: new Date().toISOString(),
    });
    printWorkflow(workflow);
    return;
  }
  if (command === 'done-move') {
    const [ref] = positional();
    if (!ref) throw new Error('done-move requires a workflow reference');
    const receipt = moveCompletedWorkflow(ROOT, ref, { apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }
  if (command === 'repair-scaffold') {
    const [ref] = positional();
    const directory = resolveWorkflowDirectory(ROOT, ref);
    const outcome = repairWorkflowScaffold(directory, {
      write: process.argv.includes('--write'),
      now: new Date().toISOString(),
    });
    console.log(JSON.stringify(outcome, null, 2));
    return;
  }
  if (command === 'explain-file') {
    const [artifactId] = positional();
    console.log(JSON.stringify(explainFile(artifactId), null, 2));
    return;
  }
  if (command === 'required-files') {
    console.log(JSON.stringify(requiredFiles(), null, 2));
    return;
  }
  console.error('Usage: workflow.mjs <new <slug> [--operation OP-####|--business BIZ-####] [--profile p] | status [ref] [--json] | load <ref> | render <ref> | validate <ref> | advance <ref> [--ref report] | complete <ref> --qa-status passed|skipped --qa-evidence <ref[,ref]> --ref reports/<file> --expected-revision <n> | done-move <ref> [--apply] | repair-scaffold <ref> [--write] | explain-file <id> | required-files>');
  process.exitCode = 1;
}

try {
  run();
} catch (error) {
  console.error(`workflow: ${error?.message ?? error}`);
  process.exitCode = 1;
}
