# Release wave: Agent 0.0.35

The user publishes every layer. `agent/plan.md` § Release owns the steps.

## Scope

`@orkestrel/scaffold` `.agents/skills/orkestrel-publish/references/wave.md` § Close the wave narrows from every catalog package to `@orkestrel/agent` and its related packages, the scope of `agent/plan.md` O69: Agent's runtime and development dependencies, its dependents `@orkestrel/ollama`, `@orkestrel/toolbox`, and `@orkestrel/study`, and the `@orkestrel/mcp` fixture.

## Layers

The order is `agent/tenets.md` § Release, and each version bumps from what the registry serves at that layer.

| Package | Version | Bump | Evidence | Round |
| --- | --- | --- | --- | --- |
| `@orkestrel/ndjson` | 0.0.15 | bump | a dependency Agent's release adds, ahead of Agent | landed 2026-11-01 |
| `@orkestrel/agent` | 0.0.35 | bump | runtime set adds `@orkestrel/ndjson` ^0.0.15, which the 0.0.34 manifest does not name; `compare.js --tarball` against the tarball rc-ol1 proved reads exit 0 with 4 published files, 0 added, 0 removed, and 0 changed | release commit written, the upload is the user's |
| `@orkestrel/ollama` | 0.0.29 | bump | runtime ranges move; comparison owed at its visit | open, second |
| `@orkestrel/toolbox` | served plus one | bump | runtime `@orkestrel/agent` range moves; pin only, because its census reads no consumer of the renamed names (the word `Reading` in a comment at `tests/policy.test.ts` line 932 is the one hit; Y33) | open, second |
| `@orkestrel/study` | served plus one | bump | runtime `@orkestrel/agent` and `@orkestrel/ollama` ranges move; comparison owed at its visit | open, third |
| Agent's trailing development dependencies | the § Close the wave sweep names them | ruled per package | § Close the wave | open, last |

`@orkestrel/mcp` holds no place in the order and takes no release (`agent/plan.md` § Release).

## Surface

`scaffold surface` at the release visit reads exit 0 with 0 collisions and 0 conflicts, with `AnswerMeasure`, `measureAnswer`, `ClassifierAttempt`, `LedgerLookupFinding`, and `requireCumulative` each listed once under `agent` (Y33). `scaffold surface` reads 9 signature-similarity advisories on `MemoSnapshotRow` and `MemoStoreInterface` against peers; each is the same row-and-store shape by design, so no rename.

## Standing readings

`test:studies` fails exactly `loads the actual q4 native topology with two distinct captured Agent occurrences` (`tests/studies/memory/integration.test.ts`) from the install of `fb653af8` until Agent's closing development re-pin. `agent/plan.md` § Release holds the cause and the acceptance that closes it.
