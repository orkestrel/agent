# Agent boost ideas

The idea record for Agent's memory boosts as it stood on 2026-10-21: the code seams a boost touches, every idea with its hypothesis, evidence, status and gate, the R-L1 design, the R3 build, the rulings of 2026-10-21, and the probe that settled the seam claims.

- `src/`, `studies/` and `tests/` citations read at commit `692e551`; a citation prefixed `692e551:` names a record that left the tree after that commit (`git show 692e551:PATH`); a `tmp/` citation names a gitignored working file on disk on 2026-10-21.
- `.orkestrel/agent/plan.md` owns the units (W0 to W13, A, B, G0 to G7), the order of dispatches, the levels L0 to L4 and their caps, the user rulings U1 to U16, and the gates this file names: the noise allowance `N`, the count margin, the coverage, speed, timing and semantic gates, and the both-end contract.
- `.orkestrel/agent/evidence.md` owns the figures; an `E` id names one of its conclusions.
- The idea rows draw on `692e551:ANALYSIS.md:246-407` and `tmp/units/ladder/ladder-2.md:271-379`; where the two differ, the later ladder row wins and the row names the difference.
- Status `adopt` builds the idea or keeps it as an instrument; `probe` runs only the named next step; `retain` keeps proved behavior; `park` removes the idea from the active plan until its reopening condition holds; `excluded` records a reasoned rejection. An unrun idea has not failed.
- Every live row inherits the ladder's controls (off, exact repeat, sham, on), its guards and its level caps. A threshold in a gate is a prospective decision rule, not a result.

## Code seams

### Records

| Seam | What the code does | Where |
| --- | --- | --- |
| Projection | `#project` rebuilds every record from the messages, the lookup registry and the classification on each plan and each `recall`; nothing is indexed or cached | `src/core/ledgers/Ledger.ts:484-503` |
| Filing | successful tool results file as facts; annotations, failed results, tool-calling turns and later assistant replies file as chatter | `src/core/ledgers/Ledger.ts:420-430` |
| Classifier order | category before topic; `amends` before a conditional `supersedes` | `src/core/ledgers/Classifier.ts:212-258` |
| Tail | `#selectTail` takes its seed from the messages before the first recorded request; it is not a moving tail | `src/core/ledgers/Ledger.ts:889-894` |
| Planner groups | `#plan` puts each live unit in group 1 (shares a topic with the request), 2 (a decisive rule or correction), 3 (shares a capitalized name) or 4, and drops group 4 | `src/core/ledgers/Ledger.ts:674-686` |
| Order | message position inside a group, except group 1 unsettled units and group 3 units order by score; removals order by cut rank, then score | `src/core/ledgers/Ledger.ts:704-716` |
| Score | the sum, over distinct words shared with the request, of `ln(N / df)`, with `N` the messages without calls and `df` the messages carrying the word; no term frequency, no length normalization, no parameters, no name | `src/core/ledgers/Ledger.ts:653-660`, `src/core/ledgers/Ledger.ts:687-689` |
| Trim | `#trim` drops one line per step and returns the first cut that fits; the cut after every step returns unchecked | `src/core/ledgers/Ledger.ts:764-767` |
| Words | `extractWords` returns a set of lowercased `[\p{L}\p{N}]+` runs and a set of non-opening capitalized names; it carries no counts | `src/core/ledgers/helpers.ts:133-145` |
| Ids and numbers | `extractTokens` reads hyphenated runs with a digit, uppercased, and numbers | `src/core/ledgers/helpers.ts:293-308` |
| Owner linking | a lookup argument links only when its normalized form is itself an id token: `bc-7301` links, `order:BC-7301` links nothing; the registry names the id either way | `src/core/ledgers/helpers.ts:461`, `src/core/ledgers/helpers.ts:488-519` |
| Recall matching | a topic matches by `extractTokens` id, by `includes` on owner and topic names, and by wording only in user messages and lookup readings; the topic branch skips quiet messages | `src/core/ledgers/Ledger.ts:1045-1057`, `src/core/ledgers/Ledger.ts:1093-1102` |
| Recall listing | most recent first; `cutListing` keeps entries while they fit the room and names how many it left out; no rank, page or cursor | `src/core/ledgers/Ledger.ts:1076`, `src/core/ledgers/Ledger.ts:1146`, `src/core/ledgers/helpers.ts:800-823` |
| Repeat stop | an identical call in one request throws `LEDGER_NOTES.repeat`; the tool listener closes the request and aborts the agent | `src/core/ledgers/LedgerRequest.ts:159-164`, `src/core/ledgers/constants.ts:85-86`, `src/core/ledgers/Ledger.ts:202-209` |
| Answer pass | a partial or blank first pass gets one answer pass with tools off; its rejection propagates; the result inherits `stop` | `src/core/ledgers/Ledger.ts:289-316`, `src/core/ledgers/Ledger.ts:339` |
| Judgment reuse | exact on model, rendered state, ordered sources and question JSON; an aborted judge call keeps its partial answers | `src/core/helpers.ts:382-396`, `src/core/conversations/JudgmentManager.ts:141-148` |
| Batch usage | a judgment stores usage only when its request carried one question | `src/core/conversations/helpers.ts:45` |
| Ledger admission | the Ledger builds its agent with `strict: false` and admits by its calibrated gauge and `#trim`; the strict refusal lives in the Study transport's wire layer and in the Agent `window` the Compaction arm sets | `src/core/ledgers/Ledger.ts:199` |

### Compaction and admission

| Seam | What the code does | Where |
| --- | --- | --- |
| View | `view` renders framed recaps, then the live tail; `rehydrate`, `search` (an unranked substring scan) and `reference` have no caller in `src/` or `studies/` | `src/core/conversations/Conversation.ts:183`, `src/core/conversations/Conversation.ts:218-252` |
| Fold | keeps the most recent user exchange live, moves the cut to an exchange start, and commits nothing when a `remove` or `clear` ran during the summary | `src/core/conversations/Conversation.ts:277-306` |
| Rolling | one call over every prior recap plus the slice; one replacement section keeps all originals | `src/core/conversations/Conversation.ts:298-322` |
| Section cap | merges after the first fold has committed; a failed merge leaves that fold in place | `src/core/conversations/Conversation.ts:324-345` |
| Agent admission | measures the composed request, folds one time when the conversation is summarizable, reselects and measures again; `strict` throws `WINDOW`, the lenient default sends | `src/core/agents/Agent.ts:655-681`, `src/core/agents/Agent.ts:747-754` |
| Estimate | `estimateTokens` is `ceil(length / 4)`, not a tokenizer | `src/core/agents/helpers.ts:237` |
| Memory consumer | the `records` arm builds a `Ledger`; the `compaction` arm a summarized `Conversation` with `keep` 2 and optional rolling under an Agent `window`; `lookup` is an exact-id read | `studies/memory/StudyMemorySession.ts:134-226` |
| Ecosystem | no checkout implements an index, BM25, TF-IDF, a stemmer, a stop list, a vector store or an embedding call; the nearest primitives are `tokenize` in interpret (ASCII only), the browser Unicode word set, and Dice similarity in interpret | `tmp/units/review-1021-ecosystem-report.md` § Reuse candidates |

## Ideas

### Records quality and measurement

| Id and aliases | Hypothesis | Evidence | Status | Gate |
| --- | --- | --- | --- | --- |
| R-L1 lexical selection and ranked recall; the `PROPOSAL.md` BM25 selection and BM25 recall rows | BM25 in place of the IDF ordering score, with a bounded group-4 path, lowers "filed but not selected" losses | the score has no term frequency or length term and group 4 is invisible (`src/core/ledgers/Ledger.ts:686-689`) | adopt, default-off (2026-10-21) | the L0 and L1 gates in § R-L1 specification |
| R1 recent tail with opening pins | a moving tail at request boundaries fixes seed-case and stale-date exposure | E16: 21 of 24 handoffs off focus, 11 stale dates | probe | L0 current-tail and standing ids; L1 early and late handoffs; L2 8-goal spans at least 1 of 2 more correct-focus handoffs per endpoint, no grant lost; prevention starts before the first changed tail |
| R2 earlier replies as work items; request framing | carrying prior request and reply identity as own work, never as evidence, serves revisits | E16: 95 of 96 tasks refer to prior products; wording recall skips assistant replies (§ Probe record) | probe, cumulative | L0 resolve named items, an earlier error included; L1 retrieve every requested item, no draft promoted to a receipt; L3 work atoms beat the semantic margin; U14 binds framing before the first changed request |
| R3 prefixed owner linking | linking the one id a prefixed subject carries corrects attribution | § Probe record; the memory study's lookup grammar is prefixed (`tests/studies/memory/StudyMemorySession.test.ts:61`) | adopt as the first Records build, default-off under U7 (2026-10-21) | L0 exact owner membership with a wrong-owner control; L1 at R13 and R49 or R85, every fixture owner selected and no foreign one; prove R4's cross-case obligation guard before bundling |
| R4a case grouping and obligation rendering; R-Q3 | rendering filed open, closed and prerequisite-bound obligations coherently | rendering exists in part; no obligation status exists | probe, immediate | L0 fixture with open, closed, wrong-owner and prerequisite-bound obligations; L1 early and late on a fixed truthful filing; no closed line rendered open; authorizes rendering only |
| R4b added obligation question | a dedicated question finds obligations the taxonomy misses | about 120 whole-horizon misses and 5 minutes, an estimate (`tmp/units/ladder/ladder-2.md:179`) | probe, separate | 12 frozen development messages, at most 48 judge calls, 5 model and 8 elapsed minutes inside R4's 30-minute cap; every closed and unrelated control correct, at least 2 more correct classifications beyond noise |
| R5a superseded rendering | naming withdrawn instructions with their replacements stops action on retired ones | changes what the model sees, not which pairs are asked | probe | L0 retired instruction, replacement and unrelated live record; L1 around early and late retirement; every withdrawn item named, none acted on; W1 owns the check |
| R5b scoped correction pairs; R-S3, RS2 | narrowing pairs to a shared id, number or owner cuts the judge bursts | goals 49, 53 and 77 hold 410 of 729 judge calls (`.orkestrel/agent/evidence.md:193`) | probe; a shadow comparison precedes any live pruning (`692e551:PROPOSAL.md:206-224`) | L0 a lost true pair refuses the scope; L1 burst 49, then 77; at least 50% fewer burst calls and time beyond noise, identical correction state, zero false retirement; a whole-run claim owes the 15% gate |
| R5c dedicated correction question | detecting corrections apart from pair narrowing | can add pairs and tape misses | probe, separate | 12 development arrivals, at most 48 detector and 24 pair calls, 8 model and 12 elapsed minutes; no unrelated live fact superseded; rerun the R5b state guard before coupling |
| R-Q4 status of own prior work | separating draft, authorized, initiated and confirmed states cuts overclaimed actions | 11 of 30 critical R rationales stated planned actions as done | park behind W9 (2026-10-21) | reopen when R1 to R5 have an L1 result (Grok route); fewer than 5 relevant mapped rows parks broad implementation; never gate on `completionClaims` |
| R-Q5 exact excerpts and unused room | each lost amount or deadline is never filed, filed but not selected, selected incorrectly, or selected but ignored | no measurement; diagnosis precedes treatment | probe, classified from W12 fields (2026-10-21) | at least 2 early and 2 late cases losing the excerpt earn one L1 carriage variant in the unchanged room; carried but ignored in 75% or more of eligible cases at both ends routes to reasoning or template research |
| R6 room saturation; R-Q1, RQ4; `692e551:.orkestrel/agent/direction.md` § 1 | a smaller reserve carries more required sources only if a survivor trims them | candidate 3: 0 length finishes, peak prompt 11309 of 11776 (`.orkestrel/agent/evidence.md:116`) | retain the q4 room | required sources trimmed at R85 or R93 earn one `predict: 4096` comparison; no package default change in this series |
| R7 diagnostics; E1, R-M1, RQ1; `692e551:.orkestrel/agent/experiments.md` retrieval diagnostics | reading filing, selection and product apart locates loss | instruments, not a quality treatment | adopt | W1, W4 and W12 implement the measures, W11 bridges semantics; controls fail before the first dependent GPU screen; never parse briefing prose for provenance |
| R-Q2 repeat stop and answer-pass rethrow; `692e551:.orkestrel/agent/direction.md` § 3 | bounded repeats and surfaced answer failures keep Records serving | E3 | retain | reopen only on a collected case that loses a reply or violates the stop contract |
| R-Q6 bounded first-pass reasoning | a metered reasoning pass helps hard products | historical thinking-on failures argue against assuming it (E7, E8) | park on U8 | 3-call and 180-second bound, final answer required, latency at most 2 times off under an approved tradeoff |
| R-Q7 require fresh lookup | stale answers concentrate where required lookups were skipped | 100 lookups found does not show every required lookup ran | probe, diagnosis first | at least 2 events and a rate ratio of at least 2 at both ends earn a prompting or enforcement L1; zero eligible failures is inconclusive |
| R-Q8 judge challenger; RQ2 | a better judge improves classification | 2026-10-14 research, no local run: Kev-4B Q4 first; d1-3B and Wald-4B after their serving path is proved; Julia-1 a CPU floor; Mica the reference; Clef Flash, Clef-27B, Nimble-9B-v3, Tev1, Laya and Strands Decider held (`692e551:.orkestrel/agent/models-research.md:15-28`) | park on U9 and fixed development sets | at least 2 fewer errors beyond noise and no false supersession on the R4b and R5c sets; residency, adapter and download permission first |
| R-Q9 Agent comparators; RQ3 | separates model capability from the memory mechanism | 2026-10-14 research: pinned Qwen 3.5 4B and 2B, Llama 3.2 3B as an independent family | park on U9 | 2 failing and 2 clean cases per end under ordinary L1 caps with an own baseline; never mixed into the primary contrast |
| R-M2 observed R baseline; B2, RS1 | native timing, bodies and selection are absent from historical R | `.orkestrel/agent/evidence.md:216` | park to the earned L4 off arm | checkpoints 49, 53 and 77 inside the 12-goal cap |
| R-M3 judgment identity; RQ9; `692e551:.orkestrel/agent/experiments.md` exact identity reuse | exact reuse saves work without changing answers | exact matching is built (`src/core/helpers.ts:382-396`) | adopt as an L0 invariant | each component change misses, a same-length changed question included; identical keys hit; a fresh store per arm; no semantic cache |
| R-M4 result counts; RQ7; `692e551:.orkestrel/agent/direction.md` § 3 | repeat and recovery counts on `LedgerResult` help a host decide | `stop` is inherited (`src/core/ledgers/Ledger.ts:339`) | park on U10 | define with the first consumer; default-off byte proof; never duplicate `stop` |
| R-M5 complete capture; AQ4 | exact provider and judge capture protects every Ledger change | W7 accepted at `8c62459`; `ANALYSIS.md` read it as pending | adopt, done | W7's `tests/src/core/ledgers/Ledger.test.ts` cases prove every Ledger change |

### Records cost and speed

| Id and aliases | Hypothesis | Evidence | Status | Gate |
| --- | --- | --- | --- | --- |
| R-S1 eager filing and pending joins; RS8, AS2; `692e551:.orkestrel/agent/direction.md` § 2; `692e551:.orkestrel/agent/experiments.md` arrival filing | filing at arrival overlaps independent work | judge took 63 of 109 q4 minutes (`.orkestrel/agent/evidence.md:178`); moving work does not remove it | park (2026-10-21) | a measured idle interval worth at least 20% of judge wall, or a changed concurrency design; needs an awaitable revision barrier |
| R-S2 same-state question batching; RS4, AS1, RQ8; `692e551:.orkestrel/agent/experiments.md` topic batching | one request per state's dependency-safe questions | the Mica adapter sends one question per call; `ANALYSIS.md` read it as proposed, the ladder as deferred | park (2026-10-21) | fewer than 15% mergeable calls parks provider work; category stays before topic and `amends` before `supersedes`; U9 authorizes a provider change |
| Request-level judge usage; `692e551:.orkestrel/agent/experiments.md` | charge a grouped request one time and keep unknown usage | batch usage is lost per judgment (`src/core/conversations/helpers.ts:45`) | park with R-S2 | precedes truthful batching costs; never split aggregate usage |
| R-S4 residency; RS7 | avoiding agent and judge swaps saves wall | R phase timing is absent; `ANALYSIS.md` read it as conditional, the ladder as a probe | park (2026-10-21) | swaps over 20% of a role's wall on a short and a late matched span |
| R-S5 briefing placement; RS3 | consecutive requests share a reusable prefix | no measurement | park (2026-10-21) | at least 0.25 cached-share gain and 20% prefill reduction beyond noise on R13 to R14 and R85 to R86, each sequence cold |
| RS6 judge prefix reuse | repeated state text lets the judge reuse prefill | no timing or body evidence in original R | park (2026-10-21) | cached share of at least 0.25 on same-state pairs earns a matched order experiment |
| RS9 judge `num_ctx` | a smaller allocation than 20480 serves judge prompts near 2740 | reported maximum only | park (2026-10-21) | the same 48 calls with exact derived classification; U1 binds adoption |
| RS5 direct Mica v0.1.2 backend | shared-prefix decoding removes judge work | the earlier 85% judge-prefill figure was an estimate | park (2026-10-21) | a host build, memory, cancellation, isolation and measured prefill eligibility |
| Calculation tool | separates arithmetic errors from memory loss | no error sample | park | an arithmetic-error sample; both strategies in one L1 contrast; never credited to memory |
| Structured product template | fewer omitted requested elements | no omission count | park | W1 finds at least 2 omitted elements per end despite correct carriage |
| Oracle-context headroom | complete source context isolates generation limits | no measurement | park | development-only, after R-Q5 cannot split retrieval from generation; never evaluation oracle text in a prompt |

### Compaction

| Id and aliases | Hypothesis | Evidence | Status | Gate |
| --- | --- | --- | --- | --- |
| S5 onset screen; onset G1 | the reproduced collapse at goal 17 is the first mechanism to screen | E17 | adopt as the one Compaction screen at G3 (2026-10-21) | off, repeat and sham at `ev-05-1`; a corrected argument earns a second case only |
| Q3a self-describing lookup | the always-visible tool definition carries the id grammar | E17: 62 of 67 lookups malformed | probe at G3, first (2026-10-21) | correct grammar, found results, fewer refusals, with a healthy early case and Records guards |
| Q1 pinned standing context | protocol, grants and register stay outside the summary slice | E17 | probe at G3, second (2026-10-21) | 2 of 2 valid lookups and fewer refusals beyond noise; about 755 estimate units charged to room (`tmp/units/ladder/ladder-2.md:330`); prevention starts before fold 11 |
| Q3b lookup failure text | failure wording lets the model repair a malformed lookup | an initially successful lookup never reaches it | park behind G3 (2026-10-21) | force a released-id miss through the real handler; no fabricated record where none is released |
| Q2 current-shift fold fence | current-shift sources stay verbatim until their work completes | 11328 of 11776 room by arithmetic, not observed | park behind G3 (2026-10-21) | fallback on more than half the eligible folds parks it |
| Q4 structured evidence recap; C-Q7, CQ5 | case blocks, obligations, ids and action status survive folds | no measurement | park behind G3 (2026-10-21) | no lost case block, no unsupported completion; decode at most 40 s more per fold |
| Q5 deterministic block merge; S2, CS2 | unchanged case blocks are reused | depends on Q4's format | park behind G3 and Q4 (2026-10-21) | at least 20% fewer late completion tokens; a malformed recap is refused |
| Q6 transcript and product recall; B-Q1, CQ3 | details a summary omits come back from retained originals | `search` and `rehydrate` have no caller | park behind G3 (2026-10-21) | a labeled hybrid, at most 2 recall calls, the referenced product retrieved |
| S1 summary prefix alignment; C-S1, CS1 | priming with the preceding Agent request cuts summary prefill | summary prefill was 18.21% of the output-2 wall (`.orkestrel/agent/evidence.md:194`); a 10 to 17% saving is a forecast | park behind G3 (2026-10-21); G7 holds it | fold 11 first, never warmed with the summary; at least 25% prefill reduction and cached share 0.50; U13 precedes a package seam |
| S4 normalized same-build cost | per-fold time, decode per token and folds per shift make speed comparable | refusal products are cheaper than substantive ones | adopt at every level | the refusal-cheap sealed run is never the speed control |
| C-Q1 rolling, C-Q3 final-user task, C-Q4 blank refusal, C-Q5 recap 4096 | accumulated sections, task ambiguity, empty and cut recaps | built; the qualifying run served 96; E13 | retain | default-off byte identity and no blank recap; `.orkestrel/agent/plan.md` holds the empty-recap investigation ruling |
| Rolling versus append-only causal probe | recap replacement contributes to protocol loss | E18 | park behind G3 (2026-10-21) | same build, common ancestor, every append-only section kept and priced |
| Consumer-only boundary folds | folding at shift boundaries when the Agent fence cannot land | about 20 folds instead of 10 (`tmp/units/ladder/ladder-2.md:341`) | park behind G3 (2026-10-21) | only if Q2 cannot land and S1 and Q5 pass |
| C-Q6 section-sized recap allowance; CQ1; `692e551:.orkestrel/agent/direction.md` § 4 | recap room sized from the section | 69 of 93 c1 q4 recaps cut at 320 (`.orkestrel/agent/evidence.md:179`) | park behind G3 (2026-10-21) | eligible only when a surviving Q4 or Q5 recap ends at `length` |
| C-Q8 omit old tool outputs; CQ2 | redundant tool text leaves the slice | no share measured | park behind G3 (2026-10-21) | less than 5% removable at both ends keeps it out |
| C-Q9 plain-loop repeat stop; AQ1; `692e551:.orkestrel/agent/direction.md` § 3 | the plain agent loop stops repeated lookups as the Ledger does | E3 | park behind G3 (2026-10-21); package work under U10 | an observed repeated-call case; prove recovery and no stop on changed arguments |
| C-Q10 thinking | bounded first-pass reasoning helps generation | earlier settings were confounded | park on U8 | the R-Q6 discipline |
| C-Q11 larger keep, 4 or 6 | less premature source loss | no measurement | park behind G3 (2026-10-21) | less loss with under 50% more folds and the room unchanged |
| AQ3 runner rendered-prompt count | an upstream endpoint might expose exact counts | unavailable in the recorded runs | park, watch only | never permission to replace the estimator |
| C-S2 `num_batch`; CS3 | runner tuning raises prefill throughput | no measurement | park (2026-10-21) | at least 10% prefill gain beyond noise under U1 |
| C-S3 off-path summaries; CQ4 | summary work leaves the response path | one-slot execution | park (2026-10-21) | measured removable wall and a stale-summary rejection proof |
| C-S4 decode, KV quantization, residency, scheduling, prepared workers, output room, context and safety | generation and load costs fall | no measurement | park (2026-10-21) | same-quality decode; role cost over 20%; no truncation; G0 reprices only |
| S3 post-fold Agent prefill; C-S5 | cache recovery after a fold | about 4.9% of run cost (`tmp/units/ladder/ladder-2.md:336`); the ladder held it as an advisory exclusion | park (2026-10-21) | a named lever and a measured change past the 15% run gate |
| C-M1 fold loss, C-M2 determinism, C-M3 bodies and profiles | summary strings and boundaries locate fold loss | length proofs exist, string proofs do not | adopt in W1, W2, W3b and W6 | actual summary strings; old length proofs stay length proofs |

### Cross-arm and infrastructure

| Id and aliases | Hypothesis | Evidence | Status | Gate |
| --- | --- | --- | --- | --- |
| B-Q3 compact and retry after `WINDOW` | one bounded retry recovers an eligible refusal | no eligible failure recorded | park | the user rules the recovery mode; first attempts stay primary |
| B-Q4 configurable framing and notes; RQ5; `692e551:.orkestrel/agent/direction.md` § 4 | configurable recap prefix and notes keep labels blind | c1 adjudicators saw arm-revealing phrasing (`.orkestrel/agent/evidence.md:171`) | park on U10 | default bytes unchanged |
| B-Q5 model-visible time and budget; AQ2 | budget metadata changes policy or content | no budget-blind error recorded | probe as a declared ablation | after a budget-blind error, 2 failing and 2 clean cases per end and strategy on a frozen metric |
| B-Q6 malformed `extractContent` | the Ollama reader mishandles a malformed row | the realign critic found no assignment | probe, unassigned | offline in the Ollama owner's test file; malformed row against valid empty content; no daemon |
| B-M1 resolution scoring | development atoms locate partial gains | E22 | adopt | W11 atoms plus W1 diagnostics; the official rubric unchanged |
| B-M2 attribution | criterion kind, slot and quarter explain the gap | R completion passes by quarter 18/21/13/14, C 9/6/19/21 (`692e551:ANALYSIS.md:335`) | retain as a descriptive baseline | W1 binds it to seal and check version |
| B-M3 stop layers | model finish, agent stop, study failure and launcher cap stay distinct | `stop` is inherited | adopt | no second stop flag |
| B-M4 agreement; E3 | a same-judge repeat bounds label noise | Sol and Grok agree on 362 of 384 (`.orkestrel/agent/evidence.md:168`), a cross-judge reading | park with W10 (2026-10-21); a Claude labeler until a labeling lane runs on the Grok route | same-judge repeat and sample-specific atom agreement |
| B-M5 semantic labeling lifecycle | controlled runner, pilot and create-only outputs keep labels valid | the Grok schema v1 failed its first batch | retain | stop at the first invalid batch; a changed judge needs its own calibration |
| B-M6 package source carriage; RQ6; `692e551:.orkestrel/agent/direction.md` § 4 | a package API reports which sources a prompt carried | Study observation serves this ladder | adopted (2026-10-21) | the Astra design `tmp/units/ladder/w12-design.md` names the absent facts and their first consumer, the W12 reader; W12-1 builds the receipt on `LedgerResult` (`.orkestrel/agent/plan.md` § Rulings in force, W12 design) |
| B-M7 boosted-only versus sealed | matched off, repeat, sham and on from one seed carry causality | the 2026-10-19 ladder superseded the 2026-10-16 boosted-only choice | retain the matched-pair rule | sealed comparisons stay descriptive |
| B-M8 development and held-out split | tuning on development text keeps evaluation honest | no split frozen | adopt | W11 projection and frozen split; the evaluation oracle stays aggregate-only under U5 |
| B-M9 per-goal completion | a later failure never erases an earlier executed fact | grading repair, offline | probe offline | controls truncate a later attempt and keep earlier observations |
| Built admission and accounting: estimate before dispatch, calibrated gauge, prediction-miss reading, strict wire, summary guard, request attribution, cached-prefix accounting | the built infrastructure holds | E10, E11 | retain | a reproduced contract failure; the 512-token cushion is never raised and the qualifying profile keeps it, residual-as-failure stays rejected, and the estimator stays (`.orkestrel/agent/plan.md` § Rulings in force, Estimator and Cushion) |
| Study extraction, deadlines, executed fact, promoted instruments, WMI lifecycle | the built Study infrastructure holds | WMI detachment ended the T3 descendant stop | retain | batch memory adoption with W3b and W12; offline byte proofs are not GPU tests |
| SS1 cloud labels alongside generation | labeling overlaps the GPU window | remote labeling is not shown to leave the host unloaded | park | measured host contention |

### Excluded

| Id and aliases | Reason | Status | Reopening condition |
| --- | --- | --- | --- |
| B-Q2 living aggregate | E20: no quality gain at 3.42 to 5.50 times R tokens | excluded (2026-10-21) | R4-on development atoms still miss at least 20% of cross-case obligations at both late strata, attributed to state integration |
| Graph memory, embeddings, vector search, rerankers, semantic cache, destructive deletion, record compaction | no ecosystem primitive to declare and no measured error that needs them | excluded (2026-10-21) | an error or scale case exact selection and correction cannot address; no deletion in this ladder |
| C-Q12 exact or prefix-anchored counting | the user's estimator ruling | excluded (user 2026-10-15) | an explicit user change for a named treatment |
| C-Q2 two-section cap | two lossy calls and an intermediate-commit gap | excluded from production | a labeled offline simulation with a distinct advantage and its own atomicity proof |
| More desk topics | four topics estimated at about 860 calls and 35 minutes; R3 and R-L1 are cheaper | excluded (2026-10-21) | R3 or R4 leave a measured selection gap that ownership cannot close |
| Inverted index, index source units, incremental materialization | the projection rebuilds per plan over hundreds of short units; the 18.4 s rebuild for 96 goals is replay cost an index would not remove (`.orkestrel/agent/evidence.md:202`) | excluded (2026-10-21) | a measured restart or scale requirement |
| Corpus revisions and result caches | a contract change with no measured loss | excluded (2026-10-21) | a measured loss |
| Cursor recall and an exact-read tool | the probe shows no page, but no measured loss | excluded (2026-10-21) | W12 shows cut listings dropping required items; then one `recall` continuation page |
| Own-work corpus partition | R2 carries prior work as tail and record matter | excluded (2026-10-21) | R2 fails for want of a separate population |
| Time fields on `Message` | a contract change with no measured loss | excluded (2026-10-21) | a measured date error a field would fix |
| Unresolved-link marker | a contract change with no measured loss | excluded (2026-10-21) | a measured wrong-owner guess |
| SQLite FTS5 | `ConditionOperator` offers `like`, `glob`, `starts` and `ends` only | excluded (2026-10-21) | a persistence requirement with a declared seam |
| Old scaffold bench tree | Study supersedes it | excluded | none; never recreate it |

### Earlier names

| Name | Home |
| --- | --- |
| A0a repeatability, A0b fold overlap, A0c attribution, A0d R sequence fingerprint | completed readings |
| A1 summary-prefix seam | S1 |
| A2 aligned-profile wiring | C-M3 |
| A3 custody | partly satisfied by later restaging work, without a boost receipt |
| A4 package improvements | U10 work |
| B0 screen of at most 90 GPU minutes | S1's lite test, then the earned L2 B0 |
| B1 boosted Compaction, B1c off control | B-M7 matched pairs |
| B2 observed Records | R-M2 |
| E1, E2, E3, E4 | R7 (W1, W12); W9; B-M4 (W10); W2, W4, W7, W13 |
| D-records, D-compaction | one design for each surviving open shape |
| B-golden | W7 (R-M5) |
| B-ledger, B-conversation, B-study, B-wiring | survivor builds |
| F-round | one independent audit of the integrated changed claims |
| S-records, S-compaction, L-label, C-compare | L4 |
| P0, BR-1 to BR-5, AG-1, OL-1, extraction residue, fleet sweeps, agent-phase, releases | outside the ladder; `.orkestrel/plan.md` owns them |

## R-L1 specification

One default-off Records treatment in `src/core/ledgers/` on the seams of `692e551:PROPOSAL.md:120-204` that the code has.

| Part | Specification |
| --- | --- |
| Corpus and candidates | `N` and `df` count every message without calls (`src/core/ledgers/Ledger.ts:646-660`), `df` counting a message one time; the scoring candidates are the planner's units, the live messages left after the held, tail and no-token exclusions (a user message with no id, number or name is excluded, `src/core/ledgers/Ledger.ts:661-671`); `L` and `avgL` read over the same corpus; both populations stay as the code reads them |
| Scorer | replace `src/core/ledgers/Ledger.ts:687-689` with BM25: idf `ln(1 + (N - df + 0.5) / (df + 0.5))` (the Lucene form); term factor `tf * (k1 + 1) / (tf + k1 * (1 - b + b * L / avgL))` (the Okapi form; the constant `k1 + 1` changes no order); `L` the unit's word count, `avgL` the mean |
| Defaults | `k1` 1.2 and `b` 0.75, frozen for the first comparison; retune only on evidence, and a lower `b` for short fields only on evidence |
| Analyzer | `extractWords` stays; it returns sets, so `tf` and `L` count the same `[\p{L}\p{N}]+` matches; stemming is deferred (recall up, precision down, little aggregate gain in English) |
| Query | the distinct analyzed words of the request; an empty query or corpus scores nothing; a unit with no shared word is no hit and never pads a result |
| Identity | ids, owners and topics stay on the keyed path; BM25 never decides id equality |
| Discovery | a group-4 unit enters the candidate set when its score reaches a floor frozen before L0, after the rules record and direct references, inside the room `#trim` enforces (`src/core/ledgers/Ledger.ts:764-767`) |
| Order | groups and position order stay; BM25 replaces the score where `src/core/ledgers/Ledger.ts:704-716` reads it; position stays the last order key; no score is stored on a message |
| Recall | order the listing by BM25 over the topic words instead of most recent first (`src/core/ledgers/Ledger.ts:1076`); id, owner and topic matches stay first; the repeat stop is unchanged |
| Out of scope | inverted index, corpus revision, result cache, cursor, own-work population, `Message` time field |
| L0 gate | offline differential over the 96-goal scripted `endurance` declaration, row off (byte identity) and on, read through W12 fields as never filed, filed but not selected, selected incorrectly, and selected but ignored at `ev-02-4`, `ev-12-4` and `ev-22-4`; promotion needs fewer filed-but-not-selected required sources by the count margin at both ends and no rule or obligation lost |
| L1 gate | one early batch at R13 inside G1R with 2 targets and 2 guards; R3 and R-L1 run in separate batches |
| Not embeddings | no ecosystem primitive exists; an embedding is a second model call per message where the judge already takes 63 of 109 q4 minutes; the dense models of BEIR Table 2 average lower than BM25 except GenQ at +2.5% |
| Research | `tmp/units/review-1021-bm25-report-2.md` § Facts rows 1 to 17 and 25 to 26; the Lucene idf form `tmp/units/review-1021-bm25-report.md:14` |

## R3 build

| Part | Specification |
| --- | --- |
| Fix | with the `link` option on, a lookup subject that is not an id token but carries exactly one id (`extractTokens`) is treated as that id under the two existing `linkOwners` branches (an owner id links to itself; any other id links to the single owner the reading names), so the link is keyed in the form placement and the planner look up (`src/core/ledgers/helpers.ts:495-516` at `b9da929`); the build of 2026-10-22 corrected the earlier wording, "link the subject to the owner its one id names", which no consumer reads because placement and the planner look up bare ids |
| Default | off, under U7 |
| Controls | wrong-owner and cross-case obligation controls |
| Order | after W12's selection-evidence fields and before R-L1, so the lexical comparison runs on corrected attribution |
| Test | the probe's R3 case promoted into `tests/src/core/ledgers/helpers.test.ts` with the wrong-owner, two-id, two-owner and no-owner controls, and a Ledger-level case in `tests/src/core/ledgers/Ledger.test.ts` comparing provider bytes (2026-10-22) |

## Rulings of 2026-10-21

The rulings of the boosts review (Orchestrator, 2026-10-21, `692e551:.orkestrel/ledger.md:567-569`), accepted by the user in the cleanup instruction of 2026-10-21. RV-7 is in force (the Decisions ruling in `.orkestrel/agent/plan.md` § Rulings in force).

| Id | Kind | Ruling | State |
| --- | --- | --- | --- |
| RV-1 | add | R-L1, as § R-L1 specification states | in force |
| RV-2 | add | R3 as the first Records build, before R-L1 | in force |
| RV-3 | change | the order of dispatches: W6 fix, W8 closure, runner pin with the W4 re-verify, W12 then R3, R-L1 with its L0, G0 then G1A then G1R then G1B, G3; W11 projection preparation when a semantic L1 claim is near; A-G, B-G, W3b, G2 and G7 only if G3 shows a repair that holds across a second case | carried in `.orkestrel/agent/plan.md` |
| RV-4 | change | every Grok row (W9, W10, the W11 pilot, B-M4) runs on a Claude distiller or labeler until a labeling lane runs on the proved Grok route (`.orkestrel/agent/plan.md` § Rulings in force, Grok route); record each substitution | in force; the map lane of 2026-10-21 proved the route for mapping |
| RV-5 | change | the R-Q5 diagnosis precedes any excerpt treatment and reads W12 fields | in force |
| RV-6 | change | Compaction gets one screen first: G3 with Q3a, then Q1, on W6's onset body for 15 model minutes; every other Compaction row waits for it | in force |
| RV-7 | change | review S-T in the first read-only lane; release it with Study 0.0.3 behind the Records L1 work | in force (Decisions, 2026-10-21) |
| RV-8 | park | W9 and W10 until R1 to R5 have an L1 result; the Grok route alone does not reopen them (Grok route) | in force |
| RV-9 | park | W13 until G3 passes | in force |
| RV-10 | park | R-S1, R-S2, R-S4, R-S5, RS6, RS9 and RS5 under the ladder's reopening conditions | in force |
| RV-11 | park | C-S2, C-S3, C-S4 and S3; runner tuning is not a memory treatment | in force |
| RV-12 | park | C-Q8, C-Q11, consumer-only boundary folds and C-Q6 behind G3 | in force |
| RV-13 | keep | B-Q2, embeddings, graph memory, semantic cache, deletion and C-Q12 stay excluded | in force |
| RV-14 | reject | `Message` time fields, corpus revisions, result caches, cursor recall, the own-work corpus partition and FTS5 | in force |
| RV-15 | keep | more desk topics stay excluded | in force |
| RV-16 | keep | R1, R2, R4a, R5a, R4b, R5c, R5b, R6, R7, R-Q2, R-M3, R-M5 and the ladder's gates stand; the exposure repairs run R3, then R2 and R1, then R4a and R5a | in force |
| RV-17 | root document | `RESULTS.md` stays frozen at the root | superseded (Cleanup): `RESULTS.md` reads at `692e551`; its figures are in `.orkestrel/agent/evidence.md` |
| RV-18 | root document | `ANALYSIS.md` stays unedited as the evidence catalogue; its § 6 state columns are not maintained | superseded (Cleanup): `ANALYSIS.md` reads at `692e551`; its § 2, § 3 and § 6 are rows here, its figures in `.orkestrel/agent/evidence.md` |
| RV-19 | root document | `PROPOSAL.md` is adopted in part: its exposure repairs are the R rows, its BM25 content is R-L1, its persistence, index and recall-continuation designs are rejected; this replaces the "`PROPOSAL.md` unread" row (`tmp/units/ladder/dispatch-ledger.md:117`) | in force; the ruling row is in `.orkestrel/agent/plan.md` § Rulings in force (PROPOSAL); `PROPOSAL.md` reads at `692e551` |

## Probe record

`tmp/probes/review-1021-proposal.test.ts` ran through the `probe` project on 2026-10-21 at 11:35: 8 passed, exit 0, 688 ms (`tmp/units/review-1021-ledger.md:44`). It shipped nothing: its R3 case was promoted with the R3 fix on 2026-10-22 and the probe deleted.

| Claim | Control | Result | Settles |
| --- | --- | --- | --- |
| a prefixed subject `order:BC-7301` links to no owner | a bare `bc-7301` links to `BC-7301` | confirmed; the registry names `BC-7301` under both | the R3 defect sits at `src/core/ledgers/helpers.ts:461` |
| wording in an assistant reply is not listed by `recall` | the same wording in a user message is listed | confirmed: the reply case returns `nothing on` | wording recall reads user messages and lookup readings only (`src/core/ledgers/Ledger.ts:1098-1102`) |
| a second identical `recall` returns the repeat note | a second recall on another topic is answered | confirmed | `recall` has no page or cursor |
| the lookup message's record membership under both subjects | none | not shown: the lookup message joins no owner record in this fixture | the record-level effect of R3 stayed unproved until R3's claim R3-3 (2026-10-22): a later message naming the carried id files under the named owner's record with `link` on and under none with it off |
