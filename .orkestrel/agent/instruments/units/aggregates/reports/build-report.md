`report.ts` and its test are written. The test file passes (exit 0), but the `tsc` project check exits 2, and none of the 35 errors is in my files.

**Files written**
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/report.ts`: the metrics and stopping-verdict script.
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/report.test.ts`: 34 cases, run as a child process against fixture run directories the test writes. A fetch blocker is preloaded for `:11434`, and no fetch is made.

**Proof commands, run from the harness directory**
- `node --test bench5/tests/report.test.ts` exits 0. The last lines read `# tests 34`, `# pass 34`, `# fail 0`.
- `node /home/user/scaffold/node_modules/typescript/bin/tsc -p /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tsconfig.json` exits 2 with 35 errors. All are in `bench5/shadow.ts` and `bench5/tests/shadow.test.ts`, the shadow unit's files, and none names `report.ts` or `report.test.ts`. They are missing `Shadow*` exports in `bench5/types.ts` and the implicit `any` that follows from them. I filtered the output with `grep -v shadow` to confirm that. `tsc` stays at exit 2 until the shadow unit's types land, then I can rerun it.

**Deviations**
- **Types and constants live in `report.ts`.**
  - Expected: shared types in `bench5/types.ts`.
  - Found: report-only types, such as `Run`, `Leak`, and `PairReport`, and constants, such as `RUN_PREFIX`, sit in `report.ts`. It reuses `Row`, `SelectionRecord`, `CallRecord`, and `AggregateRow` from `types.ts`, as `Pick<>` types.
  - Evidence: `seams.ts` and `copies.ts` do the same, and `documentation.md` lets an executable script keep its own types. I did not edit `types.ts`, which I don't own. The type-consolidation unit can move these types.
- **I added a `--copies DIR` flag.** The brief's usage line has no such flag. It defaults to `bench/variants/long`, and the proof points it at a fixture copy (like the `--cache`, `--fit`, and `--settings` flags in `Driver.ts`).
- **The verdict also reads STOP on any invariant failure.** The brief says STOP only when `mean + 2·sd/√n < 0`. I follow the series stopping rule, which also stops on an invariant. The reason is printed, for example `verdict STOP (invariant soleScored, plan)`.
- **REFUSED is a third verdict.** It replaces CONTINUE when most aggregate-arm goals rendered no topic (F6). A STOP stays STOP.
- **Exit 1 covers more than a missing or short run.** It also covers a run whose `run.json` status isn't `complete`, a pair with `judge.transient > 0` (F4), arms that served different goals, and a goal absent from the scenario copy. Each is printed as `REFUSED PAIR: reason`. The other pairs still print.
- **Audited ends are not computed.** The brief excludes the audit. Bounds are scorer-end only and the output says so.

**Rulings applied**
- **F1:** the scored-leak audit scores each goal's expected phrases, `expectedAny`, forbidden phrases, and `forbiddenPatterns` over the rendered summaries text and the shown text. The shown text is the system text, every instruction except the summaries, and the briefing and tail of every pass. It records `soleScored` and `soleStale`. A nonzero value of either is a stop invariant, beside the sole-token count. The test covers a sentence-initial name (`Adeyemi`), `WKND15`, `LATE10`, and an `any of` match.
- **F2:** the g01 invariant compares the first pass's first select only (briefing text and tail). The scale drift check is `|Δscale| / scale > LEDGER_SCALE_DRIFT`, using the vendored constant. The per-goal briefing-token difference and tail-digest equality are reported.
- **F3:** the tail comparison uses seed index, role, and content, never message ids.
- **F4:** a pair with a nonzero transient judge count is refused.
- **F6:** the share of goals with zero rendered topics is reported, split into withheld and cut.
- **F7:** the aggregate-stage wall invariant is implemented.
- **Prompt counts:** they come from the wire files joined by sequence to `calls.jsonl` agent rows. The test proves that calibration and summarizer prompts are excluded. Without a wire folder it falls back to the row's `prompt`.
- **Attack fix (recall):** it reports d split by goals where recall closed only in the aggregate arm. The per-cause counts of closed recalls, `limit` and `room`, are included. First-call prompt drift is reported but is not an invariant.
- **Attack fix (naming):** it reads the `aggregatefill` folder name for a copy that fills the caches.

I need no ruling.
