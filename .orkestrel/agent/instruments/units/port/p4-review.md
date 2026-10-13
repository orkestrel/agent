# P4 probe review (reviewer, objective lane, 2026-10-09)

**Lane:** objective, read-only. I couldn't run any gate.

Files read:
- `/home/user/agent-port-gauge/tmp/probes/ledger-replay-compare.ts`
- `/home/user/agent-port-gauge/tmp/probes/ledger-replay.test.ts`
- `/home/user/agent-port-gauge/tmp/probes/ledger-replay-support.ts`, lines 945-1062
- `/home/user/agent-port-gauge/tmp/probes/ledger-replay-report.json`
- `/home/user/agent-port-gauge/tmp/units/f2-recall-residue-rooms.json`
- `/home/user/agent-port-gauge/tmp/units/p4-probe-n10-tight-brief.md`
- `/home/user/agent-port-gauge/tmp/units/p3-review.md`

## Verdicts

**1. Candidate sequence: HOLDS.**
- `listRecallCandidates` (compare.ts:893-946) builds the sequence from the seed texts, the filings, the quiet categories, the corrections and the topic words. It reads nothing from the evidence file. A source and its amenders form one item (compare.ts:928-941).
- `keptItems` (compare.ts:961-971) requires each side to be exactly the first whole items of the sequence and to keep at least one item.
- `checkShift` (compare.ts:979-984) requires the two sides to keep different counts, and each cut to equal the total minus that side's kept count. The extra items are `long.slice(short, max)` (compare.ts:993).
- The p3 attack bodies are now refused:
  - m3 without m29 fails at `item.lines.every` (compare.ts:966).
  - A side with an empty prefix fails because `kept > 0` is required (compare.ts:970).
  - A seed line that is not a candidate fails the identity check.
- The evidence equality test is at test.ts:992-1015. It covers the 7 evidence keys and would fail if amenders were not grouped, because the labels would come out as `m3`, `m29` instead of `m3+m29`.

**2. Cut line: FAILS.**
- **Evidence:** `CUT_EXACT` is `/^(\d+) older (items?) not shown; …$/` (compare.ts:865), and `peelCut` turns the match into a number (compare.ts:953-956). It never compares the whole line with the text the count renders to, so a count with a leading zero passes.
- **Port body N10 wrongly admits:** v7 `g07-depot-release` call 1, `messages[18]`, with the port's last line changed to `01 older item not shown; name a narrower topic to narrow the recall`.
  - `Number('01')` is 1, `item` agrees with 1, and the port cut of 1 equals 2 − 1.
  - N10 admits it as `['recall that lists an answer note', 2, 1, 0, 1]`.
- **Right:** at compare.ts:953-956, build the expected line as `` `${count} older ${count === 1 ? 'item' : 'items'} not shown; name a narrower topic to narrow the recall` `` and require `===`, or change the pattern to `([1-9]\d*)`. Add a control with the `01` line, expecting unlisted.

**3. Answer note: FAILS.** Items are not dropped at most once, and the pooled entries are not tied to the call whose recall produced them.
- **Evidence:**
  - Every request carries its history, so `admitRecall` admits the same recall message again at each later call.
  - Each time, it pushes the shift entry and re-tags the note's entries with the current call (compare.ts:1067-1076, especially `{ ...entry, goal, call }` at 1075).
  - The report shows the same `messages[18]` admitted at both g07 call 1 and call 2 (report.json:406-445).
  - `admitNote` walks every entry with `call < context.call` and never removes duplicates (compare.ts:1123-1129).
- **Port body N10 wrongly admits:** v7 `g07-depot-release` call 3, `messages[13]`, where the port note repeats the m3 line and the m29 line right after the existing pair: `[…, m6, m3, m29, m3, m29, …]`.
  1. The pool holds two copies of (port, anchor m6, `[[m3, m29]]`), tagged g07/1 and g07/2.
  2. The first copy removes the first pair. This is the real admission at report.json:471-482, which shows the first m6 is directly followed by m3 and m29.
  3. The second copy finds the same anchor and removes the duplicate pair.
  4. The m34 and m6 entries stop at `other.includes` (compare.ts:1100).
  5. Both sides are then equal, so N10 admits the note with lines m3, m29, m3, m29.
- **Latent issue:** `lines.indexOf(entry.anchor)` (compare.ts:1097) always uses the first occurrence of the anchor. If the anchor appears twice in a note, the correct position can be refused and a wrong one admitted. The evidence notes contain each line once, so this has no effect on the evidence bodies.
- **Right:**
  - In `admitRecall` (compare.ts:1067-1076), register a shift only once per goal and message position, keeping the call that first carried it. For example, skip the push when the pool already holds an entry for that goal with the same side, anchor and items.
  - Do not re-tag note entries again on a later call.
  - Add a control that runs the copy's real pool sequence (g04 2, g04 3, g07 1, g07 2) and then sends the duplicated g07 call 3 note, expecting unlisted.

**4. Cascade: HOLDS.**
- The note is accepted only when both sides start with the pooled note's exact lines (compare.ts:1053-1058). It then counts as one item (compare.ts:943-944), and contract 1 applies to the items after it (compare.ts:1061-1064).
- An m3 line before the header fails the `listed` check (compare.ts:1051); the control is at test.ts:947-955.
- A pooled line after the note fails `keptItems`; the control is at test.ts:957-965.

**5. Recall only: HOLDS.**
- `readTopic` (compare.ts:1016-1026) maps the tool message to its call by position and requires `name === 'recall'` plus a string topic, on both sides (compare.ts:1043-1044).
- The control at test.ts:1187-1198 renames the call on both sides. If the name check were deleted, the topic would still resolve and the shift would be admitted, so the control would fail as it should.

**6. Kept counts: HOLDS.**
- `keptItems` counts whole items, with the note counted as one. The tests at test.ts:1241-1253 (3/4) and 1255-1263 (wrong cut refused) pin this.
- The evidence pairs 8/9 (test.ts:924), 2/1 (test.ts:944) and 7/8 (test.ts:985) are asserted.

**7. Controls: HOLDS on the letter.**
- All six controls from p3 verdict 5 exist and each expects unlisted:
  - m3 alone: test.ts:1106
  - an older seed line that is not a candidate: test.ts:1114
  - two extras in the wrong order: test.ts:1127, which also checks the correct order is admitted as 7/9
  - a line that is not a seed line: test.ts:1147
  - a note with a duplicated pooled line: test.ts:1161
  - a pooled line outside the note in a cascade: test.ts:947 and 957
- The 7/8 pair is asserted at test.ts:985.
- **Limit:** the duplicate control at test.ts:1161-1166 uses `primed(1)`, which pool-registers only one entry. It cannot detect the verdict 3 defect; the change it needs is listed under verdict 3.

## Findings outside the claims
- **Gates are UNRESOLVED.** No capture of any exit code was supplied for acceptance criteria 1-3.
- **The report shows the expected counts, but that does not prove a pass.** report.json shows 13 bodies admitted by N10, admissions [2,0,2,0,0,2,6,2] per copy, and 0 unlisted. But test.ts:274-277 writes the report at module load, before any assertion runs.
- **A comment overstates the code.** The comment at compare.ts:782-783 says each item is dropped "whole and once", which verdict 3 contradicts.

## Attacked and held
- A recall listing a note on one side only is refused (compare.ts:1051).
- A cut line that is not the last line, a second cut line, a count of 0, a wrong noun, or a different tail is refused (compare.ts:953-956; controls at test.ts:1049-1071).
- Half of the m3+m29 item, or the item moved to sit right after the header, is refused in the answer note (compare.ts:1101; controls at test.ts:1168-1185).
- A later goal cannot use the pooled lines of an earlier goal (compare.ts:1124; control at test.ts:967-973).
- A recall that lists a note different from its own side's pooled note is refused, because each side must equal its own stored lines (compare.ts:1056-1057).

VERDICT: FAIL (claims)
