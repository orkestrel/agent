# U8 probe review (reviewer, objective lane, 2026-10-09)

1. **Claim 1 holds: N1 to N7 remove only the listed bytes, and none hides a different defect.**
   - All seven reductions in `/home/user/agent-port-gauge/tmp/probes/ledger-replay-compare.ts` run on the recorded body only. The port body from `buildPortBody` (`ledger-replay-compare.ts:323-339`) is never normalized. A port line that leaks a lead, such as `m12: X`, still differs from the reduced recorded `X` and fails.
   - Per normalization:
     - N1 swaps the first `\n\n\n\n` for `\n\n` (`:205-213`).
     - N2 removes the exact `HANDLE_SENTENCE`, which matches `bench.mjs:855`.
     - N3 is anchored at the start of a tool message (`:97`).
     - N5 removes one trailing mark (`:98`), so a second mark still fails.
     - N6 replaces exact strings (`:105-111`), so a partial match still differs.
     - N4 and N7 use one regex (`:99`) that removes only an `mN: ` lead or an `rN ` before `name {`.
   - I found no input that a listed normalization alone wrongly accepts. A separate, unlisted reduction does accept bad input; see outside finding A.

2. **Claim 2 fails: the probe applies the R2a label to recall results and digest notes, which are not the audited R2a path.**
   - `ledger-replay-compare.ts:146-169` and `:218-226` apply R2a only to tool messages and digest notes. `:208` turns R2a off for the briefing (`residuals: false`).
   - The design places R2a in the briefing render: `records-port-planner.md:87` (`#ruled`, `#render`, `#renderRecords`, `bench.mjs:2224-2324`). The audit says the same: `records-candidate-audit-verdict.md:16` ("an unscoped request ... renders m22's ESC-2291 raw … neither path occurs"), and `records-port-plan.md:41`.
   - So every residual labelled R2a is a stale-sentence removal on a recall or digest route. That is a port departure the plan never lists as a residual. The only text that could cover it is `records-port-planner.md:257` ("removed from every route").
   - The predicate is also the scorer's fixed `STALE` table (`bench.mjs:834`, read by `countStale` at `:3121`). It is not the corrections the run decided. A port that drops an `MX-4471` sentence from a non-governing seed line for any reason is accepted.
   - **Required change at `ledger-replay-compare.ts:183` and `:208`:** report recall and digest stale removals as unlisted, with their diff and a hypothesis, as the brief's Scope requires. The alternative is an Orchestrator ruling that brings recall and digest under R2a; I refer that ruling to the Orchestrator with this evidence.
   - F4a holds. `bench.mjs:3414` already removes this request's calls from the collapsed answer pass. That leaves only seed call and tool messages, which are exactly what `:283-295` removes.

3. **Claim 3 fails: the judge transport accepts bodies that have no recorded twin.**
   - **(a) Held path, `ledger-replay-support.ts:493-498` and `:450-464`.**
     - A body with no twin gets a 200 response and is marked `'held failure'` when its `prompt` contains a held row's state and criteria text. The response is built by the probe; it is not from the recording.
     - The harness never sent these bodies. It held the rows with `ledger.fail` (`bench.mjs:3039-3041`). The probe instead leaves them out of the port's judgments (`ledger-replay-support.ts:578-583`), so the port sends one twinless body per undecided item in every copy, and the test passes.
     - The match ignores every member except `prompt`, so a held body with the wrong `model`, `system`, or `options` is accepted.
     - This also breaks `.claude/rules/tests.md:32`: the stub stands in for the integration being claimed.
     - **Required change:** count these bodies as departures without a twin and report them. The port has no seam to import a held failure (`Classifier.ts:331`, private `#failed`). Because `src/` is off-limits, refer that gap to the Orchestrator.
   - **(b) Twin reuse, `ledger-replay-support.ts:502-504`.**
     - `list[Math.min(at, list.length - 1)]` serves the last twin again when the port sends a recorded body more times than the harness did.
     - `ledger-replay.test.ts:145-152` never compares the number of twinned traces with `run.judge.length`.
     - Concrete input: the port loses a stored topic judgment and asks the same body again in a later goal. The test still passes.
     - **Required change:** when `at >= list.length`, return 500 with `twin: undefined`, or assert that the twinned-trace count equals `run.judge.length`.

4. **Claim 4 fails in part: the comparison controls work, but the control does not cover the paths that can over-accept.**
   - What holds: the controls at `ledger-replay.test.ts:214-245` do tell a working comparison from a broken one. If `diffBodies` dropped `messages[0]` or `tools`, the controls at `:218` or `:236` would fail. If `compareCall` returned a constant status, `:214` or `:218` would fail.
   - Gaps:
     - `:250` builds the judge transport with `() => false`, so the control never runs the held predicate the replay uses. That predicate is the path where a twinless body passes.
     - No control reaches F4a (every injection targets a first call, which advertises tools) or R2a. Mutation: remove `!rule.governing.includes(handle)` at `ledger-replay-compare.ts:159`. No control detects it. Whether the main suite would is NOT-EVIDENCED.
     - `:260-267` asserts only that the repriced and unpriced scales differ. It still passes if repricing changes no body, so it does not control the pricing choice that `:26-27` claims it controls.
   - **Required change:** add one control that injects into an answer-pass body (for example, drops a non-call user message) and expects `unlisted`. Add one that removes a non-stale sentence from a recall line and expects `unlisted`. Add one that runs the replay's held predicate on a held-like prompt with a changed `options`.

5. **Claim 5 fails: two setup checks read their values back from the recording.**
   - **(a) Gauge check, `ledger-replay.test.ts:137-138`.** `replay.gauge` is `seed.measured` (`ledger-replay-support.ts:641`), so the check compares a value with itself. It still passes if `gauge` is removed from the options passed to `createLedger` at `ledger-replay-support.ts:672`.
     - **Required change:** assert the gauge the ledger itself holds before the first `respond` call (expose `ledger.gauge` on `CopyReplay`) against `seed.measured`.
   - **(b) Judge context, `ledger-replay-support.ts:724-729`.** `num_ctx` is read from the first recorded judge body, so the transport's exact-body match on that field passes by construction. The run's recorded settings carry it: `a5-records-vN/ledger.md:3` reads `num_ctx 4096` for all 8 copies.
     - **Required change:** read `num_ctx` from that settings line.
   - What holds:
     - `THRESHOLDS` matches `bench.mjs:831`.
     - `UNASKED_REQUEST_TOPICS` matches `bench.mjs:859`.
     - The topics come from the scenario.
     - The lookup tools match `bench.mjs:2811-2823`, and `answer` matches `bench.mjs:6776`.
     - The judge model, system text, and temperature match `bench.mjs:40-41` and `bench.mjs:543`.
     - The system text is built from the scenario, then checked against the calibration body; it is not copied from that body.
     - Judgments come from `cal-categories.jsonl`, and a key or state mismatch makes the port ask again, which fails the probe.

6. **Claim 6 holds: the probe uses no mock, spy, or module replacement.**
   - `ledger-replay.test.ts` imports only `describe`, `expect`, and `it` from `vitest`.
   - `ReplayProvider` implements `ProviderInterface`.
   - `fetch` reaches the judge as an injected option, which `tests.md:319` allows.
   - The fabricated response is ruled under claim 3.

**Findings outside the claims**

- **A. Unlisted reduction, `ledger-replay-compare.ts:47-52`, `:296-298`, `:323-339`.** Both bodies are cut down to `messages`, `tools`, and `think` before comparison. The port's `ProviderStreamOptions.schema` (`providers/types.ts:78`) and the recorded `format` are both dropped, and so is any message member other than `role`, `content`, and `tool_calls` (for example, `thinking`).
  - Concrete input: a port call with `options: { think: false, schema: {...} }` compares as `equal`.
  - **Required change:** compare `schema` against the recorded `format`, or name this reduction as a listed normalization.
- **B. The pricing input is not in the brief's setup list, `ledger-replay-support.ts:686` and `:711-722`.** The scripted provider rewrites `usage.prompt` with the per-call ratio from `ledger.jsonl` instead of serving the recorded `prompt_eval_count`. This does not make the body comparison circular, but it departs from brief contract 2. Report it in the probe's output.

**Attacked and held**

- The first-call guard (`ledger-replay.test.ts:165-170`) requires `equal`, so no residual can explain a first request.
- The F4a removal is limited to recorded bodies without tools, and `bench.mjs:3414` shows that only seed call and tool messages reach those bodies.
- Handles are 0-based in the harness (`bench.mjs:1418`, `:1461`), which matches the `governing` indices and `roles` lookup in the probe.
- `listSettingMismatches` pins every row's recorded settings.
- `buildSystem` is checked against the recorded calibration system message.
- A body with no twin and no held match gets a 500 and `twin: undefined`, and `ledger-replay.test.ts:146-147` fails on it.

VERDICT: FAIL (claims 2, 3, 4, 5)
