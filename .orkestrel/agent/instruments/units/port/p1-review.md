# P1 probe review (reviewer, objective lane, 2026-10-09)

I reviewed in the objective lane only. I couldn't run anything, so every gate exit code and every pass or fail of the vitest run is NOT-EVIDENCED.

**Verdicts**

1. **N8, ended pin lines (C2): HOLDS.**
   - `PIN_LINE` is anchored and admits only handle referents (`/home/user/agent-port-gauge/tmp/probes/ledger-replay-compare.ts:116`).
   - It runs on recorded tool messages and answer notes only, after N3 strips the `[rN] ` prefix (`:274-278`) and before `cutLead` (`:228-234`). Each drop is counted (`:229`).
   - The port body is never reduced.
   - A pin line and a cut line in the same message produce a `Room` entry (`:280-281`). `compareCall` turns even an equal body into `unlisted` with C2 (`:785-788`).
   - Mutations that the controls catch:
     - Dropping N8 fails `ledger-replay.test.ts:692`.
     - Removing the room branch fails `:717-719`.
     - Loosening the referent to any token fails `:703-706`.
   - Scope note: the drop runs on every `tool` message, not only recall results. This follows the planner's wording ("recorded tool messages after N3", `fidelity-planner.md:80`). It can only cause a rejection, because a recorded-only drop leaves the port's line unmatched.

2. **N9, the held second ask (C7): HOLDS.**
   - **Members.** Every member except `prompt` is compared canonically with the recorded judge bodies' members (`ledger-replay-support.ts:503-505`, `:542`), and `test.ts:260` pins those members to one set.
   - **Prompt.** The prompt must carry the system text, the exact `<state>` block, `Question: …\n`, each criterion text, and the answer instruction followed by `<|im_end|>` (`:543-549`).
   - **Response.** The response is the duplicate-top-logprob failure (`:460-479`).
   - **Once per row.** Each row is served once per transport, and a second match gets a 500 with `twin` undefined (`:587-594`).
   - **Per-copy assertions.** `test.ts:277` and `:288-309` assert, per copy, that the served items and states equal `seed.json` `undecided`, that each rejection message equals the row's error after the key swap, and that no row is matched after it was served (`:295`).
   - Mutations that the controls catch:
     - Dropping the members check, the question check, or the answer check fails `test.ts:760-775`, which includes `top_logprobs`, `raw`, `stream`, `logprobs`, `keep_alive`, `seed`, a reworded question, a changed answer, and a changed state.
     - Dropping `served` fails `:791`.
     - A non-failing response fails `:298`, because v1 lists 5 undecided items (`seed.json:1`).

3. **R2a scope (C6): HOLDS.**
   - `dropStale` runs on the system briefing under `options.residuals` (`compare.ts:261`).
   - Tool messages and notes use `options.offRoute` (`:278`). That flag is false in the plain pass and the residual pass (`:771`, `:790`) and true only in the labeling pass (`:798-803`).
   - A stale difference in a recall line stays `unlisted` with C6 (`:813`, `:825`, `:830`).

4. **Controls: HOLDS.**
   - **Line selection.** The control selects its line through the lead: a tool message answering `recall` (`test.ts:450-457`), an `mN` lead below the seed length (`:462-464`), and `corrections.has(handle)` (`:470`). `staleLines === 1` isolates the edit (`:484`).
   - **Mutations.** Making `isStale` always true fails `:625`. Setting `offRoute: true` in the residual pass turns the C6 control into `residual` and fails `:632`.
   - **Required controls.** All four are present:
     - the stale-removal control expecting exactly `[C6]` with nothing unclassified (`:628-637`);
     - the pin-like line with a non-handle token, expecting C8 (`:696-707`);
     - the held-like body with changed `options`, which gets a 500 (`:776-779`);
     - the non-stale removal (`:613-626`).

5. **Labels: FAILS (the C1 part; the C3 part holds).**
   - **C3 holds.** The `earlier-reading` tag requires `portLines.has(line)`, and `portLines` is `commonRight` (`compare.ts:490-493`, `:587`). Any other `rN` line is tagged `other` and becomes C8. The port-only line `Refund approved under ESC-9999.` is tagged `port-only` and becomes C8 (`:583`).
   - **C1 fails.** A port-only line becomes C1 when its text equals any seed text (`:583`) and the message carries a recorded-only cut line next to any seed assistant or corrector line (`:677-678`, `:694`). Nothing ties that seed message to the items the cut line counts.
   - **Concrete wrongly accepted label.** Take a recorded recall that holds `m19: Locker trace opened, …` and `1 older item not shown; …`. The port's version lacks the m19 line and adds the verbatim texts of 3 seed messages the recorded result doesn't list. All 3 port lines get C1 and `unclassified` stays empty, although the recorded cut line accounts for at most 1 item.
   - **Required change at `compare.ts:583` and `:694`:**
     - For each message, sum the N of the recorded cut lines (`^(\d+) older items? not shown; `).
     - Group the `seed-port` lines into items: a seed line plus its amenders from `roles.corrections` count as one item.
     - Label them C1 only when the item count is at most N. Otherwise label every `seed-port` line in that message C8 with its exact text.

6. **Per-copy assertion: HOLDS.**
   - `test.ts:330-333` requires `listUnlisted(copy)` to be empty, and `listUnlisted` counts only `status === 'unlisted'` (`:178`).
   - A body reaches `equal` or `residual` only through N1 to N8 (`compare.ts:785`) or through F4a and the briefing R2a (`:790-795`).
   - A C2 room entry keeps the body unlisted (`:786`, `:793`). Judge bodies are covered under N9 at `test.ts:267-310`.

**Paths that pass without a recorded twin or a listed normalization**

- **Judge side, within N9: the criteria matcher ignores the labels.** `ollama/dist/src/core/index.js:86-89` renders noul criteria as `false: TEXT` and `true: TEXT`. The matcher at `ledger-replay-support.ts:548` checks only that each text appears somewhere, and `includes` also admits extra text after `Question: …\n`.
  - All 8 error rows are noul topic rows (`cal-categories.jsonl:82, 88, 178, 295, 297, 318, 359, 363`).
  - Concrete input: a twinless body for `topic m2 warehouse` whose prompt reads `false: <true text>\ntrue: <false text>`. It gets the held failure as a valid second ask, even though that question is inverted.
  - Fix at `ledger-replay-support.ts:543-549`: rebuild the expected prompt with the ollama template from the row's parsed question and state, and compare it exactly.
- **Agent side: no path found.** The recorded body is reduced only by N1 to N8, by F4a when the recorded body advertises no tools (`compare.ts:335`), and by R2a on the briefing. The port body is never normalized.

**Findings outside the claims**

- **C5 absorbs bare lines.** Every recorded-only `bare` or `nested` line becomes C5 when any recorded-only note header appears in the same message (`compare.ts:679`, `:690`). The line is never shown to belong to that note. This is the same absorption contract 5 removed for C1 and C3.
- **"Exact lines" are not always exact.** `widen` can map a labeling-pass line to the wrong original line through `startsWith` or a sentence subset, or fall back to the reduced text (`compare.ts:709-719`). The `order` tag also records a joined `a / b <> c / d` string rather than lines (`:624-628`).
- **One judge assertion only constrains through a contradiction.** If `heldRecorded` were above 0, `test.ts:272-273` would contradict `:275`, so the subtraction only takes effect by failing the test. Asserting `heldRecorded === 0` would state the intent.
- **One judge assertion can't fail.** `test.ts:270` can't fail, because `support.ts:590` always sets `row` on a held failure.

**Attacked and held**

- A held row's third ask, whether it matches or not, fails `test.ts:269` or `:295`.
- A duplicate held row would serve 6 asks against 5 undecided items and fail `:277` and `:291`. `cal-categories.jsonl` holds no duplicate names.
- An injected cut line next to a pin line is labeled exactly `[C2]` (`test.ts:719`).
- The rejection-message key swap matches the recorded error format, `question ["topic","<id>","warehouse"] invalid …` (`seed.json:1`).

VERDICT: FAIL (claims 5)
