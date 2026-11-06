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

Done on this side, after `learn`'s scored run. The sweep after `browser` read 133 trailing ranges in 44 of 45 packages, all `devDependencies`, none runtime or peer. `agent`'s three went at `b5ae7940`, and the other 42 packages each committed `Re-pin <names> development ranges` with their gates green and `compare` ruling no bump, so no upload. Each also ran `scaffold catalog`, because the re-pin leaves tracked guide mirrors and `.claude/agents/orkestrel.md` behind and the gates don't notice. `mcp`'s composition test moved to `agent` 0.0.36 at the commit after its re-pin: 0.0.36 refuses tools with no authority, so its fixture's agents now pass one.

The last sweep lists only `scaffold`'s three ranges, which are its session's. These re-pin commits are local, and each goes out with that repository's next release.

`scaffold`'s re-pin is committed locally by its session and owes a bump, because scaffold writes those ranges into what it publishes. By the user's word of 2026-11-05, 0.0.125 holds for the debrief's second pass, which ships a scaffold release anyway, so the fleet pays for one round. Until then published 0.0.124 plans `guide` ^0.0.29, `probe` ^0.0.28, and `browser` ^0.0.31 for generated workspaces.

§ After this wave records the fleet round that closed it, on 2026-11-06, and the push still waiting on the user's answer.

## After this wave

M3 found a defect in `interpret` 0.0.20, so `interpret` took 0.0.21 at `267fbdb` and `brief` took 0.0.16 at `d81c5e2`, both published 2026-11-05 with `main` pushed. `tmp/learn/rulings-m3.md` Round 10.

`interpret` took 0.0.22 at `050372c` and `brief` took 0.0.17 at `400b633`, both published 2026-11-06 with `main` pushed, for a word before a sentence-end period that wasn't read. S3, the field word, fails the bar its design set, and goes out as an exception the user accepted by releasing it. `tmp/learn/rulings-m3.md` Round 13.

`scaffold` 0.0.125 landed at `ec7a6a121`, registry-confirmed 2026-11-06T13:28:22Z, carrying the debrief's second pass. That left the one fleet round, which the scaffold session ran by the user's word: "Once done done repin then overwrite and reconcile all packages with the new scaffold."

### The fleet round

Eight packages owed a bump. All 8 went up on one code, confirmed 2026-11-06T15:31:33Z, each repository's `main` pushed with no tags:

| Package | Version | Head |
| --- | --- | --- |
| `csv` | 0.0.13 | `a6dc627` |
| `msg` | 0.0.16 | `680b8f8` |
| `table` | 0.0.15 | `406cc63` |
| `capture` | 0.0.4 | `80e5fa1` |
| `sea` | 0.0.22 | `0d9f71a` |
| `middleware` | 0.0.28 | `7f30249` |
| `worker` | 0.0.20 | `189f257` |
| `study` | 0.0.12, which also carries `c2d549b` | `cf094c6` |

Each ran its whole `prepublishOnly` chain with a real `npm ci`. An independent read from this repository's side, on the registry and the tarballs, found all 8 clean: digests, file lists, manifests against the named commit, entry points, served ranges, and `compare.ts --version` at 0 changed.

- **No bump, 43:** every other catalog package besides `scaffold`, re-pinned and overwritten on 0.0.125 with gates green. `test` stays at 0.0.33 with its `playwright` peer back at `^1.64.1` at `8215799`, since raising it serves no consumer and would owe another fleet round. `mcp`'s `fb9ecff` replaces a fixed delay with a wait in a test.
- **`agent`:** the last trailing range, `study` ^0.0.12, re-pinned at `2bd2f511`, no bump.
- **The closing sweep,** 2026-11-06T15:38:11Z at that commit: 414 `@orkestrel` runtime and development ranges across all 52 catalog packages, 0 trailing, and every manifest version equal to what the registry serves.
- **Out of the round, by the user's word:** `supervisor`, `veneer`, and `learn`.

### Stops and what's owed

- **`scaffold` holds at 0.0.125.** Its catalog table and mirrors trail the 8 until its next release, and a 0.0.126 now would leave every package's scaffold range trailing for no consumer. Reopens at the next release `scaffold` has a reason of its own to make.
- **The push is the user's, and unanswered.** The 43 no-bump repositories, `scaffold`'s 2 roadmap commits, and `agent` stay unpushed, and silence is no yes. `interpret`'s `main` also holds `5176ceb` and `8ee6bdd`, which change only `.orkestrel/limits.md`, because law G failed its sealed cost cap and no code landed, so any push there is one more records push and needs no special hash.
- **Further uploads wait** for the user's return, because each needs their code.

RELEASE: LANDED
