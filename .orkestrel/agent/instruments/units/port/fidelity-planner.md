# Fidelity rulings, planner lane on Opus 5.5 (2026-10-09)

**Lane:** objective. This report rules on what the plan rulings and the recorded wires permit. It covers C1 to C7, the fix units, the probe normalizations, and the transfer ruling. All files the brief names are present and readable.

Paths are abbreviated as follows:
- `bench.mjs` is `/home/user/agent/tmp/bench3/bench.mjs`.
- `Ledger.ts`, `helpers.ts`, `Classifier.ts`, and `types.ts` sit under `/home/user/agent-port/src/core/ledgers/`.
- `Ledger.test.ts` is `/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts`.
- Wire files sit under `/home/user/agent/tmp/bench/results/v9/a5-records-vN-wire/`.

## Design

### Rulings

Five departures are port fixes (C1, C3, C4, C5, C6) and two are listed departures (C2, C7). The `recall` tool and the answer note go back to the measured listing, and the briefing keeps R2a. Pin lines are admitted under T1. The second judge ask is admitted by normalization, with no new public seam.

**Correction to the brief.** The tests that pin the `NAME ARGS: ` lead in the answer note sit at `Ledger.test.ts:641` and `:1835`. Lines 562 and 1756 hold other assertions.

| # | Evidence | Ruling | Change or normalization | Test that fails on `1117e23` | Goal risk | U9 |
|---|---|---|---|---|---|---|
| C1 | `bench.mjs:2566-2573` (`onTopic` lists any call-free, non-quiet message); `:1534-1544` (only notes and assistant text written after the seed are filed `chatter`); `:2551-2562`, `:2590`. Port: `helpers.ts:656` keeps only user and current tool messages; `Ledger.ts:1045-1053` lists only those. Wire: `a5-records-v1-wire/00027` `messages[18]` (`m19`, `m17`). | **Port fix.** No plan ruling covers it, and the model read these lines. The line-order, cut-line, and recalled-order symptoms follow from the candidate set and from item grouping, where an amender follows its source in the same item. All three are fixed by F1; none gets a normalization. | F1 | X1 | Without the fix, recalls in g03, g04, g05, g07, and g10 differ (`u8-report.md:20-27`). After the fix the replay shows none. | No, the replay covers it |
| C2 | `bench.mjs:2509-2513` (`pinLine`), `:2583-2589`, `:1787-1807`. `:1856-1874`: under `arm-tools recall` only pins without a value exist, so a printed pin is always an ended pin. Port: no pin store (`records-port-planner.md:75`, `:452`). Wire: `a5-records-v1-wire/00045` `messages[18]` `p6 (m4) ended: superseded by m44`. | **Listed departure under T1** (`records-port-plan.md:17`). Every referent in the line is a handle; without handles the line reads `ended: superseded by` and has no subject. Wire evidence: every recorded pin line has this form, and none shares a result with a cut line (see Measurements). | N8 | none; P1 adds a probe control | g05 (v1, v3, v6, v8 `p6 (m4)`; v5 `p4 (r4)`); g01 (v7 `00012`). `m44` reaches the model in the same recall, and `r4` and `r5` carry equal text. | Yes: g05 and g01 pass per copy |
| C3 | `bench.mjs:2546`, `:2568-2570` (every successful, non-empty lookup reading can be listed). Port: `helpers.ts:641-653` keeps the last reading per call identity. Wire: `a5-records-v5-wire/00044` `messages[18]`; `a5-records-v7-wire/00012` `messages[20]`. | **Port fix.** R5a and R8 scope the records, not the `recall` tool, and the model read both readings. | F1 | X2 | g05 (v5) and g01 (v7) without the fix; none after it. | No |
| C4 | `bench.mjs:1918-1941`: the note strips `rN NAME ARGS: `, and lookup text enters bare; `:1913-1917` states the reason. Port: `Ledger.ts:1130-1135` renders through `:519-532`, which writes `NAME ARGS: `. Pinned at `Ledger.test.ts:641` and `:1835`. Wire: `a5-records-v1-wire/00037` `messages[13]`. | **Port fix.** T1 removes handles, not call text. | F2 | X3, plus `:641` and `:1835` amended | g04 (answer pass in 7 of 8 copies, `records-port-planner.md:463`) and g05. A pass that cannot call tools reads a call form, which the measured harness avoided (`bench.mjs:3404-3405`). | No |
| C5 | `bench.mjs:2574-2582`: `worded` lists any user message that carries every word, notes included. `onTopic` excludes notes through `:1539` and `:1614`. `:2546` makes every earlier message listable. Port: `Ledger.ts:493` and `:1045-1053`. Wire: `a5-records-v7-wire/00062` `messages[18]` (`recall {"topic":"Halvorsen shipment"}` lists `m69`) and `00063` `messages[13]`. | **Port fix.** The split between `onTopic` and `worded` might be a harness defect. Even so, removing it changes what the model read in v7 g07, because `m69` carries the depot, pro number, and ticket lines. The defect exception therefore fails. | F1 | X4 | g07 without the fix. | No |
| C6 | `bench.mjs:1508-1513`: a recall line is the whole content, stale sentence included, with its mark. `:1926-1928`: the note copies those lines. Port: `Ledger.ts:1054`, `:1097`, and `:1123-1125`; `helpers.ts:663` also drops messages filed as superseded. Plan: `records-port-plan.md:41` (R2a); `records-port-planner.md:87` (the R2a site is the briefing render, `bench.mjs:2224-2324`); `u8-review.md:14-19`. Wire: `a5-records-v1-wire/00045` `messages[18]` (m2 and m3 carry MX-4471; m4 and m5 carry the 15 percent fee, all marked). | **Port fix.** R2a stays on the briefing only. The recall and the note list stale sentences and superseded messages as measured. T1 drops the amended mark, which N5 already admits. | F1 (recall), F2 (note) | X5, plus the test at `Ledger.test.ts:1245` and the test at `:1417` amended | g01, g04, g05, g07: the model reads a stale value without the mark that named its amender (a T1 consequence). | **Yes** |
| C7 | `bench.mjs:3020-3025`, `:3039-3041` (the import holds the failure), `:1668-1669`. Port: `Classifier.ts:36`, `:330-331`, `:356-357` hold an item after one live failure that repeats on the same input, and the store is private. Reading: `a5-records-v1/seed.json:1` lists 5 undecided topic items, each failing with `invalid or duplicate top logprob token`. Review: `u8-review.md:22-28`. | **Listed departure, with no import seam.** The port runs the measured hold: one deterministic failure holds the item. What differs is the replay's import of a failure recorded in another process. If the second ask is answered with the recorded error, the same 5 items stay undecided and no agent body changes. That is the wire evidence the replay must show. | N9 | none; P1 adds an assertion | None on the wire when the second ask fails as recorded. In live use, a decided `m3 warehouse` or `m7 warehouse` item adds lines to recalls in g07 and g05. | **Yes** |

### Live use under C7

A fresh ledger asks every seed item once. A failure that repeats on the same input holds the item for the ledger's life, and a process restart asks once more, because snapshots are out of the first release (`records-port-plan.md:28`). A judge that answers a held item decides it, and that filing departs from the measured one.

### Transfer

The `a5-records` results transfer as body fidelity only when two conditions hold after F1, F2, and P1:
- The U8 replay reports 0 unlisted bodies over v1 to v8 under N1 to N9, F4a, and R2a (briefing).
- The controls fail on injected diffs.

Behavior still rests on U9. T1 (handles and marks), T2 (the separator), C2, and stale lines without marks all change what the model reads.

The other two arms do not transfer:
- **`t2a-records`** (2B, thinking on, context 5120; `/home/user/agent/tmp/bench/results/v10/t2a-records-v1/ledger.md:3`). The thinking departures apply (`records-port-plan.md:49-59`), and no replay covers this arm.
- **`f4-records`** (4B, thinking off; `/home/user/agent/tmp/bench/results/v10/f4-records-v1/ledger.md:3`). It transfers only after a replay over v1 to v4.

U9 must show:
1. The band holds: `fix clears` against `a4-refined` and `trim clears` against `a5-records`.
2. Per copy, the pass result for g01, g04, g05, and g07, with the stale-token count from the scorer's `STALE` table (`bench.mjs:834`, `countStale` at `:3121`) beside `a5-records`.
3. The live seed filing: which held items were asked again, their outcomes, and the decided items that differ from `cal-categories.jsonl` at the thresholds.
4. Recalls per copy, and how many carried a stale sentence or a superseded message.
5. Answer passes per goal, with g04 expected near 7 of 8.

### F1 change: the `recall` tool (`Ledger.ts` `#recall`, replacing lines 1045 to 1090)

Keep lines 997 to 1044: the limit, the closed check, the room, and the searches. Then list as follows.

1. **Listable messages.** A message can be listed when its id is not in `#requests` and either it sits before the current request or its role is `tool` (`bench.mjs:2546`).
2. **On-topic messages.** At least one search must have a match. For a tool message, the reading must be a successful lookup with a defined `result`. Any other message must carry no calls and must not be `#classifier.quiet(id)`. Then the message's topics must intersect the union of all matches (`bench.mjs:2566-2573`).
   - Keep the topic set the port computes at `Ledger.ts:1056-1065`. See Tension 5.
3. **Worded messages.** Use the searches that have no match and at least one word. A tool message must be a successful lookup, empty results included. Any other message must have role `user`; annotations are included. The lowercase text must contain every word of one such search (`bench.mjs:2574-2582`).
4. **Item building.** Walk the conversation newest first. For each listable message that is on topic or worded, build one item breadth-first:
   - Take the message's line, then queue its listable amenders from `classification.amended`, in stored order.
   - Skip any id that is already listed.
   - Join the item's lines with `\n` (`bench.mjs:2551-2562`, `:2590`).
5. **Lines.** A tool message renders as `${name} ${JSON.stringify(arguments)}: ${content}`. Any other message renders as its whole `content`, with no stale filter, party prefix, or mark.
6. **Result.** With no items, return the existing `nothing on "${topic}"; …` text. Otherwise return `cutItems(items, room)`.
7. **Note record.** Record, under the result string, a map from each tool line's rendered first line to its bare text, for F2.
8. **TSDoc.** Amend `types.ts:402-406` so stale sentences are said to be left out of the records and the briefing only.

### F2 change: the answer note (`Ledger.ts` `#buildDigest`, lines 1104 to 1142)

1. For each message from `#collectAfter()`, skip a tool message whose result is not successful. That covers repeat-note failures.
2. **Recall results.** Skip text that starts with `nothing on `. Split the rest on `\n`, drop cut lines with `matchesCutLine`, and replace each line found in that result's F1 map with its bare text.
3. **Lookup results.** Take the content lines verbatim. Empty results count, for example `No record`.
4. Drop duplicate lines across all results.
5. Return the `notes.results` header followed by the lines, or `undefined` when there are none (`bench.mjs:1918-1932`).
6. Remove the re-projection through `live` and `#projectLines`.

### Probe normalizations (P1, `/home/user/agent-port-gauge/tmp/probes/`)

- **N8, ended pin lines (C2).** In `reduceLines` (`ledger-replay-compare.ts:180`), for recorded tool messages after N3 and for recorded answer notes, drop each line that matches `^p\d+ \([mr]\d+\) ended: superseded by [mr]\d+$` before `cutLead` runs. Count the drops under `N8 ended pin lines`.
  - When the same recorded content also carries a line that matches the cut pattern, report the body as unlisted with the detail `C2 cut room`; do not admit it.
- **R2a scope (C6).** Apply `dropStale` to the system message's briefing lines only, reported as an R2a residual. Remove it from tool messages and answer notes (`:183`). Report any stale difference in a recall or a note as unlisted.
- **N9, held second ask (C7).** Replace the fabricated 200 response at `ledger-replay-support.ts:493-498`.
  - **Match.** A body with no twin matches a held row of `cal-categories.jsonl` only when two conditions hold. Its `prompt` must carry that row's state and question text. Its `model`, `system`, `options`, and `format` must equal the recorded calibration body's members.
  - **Response.** Send a judge response with duplicate top logprob tokens, so that `createOllamaJudge` rejects. Its message must equal the row's `error` after the quoted question key is replaced with the port's key.
  - **Limit and count.** Serve each row at most once per copy; a second match gets a 500 and an undefined twin. Count the matches as `held second ask`.
  - **Assertion.** Per copy, the held second asks must equal the `undecided` list in `seed.json` (5 items in v1), and the ledger must ask none of them a third time.

## Alternatives

- **Bring the `recall` tool and the note under R2a** (the alternative the review refers to the Orchestrator, `u8-review.md:19`). The case for it: the model sees no stale value without its mark. The design wins because the brief's principle admits a departure only on a plan ruling, and R2a's audited site is the briefing (`records-port-planner.md:87`). The value the model reads is a T1 effect, so U9 measures it.
- **A mark with no handle (` [amended]`).** The case for it: T1 removes the only signal that a line is stale. The design wins because that mark is unmeasured and needs its own normalization; see Tension 1.
- **A public import seam for held failures.** The case for it: replay fidelity. The design wins because the port already reaches the measured held state after one live failure, and the only consumer would be a probe. See Refusals.
- **Extend R5a to the note** (the port's behavior tested at `Ledger.test.ts:1796`). The case for it: a lookup reading that an empty one replaced leaves the note. The design wins because it scopes R5a the same way it scopes R2a: to the records, its audited path. See Tension 3.

## Constraints

- The principle and the admission test: `/home/user/agent-port/tmp/units/fidelity-rulings-brief.md:14`.
- T1 removes handles from every model-facing text: `/home/user/agent-port/tmp/units/records-port-plan.md:17`.
- R2a is defined as stale raw lines on unscoped requests: `records-port-plan.md:41`. Its site is `#ruled`, `#render`, and `#renderRecords`: `records-port-planner.md:87`.
- Snapshots are out of the first release: `records-port-plan.md:28`.
- No store of state that can drift: `/home/user/scaffold/AGENTS.md:58`.
- Minimal public API: `/home/user/scaffold/AGENTS.md:65`.
- Each line the answer note carries is free of call text by design: `bench.mjs:1913-1917`.
- The measured tail keeps stored content: `bench.mjs:1948-1951` and `:1966-1992`.
- Aliases map names to accounts only: `bench.mjs:1389-1395`.
- The classifier's held store is private: `Classifier.ts:36`.

## Refusals

- **An import seam for held failures on `Classifier` or `LedgerOptions`.** "Create or substantively expand a capability with its first real consumer" (`/home/user/scaffold/AGENTS.md:65`). The desk has no calibration file; only the probe would call the seam.
- **A pin store to print pin lines.** "Compute facts from existing fields; never store a second flag or label that can drift" (`/home/user/scaffold/AGENTS.md:58`). T1 removes the line's content in any case.

## Measurements

Readings supplied:
- **Unlisted bodies per copy, v1 to v8:** 9, 4, 7, 2, 7, 5, 8, and 8 (`/home/user/agent-port/tmp/units/u8-report.md:20-27`).
- **Undecided seed items:** 5, all failing with `invalid or duplicate top logprob token` (`/home/user/agent/tmp/bench/results/v9/a5-records-v1/seed.json:1`).
- **Error rows in `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl`:** 8, by a Grep count of `"error":` on 2026-10-09.
- **Pin lines in the wires.** A Grep on 2026-10-09 for `p\d+ \([mr]\d+\) (?:ended: )?\w+` over `/home/user/agent/tmp/bench/results/**/*records*-wire/*request.json`:
  - It found 17 lines in 16 files, and every one reads `ended: superseded`.
  - The a5 copies with pin lines are v1, v3, v5, v6, v7, and v8.
  - `t2a-records` v1 to v4 and `f4-records` v1 to v4 have none. One line each sits in `t2-records-v1` and `f4-records-v5`, which the brief does not name.
  - 0 files match `ended: superseded by [mr]\d+.*older items? not shown`, so no pin line shares a result with a cut line.
- **g04 answer passes:** 7 of 8 copies (`records-port-planner.md:463`).

Readings missing:
- the replay rerun after F1, F2, and P1;
- live outcomes for the 5 held items;
- the effect of stale lines without marks;
- replays of `t2a-records` and `f4-records`;
- a sweep of every recorded tail for stale sentences or superseded messages.

## Units

The units run serially in this order: F1, F2, G1, P1. After them, `verifier` on Haiku 5.5 runs the tree-wide gates, and the U8 replay is run again.

**F1 `ledger-recall-fidelity`**
- **Engine:** `astra` on GPT-6 Astra, the author of U6.
- **Owns:** `Ledger.ts` (`#recall` only), `types.ts` (the TSDoc at 402 to 406 only), and `Ledger.test.ts`.
- **Depends on:** commit `1117e23`.
- **Work:** the F1 change specified in Design.
- **Tests.** Each one fails on `1117e23`.
  - **X1:** "recalls a call-free, non-quiet seed assistant statement and lists its amender after it in one item." The test also proves that assistant text written after the seed, an assistant message with calls, and a quiet assistant message stay out. It fails because of `helpers.ts:656`.
  - **X2:** "recalls both seed readings of one lookup and lists each once in the answer note." It fails because of `helpers.ts:641-653`.
  - **X4:** "lists an earlier answer note through a word match but never through a topic match." It fails because of `Ledger.ts:493`.
  - **X5:** "keeps stale sentences and superseded messages in recall results while the briefing drops them." It fails because of `Ledger.ts:1054`.
- **Amended tests.**
  - The test at `Ledger.test.ts:1245`: narrow the assertion that no request carries the stale sentence to the system message and the tail, and assert that the recall carries it.
  - The test at `Ledger.test.ts:1417`, lines 1485 and 1488: derive the expected values from `bench.mjs:2523-2592`.
- **Gates:** `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Ledger.test.ts`, `npm run check:src:core`, and `npm run test:policy`.

**F2 `ledger-digest-fidelity`**
- **Engine:** `builder` on Sonnet 5.5.
- **Owns:** `Ledger.ts` (`#buildDigest`, plus the field that holds the per-result map) and `Ledger.test.ts`.
- **Depends on:** F1.
- **Work:** the F2 change specified in Design.
- **Tests.**
  - **X3:** "writes lookup lines in the answer note without their call text." It fails because of `Ledger.ts:531`.
  - **Amended:** line 641 expects `${LEDGER_NOTES.results}\nAccount BW-20931: Brightwater Studio. Refund is $148.50.`.
  - **Amended:** line 1835 expects `${LEDGER_NOTES.results}\nAccount BW-20931: Brightwater Studio. Refund is $140.\nNo record`. The test at line 1796 is renamed to match.
- **Gates:** the same as F1.

**G1 `ledger-guide-fidelity`**
- **Engine:** `opus` on Opus 5.5.
- **Owns:** `/home/user/agent-port/guides/agent.md` (lines 519, 521 to 524, and 2640) and `/home/user/agent-port/tests/guides.test.ts`.
- **Depends on:** F2.
- **Work:** state that stale sentences leave the records and the briefing, that the `recall` tool and the answer note list them, and that the note carries no call text.
- **Gates:** `npm run test:guides` and `npm run test:policy`.

**P1 `ledger-replay-normalizations`**
- **Engine:** `builder` on Sonnet 5.5.
- **Owns:** `ledger-replay-compare.ts`, `ledger-replay-support.ts`, and `ledger-replay.test.ts` under `/home/user/agent-port-gauge/tmp/probes/`.
- **Depends on:** F2. The probe must import the port at F2's commit.
- **Work:** N8, the R2a scope, and N9, as worded in Design.
- **Controls:**
  - a pin-like line carrying a token that is not a handle stays unlisted;
  - a stale sentence removed from a recall stays unlisted;
  - a held-like body with a changed `options` gets a 500.
- **Acceptance:** 0 unlisted bodies over v1 to v8, and every control fails.
- **Gate:** `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts`.

## Tensions

1. **C6 and T1 together.** Kept stale sentences reach the model without a mark. The design adds no mark; a mark with no handle is the unmeasured alternative.
2. **C6 scope.** This lane's earlier design wrote "removed from every route" (`records-port-planner.md:257`). The reconciled plan names only the briefing site. The Orchestrator might rule otherwise.
3. **R5a on the answer note.** F2 flips the intent of the test at `Ledger.test.ts:1796`. Whether any recorded request had an empty reading after a recall is not checked.
4. **The seed tail, outside C1 to C7.** The port drops stale sentences and superseded users from the seed tail (`Ledger.test.ts:1245`, `:1622`). The measured tail keeps stored content (`bench.mjs:1966-1992`). The replay attributed no tail difference; the Orchestrator rules.
5. **The `recall` topic set.** The port adds owner-record membership (`Ledger.ts:1059-1064`). The measured topics are entities plus desk topics (`bench.mjs:1653-1660`). F1 keeps the port's set until a replay difference implicates it.
6. **U9 and held failures.** U9 can import successful judgments through `conversation.judgments` but not held failures, so it asks the held items again live.

## Risks

- **F1 lengthens recall results.** The extra lines come from assistant messages, superseded messages, repeated readings, and stale sentences. Results then cut and close earlier, which can move goal outcomes. The replay rerun, and then U9, catch this.
- **Amender order.** An executor might order amenders by something other than stored order. X1 and the replay catch it.
- **Twin reuse in the probe.** The probe still reuses twins (`u8-review.md:31-33`), which can hide a judge body sent again. That fix, and the review's items 4, 5, A, and B, need an Orchestrator dispatch before the rerun counts.
- **Live filing.** U9's live asks might decide held items, which changes g05 and g07 recalls. U9 reading 3 covers this.
