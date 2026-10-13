# Rulings — falsify round port-release (2026-10-09)

Lanes: objective, GPT-6 Astra (`tmp/codex/falsify-astra-last.md`); subjective, the reviewer on Opus 5.5 (`tmp/units/falsify-opus-verdict.md`). Claims: `tmp/units/port-release-claims.md`.

| Claim or finding | Astra | Opus | Ruling |
| --- | --- | --- | --- |
| 1 Abort | BROKEN: an abort a `usage` listener raises after the final text arrives returns `partial: false` (`Agent.ts:584`) | CONFIRMED (that interleaving untried) | Fix in the agent loop: a cancel before the run commits its final outcome commits a partial result, as `guides/agent.md` § the turn states for every cancel. |
| 2 Concurrency | CONFIRMED | CONFIRMED | Holds. |
| 3 Answer pass | CONFIRMED | CONFIRMED | Holds. |
| 4 Budget | BROKEN: a large lookup result or answer note pushes a later request past `capacity` less `predict` | BROKEN: same, plus the request alone, a briefing that runs out of steps, and the fault path | The claim overreached the plan, which ruled over-window refusal out of the first release (`records-port-plan.md`). Guide fix: state that the plan bounds the briefing and the tail, that the request and every lookup result enter whole, and that the ledger refuses no over-window prompt. |
| 5 Recall order | BROKEN: an amender the topic matches lists before its source | BROKEN: same | The code lists as the measured harness did (`bench.mjs` `add` walks newest first, so a matching amender is its own newer item). Guide fix to that wording. |
| 6 Briefing | CONFIRMED | CONFIRMED | Holds. |
| 7 Judge failures | CONFIRMED | BROKEN: a `JudgeError` code `'QUESTION'` is asked again on every request | Fix: hold an item on a `JudgeError` with code `'QUESTION'` as well as on `DETERMINISTIC_JUDGE_ERROR`; the guide names which failures hold. |
| 8 Thinking replay | BROKEN: calibration carries thinking under `'turn'` and `'all'` | BROKEN: same | The guide states that calibration applies the policy; the claim overreached. No change. |
| 9 Tail and exchanges | BROKEN: the ledger tail sends a tool result without its call across an interleaved user message | BROKEN: same | Fix with O2. |
| 10 Guide | BROKEN (from 1 and 5) | BROKEN: 10a to 10j | Guide unit G2 fixes 10a to 10j. |
| 11 API | CONFIRMED | BROKEN: the hold predicate, `cutItems`, `LedgerTopic.requests`, two `@returns`, `tmp/` citations | Fix: the hold per 7; rename `cutItems` and `LedgerTopic.requests` under `names.md`; `@returns` in the `typescript.md` shape; constants cite the series and date in prose. |
| 12 Coherence | BROKEN | BROKEN | Ship after the fixes and a successor round. |
| O1 direct agent run | — | `ledger.agent.generate()` after `respond` plans for the previous request | Fix: the ledger's selection handler returns a fault selection when no `respond` is active; the guide says to run the agent through `respond` only. |
| O2 three exchange splitters | — | `compact()`, `filterSelectionMessages`, and `#selectTail` split exchanges three ways | Fix: one exported exchange helper in `conversations/helpers.ts`, used by all three; leading messages before the first user message form their own exchange; exchanges a tool group spans are joined. |
| O3 two lookup identities | — | the repeat stop and the projection identify a lookup apart | Keep both (the repeat stop is the measured `argumentKey`); name them apart in TSDoc and the guide. |
| O4 duplicated `#plan` code | — | the unit-to-record mapping and the cut rank are written twice | Fix: one mapping and one rank helper. |
| A1 to A5 | — | ADVISORY | Out of this round; recorded as open items. |

Bounds on every fix: the replay over the 8 `a5-records` copies keeps 0 unlisted bodies (the measured seeds start with a user message and never interleave a call group, so O2 changes no measured body); no measured default moves; the public API changes only by the two renames and the exchange helper.
