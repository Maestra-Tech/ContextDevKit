/**
 * Single source of truth for the test-suite inventory (TEA-002, SPEC §3).
 *
 * WHY this file exists: before TEA-002 the 41-suite list lived ONLY inside the
 * `test` `&&` chain in package.json. There was no way to run a subset and no
 * guard against drift — a suite added to `test` could be silently missed by any
 * future tier or selector. Every npm script (incl. `npm test`) now runs *from
 * this list* via `tools/run-suites.mjs`, and `tools/selfcheck-suites.mjs`
 * asserts the list covers every suite file on disk (immutable rule 3).
 *
 * Each entry is `{ id, file, tier, touches }`:
 *   - `id`      — short, stable identifier (used by `--list` and reporters).
 *   - `file`    — the `tools/...mjs` path, forward-slashed, relative to repo root.
 *   - `tier`    — EXACTLY ONE of TIERS (see below). Drives the `test:*` scripts.
 *   - `touches` — conservative source-path SEEDS that select this suite when
 *                 changed. Best-effort; `tools/test-impact.mjs` refines/broadens.
 *                 A false-negative (suite that should run but didn't) is worse
 *                 than over-selecting, so keep these honest and conservative.
 *
 * IMPORTANT: the array order below is the LEGACY execution order (the literal
 * old `package.json:19` `&&` chain). `run-suites.mjs --legacy` replays exactly
 * this order so the rollback path stays a one-line flip.
 */

/**
 * The eight execution tiers. Each suite belongs to EXACTLY ONE. The grouping is
 * a mapping exercise (SPEC §2) — no suite file moves; only the npm script that
 * invokes the group is new.
 * @type {readonly string[]}
 */
import { WORKFLOW_ENGINE_SUITES } from './test-suites-workflow.mjs';
import { BDM_SUITES } from './test-suites-bdm.mjs';
import { INFRA_SUITES } from './test-suites-infra.mjs';
import { MCP_SUITES } from './test-suites-mcp.mjs';
import { WF0059_SUITES } from './test-suites-wf0059.mjs';
import { WF0069_SUITES } from './test-suites-wf0069.mjs';
import { WF0070_SUITES } from './test-suites-wf0070.mjs';
import { WF0081_SUITES } from './test-suites-wf0081.mjs';
import { WF0089_SUITES } from './test-suites-wf0089.mjs';
import { WF0090_SUITES } from './test-suites-wf0090.mjs';
import { WF0094_SUITES } from './test-suites-wf0094.mjs';
import { WF0086_SUITES } from './test-suites-wf0086.mjs';
import { WF0095_SUITES } from './test-suites-wf0095.mjs';

export const TIERS = Object.freeze([
  'smoke',
  'selfcheck',
  'integration:core',
  'integration:installer',
  'integration:hosts',
  'integration:workflow',
  'integration:enforcement',
  'integration:ecosystem',
]);

/** Conventional integration-test file path from its short name. */
const it = (name) => `tools/integration-test-${name}.mjs`;

/**
 * The full suite inventory, in LEGACY execution order. 41 product suites + the
 * standalone `selfcheck-suites` floor check (also a smoke suite). Touches seeds
 * are conservative prefixes/globs into the SOURCE tree the suite exercises.
 * @type {ReadonlyArray<{id:string,file:string,tier:string,touches:string[]}>}
 */
export const SUITES = Object.freeze([
  // selfcheck (static, in-process wiring) — 1
  // `touches` excludes the broad runtime seed so focused v4 suites own their
  // source prefixes without dragging in this static monolith.
  { id: 'selfcheck', file: 'tools/selfcheck.mjs', tier: 'selfcheck',
    touches: ['tools/selfcheck', 'install.mjs'] },
  { id: 'session-autonomy', file: 'tools/selfcheck-session-autonomy-all.mjs', tier: 'smoke',
    touches: ['templates/contextkit/tools/scripts/economics/session-autonomy/', 'templates/contextkit/tools/scripts/economics/calibration/'] },

  // integration:core — engine + real hooks — 5
  { id: 'integration-test', file: 'tools/integration-test.mjs', tier: 'integration:core',
    touches: ['install.mjs', 'templates/contextkit/runtime/hooks/', 'templates/contextkit/runtime/config/'] },
  { id: 'governance-anti-loop', file: it('governance-anti-loop'), tier: 'integration:core',
    touches: ['templates/contextkit/runtime/governance/'] },
  { id: 'governance-dispatchers', file: it('governance-dispatchers'), tier: 'integration:hosts',
    touches: ['templates/contextkit/runtime/hooks/governance-', 'templates/contextkit/runtime/hooks/write-risk-observation.mjs', 'templates/contextkit/runtime/hooks/boot-context-readers.mjs', 'templates/contextkit/runtime/preferences/owner-preferences.mjs', 'templates/contextkit/runtime/config/settings-compose.mjs', 'templates/contextkit/runtime/config/codex-hooks-compose.mjs'] },
  { id: 'tooling', file: it('tooling'), tier: 'integration:installer',
    touches: ['templates/contextkit/tools/scripts/', 'templates/contextkit/squads/'] },
  { id: 'tooling-qa', file: it('tooling-qa'), tier: 'integration:workflow',
    touches: ['templates/contextkit/squads/qa-team/', 'templates/contextkit/commands/qa'] },
  { id: 'project-map', file: it('project-map'), tier: 'integration:core',
    touches: ['templates/contextkit/tools/scripts/project-map', 'templates/contextkit/runtime/hooks/'] },
  { id: 'token-economy', file: it('token-economy'), tier: 'integration:core',
    touches: ['templates/contextkit/tools/scripts/token', 'templates/contextkit/runtime/economy/'] },
  { id: 'eacp', file: it('eacp'), tier: 'integration:core',
    touches: ['templates/contextkit/tools/scripts/economics/'] },
  { id: 'competitive-followups', file: it('competitive-followups'), tier: 'integration:core', touches: ['templates/contextkit/tools/scripts/claims-gate', 'templates/contextkit/tools/scripts/runs'] },
  { id: 'tooling-agent-forge', file: it('tooling-agent-forge'), tier: 'integration:workflow',
    touches: ['templates/contextkit/squads/agent-forge/'] },
  { id: 'guards', file: it('guards'), tier: 'integration:installer',
    touches: ['templates/contextkit/runtime/hooks/commit-msg', 'templates/contextkit/runtime/hooks/pre-push', 'templates/contextkit/runtime/config/load'] },
  { id: 'advisory-policy', file: it('advisory-policy'), tier: 'integration:core',
    touches: ['templates/contextkit/tools/scripts/model-policy', 'templates/contextkit/policy/routing-policy', 'templates/contextkit/runtime/execution/routing-runtime', 'templates/contextkit/runtime/governance/risk-acknowledgement', 'templates/contextkit/runtime/execution/agent-orchestration-guard', 'templates/contextkit/runtime/preferences/', 'templates/claude/agents/privacy-lgpd'] },
  { id: 'update-safety', file: it('update-safety'), tier: 'integration:installer',
    touches: ['install.mjs'] },
  { id: 'config-migrate', file: it('config-migrate'), tier: 'integration:installer',
    touches: ['tools/install/config-migrate.mjs', 'templates/contextkit/runtime/config/defaults.mjs'] },
  { id: 'antigravity', file: it('antigravity'), tier: 'integration:hosts',
    touches: ['templates/contextkit/runtime/antigravity/', 'templates/ctx.mjs'] },
  { id: 'codex', file: it('codex'), tier: 'integration:hosts',
    touches: ['templates/contextkit/runtime/codex/', 'templates/cdx.mjs'] },
  { id: 'grok', file: it('grok'), tier: 'integration:hosts',
    touches: ['install.mjs', 'tools/install/grok.mjs', 'templates/contextkit/runtime/config/grok-hooks-compose.mjs', 'templates/contextkit/runtime/hooks/governance-'] },
  { id: 'lp', file: it('lp'), tier: 'integration:hosts',
    touches: ['templates/contextkit/squads/design-team/', 'templates/contextkit/commands/landing-page'] },
  { id: 'swarm', file: it('swarm'), tier: 'smoke',
    touches: ['templates/contextkit/tools/scripts/swarm', 'templates/contextkit/commands/swarm'] },
  { id: 'deliberation', file: it('deliberation'), tier: 'integration:workflow',
    touches: ['templates/contextkit/tools/scripts/deliberation', 'templates/contextkit/commands/debate'] },
  { id: 'hooks', file: it('hooks'), tier: 'integration:core',
    touches: ['templates/contextkit/runtime/hooks/'] },
  { id: 'hookcoexist', file: it('hookcoexist'), tier: 'integration:ecosystem',
    touches: ['templates/contextkit/runtime/config/settings-compose', 'templates/contextkit/runtime/hooks/'] },
  { id: 'project-tool-interop', file: it('project-tool-interop'), tier: 'integration:ecosystem',
    touches: ['templates/contextkit/runtime/integrations/', 'templates/contextkit/runtime/graph/provider.mjs', 'templates/contextkit/tools/scripts/graph.mjs', 'templates/contextkit/tools/scripts/doctor.mjs', 'templates/AGENTS.md.tpl', 'templates/CLAUDE.md.tpl', 'templates/INSTRUCTIONS.md.tpl', 'install.mjs'] },
  { id: 'compozy-executor', file: it('compozy-executor'), tier: 'integration:ecosystem',
    touches: ['templates/contextkit/runtime/execution/governed-execution-envelope.mjs', 'templates/contextkit/runtime/execution/executor-dispatch.mjs', 'templates/contextkit/runtime/integrations/compozy-executor.mjs', 'templates/contextkit/tools/scripts/execute.mjs'] },
  { id: 'qgates', file: it('qgates'), tier: 'integration:enforcement',
    touches: ['templates/contextkit/tools/scripts/qgates', 'templates/contextkit/runtime/hooks/'] },
  { id: 'ci-squad', file: it('ci-squad'), tier: 'integration:ecosystem',
    touches: ['templates/contextkit/squads/', '.github/workflows/'] },
  { id: 'marker-inject', file: it('marker-inject'), tier: 'smoke',
    touches: ['templates/contextkit/runtime/hooks/boot', 'templates/contextkit/runtime/hooks/inject'] },
  { id: 'bridges', file: it('bridges'), tier: 'integration:hosts',
    touches: ['templates/contextkit/runtime/antigravity/', 'templates/contextkit/runtime/codex/'] },
  { id: 'capabilities', file: it('capabilities'), tier: 'smoke',
    touches: ['templates/contextkit/runtime/capabilities/', 'templates/contextkit/runtime/config/'] },
  { id: 'install-cycle', file: it('install-cycle'), tier: 'smoke',
    touches: ['install.mjs'] },
  { id: 'fleet-portability', file: it('fleet'), tier: 'integration:installer',
    touches: ['install.mjs', 'tools/install/', 'templates/contextkit/tools/scripts/docs-reindex.mjs', 'templates/contextkit/tools/scripts/registry/fleet.mjs'] },
  { id: 'enforcement-modes', file: it('enforcement-modes'), tier: 'smoke',
    touches: ['templates/contextkit/runtime/governance/', 'templates/contextkit/runtime/execution/enforcement-modes.mjs'] },
  // PKG-05 — Project-map & adaptive context (CDK-050…056), advisory, additive.
  { id: 'pkg05-roots', file: 'tools/selfcheck-pkg05-050.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/project-map-roots', 'templates/contextkit/tools/scripts/project-map-core'] },
  { id: 'pkg05-coverage', file: 'tools/selfcheck-pkg05-051.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/project-map-coverage'] },
  { id: 'pkg05-manifest', file: 'tools/integration-test-pkg05-052.mjs', tier: 'integration:core',
    touches: ['templates/contextkit/tools/scripts/context-manifest'] },
  { id: 'pkg05-playbook-scope', file: 'tools/selfcheck-pkg05-053.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/playbook-scope', 'templates/contextkit/tools/scripts/playbook'] },
  { id: 'pkg05-memory-score', file: 'tools/selfcheck-pkg05-054.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/memory-score'] },
  { id: 'pkg05-rule-archive', file: 'tools/selfcheck-pkg05-055.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/rule-archive'] },
  { id: 'pkg05-host-parity', file: 'tools/selfcheck-pkg05-056.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/host-parity'] },

  // PKG-06 — Multi-host telemetry, capability compliance, benchmark, drift (advisory, additive).
  { id: 'pkg06-skill-runner', file: 'tools/selfcheck-pkg06-060.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/skill-runner'] },
  { id: 'pkg06-compliance', file: 'tools/selfcheck-pkg06-061.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/capability-compliance'] },
  { id: 'pkg06-telemetry', file: 'tools/selfcheck-pkg06-062.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/telemetry/'] },
  { id: 'pkg06-benchmark', file: 'tools/selfcheck-pkg06-065.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/benchmark-task'] },
  { id: 'pkg06-wiring-drift', file: 'tools/selfcheck-pkg06-068.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/wiring-drift'] },

  // PKG-06 cost consumers (wf 0027) — advisory consumers of the EACP economics layer.
  { id: 'pkg06-host-cost', file: 'tools/selfcheck-pkg06-063.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/host-cost'] },
  { id: 'pkg06-capability-roi', file: 'tools/selfcheck-pkg06-066.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/capability-roi'] },
  { id: 'pkg06-cache-churn', file: 'tools/selfcheck-pkg06-067.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/cache-churn-health'] },

  // PKG-07 — Lineage graph (CDK-070), read-only advisory, unregistered.
  { id: 'selfcheck-lineage', file: 'tools/selfcheck-lineage.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/lineage-graph', 'templates/contextkit/runtime/authority-reader', 'templates/contextkit/tools/scripts/tasks-store'] },

  { id: 'dev-start-economy', file: it('dev-start-economy'), tier: 'integration:core',
    touches: ['templates/contextkit/tools/scripts/economy/dev-start', 'templates/contextkit/runtime/execution/economy-lifecycle', 'templates/contextkit/tools/scripts/routing/', 'templates/claude/commands/pipeline/dev-start'] },

  // PKG-07 — Lineage consumers (CDK-071…077), read-only advisory, unregistered.
  { id: 'pkg07-public', file: 'tools/selfcheck-pkg07-071.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/lineage-public'] },
  { id: 'pkg07-calibration', file: 'tools/selfcheck-pkg07-072.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/lineage-calibration', 'templates/contextkit/tools/scripts/predictions-review'] },
  { id: 'pkg07-rules', file: 'tools/selfcheck-pkg07-073.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/lineage-rules'] },
  { id: 'pkg07-policy', file: 'tools/selfcheck-pkg07-074.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/policy-registry'] },
  { id: 'pkg07-scorecard', file: 'tools/selfcheck-pkg07-076.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/engineering-scorecard', 'templates/contextkit/tools/scripts/lineage-rules', 'templates/contextkit/tools/scripts/lineage-graph'] },
  // PKG-08 — Fleet & agent platform (CDK-080/081/082), read-only advisory, unregistered.
  { id: 'pkg08-fleet', file: 'tools/selfcheck-pkg08-fleet.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/fleet-compliance', 'templates/contextkit/tools/scripts/agent-registry', 'templates/contextkit/tools/scripts/policy-distribution'] },

  // WF0020 Economy Runtime — Wave 1 (ECON-01..07/11): aggregates the cards' econCheck* exports.
  { id: 'economy-wave1', file: 'tools/selfcheck-economy-wave1.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/economy/'] },
  { id: 'economy-completeness', file: 'tools/selfcheck-economy-completeness.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/economy/registry.mjs'] },
  { id: 'economy-instrumentation', file: 'tools/selfcheck-economy-instrumentation.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/economy/'] },

  // WF0020 Economy Runtime — Wave 2 (ECON-08/09/10): lean-loop/loop-breaker/patch-economy econCheck*.
  { id: 'economy-wave2', file: 'tools/selfcheck-economy-wave2.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/economy/'] },


  // 3.1.2 updater-safety hotfix (ADR-0099, WF0034) — session/ledger preservation,
  // safe writes, external preflight/snapshot/status, project-map safe deferral.
  { id: 'safe-writes', file: it('safe-writes'), tier: 'integration:installer',
    touches: ['tools/install/fs.mjs', 'tools/install/claude.mjs'] },
  { id: 'update-preflight', file: it('update-preflight'), tier: 'integration:installer',
    touches: ['tools/install/update-preflight.mjs', 'tools/install/update-status.mjs'] },
  { id: 'update-snapshot', file: it('update-snapshot'), tier: 'integration:installer',
    touches: ['tools/install/update-snapshot.mjs', 'tools/install/update-status.mjs'] },
  { id: 'project-personalization', file: it('project-personalization'), tier: 'integration:installer',
    touches: ['install.mjs', 'tools/install/personalization.mjs', 'tools/install/lib/marker-inject.mjs', 'tools/install/engine.mjs', 'tools/install/update-snapshot.mjs', 'templates/contextkit/runtime/preferences/owner-preferences.mjs'] },
  { id: 'projmap-defer', file: it('projmap-defer'), tier: 'integration:installer',
    touches: ['tools/install/project-map-baseline.mjs'] },
  // 3.1.2 RUN 2 hardening — non-TTY conflict honesty, idempotency, and failure boundaries.
  { id: 'sync-conflict', file: it('sync-conflict'), tier: 'integration:installer',
    touches: ['tools/install/sync.mjs'] },
  { id: 'update-idempotency', file: it('update-idempotency'), tier: 'integration:installer',
    touches: ['install.mjs', 'tools/install/engine.mjs', 'tools/install/fs.mjs'] },
  { id: 'update-failure', file: it('update-failure'), tier: 'integration:installer',
    touches: ['install.mjs', 'tools/install/update-snapshot.mjs', 'tools/install/update-preflight.mjs'] },

  // WF-0068 (BIZ-0003, ADR-0128 §25/§26/§30) — Domain Engineering distribution:
  // fresh install lands policy/domain-* + contextkit/skills + the two gate hooks;
  // default-OFF block-proof; /domain CLI; --update non-destructive; --purge reversible.
  { id: 'domain-distribution', file: it('domain-distribution'), tier: 'integration:installer',
    touches: ['tools/install/engine.mjs', 'tools/install/uninstall.mjs', 'templates/contextkit/runtime/config/settings-compose.mjs', 'templates/contextkit/tools/scripts/domain-inspect.mjs'] },

  { id: 'projmap-signals', file: 'tools/selfcheck-projmap-signals.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/project-map-signals', 'templates/contextkit/tools/scripts/project-map-insights'] }, // WF-0057 W1.1 (ADR-0122) structural signals
  { id: 'blast-radius', file: 'tools/selfcheck-blast-radius.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/blast-radius', 'templates/contextkit/tools/scripts/project-map-signals'] }, // WF-0071 GC1-T1 (BIZ-0004) blast-radius consumer lookup
  { id: 'graph-extract', file: 'tools/selfcheck-graph-extract.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-extract', 'templates/contextkit/tools/scripts/project-map-graph', 'templates/contextkit/tools/scripts/project-map-dense'] }, // WF-0071 GC1-T2 (BIZ-0004) graph extraction + committed projection writer
  { id: 'resolve', file: 'tools/selfcheck-resolve.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/project-map-resolve', 'templates/contextkit/tools/scripts/graph-extract'] }, // WF-0071 GC2-T1 (BIZ-0004) two-phase cross-file resolver + phantom guard + dedup
  { id: 'gc3-validation', file: 'tools/selfcheck-gc3-validation.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-extract', 'templates/contextkit/tools/scripts/project-map-graph', 'templates/contextkit/tools/scripts/project-map-resolve'] }, // WF-0071 GC3-T1 (BIZ-0004) determinism / degradation / incremental-merge / golden validation
  { id: 'gc4-packaging', file: 'tools/selfcheck-gc4-packaging.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-config', 'templates/contextkit/runtime/hooks/', 'templates/contextkit/runtime/config/load'] }, // WF-0071 GC4-T1 (BIZ-0004) capability gate default-off + hot-path purity proof
  { id: 'graph-query', file: 'tools/selfcheck-graph-query.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-query'] }, // WF-0072 IF1 (BIZ-0004) graph query core (reverse callers/consumers, bounded reachability, god-nodes, shortest-path)
  { id: 'graph-ast', file: 'tools/selfcheck-graph-ast.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-ast'] }, // WF-0080 (BIZ-0004) Tier-1 WASM AST extractor
  { id: 'graph-consumers', file: 'tools/selfcheck-graph-consumers.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-consumers', 'templates/contextkit/tools/scripts/graph-query'] }, // WF-0072 IF2 (BIZ-0004) consumer adapters + MCP graph tool dispatch
  { id: 'graph-cli', file: 'tools/selfcheck-graph-cli.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph'] }, // WF-0072 IF2 (BIZ-0004) /graph CLI dispatch surface
  { id: 'wf0111-project-map', file: 'tools/selfcheck-wf0111-project-map.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/project-map-roots', 'templates/contextkit/tools/scripts/project-map-core', 'templates/contextkit/tools/scripts/project-map-dense', 'templates/contextkit/tools/scripts/project-map-graph', 'templates/contextkit/tools/scripts/graph', 'templates/contextkit/runtime/graph'] }, // WF-0111 W10 typed roots, governed memory, provider and non-denying fallback
  { id: 'rationale-nodes', file: 'tools/selfcheck-rationale-nodes.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/rationale-nodes'] }, // WF-0073 SR1 (BIZ-0004) LINKS verb: adr:#### nodes + cites edges
  { id: 'graph-sanitize', file: 'tools/selfcheck-graph-sanitize.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-sanitize'] }, // WF-0073 SR1 (BIZ-0004) injection sanitization pipeline (ADR-0138)
  { id: 'graph-graded', file: 'tools/selfcheck-graph-graded.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-graded-signals'] }, // WF-0073 SR2 (BIZ-0004) ENFORCES: graded arch-debt signals (ADR-0137)
  { id: 'graph-egress', file: 'tools/selfcheck-graph-egress.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-egress'] }, // WF-0073 SR2 (BIZ-0004) zero-egress allowlist + refuse-by-default semantic gate (ADR-0138)
  { id: 'graph-activation', file: 'tools/selfcheck-graph-activation.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/graph-activation'] }, // WF-0074 RO2 (BIZ-0004) staged rollout ladder (ADR-0134)
  { id: 'hotpath-purity', file: 'tools/selfcheck-hotpath-purity.mjs', tier: 'selfcheck', touches: ['templates/contextkit/runtime/hooks', 'templates/contextkit/runtime/config/load'] }, // WF-0074 RO3 (BIZ-0004) hot-path zero-dep purity proof (ADR-0134)
  { id: 'graph-index', file: 'tools/selfcheck-graph-index.mjs', tier: 'selfcheck', touches: ['tools/install/graph-index'] }, // WF-0074 (BIZ-0004) index-on-update installer machinery
  { id: 'arch-debt', file: 'tools/selfcheck-arch-debt.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/arch-debt/', 'templates/contextkit/tools/scripts/architecture-debt-gate.mjs', 'templates/contextkit/runtime/config/resolve-arch-debt-config.mjs', 'templates/contextkit/runtime/execution/arch-debt-law.mjs'] }, // Architecture-debt analysis remains advisory/canary; the v3 pre-write hook is retired.
  { id: 'arch-debt-config', file: 'tools/selfcheck-arch-debt-config.mjs', tier: 'selfcheck', touches: ['templates/contextkit/runtime/config/defaults-arch-debt.mjs', 'templates/contextkit/runtime/config/resolve-arch-debt-config.mjs', 'templates/contextkit/runtime/config/schema-sections.mjs'] }, // WF-0057 W5.2 (ADR-0122) gate config block + legacy line-budget migration
  { id: 'arch-debt-calibration', file: 'tools/selfcheck-arch-debt-calibration.mjs', tier: 'selfcheck', touches: ['templates/contextkit/runtime/config/resolve-arch-debt-config.mjs', 'templates/contextkit/runtime/config/schema-arch-debt.mjs', 'templates/contextkit/tools/scripts/architecture-debt-gate.mjs', 'contextkit/config.json'] }, // WF-0057 #370 (ADR-0122) F2/F3 floor calibration — floors EVALUATE on the live tree, block a real new violation, pass clean
  { id: 'arch-debt-acceptance', file: 'tools/selfcheck-arch-debt-acceptance.mjs', tier: 'selfcheck', touches: ['templates/contextkit/tools/scripts/architecture-debt-gate.mjs', 'templates/contextkit/tools/scripts/arch-debt/', 'templates/contextkit/runtime/config/defaults-arch-debt.mjs', 'tools/install/config-migrate.mjs'] }, // WF-0057 W6.1 (ADR-0122) MASTER acceptance suite — §35 headline invariants + §34 engine-level GAPs (contract/contradiction/amplification/greenfield/installer/semantic/experimental)
  // WF0033 project-map auto-baseline (PMB-01..03, ADR-0098) — advisory + fail-open;
  // the baseline is generated on --update / onboarding and nudged at boot when missing.
  { id: 'projmap-baseline', file: it('projmap-baseline'), tier: 'integration:installer',
    touches: ['install.mjs', 'tools/install/project-map-baseline.mjs'] },
  { id: 'projmap-onboarding', file: 'tools/selfcheck-projmap-onboarding.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/tools/scripts/setup-complete.mjs', 'templates/claude/commands/setup/setupcontextdevkit.md'] },
  { id: 'projmap-boot-nudge', file: 'tools/selfcheck-boot-signals-projmap.mjs', tier: 'selfcheck',
    touches: ['templates/contextkit/runtime/hooks/boot-signals-projmap.mjs'] },
  { id: 'authority-consumers-v4', file: 'tools/integration-test-authority-consumers-v4.mjs', tier: 'integration:workflow',
    touches: ['templates/contextkit/runtime/authority-reader.mjs', 'templates/contextkit/runtime/statusline.mjs', 'templates/contextkit/runtime/hooks/boot-', 'templates/contextkit/tools/scripts/dashboard-', 'templates/contextkit/mcp-server/'] },

  // BIZ-0001 / WF-0036+WF-0037 (Business-driven methodology) — split into its own
  // module to keep this registry within the line budget (see test-suites-bdm.mjs).
  ...BDM_SUITES,

  ...WORKFLOW_ENGINE_SUITES,
  // OP-0004 / WF-0059 task-ownership reform — own module (see test-suites-wf0059.mjs).
  ...WF0059_SUITES,
  ...MCP_SUITES,      // MCP ticket integration-tests (see test-suites-mcp.mjs).
  // Test-infra self-tests (suite-list guard and impact selector) —
  // own module to keep this registry under the 308-line budget (ADR-0113).
  ...INFRA_SUITES,
  // WF-0069 (OP-0008) language-aware intent + the two direct fixes (#2, #8) —
  // own module, same budget discipline (see test-suites-wf0069.mjs).
  ...WF0069_SUITES,
  // WF-0070 (OP-0008, ADR-0132) memory-accessibility suites — own module for the
  // line budget (see test-suites-wf0070.mjs).
  ...WF0070_SUITES,
  // WF-0081 (BIZ-0006, ADR-0148) classifier-integrity suite — own module for the
  // line budget (see test-suites-wf0081.mjs).
  ...WF0081_SUITES,
  // WF-0088 (BIZ-0006, ADR-0148 position 11) governance-contract envelope suite —
  // own module for the line budget (see test-suites-wf0088.mjs).
  // WF-0089 (BIZ-0006, ADR-0148 §9/§10) structural auto-fill projections — own
  // module for the line budget (see test-suites-wf0089.mjs).
  ...WF0089_SUITES,
  // WF-0090 (BIZ-0006, ADR-0148 rails a+b) grounded content engine — own module
  // for the line budget (see test-suites-wf0090.mjs).
  ...WF0090_SUITES,
  // WF-0094 (BIZ-0006, ADR-0152) reference-intent / continuation-gate suite —
  // own module for the line budget (see test-suites-wf0094.mjs).
  ...WF0094_SUITES,
  // WF-0086 (BIZ-0006, ADR-0148 §13) plane-wide governance measurement + north-star
  // — own module for the line budget (see test-suites-wf0086.mjs).
  ...WF0086_SUITES,
  // WF-0095 (OP-0008, reuses ADR-0131) bilingual classifier signals — own module
  // for the line budget (see test-suites-wf0095.mjs).
  ...WF0095_SUITES,
]);

/**
 * All suites, in declared (legacy) order.
 * @returns {ReadonlyArray<{id:string,file:string,tier:string,touches:string[]}>}
 */
export function allSuites() {
  return SUITES;
}

/**
 * Suites belonging to one tier, preserving declared order.
 * @param {string} tier - a member of TIERS.
 * @returns {Array<{id:string,file:string,tier:string,touches:string[]}>}
 * @throws {Error} if `tier` is not a known tier (fail-fast, no silent empty set).
 */
export function suitesForTier(tier) {
  if (!TIERS.includes(tier)) {
    throw new Error(`unknown tier "${tier}"; valid tiers: ${TIERS.join(', ')}`);
  }
  return SUITES.filter((suite) => suite.tier === tier);
}
