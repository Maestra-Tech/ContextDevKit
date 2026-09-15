# Canonical work lifecycle

ContextDevKit 4 governs mutation, not conversation.

```text
interaction
├── conversation  -> no-op
├── exploration   -> no-op
├── unclassified  -> one short clarification, no persistence
└── mutation
    -> resolve existing work
    -> classify nature
    -> select direct | batch | workflow
    -> load governed context when linked
    -> implement
    -> test
    -> QA when applicable
    -> complete
```

## Intake

Conversation and read-only exploration create no task id, contract, Business,
Operation, workflow, batch, run, receipt, or memory record. A request that is
still ambiguous gets at most one short question in the user's language.

A real Edit, Write, or other governed-state mutation is authoritative evidence
of mutation and promotes the interaction once. Documentation, configuration,
and memory writes are not exempt.

## Existing work first

Mutation intake resolves existing work before creating a durable context:

- an explicit active id resumes that work;
- one strong inferred match asks one short confirmation unless the owner
  explicitly requested auto-resume;
- multiple matches ask which one;
- completed work stays closed unless the owner explicitly requests reopening;
- only a `new` result reaches a creator.

Business, Operation, Workflow, and Task identities come from their canonical
stores. Intake never builds a second registry by scanning Markdown.

## Nature and shape

Nature is one of `business`, `operation`, `none`, or `unclassified`:

- `business` requires a durable strategic capability or decision with outcome,
  sponsor, measure, and horizon;
- `operation` requires durable maintenance, incident, refactoring, or operating
  capability inside an existing system;
- `none` is normal for a focused feature, bug fix, document, or technical edit;
- low confidence or classifier error is `unclassified`, never a default
  Operation.

Execution shape follows topology:

- `direct`: one to three cohesive tasks;
- `batch`: four to twelve related tasks without strong ordering;
- `workflow`: dependencies, waves, required ordering, multiple sessions,
  cutover, rollback, or an explicit workflow request.

Business, architecture vocabulary, ADRs, and compliance words do not by
themselves force a workflow.

## Governed context

Before the first write of a linked workflow, the loader reads the complete
canonical pack: `workflow.json`, `workflow-state.json`, PRD, SPEC, decisions,
`pipeline/tasks.json`, referenced reports, and optional continuation guidance.
The loader runs on start, resume, and handoff/compaction. It never asks the model
to create a manual “I read it” receipt.

Invalid JSON is surfaced for repair. Missing required scaffold is repaired only
through the explicit v2 repair command; runtime has no automatic reader for
retired plans, frontmatter state, physical stages, or path-based completion.

## Authored documents

A new workflow seeds `spec.md` with the method fields: Problem, Expected
behavior, Domain rules and invariants, Data, Interfaces and contracts, Edge
cases, Acceptance criteria, Expected tests, plus Impact analysis and Development
sequence. `advance` refuses to leave `prd` while Problem or Goals are empty and
refuses to leave `spec` while any of the eight method sections is absent or
empty; the refusal names the sections. `--force` is the only override and it is
explicit in the command line.

## Completion receipt

`complete` requires, besides the QA status and evidence, a `--reviewer` distinct
from `--author` and a fenced ` ```proof-of-done ` block in the closeout report.
The block lists the twelve items `typecheck, lint, affected-tests, regression,
migrations, runtime-check, logs-sanitized, main-flow, edge-cases,
acceptance-review, diff-review, architecture-review`, each as
`<item>: passed <note>` or `<item>: skipped <reason>`. A missing item, a `failed`
item, or a `skipped` without a reason refuses completion; nothing is inferred as
passed. The parsed items and the reviewer persist in `workflow-state.json.qa`.

## State transitions

Task state lives only in scoped `pipeline/tasks.json`. Workflow aggregate state
lives only in `workflow-state.json`. Markdown is a derived projection.

Task transitions use validation, an exclusive lock, compare-and-swap revision,
and atomic replace. A status change and its audit event commit together. QA may
deny only the `testing -> done` completion when an applicable deterministic
violation is evidenced. A scoped owner override is sufficient; no autonomy
grade, agent receipt, council, or quorum is required.

`log-session` is optional post-work bookkeeping for productive mutation. It is
not part of conversation/exploration and does not authorize implementation.

## Ciclo canônico de trabalho (pt-BR)

O ContextDevKit 4 governa mutação, não conversa. Conversa e exploração somente
leitura não criam task, contrato, Business, Operation, workflow, batch, run,
recibo ou memória. Intenção ambígua recebe no máximo uma pergunta curta no
idioma do usuário.

Uma tentativa real de escrita promove a interação para mutação uma vez. Antes
de criar contexto durável, o intake procura trabalho existente: id ativo
explícito retoma; um match forte pede confirmação curta; vários matches pedem a
escolha; trabalho concluído não reabre sem pedido explícito; somente `new` chega
ao creator.

A natureza é `business`, `operation`, `none` ou `unclassified`. `none` é comum.
A forma é `direct` para uma a três tarefas coesas, `batch` para quatro a doze
tarefas relacionadas sem ordem forte e `workflow` para dependências, waves,
multissessão, cutover, rollback ou pedido explícito.

Antes da primeira escrita de workflow, o loader entrega `workflow.json`,
`workflow-state.json`, PRD, SPEC, decisões, `pipeline/tasks.json` e reports
relevantes. Não há fallback para plano v1, frontmatter ou lanes. O `done/`
delimitado pode localizar um pacote concluído, mas nunca determina seu estado:
`workflow-state.json` continua sendo a autoridade.

Tasks vivem somente em `pipeline/tasks.json`; estado agregado do workflow vive
somente em `workflow-state.json`; Markdown é projeção. Transições usam lock,
CAS e replace atômico. `log-session` é registro opcional depois de mutação
produtiva, não uma pré-condição de autorização.
