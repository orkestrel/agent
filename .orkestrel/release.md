# Release wave: Agent 0.0.35

The user publishes every layer. `agent/plan.md` § Release owns the steps.

## Scope

`@orkestrel/scaffold` `.agents/skills/orkestrel-publish/references/wave.md` § Close the wave narrows from every catalog package to `@orkestrel/agent` and its related packages, the scope of `agent/plan.md` O69: Agent's runtime and development dependencies, its dependents `@orkestrel/ollama`, `@orkestrel/toolbox`, and `@orkestrel/study`, and the `@orkestrel/mcp` fixture.

## Layers

The order is `agent/tenets.md` § Release, and each version bumps from what the registry serves at that layer.

| Package | Version | Bump | Evidence | Round |
| --- | --- | --- | --- | --- |
| `@orkestrel/ndjson` | 0.0.15 | bump | a dependency Agent's release adds, ahead of Agent | landed 2026-11-01 |
| `@orkestrel/agent` | 0.0.35 | bump | runtime set adds `@orkestrel/ndjson` ^0.0.15, which the 0.0.34 manifest does not name; `compare.js --tarball` against the tarball rc-ol1 proved reads exit 0 with 4 published files, 0 added, 0 removed, and 0 changed | published 2026-11-03, registry-confirmed, `main` pushed at `ce059cfe` |
| `@orkestrel/ollama` | 0.0.29 | bump | runtime ranges move, `dist` moved | published 2026-11-03, `main` pushed at `6f8b522` |
| `@orkestrel/toolbox` | 0.0.24 | bump | runtime `@orkestrel/agent` range moves, `dist` same; pin only, because its census reads no consumer of the renamed names (the word `Reading` in a comment at `tests/policy.test.ts` line 932 is the one hit; Y33) | published 2026-11-03, `main` pushed at `464e737` |
| `@orkestrel/study` | 0.0.10 | bump | runtime `@orkestrel/agent` and `@orkestrel/ollama` ranges move, and `buildStudyAgentAttempts` renames a public function | published 2026-11-03, `main` pushed at `ecb81e4` |
| Agent's trailing development dependencies | `@orkestrel/ollama` ^0.0.29 and `@orkestrel/study` ^0.0.10 | no bump, `compare.js` reads 0 changed | § Close the wave; the sweep lists no trailing range in the release's packages | re-pinned as `dc0fec6f` |

`@orkestrel/mcp` holds no place in the order and takes no release (`agent/plan.md` § Release).

## Surface

`scaffold surface` at the release visit reads exit 0 with 0 collisions and 0 conflicts, with `AnswerMeasure`, `measureAnswer`, `ClassifierAttempt`, `LedgerLookupFinding`, and `requireCumulative` each listed once under `agent` (Y33). `scaffold surface` reads 9 signature-similarity advisories on `MemoSnapshotRow` and `MemoStoreInterface` against peers; each is the same row-and-store shape by design, so no rename.

## Standing readings

`test:studies`'s one known failure closed at Agent's closing development re-pin: 161 pass in full, and `npm ls @orkestrel/ndjson --all` lists one 0.0.15. RELEASE: LANDED.
