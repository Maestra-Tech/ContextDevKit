/**
 * ContextDevKit 4 governance matrix integration tests (ADR-0158, WF-0111 W01).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reporter } from './it-helpers.mjs';

const KIT = dirname(dirname(fileURLToPath(import.meta.url)));
const importTemplate = (relativePath) => import('file://' + resolve(KIT, relativePath).replaceAll('\\', '/'));
const rep = reporter();

try {
  const modes = await importTemplate('templates/contextkit/runtime/execution/enforcement-modes.mjs');
  const registry = await importTemplate('templates/contextkit/runtime/governance/gate-registry.mjs');
  const gateMode = await importTemplate('templates/contextkit/runtime/governance/gate-mode.mjs');
  const defaults = await importTemplate('templates/contextkit/runtime/config/defaults.mjs');
  JSON.stringify(modes.ENFORCEMENT_MODES) === JSON.stringify(['off', 'shadow', 'canary', 'guarded'])
    ? rep.ok('E1 canonical mode enum') : rep.bad('E1 canonical mode enum drifted');
  modes.resolveEnforcementMode(null) === 'canary'
    ? rep.ok('E2 missing config -> canary') : rep.bad('E2 missing config did not become canary');
  modes.resolveEnforcementMode({ governance: { defaultMode: 'shadow' } }) === 'shadow'
    ? rep.ok('E3 canonical governance key is authoritative') : rep.bad('E3 canonical governance key failed');
  const warnings = [];
  modes.resolveEnforcementMode({ enforcement: { mode: 'strict' } }, { onWarning: (warning) => warnings.push(warning) }) === 'canary'
    && warnings.length === 1
    ? rep.ok('E4 v3 alias is ignored by runtime and degrades to canary') : rep.bad('E4 v3 alias leaked into runtime policy');

  const matrix = gateMode.resolveGovernanceMatrix(defaults.DEFAULT_CONFIG);
  const guarded = Object.entries(matrix.modes).filter(([, mode]) => mode === 'guarded').map(([gateId]) => gateId);
  guarded.length === 3 && guarded.every((gateId) => registry.GUARDED_GATE_IDS.includes(gateId))
    ? rep.ok('E5 guarded default allowlist is exact') : rep.bad(`E5 guarded defaults: ${guarded.join(', ')}`);
  matrix.modes['architecture-debt'] === 'canary'
    && matrix.modes['privacy-lgpd'] === 'shadow'
    && matrix.modes['agent-routing'] === 'canary'
    ? rep.ok('E6 non-blocking matrix defaults') : rep.bad('E6 non-blocking matrix defaults drifted');

  const badConfig = {
    governance: {
      defaultMode: 'canary', failurePolicy: 'deny', humanAuthority: 'quorum',
      gates: { 'privacy-lgpd': 'guarded', 'qa-signoff': 'strict' },
    },
  };
  const lgpd = gateMode.resolveGateMode(badConfig, 'privacy-lgpd');
  lgpd.mode === 'canary' && lgpd.failurePolicy === 'continue' && lgpd.warnings.length >= 3
    ? rep.ok('E7 invalid powers clamp to canary/continue') : rep.bad(`E7 clamp failed: ${JSON.stringify(lgpd)}`);
  gateMode.resolveGateMode(null, 'qa-signoff').mode === 'canary'
    ? rep.ok('E8 missing gate config -> canary') : rep.bad('E8 missing gate config did not become canary');

  const installRoot = mkdtempSync(join(tmpdir(), 'ck-gate-plan-'));
  try {
    const plan = gateMode.resolveGatePlan({ moment: 'completion', root: installRoot, payload: { gates: ['privacy-lgpd'] } });
    plan.gates.some((gate) => gate.id === 'qa-signoff')
      && !plan.gates.some((gate) => gate.id === 'privacy-lgpd')
      ? rep.ok('E9 production plan selects registry by moment, ignoring payload.gates')
      : rep.bad(`E9 production plan drifted: ${plan.gates.map((gate) => gate.id).join(', ')}`);
  } finally {
    rmSync(installRoot, { recursive: true, force: true });
  }

  const qaGate = gateMode.resolveGateMode(defaults.DEFAULT_CONFIG, 'qa-signoff');
  const qaViolation = {
    status: 'violated', deterministic: true, applicable: true, evidenced: true, transition: 'done',
  };
  gateMode.evaluateGateObservation({ gate: qaGate, moment: 'completion', observation: qaViolation }).decision === 'deny'
    ? rep.ok('E10 QA denies evidenced done transition') : rep.bad('E10 QA did not deny applicable completion violation');
  gateMode.evaluateGateObservation({ gate: qaGate, moment: 'write-preflight', observation: qaViolation }).decision === 'warn'
    ? rep.ok('E11 QA cannot deny write-preflight') : rep.bad('E11 QA denied before completion');
  gateMode.evaluateGateObservation({ gate: qaGate, moment: 'completion', observation: { status: 'error' } }).decision === 'warn'
    ? rep.ok('E12 gate error continues') : rep.bad('E12 gate error blocked');

  const shadowGate = gateMode.resolveGateMode(defaults.DEFAULT_CONFIG, 'privacy-lgpd');
  gateMode.evaluateGateObservation({ gate: shadowGate, moment: 'postflight', observation: qaViolation }).decision === 'silent'
    ? rep.ok('E13 shadow stays silent') : rep.bad('E13 shadow surfaced or blocked');

  // ADR-0165: observations may speak; only warn/deny verdicts carry the text.
  const simulationGate = gateMode.resolveGateMode(defaults.DEFAULT_CONFIG, 'simulation');
  const spokenViolation = {
    status: 'violated', deterministic: true, applicable: true, evidenced: true,
    visibleMessage: '  Impact analysis before write: src/domain/x.ts  ', problemKey: 'simulation:src/domain/',
  };
  const spokenWarn = gateMode.evaluateGateObservation({ gate: simulationGate, moment: 'write-preflight', observation: spokenViolation });
  spokenWarn.decision === 'warn'
    && spokenWarn.visibleMessage === 'Impact analysis before write: src/domain/x.ts'
    && spokenWarn.problemKey === 'simulation:src/domain/'
    ? rep.ok('E14 warn verdict carries the observation visibleMessage and problemKey')
    : rep.bad(`E14 warn verdict lost its message: ${JSON.stringify(spokenWarn)}`);
  const spokenPass = gateMode.evaluateGateObservation({
    gate: simulationGate, moment: 'write-preflight', observation: { ...spokenViolation, status: 'passed' },
  });
  spokenPass.decision === 'allow' && !('visibleMessage' in spokenPass) && !('problemKey' in spokenPass)
    ? rep.ok('E15 passing verdict never leaks observation text')
    : rep.bad(`E15 passing verdict leaked text: ${JSON.stringify(spokenPass)}`);
  const shadowSpoken = gateMode.evaluateGateObservation({ gate: shadowGate, moment: 'postflight', observation: spokenViolation });
  shadowSpoken.decision === 'silent' && !('visibleMessage' in shadowSpoken)
    ? rep.ok('E16 shadow verdict stays silent even with a spoken observation')
    : rep.bad(`E16 shadow verdict surfaced text: ${JSON.stringify(shadowSpoken)}`);

  const override = gateMode.buildHumanOverrideMetadata('qa-signoff', {
    actor: 'owner', reason: 'explicit decision', scope: { taskId: '410' },
    baseRevision: 9, timestamp: '2026-08-08T12:00:00.000Z',
    expiresAt: '2099-08-08T12:15:00.000Z', outcome: 'accepted',
  });
  gateMode.evaluateGateObservation({
    gate: qaGate,
    moment: 'completion',
    observation: { ...qaViolation, override, currentRevision: 9, currentScope: { taskId: '410' } },
  }).decision === 'allow'
    ? rep.ok('E14 owner override needs no autonomy grade') : rep.bad('E14 owner override failed');
  registry.OVERRIDE_METADATA_FIELDS.every((field) => Object.hasOwn(override, field))
    ? rep.ok('E15 override audit metadata complete') : rep.bad('E15 override audit metadata incomplete');
  gateMode.evaluateGateObservation({
    gate: qaGate,
    moment: 'completion',
    observation: { ...qaViolation, override, currentRevision: 10, currentScope: { taskId: '410' } },
  }).decision === 'deny'
    ? rep.ok('E15b stale override cannot replay onto a new revision')
    : rep.bad('E15b stale override replayed onto a new revision');

  const dddGate = gateMode.resolveGateMode(defaults.DEFAULT_CONFIG, 'ddd-invariants');
  const dddFacts = { status: 'violated', deterministic: true, applicable: true, evidenced: true };
  gateMode.evaluateGateObservation({ gate: dddGate, moment: 'write-preflight', observation: { ...dddFacts, invariantClass: 'A' } }).decision === 'deny'
    && gateMode.evaluateGateObservation({ gate: dddGate, moment: 'write-preflight', observation: { ...dddFacts, invariantClass: 'B' } }).decision === 'warn'
    ? rep.ok('E16 DDD guards only proven Class A invariants')
    : rep.bad('E16 DDD Class A boundary failed');

  const debtGate = gateMode.resolveGateMode(defaults.DEFAULT_CONFIG, 'technical-debt');
  const debtFacts = {
    status: 'violated', deterministic: true, applicable: true, evidenced: true,
    introducedByCurrentDiff: true, newDebt: true, severity: 'high',
  };
  gateMode.evaluateGateObservation({ gate: debtGate, moment: 'completion', observation: debtFacts }).decision === 'deny'
    && gateMode.evaluateGateObservation({ gate: debtGate, moment: 'completion', observation: { ...debtFacts, newDebt: false } }).decision === 'warn'
    && gateMode.evaluateGateObservation({ gate: debtGate, moment: 'completion', observation: { ...debtFacts, severity: 'medium' } }).decision === 'warn'
    ? rep.ok('E17 technical debt guards only new deterministic high-severity diff debt')
    : rep.bad('E17 technical-debt boundary failed');

  typeof modes.decide === 'undefined'
    ? rep.ok('E18 receipt/bypass decision adapter is physically absent')
    : rep.bad('E18 retired receipt/bypass decision adapter remains exported');
} catch (error) {
  rep.bad(`governance integration crashed: ${error?.stack ?? error}`);
}

rep.finish('governance matrix (ADR-0158)');
