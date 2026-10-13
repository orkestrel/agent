# U8b probe review (reviewer, objective lane, 2026-10-09)

**Lane:** objective. I read the three probe files, both briefs, `u8-review.md`, `u8-report.md`, the a5-records-v1 wire and `ledger.md`, `bench.mjs:1725-1785`, and the port's `types.ts`, `Ledger.ts` and `validators.ts`. I can't run commands, so every gate exit code and every pass or fail result is NOT-EVIDENCED.

**Verdicts**

1. **Contract 1 (R2a scope) HOLDS.**
   - The briefing's stale drop runs only under `options.residuals` (`/home/user/agent-port-gauge/tmp/probes/ledger-replay-compare.ts:237`).
   - Recall results and digest notes use `options.offRoute` (`:254`). That flag is false in the strict pass (`:695`, `:700`) and true only in the labeling pass (`:706-711`).
   - Staleness comes from `roles.corrections` (`:173-181`). That map is built by `listDecidedCorrections` (`ledger-replay-support.ts:888-926`), which follows `bench.mjs:1743-1761` `marks()`: the thresholds, the shared-token test for amends, and supersedes marking amended too.
   - Attack: a port that drops a stale sentence from a recall line. The strict pass still differs, the labeling pass matches, and the body reads `unlisted` with C6 (`:721`, `:733`).
   - Live pair judgments (`bench.mjs:1733`) count only when they show up as `[amended by]` marks. Missing one can only push a body into C8, never accept it.

2. **Contract 2 (held judge bodies) FAILS.**
   - `createHeldPredicate` (`ledger-replay-support.ts:518-533`) checks `model`, `system` and `options`. For the prompt it only checks that it contains `MICA_SYSTEM`, the row's state and the row's criteria.
   - It ignores `raw`, `stream`, `logprobs`, `top_logprobs` and `keep_alive`, which every recorded judge body carries (`a5-records-v1-wire/00001_api_generate-request.json:8-12`). It also ignores the question's `instructions` text (the `Question:` line).
   - Concrete input: a held-row body with `top_logprobs: 5`, or with its `Question:` line reworded. It gets a 200 at `:565-567` and passes the judge test (`ledger-replay.test.ts:268-276` leaves `'held failure'` out of `withoutTwin` and only counts those traces). It is labeled C7 only, never C8.
   - Required change at `ledger-replay-support.ts:522-531`:
     - require every member except `prompt` to equal the matching members of a recorded judge body;
     - require the prompt to contain the row's `instructions` and the answer instruction, or rebuild the prompt from the row's `asked` and the recorded template and compare exactly.

3. **Contract 3 (twin reuse) HOLDS.**
   - `ledger-replay-support.ts:574-578` returns 500 with `twin: undefined` when `at >= list.length`.
   - Two checks together pin the twinned count to `run.judge.length`: `ledger-replay.test.ts:272` (count) and `:274` (every recorded file used).
   - Mutation: restore `list[Math.min(at, list.length - 1)]`. The control at `:500-502` catches it, because `statuses[count]` becomes 200.

4. **Contract 4 (controls) FAILS in part.**
   - What holds:
     - the answer-pass control (`ledger-replay.test.ts:419-442`);
     - the held-predicate control (`:505-525`), which also changes `num_ctx`, `temperature`, `model` and `system`;
     - the repricing control (`:532-549`), which requires at least one changed body.
   - The non-stale recall control (`:445-458`) takes the first line of any `tool` message that has more than one sentence. It never checks that the message answers `recall`, or that the recorded line carries an `mN` lead whose message has a decided correction. Which line it picks is NOT-EVIDENCED.
   - If it picks a line with no lead or an `rN` lead, `dropStale` returns at `ledger-replay-compare.ts:186` before `isStale` runs, so the mutation "`isStale` always true" survives.
   - No passing test catches the contract 1 regression either. Setting `offRoute: true` in the strict pass at `ledger-replay-compare.ts:700` turns every C6 body into `residual`. The control's sentence isn't stale, so it stays `unlisted` without C6 and the control still passes.
   - Required change at `ledger-replay.test.ts:445-458`:
     - select the line through the recorded body's leads: an `mN` lead with `roles.corrections.has(N)`, in a tool message that answers `recall`;
     - add a control that removes a stale sentence (`isStale` true) from a recall line and expects `unlisted` with `CAUSE.c6`.

5. **Contract 5 (setup values) HOLDS.**
   - Gauge: `ledger.gauge` is read at `ledger-replay-support.ts:753`, before the first `respond` at `:769`. The getter (`src/core/ledgers/Ledger.ts:251-255`) returns the ledger's own state, and `ledger-replay.test.ts:248` compares it with `seed.measured`. Removing `gauge` at `:748` makes the getter return `undefined`, so the test fails.
   - Judge context: `num_ctx` comes from the settings line in `ledger.md` (`ledger-replay-support.ts:813-818`; v1 `ledger.md:3` reads `judge mica (num_ctx 4096)`). It feeds the judge at `:736` and the settings at `:502`. `ledger-replay.test.ts:255-260` checks every recorded body against it.
   - Minor: `:250-254` (`Set` size of 1) can't fail, because `readJudgeSettings` overwrites `num_ctx`.

6. **Contract 6 (compared members) HOLDS.**
   - `schema` is compared with the recorded `format` (`ledger-replay-compare.ts:322`, `:365`, `:409`).
   - `readMessages` keeps every member (`:292`), `mapMessage` emits `thinking` and `images` (`:339-340`), and `diffBodies` compares whole messages (`:417`).
   - `ProviderStreamOptions` has only `think` and `schema` (`src/core/providers/types.ts:74-79`), so no other per-call member escapes. The controls are at `ledger-replay.test.ts:397-417`.

7. **Contract 7 (pricing input) HOLDS.** `ledger-replay.test.ts:132` prints the per-copy rewrite count from `ReplayProvider.rewritten` (`ledger-replay-support.ts:390`). The report records it as `usagePromptRewritten` (`ledger-replay-report.json:18`).

8. **Contract 8 (labeled report) FAILS.** Some lines get a C1 to C5 label without being shown to belong to that cause.
   - C1, at `ledger-replay-compare.ts:629` and `:645`: any line only in the port, any reordering of shared lines, and any cut line count as C1 whenever a seed assistant line is missing from the port's version of the same message.
     - Concrete input: a port recall that lacks `m19: Locker trace opened…` and adds a made-up line `Refund approved under ESC-9999.` gets causes `[C1]` with an empty `unclassified`.
     - The report already shows this: `ledger-replay-report.json:2738-2750` has a "line only in the port" labeled C1 and C6 with no unclassified lines.
   - C3, at `:459-460`: every `rN` line missing from the port is tagged as an earlier reading, even when the port lists no reading of that call at all.
     - Concrete input: the port drops the only `lookup_order {"id":"LH-80941"}: …` line from a recall; it gets C3 only.
   - Required change in `classify` and `kindOf`:
     - label a port-only line C1 only when its text equals a seed message (`roles.texts`) whose recorded line was cut;
     - label C3 only when the same text is still among the port's lines (`commonRight`);
     - label anything else C8 with its exact lines.

**Findings outside the claims**

- I found no agent-body path that passes without a listed normalization. The recorded body is reduced only by N1 to N7, by F4a when no tools are advertised (`ledger-replay-compare.ts:308`), and by R2a on the briefing. The port's body is never normalized.
- The paths that still let a body through are on the judge side and in the labels:
  - the held predicate (contract 2) lets a twinless judge body pass the judge test with a C7 label;
  - C1 and C3 absorption (contract 8) hides unlisted lines from C8.
- Held judge entries in the report carry `file: null` (`ledger-replay.test.ts:215`). This is acceptable, because such a body has no recorded file by definition.

**Attacked and held**

- The first-request test requires `equal` (`ledger-replay.test.ts:290-295`).
- A twinless body that matches no held row gets a 500 and fails `:269`.
- With `offRoute` true only in the labeling pass, a C6 label can't accept a body; it only names one.
- The repricing control, which compares repriced and unpriced port bodies, can now fail.

VERDICT: FAIL (claims 2, 4, 8)
