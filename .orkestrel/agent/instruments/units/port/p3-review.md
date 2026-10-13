# P3 probe review (reviewer, objective lane, 2026-10-09)

**Lane:** objective. I hold no shell, so I could not run any vitest or oxlint gate. Each admission below comes from tracing the code by reading it against the real lines in `f2-recall-residue-rooms.json`. Files read: `/home/user/agent-port-gauge/tmp/probes/ledger-replay-compare.ts`, `/home/user/agent-port-gauge/tmp/probes/ledger-replay.test.ts`, `/home/user/agent-port-gauge/tmp/units/p3-probe-t1-cut-brief.md` and `/home/user/agent-port-gauge/tmp/units/f2-recall-residue-rooms.json`.

## Verdicts

**1. Contract 1, N10 on a recall: FAILS.**
- **Evidence:** `checkShift` (compare.ts:851-880) never reads the candidate sequence. For the extra lines it only checks four things:
  - each line is some seed text (compare.ts:864);
  - handles strictly decrease (compare.ts:865);
  - every handle is below the lowest handle in the prefix (compare.ts:867-870);
  - the cut counts differ by the number of extra items (compare.ts:871).
- **Port body N10 wrongly admits:** v1 `g04-halvorsen-ticket` call 2. The port recall holds the 8 recorded lines without leads, then only `Understood: refunds above $200 carry approval code MX-4471 from Marcus Oyelaran.` (m3). The m29 line `Marcus just messaged … MX-4471 is dead.` is missing, and there is no cut line.
  - `listItems` treats m3 as one item with key 3, because no amender follows it (compare.ts:842-845). 3 is below the floor of 6, and the cuts differ by 1 − 0 = 1.
  - N10 admits it as `['recall', 8, 9, 1, 0]`, the same admission as the real shift. Yet the evidence makes m3+m29 one indivisible item (json:11 and json:1376-1386).
- **Same path, other bodies:** any seed line with a handle in 0 to 5 that is not a candidate is admitted in place of m3+m29. Candidates are m28, m27, m23, m22, m19, m18, m7, m6 and m3+m29 (json:1230-1240).
- **Empty prefix:** when one side keeps nothing, the floor is `Math.min()`, which is `Infinity`, so any falling run of seed lines is admitted.
- **Cut line text:** the cut-line tail is compared only when both sides carry a cut line (compare.ts:856), and the `item`/`items` word is never compared. In v7 `g07-depot-release` call 1 the recorded side has no cut line. A port cut line `1 older items not shown; Injected tail.` is therefore admitted.
- **Right:** require the extra items to be exactly the next whole items of the recall's candidate sequence, with m3+m29 as one group. Take the sequence from the port's own selection for the call's topic, or from `recalls[*].candidates`. Also compare each cut line's text after the count with the fixed notice, and require `item`/`items` to agree with the count.

**2. Contract 2, N10 on an answer note: FAILS.**
- **Evidence:** `dropPooled` (compare.ts:896-914) drops every unmatched line it finds in the copy's pool. It ignores how many times the line appears, where it sits, and whether the rest of its item is present. `admitListing` (compare.ts:947-955) only requires that something was dropped and that the remaining lines are equal.
- **Port bodies N10 wrongly admits:** take the v1 `g04` call 3 answer note, with the pool filled by call 2. Each of these is admitted:
  - the note lists m3 but leaves out m29, which is half an indivisible item;
  - the note lists the m3 line twice;
  - the m3 and m29 lines sit straight after the note header instead of after m6.
- **Pool not tied to one shift:** the pool lives for the whole copy (test.ts:89) and holds loose lines. Any later note in the same copy that gains a pooled line is admitted, even when that goal's own recall matched on both sides.
- **Order inside one body is ignored:** `admitRecall` registers lines before `admitListing` runs, whatever the message positions (compare.ts:1007-1008).
- **Right:** register each shift as whole item groups tied to its recall. Admit a note only when the dropped lines are exactly those groups, each once and whole, at the position the shifted item takes in candidate order.

**3. Contract 3, N10 on a cascade: FAILS.**
- **Evidence:** compare.ts:961-963 runs `dropPooled` over every line of the later recall, not only the lines inside the note. When nothing extra is left, `checkShift` accepts equal cuts (compare.ts:860-861).
- **Port body N10 wrongly admits:** v7 `g07-depot-release` call 1. Use the real port recall plus one extra m3 line placed before the note header: `[m3 line, [Desk] header, …, m6 line, m3 line, m29 line]`, with cut `1 older item not shown; …`.
  - Both m3 lines and the m29 line are dropped. The remaining shift is m34 with cuts 1 − 0 = 1, so N10 admits it as `['recall that lists an answer note', 2, 1, 0, 1]`.
  - The admitted body lists a recall item outside the note: the dead MX-4471 code without its amender. Its own cut would fail contract 1.
- **No note floor:** a note anywhere in the prefix switches the floor check off (compare.ts:867). After a note, any falling run of seed lines is accepted, including a line newer than the note or one copied from it.
- **Right:** limit pooled drops to the note's own lines. The note runs from its header to its last line, and that last line can be read from the admitted note's line count. Then apply the contract 1 candidate check to the items after the note.

**4. Contract 4, count and log: HOLDS on the evidence bodies.**
- compare.ts:1004 adds 1 under `N10 T1 cut shift` for each admission, and test.ts:166 prints both kept counts for every admission that is not an answer note.
- The counts match the evidence pairs: 8/9 (json:1013-1014), 2/1 (json:1139-1140) and 7/8 (json:1161-1162). The 8/9 and 2/1 pairs are pinned at test.ts:837 and test.ts:857. The 7/8 pair has no assertion; my trace says the code would produce it.
- The miscount path is listed under findings.

**5. Contract 5, controls: FAILS.** All four tests exist and expect failure. Two of them cannot tell the contract's property from a weaker check.
- **Control 4 (test.ts:899-923):** it only uses a seed line newer than the last kept item (`handle > 6`), which the floor check alone rejects.
  - If the inserted line is an older candidate that is not next, or a lone m3, N10 admits it. That is the verdict 1 body.
  - If you delete the descending-order check at compare.ts:865, every control stays green. If you delete the unknown-key check at compare.ts:864, every control also stays green: a non-seed extra gets key 0 and passes the floor.
- **Control 3 (test.ts:888-897):** the injected line is not in the pool. A duplicated pooled line is also "one line beyond the shifted items", and it is admitted (verdict 2).
- **Controls 1 and 2 hold.** Control 1 is caught by the prefix check at compare.ts:855. Control 2 is caught by the count check at compare.ts:871.
- **Right:** add controls for each of these, each expecting unlisted:
  - m3 alone;
  - an older seed line that is not a candidate;
  - two extras in the wrong order;
  - an extra line that is not a seed line;
  - a note with a duplicated pooled line;
  - a pooled line placed outside the note in a cascade.

## Findings outside the claims
- **Kept counts can be wrong (compare.ts:836-838, used at 873):** an answer-note header swallows every line after it. Kept counts are wrong whenever items follow a note in the prefix. Example: recorded `[header, note line, m34, m20]` with cut 1, port with m10 added and no cut. The log prints kept 1 and 2, but the true counts are 3 and 4.
- **Tool role not checked (compare.ts:923):** `admitRecall` accepts any `tool` message and never checks that it answers a `recall` call. This has no effect on the evidence bodies.
- **Gates not evidenced:** no capture was supplied for any gate exit code, so all three acceptance criteria are UNRESOLVED.

## Attacked and held
- Reordering inside the shared prefix is rejected (compare.ts:855).
- A wrong count on the recorded cut line is rejected (compare.ts:871).
- A cut line that is not the last line, or that names 0 items, is rejected (compare.ts:824-825).
- Extra items whose handles do not fall are rejected (compare.ts:865). m29 placed before m3 makes two items with keys 29 and 3, and 29 fails the floor.
- A difference in role or in a member other than content is rejected (compare.ts:885-888).
- Differences outside `messages[...]` stay open (compare.ts:1000).
- Pooled lines are kept apart by side (compare.ts:917, 951-952).

VERDICT: FAIL (claims)
