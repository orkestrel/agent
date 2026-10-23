# Release wave — Mechanisms campaign (2026-10-23)

The live release wave of the Mechanisms campaign (`.orkestrel/plan.md` § Mechanisms campaign). Layers follow the catalog order: Ollama (L6), then Study (L7), then Agent's development re-pins. Publication is the user's decision and credential (`../scaffold/.agents/skills/orkestrel-publish/SKILL.md`).

| Layer | Package | Registry | Prepared | Bump ruling and evidence | State |
| --- | --- | --- | --- | --- | --- |
| 1 | `@orkestrel/ollama` | 0.0.24 | 0.0.25 at `067864c` ("Release 0.0.25"), local `main`, not pushed | bump: the visit (`wave.ts --visit`, all steps exit 0, overwrite `cd39e63`) ruled dist moved (the added server face) and runtime ranges moved (`@orkestrel/emitter ^0.0.12`, `@orkestrel/process ^0.0.15` added); `compare.js` exits 3, material; `prepublishOnly` passed in a live window on the pinned 0.40.8 runner (daemon owned by `OllamaDaemon` on port 11435) with `OLLAMA_MODEL=qwen3.5:4b-q4_K_M`: 84 of 84 service tests, 13 distribution tests in release mode | ready; waits on the user's window |
| 2 | `@orkestrel/study` | 0.0.2 | release units at `8e683ca`; visit, `@orkestrel/ollama ^0.0.25`, the 0.0.3 bump and `prepublishOnly` wait for layer 1 on the registry | bump expected: the merged S-T collaborator, the closure, exchange recording and replay, daemon staging | prepared up to layer 1 |
| 3 | `@orkestrel/agent` | 0.0.31 | development re-pins only (Study `^0.0.3`, Ollama `^0.0.25`), no bump; its `origin/main` CI stays red until then (`69c2c939` typechecks only against the pinned Study) | no runtime change | waits on layer 2 |

## Standing readings for this wave

| Reading | Evidence |
| --- | --- |
| On the Ollama 0.40.8 runner, the service default model `qwen3.5:2b-q4_K_M` writes its tool call as text in three tool-loop service tests (`tests/service/compaction.test.ts`, `lifecycle.test.ts`, `tools.test.ts`), consistently across reruns; `browser.test.ts` paging was flaky once and passed on rerun; `qwen3.5:4b-q4_K_M` passes all four; the code those tests exercise is unchanged since 0.0.24 (zero non-comment lines in `src/core` since `3582325`), so Ollama's CI service step, which uses the default model, is expected red until the default moves or the runner changes | `tmp/units/mech/live-window/prepublish-2026-10-23T18-07-41-167Z.log`, `…18-14-14-019Z.log`, `…18-16-53-609Z.log`, `…18-18-07-414Z.log` |
| Study's 14 old worktrees under `../study/tmp/worktrees/` are inventoried (`tmp/units/mech-s-release-report.md` § Worktree inventory): `compaction-output` and `promotion-final` are named by old series custody records; none is removed without the user's ruling | `tmp/units/mech-s-release-report.md` |
