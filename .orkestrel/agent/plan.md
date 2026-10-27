# Agent campaign record

Closed 2026-10-27. Read this file first when resuming Agent work; it is the only live record. Everything earlier is in git history (see Resume).

## Outcome

The boost campaign tried to improve Agent's memory (the Ledger briefing and compaction) on the endurance study. No experiment showed a measured benefit, so only the defects it exposed shipped (user rulings U44, U45).

Agent 0.0.32 is published (release commit `785d7eec`). Against 0.0.31 it changes:

- **D1:** the Ledger keeps every live sentence. An accepted correction no longer withdraws sentences that merely share an id with it. Each amendment renders as a deterministic, repeatable numbered reference with an annotation. New: `collectAmendments`, `LedgerAmendment`, `LedgerRenderContext`, `buildLedgerRenderContext`, `renderLedgerAnnotation`. Removed: `collectStale`, `LedgerStaleSentence`. `LedgerProjection.stale` became `amendments`.
- **D2:** `selectRecords` renders owner records with the same ordered member ids once, with titles joined by `; `.
- **Errors:** `LedgerError` code `REFERENCE` reports a render context that lacks a source reference.
- **Tests:** the foreign-signal fixture is refused on both Node 22.18 and 24.
- **Tooling:** scaffold 0.0.107.

## Removed experiments

Each one is gone from `src/` and the bench, and is recoverable from git.

| Idea | What it did | Why removed |
| --- | --- | --- |
| R1 `recent` + `pins` | recent history in the tail | no measured benefit |
| R2 `work` + `names` | carried the agent's earlier draft | no measured benefit; the R2 screen refused on its first case (the model called `recall` instead of answering); instrument archived in `44cea048` |
| R3 `link` | owner linking by lookup subject | inert on both instruments |
| R-L1 `lexical` (BM25) + D3 | lexical discovery and ranked recall | acted weakly; D3 only fixed its own branch |
| Selection receipt (W12) | per-pass selection record | measurement-only |
| D1 judge-per-sentence (U27, U28) | semantic stale withdrawal | calibration failed; replaced by the preservation fix above |
| Bench-only checks (Q1, Q3a, R4a, R4b, R5a to R5c, R-Q5, R-Q7, S5) | study treatments and readings | no product change; bench removed with the strip |

Strip commits: `eaee19c1` (Study ^0.0.4), `7869a1be` (bench), `6c6c06fd` (product), `ea921627` (`REFERENCE` code).

## Open items

1. **Study 0.0.5** (in progress at closing): runtime dependency on `@orkestrel/agent` ^0.0.32, its EOF cancellation fix, and scaffold 0.0.107. Then visit, gate, push and publish with the user's OTP.
2. **After Study 0.0.5 publishes:** Agent's devDependency `@orkestrel/study` goes to ^0.0.5. Commit and push; no Agent release.
3. **Optional, needs a new plan and the user's model budget:** measure 0.0.32's D1 and D2 effect on the endurance study before proposing any new experiment.
4. **Not Agent's:** Supervisor's `>=22.20.0` engines floor (user excluded it); Veneer's S5 registry refresh.

## Rules for future Agent work

- **Law:** read `../scaffold/AGENTS.md` and what it points to (`.agents/orchestration.md`, `.claude/rules/`, the dispatch skill) and follow it. Every subagent prompt carries the user's sentence: "Make sure you thoroughly read the AGENTS.md in the neighboring scaffold folder along with the files that it points to especially the rules/agents/skills and follow them strictly, especially in regards to repo structure."
- **No bloat:** ship fixes only. An experiment without a measured benefit leaves `src/` together with the bench code that serves it. Plan every experiment's removal before building it.
- **Node:** 22.18.x to 24.x only. Release gates run `prepublishOnly` on portable Node 22.18.0 (`tmp/runtimes/node-v22.18.0-npm11-win-x64`). Spawn npm through `npm-cli.js`; Node refuses `.cmd`.
- **Processes:** one process-running lane on the host, the Orchestrator included; the user has had to kill terminal floods. Read-only lanes use file tools without a shell. The shared lane with Veneer changes hands only by an explicit, process-backed return. Give a background command a tool timeout above its own cap.
- **Ollama:** never contact the user's daemon on 11434. Set `$env:OLLAMA_HOST = 'http://127.0.0.1:1'` as its own statement before every node or npm command. GPU work runs only on the dedicated 11435 daemon, by the Orchestrator, after notifying the user and checking the latest stable release.
- **Secrets and oracle:** never read `.env*`, `.npmrc`, `auth.json`, keys or tokens, or `studies/endurance/sources/private/`.
- **Git:** path-limited commits (`git commit -m "…" -- <paths>`); no amend, force or `git add -A`; local `file:` pins are never committed.
- **Publishing:** the user runs `npm login`; uploads go only through `node node_modules/@orkestrel/scaffold/dist/agents/skills/orkestrel-publish/scripts/window.js --publish <dir> --otp <code>`, then `--confirm`. Release order: Agent, then Study (its runtime dependency on Agent moves), then Agent's devDependency on Study.
- **Native code:** no FFI, addons or compiled helpers.
- **Engines:** Codex through T3 `delegate_task` first (Sol builds, Astra designs and reviews, Luna verifies). Codex children read files only through a shell. The fallback is in-process Claude lanes, which open no windows. The Codex limit resets on 2026-11-02.

## Resume

- Start with this file and `git log --oneline -20`.
- Full campaign records as they stood before this cleanup: `git show 152ac3c3:.orkestrel/agent/<file>` for `plan.md` (rulings U1 to U45), `ledger.md` (every dispatch), `boosts.md` (every idea and reading), `evidence.md`, and the `r2-*.md` rulings and ledger.
- Published 0.0.31 source, the strip baseline: `df795dc7`.
