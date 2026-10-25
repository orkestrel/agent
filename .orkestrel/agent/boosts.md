# Agent boost ideas

The idea record for Agent's memory boosts as it stood on 2026-10-21: the code seams a boost touches, every idea with its hypothesis, evidence, status and gate, the R-L1 design, the R3 build, the rulings of 2026-10-21, and the probe that settled the seam claims.

- `src/`, `studies/` and `tests/` citations read at commit `692e551`; a citation prefixed `692e551:` names a record that left the tree after that commit (`git show 692e551:PATH`); a `tmp/` citation names a gitignored working file on disk on 2026-10-21, and a `tmp/units/ladder/PATH` citation reads at the same relative path under `.orkestrel/agent/instruments/ladder-records/` or `.orkestrel/agent/instruments/ladder-witnesses/` after the U19 retirement of 2026-10-23, or names a deleted file.
- `.orkestrel/agent/plan.md` owns the units (W0 to W13, A, B, G0 to G7), the order of dispatches, the levels L0 to L4 and their caps, the user rulings U1 to U16, and the gates this file names: the noise allowance `N`, the count margin, the coverage, speed, timing and semantic gates, and the both-end contract.
- `.orkestrel/agent/evidence.md` owns the figures; an `E` id names one of its conclusions.
- The idea rows draw on `692e551:ANALYSIS.md:246-407` and `tmp/units/ladder/ladder-2.md:271-379`; where the two differ, the later ladder row wins and the row names the difference.
- Status `adopt` builds the idea or keeps it as an instrument; `probe` runs only the named next step; `retain` keeps proved behavior; `park` removes the idea from the active plan until its reopening condition holds; `excluded` records a reasoned rejection. An unrun idea has not failed.
- Every live row inherits the ladder's controls (off, exact repeat, sham, on), its guards and its level caps. A threshold in a gate is a prospective decision rule, not a result.
- Resumption (U21, user, 2026-10-23): when the Mechanisms campaign of `.orkestrel/plan.md` lands, the unrun ideas run first on its instrument: R1, R2, R4a, R4b, R5a, R5b, R5c, R-Q5, R-Q7 and the Compaction screen G3 (S5 with Q3a, then Q1); each passes a cheap check that its mechanism can act on the instrument's data before any measurement is built.

## D1 marked-request successor (2026-10-25)

The user-approved live attempt is rejected for product D1. All 226 observations were valid and sealed, but fitting noise `0.1348445274` exceeds `0.05`; no nominal cutoff reaches precision `0.90`. At `0.70`, precision is `0.65` versus `0.80` for the preceding wording. Validation remains ungraded and no cutoff exists. Preserve `tmp/units/ledger-sentence-target-live-2/report.md` and its complete custody. U30 admits no retry or another wording change. The earlier CPU acceptance remains an implementation result, not semantic acceptance. D1 needs a scope decision before D3's integrated review and the remaining quality campaign proceed.

CPU preparation is accepted after independent review, exact prescribed repairs, and independent project gates. This successor marks only the selected original sentence occurrence inside the complete earlier text, preserves source characters through the declared escaping, and binds every generated/admitted request to digest `85a94b1d934e4f44d6ff757048846ee6c2d5eced5966fc18a31b8bcbcc8bf31d`. It supersedes the old sentence request's pair-prefix promise; ordinary pair requests retain their existing renderer. The exact contract is in `tmp/units/ledger-sentence-target-design-report.md`, implemented under `studies/sentences/`. Product D1 must match these calibrated wire bytes if calibration passes.

The complete population, labels, observation membership, scoring floors, and hard controls remain unchanged. The observed encoded-body total is 583422 bytes versus 528195; semantic accuracy and latency remain unmeasured. The initial calibration failure and its unused held-out scores remain retained. Independent setup passed 183 tests and studies passed 208 with the existing locale skip; studies took 1270558 ms uncapped. Formal MCP attempts produced no receipt; the retained ordinary tests and discriminating mutations are separate evidence. No repeat CPU audit or project gate is owed on these bytes.

U30 admitted the single successor described in `tmp/units/ledger-sentence-target-live-proposal.md`; its refusal is recorded earlier in this section. No cutoff, product implementation, or quality gain is established. A future accepted calibration would still require the integrated D1/D2/D3 review, gates, replacement revisit, and complete offline replay. R3 cleanup remains accepted.

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
| R3 prefixed owner linking | linking the one id a prefixed subject carries corrects attribution | § Probe record; measured endurance and R replay populations showed no effect | removed under the user's 2026-10-24 cleanup instruction; ordinary owner linking remains. Independent review PASS; source 1662, setup 183, guides 147 and studies 198 passed with one existing ICU skip. Historical build and L0 findings remain below | retired; any future mechanism needs a real population where it can act and a new scoped decision |
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
| Order | groups and position order stay; BM25 replaces the score where `src/core/ledgers/Ledger.ts:704-716` reads it; position stays the last order key; no score is stored on a message; amended 2026-10-22 on the L0 observation at room 16,384 (`tmp/units/ladder/r-l1-amendment-design.md`): BM25 decides group-4 admission, order and cut order only, and groups 1 to 3 keep the IDF-sum score for order and cuts exactly as the off arm computes it, because BM25 reordering cuts inside keyed group 1 lost a required source while discovery and recall never acted (R-L1-3) |
| Recall | order the listing by BM25 over the topic words instead of most recent first (`src/core/ledgers/Ledger.ts:1076`); id, owner and topic matches stay first; the repeat stop is unchanged; amended 2026-10-22 on the R-L1-1 review (FAIL 7, 8): the admitted population is the checkpoint's conjunctive predicate plus an analyzed overlap, never widened to any-word presence; the cut-line matcher recognizes the suffix form its own arm writes (`older` off, neutral on), so the off arm's results note keeps the checkpoint's bytes; the design's decision 2 clause "recognize both suffixes" yields to decision 4 |
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
| Closure | closed at L0 on 2026-10-23 as non-promoting on this instrument (U19, `.orkestrel/agent/plan.md` § Rulings in force), because the option is inert on the endurance grammar; a Sonnet runtime probe (`tmp/probes/r3-grammar/`, `Tests 4 passed (4)`, about 4 minutes, GPU 0) ran each scenario with `link` off and on: A, the proving fixture `LEDGER_LINK_FIXTURE` (`tests/setup.ts:3780`; tests `Ledger.test.ts:468-503`, `helpers.test.ts:566` and `:1251`), a prefixed subject `order:BC-7301` with the bare owner id `BW-20931`, differs between off and on (`linkOwners` empty off and `BC-7301` to `BW-20931` on, plan owners and provider bytes differ); B, the endurance grammar (prefixed owner ids `customer:BC-4101` and `order:BC-7301`, as `studies/memory/StudyMemorySession.ts:193` and the bench recorder's lookup table return them), gives identical `linkOwners` results (empty), plan owners, records and provider bytes; C, B with only the customer owner id unprefixed, differs again, so the prefix alone makes R3 inert; the endurance census holds 39 record ids in 24 of 96 goals, none bare, and no order record names a customer account id, so even bare owners would give R3 nothing to link; the mechanism is that `linkOwners` links only to an owner key found in `extractTokens(text).ids` (`src/core/ledgers/helpers.ts:593`, `:604-605`) and `extractTokens` never yields a prefix; the U2 reader lane found it (its U2.8 escalation), and the recorder lane and the Orchestrator confirmed it independently; the option stays default-off in `src/` and parks until a study whose lookups return bare owner ids that record texts name |

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
| RV-7 | change | review S-T in the first read-only lane; release it with Study 0.0.3 behind the Records L1 work | superseded (MR-7, 2026-10-23): S-T is merged into Study `main` (`2ad4fb2`) in the Mechanisms campaign and releases with Study 0.0.3 at that campaign's acceptance (`.orkestrel/plan.md` § Mechanisms campaign) |
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

## Promotion requirements

Retain these contracts for a later package campaign; U17 authorizes finishing and retiring the bench, not package promotion (`.orkestrel/agent/plan.md:41`). Read on 2026-10-22. Witnesses identify inspected test declarations and assertions; no tests were rerun. Capture-step contracts follow `tmp/units/ladder/capture-step-design.md:68` during concurrent mutation review. All paths resolve from Agent. Historical test names identify witnesses, not package policy. Exclude `tmp/units/ladder/promotion-map.md:86` in full. The U17 retirement ran under U19 on 2026-10-23: the witness test files named in the following subsections and the sources and fixtures they import moved to `.orkestrel/agent/instruments/ladder-witnesses/` (67 files), which is kept on disk until the user sweeps it, rather than being deleted with the bench (Orchestrator, 2026-10-22), so a package campaign can still port them. A `tmp/units/ladder/PATH` citation in this section reads at the same relative path under `ladder-witnesses/` for a witness file and under `.orkestrel/agent/instruments/ladder-records/` for a record. G1A′ and G1R, the named first consumers of the materialized closure and of the Records prefix replay, are cancelled (U19), so a package campaign needs a first consumer and a plan decision from the user before it builds any of the four mechanisms; the user ruled that decision on 2026-10-23 (U20, `.orkestrel/agent/plan.md` § Rulings in force), and the Mechanisms campaign of `.orkestrel/plan.md` builds them, each with the first consumer its design names.

### Study materialized artifact closure

Owner: `@orkestrel/study/server`, extending `ArtifactLoader.inspect/verify/load`, which captures and loads bytes but exposes no materialization operation (`../study/src/server/artifacts/ArtifactLoader.ts:57`, `../study/src/server/artifacts/ArtifactLoader.ts:152`, `../study/src/server/artifacts/ArtifactLoader.ts:168`). First consumer: G1A′/G1R sharing one closure (`tmp/units/ladder/promotion-map.md:36`).

The package must satisfy these requirements.

1. **M1.** Create an absent, nonoverlapping destination exclusively; preserve exact bytes; verify source before and after copying and destination before returning success.
2. **M2.** Refuse traversal, redirected ancestors, aliased members, unsafe names, duplicate keys, occupied destinations, and stale source references before copying through them.
3. **M3.** Inventory every admitted physical member, including explicit assets and non-entry dependencies; refuse additions, omissions, or changed bytes.
4. **M4.** Load the materialized graph through existing captured loading; refuse drift during validation before publishing a usable closure.

Port these witnesses.

- M1/M3 — `tmp/units/ladder/receipts/Custodian.test.ts:44`, `A8 copies exact Unicode bytes and refuses changed complete membership`: BOM/CRLF/Unicode equality; added, altered, and deleted files refuse.
- M1/M2/M3 — `tmp/units/ladder/receipts/Custodian.test.ts:67`, `A8 refuses aliases, traversal, occupied targets, and stale source receipts before copying`: unsafe keys, duplicate members, stale references, and extra source files refuse.
- M2 — `tmp/units/ladder/receipts/Custodian.test.ts:130`, `A8 refuses an ancestor junction without writing through it`: outside destination remains absent.
- M2 — `tmp/units/ladder/receipts/Custodian.test.ts:19`, `A8 credential names match exact forms at archive and physical path boundaries`: forbidden names refuse; benign names remain admitted, including uppercase variants.
- M1/M4 — `tmp/units/ladder/staging/Freeze.test.ts:13`, `B4 two captures preserve complete identical bytes and real captured Study check`: inventories match; captured Study produces its fingerprint.
- M3 — `tmp/units/ladder/staging/Freeze.test.ts:38`, `B4 driver dependency tamper refuses the frozen inventory`: non-entry modification refuses; restored bytes verify.
- M3 — `tmp/units/ladder/staging/Freeze.test.ts:53`, `B4 added and omitted driver, package, and seed members cannot verify`: each population is indispensable.
- M4 — `tmp/units/ladder/staging/Freeze.test.ts:81`, `F-B4 check-time runtime write refuses before freeze receipts`: mutation during validation leaves completion receipts absent.

Host/gaps: port the junction proof across supported filesystems. Study advertises Node 22.18.0 (`../study/guides/study.md:5`); these witnesses do not qualify that floor. Copying uses path checks and separate reads, not an atomic filesystem snapshot (`tmp/units/ladder/receipts/Custodian.ts:19`). Hardlink-race resistance, concurrent replacement, crash recovery, and aggregate materialization limits remain unproved. Retained file locks belong with Study, separate from process custody (`tmp/units/ladder/promotion-map.md:36`).

### Study bounded exchange recording and replay

Owner: `@orkestrel/study/server`, `StudyOllamaTransport` and execution custody. Main sends through native fetch (`../study/src/server/ollama/StudyOllamaTransport.ts:378`); the role-aware S-T collaborator remains held (`.orkestrel/agent/plan.md:169`). First consumers: G1A judge capture and Records prefix replay (`tmp/units/ladder/promotion-map.md:37`).

The package must satisfy these requirements.

1. **E1.** Keep exact-body admission; optional capture declarations must contain a positive safe byte length and no predeclared body/input receipt.
2. **E2.** Before sending, enforce serial member, role, path, ordinal, model/options, and capture-length identity; exact mode must reject same-length substitutions.
3. **E3.** Retain raw request/response bytes, digests, ordered identities, and attempted/terminal outcomes; refuse invalid terminal responses without manufacturing completion or usage.
4. **E4.** Bound calls, bytes, and elapsed work; retain admitted charges after failure; latch caught refusals. Live and replay budgets must follow their respective declarations.
5. **E5.** Bound metadata independently; verify declared version/model digests before and after execution; refuse unexpected routes/phases without model-quota charges.
6. **E6.** Replay exact recorded exchanges offline; refuse missing, altered, or reordered evidence before dependent live work; prospective capture declarations alone cannot replay.
7. **E7.** Seal only complete joined evidence under custody bounds; refuse duplicate, orphaned, or partial histories and unsealed exchange sidecars.

Port these witnesses.

- E1 — `tmp/units/ladder/records-seed/Recorder.test.ts:29`, `CS1 capture procedures pass offline admission`: valid inventory passes; body/input and invalid lengths refuse.
- E2/E3 — `tmp/units/ladder/records-seed/Recorder.test.ts:57`, `CS2 capture steps record consumer bodies of the sealed length`: captured digest equals peer and baseline; no input field.
- E2 — `tmp/units/ladder/records-seed/Recorder.test.ts:85`, `CS3 a capture body off its sealed length refuses before sending`: only the preceding POST arrives; no completion.
- E2 — `tmp/units/ladder/records-seed/Recorder.test.ts:106`, `CS4 a capture step out of member order refuses before sending`: zero POSTs.
- E2 — `tmp/units/ladder/records-seed/Recorder.test.ts:127`, `CS5 capture bodies keep the declared model options`: offline admission passes; changed options yield zero POSTs.
- E4 — `tmp/units/ladder/records-seed/Recorder.test.ts:150`, `CS6 live Records takes the wall cap and replay keeps 120,000 ms`: covers CS6/CS7; live budget follows wall cap; replay keeps its default; no timed-stop proof.
- E1/E2 — `tmp/units/ladder/records-seed/Recorder.test.ts:180`, `CS8 exact steps refuse a same-length changed body`: zero POSTs.
- E1/E3 — `tmp/units/ladder/drivers/Transport.test.ts:53`, `CS8 exact exchanges keep the G0 journal key order`: exact-mode attempt/completion serialization stays unchanged.
- E6 — `tmp/units/ladder/drivers/Transport.test.ts:95`, `CS8 the Replay consumer refuses a capture step before any request`: zero POSTs.
- E3 — `tmp/units/ladder/drivers/Transport.test.ts:15`, `A2 preserves every role body and complete multi-chunk Unicode CRLF response through real W5`: exact request bytes; response Unicode/CRLF and role identity.
- E1 — `tmp/units/ladder/drivers/Driver.test.ts:115`, `A1 changed inputs, absent receipt, reordered members, and changed quota refuse before peer startup`: no peer or destination.
- E4 — `tmp/units/ladder/drivers/Driver.test.ts:46`, `A3 rejected consumer attempts stay terminal even when caught`: no completed execution.
- E3/E4 — `tmp/units/ladder/drivers/Driver.test.ts:56`, `A3 broker quotas aborts and interrupted terminal responses retain charges and no completion`: failures retain charges; interrupted responses retain attempt/failure rows.
- E4 — `tmp/units/ladder/drivers/Driver.test.ts:85`, `A3 body and response caps retain W5 stop attribution and cleanup`: bounded stop, correct charge, empty cleanup remainder.
- E2/E7 — `tmp/units/ladder/drivers/Driver.test.ts:104`, `A3 concurrent calls cannot create complete evidence`: serial refusal; no completion.
- E5 — `tmp/units/ladder/drivers/Metadata.test.ts:34`, `A4 exact bounded metadata succeeds before and after model calls without model quota charges`: exact GET/POST order and model count.
- E5 — `tmp/units/ladder/drivers/Metadata.test.ts:56`, `A4 wrong digest or version and redirect oversized or slow metadata refuse before model POST`: zero model calls.
- E5 — `tmp/units/ladder/drivers/Metadata.test.ts:81`, `A4 rejected routes never reach the dedicated peer`: wrong route, query, method, member, extra observation, and body refuse.
- E5 — `tmp/units/ladder/drivers/Metadata.test.ts:112`, `A4 completion metadata cannot precede the frozen model population`: zero POSTs.
- E5 — `tmp/units/ladder/drivers/Metadata.test.ts:9`, `F-O1 refuses a staged POST when metadata admission changes during body collection`: no tags or POST after phase failure.
- E6 — `tmp/units/ladder/records-seed/Recorder.test.ts:298`, `A5 capture and fresh-process replays retain every later selection correction and response byte`: repeated reconstruction matches; empty/missing exchanges, altered answers/bodies/history, and incomplete goals refuse.
- E6 — `tmp/units/ladder/staging/Reader.test.ts:15`, `F-B8 reversed A exchange identities refuse eligibility`: reversed, internally consistent exchanges still refuse the declared order.
- E7 — `tmp/units/ladder/staging/Reader.test.ts:74`, `F-O4 A event journal admits completed projection and refuses partial history`: missing response/metadata, duplicate attempt, and incomplete terminal history refuse.

Host/gaps: native fixture runs inherit the following process qualification. Live Mica response compatibility remains unproved (`tmp/units/ladder/capture-step-design.md:279`). Capture length/options do not prove content fidelity (`tmp/units/ladder/capture-step-design.md:289`). S-T integration, total journal-storage bounds, and package sealing remain obligations: the bench appends without an aggregate journal limit (`tmp/units/ladder/drivers/Transport.ts:309`), while Study seals a fixed inventory (`../study/src/server/stores/StudyResultStore.ts:170`). Add direct malformed-terminal controls beyond interrupted HTTP (`tmp/units/ladder/drivers/helpers.ts:197`). CS6/CS7 do not prove deadline enforcement (`tmp/units/ladder/capture-step-design.md:66`).

### Process retained process-tree custody

Owner: `@orkestrel/process/server`, strengthening `createProcess/createSession` and termination helpers (`../process/src/server/factories.ts:39`, `../process/src/server/factories.ts:61`). Existing `stopChild` returns for an exited root; Windows termination uses `taskkill` (`../process/src/server/helpers.ts:778`, `../process/src/server/helpers.ts:683`). First consumer: dedicated study daemon, then Study workers (`tmp/units/ladder/promotion-map.md:39`).

The package must satisfy these requirements.

1. **P1.** Establish containment and retain identity before resuming executable work; failed creation/admission must leave no runnable child.
2. **P2.** Authorize operations by retained birth/handle identity; refuse unrelated or stale roots without affecting their occupants.
3. **P3.** Terminate owned descendants after root exit, custody EOF, or host death, including detached descendants; preserve unrelated processes.
4. **P4.** Bound stop/join, preserve responsiveness during another wait, confirm remaining membership, and surface cleanup failures.
5. **P5.** Refuse unsupported hosts without weaker fallback; preserve argument/environment bytes and refuse NUL before creation.

Port these witnesses.

- P1 — `tmp/units/ladder/fix-w5-2/native.test.ts:399`, `native CreateProcessW error is retrieved and a later valid job remains usable`: exact native error; subsequent job succeeds.
- P2 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:222`, `R2 reused PID birth fixture refuses handle termination and preserves current identity`: altered birth refuses; genuine root survives.
- P2 — `tmp/units/ladder/fix-w5-2/native.test.ts:243`, `native unrelated sentinel and parent cannot become stop tree or wait roots`: all operations refuse; sentinel survives.
- P3 — `tmp/units/ladder/fix-w5-2/native.test.ts:296`, `native ${ending} removes detached descendants and preserves unrelated sentinel`: root exit, EOF, abrupt host death; owned identities already gone.
- P4 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:246`, `R2 native dispatcher deadline terminates only its retained job handles`: deadline exit, descendant gone, sentinel alive.
- P4 — `tmp/units/ladder/fix-w5-2/native.test.ts:264`, `native stop remains responsive while a different job wait is pending`: second job stops within the test bound.
- P1/P4/P5 — `tmp/units/ladder/fix-w5-2/faults.test.ts:19`, `native ${fault.name} failure refuses with durable accounting and preserves unrelated sentinel`: load, ABI, worker, stop, partial cleanup, host EOF, unsupported-host cases; failure retained, recorded children gone (`tmp/units/ladder/fix-w5-2/constants.ts:54`).
- P5 — `tmp/units/ladder/fix-w5-2/native.test.ts:127`, `B2 native guard refuses NUL at every Win32 command path and environment field before creation`: no marker; valid control executes.
- P5 — `tmp/units/ladder/fix-w5-2/native.test.ts:201`, `native argument quoting preserves empty quotes slashes Unicode and shell-looking values`: exact arguments/environment round-trip.

Host/gaps: Windows x64 Node 26.12.0 only; `node:ffi` and experimental FFI workers (`tmp/units/ladder/launch/NativeKernel.ts:10`, `tmp/units/ladder/launch/NativeKernel.ts:33`, `tmp/units/ladder/launch/NativeWait.ts:15`). Linux, Node 22.18.0, actual PID recycling, and forced assignment/resume failures remain unqualified. P1's suspended assignment is implemented (`tmp/units/ladder/launch/NativeKernel.ts:125`, `tmp/units/ladder/launch/NativeKernel.ts:151`); the cited faults do not independently interrupt that interval. The U19 retirement copied each witness test with its static imports, so the native sources the witnesses load by path (`NativeKernel.ts`, `NativeJob.ts`, `NativeHost.ts` and `NativeWait.ts`, named in `tmp/units/ladder/fix-w5-2/constants.ts`) were deleted with the bench; their design survives in the W5 records under `ladder-records/`.

### Ollama dedicated daemon session

Owner: a server-only `@orkestrel/ollama` domain composed with process custody; first consumer: Study local GPU runs (`tmp/units/ladder/promotion-map.md:40`). Core `OllamaProvider/OllamaJudge` already accept URL/fetch; exports contain no server entry (`../ollama/src/core/OllamaProvider.ts:44`, `../ollama/src/core/OllamaJudge.ts:72`, `../ollama/package.json:29`).

The package must satisfy these requirements.

1. **D1.** Start only the selected executable with matching digest/version evidence; refuse missing/stale identity and replacement through use.
2. **D2.** Use an explicitly dedicated endpoint/environment; refuse occupied endpoints; override inherited variable names case-insensitively without altering unrelated values.
3. **D3.** Bound readiness, tolerate valid delayed replies, and verify version/model identities before requests; never adopt an unrelated process as owner.
4. **D4.** Unload only the declared model; retain maintenance identity; terminate/join only owned resources on completion, failure, or cancellation.

Port these witnesses.

- D1 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:33`, `R1 missing offline version receipt refuses before any child`: no destination or child cleanup.
- D1 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:49`, `R1 receipt executable digest mismatch refuses before any child`: same refusal boundary.
- D1 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:86`, `R1 changed runner after preflight refuses before daemon startup`: changed digest; no destination.
- D1 — `tmp/units/ladder/fix-w5-2/native.test.ts:89`, `B1 equal-digest Unicode alias locks the selected original through use`: original/ancestor replacement denied; distinct alias remains writable.
- D2 — `tmp/units/ladder/fix-w5-2/fixtures/Launcher.test.ts:123`, `occupied ephemeral endpoint refuses before creating a destination`: no destination.
- D2 — `tmp/units/ladder/fix-w5-2/fixtures/Launcher.test.ts:223`, `pinned manifest, path boundaries, immutable inventory, and earliest cap have controls`: environment case variants collapse to the explicit value; unrelated value survives.
- D3 — `tmp/units/ladder/launch/Launcher.test.ts:68`, `readiness waits through a version route that answers after 1,500 ms`: completion, start receipt, empty cleanup remainder.
- D3 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:175`, `R1 post-start HTTP version mismatch refuses with a charged row and verified cleanup`: no driver spawn; owned daemon cleaned.
- D3 — `tmp/units/ladder/fix-w5-2/Launcher.test.ts:187`, `R2 forged daemon receipt preserves the unrelated sentinel and refuses`: foreign PID receipt refuses; sentinel remains outside cleanup.
- D3 — reuse E5's `A4 wrong digest or version and redirect oversized or slow metadata refuse before model POST` (`tmp/units/ladder/drivers/Metadata.test.ts:56`).
- D4 — reuse E3's `A2 preserves every role body and complete multi-chunk Unicode CRLF response through real W5` (`tmp/units/ladder/drivers/Transport.test.ts:15`): maintenance bytes/count retained.
- D4 — `tmp/units/ladder/drivers/Replay.test.ts:8`, `F-A7 refuses samples and timing from a different unload model`: changed, selected, and timing model mismatches refuse.
- D4 — `tmp/units/ladder/fix-w5-2/fixtures/Launcher.test.ts:335`, `wall cap cleans only recorded trees and leaves an unrelated process alive`: both descendant chains gone; sentinel survives.

Host/gaps: inherits native Windows qualification. CPU peers do not prove GPU residency or cold-cache effects. The endpoint reservation closes before launch (`tmp/units/ladder/launch/Launcher.ts:303`); readiness checks a PID receipt against owned membership, not socket ownership (`tmp/units/ladder/launch/Launcher.ts:781`). Port takeover, model-store isolation, service-version breadth, and unload residency remain unproved. Environment settings merge inherited variables; they do not isolate the host (`tmp/units/ladder/launch/Launcher.ts:715`).

Counts refer to numbered requirements and named test declarations/templates per mechanism; reused witnesses count in each consumer, parameterized matrices once. Sizes concern implementation: capability additions are medium; the daemon domain and integrated cross-package campaign are large (`../scaffold/AGENTS.md:78`, `../scaffold/AGENTS.md:79`).

| Mechanism | Package | Requirements | Witnesses | Size |
| --- | --- | --- | --- | --- |
| Materialized closure | Study | 4 | 8 | medium |
| Exchange recording/replay | Study | 7 | 23 | medium |
| Retained process custody | process | 5 | 9 | medium |
| Dedicated daemon session | ollama | 4 | 13 | large |

## U21 static census

Five read-only Sonnet lanes read the retained real series on 2026-10-23 (Workflow `wf_7aafb1f1-285`; full census `tmp/units/u21-census.json`): Records `tmp/studies/endurance-capacity-3/` trial `r1-s1-a1` and Compaction `tmp/studies/compaction-output-2/` trial `r1-s1-a1`, with the public endurance sources. A trigger present means the idea's mechanism has something to act on in real data; it is not an effect.

| Idea | Trigger | Finding | Next |
| --- | --- | --- | --- |
| R1 | present | the tail is ev-01-1's eight opening arrivals for all 96 goals (it never moves); 21 of 24 handoffs miss their shift's thread; 8 clear and 2 borderline stale-date stamps | the packet uses off-focus handoffs (shifts 2 and 14), because ev-01-4 and ev-13-4 are on focus at baseline; pin only the three standing ids |
| R2 | present | 95 of 96 prompts name earlier products; every revisit product checked misstates or substitutes one; 0 of 100 lookups ask for a goal id | run with R1 off; carry the goal id in the work identity |
| R-L1 | present | 10 of 24 handoff requests go out with an empty briefing (byte-identical across shifts), so group-4 discovery has candidates | the offline replay differential decides |
| R5b | present | goals 49, 53 and 77 hold 410 of 729 judge calls (377 pair calls); inert on a shortened packet | a recording with ancestry to goal 48, or an offline enumeration of candidate pairs |
| R5c | present | 11 explicit retirement arrivals in shifts 15 to 23 drew zero pair questions | a bounded development arrival set with judge bodies |
| S5 | present | one onset with a lookup at goal 17; 74 refusals in goals 17 to 92 | a fresh-lineage reproduction at goal 17 |
| Q3a | present | the repairable population is 3 bare-id lookups (goals 17, 21, 25), not 62 of 67: 50 are goal-id requests outside any lookup grammar | denominator 3; Records' 100 of 100 found as the guard |
| Q1 | present | all three standing sources fold away at goal 11; 0 of 10 summaries carry an account id; the first wrong account id appears at goal 14 | pins start before fold 1 at goal 11 |
| R4a | undecidable | the retained runs hold no plan or selection rows | the L0 fixture on public text now; an observe-on recording for real data |
| R4b | undecidable | 0 of 128 arrivals quiet or non-decisive by call counts; the classifier answers are not retained | a fixed classifier packet (about 12 to 20 calls) through the exact recording contract |
| R5a | undecidable | 19 retirement arrivals, only 5 at goals where pair questions ran | the goal-49 classification from a recording |
| R3 | absent | 100 of 100 lookups take prefixed ids; no lookup returns a bare owner id | parked; U19 stands |

## U21 prototypes

Default-off prototypes for R1, R2, Q3a and Q1, so the replay differential (`.orkestrel/plan.md` § Recording campaign, RC-4) can tell on the planned recordings whether each mechanism changes what the agent is sent. Two blind designs on 2026-10-23 (planner Opus, `tmp/units/proto-design-planner.md`; analyst Astra, `tmp/units/proto-design-analyst.md`), compared and fact-checked by three Sonnet lanes (Workflow `wf_f0971cdf-233`, `tmp/units/proto-design-diff.md`). The Orchestrator ruled as follows; the planner's design is the base.

| Id | Ruling |
| --- | --- |
| PR-1 | the R packet: `ev-01-1` (the only goal carrying the three standing arrivals, and `ev-02-1` asks for the grant-evidence obligation that only `ev-opening` holds), then shift 2 (`ev-02-1` to `ev-02-4`), recorded first; its continuation adds shift 14 (`ev-14-1` to `ev-14-4`; `ev-14-1` revisits `ev-02-1` through `ev-02-4`). Two segments of 5 and 9 goals keep the eight-goal segment rule; the off-focus handoffs are `ev-02-4` and `ev-14-4`. Only a named goal id is a required dependency; "the previous shift's handoff" is generic text in all 24 shift openings. Each prototype's first change is predicted as the first request after a completed exchange or a later arrival, and the dry runs settle it |
| PR-2 | R1 and R2 switch on plain booleans, `LedgerOptions.recent` (R1) and `LedgerOptions.work` (R2), so RC-8's `Pick` stays pure. The identities the Ledger cannot know come from construction-time handlers the consumer always supplies, inert while their switch is off: `pins`, a message predicate (R1), and a work-naming handler (R2). `respond` does not change. Rejected: the analyst's `LedgerInput` union on `respond` (widens a public method); the planner's `tail` and `work` groups (`tail` collides with `LedgerShare.tail` and the receipt's `tail`, and the groups break the `Pick`) |
| PR-3 | R1 (planner): the seed slice ends at the current request; exchanges holding a pinned message are held; the newest unheld whole exchanges fill the allowance. A held set above the allowance keeps the pins and records the cut in the receipt's `trims` and `omitted`, with no new fault path. The study's pins are `STUDY_MEMORY_STANDING` (`endurance-desk`, `ev-opening`, `ev-register`), with the census's reasons for leaving out the day stamp and `ev-source-1-1` to `ev-source-1-4` |
| PR-4 | R2 (planner): an "Earlier work" briefing section carries each matched earlier reply under its work name, is cut first under room pressure, is never a source, and changes no judge request; a match is a shared id token (`extractTokens`); no recall change, because 0 of 100 lookups ask for a goal id, so a recall branch is inert on this data. The range gap moves to `ev-14-1` ("ev-02-1 through ev-02-4" reaches only the end ids) and its request-side mitigation is due before R2's L1. Analyst grafts: the first goal's agent and judge request bytes stay equal; a wrong or partial reply is carried exactly, labelled agent-authored, and never filed |
| PR-5 | Q3a (planner): one sentence appended to the unchanged lookup description; a `lookup { grammar }` study group admitted on every arm, keeping the Records guard. Analyst graft: the lookup handler's controls (a released prefixed id found, a bare id missing, an unreleased valid id missing) |
| PR-6 | Q1 (planner): the standing arrivals enter the agent's instructions instead of the conversation, with no duplicate (u21's condition); an `instructions { standing }` study group admitted only on the compaction arm and refused elsewhere (CONFIG), following RC-8's refusal over a silent ignore. Analyst graft: a CPU witness through a forced fold whose next agent request still carries the standing sources; grading still reads the arrival id |
| PR-7 | readings: the first divergence is reported as found. It reads "can act" when it is the idea's intended member on an agent request (R1, R2 and Q1: `messages`; Q3a: `tools`), and "inconclusive, acts elsewhere" otherwise. A section cut everywhere for room reads "blocked by room" (inconclusive), never inert. A full replay with equal requests and equal normalized selection reads inert on that population. An omitted or `false` arm diverging, or a positive control failing, reads "instrument refused" |
| PR-8 | passivity: the planner's three layers (the W7 capture with an acting handler under explicit `false`; the study passivity cases with a treatment axis; omitted and `false` replays of every sealed recording) and the analyst's omitted-group and empty-group cases. Population passivity against today's code: the baseline replays fully under a frozen closure of the pre-prototype build (RC-5 admits the content change) |
| PR-9 | units: `proto-ledger` (R1, then R2, in `src/core/ledgers/`; Sol; now, beside the Study units; one commit per idea; product fixtures and guide rows, R2's constants and helpers included), then one read-only review (Astra) and a gate (Luna); `proto-wiring` after `rec-release` (the R1 and R2 study keys, Q3a and Q1; Sol; owns `studies/memory/` and its tests, and generalizes the replay fixture by arm for a Compaction recording), then review and gate; then the dry runs on CPU; then the differentials on the sealed recordings. A prototype is accepted only with its consumer and its positive replay control |

## U21 baselines and first differentials

The five baseline recordings of 2026-10-24 on Ollama 0.40.10 (dedicated daemon on 11435), Study `6e30457` pinned locally (U25), Agent content `4cd54ecd…` for every segment; caps per U24 (30 model, 40 elapsed minutes), C first fold re-allocated to 10/13 within that reservation after C opening ran 1.33× its 0.40.3 analogue. Each recording sealed and replayed fully offline on CPU (13 to 14 s, zero model requests). Records: `tmp/units/rec-runs/`, logs `tmp/units/rec-gpu/`.

| Recording | Goals (live) | Result, seal | Live calls | Live model min | Elapsed min | Sidecar |
| --- | --- | --- | --- | --- | --- | --- |
| R opening | `ev-01-1`, `ev-02-1` to `ev-02-4` (5) | `4621d216`, `c4b9d4aa` | 12 agent, 31 judge | 4.131 | 4.40 | 1.24 MB |
| R revisit | + `ev-14-1` to `ev-14-4` (4; 43 replayed calls in 0.25 s) | `f172d3cf`, `c55506ca` | 9 agent, 49 judge | 4.052 | 4.43 | 2.22 MB |
| C opening | goals 1 to 8 (8) | `b794c119`, `c3c90b00` | 10 agent | 3.320 | 3.58 | 1.67 MB |
| C first fold | goals 9 to 16 (8; 10 replayed in 0.4 s) | `ada9007d`, `26af5eab` | 12 agent, 2 summary | 6.527 | 6.87 | 4.04 MB |
| C onset | goal 17 `ev-05-1` (1; 24 replayed in 1.0 s) | `9dcaeac6`, `2967f8fe` | 1 agent, no lookup | 0.815 | 1.17 | 4.30 MB |
| Total | | | | 18.85 | about 22 with checks and replays | |

First differentials (offline, A2's reader, R packet; omitted arms are the reproduction replays above):

| Treatment | R opening | R revisit | Reading (PR-7) |
| --- | --- | --- | --- |
| `lexical` (R-L1, BM25) `false` | sealed, equal | sealed, equal | passive |
| `lexical` on | diverges at ordinal 39, goal `ev-02-1`, agent request, `messages[0]` (origin `mixed`) at offset 2124: adds `lookup {"id":"customer:BC-4101"}` — Mara Ellison, account BC-4101, order BC-7301 — shift 1's customer, into the briefing for shift 2's case (Ivo Mercer, BC-7302) | same | **can act**, at the first new case; what it surfaces is the previous customer's record, a likely contamination rather than a help |
| `link` (R3) `false` | sealed, equal | sealed, equal | passive |
| `link` on | sealed, equal requests and equal normalized selection | same | **inert** on this population (U19 stands) |

C onset carries no lookup at goal 17, so the historical S5/Q3a onset trigger (a malformed lookup at `ev-05-1`) is absent from this fresh lineage.

Prototype differentials (2026-10-24, offline, the build with `proto-wiring` `8f0328d5`..`ab9309f5`, a different `content` from the baselines, which replay admits under RC-5): on every recording, the unchanged baseline profile and each switch explicitly `false` replay fully with equal normalized selection (population passivity across the code change); each switch on diverges at its predicted point (PR-7 "can act"):

| Idea | Recordings | First divergence | Change |
| --- | --- | --- | --- |
| R1 `recent` | R opening, R revisit | ordinal 39, `ev-02-1`, agent `messages[0]` (10,814 to 14,352 bytes) | the briefing is recomposed: the standing desk rules held, recent history carried where the baseline pinned shift 2's sources |
| R2 `work` | R opening, R revisit | ordinal 42, `ev-02-2`, agent `messages[0]` (10,512 to 12,177 bytes) | an "Earlier work" section carries the agent's own `ev-02-1` decision sheet for Ivo Mercer (BC-7302), the case `ev-02-2` names |
| Q3a `lookup.grammar` | C opening, C first fold, C onset | ordinal 5, `ev-01-1`, agent `tools` | the lookup description gains the `order:` and `customer:` id sentence |
| Q1 `instructions.standing` | C opening, C first fold, C onset | ordinal 5, `ev-01-1`, agent `messages[0]` (origin `instructions`) | the three standing sources move into the agent's instructions |

Reachability only (u21 § 1 step 7): each replay stops at its first divergence, so Q3a's target (bare-id lookups at goals 17, 21, 25) and Q1's (the goal-11 fold) lie past it; this lineage made no lookup at goal 17. Readings: `tmp/units/rec-gpu/prototype-differentials.json`.

Static cheap checks on the new recordings (2026-10-24, five Sonnet readers, Workflow `wf_59baed58-510`; judge answers decoded with `@orkestrel/ollama`'s own `computeAnswer` and `extractTopLogprobs`):

| Idea | Reading | Evidence |
| --- | --- | --- |
| R4a | inconclusive, leaning can act on Ivo's shift-14 thread | every obligation is filed; at `ev-14-1` (ordinal 96) `plan.owners` renders two near-identical owner records for Ivo (`order:BC-7302`, `customer:BC-4102`, 5,255 and 5,254 characters) with no status per bullet, a fulfilled trace (CF-7302) beside the open "seek a loss finding", and the reply reads the fulfilled item as open; filed-but-unrendered obligations at `ev-14-4` (slot, credit receipt); Mara's open-closed-pending guard arrives at shift 13, in no packet; the status source is a contract gap. Next: an L0 fixture from the `ev-14-1` inputs (dedupe owner records, `ev-register` not under an owner), and an `ev-13-1` continuation of R opening (about 1 model minute) for Mara's sequence |
| R4b | inert on this population | no obligation arrival quiet at 0.7; four filed with decisive weight under 0.7 and no observed effect (`trims` 0 throughout); obligations missing from requests are filed but not selected, a selection matter (R1, R4a), not a classification one |
| R5a | can act (static join) | at `ev-14-1`, `ev-source-14-2` supersedes `ev-source-2-3` (the pump-room route; supersedes 0.704); the retired route's sentence in `ev-source-2-1` ("Our purchase order names the pump room") still reaches ordinals 96 to 98 unlabeled; live facts are withdrawn because stale marking (`collectStale`, `src/core/ledgers/helpers.ts` near `:1235`) matches a shared header token (`BC-7302`), not meaning: `ev-source-14-1` sentence 0 (CF-7302 delivered the carton) and `ev-source-2-2` sentence 0 ($180 per meter) vanish from the briefing |
| R5b | can act, weakly | 35 pair questions, all at `ev-14-1`; an id-or-owner predicate drops 6 (17%), two of them cross-owner false positives, losing 0 of 2 true supersessions and 0 of 13 effective amendments; the burst goals 49, 53 and 77 lie outside the packets, so the burst-scale effect is inconclusive |
| R5c | inert on this population | the one explicit retirement (`ev-source-14-2`) scored correction 0.897 and drew its pair questions; no missed correction |

## Ledger fixes (U26)

Two blind designs on 2026-10-24 (planner Opus, `tmp/units/ledger-fix-design-planner.md`; analyst Astra, `tmp/units/ledger-fix-design-analyst.md`), compared and fact-checked by three Sonnet lanes (Workflow `wf_3b77c972-42f`, `tmp/units/ledger-fix-design-diff.md`). The Orchestrator ruled:

| Id | Ruling |
| --- | --- |
| LR-1 | D3 (cross-case lexical discovery): the planner's case scope — inside the lexical branch only, an owner-held group-4 unit is admitted only when one of its owners is in the request's case (the owners the request names plus the owners of the records holding the plan's keyed units), and an open case (nothing keyed, no owner named) skips the check; an exported pure `filterLedgerDiscovery` with its guide row; `lexical` stays default-off (U26). Analyst grafts: eligibility also applies to every source an amendment unit carries; the BM25 corpus and scores, groups 1 to 3, order and cuts stay unchanged; a fixed-on replay runs forward to its next real divergence or its seal. Disclosed limits: an open case (a handoff naming no case) admits other cases' readings by design, and with R1 `recent` on a case's own arrivals in the tail leave no keyed unit, so the case reads open; one test pins each. Rejected: the analyst's default that owner-backed sources never enter group 4 (it removes the handoff discovery R-L1 targets) and its `scope` callback (no first consumer; the name collides with Agent's `context.scope`) |
| LR-2 | D2 (duplicate owner records): the planner's view collapse — selected owner records with identical member lists, in the same order, render once (the first record's key, members and lines, titles joined), placed before trimming builds its steps; `projection.records`, `held`, recall and the receipt's owners unchanged; a default change. Rejected: the analyst's declared-identity contract (`LedgerOwner.identity`, `LedgerRegistry.aliases`), which no recorded evidence forces. The study's declaring an order and its customer as two owners of one person (`studies/memory/StudyMemorySession.ts` near `:227`) is a recorded follow-up, not this round, because changing it would re-record both R baselines **Built and accepted 2026-10-24:** Agent `bf854029` (Sol): `selectRecords` groups the requested owner records by their ordered member ids (`Map.groupBy`), keeps the first and joins the titles before trimming; T2-1 to T2-5 each failed under its named mutation and passed restored; `test:src` 1,663, `test:setup` 180, `test:guides` 147, `test:studies` 157 and 1 skip. Every record holds at least one member (`buildRecords` groups placements), so no two empty records can merge. CPU replay on the rebuilt core (`tmp/units/rec-gpu/fix-replays.ts d2`, `tmp/units/rec-gpu/d2-differentials.json`): R opening seals with no divergence; R revisit first differs at ordinal 96 (`ev-14-1`, agent `messages[0]`), where the two Ivo Mercer blocks render once under "Ivo Mercer (account order:BC-7302); Ivo Mercer (account customer:BC-4102)" and the request falls from 19,128 to 13,807 bytes. The integrated review stays owed (LR-4). |
| LR-3 | D1 (stale marking), settled by U27 (the judge decides per sentence; a design and calibration unit first): neither design stands — the planner's carrier census revives the retired `MX-4471` sentence that `tests/src/core/ledgers/Ledger.test.ts:3885` requires withdrawn and misses the independent oracle in `tests/setup.ts`; the analyst's caller-supplied targets remove partial withdrawal for every caller that supplies none. One design question is out (`tmp/units/ledger-fix-d1-question-brief.md`); its answer sets the rule |
| LR-4 | order: D3 (no baseline cost), then D2, then D1; one integrated Astra review and one Luna gate after the three; each fix's replay differential against the sealed baselines run by the Orchestrator on CPU after each build. D1 and D2 make R revisit diverge at ordinal 96 by design, so R revisit is re-recorded once after both land, within U24's remaining baseline allowance (about 11.1 model minutes left; the segment cost 4.05); R opening and the Compaction lineage stay valid |
| LR-5 | D1 contract accepted for CPU implementation on 2026-10-24: `tmp/units/ledger-sentence-design-2.md`, SHA-256 `0dd585607980d35dd8417be06a8ecb5a7015856086486065adb835c632841cc2`. The independent Astra correction review confirmed every repaired claim, with no outside finding, in 227 seconds (`tmp/units/ledger-sentence-correction-review-report.md`). This accepts the contract, not the census, labels, calibrated cutoff, D1 product, or live admission. The experiment and dispatch constraints follow. **Amended by U29 (2026-10-24, before any judge call):** the pre-call admission limit is 13.5 model minutes, not 13.0; U28's 15/20 hard cap is unchanged. |

### LR-6 preservation successor — 2026-10-25

Execution accepted at `dd300e48`: replacement result `75d51eea-28cb-4785-a26d-cd51062d7a62`, seal `098cd42db42303b53d1b80a14180e3766122fac56bc10e99913bb89815db5d88`, full HTTP count 110. Prefix-49 admission and opening equality passed; complete replacement and lexical-false replays match raw requests and normalized selections. Lexical true first differs at ordinal 42 in the workday stamp. The actual briefing retains the inspected price, trace, finding, and historical facts with amendment notices. The final handoff still mixes cases, so no overall quality gain is established. Costs and limits: `tmp/units/ledger-preservation-replay-20261025/report.md` and its adjacent `budget.json`. U24 planning remainder is approximately 6.67 model / 8.39 elapsed minutes; U28 is unchanged. Original seals remain retained; current D1/D3 scope is closed.

Both LR-5 sentence calibrations refused; no cutoff or semantic sentence withdrawal is accepted. Under U31/U32, accept the bounded preservation successor: retain original live sentences, expose accepted direct amendment edges, and render truthful complete/omitted correction notes after filtering and trimming. Whole-message supersession and original recall remain. Deterministic briefing-local references preserve raw request equality across reconstructed conversations while real IDs remain in receipts. Independent reviews and final gates passed; evidence is recorded in the active plan and ledger. This repairs destructive token-overlap omission and unstable annotation bytes. It establishes no downstream decision-quality gain. The original recordings remain immutable. Require frozen-build CPU replay admission and an affordable replacement recording under the existing U24 remainder before accepting a replacement authority. No new sentence judge calls, calibration retry, or changed floor is admitted.

### LR-5 execution contract

The required `changes` question runs after the completed pair sweep, through a Ledger-supplied callback. Eligibility requires a live earlier source, an accepted amendment by an effective amender, and a sentence sharing an id or number with that amender. Preserve superseded effective amenders. Keys retain both message identities and the original sentence index; the wire state preserves the pair prefix and adds `Sentence index (zero-based): INDEX` before the target sentence text. A sentence is withdrawn only by an identity-matched affirmative answer at the consumer cutoff. An undecided sentence stays. Completed partial answers and refusals remain cached; retry only unanswered identities and charge supplied partial usage once. Preserve whole-message supersession, stored recall content, and whole-sentence granularity.

The calibration keeps U27's token gate and its observed 14-of-27 ceiling. Enumerate every same-case eligible target, the supplemental public customer/email and recorded R targets, the deterministic bounded standing/cross-case draw, and the fictional controls. Canonicalize public arrivals and recorded aliases only when complete role/text bytes agree; keep lookup versions distinct. Partition by continuing case, with BC-7302/7303/7308/7310/7311 held out. Every case-bearing span in both complete messages must belong to the partition. Exclude mixed-partition packets and the multi-case register before sampling; declare neutral shared context explicitly. The additional draw takes the lowest SHA-256-ranked candidate per correction/stratum, then at most two representatives per partition/stratum cell. Keep empty cells empty. The proposal fixes the rank tuple and ordinal hexadecimal ordering.

Blind independent labels precede scores; adjudicate disagreements from public text or remove unresolved targets before calls. An unresolved required R target refuses. Require eight Yes and thirty No labels per partition after removal, including controls. Initial repeat/sham counts are the proposal's quarter/eighth within each partition/label class; deterministic reduction retains at least one of each class for each sample type in each partition. Never trim mandatory base membership to fit. Refuse before a daemon if the mandatory population plus minimum samples exceeds thirteen forecast model minutes at 2.858 × 1.25 seconds per request. The provisional 218-request count is not final admission. U28 remains fifteen model / twenty elapsed minutes, separate from U24.

Missing, refused, invalid, duplicate, or incomplete required observations refuse calibration. Fitting noise uses fitting observations alone. Select the smallest grid cutoff from 0.55 through 0.95 satisfying precision 0.9 and recall 0.5 at the cutoff and its fitting-noise offsets; zero predicted positives fails. Freeze the fitting result before validation. Validation can only accept or refuse the frozen cutoff, with its own noise checks, both sample types, and every applicable hard-control reading. Noise beyond 0.05 or a repeat/sham decision crossing refuses. The finite-set error constraint is FP ≤ floor(TP/9); no universal one-error promise applies. A failed calibration returns to the user before any wording or fallback change.

Consumer behavior lives under `studies/sentences/` with proofs under `tests/studies/sentences/` and shared infrastructure in `tests/setupStudy.ts`. Use the installed Study adapter/driver/session, transport, recording, and separate fitting/validation grading paths. A node-only launcher copies the validated frozen selection between grading declarations and performs no scoring. Retain full packets, maps, labels/adjudications, request/response evidence, failed attempts, policies, selected cutoff, validation, and identities in durable study-owned calibration artifacts before acceptance. The threshold cites that provenance, not only campaign scratch. Product ownership includes `tests/src/core/ledgers/factories.test.ts` and every consumer found by census.

Split CPU instrument unit A serially: A1 implements and measures enumeration before A2 builds the remaining execution/scoring host. This sequencing does not change the experiment. A1's measured minimum cost can refuse live continuation without removing targets. Labels follow the frozen population, calibration follows instrument verification, and D1 product implementation requires an accepted cutoff. Then prove built request bytes, run the integrated D1/D2/D3 review and gates, and obtain frozen D1 replay admission before GPU work.

The replacement route uses the original nine-goal Records revisit with live replay prefix 49, not changed-content continuation of the opening. Require complete equal opening replay and source-ordinal prefix equality, then the direct `StudyCommand.execute` admission checkpoint and its rejecting prefix/request controls. Full opening/revisit counts are 53/111; difference 96 and the added questions are conditional on reproduced prior pair decisions. Recompute candidates and ordinals on drift. Charge all startup, maintenance, elapsed replay, live suffix, failed attempts, postflight, and cleanup against approximately 11.15 model / eighteen elapsed U24 minutes and the tighter ten-minute recording / thirteen-minute series profile limits. Preserve all original seals. Seal the replacement and replay its actual complete HTTP count offline before acceptance.
