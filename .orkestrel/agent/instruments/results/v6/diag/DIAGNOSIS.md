# Terminal reply design: diagnosis, 2026-10-08

The diagnosis rests on the four v6 head-to-head runs, read-only, and offline replays through a recording stub; no request went to the Ollama daemon. Row references take the form `RUN gNN`, where `RUN` is a folder in `results/v6`.

## 1. What is wrong with the terminal design

The terminal design has no code defect. Its losses come from how the 2B model uses tools when `send_reply` is absent: the model opens almost every goal with a tool call, and in terminal mode that call can only be a lookup or a search, which exposes it to a trap, a loop, and a growing history. The causes follow, ranked by their effect on the full-view gap, which is 5 against 6 by the scorer and 5 against 5 by a strict hand reading.

1. The model makes a tool call on its first turn and follows its result. Across the two full-view arms, the first turn is a tool call in 19 of 20 goals: terminal 9 of 10 (only `ab-none-terminal g05` answers directly) and tool 10 of 10 (7 are `send_reply`). In terminal mode those calls are 8 lookups and 1 search; the tool arm makes lookups in only g02, g06, and g08. The system text requires the terminal arm's lookups ("When a request concerns an order id or account number from the conversation, you must call lookup_order or lookup_customer"), but `goal.tools` in `scenario.json` omits them, so the scorer neither rewards the terminal arm for them nor penalizes the tool arm for skipping them. Cost: `ab-none-terminal g09` looked up LH-81660, whose result reads "gift wrapped, no charge ... gift note text is not recorded", and replied "gift wrapped with a no charge message" with seed 11 ("Happy 40th, Aiko") in view. This is scenario trap (a). `ab-none-tool g09` made no lookup and passed. This cause explains 1 goal of the gap.
2. Goal 7 loops, and nothing stops a repeated call. `ab-none-terminal g07` made 8 identical turns, each the same sentence plus `lookup_order {id: LH-80941}` at 52 completion tokens. Prompts step 3987, 4135, ..., 5023 (+148 per turn), then the answer run named Marcus instead of Tomasz. The tool arm also fails g07 with Marcus, so the loop costs no goal directly. It leaves its repeats in the shared history: the first prompt grows 1,381 tokens from g07 to g08 against 131 in the tool arm, and `ab-none-terminal g10` then requested 6,475 tokens against `num_ctx` 6,144 (`calls[1].requested`, HTTP 400). Without the 7 repeated pairs (7 × 148 = 1,036), that request is about 5,439 tokens. This cause explains 1 goal by the scorer and 0 by hand, because `ab-none-tool g10` is a false pass (section 3).
3. The ranked search feeds the model's own replies and duplicates back. The g10 search result in `diag/wire-terminal/026-body.json` is 1,445 characters: the terminal g08 table reply (which carries the 555-0142 decoy), the LH-31055 lookup, seed 24, the g08 request, and two byte-identical copies of the g07 lookup result. `rankWords` (bench.mjs:1770) neither dedupes nor bounds size, and it reads only `message.content`, so terminal replies are searchable while `send_reply` text is not. It adds tokens to the g10 overflow and costs no goal on its own.
4. The terminal arm writes markdown. Bold appears in 9 of 9 non-empty `ab-none-terminal` replies and tables in 4 (g03, g05, g06, g08); every tool-arm reply in v2, v4, and v6 is plain. The reading "every terminal reply came out long" is wrong: g01, g02, g04, and g09 are 53, 64, 61, and 141 characters. Through g07 the two arms' first prompts stay within 53 tokens (3,987 against 3,934), so long replies did not cause the overflow. Cost: 0 goals in v6; the risk is to the scorer (section 3).
5. The answer run drops every tool. `ANSWER` is `createScope({ tools: [] })` (bench.mjs:74), so the body has no `tools` key and the template omits its tool preamble: the g07 answer-run prompt fell from 5,023 to 4,714 tokens with 3 more messages. Only g07 used it, and both arms fail g07, so the cost is 0 goals.

Gap accounting by the scorer: terminal wins g08 (tool says "$3,760 available" with no verdict word), tool wins g09 (cause 1) and g10 (cause 2). Net, 5 against 6.

## 2. Did one design interfere with the other

No. Rerun on 2026-10-08 with `diag/compare-hashes.mjs`, the offline replays match the live request hashes in 26 of 26 bodies for `ab-none-terminal`, 13 of 13 for `ab-none-tool`, and 13 of 13 for `v4/none-6144` replayed through `bench.mjs.pre-reply`. `diag/equiv.mjs wire-tool wire-pre-v6tool` reports 13 of 13 bodies identical apart from the three lookup and search descriptions. In the g01 first request, the terminal and tool bodies differ only in message 0 (the last system sentence) and the absent `send_reply` definition; the other three tool definitions and the options (`num_ctx` 6144, `temperature` 0, `seed` 7, `think` false) are byte-identical. `run.log` shows the four arms ran one after another in separate processes. The v4-to-v6 rise in `send_reply` use (4 skips to 0) comes from the description wording alone: the g01 messages are byte-identical and the first prompt moved from 2,600 to 2,620 tokens. Both arms carry that wording, so it does not confound the A/B.

## 3. Is the measurement right

The recorded numbers are what the daemon received and what the code computes: recomputed verdicts match all 40 stored rows (`diag/measure/score-audit.mjs`). The scorer's content checks are too narrow, and hand reading against the seed changes six verdicts.

- False pass, `ab-none-tool g10`: "She should call back by 3 pm today"; seed 24 says after 2 pm, and the goal checks only "4127".
- False pass, `ab-comp-terminal g07`: names Tomasz but gives no deadline ("today", seed 8); `v4/GRADES-3.md` graded the same omission a false pass.
- False pass, `ab-comp-terminal g10`: "you should call the main switchboard at 555-0142 to reach her", the trap (b) decoy; 4127 appears only as her direct line.
- Partial, `ab-comp-terminal g04`: one preamble line names ESC-2219, then the reply re-sends g03's Grace note verbatim; a strict reading fails it.
- False pass, `ab-comp-tool g03`: "The manager must sign off ... Marcus Oyelaran (replacements) are copied"; seed 18 says Marcus signs off.
- Lenient false fail, `ab-none-tool g08` and `ab-comp-tool g08`: "$3,760 available for the new order" and "for the $3,000 reorder" give the headroom without a word from `expectedAny`; a strict reading keeps both as fails.

Corrected head-to-head. Full view: 5 against 5 strict, 5 against 6 lenient. Compaction: 4 against 2 strict, 5 against 3 lenient. The compaction gap is confounded: the window counts each arm's own tool estimate (266 against 335, bench.mjs:2542), so the seed folds land at [29] and [25], and the tool arm's g01 fold of seed 25-43 summarized to 4 completion tokens twice (`ab-comp-tool g01` summarize calls), losing the ESC-2219 and MX-4486 corrections. The compaction result is not evidence about the reply design.

Other measurement faults, none of which moves a v6 count:

- `rescore.mjs` reports terminal success as 0: running it on the four files printed "Passed 5 -> 0" and "7 -> 0" for the terminal arms and 6 -> 6, 3 -> 3 for the tool arms, because line 70 reads `replied`, which is false for every terminal row.
- The forbidden patterns break on markdown: `not **ESC-2291**` fails a correct reply and `by **Friday**` passes a wrong one (synthetic pairs in `score-audit.mjs`; no v6 reply hits one).
- The sampler options are not pinned: the request sends only `num_ctx`, `temperature`, and `seed` (bench.mjs:450), and the model's params blob `sha256-9371364b` sets `presence_penalty` 1.5, `top_k` 20, and `top_p` 0.95. Both arms send the same options, so the A/B is not confounded.
- `maxPrompt` ignores a refused call (bench.mjs:2070): `ab-none-terminal g10` shows 5,915 while the refused call requested 6,475.
- Every row is one greedy sample, and a 20-token description change moved the reply route in 4 goals between v4 and v6, so a 1-goal difference is inside single-sample variation.

## 4. Fixes

Harness bugs to fix before any evaluation:

1. `rescore.mjs:70`: use `line.replyVia !== undefined ? reply !== '' : (line.replied ?? reply !== '')`, then delete the workaround sentence at README.md:295.
2. bench.mjs:2542: size the compaction window with one tool estimate shared by both arms, the `--reply tool` definitions' estimate, so the arms fold at the same boundaries.
3. `rankWords` and `formatHits` (bench.mjs:1744, 1770): drop hits with identical content, bound the result by an estimated token budget as well as by count, and index a `send_reply` call's text as that message's searchable text.
4. bench.mjs:450: pin `presence_penalty`, `top_k`, and `top_p` in `options` for every call and print them in the md settings line.
5. `rescore.mjs` `scoreText`: test patterns and substrings against a copy with `**`, `__`, backticks, table pipes, and heading marks removed; add the synthetic markdown pairs as a scorer test.
6. `scenario.json`: forbid 555-0142 as the number to dial and require the 2 pm time in g10, require "today" in g07, tie "marcus" to the sign-off in g03, and widen g08's `expectedAny` or require a yes or no verdict; then re-score all v6 rows.
7. The summarizer returns "No facts." in 4 tokens on folds full of facts (`ab-comp-tool g01`); find the cause before any compaction run.
8. bench.mjs:2070 and README.md:232: take `call.prompt ?? call.requested` in `maxPrompt`, and stop describing an overflow as "the model never saw the request".

Design choices for you:

- A repeat-call guard in both arms: when a call repeats the name and arguments of a call already answered in the same goal, return a fixed notice instead of the lookup result. It changes trajectories, so both arms must get it.
- The answer run: advertise the same tools as earlier turns (keeps the prompt prefix) or keep `tools: []` and report `answered` rows as a different prompt.
- One plain-text sentence in the system text both designs share, if replies must not be markdown.
- Whether the system text's mandatory lookups count: add them to `goal.tools` and report compliance beside success, or delete the rule from the system text.
- Sample count: run each design over several seeds at a nonzero temperature before ruling between them.

Model behavior that no harness change fixes: the first-turn tool habit itself; g05 (no MX-4486 in either arm or in v4); g06 (writes the carrier date against rule 6 in both arms); g07 naming Marcus in both full-view arms; g09 trusting the lookup over seed 11; and copying its own earlier reply templates (terminal g05 reuses g03's table, `ab-comp-tool` g07-g10 repeat "Please send this information to me immediately").

Before any fix lands: runnerJ.sh (pid 12026) waits for `DECIDED` and then starts five arms with the unchanged bench.mjs and copies the `ab-*` folders to `none-6144` and `c-tuned`; runnerK.sh (pid 19534) waits for `LEDGERGO` and writes `DECIDED` when its ledger arms finish. Writing either trigger file starts evaluations.

## 5. Live probes, after the daemon is free

Each probe is one `POST /api/chat` with a body built from a recorded file in `diag/wire-terminal/`.

1. Reproducibility: send `013-body.json` byte for byte (g07, after the first lookup result). It confirms that the measurement reproduces if the reply is the same 52-token `lookup_order {id: LH-80941}` turn; a different reply refutes it, and every single-run comparison is then noise.
2. Missing ending tool: send `013-body.json` with the tool arm's `send_reply` definition appended to `tools`, system text unchanged. It confirms cause 1 if the model calls `send_reply` or answers in text; another `lookup_order` call refutes it and points at the lookup result instead.
3. Repeat guard: send `014-body.json` with the content of message 75 (the second identical result) replaced by "You already have this result; give your complete answer now." It confirms the guard fixes cause 2 if the model ends with a text-only answer; a third `lookup_order` call refutes it.
