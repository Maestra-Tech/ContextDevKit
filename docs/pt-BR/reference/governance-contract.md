# Contrato de governança

Esta é a referência pública resumida da governança ContextDevKit 4.

## Eventos

```text
prompt-preflight
write-preflight
postflight
completion
```

Cada evento usa um dispatcher central com deduplicação, timeout, budget, proteção de reentrada e circuit breaker.

## Modos

```text
off | shadow | canary | guarded
```

Config ausente/inválida e falha interna degradam para `canary/continue`.

## Mensagens visíveis

Um gate só fala através da sua observação. A observação pode carregar
`visibleMessage` e `problemKey`; o ponto de política copia ambos apenas para
vereditos `warn` ou `deny`, nunca para `allow` ou `silent`. O runtime renderiza
uma mensagem por sessão por `problemKey`.

Produtores de observação no runtime:

- `write-preflight` calcula `simulation` quando Edit/Write/MultiEdit/NotebookEdit
  mira um caminho em `l5.highRiskPaths` ou `l5.contractGlobs`: `passed` se uma
  predição em `memory/predictions/` cobre o caminho para a sessão atual (ou foi
  escrita hoje); senão `violated`, com o caminho e o comando `mark-simulation.mjs`.
  Fora das listas não há observação; o gate continua canary.
- O contexto de sessão, compactação e handoff termina com o bloco `Owner guidance
  (recommendation-only)`: preferências explícitas do owner e ponteiro para
  `personalization.md`. Preferências inferidas nunca aparecem; o bloco não autoriza.

## Allowlist guarded

Somente:

| Gate | Momento | Predicate de negação |
| --- | --- | --- |
| `qa-signoff` | completion | violação determinística/aplicável/evidenciada ligada à transição `done` |
| `ddd-invariants` | write-preflight/completion | invariante Classe A aplicável e comprovado |
| `technical-debt` | completion | dívida nova high/critical introduzida pelo diff atual |

`architecture-debt` é canary e `privacy-lgpd` é shadow por padrão.

## Owner

`humanAuthority` padrão: `owner-wins`.

Override guarded exige metadata de ator, razão, escopo, policy version/hash, revisão base, timestamp, expiração e outcome. Override não reescreve evidência.

## Falhas

`unknown`, `skipped` e `error` não são PASS; também não negam sem predicate guarded completo.
