I held the objective lane: parity with the measured method in round 2. I had no shell here, so I did not run the vitest command, and I have no `git status --porcelain`. Only the writer's report (/home/user/agent-port/tmp/units/u6-fix-last.md:37) says the suite passes, so that is UNRESOLVED. I judged each mutation by reading the code and the tests.

## Verdicts

1. **Claim 1 (fixes 1–15 implemented as ruled and pinned) — BROKEN on fix 11. The other 14 hold.**
   - **Input:** the fixture at /home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:873-929, with recall topic `Mira and AA-11`. The correction "Replace AA-10 with AA-11." matches the `AA-11` part by itself.
   - **Port:** /home/user/agent-port/src/core/ledgers/Ledger.ts:1022-1031 first collects every source that sits in another match's amended chain, then lists the non-amended matches first. Source S therefore takes correction C into its item and returns "S\nC". The test at Ledger.test.ts:927-929 pins that order.
   - **Measured:** recall walks the messages newest first (/home/user/agent/tmp/bench3/bench.mjs:2573). C matches and is listed alone first. Then `add(S)` skips C because it is already listed (bench.mjs:2539). The result is "C\nS".
   - The ruling (bench.mjs:2534-2544) puts a correction after its source only when the source's `add` reaches it first. The port also removes C's own earlier item, which the measured recall never does.
   - **Smallest fix:** iterate `matched` in its newest-first order with only the `done` check, and drop the `amended` pre-pass. In the test, change the topic to `Mira` so that the source-then-correction case is the measured one.

2. **Claim 2 (briefing render, budget, and cut order equal the plan) — BROKEN.**
   - **Input:** the fixture at Ledger.test.ts:873, plus a seed `lookup` for BW-20931 ("Account BW-20931: Brightwater Studio."). The correction text becomes "Brightwater Studio: replace AA-10 with AA-11." with the same 0.6 fact / 0.4 correction judgment and the amends judgment. The request is "Check Mira receipt.".
     - C names the owner, so it is a member of the owner record. It is decisive but has no category, so it is group 4 and never becomes a unit.
   - **Port:** Ledger.ts:698-703 and :723-728 pass every member of every record as the chain exclusion to `#collectAmended`. C is therefore never rendered.
   - **Measured:** a non-rule unit's chain skips only `scope.members`, which is `recorded` (bench.mjs:2271, :2117, :2152). For an unscoped request, `recorded` is the Rules record members plus the held user rules, so C renders right after S. The measured method skips every record member (`held`) only for a rule unit.
   - The brief's paraphrase ("that no record holds", /home/user/agent-port/tmp/units/u6-fix-brief.md:46) is wider than the lines it cites.
   - **Smallest fix:** pass `unit.category === 'rule' ? allMembers : held`, where `held` is the local at Ledger.ts:563-576 and already equals the measured `recorded`.
   - I refer one more point to the Orchestrator (out of my lane to rule):
     - Port: Ledger.ts:774-780 prefixes the lead to every owner-record line, one per sentence. Test Ledger.test.ts:93 pins this.
     - Measured: record lines are bare sentences (/home/user/agent/tmp/bench3/records.mjs:394, bench.mjs:2296). The measured `NAME ARGS:` lead belongs only to `line()` (bench.mjs:1494).
     - The question is whether the lead ruling reaches record lines. If it does, it also changes the size the cut test measures.
   - Held: the budget formula, the tail cap, `cap`, all five cut keys with their tie-breaks, and the step sequence (Ledger.ts:556-560 and :647-688 against bench.mjs:2080-2084 and :2128-2150).

3. **Claim 3 (tail equals the measured `#tail`) — BROKEN.**
   - **Input:** seed `[{assistant:'Welcome to the desk.'}, {user:'Order LH-12345 is late.'}]`, then `respond('Check LH-12345.')` with the default share.
   - **Port:** Ledger.ts:872 opens exchange 0 without a user message, and the walk at :876-880 keeps it. The tail is [assistant, user, request].
   - **Measured:** bench.mjs:1997 shifts entries until one has the user role, so the tail is [user, request].
   - Fix 6 creates this case by keeping seed assistant text. Fix 7 creates it too: removing a superseded first user message leaves its reply leading the history.
   - **Smallest fix:** in the walk, skip or stop at an exchange whose first message is not a user message.
   - I refer one more point to the Orchestrator:
     - Port: Ledger.ts:845-847 drops an empty seed assistant message that has no calls.
     - Measured: bench.mjs:1966 keeps it, because `!loopWritten` alone is enough.
     - The brief says "non-empty text", so the brief itself creates this departure.

4. **Claim 4 (recall equals the measured recall) — BROKEN.**
   - (a) The fix 11 reordering in verdict 1.
   - (b) **Empty-topic text.**
     - Input: `recall({topic:''})`.
     - Port: Ledger.ts:958 returns "recall needs an owner name, an id, or a desk topic".
     - Measured: bench.mjs:2477-2478 returns "recall needs a topic: a customer name, an order or account id, a handle such as m12 or r5, or one of …".
     - The port loses the desk-topic list, not only the handle example. Fix: reuse the guidance string at Ledger.ts:1045 after `recall needs a topic: `.
   - Held:
     - fix 9: the counter order at Ledger.ts:956-958 matches bench.mjs:2773 and :2475-2478.
     - fix 10: the topic match at Ledger.ts:976-987 matches bench.mjs:2517-2518.
     - The search semantics are equivalent to the union of `onTopic` and `worded`.
     - fix 13: the room refusal is removed, so `cutItems` keeps at least one item.
     - fix 12: the guidance text matches.

5. **Claim 5 (answer pass and digest) — CONFIRMED.**
   - The trigger matches bench.mjs:3438 with the F5 widening.
   - The digest comes before the cue (bench.mjs:3391-3393).
   - The answer pass advertises no tools, and it drops every call (F4a).
   - The stable continuation is entered plus `#collectAfter` (bench.mjs:3302-3305).
   - Fix 14 is at Ledger.ts:1086-1087. Fix 15: `this.#calls.at(-1)` at Ledger.ts:344 is the answering call, because `turn` fires before the provider call and `usage` after it (/home/user/agent-port/src/core/agents/Agent.ts:405, :514). That matches `measureReply(goalCalls().at(-1))` (bench.mjs:3442) under a running maximum (bench.mjs:1279).
   - The digest's added leads come from the lead ruling, not from the measured method (bench.mjs:1900, :1906).

6. **Claim 6 (no fix introduced an unlisted departure) — BROKEN.** Three fixes did:
   - fix 4: the chain exclusion (verdict 2);
   - fixes 6 and 7: a tail that opens on an assistant message (verdict 3);
   - fix 11: the recall reorder (verdict 1).
   - /home/user/agent-port/tmp/units/records-port-plan.md:31-47 lists none of them.

## Findings outside the claims

- **Empty `calls` array (minor).** Ledger.ts:866-867 sends a seed call message whose calls were all dropped as `{...message, calls: []}`. Measured sends `{id, role, content}` (bench.mjs:1972). The estimate is the same, but request bytes might differ in the U8 replay. Fix: omit `calls` when the kept list is empty.
- **Dead branch.** Ledger.ts:858-864 still has a superseded `''` branch, which the filter at :848-849 makes unreachable. Delete it.
- **Referred to the subjective lane.** Ledger.ts:1045 uses the desk-specific wording "a customer name, an order or account id". That conflicts with the package's generic recall description at Ledger.ts:173 and :177 ("an owner name, an id").

## Attacked and held

Each of these tests fails if its fix is reverted, and passes as written by my reading:

| Fixes | Test | Mutation it catches |
| --- | --- | --- |
| 1, 2 | Ledger.test.ts:791 | rule key back to `ruled`; held rules removed |
| 3 | Ledger.test.ts:841 | the loose-first key applied to every group (`RecordingJudge` leaves the message undecided, so it is loose) |
| 4 | Ledger.test.ts:873 | correction is group 4 without the chain step |
| 5 | Ledger.test.ts:93, :173, :635 | lead removed |
| 6 | Ledger.test.ts:87, :90 | seed assistant text dropped |
| 7 | Ledger.test.ts:1001 | superseded turn kept as an empty message |
| 8 | Ledger.test.ts:972 | whole-name matching makes it group 3 with no `- ` record line |
| 9 | Ledger.test.ts:574 | counter moved after the empty-topic check |
| 10 | Ledger.test.ts:977-981 | partial `matchEntities` matches "Brightwater unknown" |
| 13 | Ledger.test.ts:579 | `room <= 0` refusal restored |
| 14 | Ledger.test.ts:1195 | empty lookup contributes nothing |
| 15 | Ledger.test.ts:1030, Gauge.test.ts:191 | reply reserve back to the largest completion |

The fix 1 role check needs no test: `buildRecords` never makes an assistant message live (/home/user/agent-port/src/core/ledgers/helpers.ts:252-253), so it can never become a unit.

VERDICT: FAIL 1 2 3 4 6