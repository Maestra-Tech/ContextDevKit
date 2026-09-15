# Changelog

All notable changes to ContextDevKit are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/);
this project follows [Semantic Versioning](https://semver.org/).

> **Two changelogs, two contexts — don't conflate them.**
> *This* file (the repo-root `CHANGELOG.md`) is **ContextDevKit's own product
> changelog**: the release chronology of the kit itself, closed via
> `/close-version` and tagged for release. It is the only changelog tracked in
> this source repo.
> Separately, the installer creates a `docs/CHANGELOG.md` **inside each
> installed project** (rendered from `templates/docs/CHANGELOG.md.tpl`) — that
> one chronicles the *target project's* releases, not the kit's. Every
> `docs/CHANGELOG.md` reference under `templates/**` (in `/log-session`,
> `/close-version`, `/draft-changelog`, etc.) means *that* installed-project
> file, which runs in the target repo — never this product changelog.
> In this repo's dogfood install, `docs/CHANGELOG.md` exists only as a
> gitignored artifact (`.git/info/exclude`) and is never committed.

## [Unreleased]

_Add your changes here._

## [4.0.6] - 2026-09-15

> **The AI engineering method as runtime mechanism.** ContextDevKit 4.0.6 lets
> gate verdicts speak, surfaces explicit owner preferences in every session
> context, warns before a write on a high-risk or contract path without impact
> analysis, seeds the SPEC with the method fields, and turns workflow completion
> into a receipt with a distinct reviewer and a machine-readable proof of done.
> No new guarded gate; every hot-path addition is canary and measured under 10 ms.
> (ADR-0165, WF-0118)

### Added (`feat`)

- **`feat(governance)` — gate verdicts can speak.** `evaluateGateObservation`
  copies an observation's `visibleMessage` and `problemKey` onto `warn`/`deny`
  verdicts only, so the event runtime finally renders gate messages to the agent.
  Passing, silent, and shadow verdicts never carry text. (ADR-0165, WF-0118)
- **`feat(governance)` — impact analysis before writing a risky path.** Write
  preflight produces the `simulation` observation when an Edit/Write/MultiEdit/
  NotebookEdit targets `l5.highRiskPaths` or `l5.contractGlobs`; a prediction
  from `mark-simulation.mjs` covering the path for the current session (or dated
  today) satisfies it. Canary, never a block. New
  `runtime/hooks/write-risk-observation.mjs`.
- **`feat(context)` — owner guidance in session context.** SessionStart,
  PreCompact, and SubagentStart context ends with an `Owner guidance
  (recommendation-only)` block: explicit `owner-preferences.json` entries and a
  pointer to `personalization.md` with its section headings. The preference store
  had no runtime consumer until now.
- **`feat(workflow)` — structured SPEC and document gates.** New workflows seed
  `spec.md` with Problem, Expected behavior, Domain rules and invariants, Data,
  Interfaces and contracts, Edge cases, Acceptance criteria, Expected tests,
  Impact analysis, Development sequence. `advance` refuses to leave `prd`/`spec`
  with empty required sections unless `--force`; the leave-gate in
  `workflow-gate.mjs` is wired for the first time.
- **`feat(workflow)` — completion receipt with reviewer and proof of done.**
  `complete` requires `--reviewer` (distinct from `--author`) and a fenced
  ` ```proof-of-done ` block of twelve `passed|skipped <reason>` items in the
  closeout report; both persist in `workflow-state.json.qa`. New
  `tools/scripts/workflow/proof-of-done.mjs`.

## [4.0.5] - 2026-08-11

> **Governed CompozyOS active execution.** ContextDevKit 4.0.5 promotes a
> safely detected CompozyOS installation from passive coexistence to the
> mandatory executor for authorized implementation tasks. ContextDevKit keeps
> exclusive authority over workflow gates, tests, QA, and completion.

### Added (`feat`)

- **`feat(execution)` — activate CompozyOS as a governed executor.** Projects
  with a valid `.compozy/config.toml` now route permitted implementation work
  through a bounded ContextDevKit execution envelope. The adapter verifies the
  CLI contract, auto-starts the daemon, automatically resolves correlated
  permission requests with per-run `allow-once`, redacts receipts, and refuses
  local fallback when the configured executor fails. ContextDevKit remains the
  sole authority for workflow gates, QA, and task completion.

### Changed (`compat` / `security`)

- **`compat(integrations)` — select CompozyOS without taking ownership of its
  files.** Installer and doctor detection remain non-mutating, while the new
  execution dispatcher treats a safe `.compozy/config.toml` marker as an active
  executor selection. An unavailable, incompatible, or malformed configured
  executor blocks instead of silently running through a different host.
- **`security(execution)` — bound automatic execution permissions.** The
  adapter resolves correlated permission requests with `allow-once`, rejects
  requests outside the authorized envelope, invokes the CLI with argv semantics
  and no shell, verifies executable identity, caps JSON/JSONL evidence, and
  redacts diagnostic secrets.

### Tests (`test`)

- **`test(execution)` — cover the governed CompozyOS lifecycle.** The focused
  adapter suite exercises governance refusal before process creation, daemon
  auto-start and readiness, concurrent startup reconciliation, deterministic
  retries, automatic permission deduplication, scope rejection, redaction,
  protocol incompatibility, terminal evidence, and the prohibition on external
  QA or completion authority. The pre-release full gate covers 194 suites.

### Release engineering (`chore`)

- **`chore(release)` — bump package metadata to 4.0.5.** `package.json` and
  both root version fields in `package-lock.json` agree on `4.0.5` for tag,
  package, and lockfile parity.

## [4.0.4] - 2026-08-11

> **CompozyOS coexistence and Graphify-first structural discovery.**
> ContextDevKit 4.0.4 detects both project-local ecosystems without executing
> external processes or surrendering governance authority. Valid Graphify
> artifacts become the first file-discovery source, followed deterministically
> by the native graph and Project Map lookup.

### Added (`feat` / `docs`)

- **`feat(integrations)` — detect CompozyOS and Graphify passively.** The
  installer and doctor identify `.compozy/config.toml`, the bounded
  `graphify-out/graph.json` NetworkX artifact, Graphify skills, and overlapping
  host instructions/hooks. Detection is read-only, rejects symbolic-link and
  junction escapes, caps artifact size, and never invokes an external CLI,
  installer, MCP server, network client, or write path.
- **`feat(graph)` — prioritize Graphify with deterministic fallback.** The graph
  query surface now uses `graphify -> native -> project-map-find`, validates
  workspace-relative `source_file` anchors, preserves provider order and
  provenance in receipts, and continues automatically after malformed,
  unavailable, stale, partial, or empty evidence.
- **`docs(integrations)` — document the interoperability authority boundary.**
  English and pt-BR guidance state that ContextDevKit remains the sole authority
  for workflows, governance gates, approvals, claims, tests, QA, and durable
  evidence while CompozyOS remains in passive coexistence mode.

### Changed (`compat`)

- **`compat(graph)` — retain the existing single-provider query contract.**
  Injected providers and the legacy non-denying fallback receipt remain
  compatible while the default CLI gains the ordered provider chain.
- **`compat(installer)` — preserve project-owned ecosystem files.** A real
  install with CompozyOS and Graphify already present keeps their configuration,
  graph artifact, and owner-authored instructions unchanged while reporting any
  host-surface overlap for review.

### Tests (`test`)

- **`test(integrations)` — cover adversarial interoperability cases.** The new
  `project-tool-interop` suite covers absent/present markers, malformed and
  oversized artifacts, Unicode labels, path escape rejection, junctions,
  overlap diagnostics, fallback order, real installer/doctor behavior, and
  zero mutation. The pre-release full gate passed 193/193 suites.

### Release engineering (`chore`)

- **`chore(release)` — bump package metadata to 4.0.4.** `package.json` and both
  root version fields in `package-lock.json` agree on `4.0.4` for tag/package/
  lockfile parity.

## [4.0.3] - 2026-08-09

> **Deterministic continuation, canonical ADR authoring, conditional agent
> coordination, and complete Governance Harness documentation.** ContextDevKit
> 4.0.3 makes every Workflow v2 package independently resumable, standardizes
> new decision records across all hosts, removes the obsolete 3.x Codex dispatch
> receipt without weakening coordination that is actually required, and aligns
> the public product model with the implemented 4.x runtime. The release also
> establishes a first-class multilingual documentation contract.

### Changed (`refactor` / `docs`)

- **`refactor(routing)` — separate route selection from dispatch authority.** A
  current v4 routing recommendation may be resolved before a real subagent call,
  but it cannot authorize or veto that call. Missing or malformed legacy
  `decision`, `model`, `effort`, and `ruleId` fields no longer prevent an
  explicitly or governably required debate/swarm from being attempted.
- **`refactor(decisions)` — make one ADR body contract authoritative.** Fresh
  decisions use schema-v2 front matter plus `documentVersion: 1`, explicit
  Business/Operation/Platform ownership, closed decision/value enums, one
  canonical ordered section set, and lifecycle validation shared by create,
  validate, accept, documentation, and every host projection.

- **`docs(readme)` — document the complete 4.x operating model.** The root guide
  now explains the harness boundary, mutation-only intake, transient Intake
  Envelope, Business/Operation/none ownership, direct/batch/workflow execution
  shape, evidence-driven engineering loops, adaptive engineering depth, owner
  sovereignty, specialist routing, state authorities, Project Map fallback, and
  long-session continuity from vibe coder through senior engineer.
- **`docs(business)` — make Business-Driven Development proportional.** Business
  and Operation are documented as durable ownership contexts rather than
  mandatory hierarchy. `none` is first-class; existing work is resolved before
  new work; a Business matcher may suggest but never confirm ownership; and
  execution topology remains independent from work nature.
- **`docs(governance)` — clarify quality floors and evaluator authority.** QA
  sign-off, applicable deterministic DDD Class A invariants, and new high/
  critical Technical Debt remain the three guarded quality floors. Architecture
  Debt stays canary and Privacy/LGPD stays shadow. Routing, graph, economy, and
  specialist selection remain recommendation surfaces; debate and swarm are
  conditionally required only when the current owner instruction, selected
  workflow/skill, or governed classification activates them.
- **`docs(loop-engineering)` — document the project-level engineering loop.** A
  new explanation defines implement → evaluate → findings → correct → fresh
  evaluation → evidence-backed completion, including fresh QA cycles, stale
  evidence invalidation, Workflow reopen, adaptive evaluator depth, and
  convergence/escalation behavior.

### Added (`feat` / `docs` / `i18n`)

- **`feat(workflow)` — generate a mandatory deterministic continuation
  artifact.** Every new or repaired Workflow v2 package now contains
  `CONTINUATION-PROMPT.md`. The renderer derives its workflow identity, phase,
  revision, canonical task snapshot, governed context references, loading order,
  mutation boundary, and next action from `workflow.json`,
  `workflow-state.json`, `pipeline/tasks.json`, and `context-manifest.json`
  instead of free-form session prose.
- **`feat(workflow)` — version the complete context manifest contract.** Context
  manifest schema 2 declares the continuation artifact as required. Create,
  load, validate, render, repair, Business-owned workflow publication, package
  integration, and the explicit v3-to-v4 migrator now agree on the same ordered
  required-file set.
- **`feat(decisions)` — ship a canonical ADR generator and reference.** The
  Decision CLI requires explicit context ownership, rejects new `legacy`
  records and incompatible kind/context combinations, renders every required
  section exactly once in canonical order, and records a deterministic SHA-256
  decision hash when a human accepts the ADR. A new bilingual decision README
  documents creation, validation, acceptance, immutability, and supersession.
- **`feat(coordination)` — expose conditional debate state explicitly.** A
  governed `needsDebate: true` classification now survives orchestration sizing
  as `coordination.debate = required`; the unchanged council and the
  recommendation-only routing authority are machine-readable and deterministic.

- **`docs(i18n)` — add a machine-readable locale contract.** `docs/locales.json`
  defines BCP 47 locale tags, native names, LTR/RTL direction, fallback, status,
  and coverage. `docs/LANGUAGES.md` provides the human navigation surface.
- **`docs(pt-BR)` — promote Brazilian Portuguese to an extended v4 tree.** The
  former root `instrucoes.md` and isolated `*.pt-br.md` page are retired in favor
  of `docs/pt-BR/`, with architecture, tutorials, how-tos, hosts, governance,
  Business-Driven Development, Loop Engineering, workflow-engine guidance,
  configuration, memory, release, troubleshooting, graph, swarm, QA, and other
  principal operational documentation.
- **`docs(i18n)` — add translated core-v4 documentation in six more locales.**
  `es-ES`, `ru-RU`, `hi-IN`, `zh-CN`, `ar`, and `he-IL` each ship localized
  architecture, Business-Driven Development/intake, Loop Engineering,
  governance/enforcement, quality model, governance contract, glossary, and
  Business-case operation guide. Arabic and Hebrew are declared RTL while
  commands, paths, ids, JSON keys, status enums, and code symbols stay canonical.

### Fixed (`fix` / `docs` / `tooling`)

- **`fix(codex)` — retire only the obsolete mandatory routing contract.** Codex
  update removes the exact project-level 3.x dispatch section and the managed
  global routing marker plus its three exclusive harness files. User-authored
  global/project prose and non-ContextDevKit harness content are preserved; the
  replacement host contract keeps current routing guidance and conditional
  debate/swarm triggers without restoring admission control.
- **`fix(coordination)` — do not downgrade required councils to optional
  guidance.** Host templates, `/dev-start`, `/debate`, `/swarm`, command
  references, architecture guidance, ADR guidance, and English/pt-BR public docs
  now distinguish optional-by-default coordination from coordination activated
  by an explicit owner request, workflow/skill contract, or governed classifier.
- **`fix(migration)` — make migrated workflows immediately resumable.** The
  explicit v3-to-v4 planner writes context manifest schema 2 and renders the
  required continuation artifact before parity/cutover, without adding a live
  legacy reader or dual-authority fallback.
- **`fix(decisions)` — refuse malformed ADRs before persistence.** Creation and
  acceptance validate YAML schema, document version, required section presence,
  uniqueness/order, unresolved template tokens, enum values, and context
  compatibility before writing. Existing accepted historical ADRs remain
  preserved as memory, while the old ADR-0000 seed is no longer installed as a
  competing authoring standard.

- **`fix(docs-reindex)` — keep localized trees out of the canonical English
  Diátaxis index.** `docs-reindex.mjs` now reads `docs/locales.json`, excludes
  non-canonical locale roots from English classification, reports the excluded
  roots, and preserves deterministic/idempotent index generation instead of
  listing translated pages as English `Unclassified` documents.
- **`fix(docs)` — remove surviving pre-4.x guidance and duplicate pt-BR paths.**
  Business/Operation/Workflow anatomy and business-case guidance now reflect
  `none`, honest clarification, independent execution shape, JSON authorities,
  and the current 4.x memory model. Links now target the locale tree rather than
  the removed legacy pt-BR file.

- **`fix(release)` — distinguish v4 cleanup boundaries from executable legacy
  routing.** The release inventory now permits only the exact Codex updater,
  its negative integration test, and the localized migration guide to name
  retired 3.x contracts. Real global-routing harnesses and near-miss paths
  remain release-blocking, preventing cleanup code from becoming a false
  positive without weakening the cutover fence. The inventory also stops
  requiring the intentionally retired root `instrucoes.md` as a scan root.

### Tests (`test`)

- **`test(workflow)` — prove continuation determinism across the complete
  lifecycle.** Focused Workflow v2 and packaging integration cover create,
  validate, load, render, repair, missing/modified continuation refusal,
  Business-owned publication, context-manifest schema 2, and byte-identical
  rerendering. The explicit v3-to-v4 E2E additionally proves the artifact is
  present before cutover.
- **`test(decisions)` — enforce the ADR contract at every public seam.** Template,
  Decision CLI, Business/Decision/Methodology, tooling, and host-projection tests
  cover valid generation, ordering, duplicate/missing section refusal, explicit
  ownership, legacy-create refusal, deterministic acceptance hash, docs examples,
  and generated Claude/Codex/Antigravity command parity.
- **`test(coordination)` — cover required coordination without a routing gate.**
  Advisory-policy and Codex installer integration prove `needsDebate` remains
  required, councils are not trimmed, current routing output stays non-binding,
  missing legacy receipt fields cannot cancel a swarm/debate, and cleanup
  preserves user prose. Host projection checks remain drift- and orphan-free.

### Release engineering (`ci` / `chore`)

- **`chore(release)` — bump package metadata to 4.0.3.** `package.json` and both
  root version fields in `package-lock.json` now agree on `4.0.3`; the npm
  description/keywords include governance harness, Loop Engineering,
  Business-Driven Development, and project intelligence.
- **`ci(release)` — validate tag/package/lock parity before publishing.** The
  tag-triggered release workflow now refuses when the `vX.Y.Z` tag differs from
  `package.json`, top-level `package-lock.json`, or the lockfile root package
  version, before changelog rendering, CI, npm provenance publication, and the
  GitHub Release.

## [4.0.2] - 2026-08-09

> **Update-safe project personalization.** ContextDevKit 4.0.2 separates
> durable owner-authored project guidance from regenerated host instructions.
> It deliberately reuses the existing structured owner-preference store and
> adds only one complementary Markdown file. Updates can refresh the bounded
> references in each native host without replacing personalized content.

### Features (`feat`)

- **`feat(personalization)` — add one durable Markdown instruction source.** A
  fresh install seeds
  `contextkit/memory/preferences/personalization.md` for explicit,
  project-specific user guidance. The file documents precedence and warns
  against secrets, personal data, credentials, and temporary task text.
- **`feat(personalization)` — reuse the canonical structured preference store.**
  Structured preferences remain in the already established
  `contextkit/memory/preferences/owner-preferences.json` schema v1. No
  `personalization.json`, alias, mirror, or second JSON authority is introduced;
  the store remains recommendation-only and cannot authorize work or weaken a
  current instruction or platform boundary.
- **`feat(hosts)` — reference both personalization sources from every native
  host.** `CLAUDE.md`, `AGENTS.md`, and `INSTRUCTIONS.md` receive the same
  dedicated `contextdevkit:personalization` block. It tells Claude Code, Codex,
  and Antigravity to consult the Markdown instructions and structured JSON,
  preserves their different authority semantics, and forbids agent edits unless
  the user explicitly requests them.

### Fixes (`fix`)

- **`fix(installer)` — preserve personalization under every install mode.** The
  Markdown and JSON seeds use create-if-missing semantics independently of the
  ordinary memory-seed policy. Normal installs, updates, repeated installs, and
  `--force` therefore never overwrite either user-owned file. The JSON seed has
  the same schema, revision, preference array, and audit array expected by the
  existing owner-preference runtime.
- **`fix(installer)` — make native-host reference updates atomic and bounded.**
  The marker injector now accepts validated caller-owned marker pairs and uses
  same-directory atomic replacement for create, update, append, and strip.
  Only the dedicated personalization block may change; existing ContextDevKit
  blocks, user headings, comments, line content, and all bytes outside the
  marker boundary remain owned by the project. Repeated installs are
  idempotent and never duplicate the reference.
- **`fix(update)` — snapshot every newly mutable or user-owned surface before
  self-update.** Verified out-of-tree update backups now include `CLAUDE.md`,
  `AGENTS.md`, `INSTRUCTIONS.md`, `personalization.md`,
  `owner-preferences.json`, and `owner-preferences.audit.jsonl`, in addition to
  configuration, install metadata, engine version, host settings, and workspace
  claims. A failed or unverifiable snapshot still refuses before the first
  target write.
- **`fix(portability)` — derive preference paths from the platform directory.**
  The owner-preference runtime and installer snapshot use `PLATFORM_DIR`
  instead of introducing another hard-coded platform-folder path, retaining
  Windows path-with-spaces and renamed-platform support.

### Documentation (`docs`)

- **`docs(personalization)` — document the single-source contract in English
  and pt-BR.** Root guides, installed-kit guides, architecture, memory model,
  configuration reference, footprint, customization, installer help, and the
  update/rollback guide now identify the exact Markdown, JSON, and audit paths.
  They distinguish explicit Markdown guidance from recommendation-only JSON
  and state the precedence of current system, developer, user, and platform
  safety instructions.
- **`docs(update)` — describe the narrow host-root mutation boundary honestly.**
  Previous broad claims that updates never touch boot instruction files are
  replaced with the precise guarantee: only the dedicated pointer block may be
  refreshed atomically, while owner prose and both personalization sources are
  preserved.

### Tests (`test`)

- **`test(personalization)` — exercise a real install and repeated updates.** A
  non-Git fixture whose path contains spaces verifies seed schema, one reference
  in each native host, custom Markdown and JSON byte preservation across two
  updates and `--force`, invalid-JSON fail-safe behavior, host-prose sentinels,
  idempotence, and external backup contents.
- **`test(installer)` — cover independent marker pairs and snapshot expansion.**
  Focused integration checks prove coexistence with the original installer
  block, exact outside-marker preservation, atomic update/strip behavior, and
  verified capture of all three host roots plus Markdown, JSON, and audit state.

## [4.0.1] - 2026-08-09

> **Workflow placement correction.** ContextDevKit 4.0.1 restores the
> human-facing completed-workflow archive promised by the Workflow contract.
> Canonical JSON remains the only machine authority; `done/` is a derived,
> bounded placement of the complete Workflow v2 package. Task state continues
> to use JSON only and does not regain physical status lanes.

### Fixes (`fix`)

- **`fix(workflow)` — create the archive root with every workflow.** Neutral
  creation now guarantees `memory/workflows/done/`; Business- and
  Operation-owned creation guarantees `<owner>/done/`. A human never has to
  create the directory manually.
- **`fix(workflow)` — archive the complete package on completion.** After task,
  blocker, QA, report, and CAS validation, completion commits
  `workflow-state.json`, repairs generated projections, and atomically renames
  the entire package from `workflows/<WF>/` to `done/<WF>/` on the same volume.
  The archived directory retains `workflow.json`, `workflow-state.json`,
  `pipeline/tasks.json`, generated `pipeline/tasks.md`, PRD, SPEC, decisions,
  reports, context manifest, index, and continuation artifacts.
- **`fix(workflow)` — refuse collisions before state mutation.** If both the
  active source and derived `done/` target exist, completion refuses before the
  JSON revision changes. A filesystem failure after state commit is reported
  explicitly with a safe, idempotent recovery command.
- **`fix(workflow)` — resolve active and completed packages uniformly.** Lookup,
  listing, duplicate-slug detection, workflow-number allocation, dashboard,
  MCP/status consumers, and the canonical authority snapshot now enumerate the
  bounded active and completed roots while deriving status only from JSON.
- **`fix(workflow)` — recover 4.0.0 placement drift.** The Workflow v2 CLI
  exposes `done-move <WF> [--apply]`. It is dry-run by default, requires
  `workflow-state.json.status === "done"`, changes no lifecycle state, and is a
  no-op after a successful move.
- **`fix(tasks)` — close automated QA and human-feedback cycles.** A testing
  task with an explicit successful automated-suite receipt now transitions
  directly to `done` instead of waiting indefinitely for a second human test.
  `qa-reject` moves `testing` or `done` back to `backlog`, records the feedback,
  clears stale current-cycle evidence, and requires fresh proof on the next
  `done`. If the enclosing Workflow is already complete, its aggregate reopens
  to `working/ship` and the complete package returns to `workflows/` before the
  task reset; a later green cycle can conclude and archive it again.
- **`fix(migration)` — preserve completed placement during 3.x cutover.** The
  explicit offline migrator now stages owner-scoped completed workflows under
  `<BIZ|OP>/done/` and neutral completed workflows under
  `memory/workflows/done/`, preserving their full validated v2 packages instead
  of normalizing them back into active `workflows/`.

### Verification

- Focused task-store and pipeline-cutover tests cover receipt-bound automatic
  `testing -> done`, rejection without evidence, human-feedback reopen from
  `testing` and `done`, stale current-evidence clearing, append-only historical
  events, and a second green backlog-to-done cycle with fresh evidence.
- Focused Workflow v2 integration covers neutral and owner creation, complete
  package retention, JSON-first completion, target collision, idempotent retry,
  completed-workflow reopen, retest/rearchive, duplicate/number scans, Windows
  paths with spaces, and installed CLI behavior.
- Focused migration integration covers owner and neutral completed targets,
  conservation, parity, stage/rollback, cutover, retirement, and old-writer
  fencing. Canonical consumer integration proves completed tasks remain visible
  from `done/` without restoring path-derived task status.

## [4.0.0] - 2026-08-09

> **Major release.** ContextDevKit 4 replaces speculative, self-authorizing
> governance with a mutation-only, human-sovereign runtime. It also completes
> the state-authority cutover that 3.x started but did not activate. Read
> [MIGRATION-3.x-TO-4.0.md](MIGRATION-3.x-TO-4.0.md) before updating an existing
> installation; 4.0 intentionally has no automatic 3.x runtime fallback.

This release implements the complete governance-first contract recorded by
ADR-0158 / OP-0015 / WF-0111. Across the source tree it changes 977 files:
40,368 insertions, 74,858 deletions, 68 new files, and 306 removed files. The
net deletion is deliberate: replaced executable governance was removed instead
of being retained as a second authority.

### Breaking changes

- **Canonical task authority.** Markdown lane directories are no longer task
  storage. Task definition and status now live only in `pipeline/tasks.json`
  schema v2 with the closed states `backlog`, `working`, `blocked`, `testing`,
  `done`, and `cancelled`. `tasks.md` is an idempotent generated projection.
- **Canonical workflow authority.** `workflow-plan.json` is replaced by
  `workflow.json`; aggregate lifecycle state lives in the smaller
  `workflow-state.json` schema v2. A completed workflow remains at its canonical
  path with `status: done` instead of moving into a `done/` directory.
- **No live compatibility layer.** Normal boot, hooks, CLI, MCP, dashboard,
  statusline, graph, and host adapters cannot read lanes, workflow v1 plans,
  autonomy grades, legacy swarm contracts, or old gate state. The explicit
  offline migrator is the only code allowed to understand 3.x formats.
- **Advisory orchestration.** Model selection, required-agent routing, swarm
  size, autonomy, graph-first, workflow-presence, and semantic classifiers are
  recommendations. Integrations that treated those results as authorization or
  denial must now respect the active owner and host as the decision boundary.
- **Configuration vocabulary.** The canonical gate modes are `off`, `shadow`,
  `canary`, and `guarded`. The upgrade parser converts `advisory` to `canary`
  and `strict` to `guarded` with warnings; those aliases are absent from the
  normal runtime schema.
- **Retired commands and APIs.** Session-ledger resume/watch commands, lane-card
  mutations, implicit done sweeps, v1 workflow finalization commands, rigid
  autonomy gates, and MCP mutation tools were removed. Consumers must use the
  v4 task store, workflow package APIs, or read-only MCP resources.

### Features (`feat`)

#### Governance runtime

- **`feat(governance)` — one canonical gate registry and resolver.** Every gate
  resolves from one policy matrix with version/hash provenance, alias warnings,
  default-canary degradation, `failurePolicy: continue`, a guarded allowlist,
  and auditable scoped human overrides.
- **`feat(governance)` — one process per governed host event.** Prompt
  preflight, write preflight, postflight, and completion now enter through thin
  dispatchers that normalize host payloads and share one evaluated context.
  Session context uses the same host-neutral contract without reviving the 3.x
  ledger writer.
- **`feat(governance)` — bounded anti-loop execution.** Gate work is keyed by
  `(session, workItem, revision, gate, moment)`, deduplicated across repeated
  calls, guarded against re-entry, capped by timeout and aggregate budget, and
  protected by a session circuit breaker. Internal failures remain observable
  but do not break the developer's real command.
- **`feat(intake)` — mutation-only interaction classification.** Conversation,
  exploration, and unresolved intent create no task ID, workflow, contract,
  receipt, graph artifact, completion obligation, or durable memory. A real
  write attempt is the authoritative promotion signal and triggers preflight
  exactly once, including writes to docs, configuration, and memory.
- **`feat(intake)` — honest work shape.** Existing-work resolution runs before
  durable creation. Work nature may be `business`, `operation`, `none`, or
  `unclassified`; execution may be `direct`, `batch`, or `workflow`. Business,
  `architecture`, ADR, compliance, or multi-agent vocabulary no longer forces a
  workflow by itself.

#### State, workflow, and migration

- **`feat(tasks)` — canonical transactional task store.** Schema validation,
  monotonic revisions, compare-and-swap, a cross-process lock, same-volume temp
  files plus atomic rename, status/event pairing, idempotent commands,
  corruption refusal, reference validation, and projection repair now share one
  writer.
- **`feat(workflow)` — complete Workflow v2 packages.** Atomic creation stages
  and validates `workflow.json`, `workflow-state.json`, PRD, SPEC, decisions,
  continuation, reports, `pipeline/tasks.json`, `pipeline/tasks.md`, and the
  manifest before the package becomes visible. Read, validate, repair, render,
  and rollback paths use the same catalog.
- **`feat(pipeline)` — CLI cutover.** `pipeline`, `work`, and `workflow` commands
  resolve explicit v4 scopes, use CAS transitions for every task state, refuse
  lane paths and removed v1 verbs, and never reconstruct authority from
  Markdown frontmatter.
- **`feat(migration)` — explicit 3.x to 4.0 cutover.** The offline migrator
  inventories every legacy card, rejects ambiguous identities, preserves
  ownerless work as neutral work, conserves migrated plus quarantined counts,
  normalizes statuses without fabricating history, and stages a complete v4
  generation outside the installed runtime.
- **`feat(migration)` — recovery proven before activation.** Staging records
  source hashes, schema/parity receipts, a byte-verified v4 rollback generation,
  and idempotence. Freeze and cutover use revisioned CAS markers; the old-writer
  fence survives rollback, and retirement moves source evidence into a
  hash-gated external audit bundle.
- **`feat(consumers)` — one reader for every view.** MCP task/context resources,
  dashboard, statusline, boot context, global status, and workflow context packs
  now read the same v4 authority. MCP is read-only in 4.0; mutation remains at
  the canonical writer boundary.
- **`feat(consumers)` — governed context before workflow writes.** PRD, SPEC,
  accepted decisions/ADRs, active task, aggregate state, and relevant reports
  are loaded into a compact host-neutral context bundle before linked workflow
  mutation, without inventing a separate receipt authority.

#### Hosts, graph, and owner control

- **`feat(hosts)` — manifest-driven projection parity.** Claude is the canonical
  source and Codex, Antigravity, and Grok projections are generated, checked for
  content drift, and cleaned of generated orphans. Five shared v4 contract
  labels prove mutation-only intake, one governance dispatch, context-before-
  write, canonical JSON state, and advisory routing.
- **`feat(project-map)` — governed memory roots.** Project Map indexes source
  plus active workflow, task, ADR/decision, report, operation, business,
  preference, and migration-generation roots even when a parent is gitignored.
  Partial, stale, or unavailable graph state immediately permits ordinary
  Grep/Glob search instead of denying exploration.
- **`feat(governance)` — human-sovereign policy.** Architecture debt defaults to
  canary, LGPD to shadow, and routing/autonomy/swarm to advisory output. Only
  QA-at-done, proven DDD Class A invariants, and new deterministic high-severity
  technical debt are eligible for guarded denial.
- **`feat(governance)` — owner preference memory.** Explicit owner preferences
  are versioned, atomically written, scope-bound, redacted, and auditable. They
  influence recommendations but never become hidden permissions or gates.

### Changed (`refactor` / behavior)

- **Hot-path simplification.** The 3.x multi-process hook chain is replaced by
  internal, testable handlers behind one dispatcher. Runtime hooks retain zero
  third-party dependencies and always exit safely on their own operational
  errors.
- **Task/workflow responsibility split.** Workflow topology, aggregate state,
  task state, reports, and Markdown projections no longer duplicate each other.
  Checksums and migration manifests are boundary evidence, not daily hot-path
  state.
- **Level semantics.** ContextDevKit levels select available capabilities; they
  are not consent or authorization grades. Explicit owner instruction and host
  safety controls remain authoritative.
- **Batch execution.** Related independent work can use a real batch backed by
  `tasks.json`; ordering, waves, multi-session dependencies, cutover, or rollback
  still select a workflow.
- **Release packaging.** npm contents are selected by a positive allowlist.
  Development selftests, fixtures, snapshots, dogfood memory, temporary
  analysis, backups, and update scratch data cannot leak into the tarball.

### Fixes (`fix`)

- **`fix(governance)` — cross-process mutation deduplication.** Repeated prompt
  and write hooks for the same revision no longer classify, persist, or execute
  the same gate twice, including concurrent processes.
- **`fix(governance)` — owner override hardening.** Overrides validate actor,
  reason, scope, policy identity, base revision, and expiry, reject replay or
  cross-scope use, and cannot bypass platform security, secret, credential, or
  destructive-action boundaries.
- **`fix(portability)` — Git is optional.** Install/update, docs reindex, fleet
  fixtures, path handling, and recovery now work in non-Git directories, ZIP
  distributions, Windows paths, and paths containing spaces. Git-dependent
  evidence reports `skipped` or `NON-GIT` honestly rather than a false pass.
- **`fix(project-map)` — explicit roots are consumed.** The root list is no
  longer decorative; active gitignored and external-generation memory enters
  the graph, while unavailable providers degrade to search without a block.
- **`fix(workflow)` — creator/validator parity.** A newly created workflow now
  contains every artifact the validator and consumers require, and repair uses
  stage/validate/swap/rollback instead of partially modifying a live package.
- **`fix(tasks)` — WF-0059 activation gap.** The engine delivered in 3.x is now
  wired into live readers and writers through the v4 schema, with parity,
  rollback, cutover, and post-cutover writer fencing completed rather than
  leaving physical lanes as a second authority.
- **`fix(config)` — v4 defaults validate with optional Zod installed.** The
  schema selfcheck now proves every current default section survives parsing
  instead of requiring the deleted 3.x `pipeline` configuration object. Release
  calibration also distinguishes the canonical canary default from an explicit
  local dogfood override.
- **`fix(hosts)` — projection-count regression.** Host integration tests derive
  the expected Codex command count from the canonical Claude source and skip
  policy instead of freezing a stale numeric total.
- **`fix(ci)` — source-only architecture gate.** Clean GitHub checkouts execute
  the complete architecture-debt analysis and enforce its verdict in memory
  without trying to persist into an absent, gitignored dogfood memory tree.
  Installed projects still write the single canonical findings store, and an
  invalid v4 authority marker still refuses execution.
- **`fix(release)` — complete GitHub Release notes.** Tag publication extracts
  this exact version section from the authoritative root changelog and passes it
  through `--notes-file`. Missing, duplicate, empty, or package-mismatched notes
  refuse the release before npm publication; GitHub's compare-only generated
  body is no longer used.

### Removed

- **Executable 3.x governance.** Removed legacy ledgers and session markers,
  execution/completion/journey/simulation/subagent gates, multi-hook composers,
  done sweeps, source-case assertions, deprecated wrappers, and fallback
  adapters that could reactivate replaced behavior.
- **Lane and v1 workflow authorities.** Removed physical backlog/working/testing/
  conclusion readers and writers, Markdown-card transitions, workflow v1 plan,
  scheduler, finalization, checksum-chain, ownership sidecars, and `done/`
  movement from all normal entrypoints.
- **Rigid agent policy.** Removed required-agent denial, autonomy-grade floors,
  mandatory council receipts, semantic swarm caps, routing-as-permission, and
  LGPD escalation into write/completion blockers.
- **Obsolete distribution material.** Removed orphan host projections, tests
  whose only purpose was preserving deleted contracts, dead MCP mutation tools,
  stale fixtures/snapshots, and executable archive copies. Historical ADRs,
  reports, changelogs, and migration evidence remain data, never runtime code.

### Security and safety

- Path containment rejects traversal, reparse/symlink crossings, cross-volume
  swaps, unsafe migration workspaces, and package entries outside the allowlist.
- Every canonical state mutation validates before I/O, uses CAS plus atomic
  rename, and refuses stale revisions, corruption, invalid references, or
  mismatched source hashes.
- Human overrides are narrowly scoped and auditable, but cannot override the
  platform's secret handling, credential control, permission checks, or
  confirmation requirements for destructive external actions.
- npm publication remains tag-triggered in GitHub Actions, runs the full CI and
  v4 release fences, and publishes with npm provenance. No second manual npm
  publication path is required.

### Documentation (`docs`)

- Rewrote the English and pt-BR entry guides around mutation-only governance,
  canonical JSON state, human sovereignty, current levels, host parity, and the
  v4 command surface.
- Added the complete [3.x to 4.0 migration guide](MIGRATION-3.x-TO-4.0.md),
  including dry-run, staging, writer freeze, cutover, rollback drill, final
  activation, source retirement, status/config conversion, refusals, and the
  verification checklist.
- Updated architecture, lifecycle, workflow-engine, configuration, governance,
  Project Map, MCP, privacy, testing, and host documentation to remove claims
  about deleted 3.x authorities.

### Tests, build, and release engineering (`test` / `ci` / `chore`)

- Added focused contracts for bilingual no-op intake, mutation promotion,
  existing-work resolution, work nature/shape, gate modes, guarded allowlist,
  anti-loop behavior, Workflow v2, task-store CAS, migration conservation,
  rollback, old-writer fencing, authority consumers, Project Map fallback,
  advisory routing, owner preferences, and host projection parity.
- Added bounded suite execution with serial/pool progress, heartbeat, per-suite
  timeout, full process-tree termination, and explicit exit `124` telemetry.
- Added static legacy inventory, import reachability, dynamic module-load trace,
  npm package audit, footprint capture, and a release gate that refuses any
  reachable executable legacy or undeclared package content.
- Added deterministic non-Git, Windows/path-space, tarball dogfood, clean
  install/update, migration, rollback, and projection-orphan fixtures.
- **`chore(hosts)` — regenerated canonical projections.** Privacy/LGPD agents
  and every host-owned generated surface were regenerated from canonical source;
  stale outputs are deleted on normal regeneration and rejected in check mode.

### Upgrade sequence

1. Stop all 3.x writers and read the migration guide.
2. Run the migrator without `--write`; resolve duplicate or ambiguous IDs.
3. Stage the external v4 generation and require schema, parity, and rollback
   receipts to pass.
4. Freeze v3 writers, perform the CAS cutover, exercise v4 rollback, and select
   the accepted v4 generation.
5. Verify CLI, MCP, dashboard, statusline, and Project Map against the same JSON
   authority, then retire active v3 sources into the external audit bundle.
6. Keep the migration workspace until the project's retention policy permits
   deletion. Never restore a v3 writer or lane reader as rollback.

## [3.9.0] - 2026-08-02

### Added
- **Codex global subagent routing fallback.** Added an explicit,
  non-destructive installer for personal Codex multi-agent configuration, a
  global AGENTS admission contract, a zero-dependency routing gate, and a
  policy snapshot for projects without ContextKit.

### Changed
- **Mandatory Codex complexity-risk matrix.** Codex subagent dispatch now
  requires primary-agent classification of both dimensions, uses canonical
  `xhigh`, implements 21 exact Luna/Sol routes, refuses critical risk outside
  critical complexity, and reserves `ultra` for `critical x critical`.

## [3.8.2] - 2026-07-28

### Added
- **OP-0014 - Grok Build native host.** Added Grok as a first-class
  ContextDevKit host with native hook projection, host adapter,
  installer/uninstaller wiring, capability parity, and MCP rendering.
- **Codex-equivalent host controls.** Added Grok parity coverage for the L5
  hook surface, official CLI inspection, MCP doctor integration, and qualified
  MCP tool matching.

## [3.8.1] - 2026-07-27

### Fixed
- **Clean-checkout CI fixtures.** MADM and graph-based squad selfchecks now use
  committed deterministic fixtures and the shipped capability registry instead
  of requiring private dogfood artifacts. Changelog integration still enforces
  installed-mirror parity whenever that mirror exists.

## [3.8.0] - 2026-07-27

> **Publishing note.** `3.7.0` was closed in this changelog and bumped in
> `package.json`, but its tag was never pushed — so npm never received it and the
> last published version is `3.6.0`. `3.8.0` is therefore the first release to
> ship 3.7.0's content as well. No separate `v3.7.0` tag will be cut.

### Added
- **BIZ-0006 — Methodology Plane Integrity, delivered (ADR-0148, ADR-0150..0152).**
  The governance plane that the runtime platform presupposed is now real:
  - **WF-0081** classifier integrity + an explicit investigation exemption, so a
    question stops being classified as code work.
  - **WF-0082** a real Business `create` verb (dry-run by default, atomic apply,
    manifest-validator dispatch, explicit legacy-kind migration). Executable
    ceremonies are `decision` and `workflow`; persisted `Business.kind` is the
    five-value uppercase domain enum, with the classifier's functional axis kept
    separate.
  - **WF-0083** canonical ceremony shapes — the pure five-shape resolver,
    manifest, proportional skeleton packs, canonical continuation prompts,
    structure validator, and a dogfood-leak scrub of the neutral templates.
  - **WF-0084** finalization integrity: the CAS-backed `conclude`, governed
    Business `close`, unified state-authoritative `done-move`, the I1–I10 drift
    guard, and a staged-file pre-commit adapter.
  - **WF-0085** canonical lifecycle discovery + journey branches.
  - **WF-0086** program integration and rollout: the flat methodology policy
    tables are now distributed by the installer, and the plane-wide north-star +
    governance guardrail are instrumented. An unmeasured guardrail is refused
    rather than passed, and the invariant guard's blocking surface is pinned
    across the enforcement ladder.
  - **WF-0087** honest, provenance-aware task-ledger reconciliation (OP-0004).
  - **WF-0088** the governance-contract envelope + schema, lifted from shadow to
    **advisory default-on**.
  - **WF-0089** structural auto-fill by projection — the derived half of a work
    context comes free from the graph.
  - **WF-0090** grounded content auto-fill: the one place an LLM writes, behind
    four rails (grounded-only retrieval with deterministic citation validation,
    provenance-gated `draft` stamping, a pure token guardrail that never calls a
    model, and a structure-only fallback). Ships **default-off twice over**.
  - **WF-0092** the cross-host Canonical Work Journey (ADR-0151).
  - **WF-0094** reference-intent resolution + an existing-context continuation
    gate (ADR-0152).
  - **WF-0095** bilingual pt-BR classifier signals across the whole request-text
    classifier fleet, plus a fix to the accent-stripping tokenizer (ADR-0131).
  - **WF-0096** changelog rotation — closed majors move behind a generated index.
- **BIZ-0005 — Governed Agent Activation & DDD-first quality (ADR-0141..0146).**
  WF-0075 two-tier dispatch gate (pre-write dispatch check + subagent exemption,
  honest fail-open); **WF-0076 DDD-first quality — MADM + reviewer-gate, retiring
  the numeric line-nag**; WF-0077 zero-config autonomy dial + session posture;
  WF-0078 graph-driven cross-squad selection; WF-0079 program distribution +
  rollout guard.
- **BIZ-0004 — the knowledge graph leaves regex tier (ADR-0147).** WF-0080 lands
  the real **WASM AST extractor (Tier-1)**: receiver-type method-call
  resolution, golden fixtures with determinism checks, degrade-to-regex, and
  vendored grammars pinned by SHA-256 with Windows CI coverage. The graph is
  wired into `simulate-gate` and the task compiler with rollout backoff
  telemetry, and its graded signals fold into the arch-debt board as
  `OBSERVE_ONLY`. **WF-0108** makes graph-first exploration mandatory and
  self-refreshing.
- **Architecture & Technical Debt Governance Gate is now a real guarded gate** —
  the twelve dimensions are wired and stated before coding, not after.
- **OP-0009 / WF-0093 — Codex GPT-5.6 effort-aware swarm routing (ADR-0150).**

### Changed
- **OP-0010 — documentation restructured** (ADR-0153): the entry doors (README,
  `instrucoes.md`) were rewritten and the docs spine reorganized.
- Agent instructions deepened with DDD and lean discipline, and **numeric
  file-size limits were removed** from them — size is investigation telemetry,
  never a verdict or a blocker (ADR-0122/ADR-0143).
- Workflow close-wave persists passed gate receipts into workflow state so the
  scheduler can unlock dependent waves, with an integration regression test.
- Workflow index and continuation renderers prefer the authoritative
  `workflow-state.json` journey phase over the static plan phase.
- Intake routes an unresolved citation to `ask` instead of guessing, and gates
  the workflow-registry walk.

### Fixed
- `work` now allocates the next **free** OP id and refuses one already taken.
- `decision accept --apply` actually stamps the ADR front-matter.
- Two phantom-pass paths in the installer, found in pre-merge QA.
- The generated docs index no longer depends on the ambient git environment, and
  no longer lists the gitignored `docs/CHANGELOG.md`.
- An unrunnable check is no longer counted as a pass; an enforcement with no
  consumer is no longer claimed.
- `project-map` dense-index dogfood exclusion and a prototype-collision bug.
- Finalization state-phase and human-gate task-completion projections.

## [3.7.0] - 2026-07-19

### Added
- **BIZ-0004 — Structural Knowledge Graph & Code Intelligence (EXPERIMENTAL, default-ON).**
  A symbol-level code knowledge graph delivered as four workflows (WF-0071 core parsing/
  resolver + committed projection; WF-0072 query surface + consumer adapters + `/graph` CLI +
  read-only MCP dispatch; WF-0073 rationale `cites`-to-real-ADRs + injection sanitization +
  graded arch-debt signals + zero-egress allowlist; WF-0074 staged activation ladder + hot-path
  purity proof). A devteam+QA council review added 5 fixes (composition root so the projection
  carries resolved `calls`+`cites`; egress hard-deny derived from `PLATFORM_DIR`; BLOCKING gated
  on an AST-tier marker per ADR-0137; DRY; partial-graph degrade coverage). **The graph ships
  ENABLED by default** (`projectMap.graph.enabled: true` in the install template): every
  `--update`/install regenerates the committed projection (`tools/install/graph-index.mjs`,
  fail-open), the projection is surfaced at session boot, and `/contract-check` now reports the
  real graph reverse-consumers of a removed export. **Honest maturity — this is why it's marked
  EXPERIMENTAL:** the graph is regex-tier (the Tier-1 `web-tree-sitter` AST extractor is a
  wired-but-unimplemented seam, so `calls` edges are inferred, not AST-resolved), and
  simulate-impact / task-compiler still consume their pre-graph signals (contract-check is the
  first consumer wired to the graph; the rest are follow-on). Guarded/strict blocking stays
  human-gated. All green: 233 suites, arch-debt PASS_WITH_OBSERVATION, hot-path purity proven
  (0 graph modules / 0 third-party deps reachable from any hot-path hook). Governed by
  ADR-0134/0135/0136/0137/0138. WASM grammars remain a target-project opt-in (never embedded),
  preserving the zero-dep hot path.
- **WF-0070 — Memory accessibility & governance digest (OP-0008, ADR-0132).** Installed projects
  version their governance memory by default; a governance digest projection makes the decision
  corpus reachable.
- **ADR-0139/0140 — Domain Engineering enforcement ladder (advisory-on → guarded-by-default).**
  Fresh installs adopt the per-level auto-climb (L4 advisory · L5/L6 guarded · L7 strict,
  authorization-gated); graceful fail-open preserved.

- **Language-aware intent classification (WF-0069, OP-0008, ADR-0131 + ADR-0133).**
  The active per-prompt intake classifier is now language-aware: a new zero-dep,
  no-LLM module `runtime/execution/intent-language.mjs` detects the prompt language
  offline (Unicode script ranges + frozen pt/en stopword tables) and runs embedded
  pt+en intent tables. Questions/read-only prompts in any language stay ceremony-free
  (no-code prior); a mutation verb (create/fix/refactor / criar/corrigir/refatorar…)
  overrides the bias and keeps full ceremony. For a language outside {pt, en} or low
  confidence, the `UserPromptSubmit` hook emits a next-turn `‹CONTEXTKIT-LANG›`
  directive so the model normalizes intent through English semantics — translation
  lives in the model, never the hook (immutable rule 1). Deterministic + fail-open.
- **Always-on write authority + no-code completion escape (ADR-0131 F-A/F-B,
  ADR-0133).** The completion gate honors a "no-code ⇒ zero obligations" escape on the
  active path, but a real `Edit`/`Write` for the same task revokes it (evidence beats
  prior). `track-edits` now stamps each modification with its `taskId` so the receipt
  and the execution contract share one binding across the turn. Never inverts on the
  domain axis (a regulated domain keeps full ceremony). BIZ-0003 domain classification
  runs advisory/shadow with telemetry — never blocking (ADR-0133 reconciles ADR-0131).

### Fixed

- **ADR allocator under-counted `ADR-####-*.md` filenames (OP-0008 Finding #2).**
  `maxAdrInDir` matched only `NNNN-*` / `NNNN.md`; it now also counts the canonical
  `ADR-####` format (`registry/ids.mjs`), so `nextAdrNumber()` no longer collides with
  existing ADRs. Regression-guarded.
- **Spec-pack `createWorkflow` dropped the owner (OP-0008 Finding #8).** Owned
  workflow dirs are now named `WF-####-slug` (matching the wave engine), so the
  registry's `NEW_RE` matches and `resolveWorkflow` preserves the owner instead of
  hardcoding `owner: null` (`workflow-pack.mjs`). Regression-guarded.
- **Dead conversation/documentation/research branches (OP-0008 Finding #7).**
  `request-classify.mjs` branched on the always-present minted per-prompt `taskId`,
  shunting every request to `primaryType: workflow`; it now requires a real external
  workflow reference, so the lower-precedence branches are reachable again.

## [3.6.0] - 2026-07-17

### Added
- **WF-0068 — Multi-host, Installer & Rollout (BIZ-0003, ADR-0128
  §25/§26/§28/§29/§30/§31 + ADR-0129 — the FINAL workflow; program-integration +
  rollout authority; default-OFF preserved, guarded/strict flip human-gated).**
  Makes the Domain Engineering capability portable, installable and
  provably-activated — reuse-over-rebuild, no second installer/gate/registry.
  **Installer distribution** (the known gap): `copyEngine` distributes
  `policy/domain-engineering|devteam|domain-artifacts/` always-overwrite (the
  classifier's schema-coupled single source), `seedSubstrate` distributes
  `contextkit/skills/` via 3-way `syncTree`, and `uninstall --purge` removes both
  (reversible). **Host projections**: the two WF-0067 gate hooks
  (`domain-code-gate.mjs` PreToolUse + `domain-conformance.mjs` PostToolUse) wired
  at L≥4 into `settings-compose.mjs` + the Codex + Antigravity composers (block
  verb translated per host — genuine equivalence, not a declared limitation) and
  removed from the `selfcheck-gates.mjs` unregistered allowlist. **Fitness
  promotion**: the 8 Class-A domain rules promoted OBSERVE_ONLY→BLOCKING+ACTIVE
  together (armed-blocking invariant green; inert fleet-wide because
  `evaluateDomainFitness({}) === []` — no declared domain map ⇒ zero findings).
  **`/domain` diagnostic** (`domain-inspect.mjs`, observation-only; reuses
  `buildImplementationBlock`; `/implementation` dropped — §9 no distinct consumer).
  **§28 telemetry proof**: `precisionRecall` over `buildConfusionMatrix`, authority
  re-derived from the immutable provenance-tier table (self-report Tier D never
  promotes) — distinguishes actual activation from selection. **Staged-activation
  contract**: ships `enabled:false` + `rolloutStage:null` (inert); the
  shadow→advisory→guarded→strict ceiling is the human-gated fleet flip. Docs EN
  (`docs/how-to/use-domain-engineering.md`) + pt-BR (`instrucoes.md`). New
  `integration-test-domain-distribution.mjs` (16 checks: install/marker/
  block-proof-OFF/live-wire-ON/CLI/update/purge) + cross-host parity + §28 checks.
  Independent review (code-reviewer + devops + eval-designer) — no blockers.
  **BIZ-0003 program code-complete** (all 6 workflows done); G-MH4 approved.
- **WF-0067 — Enforcement & Architectural Fitness (BIZ-0003, ADR-0128
  §16/§19/§20/§23/§24/§29 + ADR-0129 — default-OFF, guarded flip human-gated).**
  Turns the shadow Domain Engineering capability into real deterministic
  enforcement by EXTENDING the existing gates — no second gate. Zero-dep PURE
  evaluators under `templates/contextkit/runtime/domain-engineering/` (exported
  from `index.mjs`): `code-gate.mjs` (`evaluateCodeGate` — the §16 two-axis
  verdict applicability×enforcement {ALLOW/WARN/ASK/BLOCK/DEGRADED};
  `resolveDomainMode` default-OFF level→mode ladder; `authoritativeCmis` — a real
  source write forces CMIS=100, §5, closing textual false negatives; `capMode` —
  the §29 staged-rollout ceiling that may only lower authority), `conformance.mjs`
  (`reconcileWrite` — §19 risk-banded drift: record / require-packet-update /
  block-next-write), `completion.mjs` (`evaluateDomainCompletion` — §20 obligations
  derived from the resolved profile only; no-code ⇒ zero obligations ⇒ allow),
  `project-map-compare.mjs` (`compareDomainToProjectMap` — §23 declared-vs-real
  delta). The eight DDD/architecture fitness functions + six advisory signals
  (§24) register into the EXISTING arch-debt catalogue via `makeFinding`
  (`arch-debt/domain-fitness{,-catalogue}.mjs`; `INITIAL_FITNESS_CATALOGUE` 9→23;
  `gate-context.mjs` adds `domainConformance`) — every rule ships `OBSERVE_ONLY`
  at launch so the gate stays PASS_WITH_OBSERVATION and native hosts stay green.
  Two DORMANT hooks (`domain-code-gate.mjs` PreToolUse + `domain-conformance.mjs`
  PostToolUse — built, correct, unwired, on the `selfcheck-gates.mjs` allowlist)
  plus the live `completion-gate.mjs` augmented with `augmentWithDomainCompletion`
  (config-gated default-OFF, fail-open). `tools/selfcheck-domain-enforcement.mjs`
  (46 checks: block-proof, authoritative fallback, fail-open degraded receipt,
  fitness blocking-vs-advisory, completion planned-vs-actual, the staged cap, and
  the false-block/false-pass negative matrix) wired into `selfcheck.mjs`. Class A
  deterministic-by-policy vs Class B predictive (ceiling guarded, never
  auto-strict); every layer default-OFF and fail-open with
  `allow-with-degraded-receipt`. Guarded/strict fleet activation + installer
  distribution are WF-0068.
- **WF-0065 — Native Lifecycle Orchestration (BIZ-0003, ADR-0128 §14/§15/§17 —
  advisory-by-default, shadow/config-gated).** Makes the Domain Engineering
  capability automatic across the host lifecycle by EXTENDING the existing hooks
  — no net-new classifier/registry/gate. A zero-dep runtime under
  `templates/contextkit/runtime/domain-engineering/`: `readiness.mjs`
  (`checkDomainEngineeringReadiness` — the §14 SessionStart probe that reads
  installed state and shapes a `domainEngineering` ledger block + short banner,
  ready/packet-missing/degraded/disabled, never dispatching an agent),
  `directive.mjs` (`extendExecutionContract` — the §15 mandatory
  `‹CONTEXTKIT-IMPLEMENTATION›` directive derived from the envelope's existing
  §15 block, never recomputing CMIS/DAS/profile), `spawn-record.mjs` (the §17
  planned-vs-dispatched-vs-completed evidence bridge over the EXISTING subagent
  substrate — an agent named in a prompt never counts, only a real spawn +
  recorded completion), and a pure `journey.mjs` for PreCompact domain-journey
  continuity. Wired into `session-start.mjs`, `boot-banner.mjs`, `ledger.mjs`,
  `execution-contract-hook.mjs`, `subagent-gate.mjs` and
  `compaction-continuity.mjs` — every wiring point config-gated **default-OFF**,
  additive and fail-open, so a non-adopting project (and every native host)
  boots byte-identical. `tools/selfcheck-domain-lifecycle.mjs` (27 checks) wired
  into `selfcheck.mjs`. Enforcement/guarded blocks are WF-0067; installer
  distribution + strict activation are WF-0068.
- **WF-0066 — Domain Artifacts & Task Compiler (BIZ-0003, ADR-0128 §13/§21/§22 —
  shadow-only).** The five deterministic domain artifacts (domain-map,
  aggregate, use-case, implementation-packet, implementation-receipt) as a
  policy table under `templates/contextkit/policy/domain-artifacts/`
  (`artifact-schemas.json`), each declaring `requiredForProfiles`/
  `neverForProfiles` so proportionality is data, not an if-chain: simple never
  gets a domain-map or aggregate; every code-mutation profile requires an
  implementation-packet. A zero-dep runtime under
  `templates/contextkit/runtime/domain-artifacts/`: `compileImplementationPacket`
  (composes the WF-0063 classification block verbatim), `buildImplementationReceipt`
  (planned-vs-actual diff — agent/skill/forbidden-path/contract deviations),
  `validateArtifact` + `checkProportionality`, and the Task Compiler
  `domain-implementation` recipe plus its four profile recipes
  (`recipe-contracts.json`) declared as DATA over the EXISTING
  `economy/tc-recipe-runner.mjs` DAG shapes — verified against the real
  `validateRecipe()` to prove reuse over forking a second compiler. Eleven
  governed scaffolds (`scaffold-contracts.json`) release only when their
  required contract artifact exists and validates, emitting typed
  `TODO:<field>` placeholders only — never an invented business rule.
  `tools/selfcheck-domain-artifacts.mjs` (46 checks) wired into `selfcheck.mjs`.
  Zero blocking power, zero hot-path wiring; installer distribution of the new
  policy tree deferred to WF-0068 (fail-open baseline until then).
- **WF-0064 — Devteam Agents & Skills (BIZ-0003, ADR-0128 §9-§12/§18 — shadow-only).**
  The devteam composition layer on top of WF-0063's classification. New policy
  tables under `templates/contextkit/policy/devteam/` (skills-registry,
  skill-triggers — the §11 truth-table as data, playbook — the 8-step §12 journey
  Classify→Model→Decide→Compile→Implement→Verify→Review→Receipt, reason-codes,
  manifest) and a zero-dep runtime under `templates/contextkit/runtime/devteam/`:
  `resolveRequiredAgents` (reuses the profile's minimumSquad verbatim — single
  authority), `resolveRequiredSkills` (deterministic CMIS/DAS/profile triggers;
  degraded table → recorded baseline, never a false pass), playbook accessors
  (`model` step profile-gated to domain-driven+ — simple work never gets domain
  ceremony), and the §18 skill-application receipt (`recordSkillApplication` —
  selection vs actual application evidence). The §15 envelope block's
  `requiredSkills` is now resolved from the trigger table (additive
  `skillsDegraded` flag; no module cycle). Six trigger-driven skill bodies under
  `templates/contextkit/skills/`. Two NEW devteam agents — **domain-modeler**
  (explicit model, aggregates only when invariants exist) and
  **implementation-engineer** (smallest safe diff, packet-first, tests with the
  code) — with §9 refusal lists, registry/routing entries and regenerated
  codex/antigravity projections; additive §10 domain-engineering upgrades to
  architect / code-reviewer / test-engineer / context-keeper.
  `tools/selfcheck-devteam.mjs` wired into `selfcheck.mjs`. Skills auto-apply by
  score — never by remembered slash command. Zero blocking power (dispatch =
  WF-0065, enforcement = WF-0067); installer distribution of the new policy/skills
  trees deferred to WF-0068 (fail-open baseline until then).
- **BIZ-0003 — Domain Engineering & Deterministic Implementation (proposed → approved).**
  Full Business package scaffolded under `contextkit/memory/business/BIZ-0003-…/`
  from the source plan, methodology to the letter: `business.json`, business-case /
  investment-decision / growth, 14 `architecture/*` docs (every plan section
  mapped), and 6 nested workflows **WF-0063..0068** (5 waves / 44 tasks each, last
  wave a human gate) governed by the new **ADR-0128**. Core ruling: *mandatory squad
  activation for code, proportional fan-out* (CMIS + DAS → Implementation Profile →
  minimum correct agents). Registries reconciled (work-context / workflow /
  decision). On explicit human authorization the Business was **approved**
  (`confirmed`) and **ADR-0128 accepted** (`covered`); **no workflow started**
  (`workflows.authorized=[]`), no production code. Planning artifacts only —
  gitignored `memory/`, no tracked changes.

### Fixed
- **Wave-gate evaluation now recognizes the full plan vocabulary + derives its
  facts from recorded evidence (ADR-0130).** The ADR-0101 wave engine's
  `evaluateMachineRequirement` (`workflow/gates.mjs`) only mapped six
  requirement names; every ADR-0128/BIZ-0003 wave plan declares a different set
  (`all-wave-tasks-done`, `acceptance-evidence-present`,
  `no-unresolved-critical-risk`, `human-approval-recorded`), which fell through
  to an unpopulated `requirementFlags` and could never pass — so a wave with
  every task recorded `done` still reported its gate `failed` and
  `close-wave --apply` refused forever (observed on WF-0063/0064/0066, all with
  empty `waveStates`). The engine now recognizes that vocabulary and derives
  `acceptance-evidence-present` / `no-unresolved-critical-risk` from the wave's
  **recorded agent-results** via a new pure, exported
  `deriveGateFacts({ tasks, taskStates, agentResults })` — a `done` status
  without a real result carrying `acceptanceMet[]` is NOT acceptance evidence
  (ADR-0128 evidence ruling). Human-mode tasks are excluded from the
  agent-completion facts (their completion is the explicit gate approval, via
  the exported `isHumanTask`). The human-gate safety property is untouched: a
  human gate never auto-passes from ctx; only `approveGate` with a named
  approver approves it, and unknown requirements still fail closed. 14 new
  checks in `tools/integration-test-workflow-gates.mjs`. WF-0064 and WF-0066
  waves were closed and their human gates (G-DA4, G-DM4) approved under this
  fix.

## [3.5.1] - 2026-06-28

### Added
- **Journey blocking gate (ADR-0127, Phase 2 — second cut).** A new PreToolUse
  (Edit|Write) hook (`runtime/hooks/journey-gate.mjs`) turns journey enforcement to
  **guarded + graceful fallback** (the ADR-0125 model, mirrors `simulate-gate`). It
  BLOCKS only a positively-FALSE checkpoint it can evaluate safely — a loose/central
  owned workflow (`workflowNestedUnderOwner=false`) or a forked/duplicate ADR series
  (`adrNumberContiguous=false`) — naming the exact corrective command. It DEGRADES to
  silent/advisory (exit 0, never blocks) on no active entity, unknown evidence, fresh
  install, non-guarded mode, or any error (fail-open). Honors exempt paths + a
  `BYPASS:` escape hatch. `policy/journey.json` `enforcement.mode` → `guarded`.

### Notes
- Over-block is the headline risk: `governingAdrAccepted`/`ownerContextExists` are
  deliberately **excluded** from the block set (they read false merely from being early
  → would false-block); they stay advisory and, for material work, are enforced by the
  existing ADR-0125 materiality gate. A 10-case over-block suite
  (`integration-test-journey-gate`) proves zero false-blocks.

## [3.5.0] - 2026-06-28

### Added
- **Methodology journey-map (ADR-0127, Phase 2 — first cut).** A canonical,
  checkpointed `policy/journey.json` (branches by work nature + ceremony) + a pure
  verifier (`runtime/work/journey-verifier.mjs`) that reports the current stage and the
  exact next command. Each request now prints a `‹CONTEXTKIT-JOURNEY›` advisory (current
  stage + next command), and the boot banner points at the checkpointed journey.
- **Registry-backed journey evidence** (`runtime/work/journey-evidence-registry.mjs`):
  real on-disk verdicts (ownerContextExists, workflow nesting, governing-ADR acceptance,
  no forked ADR series). Unknown checkpoints stay `pending` — never a false ✓.

### Fixed
- **Owned workflows now nest under their owner.** `createWorkflow` (the ADR-0057 pack
  path) placed owned workflows centrally instead of under
  `business|operations/<owner>/workflows/` (BIZ-0001 ownership rule 3). Now fixed;
  unowned workflows stay central.

### Notes
- Journey enforcement is **advisory** in this release; the blocking-checkpoint layer
  (guarded+fallback) is a deliberate follow-up (over-block risk).

## [3.4.2] - 2026-06-27

### Added
- **Native `/work` command (ADR-0126 Phase 1).** A first-class Claude Code entry
  point for the Business-driven methodology (intake → operation → nested workflow),
  driving the **host-neutral** `node contextkit/tools/scripts/work.mjs` — so Claude
  stops reaching for `ctx.mjs`/`cdx.mjs` (the Antigravity/Codex runners, which may
  not exist in a Claude-only install).

### Changed
- **Boot orientation now names the correct CLI.** The intake-gate boot banner
  recommends `/work intake "<objective>"` (was: only `/dev-start`) and shows the
  host-neutral path; `CLAUDE.md` gains an explicit `/work intake` step + a
  nest-workflow-under-owner reminder and lists `/work`.
- **Removed wrong-host runner leaks for Claude** in `workflow-assist` and the QA
  squad playbook (`node cdx.mjs …` → slash commands). Antigravity/Codex skill
  projections regenerated for command↔skill parity.

## [3.4.1] - 2026-06-27

### Added
- **Business-driven methodology auto-adoption on install/update (ADR-0126).** The
  installer now seeds the `memory/business/` + `memory/operations/` work-context
  roots WITH templates and scaffolds the Root Business **BIZ-0001** (status `draft`,
  placeholders only — never invents domain content), so the methodology is ACTIVE
  *and adopted* on a fresh install/`--update`, not merely available. Both summaries
  announce it loudly with the one adoption step (`work intake`). Idempotent +
  fail-open, with preflight-deferral parity and registry no-churn; opt-out via
  `config.methodology.autoSeed:false`. The three `memory/business/_TEMPLATE-*.md`
  documents are now seeded (`MEMORY_SEEDS`). New module
  `tools/install/seed-methodology.mjs` + regression suite `methodology-seed`.

## [3.4.0] - 2026-06-27

### Fixed
- Clean-clone CI portability (release-gating): `selfcheck-arch-debt-calibration` #370.2
  tolerates the valid unwired-floors state; `docs-reindex.mjs` skips gitignored meta files
  (CHANGELOG) and sorts directory entries by code-point for deterministic cross-OS idempotency.

### Added
- **BIZ-0001 design conformance — verbatim classifiers + two deterministic CLIs (OP-0005, ADR-0125 Accepted).**
  Intake/decision scoring tables now match the design specs verbatim: business-vs-operation
  §17 (+6/+4/+3/+2 weights; ≥8 & ≥op+3 → Business, ≥6 → Operation, near-tie → ask one
  clarifying question), execution-ceremony §18 (point bands 0-3 direct / 4-7 batch / 8+
  workflow + hard triggers), business-matching §19 (additive +100/+35/… ; 75/55 thresholds),
  decision-materiality §28 (+5/+4/+3/-10; bands 8/4) and ADR-search §29 (80/60). Two
  deterministic public CLIs shipped — `decision.mjs` (need/search/classify/create/link/
  accept/supersede/registry/render/validate/migrate-legacy) and the completed `work.mjs`
  (intake/link/unlink/promote/reconcile/start/close/validate), all `--json/--check/
  --dry-run/--apply`, atomic + idempotent. Intake emits a `‹CONTEXTKIT-CLARIFY›` question
  on near-ties; a decision-registry read-shim prefers `decisions/` then memory root;
  CLAUDE.md makes the intake ceremony a session-start obligation.
- **Enforcement ships guarded-by-default with graceful fallback (ADR-0125 — BREAKING).**
  `enforcement.mode` now defaults to `guarded` (was `advisory`): the intake ceremony is
  active for every install. Safe by construction — the gate degrades to advisory (warn,
  exit 0) whenever it cannot evaluate safely (no contract/signals, fresh install,
  registry-fail, unregistered task, any throw), so a fresh install is never false-blocked.
  Set `enforcement.mode='advisory'` to opt out, or `'strict'` to tighten. SessionStart
  surfaces intake readiness; gate block/degrade telemetry to `routing-decisions.jsonl`.
- **OP-0006 / WF-0060 economy canary prompt activation + quota writer.**
  Routing source defaults now start in `canary`; AGENTS/CLAUDE templates and
  dogfood prompts instruct agents to use economy mode by default, apply Task
  Compiler only on exact Project Map matches, render resume-pack on checkpoint,
  attach subagent-profile packets, use controller-scoped lean-loop in `/ship`
  and `/swarm`, and record quota observations only through the new explicit
  `economics/quota-snapshot.mjs --write` command. Codex and Antigravity
  projections were regenerated; quota stays `skipped` when host data is absent.
- **Architecture & Technical Debt Governance Gate (OP-0003, WF-0057, ADR-0122 Accepted).**
  Replaces the line-count-as-verdict tech-debt gate with a multi-dimensional gate
  (`architecture-debt-gate.mjs` + `arch-debt/`: finding contract, signal-collector,
  conformance F1–F3 floors, classifier, fragmentation symmetry, security/reliability/
  testability floors, policy-engine, baseline-ratchet, debt-registry+lifecycle,
  intentional-debt, fitness-registry). Project Map gains structural signals (fan-in/out,
  instability, blast-radius, co-change). Line count is now an **advisory** signal that
  never blocks CI/merge; the gate is the **sole CI verdict path** (mode active). Config
  `architectureDebtGate` + l5.lineBudget migration + doctor; constitution §1 amended
  across all sources with host parity. 35 §34 acceptance tests, §13 activation proofs,
  18-case calibration. Merged to main; dogfood active.
- **ARCH-DEBT floor calibration — F2/F3 lit (OP-0003, WF-0057, ADR-0122, card #370).**
  `resolveArchDebtConfig` now passes the conformance authorities (`layerRules` /
  `ownership` / `writeAuthorities`) through and supplies an empty-by-default
  `conformanceBaseline` when any is wired (null otherwise → floors stay SKIPPED, no
  protection gap); the gate composition root passes that baseline into `runGate`.
  F2 (boundary) + F3 (state-authority) now **EVALUATE** on the real tree instead of
  SKIP, block a genuine new violation, and pass clean. Schema models the four new
  keys; template seed ships a documented inert `_floorConfigExample`. New
  `selfcheck-arch-debt-calibration.mjs` (15 checks) + schema assertions. Semantic
  dimensions (cognitive-coherence, change-amplification) stay **OBSERVE_ONLY** — §33
  promotion declined for lack of graded-input evidence (constitution §8).
- **Economy canary guidance fingerprint (OP-0006/WF-0060).** Restored the
  `work-packet` token in the canary activation guidance so the
  `economyActivationSection` fingerprint passes (it was reworded to "bounded packet").
- **Workflow ownership enforcement (BIZ-0001 rule 3).** `createWaveWorkflow` now nests
  owned workflows under `operations/<OP>|business/<BIZ>/workflows/WF-<n>-<slug>` (throws
  if the owner folder is absent); `workflow.mjs new --profile` honors `--operation`;
  new `selfcheck-workflow-ownership.mjs` CI guard.
- **Ownership-based ADR filing (OP-0003, ADR-0123 Accepted).** New `decisions-file.mjs`
  files loose top-level ADRs by owner — Business/Operation attribution → their folder,
  ownerless → `legacy/` — dry-run by default (`--write` applies), with a path-reference
  audit and an idempotent, atomic move. Wired dry-run-safe / fail-open into the installer
  `--update` path (`tools/install/decisions-migrate.mjs`). Amends ADR-0102's
  "not migrated implicitly" layout policy. Dogfood migration filed 112 ADRs → `legacy/`
  and `0122` → `operations/`.
- **Antigravity Host Hook Parity (OP-0002, ADR-0121 Accepted, card 001).**
  Added `done-sweep.mjs` Stop hook to Antigravity's settings composer (`agent-hooks-compose.mjs`) when `level >= 5` to resolve the host parity gap.
- **WF0014 — MCP Integration Layer: governed MCP manager + read-only ContextDevKit MCP server (ADR-0073 Accepted, cards 186-197, merged to `main`).**
  ContextDevKit becomes the *governed layer* for MCP servers, never a bundle: a single
  curated registry under `templates/contextkit/mcp/` is the source of truth; zero-dep
  pure renderers emit native MCP config per host (Claude/Codex/Cursor/Antigravity);
  a policy engine enforces **R0–R5 risk**, read-only-by-default, least-privilege tool
  allowlists, secrets-by-reference, version pinning and provenance; `/mcp`
  (discover/add/profile/doctor/audit/sync/disable/receipt) is wired for claude +
  antigravity; and the kit exposes its own state as a **read-only stdio MCP server**
  (10 tools / 6 resources / 5 prompts). GitHub (read-only) and Playwright (guarded)
  least-privilege profiles ship as the first two. Receipts (MCP-010) degrade to
  `skipped` and governed write tools (MCP-011) to `deny+explain` until the
  capability-enforcement substrate (CDK-021/022) lands — never a false pass. The
  server stays off the Levels 1–3 boot/hot path (immutable rule 1). Every ticket ships
  behaviour + static-wiring suites (split into focused ≤270-line sub-suites).
- **Economy resource telemetry + auto-activation (OP-0001, ADR-0117 Accepted, extends ADR-0103).**
  A single shared telemetry seam (`economy/telemetry-emit.mjs` + `economy/registry.mjs`)
  routes every economy resource to the observed-savings ledger (the 4 levers only) or the
  lifecycle-events ledger, with a strict honesty fence (observed vs estimated never summed).
  The three dormant levers now light up: **project-map `--find` records an observed saving
  on a hit**; **run-compact records its saving** (fixed a CLI bug — the runner never passed
  `root`, so `logSavingSync` silently no-opped) **and emits an `evaluated` event at boot
  without spawning** (rule 2); **routing persists its lifecycle event** to the unified events
  ledger (the decision record carried it but it was never written there). A hardened
  multi-pattern secret redactor (`economy/redact.mjs`, 12 token classes) and a completeness
  meta-test (`selfcheck-economy-completeness.mjs`, registered in CI) guarantee no measurable
  lever ships dark and track the remaining advisory/lifecycle resources.
- **OP-0001 / WF-0039 — the three deferred economy work-packages shipped; completeness gate HARD 20/20.**
  All 13 remaining resources are now instrumented at honest points: 6 at genuinely-wired
  application sites (CLI mains + the `loop-breaker` PreToolUse hook + idempotent `context-profiles`
  in dev-start), and 7 dormant Phase-1/2 modules given **runnable CLI surfaces that emit on
  invocation, with no auto-hook** — new `economy/task-compiler.mjs` (read/compile-only ladder,
  `execute:false` so it never crosses the Task Compiler kill-criterion), new
  `economy/subagent-profile.mjs`, an `agent-contract` drift-audit CLI, and new
  `economy/lean-loop-cli.mjs` (the dormant modules keep their deferred-by-design guards). The
  completeness gate is now HARD for **all 20** resources, with a behavioral selfcheck
  (`selfcheck-economy-instrumentation.mjs`) proving every emit-site by ledger delta. **W7**:
  `run-compact` persists summary-only by default (full raw `output.log` behind `--capture-full`),
  routes every persisted byte through the 12-class redactor, `runs/` gitignored, torn-line
  safety proven. **W8** (`economy/kill-criterion.mjs`): per-lever kill-criterion meter,
  per-session audit line (`net` observed-only, `fable_auto:false`), and a separate `estimated`
  lane in `token-report` never folded into the observed headline.
- **WF-0041 — competitive follow-ups: claims gate + run-journal tail (ADR-0118, merged to `main`).**
  Retired the WF-0040 research spike (folder + COMP cards #225–#229) and migrated its two
  still-live recommendations under operation OP-0002: `claims-gate.mjs` (#354) — a fails-closed
  evidence-tier gate that refuses any public economic/autonomy/competitor claim lacking evidence
  IDs + a snapshot date (refuse-by-default, reuses the `claim:null` discipline) — and
  `runs.mjs --events <id> --follow` (#355) — a daemon-free tail of the append-only transition
  journal (ADR-0043), 500 ms poll with a clean SIGINT exit. Adds claims-gate + runs-follow
  selftests and a dedicated `integration-test-competitive-followups` suite. Zero hot-path deps.
- **Memory-reading reinforcement: `contextkit/memory/` is gitignored-by-design, never "ignorable".**
  Added a prominent callout to the boot context (`CLAUDE.md` template) and a line atop the
  boot-banner Process rules: memory/ is kept out of the PUBLIC repo on purpose (it syncs to the
  private mirror, never to a public push) but is the authoritative project record and must ALWAYS
  be read/searched. Fixes a recurring agent failure where "gitignored" was misread as "unimportant".
- **ADR-0078 & ADR-0079 accepted (status), kept PRIVATE.** Both are `Accepted`; they were briefly
  force-tracked onto `main` then **untracked** (`git rm --cached`) — ContextDevKit's own dev memory
  (`contextkit/`) stays out of the public repo and lives in the private mirror only. Public tracks 0
  `contextkit/` files.
- **Workflow creation requires an owner work-context (ADR-0116 Accepted, OP-0001).**
  `createWorkflow` / `workflow.mjs new` now refuse a `feature`/`architecture` workflow
  without an owner (`--operation OP-####` or `--business BIZ-####`), naming the
  corrective command and stamping `owner:` into the workflow index frontmatter;
  `bug`/`chore`/`spike` stay owner-optional. Closes the BIZ-0001 gap where an
  operation-class workflow could be created bare (ownerless) at the top level.
  Backed by a regression suite in `integration-test-workflow-governance.mjs`.
- **WF0016 — public/internal documentation projection boundary + business-driven README
  (merged to `main`, ADR-0075 Accepted).** Public docs (`README.md`, `docs/`, `instrucoes.md`)
  are now capability-only, enforced by a per-PR docs gate: `docs-public-lint` (banned decision-ids /
  inspiration names / internal paths, with code-block exemption), `readme-claims` (inventory-claim
  freshness), and `selfcheck-docs` + `integration-test-docs` (registered in the test suite). The
  README/instrucoes were restructured around a **business-driven** value proposition with an
  active-by-default / automatic / manual capability matrix. Added the `docs/architecture/` Diátaxis
  bucket, per-genre `_TEMPLATE.md`, and authored content: 2 tutorials, 8 how-to guides, 3 explanations
  (business-driven development, the three economies, governance & enforcement).
- **Automatic feature-reference generation + coverage gate (ADR-0115 Accepted).** `docs-generate.mjs`
  regenerates `docs/reference/{commands,agents,hosts}.md` from the canonical registry between markers
  (idempotent; `--check` is a CI staleness gate); `selfcheck-docs` blocks on a stale reference and
  reports prose-coverage debt as advisory. Wired into `docs-refresh`.
- **WF0038 A7–A9 (W5–W7) — automatic orchestration downstream of classification, shadow-first
  (branch `feat/wf0038-a7-a9`, ADR-0112 Accepted).** Re-homes the dropped A6/ADR-0110 design intent
  under WF0038. **A7** active governed context resolver (deterministic precedence → confirmed/
  suggested/ambiguous/unlinked; never hardcodes the root Business) + auto-deliberation (L7 debate-by-
  default gate, threshold 0.6, distinct synthesizer, recommend-only). **A8** per-tier over-orchestration
  guard (trivial 0 / feature ≤3 / architectural ≤5 sub-agents; debate floor wins) + explicit dispatch
  plan gated behind `executeDispatchPlan`+active mode + planned-vs-dispatched reconcile — extends the
  W1–W4 selector, no rebuild. **A9** child execution envelope (inherits root business/nature/ceremony/
  context/decisions/acceptance; flat delegation; `assertChildScope` refuses reclassify/autonomy-change/
  scope-expansion/createWorkflow/acceptADR) + lazy role-pack hydration under a HARD token budget +
  child→task→wave→business state propagation. 8 new runtime modules, all shadow-only, zero active
  dispatch; per-wave selfchecks W5 11/11 · W6 12/12 · W7 13/13; `selfcheck.mjs` 2252/2252; tech-debt
  no-RED across 695 files. **Merged to local `main` `14a42a0`** (not pushed) + **wired live**: A7+A8
  now enrich the envelope inside `orchestrate()` (run by the `UserPromptSubmit` hook on every plain
  prompt), shadow/fail-open. Post-merge fixes: A7 never convenes for trivial work (Gate 0) and
  auto-deliberation **defers to the classifier's `needsDebate`** (raw materiality is unreliable);
  structural triggers still escalate. End-to-end verified (new Business + new Operation, AI-cannot-
  self-approve enforced); QA sign-off PASS (118/118 suites, tech-debt 0 RED).
- **BIZ-0001 Business-Driven Development & Decision Governance — CLOSED as
  `partially-validated` (merge `2ae77bd`, local main, not pushed).** Final closeout
  adopted the remaining Session-4 waves — **A5** (investment-forecast + recurrence/
  outcomes), **B4** (legacy ADR indexing/migration dry-run + anti-redundancy +
  installer propagation), **B5** (program-governance validator) plus the §3
  routine-coverage split and 6 internal bug-fixes — while **dropping Wave A6**
  (duplicate of WF0038/ADR-0107; ADR-0110 stays superseded → ADR-0107). A 5-agent
  verification swarm confirmed each wave's acceptance; CI **119 suites green,
  tech-debt no-RED across 679 files**; WF-0036/WF-0037 advanced to `conclusion` via
  engine mutators; 3 registries (work-context, workflow, decision) rebuild
  byte-idempotent; ADR-0099 updater-safety + decision-coverage floors intact.
  Engineering outcomes measured-green; usage/adoption outcomes honestly `unknown`
  pending telemetry. [ADR-0102]
- **Automatic economy pipeline at `/dev-start` (WF0037) — merged to local main
  `7c0b3cf`, not pushed.** Deterministic objective fingerprinting, resume and
  Project Map probes before broad context, L7 RequestOrchestrator reuse,
  idempotent lifecycle events, correlated execution acknowledgements, honest
  routing/Token Report reconciliation, and generated Claude/Codex/Antigravity
  parity. Final CI: 113 suites, zero tech-debt RED; post-merge safe-update and
  dogfood smokes passed. Cards #347-350 concluded.
- **Session Autonomy Receipt (ADR-0108) — merged to local main `0874779`, not pushed.** Per-session
  auditable autonomy/token/cost receipt: an assembler over the existing economics layer (no new ledger)
  producing `cdk-autonomy-receipt/1` with a versioned estimator (measured / estimated /
  insufficient-evidence), token + executor accounting, financial (api/hybrid) with cost-source priority,
  Ed25519 integrity (node:crypto, hash-only fallback), mode-aware render, flat-ledger store, and an
  `autonomy-report` CLI. Advisory + fail-open. The WF0018 #242 pilot lives only in a SCOPED
  calibration-profile registry (claim null) — no global multiplier constant; subscription never invents
  savings; estimated is never relabeled measured. Hardened by a code-review (0 blockers) + a 3-voice
  debate (deliberation 2026-06-20-02). CI green: 112 suites + tech-debt no-RED; 96 dedicated checks.
  OPEN: distributed default `enabled:true` (spec §34) vs opt-in (debate voice C) — confirm before push.
- **WF0022 Phase 2 authorized by the project owner (ADR-0109).** After five consistent cross-stack
  A-vs-C measurements (arm-C cheaper at equal QA, CIs excluding 1.0×; formally unpowered, claim null),
  the owner authorized building Phase 2 (#276–280: deterministic transforms, scaffold, content cache,
  recipe-runner, ephemeral dispatch). ADR-0089 safety contract is now binding. A `PHASE2-EXECUTION-PROMPT.md`
  (cards/DAG, reuse list, swarm rules, multi-session coordination) drives execution. claim stays null —
  this authorizes the build, not a claim elevation.
- **Per-lever ablation benchmark harness (ADR-0106, WF0022 #275) — branch `feat/per-lever-benchmark`,
  not merged.** Registry-driven ablation-ladder matched-pair benchmark: `lever-registry` (8 active
  Phase-1 levers + 5 dormant Phase-2 endpoints), `ablation-plan` (fitToBudget to the $25 cap, never
  below 3 reps), `ablation-run` (symptom-only single-variable run-specs), `ablation-record` (JSONL +
  equal-QA matched pairs), `origemcrm-seed` (generic TS bug seeder), `phase2-evidence-spec` (§8
  firewall: unbuilt levers return `skipped`, never `pass`). All reuse `benchmark-statistics`/
  `baseline-harness` read-only; all ≤308 lines, zero-dep; selfcheck (40 asserts) wired; full CI green.
  A scaled powered run on a fresh kit-free origemcrm-test (TS/vitest) gave +12.3% aggregate, CI95%
  [1.024, 1.273] (excludes 1.0×), equal QA — but INCONCLUSIVE/unpowered, **claim null** (a human elevates).
- **Task Compiler execution ladder — Phase-1 Wave 1+2 (WF0022 #265/#267/#268/#270/#271/#272).** A
  read/compile-only deterministic ladder under `economy/`, composition-over-forking (reuses
  project-map, complexity-rubric, model-policy, the ADR-0083 envelope — nothing rebuilt):
  `tc-telemetry` (packet-cost/escalation telemetry), `tc-intent` (ambiguity scorer, escalate-by-default),
  `tc-related` (related-files + symbol projection + closure guard), `tc-route` (pure-fn execution-router),
  `tc-validate` (result-validator → envelope; prose rejected), `tc-accept` (conjunctive skip-aware
  accept-gate). Each ships a `runTc*Checks` runner aggregated in `selfcheck-economy-all`; all files
  ≤308 lines, zero-dep. Built via a governed 5-agent swarm; merged with full CI green (111 suites, 0 RED).
- **Task Compiler #275 wedge — INCONCLUSIVE verdict on existing data (claim null).** Matched-pair
  A-vs-C on the existing arm-A/arm-C2 measures (n=8, 1 rep): savings ratio median CI [1.039, 1.678]
  (excludes 1.0×), +39.8% aggregate, equal QA — but evidence tier `unpowered` ⇒ formal conclusion
  INCONCLUSIVE, claim stays null. Phase 2 (#276–280) remains blocked pending a powered (≥3-rep) run.
- **BIZ-0001 Business-driven methodology — Session 3 waves A3·B2·A4·B3 (ADR-0102).** Built as a
  5-agent swarm with intelligent model routing (Haiku ops · Sonnet exec · Opus design). A3:
  Business draft→approve→revise→reject lifecycle with a human-only approval ceremony (AI cannot
  self-approve), Business Gate (accepted-ADR + matching decisionHash) and a Growth validator
  (causal chain + KPI completeness + no invented baselines). B2: deterministic decision-need
  classifier + materiality score + existing-ADR search/match (no embeddings), attached additively
  to intake (`signals.decisionNeed`/`decisionMatch`, fail-open). A4: global cross-root workflow
  resolver (new + legacy) + collision detection + migration planning (dry-run by default,
  human-gated ownership transfer). B3: hook split (`execution-contract-advisory.mjs`) + approval
  mirroring/supersession + decision-coverage gates. New suites a3/b2/a4/b3-bdm.

### Fixed
- **MCP install propagation hotfix (WF-0061 / card 371).** The installer now
  copies `contextkit/mcp/` and `contextkit/mcp-server/` into fresh installs and
  update targets alongside runtime/tools, with a real install/update regression
  test proving the curated MCP registry, profiles, and read-only MCP server are
  installed without clobbering project-local MCP state.
- **done-sweep blind to wave-format workflows (ADR-0119 amendment).** The `done/`
  lifecycle sweep only recognised legacy `index.md` `conclusion: done`, so wave-engine
  workflows (completion recorded in `workflow-state.json` `overallStatus: done`) were
  never filed and business/operations `done/` archives stayed empty. `isConcluded()`
  now reads both, and the filing owner is recovered from the holder path when the wave
  index carries no `owner:`. Filed the concluded BIZ-0001 workflows (WF-0036/WF-0037).
- **BIZ-0001 a4 migration: `collisions is not iterable` on a clean checkout (ADR-0102).**
  `detectWorkflowCollisions()` returns `{duplicateIds, duplicatePaths}` but `migration-plan.mjs`
  iterated it as an array. Added `normalizeCollisions()` (object→array, no auto-move) + regression guard.
- **BIZ-0001 decision-bdm: clean-clone resilience (constitution §8).** The suite's ADR-0102 +
  live-registry checks now SKIP (not fail) when the gitignored dogfood decision tree is absent.
- **`defaults.mjs` over the 308-line budget.** Economy Phase-A activation had pushed it to 309
  (tech-debt RED). Extracted the `ledger` block into `defaults-ledger.mjs` (behavior identical).
- **`project-map --find` now covers UNEXPORTED symbols + deprioritizes test files (WF0018).**
  The dense index reused the export-only sampler, so unexported helpers returned 0 candidates and a
  `_test.go` could be the top hit. `project-map-dense.mjs` now uses a dedicated dense extractor
  (exported + unexported, all langs) and orders source files before test/spec files (`isTestFile`).
  compozy index 5228 → 11548 symbols; the symbols that the ceiling re-test flagged now resolve to
  their source file. selfcheck-projmap-find extended; CI green (lone decision-bdm env fixture aside).

### Added
- **Token report: "💸 Economy in effect" — OBSERVED per-lever savings (CDK-266).** New
  `economy/economy-savings.mjs` append-only ledger logs how many tokens each lever actually avoided
  in the user's own sessions: boot-delta (banner-size reduction every reboot) and run-compact (full
  output − compact summary) are wired and real; project-map + routing appear honestly as `0 (dormant)`
  until they actuate. The block is labelled "observed — NOT a causal claim vs no-kit (#243)" and carries
  NO claim field. Populates on the next session boot.
- **Token report: benchmark-pilot evidence surface (WF0018 #176/#242).** Reads
  `contextkit/memory/benchmark-pilot.json` and shows the measured A-vs-C pilot (1.398× / +39.8% token
  efficiency at equal correctness, n=8) with `claim: null` ALWAYS rendered (even if the file carried a
  claim) and the ADR-0080 #243 powered-run gate cited — a pilot signal can never read as a powered claim.
  #176 baseline + #242 pilot data marked obtained; #243/#245 stay gated.
- **Deterministic economy stack — `--find`, work-packet, auto-activation (WF0018/WF0022 #266, ADR-0103).**
  Five token-economy levers, ON by default and auto-emitted every session via the SessionStart banner
  ("💸 Economy mode active"): `project-map --dense` + `--find <symbol>` (complete symbol→file reverse
  index + 1-line query, a grep replacement); `tc-packet` work-packet compiler (the symbol SLICE
  `{file,symbols,lines}`, not the package — dry-run, claim/cost null; WF0022 #266 pulled forward);
  `economy-dispatch` (bundles the `subagent` context profile + `run-compact` + loop-breaker);
  `economy-session-activation` (emits the deterministic-tools guidance, wired into session-start +
  boot-banner). Reversible via `economy.autoActivate` / `economy.tools.*` (defaults-economy.mjs).
  6 selfchecks (63 asserts) via `selfcheck-economy-all.mjs`. Zero-dep, deterministic, all ≤308 lines.
  Ships in `templates/` → install + `--update` propagate it. Measured A-vs-C floor: +7.1% token
  efficiency at equal correctness on a 217k-LOC Go repo (claim:null).
- **Economy CEILING measured — full stack (`--find` + `run-compact` + work-packet) = +39.8% (WF0018).**
  arm-C2 on the same 8 compozy bugs, 8 Sonnet sub-agents, package given: Σ 0.223453 MTok vs reused
  arm-A 0.312447 (8/8 green both) → multiplier **1.398×**, beating the prior +7.1% floor by 30.6%.
  Wins concentrate on retry-heavy tasks (t7 −56.6%, t5 −40.4%). `claim:null` (n=8, 1 rep; caveat:
  parallel-tree contamination inflated t5/t6/t7 → conservative upper bound). Report under
  `contextkit/memory/workflows/0018-.../reports/2026-06-19-economy-retest-ceiling.md`.
- **Economy Dispatch Plan helper — advisory bundle for sub-agent spawning (feat/project-map-dense).**
  New `templates/contextkit/tools/scripts/economy/economy-dispatch.mjs` bundles the three
  advisory economy levers (context-profile subagent, run-compact hint, loop-breaker signal)
  into a single frozen `buildDispatchPlan()` plan object the orchestrator attaches when
  spawning a sub-task. Gracefully degrades if sibling modules fail to load; disabled via
  `cfg.economy.enabled=false`. `presentDispatchPlan()` emits a terse advisory string.
  Selfcheck module (`tools/selfcheck-economy-dispatch.mjs`, 14 asserts) confirmed green.
  Zero runtime deps, deterministic, pure, ≤308 lines. Advisory only — never blocks.
- **EACP Autonomy Multiplier — activated from the state substrate (ADR-0105, WF0018 #255).**
  The multiplier was wired but starved (token-report fed it no tasks → always "skipped").
  New `economics/autonomy-outcomes.mjs` derives `usefulAutonomy` records from the append-only
  pipeline state events (`actor:'qa'` deterministic-gate transitions — no parallel ledger, §9);
  token-report now feeds them. The numerator is MEASURED (advisory; dogfood lit up at 17/17
  QA-green); the causal ratio still degrades to "skipped" until a kit-free baseline arm-A (#176).
  `claim:null` throughout. Ships in `templates/` → propagates to existing installs on `--update`.
- **EACP subscription-mode benchmark — measure tasks-per-window without API spend (ADR-0104, WF0018 #254).**
  New `economics/benchmark-subscription.mjs`: an A-vs-C Autonomy-Multiplier pilot denominated by an
  OBSERVABLE usage unit (effective-MTok primary, quota-% corroboration) instead of USD, so
  subscription-host users (e.g. Claude Code Max) can run it through the CLI with no API key and no
  metered spend. `claim:null`; single-session runs flagged `pilotSmoke` (arm A not isolated). The
  USD/API path (#242/#243) is unchanged and remains the authority for the dollar claim.
- **Economy Runtime activation go-live — advisory, ON by default (ADR-0103, WF0020).**
  Activates all 9 previously-dormant Economy Runtime modules ON by default (advisory,
  fail-open) in the dogfood and in every new/updated install: a per-module toggle
  surface (`ECONOMY_MODULE_KEYS` single source → `FLAG_DEFAULTS`, `EconomySchema`,
  `defaults-economy.mjs` seed), installer additive distribution + a go-live notice,
  patch-economy (#263) + loop-breaker (#262) warn-only advisories on the CDK-032 gate
  (`gate-advisory.mjs`; pure `evaluateAction` untouched), the canonical Output Contract
  injected into all 12 qa-* agents + run-compact/lean-loop notes in commands, and
  boot-delta (#259) gating of unchanged informational boot sections (`boot-delta-gate.mjs`;
  −49.8% on re-boot, Process rules + drift never gated). Disable per-module via
  `economy.<module>.enabled=false` or wholesale via `economy.enabled=false`; `economy.mode`
  stays advisory (never blocks). Install/update bug-hunt clean; CI green.
- **Business-Driven Methodology program — BIZ-0001, Wave A0 (WF-0036 + WF-0037, ADR-0102).**
  Bootstrap of a business-driven, evidence-governed methodology: one approved Business
  (TRANSFORMATION / PLATFORM_CAPABILITY) with two nested Workflows — A (Business/Operations/
  Workflow architecture) and B (Authoritative Decision Governance) — over one shared domain
  model. Wave A0 (documentation/contracts only) materialized in an isolated worktree:
  canonical Business package (business-case/growth/investment/business.json), shared entity &
  identifier contracts, source-of-truth + ownership/origin rules, schema & compatibility plans,
  cross-workflow dependency DAG, §40 agent-dispatch contract (per-task agent type, allowed/
  forbidden paths, evidence, expected-result JSON), both workflow packs, and the primary
  Business ADR-0102 (accepted, YAML front matter v2) under a new `decisions/{business,
  operations,legacy}/` layout. **Hybrid format ruling**: new dash-prefixed IDs + dirs + YAML
  for new artifacts; legacy `NNNN-slug` workflows + plain-markdown ADRs preserved, resolvable,
  never migrated implicitly. Planning/dogfood only — no runtime code yet; pacing capped at
  4 waves/session; next is Wave A1 (paths + schemas + Operations + registries).
- **Economy Runtime Wave 1 — output/lifecycle actuation (WF0020, ADR-0082..0086, ECON-01..07/11).**
  Eight advisory, fail-open, UNREGISTERED libraries under `tools/scripts/economy/` that
  bound output, tool cost, preparation, and context lifetime by governing artifacts the
  kit already owns — no new gate, no command-file edits: output contract + worker
  envelope (override floor + evidence-preservation invariant), findings protocol +
  deterministic merge, single-source agent output contract, compact command runner
  (exit-code truth + normalized delta), context-pack `digestUnreleased` parity + profiles,
  boot delta (lib), `ship-state checkpoint` + bounded resume-pack, and `economy.*`
  governance with honest before/after measurement. 57 econCheck assertions aggregated
  into `selfcheck-economy-wave1`.
- **Economy Runtime Wave 2 — advisory gate signals (WF0020, ADR-0082/0084, ECON-08/09/10).**
  Three gate-coupled libs that COMPUTE `projectState`-compatible signals for WF0019's CDK-032
  `evaluateAction` WITHOUT a new gate and WITHOUT touching the live gate (wiring deferred):
  lean-loop (delegate-to-worker, controller-scoped to `/ship`/`/swarm`, with the worker-envelope
  contract), loop-breaker (repeat-error / repeat-diff / no-progress detection; escalates only at
  `strict` + self-clearing), and patch-economy (suggest Edit/patch over Write-rewrite of a large
  file). All advisory + fail-open + UNREGISTERED. 30 econCheck assertions in
  `selfcheck-economy-wave2`. **Completes WF0020 (all 11 cards, workflow `done`).**
- **Activation go-live — advisory enforcement stack + installer policy distribution (ADR-0097, WF0032).**
  Wires the built-but-dormant PKG-04 advisory hooks into `settings-compose` at L≥5
  (completion-gate, subagent-gate, compaction-continuity — all warn-only, fail-open;
  `enforcement.mode` stays advisory). `/state` now surfaces a Fleet/Agents headline at
  L≥7. New `tools/install/policy-migrate.mjs` additively distributes policy-store keys
  on `--update` (reusing the config-migration semantics; user values always win;
  `capability-registry.json` now seeded). `enforcement.mode` is NOT raised to guarded
  (still gated on dogfood thresholds).
- **Capability Enforcement PKG-08 — Fleet & Agent platform (CDK-080…083, WF0031, ADR-0072 + ADR-0096).**
  The FINAL package — the program is now 50/50 complete. Three advisory, read-only,
  fail-open, UNREGISTERED tools that compose the PKG-04…07 surface (§9): `fleet-compliance`
  (fleet-wide capability-compliance + scorecard + readiness roll-up across registered
  repos), `agent-registry` (unified roster+squad+tier+quality index; per-agent cost
  surfaced honestly as `null` until the usage-event schema can attribute it), and
  `policy-distribution` (advisory dry-run additive diff of kit-baseline vs target policy
  stores; installer wiring deferred). New ADR-0096 records the Agent Forge/Fleet product
  boundary (Forge internal, Fleet local, distribution = propose-review). Covered by
  `selfcheck-pkg08-fleet.mjs` (23 checks). `npm run ci` green: 72 suites, tech-debt 0 RED.
  Local-only on `main`, not yet released.
- **Installer config-section auto-migration on `--update` (ADR-0095, workflow 0030).**
  `npx contextdevkit --update` now additively merges new default config sections
  (e.g. the `routing:` block) into an existing project's saved `config.json`,
  preserving every user override; idempotent, arrays treated as leaves. New pure
  module `tools/install/config-migrate.mjs` (`migrateConfigSections`) wired into
  `engine.mjs writeConfig`, plus a version-aware `📦 Updated vX → vY` notice in
  `install.mjs`. Covered by `integration-test-config-migrate.mjs` (28 assertions,
  `integration:installer` tier). **Shipped in product release v3.0.0** — consolidated
  PKG-05..07 + EACP Waves 1–8 + ADR-0094 routing onto `main` (PR #96), published to
  npm with provenance + GitHub Release.
- **Capability Enforcement PKG-07 — lineage consumers (CDK-071…077, WF0029, ADR-0072).**
  Seven read-only advisory consumers of the CDK-070 lineage graph: public ADR
  projection (`lineage-public`), lineage calibration (`lineage-calibration`),
  executable business rules (`lineage-rules`), governance policy index
  (`policy-registry`), canonical evidence taxonomy (`evidence-taxonomy`),
  engineering scorecard (`engineering-scorecard`), and autonomy-readiness v2
  (`autonomy-readiness-v2`). Each composes existing signals — no new state, zero
  writes to any source store, fail-open, UNREGISTERED, every file ≤ 280 lines.
  PKG-00…07 complete (program 42/50). Local-only.
- **Automatic model routing for standard sessions (ADR-0094).** Persistent,
  default-on routing posture — *Haiku operates · Sonnet executes · Opus decides*
  (Opus implements high/critical-risk code directly; Fable never auto-selected) —
  active in **every** session, not just `/swarm`, with **no re-prompting**. Composes
  the ADR-0052 engine (`model-policy.mjs`) + EACP economics; does not fork them. New
  `tools/scripts/routing/`: `task-classifier.mjs` (deterministic complexity×risk→
  executor), `routing-decision.mjs` (runner-first over-orchestration guard +
  total-cost estimate via `cost-engine`), `routing-config.mjs` (precedence
  session>project>default + activation), `routing-telemetry.mjs` (append-only
  decision ledger; kit-routing economics only — never the provider's cache savings).
  New `routing:` config block (`defaults-routing.mjs` + zod `RoutingSchema`) defaults
  to **`shadow`** mode (recommend + measure only; `canary`/`active` are deliberate,
  telemetry-gated promotions). SessionStart persists `ledger.routing{active,mode}` and
  surfaces one short boot-banner line; `/dev-start` + `/log-session` carry the posture
  (deterministic collection → runner/Haiku). `/token-report` gains an additive
  `routingTelemetry` surface. Tests: `selfcheck-routing.mjs` (42 checks, floor→1480) +
  `integration-test-routing.mjs` (20 acceptance scenarios); `npm run ci` green
  (63 suites + tech-debt 0 RED / 375 files). Disable per session via `routing.enabled=false`.
- **EACP Wave 7 — #176 benchmark baseline harness + ADR-0080/0081 ratification (WF0018).** Seventh EACP wave; baseline scaffold (claim null, data pending a real run).
- **EACP Wave 6 — benchmark pilot harness (WF0018, card #242 EACP-13). Sixth EACP wave.**
  Read/scaffold-first A/B/C benchmark harness model — `economics/benchmark-design.mjs`
  (arms A/B/C, `PILOT_ARMS` `['A','C']`, controls-held-equal, task strata, phases,
  targets {1.30/1.50/1.70} — targets, not claims), `benchmark-run.mjs` (deterministic
  `MOCK_PROVIDER`, no spend; runs degrade to `skipped` without a provider/baseline;
  append-only JSONL), `benchmark-report.mjs` (independent-QA scoring with
  evaluator≠operator gate, matched-pair `comparePilot`, advisory `presentBenchmark`).
  **Honesty-gated**: the #176/CDK-003 baseline is unbuilt, so every real-measurement
  path returns `skipped`/`unknown` and `claim` is ALWAYS null (ADR-0080 evidence tier).
  Mock runs are labeled and excluded from claims; zero-dep + deterministic. New
  `selfcheck-eacp-benchmark.mjs` (7th EACP runner) + integration smoke; `npm run ci`
  green (60 suites + 0 RED). Awaiting human merge/commit on `main`.
- **Capability Enforcement PKG-06 — multi-host telemetry, compliance, benchmark & drift (split wave, WF0027, ADR-0072, cards 314–318).**
  Five advisory, additive, zero-dep, UNREGISTERED deliverables on branch `feat/pkg06-multihost-telemetry` (`7a526ea`, awaiting human merge; `npm run ci` green — 57 suites + tech-debt 0 RED / 330 files):
  `skill-runner.mjs` (CDK-060, resolve/list Claude native skills), `capability-compliance.mjs` (CDK-061, per-host compliance matrix),
  `telemetry/normalize.mjs`+`adapters/codex.mjs` (CDK-062, host→adapter dispatch that *consumes* the EACP usage-event — zero writes under `economics/`),
  `benchmark-task.mjs` (CDK-065, continuous tokens-per-completed-task ledger), `wiring-drift.mjs` (CDK-068, instruction/config/wiring drift guard).
  The 4 cost cards (CDK-063/064/066/067) are deferred behind the EACP economics merge (consume, don't fork).
- **Capability Enforcement PKG-06 cost consumers — per-host cost, capability ROI, cache-churn health (WF0027, ADR-0072, cards 314–316).**
  Three advisory, additive, UNREGISTERED consumers of the EACP `economics/` layer (merged to local main `51f078d`; `npm run ci` green — 60 suites + tech-debt 0 RED / 350 files; zero writes under `economics/`):
  `host-cost.mjs` (CDK-063, per-host financial cost + gross cache value over multi-host telemetry that claude-only token-report-cost can't see),
  `capability-roi.mjs`+`-core` (CDK-066, NEW `byCapability` attribution lens joining `attributionSkill`→registry `aliases.claude`, then cost),
  `cache-churn-health.mjs` (CDK-067, correlates wiring-drift churn with cost-engine gross cache value into a cache-health band).
  **CDK-064 (context pressure & re-read) dropped** as superseded by EACP Wave 3 report-advisories (constitution §9 — no speculative half). PKG-06 now complete (9/9); program at 34/50.
- **Capability Enforcement PKG-05 — project-map & adaptive context (WF0026, ADR-0072, cards 307–313).**
  Seven advisory, additive, zero-dep deliverables (merged to local main 718fc3b; npm run ci green — 52 suites + 0 RED):
  - **#307 CDK-050** — configurable project-map `roots`/`excludes` with a two-tier
    (deep vs root-anchored) exclude model; `contextkit` is now root-anchored, fixing
    the dogfood self-map so `templates/contextkit` (the source) is mapped.
  - **#308 CDK-051** — read-only project-map coverage report (`/project-map --coverage`).
  - **#309 CDK-052** — deterministic, metadata-only executable context manifest tool
    (`context-manifest.mjs`); boot-hook injection deferred to a user-gated activation.
  - **#310 CDK-053** — playbooks scoped by workflow phase / squad (`playbook list --phase/--squad`).
  - **#311 CDK-054** — zero-dep BM25 lexical retrieval ranking (`memory-score.mjs`);
    `memory-retrieve` swap deferred.
  - **#312 CDK-055** — rule fossilization ledger for deprecated/superseded rules.
  - **#313 CDK-056** — multi-host selective context-load parity check (claude/codex/agy; 0 real gaps).
- **EACP Wave 1 — economic measurement core (WF0018, ADR-0078/0081).** First
  implemented slice of the Economic & Autonomy Control Plane: a zero-hot-path-dep
  `templates/contextkit/tools/scripts/economics/` module cluster.
  - **#230 EACP-01** — canonical `UsageEvent` (`usage-event.mjs` +
    `usage-buckets.mjs`): schema versioning, bucket-close invariant
    (`total = freshInput + output + cacheRead + cacheWrite + reasoning`),
    fail-fast `normalizeEvent`, and `toDelta` delta/cumulative normalization that
    structurally prevents summing cumulative totals as deltas. Five confidence-rated
    attribution lenses (`attribution-lenses.mjs`: inclusive/byAgent/byModel/byPhase/
    exclusiveBySkill) and a Claude Code usage adapter (`adapters/claude-code.mjs`)
    that declares its capabilities and fakes no missing data.
  - **#231 EACP-02** — privacy & retention foundation (`privacy.mjs` +
    `retention.mjs`): local-first, metadata-only defaults, opt-out / external-send
    consent gates (default off), deterministic path redaction, fail-closed
    retention/purge, provenance stamping, and a `skipped`-not-passed marker.
  - **#232 EACP-03** — sanitized synthetic fixtures + golden outputs reproducing a
    cache-heavy session SHAPE and proving the cumulative-summing trap is neutralized
    (naive 74,125 → normalized 19,545). Fixtures prove pipeline correctness only,
    not baseline reality (panel QA#11).
  - Coverage: new `tools/selfcheck-eacp.mjs` (33 assertions, wired into
    `selfcheck.mjs`) + 3 end-to-end assertions in `integration-test-token-economy.mjs`.
    Advisory/measurement-only; no command behavior changed; ADRs remain Proposed
    (ratified by EACP-17). Token report v2, cost engine, pressure, budgets,
    benchmark are later waves.
- **EACP Wave 2 — pricing registry & cost semantics (WF0018, ADR-0079).** Second
  slice of the Economic & Autonomy Control Plane: offline, reproducible cost on top
  of the Wave 1 measurement spine. Zero-hot-path-dep; ≤308 lines/file; npm run ci
  green (52 suites + 0 RED). Advisory/measurement-only; ADR-0079 remains Proposed.
  - **#233 EACP-04** — versioned pricing registry (`economics/pricing/`):
    offline JSON snapshot with full provenance (source, fetchedAt/verifiedAt,
    effectiveDate, confidence, deprecation, context window) and **TTL-aware cache
    prices (cache-read + cache-write by 5m/1h)** — the forge capability-matrix
    (illustrative, input/output only) is *not* the cost source. Loader API
    (`pricing-registry.mjs`): `loadRegistry` (null when absent, throws when
    malformed-present), `priceFor`/`resolveModelId` (alias-tolerant),
    `isPriceUsable` (gates `inferred`/`unknown` out of dollar figures),
    `detectDrift`, `registrySummary`, private-override merge, thin CLI. Fable-5
    ($10/$50) ships `confidence: inferred` → renders `unknown`, never a price.
  - **#234 EACP-05** — cost engine (`cost-engine.mjs`): `actualCost` (cache-write
    at its real TTL multiplier, cache-read ≈0.1×), `noCacheCost`, `grossCacheValue`
    (labeled *provider feature, NOT kit contribution*), `routingSavings`
    (quality-gated), `costPerQaGreenTask`, and `projectTierCost` — which finally
    **wires the previously-unused `model-policy.priceForTier`** (matrix-derived →
    honestly `inferred`). **E2 open decision pinned to variant (b)** — no-cache =
    `(fresh+cacheRead+cacheWrite)×input + output×output` — frozen in
    `fixtures/cost-golden.json` (the only variant that yields a positive gross
    cache value). Missing/inferred price → `usd:null` + `confidence:unknown`,
    never `$0`; subscription hosts never lead with USD.
  - **#235 EACP-06** — Token Report v2 (`token-report-cost.mjs` + additive
    `token-report.mjs`): `--json` now carries `schemaVersion: eacp-token-report/2`
    and a `financial` block (per-model + total actual cost, gross cache value,
    confidence tier, unpriced-model disclosure) — strictly additive, every legacy
    key preserved. Registry absent → `skipped`, never fabricated cost.
  - Coverage: new `tools/selfcheck-eacp-cost.mjs` (21 assertions, wired into
    `selfcheck.mjs`; MIN_CHECKS floor raised) + 3 registry→cost→Report-v2
    end-to-end assertions in `integration-test-token-economy.mjs`.

- **EACP Wave 3 — session pressure & context-health advisories (WF0018,
  ADR-0077/0081).** Third slice (v1-wedge §D): the two cheapest, highest-salience
  advisories on top of the Wave 1 measurement spine. Advisory-only, additive,
  zero-hot-path-dep; ≤308 lines/file; `npm run ci` green (52 suites + 0 RED).
  ADR-0077/0081 remain Proposed.
  - **#236 EACP-07** — session-pressure score + split (`economics/session-pressure.mjs`):
    `deriveSignals` (turns, mean tokens/turn, cache-write ratio, total — observed
    cache-read/turn kept unscored) → `pressureScore` weighted over present signals
    only → band `healthy|elevated|hot|critical` with `splitRecommended` +
    actionable recommendations + triggers. Thresholds are **ADR-0077 policy data**
    (frozen table). Neither totalTokens nor turns present → `skipped`, never a
    false `healthy` band.
  - **#237 EACP-08** — repeated-read + map effectiveness (`economics/map-effectiveness.mjs`):
    `readFacts` over normalized tool-call **metadata** (never message content) →
    observed repeated-read counts, broad-searches-before-map, files-opened-after-map,
    project-map ROI framing. **Paths redacted** (`[8hex]/basename`, ADR-0081);
    deterministic ordering; empty events → `skipped`, never fabricated facts.
  - Surfaced via Token Report v2 (`economics/report-advisories.mjs` seam +
    additive `pressure` / `mapEffectiveness` keys on `token-report --json` and
    two table lines) — `schemaVersion` stays `eacp-token-report/2`, every legacy
    key preserved.
  - Coverage: new `tools/selfcheck-eacp-pressure.mjs` (36 assertions, wired into
    `selfcheck.mjs`; MIN_CHECKS 1225→1265) + Wave 3 end-to-end advisory assertions
    in `integration-test-token-economy.mjs`.

- **EACP Wave 4 — budgets/cost-guards & model-routing economics (WF0018,
  ADR-0045/0052/0077).** Fourth slice (§E + §F): the economic controls that ride
  the *existing* governance seams — no new enforcement path. Advisory-only,
  additive, zero-hot-path-dep; ≤308 lines/file; `npm run ci` green (57 suites +
  0 RED / 345 files). ADRs remain Proposed (ratification is #246).
  - **#238 EACP-09** — budgets & cost guards (`economics/budgets.mjs` engine +
    `economics/budgets-report.mjs` surface): `evaluateBudget` over 13 scopes
    (call…provider) maps spend→limit into the mode ladder
    `observe→warn→ask→downgrade→split→block`, then escalates to `split` under
    Wave-3 `hot`/`critical` pressure and clamps to the budget's `ceilingMode`.
    Its only enforcement coupling is the plain `budgetExhausted` boolean the
    **existing** autonomy resolver already consumes at grade 4 (ADR-0044 D3) —
    it imports nothing from `resolve-autonomy.mjs` and is **not** a new gate.
    `recommendCheaperModel` never drops below `policy.floorTier` on a critical
    task; `applyBypass` records human-bypass provenance and **refuses** a bypass
    without `by`/`reason`; every evaluation carries an `auditRecord` (timestamp
    caller-supplied — deterministic). Missing budget / spend / over-limit-with-no-
    hardCap all degrade to `skipped`, never a false "within budget".
  - **#239 EACP-10** — model-routing economics + Fable audit
    (`economics/routing-economics.mjs`): `routingFactors`/`selectStrategy` weigh
    task/complexity/risk/privacy/budget/tool-calling into one of seven strategies
    (fixed/fallback/cost-/latency-optimized/quality-evaluated/local-first/
    privacy-constrained); `routingROI` counts savings **only at equivalent
    quality** (null + `unknown` confidence when QA signals are absent — never a
    fabricated number); `fableAudit` documents Fable-5 ($10/$50 MTok, premium,
    manual-only, `accidentalRisk` flag for any auto-route). `tierEconomics`
    finally wires the previously-unused `model-policy.priceForTier` (through
    `cost-engine.projectTierCost`), degrading to `skipped` when the forge matrix
    is absent.
  - Surfaced via Token Report v2 (additive `budgetGuard` / `routing` keys on
    `token-report --json` + two table lines) — `schemaVersion` stays
    `eacp-token-report/2`, every legacy key preserved; the report stays
    grade-blind (display only, never calls the resolver).
- **EACP Wave 5 — quota snapshots & the Autonomy Multiplier (WF0018,
  ADR-0080/0081).** Fifth slice (§G autonomy intelligence): the
  outcome-based measurement of how much *useful* autonomy the kit buys per unit
  of (mostly unobservable) host quota. Advisory-only, additive, zero-hot-path-dep;
  ≤308 lines/file; `npm run ci` green (57 suites + 0 RED / 349 files). ADRs remain
  Proposed (ratification is #246).
  - **#240 EACP-11** — append-only quota snapshots
    (`economics/quota-snapshots.mjs`): `buildSnapshot` records host · plan ·
    window type/start · reset · remaining/used % · capture method · confidence.
    Most hosts expose no quota API, so capture is manual → confidence `inferred`,
    and a missing percentage degrades to `null` + `unknown` — **never a fabricated
    number** (constitution §8). Persisted as JSONL under the existing state
    substrate (`contextkit/memory/quota-snapshots.jsonl`) via `appendSnapshot`
    (the lone mutator; refuses to persist a `skipped` marker); `readSnapshots` is
    defensive, `quotaSummary`/`latestPerHost` collapse to the latest per host.
    Local-first, metadata-only, no PII.
  - **#241 EACP-12** — Autonomy Multiplier
    (`economics/autonomy-multiplier.mjs`): `(QA-green tasks per quota unit with
    the kit) ÷ (baseline)`. When quota is unobservable, explicit substitutes
    (`api-usd` / `effective-mtok` / `hour` / `host-snapshot`), one primary fixed
    per host. The numerator is **Goodhart-guarded**: `usefulAutonomy` counts a
    task only when acceptance is met + tests run + QA green + no critical bypass +
    no immediate rollback + no material-error reopen + (any human intervention
    logged) — never raw actions/turns/files; `usefulReasons`/`countUseful` keep
    the exclusions transparent. Targets `1.30×` pilot / `1.50×` product / `1.70×`
    potential surface as **targets, never claims** — `claim` is hardcoded `null`
    until the #242 benchmark proves it; confidence is `derived` on quota,
    `inferred` on a substitute, and the whole ratio degrades to `skipped` without
    a baseline (never a false multiplier).
  - Surfaced via Token Report v2 (additive `quota` / `autonomy` keys on
    `token-report --json` + two table lines) — `schemaVersion` stays
    `eacp-token-report/2`; both honestly degrade to `skipped` in the live report
    (transcripts carry no quota or QA-green signal). Test wiring: new
    `selfcheck-eacp-autonomy.mjs` + the EACP selfcheck runners refactored behind a
    single `selfcheck-eacp-all.mjs` aggregator (kept `selfcheck.mjs` under the
    line budget) + Wave-5 assertions in `integration-test-token-economy.mjs`.
  - Coverage: new `tools/selfcheck-eacp-budget.mjs` + `tools/selfcheck-eacp-routing.mjs`
    (43 assertions, wired into `selfcheck.mjs`; MIN_CHECKS 1265→1308) + Wave 4
    budget→resolver-path and quality-gated-ROI assertions in
    `integration-test-token-economy.mjs`.

- **Stack-aware QA scaffolding** — new `scaffold-tests.mjs` command maps
  Node/JavaScript, Python, Go, Rust, and PHP projects into happy/edge/failure
  QA cases and can create starter harness tests with explicit `--write`.
  `/test-plan`, `/scaffold-tests`, and `qa-orchestrator` now start from this
  deterministic stack map before specialist delegation.

- **Active Squad Posture Gates** — Added `squads` metadata to session ledgers to track active postures and squads. Optimized compliance path audit checks by checking specific session files instead of walking all sessions, preventing directory re-read performance bottlenecks and union-leakage security bugs. Added integration tests covering compliance posture gating.

- **Active squad posture activation** - `squad.mjs activate <intent-or-path>`
  now records detected postures in the active session ledger, and the L5 guard
  audits only the target path it is checking. This prevents unrelated modified
  gated files from leaking into a guarded edit decision.

- **Automatic docs refresh** - `docs-refresh.mjs` regenerates the Diataxis
  docs index during pre-commit, and client `--update` refreshes
  `contextkit/README.md` through the manifest-safe update path.

- **Planning packs for four initiatives (no code; session 75)** — four workflow
  spec-packs + umbrella ADRs (Proposed) + roadmap milestones + 39 DevPipeline cards,
  all deferred behind the Capability Enforcement program: MCP Integration Layer
  (wf 0013 / ADR-0073 / P6 / cards 186–197), Cursor as 4th native host
  (wf 0014 / ADR-0074 / P7 / cards 198–206), docs public/internal projection
  restructure (wf 0015 / ADR-0075 / P8 / cards 207–214), and OpenCode as 5th native
  host (wf 0016 / ADR-0076 / P9 / cards 215–224). Three deliberations recorded
  (2026-06-14-01/02/03). `deliberations.active` made explicit in `config.json`.

## [3.1.2] - 2026-06-17

### Updater-safety hotfix (ADR-0099, WF0034)

Bounded hotfix making `node install.mjs --update` incapable of silently
destroying session or user state. A dogfood revealed that an `--update` restarts
the host, fires `SessionStart`, and its 15-minute temporal heuristic deleted
recently-resolved peer ledgers from the board. The larger transactional updater
(full journal, resumable updates, rollback engine, BASE/MINE/THEIRS blob store,
semantic merge, ownership registry, layout-migration registry) is deferred to
**3.2.0** by design — see ADR-0099 for the scope boundary.

#### Fixed
- **P0-01** — `SessionStart` never deletes ledgers: removed the `rm()` reap from
  `session-start.mjs`. Registered/resolved/concurrent ledgers survive host
  restarts (the incident's proximate cause). Drift detection is preserved.
- **P0-05** — `atomicWriteIfChanged`: `.claude/settings.json` is written via
  atomic tmp+rename and only when content changed (no `mtime` churn / watcher
  trips), and is committed late in the update sequence.
- **P0-06** — `.engine-version` is stamped LAST (only on final success), so the
  prior version remains on any earlier failure.
- **P0-07** — honest non-TTY conflict status: unresolved conflicts preserve both
  sides (kit copy stashed under `contextkit/.updates/`) and report
  `UPDATED_WITH_PENDING_MERGES` instead of a clean success.
- Config `installedAt` no longer re-stamps on every `--update` before setup
  completes (config.json is now byte-idempotent across repeated updates).

#### Added
- **P0-02 / P0-03** — update preflight guards: `--update` defers with
  `DEFERRED_ACTIVE_SESSIONS` (active sessions) or `DEFERRED_SELF_UPDATE`
  (updating the kit's own source repo) and makes ZERO writes, unless overridden
  with `--allow-active-sessions` / `--allow-self-update` (both required when both
  risks apply — one consent never implies the other).
- **P0-04** — external critical-state snapshot under
  `~/.contextdevkit/projects/<id>/backups/<update-id>/` (hashed + verified, never
  inside the repo) taken before the first mutation; aborts with `FAILED_SNAPSHOT`
  on a verification failure.
- **P0-09** — the project-map baseline (WF0033) defers generation while sessions
  are active or on a self-update, and never regenerates an existing map.
- Honest update statuses (`UPDATED` / `UPDATED_WITH_PENDING_MERGES` /
  `DEFERRED_*` / `FAILED_*`) and corrected user-facing docs: `--update` "never
  modifies user-authored memory (ADRs, sessions, roadmap, business rules, project
  docs)"; derived artifacts like the project-map may be refreshed when safe.

#### Compatibility
- **P0-08** — VibeKit backward compatibility is unchanged and now regression
  -locked: only-`vibekit/` migrates (user data byte-for-byte), only-`contextkit/`
  no-ops, a hybrid tree is detected + preserved + reported (no destructive
  resolution), legacy config paths migrate by allowlist only, historical prose is
  never globally rewritten, and a second migration run is idempotent.

## [3.1.1] - 2026-06-16

Hotfix release on top of the 3.1.0 feature merges. Closes two defects found in
the public `3.0.0`: a P0 config corruption during `--update`, and the HIGH gap
where automatic routing was a
library but never wired into real prompts. No breaking changes; drop-in upgrade.

### Fixed

- **P0 — `--update` could corrupt `config.json` path lists.** The v3.0.0
  installer's path-migration healer treated the first segment of ANY
  non-resolving path as a legacy platform prefix, accepted an empty suffix
  (`dist/` → `contextkit/`), and adopted the rewrite merely because `contextkit/`
  exists on disk after install. *Symptom:* legitimate lists such as
  `["src/","lib/","node_modules/","dist/","build/","coverage/"]` collapsed into
  duplicate `["contextkit/", …]` entries ("migrated N config path(s) onto
  contextkit/"). *Fix:* migration is now allowlist-gated — it rewrites only a
  KNOWN legacy prefix (`vibekit`, single-sourced from the installer's rename map),
  never an empty suffix, only when the rewritten target resolves on disk, and
  never touches globs, URLs, absolute, Windows or variable paths; order-preserving
  and idempotent. `config.json` is now written atomically (tmp + rename, never
  partial) and only when changed, backing up to `config.json.bak` before any
  legacy-path repair. *Compatibility:* fully backward compatible; a clean v3.0.0
  config is left byte-identical. *Rollback:* revert to 3.0.0 (re-introduces the
  bug); no data migration needed. (`tools/install/config-paths.mjs`, `engine.mjs`,
  `fs.mjs`)
- **P0 — recovery for already-affected installs.** `/context-doctor` now detects
  the collapse signature and a new `contextkit/tools/scripts/config-health.mjs`
  diagnoses + safely recovers: states `healthy / suspected_corruption / repairable
  / manual_repair_required / repaired / skipped`, `--json` output, dry-run by
  default. It NEVER invents values — the collapsed strings are unrecoverable from
  the file, so an ambiguous case is `manual_repair_required`; deterministic
  recovery is offered only from a healthy `config.json.bak` and only after
  re-verifying the restored config is itself clean, preserving the corrupted file
  as `config.json.corrupt` evidence.
- **HIGH — automatic routing now runs on real prompts.** In v3.0.0 the ADR-0094
  routing modules (classifier, decision, telemetry) were reachable only from tests
  and the boot banner: the real `UserPromptSubmit` hook built an Execution Contract
  but never classified the prompt, decided a route, or wrote
  `routing-decisions.jsonl` — so `shadow` observed nothing and `/token-report` had
  no data. *Fix:* a thin orchestrator (`runtime/execution/routing-runtime.mjs`)
  composes the canonical modules and the hook now records a real decision per task
  prompt and surfaces the recommendation on the contract. *Host limitation
  (honest by design, ADR-0094 §Decision):* no host can switch the current session's
  model from a hook, so a decision's `applied` is always `false` with an explicit
  reason (`shadow_mode` / `host_does_not_support_in_session_model_switch` / …);
  `recommendedTier`, `selectedTier` and `actualTier` are distinct, no economy is
  ever claimed while `applied=false`, and the full prompt is fingerprinted, never
  stored. Decisions are idempotent per `(session, prompt-fingerprint, policy)` and
  telemetry failure is fail-open (never blocks the prompt).

## [3.1.0] - 2026-06-16

Feature merges into `main` after 3.0.0, shipped together under this minor. All
additive, advisory and fail-open — no breaking changes.

### Added

- **Capability Enforcement PKG-08 — fleet & agent platform (CDK-080..083,
  ADR-0072, WF0031).** The final capability package: fleet-wide compliance
  reporting (`fleet-compliance.mjs`), an agent registry (`agent-registry.mjs`),
  and the cross-repo platform read consumed by `/state` and `/fleet`. Advisory,
  UNREGISTERED by default.
- **PKG-04 go-live — advisory hooks + `/state` fleet read + installer policy
  distribution (ADR-0097).** Activates the PKG-04 advisory hooks, surfaces a fleet
  read in `/state`, and distributes policy on install/update via
  `tools/install/policy-migrate.mjs` + `policy-distribution.mjs` (additive,
  user-overrides preserved).
- **Economy Runtime — WF0020 Waves 1 & 2 (ECON-01..11).** Output/lifecycle
  actuation and advisory gate signals: output contracts, run-compaction,
  resume packs, lean-loop, loop-breaker, patch-economy and findings-merge under
  `templates/contextkit/tools/scripts/economy/`. Advisory + controller-scoped;
  rides the existing WF0019 guard (no new gate).

## [3.0.0] - 2026-06-16

Version 3.0 is the major consolidation release for ContextDevKit's intelligence
layer. It closes out the full **Capability Enforcement program** (PKG-05..07,
CDK-050..077), ships the **Economic & Autonomy Control Plane** (EACP, WF0018)
measurement plane across eight waves, and introduces **automatic per-session
model routing** (ADR-0094) in `shadow` mode — recommend-and-measure-only, never
blocking. The release also ships installer config-section auto-migration on
`--update` (ADR-0095) so existing projects gain new default config blocks without
losing user overrides.

### Added

- **Capability Enforcement PKG-05 — project-map & adaptive context (CDK-050..056,
  WF0026, ADR-0072).** Seven advisory, additive, zero-dep deliverables: configurable
  project-map `roots`/`excludes` with a two-tier exclude model (CDK-050), read-only
  coverage report (CDK-051), deterministic executable context manifest tool
  (CDK-052, boot-hook injection deferred), playbooks scoped by workflow phase/squad
  (CDK-053), zero-dep BM25 lexical retrieval ranking (CDK-054), rule fossilization
  ledger for deprecated rules (CDK-055), and multi-host selective context-load parity
  check across Claude/Codex/agy (CDK-056). All fail-open, UNREGISTERED.

- **Capability Enforcement PKG-06 — multi-host telemetry, compliance, benchmark &
  drift (CDK-060..068, WF0027, ADR-0072).** Nine advisory consumers: native-skill
  resolver (CDK-060), per-host compliance matrix (CDK-061), host telemetry adapter
  consuming EACP usage-events with zero writes under `economics/` (CDK-062),
  per-host financial cost + gross-cache-value report (CDK-063), capability ROI lens
  joining `attributionSkill` → registry aliases → cost (CDK-066), cache-churn health
  correlating wiring-drift with gross cache value (CDK-067), continuous
  tokens-per-completed-task ledger (CDK-065), and wiring-drift guard (CDK-068). All
  zero-dep, UNREGISTERED, fail-open.

- **Capability Enforcement PKG-07 — lineage graph + seven consumers (CDK-070..077,
  WF0029, ADR-0072).** CDK-070 provides the canonical lineage graph; CDK-071..077
  are seven read-only advisory consumers: public ADR projection (`lineage-public`),
  lineage calibration (`lineage-calibration`), executable business rules
  (`lineage-rules`), governance policy index (`policy-registry`), canonical evidence
  taxonomy (`evidence-taxonomy`), engineering scorecard (`engineering-scorecard`),
  and autonomy-readiness v2 (`autonomy-readiness-v2`). Each composes existing signals
  with no new state and zero writes to any source store. Completes the 42/50
  Capability Enforcement program. All UNREGISTERED, fail-open.

- **EACP Wave 1 — economic measurement core (WF0018, ADR-0078/0081).** Zero-hot-path
  `economics/` module cluster: canonical `UsageEvent` schema with bucket-close
  invariant and `toDelta` normalization preventing cumulative-summing errors
  (EACP-01); privacy/retention foundation with local-first, metadata-only defaults
  and opt-out consent gates (EACP-02); sanitized synthetic fixtures proving the
  normalization pipeline (EACP-03). Advisory/measurement-only.

- **EACP Wave 2 — pricing registry & cost semantics (WF0018, ADR-0079).** Versioned
  offline pricing registry with TTL-aware cache prices and confidence tiers
  (EACP-04); cost engine covering actual cost, no-cache cost, gross cache value
  (labeled "provider feature, NOT kit contribution"), routing savings quality-gated,
  and cost-per-QA-green-task (EACP-05); Token Report v2 with additive `financial`
  block — registry absent degrades to `skipped`, never fabricated (EACP-06).

- **EACP Wave 3 — session pressure & context-health advisories (WF0018, ADR-0077/0081).**
  Session-pressure score + band (`healthy|elevated|hot|critical`) with `splitRecommended`
  and actionable recommendations; absent signals degrade to `skipped`, never false
  `healthy` (EACP-07). Repeated-read and map-effectiveness analysis over metadata
  only, paths redacted (EACP-08). Both surfaced via additive Token Report v2 keys.

- **EACP Wave 4 — budgets/cost-guards & model-routing economics (WF0018, ADR-0045/0052/0077).**
  Budget engine evaluating 13 scopes into a `observe→warn→ask→downgrade→split→block`
  mode ladder; its only enforcement coupling is the existing `budgetExhausted` boolean
  the autonomy resolver already consumes (EACP-09). Model-routing economics with
  quality-gated `routingROI` — null + `unknown` confidence when QA signals are absent,
  never a fabricated number — and `fableAudit` documenting the manual-only Fable-5
  premium path (EACP-10). Surfaced via additive Token Report v2 keys.

- **EACP Wave 5 — quota snapshots & the Autonomy Multiplier (WF0018, ADR-0080/0081).**
  Append-only quota snapshots with confidence tiers; most hosts expose no quota API so
  capture is `inferred`, missing percentage degrades to `null` + `unknown` — never
  fabricated (EACP-11). Autonomy Multiplier: `(QA-green tasks per quota unit with
  kit) ÷ (baseline)`, Goodhart-guarded against raw action counts; targets 1.30×/1.50×/
  1.70× are stated as targets only, `claim` is hardcoded `null` until the benchmark
  proves it (EACP-12).

- **EACP Wave 6 — benchmark pilot harness (WF0018, ADR-0080, card #242).** A/B/C
  benchmark harness scaffold (`benchmark-design.mjs`, `benchmark-run.mjs`,
  `benchmark-report.mjs`) with deterministic mock provider, append-only JSONL, and
  independent-QA scoring with evaluator-≠-operator gate. Honesty-gated: the #176/
  CDK-003 baseline is unbuilt, so every real-measurement path returns `skipped`/
  `unknown` and `claim` is always `null` (ADR-0080 evidence tier). Mock runs are
  labeled and excluded from claims.

- **EACP Wave 7 — benchmark baseline harness + ADR-0080/0081 ratification (WF0018).**
  Baseline scaffold extending Wave 6; baseline data pending a real run — claim remains
  null.

- **EACP Wave 8 — routing economics wiring (WF0018).** Final EACP wave wiring
  routing economics into the measurement spine; all ADRs ratified.

- **Automatic model routing for standard sessions (ADR-0094).** Persistent,
  default-on routing posture — Haiku operates, Sonnet executes, Opus decides — active
  in every session (not just `/swarm`), with no re-prompting. New
  `tools/scripts/routing/` module cluster: deterministic `task-classifier.mjs`
  (complexity × risk → executor tier), `routing-decision.mjs` (runner-first
  over-orchestration guard + cost estimate), `routing-config.mjs` (session > project
  > default precedence), `routing-telemetry.mjs` (append-only decision ledger,
  kit-routing economics only — never the provider's cache savings). New `routing:`
  config block defaults to **`shadow`** mode (recommend + measure only;
  `canary`/`active` are deliberate, telemetry-gated promotions). `/token-report`
  gains an additive `routingTelemetry` surface. Fable-5 is never auto-selected.

- **Installer config-section auto-migration on `--update` (ADR-0095).** `npx
  contextdevkit --update` now additively merges new default config sections (e.g. the
  `routing:` block) into an existing project's saved `config.json`, preserving every
  user override; idempotent across runs. A version-aware "Updated vX → vY" notice is
  shown on each successful migration.

### Changed

- **Test suite coverage expanded.** New `selfcheck-routing.mjs` (42 checks, floor
  raised to 1480+) and `integration-test-routing.mjs` (20 acceptance scenarios);
  seven EACP selfcheck runners aggregated behind `selfcheck-eacp-all.mjs` to keep
  `selfcheck.mjs` under the line budget. `npm run ci` green at 63 suites + tech-debt
  0 RED / 375 files.

## [2.8.0] - 2026-06-15

The **Capability Enforcement program** (PKG-01..04, ADR-0072) lands as an
advisory, fail-open, *dormant* substrate, and the kit's own test harness is
re-architected for fast, agent-friendly execution (**WF0024**, ADR-0093). 39
commits since 2.7.0. Every enforcement unit is inert below L5, never blocks in
advisory mode, is fail-open, and ships UNREGISTERED — activation is a deliberate
separate step.

### Added

#### Capability Enforcement — substrate & gates (ADR-0072, advisory & dormant)
- **CDK-020** — canonical capability registry + pure deterministic resolver.
- **CDK-021** — task intake + deterministic execution contract (requiredBefore exploration / write / completion); hermetic intake tests.
- **CDK-022** — tamper-resistant, fingerprinted, metadata-only receipt store.
- **CDK-023** — advisory / guarded / strict enforcement modes + audited bypass (incl. the Grade-4 human floor); ships `advisory` by default.
- **CDK-030** — Mandatory Execution Protocol atop the boot context of all 3 hosts (CLAUDE / Codex `AGENTS` / Antigravity `INSTRUCTIONS`).
- **CDK-031** — `UserPromptSubmit` hook classifies each request and records its execution contract.
- **CDK-032 / 033** — unified `PreToolUse` gate (pure `evaluateAction()`) warns on workflow-before-write + exploration-budget gaps; advisory wrapper.
- **CDK-034 / 035** — indirect-write reconciliation (Bash / formatter / MCP) + persisted broad-search (explore-budget) counter.
- **CDK-040** — completion-evidence `Stop` gate (`completion-gate.mjs` + pure `evaluateCompletion()`): warns when receipts for `requiredBeforeCompletion` are missing; trusts receipts only (anti-theatre — prose never satisfies it); ledger round-trips `activeTask` / `taskCounter` / `completionWarnedAt`.
- **CDK-041** — subagent governance (`subagent-gate.mjs`: `Task` PreToolUse + `SubagentStop` records the declared touch-set, warns on out-of-scope / forbidden writes). v1 limit: spawn counter is last-spawn-wins per task.
- **CDK-042** — compaction continuity (`PreCompact` persists a metadata-only record; `SessionStart` re-surfaces still-outstanding contract obligations).
- **CDK-043** — read-only compliance status-line segment (satisfied / missing completion evidence for the active task).

#### Test execution architecture (WF0024 / ADR-0093) — the kit's own dev harness
- **TEA-001 / 002** — single `tools/test-suites.mjs` registry + `tools/run-suites.mjs`; layered `test:smoke | unit | selfcheck | integration:{core,installer,hosts,workflow,enforcement,ecosystem} | full`. `npm test` behavior **preserved** (full, serial, fail-fast).
- **TEA-003** — compact agent-friendly reporter (one line per suite; failures first; full logs to gitignored `runs/`) + `selfcheck` quiet-on-pass (a count line vs 660+ lines; `--verbose` restores; failures always full).
- **TEA-004** — conservative `test:impact` selector: changed-files × `touches[]` map; false-negative-averse (unmapped path / missing Project Map / config-core / test-infra ⇒ full); explains every include/exclude. Hermetic self-test via an injectable Project-Map signal.
- **TEA-005** — `ci:fast` (PR, single Node, docs/planning path-filtered) / `ci:full` (Node 18/20/22, mandatory before publish, never selector-gated) split; `npm run ci` = `ci:full`.
- **TEA-006** — per-run duration-history telemetry (p50/p95, selection reasons, OBSERVED/DERIVED-tagged), append-only + gitignored; feeds the P10/P11 reports.
- **TEA-007** — README test-scripts table, CONTRIBUTING test-workflow section, `instrucoes.md` pt-BR summary, and the CI `test-fast` / `test` job split.

#### Install & config hardening (PKG-01)
- **CDK-013** — per-section strict config validation that preserves unknown fields.
- **CDK-014** — explicit local-only vs tracked install modes (onboarding guidance, installer banner, `context-doctor` install-mode inspection).

### Fixed
- **CDK-010** — Agent Forge optional-`yaml` test stages the dependency into its fixture so both the yaml-present and yaml-absent branches are exercised.
- **CDK-011** — removed the `git.mjs` ↔ `exclude.mjs` ESM import cycle via a shared `git-paths.mjs`; moved the gitdir-retarget invariant there and wired the install-cycle test into CI.

### Changed
- **CDK-012** — disambiguated the product changelog from the installed-project changelog, guarded by a selfcheck.

## [2.7.0] - 2026-06-13

Governance the engine enforces — three systems that move enforcement from prompt
to code: the **ContextKit parity import** (8 features), the **auto-invoked
deliberation council**, and the **workflow journey gate** (ADR-0060 → ADR-0071).
README restructured around the new arc; four new Diátaxis explanation docs added
under `docs/explanation/`.

### Added — ContextKit parity import (8 features, ADR-0060 → ADR-0068)
- **Auto-format hook (F1, ADR-0061).** A PostToolUse `auto-format.mjs` runs the
  project's formatter/linter right after each Edit/Write at level ≥ 4 (advisory —
  it auto-fixes when a toolchain is present and always exits 0; "skipped" when
  none is found). Wired across all three hosts (Claude/Antigravity/Codex).
- **Multi-language pre-push quality gates (F2, ADR-0062).** `quality-gates.mjs`
  detects the stack (10 languages + generic) and runs lint/format/typecheck/
  build/test, scoped to the monorepo packages a push touches. Warn-first: silent
  below `minLevel`, warn in `minLevel..strictLevel`, blocks at `strictLevel`; a
  missing tool is skipped, never a false failure. Runs from `pre-push` after the
  conflict pre-check. Bypass: `CONTEXT_SKIP_QGATES=1`.
- **Hook-manager coexistence (F3, ADR-0063).** Install detects an existing hook
  manager (husky / simple-git-hooks / custom `core.hooksPath`) and suggests a
  non-destructive integration path instead of silently running side-by-side.
- **CI Squad action (F5, ADR-0064).** An opt-in GitHub Action turns a
  `squad-ready`-labelled issue into a DRAFT PR via the headless pipeline. Ships
  out of the default tree — installed only with `--ci-squad` (or the interactive
  prompt); needs the `ANTHROPIC_API_KEY` repo secret.
- **Standards promotion threshold (F7, ADR-0065).** `/distill-sessions` only
  proposes a new CLAUDE.md rule once a pattern has ≥3 evidenced occurrences;
  `/retro` deprecates superseded rules by strikethrough rather than deletion.
- **`/context-budget` skill + `@`-imports (F6, ADR-0066).** Read-only guidance on
  which context to load per task type (always / on-demand / skip); lightweight
  `@`-imports in `CLAUDE.md.tpl` keep the constitution lean.
- **Marker-based idempotent injection (F4, ADR-0067).** `marker-inject.mjs` owns a
  region between `<!-- ContextDevKit:start/end -->`, preserving the user's content
  around it and staying byte-idempotent across re-installs (the F8 enabler).
- **Multi-platform context bridges (F8, ADR-0068).** Opt-in (`bridges.enabled`)
  context bridges for six more tools — Cursor, GitHub Copilot, Gemini, Windsurf,
  Aider, Continue — written idempotently via marker-inject. These receive the
  CONTEXT layer ONLY; governance enforcement stays on the three native hosts.

### Added - workflow journey gate + numbering + branch-scoped guard (ADR-0071)
- **The `/workflow` journey is now enforced in the engine.** `advance` refuses to
  leave a phase whose deliverables are missing (empty PRD/SPEC, no ADR link, no
  card, no report) and lists the gaps; `--force` is the explicit override, and a
  new `workflow check <id>` reports readiness. Because it lives in the engine
  (`workflow-gate.mjs`), every CLI — Claude, Codex, Gemini — is held to the same bar.
- **Workflows are numbered like ADRs (`NNNN-slug`).** `createWorkflow` stamps the
  next number; `packDir` resolves a workflow by slug OR number; `renumberByStarted`
  migrates existing workflows by start date (oldest = 0001), idempotently, and
  `install.mjs` runs it on fresh + `--update` so installed projects renumber on update.
- **The L5 mutation guard is branch-scoped.** A pre-ship workflow now blocks edits
  only on its own branch (recorded at creation), so a parallel session/worktree no
  longer blocks unrelated work. Covered by `integration-test-workflow-governance.mjs`.

### Added - auto-invoked deliberation gates + tiered specialist council (ADR-0070)
- **Deliberation is now auto-invoked, not manual-only.** Two new autonomy areas
  (`feature-deliberation`, `decision-deliberation`) resolve to `debate` mode at
  grade ≥ 3, so starting a new feature (`/workflow` spec phase) or recording an
  architectural decision (`/new-adr`) auto-convenes a council. The ADR write itself
  stays `manual` at every grade — the deliberation precedes it, never authorizes it.
- **Dynamic specialist council.** New `deliberation-council.mjs` deterministically
  selects a relevant, named specialist roster (architect/security/ux-designer/…) by
  classifying the question into advisor lanes, scaling the count to
  `clamp(matchedLanes, council.min, council.max)` instead of a fixed 3 generic voices.
- **Tiered research swarm.** `/debate` now gathers evidence with cheap `fast`-tier
  (Haiku) scouts before the `reasoning`-tier (Opus) voices argue, with `powerful`-tier
  (Sonnet) verification for hard claims; voices and the synthesizer are never
  downgraded (ADR-0052). Models resolve through `model-policy.mjs`.
- **Broadened nudge + new config.** The `deliberation-nudge` hook also fires on a new
  ADR write; the `deliberations` config gains `council`, `autoInvoke`, and `research`
  blocks. Covered by `integration-test-deliberation.mjs` (20 checks) + selfcheck gates.

## [2.6.3] - 2026-06-13

### Fixed
- **Active squad posture gate:** Persist active squads in the session ledger,
  expose `/squad activate`, and scope `squad-audit` to the target path passed by
  `guard.mjs` so unrelated modified high-risk files no longer leak into the
  current edit decision.
- **Session-start robustness:** Split squad-context boot rendering into a small
  helper so the hook stays under the project file-size budget while preserving
  fail-silent behavior.

## [2.6.2] - 2026-06-13

### Fixed
- **Hooks:** Fixed a ReferenceError in the `session-start.mjs` hook where `resolve` was used without being imported from `node:path`.

## [2.6.1] - 2026-06-13

### Added - active agent squads integration
- **Active Agent Squads orchestration layer.** Introduced deterministic routing (`squads-registry.json` + `/squad route`), stack-aware playbook templates for all 8 squads under `workflows/playbooks/squads/`, and compliance/security auditing via `squad-audit.mjs` and `squad-director.mjs`.
- **Pre-commit L5 Gating.** Hooked the compliance auditor directly into the pre-commit `guard.mjs` gate to block unauthorized edits to L5 high-risk paths without posture activation.

### Changed
- **Docs refresh is now automatic for dogfood and client updates.** The Level 3
  pre-commit hook runs `docs-refresh.mjs` to regenerate `docs/README.md`, and
  `--update` now refreshes `contextkit/README.md` through the conflict-safe
  manifest path while preserving personalized client edits.

## [2.6.0] - 2026-06-13

### Added - stack-aware QA scaffolding
- **`scaffold-tests.mjs`** — a zero-dependency QA planner/scaffolder for
  Node/JavaScript, Python, Go, Rust, and PHP projects. `plan` reports detected
  stacks, runner/framework signals, and happy/edge/failure QA cases; `scaffold`
  is dry-run by default and creates only missing starter harness tests with
  explicit `--write`.
- **QA squad routing now starts from real stack context.** `/test-plan`,
  `/scaffold-tests`, and `qa-orchestrator` run the deterministic stack map before
  delegating to qa-unit, qa-integration, qa-fuzzer, qa-e2e, or qa-perf.
- **Coverage for the new QA tooling.** `integration-test-tooling-qa.mjs` installs
  a fixture with Node, Python, Go, Rust, and PHP manifests, verifies detection,
  proves dry-run-by-default behavior, and checks explicit scaffold writes.

### Changed
- README, architecture, levels, roadmap, and pt-BR usage docs now document the
  stack-aware QA flow and the v2.6 release posture.

## [2.5.0] - 2026-06-12

### Changed - default autonomy grade 3 + grade-4 informed consent (ADR-0058)
- **Default autonomy grade is now 3 (was 2).** Every fresh install lets the AI
  edit, test and move pipeline cards without asking out of the box; ADRs,
  pushes, secrets and high-risk paths still come to you (the floor is unchanged).
  Single-sourced in `defaults.mjs`, `schema.mjs` and the `resolveAutonomy`
  absent-grade fallback; onboarding now pre-selects grade 3.
- **Grade-4 eligibility bar drops the `rollback < 10%` criterion.** A `qa` bounce
  is the QA gate working, not an autonomy failure — counting it penalised honest
  QA use. The bar keeps five objective criteria (≥30 transitions · ≥20 sessions ·
  zero wiring-drift · self-coverage green · attribution present).
- **Grade-4 activation is now explicit informed consent.** `/autonomy 4` shows a
  disclaimer spelling out exactly what grade 4 grants and what stays human, then
  the human signs (`--confirm` is the [y] signature; omitting it is [n]/cancel).
- **No change to swarm or routing.** ADR-0052 model routing is grade-blind;
  ADR-0051 swarm already runs at grade 3 with one human OK per run (kept).

## [2.4.1] - 2026-06-12

### Fixed - workflow report defensiveness (ADR-0057 remediation)
- **No more false-pass on missing git.** `workflow report` now probes
  `git rev-parse --is-inside-work-tree` and writes an explicit
  `SKIPPED: git unavailable / not a repository` Diff summary instead of the old
  "No working tree diff." (which read a missing-git failure as a clean pass —
  violating ADR-0057 decision #7 and the "validators throw, not warn" rule).
- **Report concern split out.** Git + report logic moved from `workflow-pack.mjs`
  (was at the 280-line ceiling) into a new `workflow-report.mjs`; `workflow.mjs`
  stays the thin CLI wrapper. Both files now well under budget.
- **Defensive guards.** `git` spawns carry a timeout; a same-day report refuses
  to overwrite a filled `## Verification` without `--force`; a malformed
  `index.md`/breadcrumb is an explicit refusal naming the path (and a
  `skipped (malformed)` line in `status`/`list`), never silently treated as
  absent; frontmatter parsing tolerates CRLF.

### Fixed - Codex converter fidelity (ADR-0056 remediation)
- **Skill descriptions are adapted.** The Claude→Codex converter now runs skill
  `description` through `adaptContent` (was emitting raw "scoped CLAUDE.md" /
  "Claude Code token usage" text into Codex skills).
- **Correct skill path rewrite.** `.claude/commands/<x>.md` now rewrites to
  `.agents/skills/source-command-<x>/SKILL.md` (the real install layout) instead
  of a dead flat `.agents/skills/<x>.md` reference.
- **CRLF + host skip-list.** `stripFrontmatter` tolerates CRLF; a narrow,
  documented skip-list (`claude-md`, `token-report`, `fable`) keeps host-
  inappropriate skills out of the Codex surface (74 emitted, 3 skipped).
- **Property-based selfcheck.** `selfcheck-codex.mjs` now asserts output
  PROPERTIES (no Claude-only string in any description, no dead skill paths,
  skip-list honored, adversarial CRLF/quote/backslash/no-frontmatter inputs) —
  not generator-echo parity, which could never catch a conversion bug.

### Fixed - swarm planner reads explicit touch-sets (ADR-0051)
- **`listTasks` surfaces `paths:`.** The swarm planner reads `task.paths` to honor
  an explicit `paths:` frontmatter touch-set, but `listTasks` dropped the field —
  leaving that branch dead via the CLI. Added the passthrough so a card can pin
  its own disjoint touch-set for `/swarm`.

### Changed
- **Test split (RED-zone fix).** `integration-test-tooling-pipeline.mjs` (328
  lines, over the 308 hard block) split by responsibility — the ADR-0015
  execution-substrate suite moves to a new `integration-test-pipeline-substrate.mjs`
  sibling; both files are back under budget and `npm run ci` is green again.

## [2.4.0] - 2026-06-12

### Added - cost-tiered model routing Phase 2 (ADR-0052)
- **Deterministic model resolver.** `contextkit/tools/scripts/model-policy.mjs`
  turns the ADR-0052 tier table into an executable decision: `resolve --agent`
  (the `/ship` path) and `tier` (the `/swarm` path, which plans by `tierHint`).
  Order is contractual — task-class (`execute` → cheap) → QA escalation
  (`--qa-failures 2`, one tier up, capped at reasoning) → budget de-escalation
  (`--budget-exhausted`, one tier down) → **floor last** (security / code-security
  / infra-security / privacy-lgpd never below `powerful`). Price enrichment reuses
  the agent-forge matrix via an optional dynamic import, degrading to "no price"
  when the matrix is absent (L<4 / non-Claude host) rather than failing.
- **Policy materialized + drift-locked.** `contextkit/policy/routing-policy.json`
  mirrors the ADR table; `tools/selfcheck-model-policy.mjs` asserts it agrees,
  agent-by-agent, with the host-enforced `model:` frontmatter across all 34
  agents — a tier can no longer drift between the ADR, the policy and the agent
  files without a red gate.
- **Per-model attribution (`byModel`).** `token-report`/`token-attribution` now
  split spend by `message.model` ("Spend by model"), and the swarm manifest
  records the resolved alias per workstream with a `models:` breakdown in the run
  report — a fan-out's true tier mix is auditable, not assumed.
- **Resolve, don't eyeball.** `/ship` and `/swarm` now call `model-policy.mjs`
  before each dispatch and pass the returned alias to the Agent tool; omitting
  `model` silently inherits the premium session model — the costly default.

## [2.3.0] - 2026-06-12

### Added - workflow spec packs and completion reports (ADR-0057)
- **Workflow spec packs.** `/workflow` now creates
  `contextkit/memory/workflows/<slug>/` with `index.md`, `prd.md`, `spec.md`,
  ADR/task indexes, durable workflow memory, and dated reports. Legacy
  `memory/workflows/<slug>.md` breadcrumbs remain readable for status and
  advance.
- **Workflow reports + DevPipeline links.** `workflow.mjs report <slug>
  [--task <id>]` records branch, commit, `git diff --stat`, `--numstat`, touched
  files including untracked files, verification, and notes without duplicating
  full patches. Pipeline cards can now carry `workflow`, `spec`, `implemented`,
  and `concluded` metadata; moving to `testing` stamps `implemented`, while QA
  sign-off remains the governed path into `conclusion`.
- **Docs and coverage.** `/workflow`, `/pipeline`, `/dev-start`, `/log-session`,
  README/instrucoes, installer seeds, selfchecks, and integration tests were
  updated for the lifecycle `intake -> prd -> spec -> adr -> roadmap(if feature)
  -> pipeline -> ship -> testing -> conclusion`.

### Added - Codex native host parity
- **Codex joins Claude Code and Antigravity as a native host.** The installer now
  writes `AGENTS.md`, `.codex/hooks.json`, `.codex/agents/*.toml`, generated
  `source-command-*` skills under `.agents/skills/`, and a `cdx.mjs` runner
  mirroring `ctx.mjs`. Dogfood excludes now cover `.codex/`, `AGENTS.md`, and
  `cdx.mjs`, while doctor/context-level/selfcheck/integration tests guard the
  new host surface.
- **Codex now carries the full session discipline, not just generated assets.**
  Codex hooks identify themselves with `--host codex`, SessionStart pins a stable
  Codex ledger when no `session_id` is available, `AGENTS.md` includes the same
  workflow/constitution as the other hosts, and the docs state that Codex,
  Claude Code, and Antigravity cooperate over shared claims, ADRs, pipeline
  cards, sessions, and changelog.

### Added — `/fable`, the manual premium tier (ADR-0052 Phase 2)
- **`/fable <task>`** runs ONE task on **Claude Fable 5** — the premium model the
  automatic tier ladder never reaches (ADR-0052 caps auto-escalation at `opus`;
  Fable is the manual hatch *above* the ceiling). **Manual-only by construction:**
  no agent may declare `model: fable` (the selfcheck `VALID_MODEL_ALIASES` forbids
  it), and nothing auto-routes there — Fable runs only on an explicit `/fable`.
  It dispatches to a **subagent** with `model: fable` (premium runs in the
  subagent, never the main loop — the cache-safe ADR-0052 invariant), echoes the
  cost once, scopes to the one task, then returns to the normal tiers; the autonomy
  floor (ADR-0042) is unchanged (more capability, not more consent). Antigravity
  skill mirror generated; covered by selfcheck (command present + the manual-only /
  subagent-dispatch / cache-safe contract).

## [2.2.0] - 2026-06-12

### Added — deterministic QA sign-off + the grade-4 coverage gap closed (ADR-0055)
- **`pipeline.mjs qa-approve <id> --evidence "…"`** — the QA half of ADR-0043's
  sign-off doctrine finally has a verb: the ONLY testing→conclusion path besides
  the human `move`. Refuses without evidence, outside `testing`, or when the
  card's acceptance criteria aren't ≥1 checked / 0 unchecked; records the
  evidence on the card (`## QA Sign-off`) and in the event log (actor `qa`,
  `endedAt` stamped). `auto` stays fenced from `conclusion` at every grade.
- **`/pipetest [ids|--all]`** — run the project suite; green ⇒ `qa-approve`
  every complete testing card with the run summary as evidence; red ⇒ report,
  bouncing (`qa-reject`) only attributable failures — a global red never
  mass-bounces the lane. Swarm runs never call it; it's the human's closing
  move after `/swarm review`.
- **`integration-test-hooks.mjs`** — rule 2 as a test: every module under
  `runtime/hooks/` is executed twice (benign payload + garbage stdin) and must
  exit 0 in a bare project. Closes the grade-4 self-coverage gap (the bar's
  harness now sees every hook entrypoint exercised at its template path).

### Added — swarm coordinator v1 implemented (ADR-0051 accepted, task 123)
- **ADR-0051 flipped Proposed → Accepted** and shipped end-to-end: `/swarm`
  skill (plan·run·review·clean) + pure `swarm-plan.mjs` planner (WSJF rank;
  touch-set derivation card-`paths:` → simulate receipt → title inference;
  refusals for no-touch-set / secret floor / un-receipted l5 paths; greedy
  disjoint partition; hard cap 5 above config) + `swarm-state.mjs` manifest
  (`.claude/.swarm/<runId>.json`, atomic writes, append-only per-workstream
  history, stale eviction preserving worktrees, budget-park path) +
  `worktree-new.mjs --swarm <runId> <taskId>` mode (branch
  `swarm/<runId>/<taskId>`).
- **`swarm-dispatch` consent area** in `resolveAutonomy`
  (`[manual,manual,suggest,auto]`, budget-downgrade aware) and the optional
  `by: {runId, workstream, agent}` attribution field on state.json events
  (unknown keys dropped; plain events untouched). `swarm.*` config block
  (maxWorkstreams/maxWavesPerRun/tokenBudgetPerRun/staleMinutes),
  zod-modeled.
- **P0 validation run executed first** (the ADR's precondition): tasks 141+143
  fixed in parallel worktrees on sonnet/haiku tiers (ADR-0052), 52–61K subagent
  tokens each, 0/2 cross-workstream conflicts; branches parked at testing for
  human merge. Its load-bearing finding — rule 3 makes every workstream spill
  into shared TEST shards — is encoded in the planner as `TEST_HOME_RULES`
  touch-set expansion (test-asserted).
- **23-check `integration-test-swarm.mjs`** added to the npm test chain;
  selfcheck inventories the new scripts + skill; agy mirrors regenerated
  (the skill is documented; agy still runs its session model — the ADR-0052
  host gap stands).

### Added — dogfood-by-default install + conflict-safe 3-way update (ADR-0054, PR #77)
- **Dogfood by default.** The installer writes a managed BEGIN/END block to
  `<common-git-dir>/info/exclude` covering every generated artifact
  (`contextkit/`, `.claude/`, `CLAUDE.md`, `docs/CHANGELOG.md`, the Antigravity
  host, scaffolded `.github` files): fresh installs leave ZERO tracked kit files
  and `--update` stops flooding the target project's history. `info/exclude`
  only affects untracked paths, so it is unconditionally safe for projects that
  already commit the kit (they get opt-in `git rm -r --cached` guidance; the
  index is never touched — rule 8). Opt out with `--tracked`.
- **Conflict-safe update.** `contextkit/.install-manifest.json` (sha256 baseline
  of every kit-written file) drives a 3-way merge on `--update`: personalized
  files are kept silently when the kit didn't move; a real divergence prompts on
  a TTY ([b]oth/[r]eplace/[k]eep) and defaults to "both" headless, stashing the
  kit version under `contextkit/.updates/` — no side is ever lost. Manifest-less
  legacy installs refuse to clobber; user-created agents/commands are untouched.
- New sibling suite `tools/integration-test-update-safety.mjs` (21 checks) wired
  into `npm test`.

### Added — encoding + config-rot prevention guards (cards 144–145, PR #78)
- **Tree-wide mojibake gate** — `tools/selfcheck-encoding.mjs` scans
  `templates/`, `docs/`, `tools/` and the root docs for UTF-8-read-as-cp1252
  fingerprints (the PowerShell 5.1 `Get/Set-Content` corruption class); patterns
  are ASCII-escaped so the gate can never flag itself.
- **Doctor config path-rot probe** — `ledger.registration`, `l5.highRiskPaths`
  and `qa.criticalPaths` entries that no longer exist on disk are flagged
  (registration rot is CRITICAL — the drift nudge goes blind; gate/QA ghosts are
  advisory).

## [2.1.0] - 2026-06-11

### Added — swarm coordinator contracts locked (ADR-0051, Proposed)
- **ADR-0051** hardens the swarm feasibility study into contracts: `/swarm`
  skill + pure `swarm-plan.mjs` planner + `swarm-state.mjs` manifest,
  `swarm-dispatch` consent area (`['manual','manual','suggest','auto']`),
  optional `by: {runId, workstream, agent}` on state.json events,
  worktree-per-workstream isolation with workstream seniority, and the
  defining safety property: **a swarm run finishes at `testing`, never `done`**
  — `/swarm review` batches the human approvals. v1 is grade-3; grade-4 needs
  the ADR-0045 bar **plus ≥3 clean grade-3 runs**. Implementation = task 123
  (P0 zero-code validation run first).

### Added — cost-tiered model routing, Phase 1 (ADR-0052)
- **Every kit agent now declares a `model:` cost tier** in its Claude frontmatter
  (`haiku|sonnet|opus|inherit` — aliases only, never versioned IDs): expensive
  models think (architect, security squad, code-reviewer, agent-architect on
  `opus`), cheap models execute (qa-unit, qa-integration, packager,
  context-keeper on `haiku`), dispatchers inherit the session model. Claude Code
  enforces it natively on every Task dispatch; cache-safe by construction (the
  main loop never switches models — only spawned subagents are tiered).
- **Dispatch-time tier classification** in `/ship`, `/advise`, `/debate` and
  `/scaffold-tests`: think vs execute rules, floors (security work never below
  `sonnet`), one-step QA-failure escalation, budget-exhausted de-escalation
  (ADR-0044 §3 semantics: downgrade, never block).
- **Selfcheck guard**: every agent template must carry a valid model alias —
  a missing line or a versioned ID fails the build (rule 3).
- **Feasibility studies**: `docs/explanation/model-tier-routing-study.md`
  (3-layer architecture, savings arithmetic, host-gap statement, Phase 2/3
  deferrals) and `docs/explanation/swarm-feasibility-study.md` (swarm
  coordinator on the completed autonomy substrate, ADR-0051 reserved).

### Changed
- **Per-task `state.json` moved under `pipeline/state/` (ADR-0053).** The runtime
  substrate (ADR-0015 §C / ADR-0043) no longer scatters numbered dirs across the
  pipeline root beside the board stages — it lives in its own
  `contextkit/pipeline/state/<id>/state.json`, and the installer now **gitignores**
  `contextkit/pipeline/state/` (it is churning in-flight state, not the shared
  board). `listStates` reads only the substrate (skipping the stage dirs), fixing
  both the clutter and the commit/merge-conflict risk. Fully backward-compatible:
  `readState` falls back to the legacy flat path and `migrateStateLayout` (run on
  every `pipeline.mjs sync`) self-heals existing projects on the next command —
  idempotent, never clobbers. Covered by selfcheck + integration (start writes
  under `state/`; a legacy dir migrates on sync).
- **capability-matrix refreshed to 2026-06 reality (authorized by ADR-0052 per
  ADR-0012 §6):** `claude-opus-4-7` ($15/$75, stale) → `claude-opus-4-8`
  ($5/$25, 1M ctx); Haiku 4.5 corrected to $1/$5; Sonnet 4.6 context 1M;
  **Claude Fable 5 added** (premium, $10/$50, 1M ctx, thinking-always-on note);
  decision-rules + manifest seed follow the ID rename. Matrix v0.2.0,
  `updated: 2026-06-11`.
- **Antigravity parity doc** records the honest host gap: tier routing is Claude
  Code only — agy exposes no per-agent/per-dispatch model API; the kit refuses
  to fake a Gemini mapping it cannot enforce (rule 8).

## [2.0.0] - 2026-06-11

### Added — F4 grade-4 control plane (ADR-0045, task 116 — completes the autonomy package F0–F4)
- **Deterministic eligibility bar.** `/autonomy 4` now consults
  `autonomy-eligibility.mjs` and **refuses naming the failing criterion** unless
  ALL hold: ≥ 30 recorded transitions (genuine `from ≠ to` events) · ≥ 20 sessions ·
  rollback rate < 10% (`qa`/`evict` events) · zero wiring-drift incidents · a fresh
  self-coverage marker · attribution (D3) present. Unmeasurable ⇒ refuse, never pass
  (rule 8): no events ⇒ rollback rate 1.0, no marker ⇒ coverage/attribution fail.
- **Gated, session-default setter.** Grade 4 is `experimental`: with no flags it is
  **session-scoped** (auto-expiring), and persisting requires `--persist --confirm`
  after the consequence text is shown. No path persists grade 4 silently; the
  grade-change floor (always human) is untouched.
- **Self-coverage readiness harness.** New `autonomy-readiness.mjs` runs `npm test`
  under `NODE_V8_COVERAGE` (every `runtime/hooks/**` + `runtime/config/**` module must
  be exercised) and `token-report` for attribution, stamping the marker the bar reads.
  It never flips a criterion true on its own failure.
- **Hardened quorum + kill-switch (`/ship`).** At grade 4 a ◆ checkpoint cleared by
  `/debate` requires: blind voices · **≥ 1 deterministic voice = the exit codes of
  `npm test` + selfcheck + `/deps-audit`** (not an LLM summary) · a security **Critical
  is a veto, not a vote** · `unresolved` → human · the deliberation id stamped into the
  `state.json` event. The resolver is re-consulted at the **start of every step** so any
  user message or `/autonomy 1` yields/cancels at the next boundary; push stays
  branch-only (merge to default is always human).
- **Security-review hardenings (pre-merge).** A `security` pass flagged the bar's
  evidence as agent-writable; fixed: `memory/autonomy/**` is now a **floored path**
  (editing the eligibility evidence is gate-self-edit class, so an agent cannot forge
  its own bar), the readiness marker must be **fresh (≤ 14 days)** to count, the
  resolver's grade-4 contradiction guard **fails closed** (`deliberations.active !==
  true` ⇒ throw, absent is not assumed-on), and only genuine stage transitions count.
- Covered by selfcheck (eligibility thresholds, refuse-by-default, the floored
  evidence cell, fail-closed, freshness) + integration (`autonomy 4` refuses on an
  unmet bar, passes session-scoped when seeded, `--persist` needs `--confirm`).

### Added — deferred-items consolidation, bucket A (ADR-0047, tasks 128–132)
- **PR line in `/git status`** (task 128). `git.mjs` surfaces the branch's open
  PR in one line, reusing `sync-check.mjs`'s PR facts (now exported behind an
  entrypoint guard — importing is side-effect-free). An unusable `gh` or a
  non-GitHub provider reports **skipped, never a false "none"** (rule 8).
- **`/advise --after --since <ref>`** (task 129). Pins the changed-surface scan
  to `git diff --name-only <ref>...HEAD` so long-lived branches stop
  over-reading; an unknown ref is a hard stop, never a silent full-branch
  fallback.
- **`pipeline.mjs board --digest`** (task 130). Token-light lane summary
  (active lanes in full, backlog capped at 8, titles clipped) on ADR-0027's
  deterministic-extraction posture; `/pipeline show` and `/plan-week` now
  reason from the digest instead of reading N task files.
- **Opt-in scheduled alert-sync** (task 131). The scaffolded `security.yml`
  ships a commented `schedule:` cron trigger + an `alert-sync` job (gated on
  `event_name == 'schedule'`, advisory) running the existing `gh-alerts.mjs` —
  inert until the project opts in; runs in the project's CI, never the kit hot
  path (rule 1).
- **Registry-backed staleness in `/deps-audit`** (task 132). `--registry` (the
  audit's only network call, opt-in by flag) flags a deprecated `latest` and
  packages with 2+ years without a publish via abbreviated npm-registry
  metadata; an unreachable registry is a `registry-skipped` finding — a skip,
  never a pass (rule 8). Env-overridable URL keeps the test suite offline.

### Fixed — pre-release audit, low-severity sweep (tasks 133–138, zeroed before the 2.0)
- **`matchSecret` widened to common credentials (133).** SSH private keys
  (`id_rsa`/`id_ed25519`/`id_dsa`/`id_ecdsa`), `.git-credentials`, `.dockercfg`, and
  cert/PGP extensions (`.crt/.cer/.cert/.der/.asc/.gpg`) now hit the secrets floor —
  so no consent grade auto-touches them. (`id_rsa.pub` stays a non-hit.)
- **Grade-blind selfcheck now catches resolver-mediated reads (134).** The invariant
  check flagged only the raw `config.autonomy` key; it now also flags a hook that
  branches on `resolveAutonomy(...).grade` / `readAutonomyOverride`, with the
  display-only `autonomy-signals.mjs` as an explicit allowlist (the audited surface,
  not a regex blind spot).
- **`[Unreleased]` boot digest miscounted nested sub-bullets (135).** The tally now
  anchors to column 0, so an indented sub-bullet is detail of its entry, not a new one.
- **`pipeline-board` digest crashed on a titleless card (136).** It now coerces a
  missing title to `(untitled)` — the digest is a never-crash summary (ADR-0027).
- **LP lawyer disclaimer is now non-removable by ENFORCEMENT (137).** `lp-build
  --check` refuses a `dist/` whose legal pages dropped the disclaimer (was convention
  only). [ADR-0050]
- **Readiness-marker threat model documented (138).** `autonomy-eligibility.mjs` now
  records that the marker is trust-on-write and why that's acceptable (grade-change is
  human-floored, `memory/autonomy/**` is a floored path, 14-day freshness, `--confirm`)
  and why an HMAC was considered and deferred. [ADR-0045]

### Fixed — pre-release audit of the ADR-0041…0050 package (4-way deep analysis + security review)
- **`auto-transition` could bypass the `qa-reject` monopoly (ADR-0043 §3).**
  `autoTransition` only fenced `conclusion`; it now refuses any move that isn't a
  legal forward step (`backlog→working→testing`). A `testing→working` bounce — which
  must carry feedback — is once again `qa-reject`-only, and backward/skip jumps are
  refused (use the human `move`). [HIGH]
- **Stale eviction left no event — the `evict` actor was dead (ADR-0043 §5).**
  `workspace-sync` moved a stale task `working→backlog` via `writeState` but never
  `appendEvent`, so the transition was invisible to the log and the grade-4 rollback
  metric (ADR-0045) under-counted abandonment. Eviction now appends an
  `actor:'evict'` event. [HIGH]
- **`/project-map` manifest churned on every commit (ADR-0046 §1 / ADR-0039).** The
  manifest carried a wall-clock `generatedAt`, so the pre-commit auto-refresh
  re-staged it on every source commit (git noise + merge-conflict surface). Dropped
  the field — the deterministic `signature` is the map's identity; the manifest is
  now byte-stable on a no-op regenerate.
- **`deps-audit` npm-v6 advisory path was dead** — a `data` → `parsed`
  ReferenceError inside `parseNpmAudit` was silently swallowed by the caller
  and downgraded real CVE output to `audit-skipped` on npm v6. (Found while
  implementing task 132.)

### Added — ADR-0044 D3 budget gate, now actually wired
- **Grade-4 budget downgrade (ADR-0044 D3).** The decision was documented but
  absent — the resolver never consulted the token budget despite the grade-4
  consequence text claiming "budget-gated." `resolveAutonomy` now honours
  `context.budgetExhausted`: at grade 4 an exhausted `tokens.budgetPerSession`
  returns grade-2 behaviour (`suggest`, `reason: 'budget-exhausted'`) — it
  **downgrades to consent, never blocks an edit** (rule 2); the floor still wins,
  and lower grades stay budget-warn-only. `/ship` passes the budget state when it
  re-consults the resolver per step. Per-command attribution's doc was also
  calibrated: `attributionSkill` is host-populated and legitimately sparse, so the
  "Top commands" lens is best-effort (the per-agent fan-out split is the guaranteed,
  budget-gate input).

### Added
- **`/project-map` becomes an active architectural-fitness substrate (ADR-0046).**
  The structural map stops being a passive doc: (1) **self-refreshing** — the
  pre-commit hook regenerates + `git add`s the map when source is staged (grade-blind
  derived doc, never blocks); (2) **architectural fitness functions** — an opt-in
  `memory/project-map/rules.json` declares path-prefix layering rules
  (`forbidden: from→to`) and sensitive-import rules; `project-map --check --strict`
  exits 1 on a violation (a new `project-map` job in `quality.yml` is the gate). The
  sensitive set is **augmented from the ADR-0041 secrets path-class** (`matchSecret`,
  reused not reinvented) — the floor gates *editing* a secret, this adds the *edge*
  view (who now imports it); (3) **structural insights** — dependency cycles, orphan
  and oversized modules, computed at generate-time into `manifest.json`, surfaced at
  boot and in an "Architecture health" section of `00-index.md`; (4) `--check` prints
  a token-cheap **delta** (+/− modules/edges); (5) `--for <path>` returns a focused
  **subgraph** so the ADR-0044 memory retriever can query the map. New
  `project-map-insights.mjs` + `project-map-rules.mjs` (pure siblings); `projectMap:
  { autoRefresh, enforce }` config block. Covered by selfcheck + integration
  (cycle, violation→exit-1, opt-in-off, `--for`).

### Added — F3 fan-out economy (ADR-0044, tasks 113–115)
- **D3 · per-agent / per-command token attribution.** `/token-report` now splits
  spend by **agent** (main loop vs subagent **fan-out**, from the transcript's
  `isSidechain`) and by **command** (from `attributionSkill`), in the human view and
  under `--json` — the honest input the grade-4 budget gate (ADR-0045) consumes and
  the proof-of-savings instrument. New pure `token-attribution.mjs`. **Deviation
  noted:** the ADR sketched a per-run ledger line written by `/debate`/`/ship`; the
  transcript already carries `attributionSkill` + `isSidechain`, so attribution is
  derived from records already parsed — strictly more accurate (a command cannot see
  its own final token count mid-run) and with **no new persisted artifact**, which
  structurally forecloses the ADR's named "memory-inflation" failure mode.
- **D1 · bounded subagent context pack.** `context-pack.mjs --for-subagent
  --objective "…"` emits a ≤~120-line pack (immutable-rules digest · last-session
  line · `[Unreleased]` digest · open claims · objective-targeted memory) carrying
  the standing rule *"do not re-read boot context; read at most 1 file to verify a
  claim."* `/debate`, `/advise` and `/ship` (and the antigravity mirrors) now embed
  it in every fan-out Task prompt — the pattern the 06 master round validated.
- **D5 · deterministic memory retriever.** New `memory-retrieve.mjs` selects the
  memory **already extracted** by the digest layer (glossary rows · ADR catalog
  lines scored by title overlap · the latest-session one-liner · the project-map
  `--for` subgraph) for an objective — no generation, no placeholders, hard-capped
  at 40 lines, idempotent (same objective + repo state ⇒ byte-identical).
- **D2 · compact `[Unreleased]` boot digest.** The SessionStart banner replaces the
  raw section with a count-by-type tally (`Added 2 · Fixed 1 …`) + the most recent
  entries via the `md-extract` seam (`digestUnreleased`), falling back to the raw
  truncated section on any parse miss (same contract as the ADR-0027 boot digest).
- Covered by selfcheck source-cases + a dedicated `integration-test-token-economy.mjs`
  suite (attribution split, retriever cap/idempotency/placeholder-guard, bounded
  subagent pack, the `[Unreleased]` digest + its raw fallback).

### Changed — Antigravity host goes native (ADR-0048 + ADR-0049)
- **Host assets moved `.antigravity/` → `.agents/` (ADR-0048).** The agy binary
  resolves workspace skills strictly from `.agents/`, so the kit-invented
  `.antigravity/` was never read — typing `/` in the agy TUI showed *"No
  matching results"*. The installer now targets `.agents/` (single-sourced as
  `ANTIGRAVITY_DIR` in `paths.mjs`, rule 4), auto-removes the kit-owned legacy
  tree on update, purges both on `--uninstall --purge`, and ships a
  host-coexistence README (`.claude/` = Claude Code, `.agents/` = agy; neither
  reads the other). `/context-doctor` flags a leftover legacy tree as
  migratable. Slash commands now autocomplete natively in the agy TUI.

### Added — native agy lifecycle hooks (ADR-0049)
- **`.agents/hooks.json` composer.** New
  `runtime/config/agent-hooks-compose.mjs` (`composeAgentHooks` /
  `stripAgentHooks`) — the agy twin of `settings-compose.mjs`, owning a single
  `contextdevkit` group and preserving user groups. Level rules mirror the
  Claude wiring 1:1 (L1 SessionStart · L2 +PostToolUse +Stop · L3
  +concurrency-guard · L5 +simulate-gate +deliberation-nudge); wired by the
  installer, re-wired by `/context-level`, stripped by `--uninstall`.
- **Host adapter — one seam, no forked hooks.** New
  `runtime/hooks/host-adapter.mjs` normalizes both wire formats (Claude
  `tool_input.file_path` ⇄ agy `toolCall.args.TargetFile`), emits the
  host-correct blocking key (`block` ⇄ `deny`), rides advisories on an explicit
  `decision: allow` under agy, and resolves the agy session id from the
  `.agy-active.json` marker `session-manager start` now mints (one ledger per
  agy session instead of one per hook event). `track-edits`,
  `concurrency-guard`, `simulate-gate` and `deliberation-nudge` swapped their
  private extractors for the adapter — the L5 gate, edit ledger, cross-claim
  warnings and the deliberation nudge now fire automatically in agy.
- **Tests.** Selfcheck: composer level table, per-tool matchers, idempotence +
  user-group preservation, payload-normalization table, ADR-0048/0049 source
  cases (check floor 660 → 711+ executed). Integration: `.agents/` install +
  no-legacy-tree + coexistence README cells (tooling suite); hooks.json wiring,
  agy session minting, `track-edits --host agy` ledgering and the
  `simulate-gate --host agy` deny verdict (antigravity suite).

### Added — conversion squad + deterministic LP scaffold (ADR-0050)
- **`lp-scaffold.mjs` + `lp-build.mjs` + `starters/landing/`.** The landing
  page stops being AI-hand-written (~30–60K tokens) and becomes deterministic:
  componentized source (one fold per file, `content/copy.json` as the AI's
  only editing surface) assembled into one atomic indexable `dist/` —
  `--check` refuses leftover `{{tokens}}`/`[PREENCHA]` sentinels and runs
  `seo-audit` + `aiso-audit` against the output (born green, asserted in CI).
  Resolves ADR-0023's deferred starter without inventing domain content
  (structure + placeholders only, rule 9).
- **LGPD by default.** Cookie-consent component ships ON (Consent Mode
  default-denied, < 2 KB, accessible); GTM included directly but **ID-less**
  (inert until configured, loaded only after consent); Meta/TikTok/LinkedIn
  pixels ship as commented, consent-wrapped **models** (`tracking-models.js`,
  never in dist); privacy policy + terms of use generated as drafts from
  `content/legal.json` with a non-removable lawyer-review disclaimer; lead
  forms decoupled via webhook (n8n/Make) with loading/success/error states.
- **Two design-team agents.** `conversion-strategist` (interview-first
  strategy — niche/pain/single-CTA/sophistication — neurodesign techniques
  with verification steps, benefit copy; refuses invented social proof) and
  `tracking-integrator` (GTM/pixels/webhooks, consent-first by contract,
  pairs with `privacy-lgpd`). Lean agents + tier-2 briefings under
  `squads/design-team/`.
- **Playbook + skill v2.** `landing-page.md` gains the fold-anatomy menu
  (persuasive function per fold), the neurodesign verify-don't-vibe table,
  the legal & consent defaults and the deterministic path; `/landing-page`
  now runs interview → indexability → scaffold → fill → `--check` gates.
  Refused, on record: fixed Next/React stack mandate, a parallel 150-line
  cap, 7-fold minimum, example social proof, auto-wired pixels.
- **Tests.** New sibling suite `tools/integration-test-lp.mjs` (25 checks:
  write-if-missing, refuse-on-placeholder, consent/GTM/pixel contract,
  disclaimer presence, copy round-trip, fold selection) + selfcheck inventory
  for both scripts, both agents, briefings and the starter tree.

## [1.17.0] - 2026-06-10

### Added — backlog-zero batch (tickets 084–096)
- **`agy guard <path>` — explicit L5 pre-edit checkpoint (095).** Governance
  parity for the hook-less Antigravity host: exit 0 = allowed, exit 1 = high-risk
  path with no covering `/simulate-impact` record (refuse-by-default, including
  on errors). Shares `matchHighRisk` with the PreToolUse hook via
  `path-classification.mjs`; documented in `INSTRUCTIONS.md.tpl` and the
  session-start rules.
- **`help <command>` + did-you-mean in `ctx.mjs` (096).** Unknown commands print
  the closest 3 matches instead of dumping the six-category menu; `help <cmd>`
  prints a single-command card. The categorised registry moved to
  `runtime/antigravity/ctx-menu.mjs` (graceful fallback when the engine is absent).
- **Antigravity-aware `/context-doctor` (086).** Verifies `ctx.mjs`, the
  `ctx`/`agy` package.json shortcuts, the four `.antigravity` asset trees,
  `INSTRUCTIONS.md`, and leftover `{{TOKEN}}` placeholders — advisory-only, a
  Claude-only project never fails doctor over the optional host.
- **Antigravity parity drift-guard in selfcheck (084).** `templates/antigravity`
  must track `templates/claude` 1:1 (both directions, by relative path) or
  selfcheck fails pointing at `npm run build:antigravity`.
- **New integration suite `tools/integration-test-antigravity.mjs`** covering the
  `ctx.mjs` dispatch contract, the guard checkpoint, the shared drift predicate
  and the doctor checks; joined the `npm test` chain.

### Fixed
- **`ctx.mjs` silent prefix dispatch (089).** `agy tech` no longer guesses
  `tech-debt-scan.mjs` via `startsWith` — exact names and declared aliases only;
  a near-miss fails loudly with suggestions.
- **`convert-all.mjs` generated the Antigravity host from the wrong source (085).**
  It read the CURRENT project's `.claude/` (the kit's dogfood install), shipping a
  kit-local agent, missing newer commands (`debate`, `plan-week`, `project-map`)
  and keeping 33 stale flat duplicates after the taxonomy reorg. New `--templates`
  mode reads `templates/claude` + `templates/contextkit/workflows` with a
  clean-first build (top-level README.md preserved), wired as
  `npm run build:antigravity` — a kit build step, never the user `--update` path.
  Tree regenerated: 73 skills / 33 agents / 7 playbooks / 6 workflows, 1:1.
- **Antigravity drift detection disagreed with the Stop hook (092).**
  `session-manager` carried its own inline "important file" filter (it wrongly
  ignored `.claude/` edits, under-reporting drift); it now consumes the canonical
  config-driven predicate (`pendingImportantPaths`) from `hooks/ledger.mjs`.
- **Dispatch confinement + trust model (090).** Resolved scripts must stay under
  `contextkit/tools/scripts`; the project-local trust assumption both runners
  share with npm scripts / git hooks is documented in their headers.

### Changed
- **Installer io convention unified (091).** The `engine`/`claude`/`antigravity`
  installers import `fs.mjs` directly; the pass-through `io` object and parameter
  are gone (half the modules already imported directly — one convention now).

### Added
- **`/project-map` module dependency graph — blast-radius edges (ADR-0040).**
  The map gains a **"Module dependencies (who imports whom)"** section in
  `00-index.md` — deterministic edges between mapped modules, resolved from import
  statements (zero AI tokens). New `project-map-deps.mjs` extracts JS/TS-family
  imports (`import … from`, `require()`, dynamic `import()`) and resolves each to a
  target module by **relative path** or **workspace package name** (from each
  module's `package.json`); externals (node_modules) are ignored. Edges are sorted
  → the committed docs stay churn-free (ADR-0039), and deps are deliberately kept
  OUT of the structural signature. Symbol extraction moved to a sibling
  `project-map-symbols.mjs` (cohesion — keeps `project-map-core.mjs` under budget).
  v1 covers the JS/TS family; other languages' edges are deferred (documented, not
  silent). Pairs with `/simulate-impact`. Covered by selfcheck + a cross-module
  edge round-trip in the tooling integration test.

### Changed
- **`/project-map` staleness via a deterministic structural fingerprint (ADR-0039).**
  The map signature was `modules:files:mtime` — printed in every doc header — so
  regenerating an unchanged project **churned** the committed docs, and the boot
  nudge (which compared `generatedAt` to the newest mtime) **false-fired after
  every clone** (clone resets mtimes). The signature is now a `sha256` over each
  module's `path:files:bytes` (no mtime, no clock): an unchanged tree renders
  **byte-identical** docs (zero churn) and `--check` is exact. The date is dropped
  from the doc bodies (kept in `manifest.json` + console). `projectMapStale` now
  compares each module's saved `{files, bytes}` against a bounded (≤400-stat)
  recompute — structural, clone-safe, and it **skips** a cap-truncated module
  rather than false-flag it (rule 8). Self-contained (no `git`, no `tools/` import).
  Covered by selfcheck + churn-free + stale-on-edit integration asserts.


### Added
- **`/project-map` — deterministic, stack-agnostic structural map (durable memory).**
  A new zero-AI-token mapper (`contextkit/tools/scripts/project-map{,-core,-render}.mjs`)
  scans the project and writes a committed map under `contextkit/memory/project-map/`:
  `00-index.md` (one-screen overview — stack + modules classified 🎨 frontend /
  ⚙️ backend / 🔗 shared / 🛠️ config), `01-modules.md`, `02-inventory.md` (sampled
  exported symbols), and a `manifest.json` signature. The agent reads the index
  INSTEAD of re-greping the tree each session. `--check` diffs the saved signature
  (`--strict` exits 1 for CI), and the SessionStart boot context nudges 🗺️ when the
  map is older than the newest source edit (bounded mtime walk, ≤400 stats — rule 2).
  Output path single-sourced via `pathsFor().projectMap` (rule 4); the installer
  seeds `memory/project-map/`. Claude host this release; the Antigravity mirror
  follows with the host-modular pass. Covered by selfcheck + a frontend/backend
  classification round-trip in the tooling integration test.
- **Legacy-install migration (rename follow-through).** `install.mjs` now carries
  an old `vibekit/` install forward to `contextkit/` automatically on `npx
  contextdevkit --update` (and via an explicit `node install.mjs --migrate
  [--dry-run]`). New `tools/install/migrate.mjs`: atomically MOVES the folder
  (preserving memory/ADRs, config + level, pipeline tasks, `.env`), rewrites the
  rename tokens in `settings.json` (killing the duplicate-hook trap),
  `.gitignore`, `.gitattributes`, git-hook wrappers, `contextkit/.env`, and
  `CLAUDE.md` (the last two backed up to `*.bak`), and deletes the stale
  `/vibe-*` + `setupvibedevkit` command files. Refuses (no-op + warning) when
  BOTH folders exist; idempotent; never throws into the installer (rule 2). New
  `tools/integration-test-migrate.mjs` (25 asserts) wired into `test` +
  `prepublishOnly`.
- **agent-forge squad — Fase 6: declarative pipeline DSL + dry-run engine
  (ADR-0015 Part A).** The forge's orchestration is now a diffable, simulate-
  impact-mappable plan. New `templates/contextkit/squads/agent-forge/pipeline.yaml`
  declares the 9 build steps (validate-blueprint → route →
  checkpoint-shortlist → generate-prompt → generate-tools? → generate-rag? →
  governance → eval-gate (on_reject → generate-prompt, max_cycles: 3) →
  package). New `templates/contextkit/tools/scripts/squad-pipeline.mjs` engine
  parses via `lib/yaml.mjs` (ADR-0013 optional dynamic import) and refuses on
  missing `yaml` with **exit 0 + informative** message — pipelines are opt-in,
  not hot-path. New `squad-pipeline-condition.mjs` is the whitelisted
  condition parser: only `<id>(.<id>)* <op> <literal>` and `…length <op>
  <int>` (no function calls, no boolean chaining, no arithmetic). `--dry-run`
  walks the graph against an empty context and prints the would-be execution
  order with markers `✓` runs · `⊘` skipped by condition · `↺` has retry
  loop. `max_review_cycles` is a hard cap (engine exits "manual escalation
  required" rather than looping past it); vendor model names are refused
  (only `model_tier: fast|powerful|reasoning` — the router stays the single
  resolver). 2 new selfchecks in `selfcheck-agent-forge.mjs`
  (`checkConditionParser` + `checkSquadPipeline`, 8 assertions). 4 new
  integration asserts (pipeline ships, validates, yaml-absent informative
  path). Spec: `docs/SQUAD-PIPELINE-FORMAT.md` (258 lines). `state.json` per
  run is deferred to task 040 (ADR-0015 Part C). The agent-forge ROADMAP
  Fase 6 row flips to ✅; opensquad-inspired but reshaped — full expression
  eval, vendor names in YAML, and auto-state are deliberately rejected.
- **agent-forge squad — Fase 5: RAG designer + Go runtime + L5 gate + /fleet
  Forge Stats.** Closes the original blueprint. New `lib/rag-designer.mjs`
  generates the `rag/` bundle from the blueprint when `capabilities.rag` is
  true — multilingual-vs-english embedding from `intent.domain`, pgvector vs
  qdrant from residency, recursive chunk sizing tightened for extraction,
  `top_k` scaled by complexity, hybrid search + reranker on by default. The
  packager now also stamps `{{AGENT_NAME}}` / `{{MODULE_PATH}}` into the Go
  runtime adapter (`go.mod` + README). `defaults.l5.highRiskPaths` ships with
  `agent-packages/**` so any forged-agent edit triggers the simulate-impact
  gate. `fleet.mjs cmdStats` aggregates per-repo Forge Stats and surfaces a
  fleet-total `🔥 Forge fleet: N packages across M repos…` line. Selfcheck
  split: build-pipeline checks stay in `selfcheck-agent-forge.mjs` (225
  lines), Fase 4+5 ops checks moved to the new `selfcheck-agent-forge-ops.mjs`
  (real responsibility seam). New `rag-designer.md` briefing — refuses
  pinecone under no-cloud, refuses `top_k < 4`. (035)
- **agent-forge squad — Fase 4: production maintenance + Forge Stats + reference
  docs.** Operating a fleet of forged agents in production now has tools.
  `lib/package-ops.mjs` discovers `<name>@<semver>/` dirs without needing the
  yaml dep, loads manifests + provenance via the optional path, diagnoses
  structural problems (missing files OR `{{TOKEN}}` placeholders in
  governance YAMLs), and aggregates monthly budgets. Three CLI modules wire
  **13 new `/forge-*` slash commands**: `cli/forge-ops.mjs`
  (list/show/doctor/policy/budget/audit — read-only),
  `cli/forge-eval-cli.mjs` (eval/redteam/route/fallback-test with `--provider
  mock|chaos` for CI), `cli/forge-admin.mjs` (refresh-matrix/killswitch/
  deprecate — dry-run by default, atomic tmp+rename writes on `--write`).
  Each command has a thin briefing under `templates/claude/commands/forge-*.md`
  carrying its refusal conditions. The Node runtime adapter ships a
  `createShadowEval` scaffold (sample rate from
  `quality.policy.yaml.eval_gates.drift_monitoring.sample_pct`; real scoring
  delegated to the package's `evals/`). `/context-stats` gains a **Forge Stats**
  section (package count, eval-stamp ratio, aggregate target + hard cap,
  distribution by primary provider). New reference docs:
  [`docs/SQUADS/agent-forge.md`](docs/SQUADS/agent-forge.md) +
  [`docs/AGENT-PACKAGE-FORMAT.md`](docs/AGENT-PACKAGE-FORMAT.md). Selfcheck
  gains `checkPackageOps` + 19 inventory entries (13 commands + 6 files).
  ROADMAP §8 / §9 / §10 (Forge Stats) all ✅; Fase 4 ✅. (034)
- **agent-forge squad — Fase 3: governance + eval gate (the refuse-to-ship layer).**
  Principle 5 ("Eval before embarkation") is now enforced in code. Three pure
  zero-dep modules carry the gate: `lib/eval-designer.mjs` (`designEvalSet` seeds
  golden by `intent.category` + the universal red-team baseline of
  prompt-injection / jailbreak / PII-leak + a rubric + thresholds derived from
  blueprint privacy/sla/cost — PII-leak block rate forced to 1.0 when
  `pii_present`); `lib/eval-runner.mjs` (`runEvalSuite`, provider-agnostic — mock
  for CI, real adapter for production — supports `exact` / `exact_set` /
  `numeric_tolerance:N` / `semantic_similarity:>=N`; aggregates p95 latency + cost
  and refuses pass when any threshold breaches); `lib/governance-officer.mjs`
  (`attachGovernance` builds the three pillars populated from the blueprint
  plus the fallback chain from the router decision; `validateGovernance` refuses
  on missing sections OR unresolved `{{TOKEN}}` placeholders). `packageAgent`
  now calls `attachGovernance` first (throws early), writes 4 populated
  governance YAMLs + 4 populated eval files (overwriting templates), and stamps
  `provenance.eval_passed_at` ONLY when `opts.evalResult.verdict === 'pass'`.
  `forgeNew` gains an opt-in `runEval = { provider, semantic }` that runs the
  gate before packaging. Two new agent briefings ship: `eval-designer.md` (drives
  the 10–50 golden expansion + domain red-team) and `governance-officer.md`
  (three pillars equal-weight, refuse-over-rubber-stamp). 11 new behavioural
  selfchecks + 6 new integration asserts. (033)
- **agent-forge squad — Fase 2: multi-provider + Python runtime adapter.** All five
  providers now flow end-to-end through the pipeline. `prompt-gen.mjs` gains
  `renderGoogle` (Markdown body for `systemInstruction` + safetySettings note),
  `renderDeepSeek` (OpenAI-compat with an explicit CoT cue prepended to Rules),
  `renderOllama` (Markdown body; the per-model `chat_template` is applied by the
  runtime, not embedded). `tool-gen.mjs` gains `renderGoogle` with
  `downConvertForGemini` that recursively strips JSON-Schema fields Gemini's
  `functionDeclarations` parser rejects (`additionalProperties`, `$schema`, `$id`,
  `$ref`), plus `renderDeepSeek` + `renderOllama` mirroring OpenAI's `type:function`
  shape. `packager.mjs` writes the full 5 prompt files + 5 tool adapter files on
  every package, and a new `stampRuntimeAdapters` replaces `{{AGENT_NAME}}` /
  `{{SEE_LICENSE}}` in Node `package.json` + Python `pyproject.toml` (+ their
  READMEs) when those runtimes are requested. `architect.mjs` promotes
  `runtime_adapters` to a first-class blueprint field (`enum-multi` over
  `[node, python, go]`, default `[node]`) — `validateBlueprint` rejects unknown
  entries, `fillDefaults` defaults it, `assembleManifest` stamps
  `spec.runtime_adapters` straight from the blueprint. Integration test gains 7
  new asserts across both branches (yaml-available + no-yaml CI default) covering
  every new provider + the Python adapter token stamping. (032)
- **agent-forge squad — Fase 1 MVP: end-to-end forge pipeline.** The squad now
  produces a real Agent Package. Six pure, zero-dep `lib/*.mjs` modules carry the
  pipeline: `architect.mjs` (canonical `INTERVIEW_QUESTIONS` + `validateBlueprint` +
  `fillDefaults` + canonicalized SHA-256 `blueprintHash` for provenance);
  `router.mjs` + `router/decision-rules.json` (13 rules under the 15-cap, structural
  shortlists only — quality verdicts deferred to the eval harness per ADR-0012 §5);
  `prompt-gen.mjs` (canonical Markdown → Anthropic XML with `cache=ephemeral` +
  OpenAI Markdown sections); `tool-gen.mjs` (canonical JSON schemas → Anthropic
  `{name,description,input_schema}` array + OpenAI `type:function` wrapper);
  `packager.mjs` (split into pure `assembleManifest` + I/O `packageAgent` —
  stamps provenance, replaces the README rationale slot, writes provider files).
  The optional `yaml` dep (ADR-0013) is touched only at write time via `lib/yaml.mjs`.
  Six lean `.claude/agents/forge-*.md` briefings (orchestrator / architect /
  router / prompt-engineer / tool-designer / packager) plus the `/forge-new` slash
  command and the executable `cli/forge-new.mjs` (exports `forgeNew()` for the
  integration test). Selfcheck gains `checkRouterEngine` — a behavioural guard
  that exercises a typical extraction blueprint AND the no-cloud constraint,
  asserting the rationale carries the eval-as-authority disclaimer. (031)
- **Installer copies the agent-forge squad at L>=4.** Fase-0 leftover fixed —
  without this, the squad existed only in the source tree and installed projects
  could not run `/forge-new`. Guarded by a `checkSourceInvariants` regex so a
  silent regression is impossible.
- **Integration round-trip for `/forge-new`.** New block in
  `integration-test-tooling.mjs`: when the optional `yaml` dep is installed,
  drives `forgeNew` to write a complete APF into a temp `agent-packages/...@0.1.0/`
  and asserts 11 expected files + stamped blueprint hash + routed primary
  provider + Anthropic XML prompt + OpenAI function-typed tools + Node adapter.
  When `yaml` is absent (default CI), exercises the pure half of the pipeline
  (validate → route → `assembleManifest` → generators) with the same invariants
  in memory — CI proves correctness end-to-end either way.
- **agent-forge squad — foundations (Fase 0).** New *factory* squad that forges
  portable, multi-provider Agent Packages for projects outside the kit. Scaffolded
  `templates/contextkit/squads/agent-forge/` with its README (mandate, roster, boundary)
  and `best-practices.md` (the bar every forged agent clears — five principles, the
  default catalogue, provider notes, three-pillar governance, eval lifecycle).
  Seeded `router/capability-matrix.json` (5 providers, 11 models, dated + ADR-gated)
  with a selfcheck guard that parses it and rejects malformed / duplicate / disallowed
  model ids. Materialized the full APF v1 template tree (`templates/agent-package/`,
  45 files): manifest, canonical + per-provider prompts, canonical tool schema +
  per-provider tool adapters, the eval set (golden / red-team / rubric / thresholds /
  run-eval), three governance policies + fallback-chain + audit schema, RAG config,
  and Node / Python / Go runtime-adapter stubs. Selfcheck inventory guards the docs +
  representative APF files. Approved by ADR-0012; remaining phases on the DevPipeline
  (031–035). (030)

## [1.4.2] - 2026-05-25

### Changed
- **CI actions bumped to Node 24 majors** (re-pinned by SHA): `actions/checkout`
  v4→v6, `actions/setup-node` v4→v6, `actions/dependency-review-action` v4→v5 —
  across `release.yml`, `ci.yml` and the scaffolded `quality.yml`/`security.yml`
  templates. Clears GitHub's Node 20 runtime-deprecation warning (forced Node 24
  on 2026-06-02). CodeQL stays on v3 (no Node 24 major yet). Still SHA-pinned.

## [1.4.1] - 2026-05-25

DevPipeline backlog cleared (all 25 open tasks) — bug fixes, supply-chain &
test hardening, and single-source refactors. No public API removed.

### Fixed
- **Network git calls now time out** (`git.mjs`, `pre-push.mjs`) — an unreachable
  remote could hang `/git status` and any push. Bounded via `CONTEXT_GIT_TIMEOUT_MS`. (007)
- **Boot banner**: `[Unreleased]` clipped past 60 lines now shows a `(truncated)`
  marker (009); `extractLatestSession` breaks a session-number tie by the later date (010).
- **`applyPreset`** no longer crashes on a partial/custom preset missing `l5`/`qa`/`ledger`. (013)
- **Atomic writes** (tmp-file + rename) for the ledger, workspace, pipeline and claim
  writers — a concurrent reader can't see a half-written file; pipeline ids are now
  collision-safe (exclusive create). (011)
- **`SessionStart`** no longer deletes a live concurrent session's fresh ledger. (008)

### Security
- **`sanitizeSid`** applied at every workspace-path construction (claim/release/track-edits)
  — defense-in-depth against `../` traversal in a session id. (012)
- **GitHub Actions pinned to commit SHAs** across release/ci + the security/quality
  workflow templates; **`ci.yml` is least-privilege** (`contents: read`). (019, 020)
- **README "Security & trust"** section — npx/hook-install + tag-pinning + fleet/detector
  code-execution disclosure; installer **backs up an existing git hook** to `.bak`. (021, 022)

### Added
- **Guards test suite** (`integration-test-guards.mjs`): commit-msg, pre-push
  (block/warn/allow/bypass), config-loader fallbacks, uninstall/purge, concurrency-guard
  external-edit, gh-alerts mappers, malformed-settings recovery. (014–018)
- **Pluggable-detector seed** `contextkit/detectors/` (README + inert example), now installed. (026)

### Changed
- **Single-source level taxonomy** (`config/levels.mjs`) + **passthrough config schema**
  (no more `max(5)` cap; keeps every section). [ADR-0010] (024, 025)
- **Single-source platform paths** via `pathsFor(root)`; a selfcheck guard now fails on any
  hardcoded `contextkit/` path construction (rule 4). [ADR-0011] (023)
- **Shared zero-dep helpers**: `readJsonSafe`/`parseJsonSafe` + `squadOf`, killing duplicated
  BOM-parse / squad-detection code. (027, 028)
- Line-budget cohesion notes + constitution nits (dead imports, bare-var renames);
  `selfcheck.mjs` split to stay under the RED-zone gate. (005, 006, 029)

## [1.4.0] - 2026-05-25

### Changed
- **Recommended starting level by project type** (ADR-0009) — the installer now
  defaults to **L3** for a greenfield/empty folder and **L7** for a project that
  already has code (was: always recommend L2). `--level` still pins; a re-install
  preserves an existing project's level. Not intrusive — the L5 simulate-gate stays
  inert until `l5.highRiskPaths` is set. Docs retagged (`cli` labels, `LEVELS.md`
  with new L6/L7 sections, both `instrucoes.md`, README quickstart).

### Fixed
- **Level cap stuck at 6.** `install.mjs` silently downgraded `--level 7` to 2, and
  `doctor.mjs` flagged a valid L7 project as "config.level out of range". Both now
  accept **1–7**. Also corrected stale `1-5`/`1-6` range hints across `/context-level`,
  `/setupcontextdevkit`, `settings-compose`, and `docs/ARCHITECTURE.md`.

## [1.3.0] - 2026-05-25

### Added
- **L7 "Ecosystem & Scale" — new capability tier.** The shipped Future-directions
  capabilities (fleet, agent-tuning, editor/CI, detectors/presets, token economy,
  playbooks, visual tests) are now a real activation level: **`/context-level 7`**.
  Wiring only — `getLevel` 1→7, level labels + `--level 1-7`, `defaults` docs; **no
  new hook** (same capability-tier pattern as L6). [→ ADR-0008]
- **Diverse & visual testing harness (MVP)** — `/visual-test` + `visual-test.mjs`
  **scaffold** a browser-driven visual layer (screenshot / visual-regression) for the
  detected stack: Playwright **JS** (`@playwright/test`) + **Python** (pytest-playwright);
  `status` detects an existing harness. Owned by `qa-e2e`; wired into `/scaffold-tests`,
  `/qa-signoff`, `/ship`. The runner is a project dependency — the kit scaffolds, never
  bundles/runs browsers (zero-dep hot path). Roadmap *Future directions* #6.
- **Fleet mode (MVP)** — `/fleet` + `fleet.mjs`: a control plane over many repos.
  Registry outside any repo (`~/.contextdevkit/fleet.json`, override `CONTEXT_FLEET_FILE`);
  `add`/`remove`/`list`, `stats` (aggregate each repo's `stats.mjs`), `audit`
  (aggregate `deep-analysis`), and `propagate <rule-file>` (report which repos'
  `CLAUDE.md` **lack** a rule — detect-only, no cross-repo edits). Zero-dep, defensive.
- **Outcome-driven agent tuning (MVP)** — `/tune-agents` + `agent-tuning.mjs`:
  aggregates per-agent signals (tier-2 briefing coverage + usage mentions across
  sessions) and **proposes** briefing refinements to `.agent-tuning-proposal.md`
  (gitignored); applies nothing, mirroring `/distill-sessions`. Promotes roadmap
  *Future directions* #2/#3 from candidate to MVP.
- **Playbook management** (roadmap #8) — `playbook.mjs` + **`/playbook`** turn
  `contextkit/workflows/playbooks/` into a managed layer: **list** the registry, **show**
  a procedure, and **run** one (records a tracked entry in
  `contextkit/memory/playbook-runs.md`, then prints the steps). `/ship` and the squads can
  `run` a playbook instead of restating it. Zero-dep; covered by selfcheck + integration
  tests.
- **Token economy & usage insight** (roadmap #7) — `token-report.mjs` + **`/token-report`**
  read Claude Code's local session transcripts and aggregate token usage per session and
  per ISO week (input/output/cache), with a configurable budget (`tokens.budgetPerSession`)
  that flags hot sessions. Read-only, local, zero-dep, aggregated counts only. New
  integration test covers aggregation.
- **Predictions-review cadence** (roadmap #002) — when `predictionsReview.active` (on by
  default), the SessionStart hook reminds you to run `/predictions-review` every N sessions,
  but **only** when unreviewed `/simulate-impact` predictions exist (silent otherwise).
  Mirrors security-mode. New integration test covers the trigger.
- **Editor/CI surfaces (MVP)** — a **status-line widget** (`statusline.mjs`, wired as
  `settings.statusLine` at L≥1, preserving a user's own) and a **quality CI workflow**
  (`.github/workflows/quality.yml`: `contract-scan --ci` + `tech-debt --ci`). Roadmap
  *Future directions* #4. (The Claude-driven PR-review bot is deferred — needs Claude in CI.)
- **Pluggable detectors & stack presets (MVP)** — `tech-debt-scan` loads drop-in
  detectors from `contextkit/detectors/*.mjs` (defensive dynamic import); `install.mjs
  --preset next|go|python` merges a stack preset (ledger / high-risk / QA paths) into
  config via `presets.mjs`. Roadmap *Future directions* #5.

### Changed
- **Contract drift detection deepened** (`contract-scan.mjs`) — the export extractor
  now also catches `export default`, namespace re-exports (`export * [as N] from`),
  `declare`/`abstract` declarations, generators, and type-only `export type { … }`
  (and fixes an inline-`{ type X }` mis-parse). Stays regex-based and **zero-dep** by
  design — AST would need a parser dependency (see *Honest gaps* / ADR-0003). New
  integration test covers it.
- **Optional AST contract drift** (`contract-scan.mjs`, roadmap #001) — when a parser is
  importable (`acorn`, or a module named by `CONTEXT_CONTRACT_PARSER`), extraction uses the
  AST for precision; otherwise the deepened regex (the zero-dep default) is used. The kit
  ships no parser, so the default is unchanged. Integration test covers the AST path via a
  fake parser. [→ ADR-0003]

## [1.2.0] - 2026-05-24

### Added
- **`code-security` agent (security-team sub-specialist)** — owns the code's external
  attack surface: third-party integration code (API clients/SDKs, webhooks &
  callbacks, (de)serialization of external responses), dependency provenance/SBOM,
  and SAST/CodeQL triage. Mirrors `infra-security`; cross-linked from `security`
  (AppSec lead) and `infra-security` so the lanes don't overlap.
- **GitHub-native security** — `templates/github/dependabot.yml` + an **advisory**
  `security.yml` workflow (dependency-review on PRs + the `/deps-audit` gate + CodeQL),
  installed write-if-missing; **`gh-alerts.mjs`** syncs Dependabot + code-scanning
  alerts into the DevPipeline backlog (via the `gh` CLI; degrades to exit 0 without
  `gh`/repo/network); new **`/security-setup`** command ties scaffolding + sync together.
- **`/predictions-review` — closes the predicted-vs-actual loop** (ancestor parity #1,
  second half). `predictions-review.mjs` fills each `/simulate-impact` prediction's
  *Actual* section from the session ledger (paths changed vs predicted, delta both
  ways); auto-run by `/log-session`. The v1.1.0 write-half was a stub; the review half
  is now implemented. Covered by selfcheck + integration tests.
- **`workflows/` guides + playbooks** — installed `contextkit/workflows/` with per-level
  workflow docs (L1–L5, plus an L6 capability-tier note) and four reusable playbooks
  (`tech-debt-sweep`, `simulate-impact`, `distillation-cycle`, `security-batch`),
  generalized and translated from the source platform. Seeded write-if-missing by the
  installer (`copyTreeIfMissing`); covered by selfcheck + integration tests. Completes
  the post-1.0 **ancestor parity** focus (piece #3 of 3).

### Changed
- **`/deps-audit` grown into a dependency policy** — adds **license allow/deny** (from
  installed package metadata), a CycloneDX **SBOM** (`--sbom` → `contextkit/memory/sbom.json`),
  and **lockfile-drift** detection, driven by a new `deps` config block (`defaults.mjs`
  + optional zod `schema.mjs`). Findings still flow into the DevPipeline backlog.
  Zero-dep and defensive (never throws).

### Docs
- **Roadmap:** added — and shipped — the **"supply-chain & code security"** section
  (deepen the security-team), plus a **status-key convention** (`⏳ in progress`
  alongside `✅`/`📋`/`🟡`/`➖`) in `docs/ROADMAP.md` and the installed-project template;
  trimmed the now-resolved entries from *Honest gaps*.
- **Roadmap:** added two *Future directions* initiatives — **token economy & usage
  insight** (per-session token reporting via `/token-report`, budgets, and cost-driven
  optimization, extending L6 Insight) and **playbook management** (a registry +
  `/playbook` to list/show/run/track reusable procedures), cross-linked to the existing
  `workflows/playbooks/` ancestor-parity foundation.

## [1.1.0] - 2026-05-24

### Added
- **Two-tier squad briefings** — `squad.mjs brief <agent>` scaffolds a rich briefing
  into `contextkit/squads/<squad>/<agent>.md` (squad auto-detected) behind the lean
  `.claude/agents/` agent; `squad.mjs list` shows briefing coverage. Wired into
  `/squad`. Ancestor parity #2.
- **`memory/predictions/`** — `/simulate-impact` (`mark-simulation.mjs`) now writes a
  prediction file per run (objective · covered paths · predicted-vs-actual stub),
  seeded on install. First step of the post-1.0 **ancestor parity** focus.

### Docs
- **Roadmap:** marked the 1.0 milestone **shipped** (per-item status + the extras
  delivered) and set **ancestor parity** as the post-1.0 focus.

## [1.0.0]

### Added
- **Security mode (active, not reactive)** — a SessionStart trigger reminds you to
  run `/deep-analysis` every `securityMode.everyNSessions` sessions (default 10),
  **on by default**; disable with `securityMode.active: false`. The manual
  `/deep-analysis` command stays available anytime.
- **`/deep-analysis` (global sweep)** — `deep-analysis.mjs` aggregates every
  deterministic scanner (tech-debt, deps, contract) into one report; the command
  adds judgment (security / architecture / bug pass), suggests ADRs, and ingests
  every finding into the backlog. The security-mode boot trigger reminds you to run it.
- **WSJF (SAFe) prioritization + bug severity + SLA** in the DevPipeline. A task's
  priority comes from a WSJF score (`pipeline.mjs add --wsjf uv,tc,rr,js` or
  `pipeline.mjs wsjf <id> …`), from **bug severity** (`--severity S1-S4`), or from
  scanner severity; the **SLA due date** follows the priority (config
  `pipeline.slaDays`) and the board flags ⏰ overdue. Logic in
  `pipeline-prioritize.mjs`, rendering in `pipeline-board.mjs`.
- **Bug taxonomy + known-bugs map.** Bug tasks carry `severity` (S1-S4) + `bugType`
  (functional/regression/security/performance/data/…); `pipeline.mjs sync` generates
  `contextkit/pipeline/known-bugs.md` (registry grouped by severity, open vs resolved,
  ⏰ overdue), and `pipeline.mjs bugs` prints/regenerates it.
- **`business-rules/` memory folder** — `contextkit/memory/business-rules/` with a
  versioned-rule `_TEMPLATE.md`, scaffolded on install and surfaced in
  `/setupcontextdevkit`. Mirrors the source platform's `docs/business-rules/`, kept in
  `contextkit/memory/` alongside the rest of the project's durable memory.
- **`security-team` squad (security & infra / DevSecOps)** in the squads manifest —
  groups `security` (AppSec + dependency/supply-chain) and `devops` (infra, CI/CD,
  release safety), with veto on the L5/L6 gates for Critical/High findings.
- **`/deps-audit` (security-team)** — deterministic dependency / supply-chain check
  (lockfile present, version pinning, plus native `npm`/`pnpm`/`yarn audit` CVEs when
  available) that emits findings into the DevPipeline backlog. Roadmap 1.0 #6.
- **`infra-security` agent (security-team)** — threat-models the platform the app
  runs on (IaC/cloud misconfig, IAM least-privilege, network exposure, secrets,
  container/runtime + CI/CD supply-chain hardening); pairs with `devops` (builds it)
  and `security` (AppSec). The security-team is now AppSec + infra + delivery.
- **Analysis → DevPipeline backlog flow.** `/bug-hunt`, `/analyze-code-ia-practices`,
  `/tech-debt-sweep`, and `/audit` now always emit a report **and** push each finding
  into the DevPipeline backlog, **auto-prioritized** by severity (RED→P1, yellow→P2,
  low→P3) and **idempotent**. New `pipeline.mjs ingest <findings.json>` and
  `pipeline.mjs prioritize <id> <P0-P3>` (the auto priority is **always editable** by
  the user). `tech-debt-scan --write` also emits `tech-debt-findings.json`.

### Changed
- **`install.mjs` refactored into focused modules** under `tools/install/` (cli,
  fs, project, git, uninstall). The entry point drops 487 → 234 lines — back under
  the 280-line constitution and out of the tech-debt RED ZONE. Behaviour-identical
  (the integration test drives the real installer end-to-end). Renamed
  `require_basename` → `requireBasename` to satisfy the kit's own naming rule.
- **All git/node calls go through `execFileSync` (no shell)** in `claim` and
  `release` — consistency + defense-in-depth.
- **`tech-debt-scan --ci`** added (exits non-zero on any RED-zone finding) and
  enforced as a CI step, so the kit can't regress past its own line-budget limit.
- **Deepened tier-2 QA agents** (`qa-unit`, `qa-perf`, `qa-e2e`) with anti-pattern
  tables + operational guidance (mocking strategy; visual-regression note), and
  **sharpened routing boundaries** — `architect` (dependency fit) vs `security`
  (supply-chain risk); `test-engineer` (devteam, L<4) vs `qa-orchestrator` (L≥4
  entry point). Roadmap 1.0 #5.

### Deprecated
- `/state`, `/context-doctor`, `/context-refresh` now carry a deprecation banner
  pointing to `/audit` (still fully functional); `/release` is noted as paired with
  `/claim`. Non-destructive first step of the 1.0 surface-trim (#1).

### Fixed
- Tech-debt marker detector no longer flags its own doc comment (a false positive
  in every sweep).

### Docs
- **Roadmap:** marked the squad families as shipped (v0.5.2); set a **1.0 — harden
  & prove** milestone before any L7; added **dependency & supply-chain control**
  (owned by `security-team`) as a 1.0 item.
- `/git` command description said "skill"; corrected to "command".
- **Roadmap:** added a **diverse & visual testing harness** future direction —
  browser-driven visual / regression testing with a **Python** option (Playwright /
  Selenium), owned by `qa-e2e` + `design-team`, gating "done" in `/ship`.
- **CONTRIBUTING:** documented the **public contracts** (config schema, installer
  flags, hook payload, `contextkit/` layout, command/agent names) as the 1.0 stability
  promise — breaking changes need an ADR + `/contract-check` (roadmap 1.0 #4).

### Security
- **Closed a shell-injection vector in `worktree-new`.** The base-branch argument
  was interpolated into a shell string (`execSync(\`git ... ${base}\`)`), so a
  crafted value like `"HEAD; rm -rf ~"` could run arbitrary commands. It now uses
  `execFileSync('git', argv)` (no shell), so the argument is a single literal git
  revision and a malicious value simply fails as an invalid reference.

## [0.5.2] - 2026-05-22

### Added
- **Squads as a first-class concept** — `contextkit/squads/README.md` manifest
  (rosters, when-to-use, **sovereignty** rule, grow guide), `_BRIEFING.md.tpl`
  (optional two-tier rich briefings), and the `/squad` command (show/route/brief/
  new-squad). Agents are now grouped: **devteam** + **qa-team** (existing), plus
  **compliance-team** (`privacy-lgpd` — standardized Brazilian LGPD skills: legal
  basis, consent, Art. 18 rights, retention/deletion, DPO, ANPD incidents,
  processors), **design-team** (`ux-designer`, `ui-designer`, `accessibility`
  WCAG AA), and starters for **product-team** (`product-owner`) and **ops-team**
  (`devops`). README suggests further squads (docs/data/growth/support) as
  templates. Now 18 agent archetypes; all install at Level 4.

## [0.5.1] - 2026-05-22

### Added
- **Safe `--update`** — `npx contextdevkit@latest --target . --update` refreshes the
  engine, slash commands, agents, and hook wiring **for the project's CURRENT
  level**, and **never touches** user-owned content: `CLAUDE.md`, `contextkit/config.json`
  (level + overrides preserved), memory (ADRs/sessions/roadmap/glossary), pipeline
  tasks, or scoped module `CLAUDE.md` files. New seed artifacts are added
  write-if-missing. Any plain re-run also now preserves the existing level instead
  of defaulting to 2.

## [0.5.0] - 2026-05-22

### Added
- **Version-control skill** — `/git` command + `git.mjs` diagnostics. Codifies the
  workflow (Conventional branches/commits — already hook-enforced — feature→PR, no
  direct push to default, rebase-sync, conflict handling via pre-push) and the
  **remote setup**: detects git/repo/remote/provider and whether `gh`/`glab` are
  installed+authed, and guides connecting GitHub/GitLab/other (install the CLI +
  create the repo, private by default). Wired into `/setupcontextdevkit` (6b),
  `/aidevtool-from0` (6b), the installer hint, and `doctor` (notes missing remote).
- **Modular CLAUDE.md** — each app/module gets its own scoped CLAUDE.md (like the
  source platform's `apps/api/CLAUDE.md` + `apps/mobile/CLAUDE.md`). `claude-md.mjs`
  (find/scaffold) detects module roots (`backend/`, `frontend/`, `api/`, `web/`,
  `mobile/`, and `apps/*`/`packages/*`/`modules/*`/`services/*`), `/claude-md`
  scaffolds + fills them, a `CLAUDE.child.md.tpl` is seeded, and `doctor` notes
  modules missing one. Wired into `/setupcontextdevkit` (Phase 4b) + `/aidevtool-from0`.
- **Product roadmap as a first-class artifact**: seeded `contextkit/memory/roadmap.md`
  (P-ID format), `/roadmap` command (new project → build it WITH the user;
  existing project → find a roadmap/PRD/spec to import, or analyze the code and
  **propose** one + ask the user for objectives), and `roadmap.mjs`
  (find/status/init). Wired into `/setupcontextdevkit` (Phase 5b) and
  `/aidevtool-from0` (Phase 4); `doctor` notes when the roadmap is undefined.
- **`/aidevtool-from0`** — bootstrap an empty project from zero: intelligent
  interactive product questionnaire → product vision, stack suggestion/refine
  (ADR), product **roadmap** (P-IDs), best-practices constitution, and a seeded
  DevPipeline. First-run boot now routes empty projects here, existing ones to
  `/setupcontextdevkit`.
- **Best-practices skill**: `contextkit/best-practices.md` (file-size budget +
  **intelligent** refactor-by-responsibility, SoC, naming, errors, docs) and
  `/analyze-code-ia-practices` — runs the scanner then proposes the *right*
  refactor per file (never random splits). New `practices.active` config; boot
  reminds when active.
- **DevPipeline** (execution control, distinct from the product roadmap):
  `contextkit/pipeline/{backlog,testing,conclusion}/` task files + generated
  `devpipeline.md` dashboard; `pipeline.mjs` (`add`/`move`/`sync`) and the
  `/pipeline` manager command. Bugs/increments/chores + roadmap items broken into
  tasks with priority + SLA. Synced on pre-commit.
- **Concurrency hardening (L3)** — robust against parallel sessions on the same
  machine AND different devs/machines:
  - `concurrency-guard.mjs` (`PreToolUse`): warns before you overwrite a file
    another active session edited recently, or that changed on disk since you
    last wrote it (covers full-file `Write`, which Claude Code's `Edit` freshness
    check doesn't).
  - `pre-push.mjs` git hook: fetches the upstream and **blocks a push that has a
    real textual conflict** with what was pushed there (`git merge-tree`); warns
    on auto-mergeable overlap. Bypass: `CONTEXT_ALLOW_CONFLICT_PUSH=1`.
  - SessionStart now lists **other active branches** (local worktrees + recent
    remote branches with author/age) for cross-machine awareness.
  - New config `l3.mainBranch` (upstream the conflict check compares against).
- **`/ship` automatic checkpoints** — `--auto` runs the pipeline through
  objective gates (no manual pause), still stopping on a red gate and before any
  irreversible action.
- **L6 — Autonomy & Insight** (new level): `/ship` (autonomous squad pipeline:
  design → implement → review → test → record, with checkpoints), `/retro`
  (learning loop turning recurring drift/debt into rules + ADRs), `/context-stats`
  (platform telemetry). No new hook — a capability tier on top of L5.
- **Deterministic tech-debt scanner** (`tech-debt-scan.mjs` + `tech-debt-detectors.mjs`):
  generic regex detectors (line budget, SRP "And/Or/E" names, TODO markers,
  React state-loops). `/tech-debt-sweep` now runs the scanner, then interprets.
- **Generic contract-drift** (`contract-scan.mjs` + `/contract-check`): declare
  `l5.contractGlobs`, snapshot exported symbols, flag removals/renames. CI-able.
- **Platform metrics** (`stats.mjs`): sessions, drift rate, cadence, ADR/agent counts.
- **`instrucoes.md`** — pt-BR usage guide (kit root + installed into projects).
- **`docs/ROADMAP.md`** — architect gap analysis vs the source system + L6 + future.
- New config: `l5.lineBudget`, `l5.contractGlobs`. Level range is now 1–6.

### Changed
- `/audit` now runs doctor + stats + tech-debt-scan + contract-scan deterministically.

## [0.4.1] - 2026-05-22

### Added
- **QA squad Tier 2**: `qa-perf` (benchmark/profile a hot path) and `qa-e2e`
  (critical user journeys through the real UI) agents — now 12 agent archetypes.
- **Release workflow** (`.github/workflows/release.yml`): pushing a `v*` tag runs
  the test suite, publishes to npm via the `NPM_TOKEN` secret, and creates the
  GitHub Release automatically.
- README demo/walkthrough of the `/setupcontextdevkit` flow.

### Note
- First release cut by the automated tag pipeline (validating it end-to-end).

## [0.4.0] - 2026-05-22

### Added
- **QA squad** (Level 4): `qa-orchestrator` (router + sign-off) plus `qa-unit`,
  `qa-integration`, `qa-fuzzer` specialists, and the `/test-plan`,
  `/scaffold-tests`, `/qa-signoff` commands. New `qa` config section
  (`criticalPaths`, `coverageTarget`); `detect-stack`/`setup-complete` suggest
  and apply `qa.criticalPaths`.
- **`/audit`** — one-pass health audit (doctor + tech-debt + QA + drift) with a
  prioritized action list; README documents running it on a schedule.
- **GitHub templates** installed into the target's `.github/` (PR template +
  bug/feature issue templates), written only if missing.
- **npm packaging**: `prepublishOnly` gates publish on the test suite.

### Notes
- Now ships 22 slash commands and 10 agent archetypes. Agents install at L ≥ 4.

## [0.3.0] - 2026-05-22

### Added
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — runs the self-check and a
  full integration test on Node 18/20/22, plus a greenfield install smoke test.
- **`tools/integration-test.mjs`** — installs into a temp project and drives the
  real hooks through a true stdin pipe (drift block, L5 gate block + allow,
  first-run trigger, level rewire, doctor). Cross-platform, self-cleaning.
- **`/distill-sessions` + `/distill-apply`** — the auto-distill cycle the L5 Stop
  nudge referenced (propose CLAUDE.md refinements, then apply with an ADR).
- **`/context-doctor`** + `doctor.mjs` — diagnoses node version, config validity,
  hook wiring vs level, git hooks, memory scaffolding, and onboarding state.
- **`context-config.mjs`** — robust `show`/`set` backing `/context-config` (type
  coercion + optional zod validation), replacing free-form JSON editing.
- **Agent archetypes**: `test-engineer`, `security` (now 6 universal agents).
- **Installer**: `--help`, `--version`, `--uninstall [--purge]`, and a
  `.gitattributes` patch (keeps engine scripts LF on all platforms).
- **Packaging**: `files`, `repository`, `homepage`, `bugs`, and `npm test`.

### Notes
- `--uninstall` keeps your memory (`contextkit/memory/`) and `CLAUDE.md`; `--purge`
  additionally removes the engine, commands, and agents.

## [0.2.0] - 2026-05-22

### Added
- **First-run trigger** — the SessionStart hook surfaces a "First run" banner
  until onboarding completes, prompting `/setupcontextdevkit`.
- **`/setupcontextdevkit`** — one-shot self-configuring onboarding (detect stack,
  tune config, fill CLAUDE.md, seed glossary, scaffold agents, baseline ADR).
- **`detect-stack.mjs`** + **`setup-complete.mjs`** — read-only stack analyzer
  with suggested ledger/high-risk paths, applied via `--detect`.
- `npx github:reiTavares/ContextDevKit` import documented.

## [0.1.0] - 2026-05-22

### Added
- Initial release: portable, level-based (L1–L5) AI dev platform for Claude Code.
- Engine: 4 hooks (boot context, edit ledger, drift nudge, L5 risk gate),
  config-driven path classification, zero-dependency BOM-safe config loader.
- Installer with greenfield/existing detection and idempotent settings
  composition. 14 slash commands, agent archetypes, ADR/session/glossary
  scaffolding, and docs.
