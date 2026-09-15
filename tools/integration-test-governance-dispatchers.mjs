#!/usr/bin/env node
/**
 * Focused integration checks for WF-0111 W03 single-process governance composition.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeSettings } from '../templates/contextkit/runtime/config/settings-compose.mjs';
import { composeCodexHooks, stripCodexHooks } from '../templates/contextkit/runtime/config/codex-hooks-compose.mjs';
import { dispatchPromptPreflight } from '../templates/contextkit/runtime/hooks/governance-prompt-preflight.mjs';
import { dispatchWritePreflight } from '../templates/contextkit/runtime/hooks/governance-write-preflight.mjs';
import { dispatchPostflight } from '../templates/contextkit/runtime/hooks/governance-postflight.mjs';
import { dispatchCompletion } from '../templates/contextkit/runtime/hooks/governance-completion.mjs';
import { loadGovernanceSessionContext } from '../templates/contextkit/runtime/hooks/governance-session-context.mjs';
import { createWaveWorkflow } from '../templates/contextkit/tools/scripts/workflow/create.mjs';
import { editOwnerPreference } from '../templates/contextkit/runtime/preferences/owner-preferences.mjs';
import {
  emitGovernanceResult,
  normalizeGovernancePayload,
  resolveGovernanceHost,
} from '../templates/contextkit/runtime/hooks/governance-host-io.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const EXPECTED_COMMANDS = Object.freeze({
  SessionStart: 'governance-session-context.mjs',
  UserPromptSubmit: 'governance-prompt-preflight.mjs',
  PreToolUse: 'governance-write-preflight.mjs',
  PostToolUse: 'governance-postflight.mjs',
  Stop: 'governance-completion.mjs',
  PreCompact: 'governance-session-context.mjs',
  SubagentStart: 'governance-session-context.mjs',
});
const LEGACY_HOOKS = Object.freeze([
  'session-start.mjs',
  'execution-contract-hook.mjs',
  'execution-gate.mjs',
  'indirect-write-reconcile.mjs',
  'completion-gate.mjs',
  'domain-code-gate.mjs',
  'domain-conformance.mjs',
  'arch-debt-law-gate.mjs',
  'simulate-gate.mjs',
  'journey-gate.mjs',
  'deliberation-nudge.mjs',
  'graph-first-gate.mjs',
  'subagent-gate.mjs',
  'done-sweep.mjs',
]);

let checks = 0;
const ok = (message) => {
  checks += 1;
  console.log(`  ✓ ${message}`);
};

/** @param {Record<string, any>} file composed host file */
function assertOneProcessPerEvent(file) {
  for (const [eventName, script] of Object.entries(EXPECTED_COMMANDS)) {
    const groups = file.hooks?.[eventName] ?? [];
    const commands = groups.flatMap((group) => group.hooks ?? []).map((hook) => String(hook.command || ''));
    assert.equal(commands.length, 1, `${eventName} must start exactly one process`);
    assert.match(commands[0], new RegExp(`${script.replace('.', '\\.')}(?: |$)`));
  }
  ok('each governance event starts exactly one ContextDevKit process');
}

/** @param {Record<string, any>} file composed host file */
function assertNoLegacyFallback(file) {
  const serialized = JSON.stringify(file);
  for (const legacyHook of LEGACY_HOOKS) assert.doesNotMatch(serialized, new RegExp(legacyHook.replace('.', '\\.')));
  ok('composed hooks contain no executable legacy fallback');
}

/**
 * Verifies that activation levels add only the relevant v4 lifecycle events.
 * @param {(existing:Record<string, any>|null,level:number)=>Record<string, any>} compose host composer
 * @returns {void}
 */
function assertLevelEvents(compose) {
  const expectedByLevel = new Map([
    [1, ['SessionStart']],
    [2, ['PostToolUse', 'SessionStart', 'Stop']],
    [3, ['PostToolUse', 'PreToolUse', 'SessionStart', 'Stop']],
    [4, ['PostToolUse', 'PreToolUse', 'SessionStart', 'Stop']],
    [5, ['PostToolUse', 'PreCompact', 'PreToolUse', 'SessionStart', 'Stop', 'SubagentStart', 'UserPromptSubmit']],
  ]);
  for (const [level, expectedEvents] of expectedByLevel) {
    const actualEvents = Object.keys(compose(null, level).hooks ?? {}).sort();
    assert.deepEqual(actualEvents, expectedEvents.sort(), `unexpected L${level} event set`);
  }
  ok('activation levels contain only v4 lifecycle events');
}

async function checkAdapter(label, dispatchAdapter, expectedMoment) {
  const scratchRoot = mkdtempSync(join(tmpdir(), 'cdk-w03-'));
  const env = { TEST_MARKER: label };
  let capturedCall = null;
  try {
    const dispatch = async (call) => {
      capturedCall = call;
      return { status: 'completed', allowed: true, evaluations: [], messages: [], diagnostics: {} };
    };
    const result = await dispatchAdapter(
      {
        session_id: 'session-123',
        task_id: 'T-412',
        prompt_revision: 7,
        ...(expectedMoment === 'prompt-preflight' ? { prompt: 'Please fix this file.' } : {}),
        ...(['write-preflight', 'postflight'].includes(expectedMoment) ? { tool_name: 'Edit' } : {}),
        untouched: 'preserved',
      },
      { root: scratchRoot, env, host: 'claude', dispatch },
    );
    assert.equal(result.status, 'completed');
    assert.equal(capturedCall.moment, expectedMoment);
    assert.equal(capturedCall.root, scratchRoot);
    assert.equal(capturedCall.env, env);
    assert.equal(capturedCall.payload.sessionId, 'session-123');
    assert.equal(capturedCall.payload.workItemId, 'T-412');
    assert.equal(capturedCall.payload.revision, 7);
    assert.equal(capturedCall.payload.untouched, 'preserved');
    assert.equal(Object.hasOwn(capturedCall.payload, 'gates'), false);
    assert.deepEqual(readdirSync(scratchRoot), []);
    ok(`${label} delegates the normalized raw event without persistence`);
  } finally {
    rmSync(scratchRoot, { recursive: true, force: true });
  }
}

console.log('\nContextDevKit integration test - governance dispatchers\n');

const claude = composeSettings(null, 5);
const codex = composeCodexHooks(null, 5);
assertOneProcessPerEvent(claude);
assertOneProcessPerEvent(codex);
assertNoLegacyFallback(claude);
assertNoLegacyFallback(codex);
assertLevelEvents(composeSettings);
assertLevelEvents(composeCodexHooks);
const emptySessionRoot = mkdtempSync(join(tmpdir(), 'cdk-w03-session-'));
try {
  const sessionContext = await loadGovernanceSessionContext({ hook_event_name: 'SessionStart' }, { root: emptySessionRoot, env: {} });
  assert.equal(sessionContext.status, 'not-applicable');
  assert.deepEqual(readdirSync(emptySessionRoot), []);
  ok('SessionStart performs a read-only context lookup without speculative state');
} finally {
  rmSync(emptySessionRoot, { recursive: true, force: true });
}

assert.match(claude.hooks.PreToolUse[0].matcher, /Edit/);
assert.match(claude.hooks.PreToolUse[0].matcher, /Bash/);
assert.match(codex.hooks.PreToolUse[0].matcher, /apply_patch/);
assert.match(codex.hooks.PreToolUse[0].matcher, /mcp__/);
ok('Claude and Codex cover direct and indirect mutation tool families');

const userHook = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo user-stop' }] }] } };
const recomposed = composeCodexHooks(composeCodexHooks(structuredClone(userHook), 5), 5);
const stopCommands = recomposed.hooks.Stop.flatMap((group) => group.hooks ?? []).map((hook) => hook.command);
assert.deepEqual(stopCommands, ['echo user-stop', 'node contextkit/runtime/hooks/governance-completion.mjs --host codex']);
assert.deepEqual(stripCodexHooks(recomposed), userHook);
ok('recomposition is idempotent and preserves unrelated user hooks');

for (const [relativePath, moment] of [
  ['templates/contextkit/runtime/hooks/governance-prompt-preflight.mjs', 'prompt-preflight'],
  ['templates/contextkit/runtime/hooks/governance-write-preflight.mjs', 'write-preflight'],
  ['templates/contextkit/runtime/hooks/governance-postflight.mjs', 'postflight'],
  ['templates/contextkit/runtime/hooks/governance-completion.mjs', 'completion'],
]) {
  const source = readFileSync(resolve(ROOT, relativePath), 'utf-8');
  assert.match(source, /\.\/governance-host-io\.mjs/);
  assert.match(source, new RegExp(`const MOMENT = '${moment}'`));
  for (const legacyHook of LEGACY_HOOKS) assert.doesNotMatch(source, new RegExp(legacyHook.replace('.', '\\.')));
}
const hostIoSource = readFileSync(
  resolve(ROOT, 'templates/contextkit/runtime/hooks/governance-host-io.mjs'),
  'utf-8',
);
assert.match(hostIoSource, /governance\/event-runtime\.mjs/);
for (const forbiddenImport of ['host-adapter.mjs', 'ledger.mjs', 'node:fs', 'node:child_process']) {
  assert.doesNotMatch(hostIoSource, new RegExp(forbiddenImport.replaceAll('.', '\\.')));
}
ok('entrypoint module graph reaches only the v4 host I/O and event runtime seams');

assert.equal(resolveGovernanceHost(['node', 'hook.mjs', '--host', 'codex']), 'codex');
assert.equal(resolveGovernanceHost(['node', 'hook.mjs', '--host=grok']), 'grok');
const envIdentity = normalizeGovernancePayload(
  { untouched: true },
  'codex',
  { CODEX_THREAD_ID: 'thread-42', CONTEXTKIT_WORK_ITEM_ID: 'T-412', CONTEXTKIT_REVISION: '9' },
);
assert.equal(envIdentity.untouched, true);
assert.equal(envIdentity.sessionId, 'thread-42');
assert.equal(envIdentity.workItemId, 'T-412');
assert.equal(envIdentity.revision, '9');
assert.equal(envIdentity.mutationAttempt, false);
assert.equal(envIdentity.interaction.intent, 'unclassified');
ok('host identity comes only from payload or environment');

let rendered = '';
emitGovernanceResult(
  { allowed: true, messages: [{ text: 'note' }], diagnostics: [] },
  { host: 'codex', eventName: 'PreToolUse', output: { write: (text) => { rendered += text; } } },
);
assert.equal(JSON.parse(rendered).hookSpecificOutput.hookEventName, 'PreToolUse');
rendered = '';
emitGovernanceResult(
  { allowed: false, messages: [{ text: 'stop' }], diagnostics: [] },
  { host: 'agy', eventName: 'PreToolUse', output: { write: (text) => { rendered += text; } } },
);
assert.equal(JSON.parse(rendered).decision, 'deny');
ok('structured runtime results render with host-native allow/block contracts');

await checkAdapter('prompt preflight', dispatchPromptPreflight, 'prompt-preflight');
await checkAdapter('write preflight', dispatchWritePreflight, 'write-preflight');
await checkAdapter('postflight', dispatchPostflight, 'postflight');
await checkAdapter('completion', dispatchCompletion, 'completion');

let noOpDispatchCount = 0;
const noOpDispatch = async () => { noOpDispatchCount += 1; return { status: 'unexpected' }; };
const exploration = await dispatchPromptPreflight(
  { prompt: 'How could I refactor this without changing anything?', session_id: 'read-only' },
  { root: ROOT, env: {}, host: 'claude', dispatch: noOpDispatch },
);
assert.equal(exploration.status, 'not-applicable');
assert.equal(exploration.messages.length, 0);
const readTool = await dispatchWritePreflight(
  { tool_name: 'Read', session_id: 'read-only' },
  { root: ROOT, env: {}, host: 'claude', dispatch: noOpDispatch },
);
assert.equal(readTool.status, 'not-applicable');
assert.equal(noOpDispatchCount, 0);
ok('conversation, exploration, and read tools never enter governance runtime');

const clarification = await dispatchPromptPreflight(
  { prompt: 'Adjust this.', session_id: 'unclear' },
  { root: ROOT, env: {}, host: 'claude', dispatch: noOpDispatch },
);
const repeatedClarification = await dispatchPromptPreflight(
  { prompt: 'Adjust this.', session_id: 'unclear', clarificationAsked: true },
  { root: ROOT, env: {}, host: 'claude', dispatch: noOpDispatch },
);
assert.equal(clarification.messages.length, 1);
assert.equal(repeatedClarification.messages.length, 0);
assert.equal(noOpDispatchCount, 0);
ok('unclassified interaction asks at most one ephemeral clarification');

const workflowContextRoot = mkdtempSync(join(tmpdir(), 'cdk-w03-context-'));
try {
  createWaveWorkflow(workflowContextRoot, 'dispatcher-context', {
    id: 'WF-0111',
    title: 'Dispatcher context',
    objective: 'Load the governed pack before a mutation',
    now: '2026-08-08T12:00:00.000Z',
  });
  let contextDispatchCall = null;
  const contextResult = await dispatchWritePreflight(
    {
      tool_name: 'Edit',
      session_id: 'context-session',
      workflow_ref: 'WF-0111',
      revision: 1,
    },
    {
      root: workflowContextRoot,
      env: {},
      host: 'claude',
      dispatch: async (call) => {
        contextDispatchCall = call;
        return { status: 'completed', allowed: true, evaluations: [], messages: [], diagnostics: [] };
      },
    },
  );
  assert.equal(contextDispatchCall.payload.observations['context-pack'].status, 'passed');
  assert.match(contextResult.contextPack, /### workflow\.json/);
  assert.match(contextResult.contextPack, /### prd\.md/);
  assert.match(contextResult.contextPack, /### spec\.md/);
  assert.match(contextResult.contextPack, /### decisions\.md/);
  assert.match(contextResult.contextPack, /### pipeline\/tasks\.json/);
  ok('write preflight injects the complete governed workflow pack before dispatch');

  const sessionContext = await loadGovernanceSessionContext(
    { hook_event_name: 'SessionStart', workflow_ref: 'WF-0111' },
    { root: workflowContextRoot, env: {} },
  );
  assert.equal(sessionContext.status, 'available');
  assert.match(sessionContext.contextPack, /### workflow\.json/);
  assert.match(sessionContext.contextPack, /### pipeline\/tasks\.json/);
  assert.doesNotMatch(sessionContext.contextPack, /Owner guidance/);
  ok('session, compact, and handoff loader renders the governed pack read-only');

  // ADR-0165 (G2): explicit owner preferences and the personalization pointer travel
  // with every context event; inferred preferences and the seeded placeholder do not.
  const preferencesDirectory = join(workflowContextRoot, 'contextkit', 'memory', 'preferences');
  mkdirSync(preferencesDirectory, { recursive: true });
  writeFileSync(join(preferencesDirectory, 'personalization.md'), '# Project personalization\n\n## Instructions\n\n### 1. Contexto antes de codigo\n\nLer CLAUDE.md primeiro.\n', 'utf8');
  editOwnerPreference(workflowContextRoot, {
    key: 'qa.gate-order', value: 'build > lint > typecheck > unit', source: 'explicit', confidence: 1,
  }, { write: true, actor: 'owner' });
  editOwnerPreference(workflowContextRoot, {
    key: 'routing.inferred-only', value: 'never shown', source: 'inferred', confidence: 0.4,
  }, { write: true, actor: 'system' });
  const guidedContext = await loadGovernanceSessionContext(
    { hook_event_name: 'SessionStart', workflow_ref: 'WF-0111' },
    { root: workflowContextRoot, env: {} },
  );
  assert.match(guidedContext.contextPack, /## Owner guidance \(recommendation-only\)/);
  assert.match(guidedContext.contextPack, /qa\.gate-order: build > lint > typecheck > unit/);
  assert.match(guidedContext.contextPack, /personalization: `contextkit\/memory\/preferences\/personalization\.md`/);
  assert.match(guidedContext.contextPack, /sections: Instructions · 1\. Contexto antes de codigo/);
  assert.doesNotMatch(guidedContext.contextPack, /routing\.inferred-only/);
  const guidanceOnly = await loadGovernanceSessionContext(
    { hook_event_name: 'SessionStart' },
    { root: workflowContextRoot, env: {} },
  );
  assert.equal(guidanceOnly.status, 'available');
  assert.match(guidanceOnly.contextPack, /^## Owner guidance/);
  ok('session context surfaces explicit owner preferences and the personalization pointer');

  // ADR-0165 (G3): a write on a configured high-risk/contract path yields exactly one
  // simulation observation with a visible message; a covering prediction silences it.
  writeFileSync(join(workflowContextRoot, 'contextkit', 'config.json'), JSON.stringify({
    level: 5,
    l5: { highRiskPaths: ['supabase/migrations/'], contractGlobs: ['src/domain/**/*.ts'] },
  }), 'utf8');
  const observedCalls = [];
  const riskDispatch = async (call) => {
    observedCalls.push(call.payload.observations?.simulation ?? null);
    return { status: 'completed', allowed: true, evaluations: [], messages: [], diagnostics: [] };
  };
  const riskOptions = { root: workflowContextRoot, env: { CLAUDE_SESSION_ID: 'risk-session' }, host: 'claude', dispatch: riskDispatch };
  await dispatchWritePreflight({ tool_name: 'Edit', session_id: 'risk-session', tool_input: { file_path: 'supabase/migrations/0001_init.sql' } }, riskOptions);
  await dispatchWritePreflight({ tool_name: 'Write', session_id: 'risk-session', tool_input: { file_path: join(workflowContextRoot, 'src', 'domain', 'patient', 'rules.ts') } }, riskOptions);
  await dispatchWritePreflight({ tool_name: 'Edit', session_id: 'risk-session', tool_input: { file_path: 'README.md' } }, riskOptions);
  await dispatchWritePreflight({ tool_name: 'Edit', session_id: 'risk-session', tool_input: { file_path: '../outside.sql' } }, riskOptions);
  assert.equal(observedCalls[0]?.status, 'violated');
  assert.equal(observedCalls[0]?.riskEntry, 'supabase/migrations/');
  assert.match(observedCalls[0]?.visibleMessage ?? '', /mark-simulation\.mjs --write "<objective>" supabase\/migrations\/0001_init\.sql/);
  assert.equal(observedCalls[0]?.problemKey, 'simulation:supabase/migrations/');
  assert.equal(observedCalls[1]?.status, 'violated');
  assert.equal(observedCalls[1]?.riskEntry, 'src/domain/**/*.ts');
  assert.equal(observedCalls[2], null);
  assert.equal(observedCalls[3], null);
  ok('write preflight observes high-risk and contract paths, and only those');

  const predictionsDirectory = join(workflowContextRoot, 'contextkit', 'memory', 'predictions');
  mkdirSync(predictionsDirectory, { recursive: true });
  writeFileSync(join(predictionsDirectory, '2020-01-01-risk-session-migrations.md'), [
    '# Prediction — migrations',
    '',
    '- **Date**: 2020-01-01',
    '- **Prediction ID**: 2020-01-01-risk-session-migrations',
    '- **Source**: explicit `/simulate-impact` command',
    '- **Covered paths**: supabase/migrations/',
    '',
  ].join('\n'), 'utf8');
  await dispatchWritePreflight({ tool_name: 'Edit', session_id: 'risk-session', tool_input: { file_path: 'supabase/migrations/0002_next.sql' } }, riskOptions);
  await dispatchWritePreflight({ tool_name: 'Edit', session_id: 'other-session', tool_input: { file_path: 'supabase/migrations/0002_next.sql' } }, { ...riskOptions, env: { CLAUDE_SESSION_ID: 'other-session' } });
  assert.equal(observedCalls[4]?.status, 'passed');
  assert.equal(observedCalls[4]?.predictionId, '2020-01-01-risk-session-migrations');
  assert.equal(observedCalls[5]?.status, 'violated');
  ok('a prediction covering the path for this session satisfies the simulation observation; another session\'s stale prediction does not');
} finally {
  rmSync(workflowContextRoot, { recursive: true, force: true });
}

console.log(`\n${checks} checks passed.\n`);
