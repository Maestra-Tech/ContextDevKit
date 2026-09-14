# Governance contract

<!-- GENRE: Reference (information-oriented) -->

This page is the public contract of the ContextDevKit 4 governance runtime.
The code authorities are:

- `runtime/governance/gate-registry.mjs` for gate identity and policy;
- `runtime/governance/gate-mode.mjs` for mode resolution, overrides, and verdicts;
- `runtime/governance/event-runtime.mjs` for bounded dispatch;
- the four `governance-*.mjs` host entrypoints for lifecycle events.

## Lifecycle events

| Event | Purpose |
| --- | --- |
| `prompt-preflight` | classify and surface prompt-time canaries without persistence on no-op |
| `write-preflight` | load governed context and evaluate write-applicable observations |
| `postflight` | report bounded observations after mutation |
| `completion` | evaluate completion-only evidence and close the dispatch |

Each host registers one ContextDevKit process per event. The event runtime
normalizes ids, deduplicates by session/work/revision, rejects recursive
`CONTEXTKIT_INTERNAL=1` execution, limits handler time, applies a total budget,
and opens a circuit breaker after repeated equivalent internal failures.

An internal timeout, exception, missing handler, or invalid result returns an
`internal`, `budget-exhausted`, or `circuit-open` diagnostic with
`allowed: true`. Internal failure is not evidence that a domain gate passed.

## Modes

| Mode | Evaluates | Normal response | May deny |
| --- | --- | --- | --- |
| `off` | no | none | no |
| `shadow` | yes | silent | no |
| `canary` | yes | optional short recommendation | no |
| `guarded` | yes | applicable verdict | only exact allowlisted evidence |

Missing, invalid, or throwing configuration resolves to `canary` with
`failurePolicy: continue`. `advisory` is an upgrade alias for `canary`; `strict`
is an upgrade alias for `guarded`. Upgrade aliases must not register a legacy
hook or writer.

## Default matrix

| Gate | Default | Evaluated at | Blocking at |
| --- | --- | --- | --- |
| `qa-signoff` | guarded | completion | completion |
| `ddd-invariants` | guarded | write-preflight, completion | write-preflight, completion |
| `technical-debt` | guarded | completion | completion |
| `architecture-debt` | canary | write-preflight, postflight | never |
| `privacy-lgpd` | shadow | write-preflight, postflight | never |
| `graph-first` | canary | prompt-preflight, write-preflight | never |
| `intake` | canary | prompt-preflight | never |
| `journey` | canary | write-preflight | never |
| `workflow-presence` | canary | write-preflight | never |
| `simulation` | canary | write-preflight | never |
| `deliberation` | canary | write-preflight | never |
| `agent-routing` | canary | prompt-preflight, write-preflight | never |
| `subagent-scope` | canary | write-preflight | never |
| `economy` | canary | prompt-preflight, write-preflight, postflight | never |
| `context-pack` | canary | write-preflight | never |
| `completion` | canary | completion | never |

Configuring `guarded` outside the three-item allowlist is clamped to `canary` and
emits a warning.

## Exact deny predicates

A guarded observation may deny only when all three common facts are true:

- `deterministic: true`;
- `applicable: true`;
- `evidenced: true`.

It must also satisfy its domain predicate:

| Gate | Additional predicate |
| --- | --- |
| `qa-signoff` | `transition === "done"` at completion |
| `ddd-invariants` | `invariantClass === "A"` at write-preflight or completion |
| `technical-debt` | `introducedByCurrentDiff === true`, `newDebt === true`, and severity `high` or `critical` at completion |

Unknown, skipped, missing, stale, predictive, heuristic, or internally failed
evidence cannot deny. QA never blocks implementation start. Historical debt
outside the current diff cannot block completion.

## Owner override

The owner may override a guarded verdict with a short reason and scoped audit
metadata:

```json
{
  "actor": "owner-id",
  "reason": "short reason",
  "scope": { "taskId": "T-001" },
  "policyVersion": "<current>",
  "policyHash": "<current>",
  "baseRevision": 3,
  "timestamp": "ISO-8601",
  "expiresAt": "ISO-8601",
  "outcome": "accepted-risk"
}
```

The override must match current policy, scope, and revision and must not be
expired. It needs no autonomy grade, council, quorum, specialist receipt, or
separate bypass contract. It cannot override Git hosting protection, cloud
confirmation, credential boundaries, or other real platform safety controls.

## No-op contract

Conversation and read-only exploration do not write task ids, contracts,
contexts, runs, ledgers, receipts, routing records, or memory. `unclassified`
asks one short question and writes nothing. A real mutation attempt promotes
the interaction once and runs write preflight once.

## Advisory systems

Graph lookup, Project Map refresh, intake shape, journey, workflow presence,
simulation, deliberation, agent/model routing, specialist selection, swarm
shape, economy, and owner preferences may recommend. Their absence or error
does not deny work. `privacy-lgpd` is shadow-only.

## Visible messages

A gate speaks only through its observation. An observation may carry
`visibleMessage` and `problemKey`; the policy point copies both onto a `warn`
or `deny` verdict and never onto `allow` or `silent`, so a passing or shadow gate
leaks no text. The event runtime renders one message per session per
`problemKey` as `{ gateId, problemKey, level: warning | error, text }`.

Two observation producers ship with the runtime:

- `write-preflight` computes `simulation` when a file-writing tool targets a path
  matching `l5.highRiskPaths` or `l5.contractGlobs`: `passed` when a prediction
  under `memory/predictions/` covers the path for the current session (or was
  written today), otherwise `violated` with a message naming the path and the
  `mark-simulation.mjs` command. Paths outside the configured lists produce no
  observation, and the gate stays canary.
- Session, compaction, and handoff context ends with an `Owner guidance
  (recommendation-only)` block listing explicit owner preferences and the
  personalization file. Inferred preferences are never shown, and the block
  never authorizes work.

## Risk acknowledgement

Destructive production action, force-push, and secret rotation may produce a
non-blocking `riskAcknowledgement`. It describes the real risk and points to the
host/platform confirmation boundary. It is neither a permission token nor a
replacement for that boundary.

## State and diagnostics

The dispatcher may keep bounded deduplication and circuit-breaker state in the
transient run store. This state never owns task or workflow status. Task status
remains in `pipeline/tasks.json`; workflow aggregate state remains in
`workflow-state.json`.

See [configuration](config.md), [quality model](../explanation/quality-model.md),
and the [3.x migration guide](../../MIGRATION-3.x-TO-4.0.md).
