# Release wave: the refuse-by-default family

The user publishes every layer. `plan.md` § Sequence owns the order, and the earlier wave's record is in this file's history.

## Scope

45 packages: the 16 this campaign hardened, their runtime closure, and their development tools, with `@orkestrel/scaffold` first on its own account. The user approved `--regenerate` for the whole wave. Every version bumps from what the registry serves at its layer.

## Layers

All published 2026-11-05, registry-confirmed by tarball, and each repository's `main` pushed afterward.

| Layer | Packages |
| --- | --- |
| Scaffold, by its own session | `scaffold` 0.0.123, then 0.0.124 |
| Contract | `contract` 0.0.22 |
| 1 | `abort` 0.0.16, `budget` 0.0.17, `codec` 0.0.9, `emitter` 0.0.15, `html` 0.0.15, `indexeddb` 0.0.17, `jsonrpc` 0.0.2, `ndjson` 0.0.16, `sqlite` 0.0.17, `test` 0.0.33, `timeout` 0.0.16 |
| 2 | `console` 0.0.19, `database` 0.0.21, `form` 0.0.16, `markdown` 0.0.20, `pool` 0.0.20, `process` 0.0.18, `reason` 0.0.17, `router` 0.0.20, `sse` 0.0.13, `template` 0.0.13, `tool` 0.0.22, `websocket` 0.0.18 |
| 3 | `guide` 0.0.30, `interpret` 0.0.20, `lsp` 0.0.14, `qualifier` 0.0.21, `queue` 0.0.20, `rater` 0.0.21, `relation` 0.0.19, `server` 0.0.26, `terminal` 0.0.23, `workspace` 0.0.15 |
| 4 | `brief` 0.0.15, `mcp` 0.0.42, `program` 0.0.20, `workflow` 0.0.26 |
| 5 | `agent` 0.0.36 |
| 6 | `ollama` 0.0.30, `toolbox` 0.0.25 |
| 7 | `study` 0.0.11 |
| Held back by take-up repairs, then last | `probe` 0.0.29 at `3fba544`, `browser` 0.0.32 at `a915e66` |

## Deviations

| Package | What departed | Standing |
| --- | --- | --- |
| `ollama` 0.0.30 | Uploaded without `test:service`, because the wave's `release-prep.ts` hard-coded its steps and `window.ts` uploads with `--ignore-scripts`. A census of every `prepublishOnly` found only this one: 42 of 45 match the chain, `browser` caught it in time, and `scaffold`'s session confirmed its plans ran `test:templates` | Closed: run after the upload on the release tree, on the screened 0.40.14 runner at 11435, 89 of 89 in 513 s. No new release. The source's last live proof was at `bf6fbfc`, also 89 |
| `agent` 0.0.36 | Gates ran on a staged `study`, because they need an API that wasn't yet published | Closed at `b5ae7940`: the whole chain passes on published `study` 0.0.11 and `ollama` 0.0.30, and `compare` reads no bump |
| `browser` 0.0.32 | Distribution ran in default mode: 15 passed and 9 skipped. Under `--mode release` the same 5 host-bound cases fail, for want of `/proc` or a filesystem FIFO, and the other 15 pass | Standing Windows reading, the precedent of 0.0.28 to 0.0.31. `test:service` passed 257 and 6 skipped |
| `browser` 0.0.32 | `playwright` held at `^1.64.1`. Upstream's 1.65.0 went up with no `playwright-core` behind it for about two hours, and was deprecated meanwhile | Upstream repaired it the same day. The round stays on `^1.64.1`, whose caret admits 1.65.0, and a later wave moves them together |

## Repairs the wave made in packages

Each came from a chain or visit run, and each that changed behavior under test closed with a mutation probe.

- `sqlite` `ba3bc8b`: the guide test's `using` replaced by a direct dispose.
- `mcp` `7534aa4`: the distribution test's overrides and composition moved to served ranges.
- `probe` `0028c5a`, `389dd1a`, `0b57444`: take-up of `mcp` 0.0.42 and `tool` 0.0.22. `3fba544`: the boot-dependency test counted the boot's own specifications, so it read three files or none and never two. A test defect, not a boot failure; the budget `2aaa3cd` widened on a wrong reading went back.
- `browser` `eec33ff`: tool's door taken up, with the vocabulary tools keeping their own parsers through `strict: false`. `cabf39e`: two fixtures declare what they send. `a915e66`: the version stamp in `BROWSER_HAR_CREATOR` and its guide row.

## Close

Open. The sweep after `browser` read 133 trailing ranges in 44 of 45 packages, all `devDependencies`, none runtime or peer. `agent`'s three are done at `b5ae7940`, which leaves 130 in 43: `probe` in all of them, `guide` and `scaffold` in 34, `test` in 11, and `browser` in 8. `scaffold`'s own ranges are its session's. The 34 moving `scaffold` also take its overwrite. `mcp`'s composition test moves to `agent` 0.0.36 with them.

By the Orchestrator's order of 2026-11-05, `learn`'s scored run goes first, since it needs an unbroken lane and depends on none of this. No range ships, so no upload is expected unless a ruling finds a moved `dist`.

RELEASE: OPEN
