# Agent series evidence

## Post-fix R1/R2 controls — 2026-10-25

At `4e96561e`, both explicit false arms reproduce the 110-exchange replacement fully with equal raw requests and normalized selections. Enabled R1 first changes ordinal 39, ev-02-1; enabled R2 first changes ordinal 42, ev-02-2, adding the actual earlier queue reply. Real Ledger fixtures distinguish the range's endpoint-only carriage from the explicit list's four replies. The experimental request correction applies to ev-14-1 and ev-14-2; retained inputs remain unchanged. CPU duration: 164716 ms; no live calls or quality claim. The failed lowercase-token probe and corrected three-test pass remain separate. See `tmp/units/r1r2-screen-20261025/report-cpu.md`.

## D1/D3 successor — 2026-10-25

Product `dd300e48`; replacement result `75d51eea-28cb-4785-a26d-cd51062d7a62`, seal `098cd42db42303b53d1b80a14180e3766122fac56bc10e99913bb89815db5d88`. Same-scenario replay reconstructed prefix 49 and recorded 57 new execution calls (49 judge, eight agent). Complete count: 110; model time: 268679.8465 ms, charged 268680 ms; live outer elapsed: 300745 ms. Full offline replay and lexical-false replay are complete with equal raw requests and normalized selections. Lexical true first changes system content at ordinal 42 (`ev-02-2`), adding the workday stamp. The first revisit briefing retains price, trace authorization, carrier finding, and historical tracking with amendment notices; superseded `ev-source-2-3` is absent. Exact sentence withdrawal and quality improvement are not established. The final handoff mixes cases; this is an inspected output defect, not a blinded grade. Complete evidence, failed preparation runs, and total elapsed charge of 576436 ms: `tmp/units/ledger-preservation-replay-20261025/report.md` and its adjacent `budget.json`.

## Historical series

What Agent's memory series measured from 2026-10-12 to 2026-10-16, as the records stood on 2026-10-21.

- Every `path:line` citation reads at commit `692e551` (`git show 692e551:PATH`); the cited records leave the tree after that commit.
- R is Records, C is Compaction, A is the living aggregate, and F is the full-view control. `q4` is Qwen 3.5 4B Q4_K_M and `q2` is Qwen 3.5 2B Q4_K_M.
- A cell marked `differs` carries two sources that disagree, each with its line.
- The rulings these figures support live in `.orkestrel/agent/plan.md`; the ideas they seed live in `.orkestrel/agent/boosts.md`.

## Runs

### l13 to l15: 24-goal development comparisons, through 2026-10-12

Astra graded each anonymous packet before arm identities were joined; each arm ran one trajectory (`RESULTS.md:214`, `RESULTS.md:258`).

| Series | Model, thinking, source | Correct content R/A/F of 24 | Required actions | Complete work | Ambiguous | Run tokens R/A/F | Duration ms R/A/F | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| l13 | Qwen 3.5 2B, off, `0913a0966` | 12/10/7 | 4/5/7 | 3/4/4 | 1/1/0 | 105231/360086/271750 known | 387868/1117586/936483 | `RESULTS.md:262-264` |
| l14 | Gemma 4 E2B, off, `5b9935430` | 15/13/14 | 6/6/5 | 3/2/2 | 1/1/2 | 72328/397608/164065 | 518644/1944308/797218 | `RESULTS.md:246-248` |
| l14 | Qwen 3.5 4B, off, `5b9935430` | 17/13/16 | 4/4/5 | 3/3/3 | 1/2/1 | 82123/349528/148479 | 524338/1835032/1490075 | `RESULTS.md:232-234` |
| l15 | Qwen 3.5 4B, off | 18/17/16 | 4/4/5 | 3/3/2 | 1/1/1 | 82123/350266 known/157589 | 559417/3030068/1674884 | `RESULTS.md:218-220` |
| l15 | Qwen 3.5 4B, on | 14/14/16 | 5/5/7 | 2/2/4 | 1/1/2 | 66490/345653/205408 | unavailable/2086555/3979016 | `RESULTS.md:204-206` |
| l15 | Gemma 4B, off, `4acb51125` | grading pending | pending | pending | pending | 85364/249119 known/167761 | 762618/unknown/1563743 | `RESULTS.md:192`, `RESULTS.md:196` |

| Series | A tokens over R | Summary exposure | Excluding g06: content; complete work, of 23 | Operational outcome | Source |
| --- | --- | --- | --- | --- | --- |
| l13 Qwen 2B | 3.42x | 15/24; six capped updates withheld | 12/10/7; 3/4/4 | F lost one goal to an HTTP 500 with unknown usage | `RESULTS.md:266-270` |
| l14 Gemma E2B | 5.50x tokens, 3.75x duration | 14/24 | 15/13/14; 3/2/2 | A strict qualification refused; the flagged identifiers show no harmful obsolete assertion | `RESULTS.md:250-254` |
| l14 Qwen 4B | 4.26x tokens, 3.50x duration | 18/24 | 17/13/16; 3/3/3 | F served 22 and failed g23 on an "empty loaded-model response" (`RESULTS.md:238`) against "empty loaded-model metadata" (`ANALYSIS.md:92`), `differs` | `RESULTS.md:236-238` |
| l15 Qwen 4B off | at least 4.26x | 18/24 | 18/17/16; 3/3/2 | A exited 1 after a judge and a flush headers timeout, 343 requests; operationally unaccepted | `RESULTS.md:222-224`, `RESULTS.md:276` |
| l15 Qwen 4B on | 5.20x R, 1.68x F | 18/24 | 14/14/16; 2/2/4 | R and A received identical verdicts on every goal; preparation added 11748 rejected tokens and 706009 ms | `RESULTS.md:208-210` |
| l15 Gemma 4B off | not computed | 8 of 16 completed goals | not graded | A stopped after 16/24 rows with its worker and daemon absent; cause unknown | `RESULTS.md:192` |
| l15 Qwen 4B off, pilot-2 | none | none | none | user-canceled after 10 goals, 119393 known tokens and 781517 ms; not a model failure | `RESULTS.md:194` |

| Calibration | Strict cutoff | Supported occurrences admitted | Distinct supported admitted | Outcome | Source |
| --- | --- | --- | --- | --- | --- |
| l14 Gemma E2B | 0.59 | 112/131 | 21/29 | passed | `RESULTS.md:316` |
| l15 Gemma E2B | 0.59 | 112/132 | 21/30 | passed | `RESULTS.md:196` |
| l14 and l15 Qwen 4B | 0.61 | 136/154 | 35/43 | passed; the l15 fixed fit repeats it | `RESULTS.md:299`, `RESULTS.md:316` |
| Qwen 2B and Gemma 4B | refused | too few | too few | exploratory cutoffs 0.67 and 0.57 (`RESULTS.md:316`) against 0.68 and 0.61 (`RESULTS.md:196`), `differs` | `RESULTS.md:316` |
| l15 Gemma 4B | 0.79 | 36/136 | 6/36 | refused | `RESULTS.md:278` |
| l15 Qwen 2B | fit-2 | labels 113 supported, 11 unsupported, 21 contradicted, 23 ambiguous | not stated | refused | `RESULTS.md:278` |

### c1 thinking off, graded 2026-10-13

| Setting | Value | Source |
| --- | --- | --- |
| Build | Agent 0.0.30, vendored against published, `differs` | `ANALYSIS.md:105`, `RESULTS.md:31` |
| Window | 3072, reserve 512, `predict` 0, native `num_ctx` 3072, retry 2 | `ANALYSIS.md:105` |
| Sampling | temperature 0, seed 7, presence penalty 1.5, top-k 20, top-p 0.95 | `ANALYSIS.md:105` |
| Summaries | capped at 320, section cap 3, keep 0 | `ANALYSIS.md:105` |
| Judge | Mica v0.1 4B judges R | `ANALYSIS.md:105` |
| Adjudicators | Opus 5.5 for q4, Sonnet 5.5 for q2, Sonnet and Sol for the continue run, blind against the frozen oracle with three frozen controls | `RESULTS.md:31` |

| Model, arm | Served | Facts | Work | Obligations | Revision | Evidence | Critical | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| q4 R | 96/96 | 213/402 (53%) | 109/304 (36%) | 109/350 (31%) | 60/228 (26%) | 126/192 (66%) | 10 | `RESULTS.md:49` |
| q4 C | 96/96 | 43/402 (11%) | 29/304 (10%) | 34/350 (10%) | 23/228 (10%) | 68/192 (35%) | 42 | `RESULTS.md:50` |
| q2 R | 96/96 | 158/402 (39%) | 63/304 (21%) | 63/350 (18%) | 44/228 (19%) | 121/192 (63%) | 16 | `RESULTS.md:71` |
| q2 C, stop policy | 14; failed goal 15 | 14/59 (24%) | 0/44 (0%) | 14/60 (23%) | 1/24 (4%) | 5/28 (18%) | 8 | `RESULTS.md:72` |
| q2 C, continue policy | 89/96 | 113/369 (31%) | 37/282 (13%) | 63/326 (19%) | 30/206 (15%) | 61/178 (34%) | 67 | `RESULTS.md:73` |
| q4 F, q2 F | refused goal 3 at the daemon's context length | none | none | none | none | none | none | `RESULTS.md:41` |

| Key | Paired reading | Verdict | Source |
| --- | --- | --- | --- |
| q4 | no product passed every atom; 95 ties, gain -1 to 0; 40 critical regressions for C | `records` | `RESULTS.md:37`, `RESULTS.md:63` |
| q4 C critical | 15 fabricated completions or receipts, 2 actions through withdrawn destinations, 25 closures without source evidence | none | `RESULTS.md:63` |
| q4 by interval | facts R 62% to 43%, C 26% to 0%; C critical 3 to 13 by shifts 17 to 20 | none | `RESULTS.md:55-61` |
| q4 folds | C carried a required source only through a recap in 95 goals; R omitted the verbatim source in 94 and carried it as a record or recall | none | `RESULTS.md:49-50`, `RESULTS.md:103` |
| q2 stop | C repeated one `lookup_order` call seven times to the step cap at goal 15; no gain on 14 goals; 8 critical regressions | `records` | `RESULTS.md:38` |
| q2 continue | C left 7 goals unserved on identical-lookup loops, 51 repeats; the run binds its own manifest, so nothing is paired | none | `RESULTS.md:39` |
| q2 by interval | R facts 53% to 22%, critical 0 to 8; continue C facts 47% then 26% in the last two intervals | none | `RESULTS.md:75` |

### c1 thinking on, graded 2026-10-14

| Setting | Value | Source |
| --- | --- | --- |
| Workload and package | the c1 workload on Agent 0.0.30 | `ANALYSIS.md:105` |
| Window | 3584, reserve 1024, `predict` 512, continue policy; the on manifests still read native `num_ctx` 3072 | `ANALYSIS.md:105` |
| Adjudication | Sol high in disjoint batches, at most 6 labelers together | `RESULTS.md:108` |
| Reports | `.orkestrel/agent/instruments/results/c1/q4-think/audit/report.md`, `.orkestrel/agent/instruments/results/c1/q2-think/audit/report.md` | the gitignored results tree |

| Model, arm | Terminal outcome | Graded | Acceptable | Facts | Work | Obligations | Revision | Evidence | Critical | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| q4 R | overflow at goal 48; 47 complete | 48 | 1 | 105/190 (55%) | 53/144 (37%) | 58/176 (33%) | 35/116 (30%) | 78/96 (81%) | 11 | `RESULTS.md:114`, `RESULTS.md:124` |
| q4 C | complete; 4 unserved | 92 | 0 | 201/391 (51%) | 82/292 (28%) | 87/332 (26%) | 68/213 (32%) | 114/184 (62%) | 26 | `RESULTS.md:115`, `RESULTS.md:125` |
| q4 F | overflow at goal 5 | 2 | 0 | none | none | none | none | none | 0 | `RESULTS.md:116` |
| q2 R | complete; none unserved | 96 | 0 | 187/402 (47%) | 78/304 (26%) | 77/350 (22%) | 57/228 (25%) | 130/192 (68%) | 52 | `RESULTS.md:139`, `RESULTS.md:149` |
| q2 C | complete; 58 unserved: 36 length, 22 partial | 38 | 0 | 61/149 (41%) | 20/115 (17%) | 22/141 (16%) | 21/88 (24%) | 43/76 (57%) | 17 | `RESULTS.md:140`, `RESULTS.md:143`, `RESULTS.md:150` |
| q2 F | overflow at attempt 5 | 3 | 0 | none | none | none | none | none | 0 | `RESULTS.md:141` |

| Key | Paired reading | Verdict | Source |
| --- | --- | --- | --- |
| q4 | 44 paired goals: 0 C wins, 1 loss, 43 ties, 9 critical regressions; C final-interval facts 37/72 (51%) against 0% thinking off | `inconclusive` | `RESULTS.md:127` |
| q2 | 38 paired goals, all ties; 12 critical regressions; R facts 68% to 36% and critical 5 to 13 across the horizon | `records`, relative | `RESULTS.md:152` |
| q2 lookups | C 150 repeated lookups across 40 goals; R none | none | `RESULTS.md:143` |
| q4 lookups | R 1 repeat in 1 goal; C 9 across 3 goals | none | `RESULTS.md:167` |

### Capacity successors, thinking on, 2026-10-14

| Setting | Value | Source |
| --- | --- | --- |
| Successor build | isolated; build-manifest SHA-256 `21f65be2…` | `.orkestrel/agent/capacity-room-proof.md:11` |
| Qualification bounds | 1800000 ms, 512 calls, 1000000 tokens, zero retries | `.orkestrel/agent/capacity-prefill-proof.md:7` |

| Attempt | Context/output/safety | Measured | Outcome | Source |
| --- | --- | --- | --- | --- |
| Cold calibration | 12288/4096/512, auxiliary 30000 ms | first calibration request stopped at 30010 ms; prompt 9668 with 6656 prefilled; 8 HTTP calls; exit 3 in 31414 ms | deadline too short for cold prefill; auxiliary raised to 90000 ms | `.orkestrel/agent/capacity.md:44-46` |
| Prefill | 12288/4096/512, auxiliary 90000 ms | calibration and two goals; next prompt priced 8241.866 and refused, 561.866 over the envelope; 85 HTTP calls, 118625 tokens, 450892 ms | admission exhaustion, not physical overflow | `.orkestrel/agent/capacity-room-proof.md:5` |
| Room | 16384/4096/512 | 1609096 ms, 253 HTTP calls, 611977 tokens; q2 C reached the eight-step partial at goal 4 | failed its strict rule; execution-only protocol adopted | `.orkestrel/agent/capacity.md:54`, `.orkestrel/agent/c1-capacity-semantic-review.md:3` |
| Execution-only | 16384/4096/512 | 1661926 ms, 256 HTTP calls, 617325 tokens; largest prompt 10784, completion 1505 | passed execution qualification, not quality | `.orkestrel/agent/capacity.md:60` |
| Full series | 16384/4096/512 | q4 R completed 35, failed `ev-09-4`: prompt 3836, completion 4096, `length`, 101176 ms; series 4032693 ms | output-cap failure; other arms never started | `.orkestrel/agent/capacity.md:68` |
| Extended preflight | 20480/8192/512, request 360000 ms | 1639413 ms, 256 calls, 617325 tokens; every agent request `num_ctx` 20480, `num_predict` 8192, `stop`; slowest request 52853 ms | passed execution qualification only | `.orkestrel/agent/capacity-extended-verification.md:15-19` |
| Extended series | 20480/8192/512, request 360000 ms | q4 R completed 48, failed `ev-13-1`: prompt 5861, completion 8192, 173719 ms, no answer, 34665 thinking characters; series 5789522 ms | output-cap failure; no restart or escalation followed | `.orkestrel/agent/capacity.md:80-82`, `RESULTS.md:180-182` |

| Setting | Earlier record | Later record | Value that ran |
| --- | --- | --- | --- |
| Output-only alternative | 16384/8192/512 (`.orkestrel/agent/capacity-proof.md:17`, `.orkestrel/agent/capacity-prefill-proof.md:7`, `692e551:.orkestrel/agent/instruments/harness-capacity/README.md:13`) | 20480/8192/512 (`.orkestrel/agent/capacity-room-proof.md:9`, `.orkestrel/agent/capacity.md:28`, `.orkestrel/agent/capacity-extended-proof.md:5`) | `differs`; 20480/8192/512 ran (`.orkestrel/agent/capacity-extended-verification.md:21`) |
| Auxiliary deadline | 30 s (`.orkestrel/agent/capacity-proof.md:5`) | 90000 ms (`.orkestrel/agent/capacity-prefill-proof.md:7`, `.orkestrel/agent/c1-capacity-prefill-review.md:3`) | `differs`; 90000 ms ran in every later attempt |
| Live qualification | none claimed (`692e551:.orkestrel/agent/instruments/harness-capacity/README.md:3`) | execution-only pass and extended stop (`.orkestrel/agent/capacity.md:60`, `.orkestrel/agent/capacity.md:80`) | `differs`; the later records stand |

### Compaction qualification series, thinking off, 2026-10-14 to 2026-10-16

| Setting | Value | Source |
| --- | --- | --- |
| Workload | the Study adaptation keeps 96 goals, 24 shifts, four products per shift and the release boundaries | `ANALYSIS.md:165`, `.orkestrel/agent/endurance.md:13` |
| Order and retries | R then C, zero retries | `ANALYSIS.md:165`, `.orkestrel/agent/endurance.md:17` |
| Profile | context 20480, output 8192, safety 512, recap 2048 at the start, thinking off | `ANALYSIS.md:165`, `.orkestrel/agent/endurance.md:17` |
| Differences from c1 | system composition, topic, tool shape, seed and sampler | `ANALYSIS.md:165`, `.orkestrel/agent/endurance.md:13` |

| Attempt | Measured outcome | Status | Source |
| --- | --- | --- | --- |
| `endurance-capacity` | the loader rejected the installed Agent dependency; 192 unexecuted, zero calls, 4520 ms | sealed infrastructure failure | `RESULTS.md:23` |
| `endurance-capacity-2` | R completed 48; goal 49 exhausted 128 calls (3 metadata, 125 judge; 71306 tokens; 291879 ms); 2545154 ms; C never ran | sealed failure: 48/192 products, 144 unexecuted | `RESULTS.md:21`, `.orkestrel/agent/admission.md:5` |
| Candidate 3 admission | goal 8192 calls and 3600000 ms; trial 65536 and 14400000 ms; series 131072 and 21600000 ms; 128 arrivals, 13784 pairs, envelope 27920 questions | prospective ceilings, not predicted use | `.orkestrel/agent/admission.md:11-16`, `.orkestrel/agent/admission.md:22` |
| Candidate 3 Records | 96 completed; 209 Agent and 729 judge calls; 100 lookups found; Agent 1024721/92688, judge 335490/729 tokens; peak prompt 11309, largest completion 2053 | sealed R reference, result `fe9bd623…`, seal `3fbafc2b…` | `ANALYSIS.md:172`, `.orkestrel/agent/compaction.md:45-46` |
| Provisional gauge | C completed 21, failed `ev-06-2`: actual 10425 against projection 10423, room 11776; attempt 729899 ms (`.orkestrel/agent/compaction.md:6`) against launcher 732962 ms (`RESULTS.md:17`), `differs` | rejected: forecast miss +2, 74 unexecuted; result `cd30972c…` | `.orkestrel/agent/compaction.md:12-16` |
| Cushion 512 | C completed 24, failed `ev-07-1`: actual 10738, base 10191, cushioned 10703; 1038 room left; attempt 967508 ms (`.orkestrel/agent/qualification.md:51`) against launcher 971634 ms (`RESULTS.md:7`), `differs` | rejected: miss +35, 71 unexecuted; result `e04ceafa…` | `.orkestrel/agent/qualification.md:7-17` |
| `compaction-room` | append-only; completed 37, failed 38, 58 unexecuted; projection 12976 against 11776; eleven recaps held 80.74% of the request; 1909121 ms | application `WINDOW` refusal, not native overflow | `ANALYSIS.md:175`, `.orkestrel/agent/rolling.md:55-57` |
| Rolling | 96/96 served, launcher 3402443 ms; 8 of 12 recaps empty; 11 repeated folds | rejected; seal `3bf2316f…` | `.orkestrel/agent/rolling.md:107-114` |
| `compaction-content-3` | 10 goals in about 4.2 min; one-token empty summary | diagnostic, rejected | `ANALYSIS.md:177` |
| `compaction-task` | 78 products; goal 79 failed on summary prompt 10408, completion 2048, `length` | summary output limit; recap raised to 4096 | `ANALYSIS.md:178` |
| `compaction-output` | recap 4096; 94 completed, 95 attempted; T3 stopped the idle provider session at 2026-10-15T22:50:24Z | unsealed interruption | `ANALYSIS.md:179` |
| `compaction-output-2` | WMI-detached; 96 completed; 120 Agent and 10 summary calls; 933394 known tokens; attempt 2816236 ms | sealed 2026-10-16, result `0b883171…`, seal `dfec78c0…`; operational 96/96 | `ANALYSIS.md:180` |

| Qualifying C profile | Value | Source |
| --- | --- | --- |
| Profile | context 20480, output 8192, safety 512, rolling, final-user summary task, gauge scale `0.9784397854197346`, overhead about `926.4949393331381`, prompt room 11776, recap 4096, summary input room 15872 | `ANALYSIS.md:182` |
| Largest requests | Agent prompt and completion 11292/1667; summary 12244/3244 | `ANALYSIS.md:182` |
| Build | Study `422d549` | `.orkestrel/agent/handoff.md:212-213` |
| Strict wire | on daemon 0.40.3, `truncate:false` and `shift:false` refused an 8204-token prompt against a 2048-token context with HTTP 400 in a 5888 ms proof | `.orkestrel/agent/usage.md:73-78` |

## Conclusions that still bind

| Id | Conclusion | Evidence |
| --- | --- | --- |
| E1 | On c1 off, R held the work over 96 goals where C did not: at q4 five times C's facts, work and obligations and a quarter of its critical violations | `RESULTS.md:91`, `RESULTS.md:49-50` |
| E2 | The gap widens with the horizon | `RESULTS.md:92`, `RESULTS.md:55-61` |
| E3 | C fails by repeating one lookup to the step cap at 2B and by fabricating completions at 4B; R's recall and repeat stop prevented both on c1 | `RESULTS.md:93` |
| E4 | R is not production-ready on these models: no product passed every atom, and the 2B run decays late | `RESULTS.md:94` |
| E5 | Package direction from c1: plan generation room beyond the reserve (`predict` 0; 47 of 209 q4 R replies cut), take judge filing out of the request path or batch it, keep the lookup repeat stop and the answer-pass rethrow | `RESULTS.md:95`, `.orkestrel/agent/direction.md:7`, `.orkestrel/agent/direction.md:27`, `.orkestrel/agent/direction.md:39` |
| E6 | c1 supports no independence and no model-superiority claim | `RESULTS.md:104` |
| E7 | c1 thinking on: q4 is `inconclusive` because R overflowed at goal 48; q2 favors R as a relative comparison; neither report isolates thinking or establishes production readiness | `RESULTS.md:127`, `RESULTS.md:152`, `RESULTS.md:171` |
| E8 | Short capacity qualification did not establish full-horizon output capacity; both full series stopped on the output cap with context and request time left | `RESULTS.md:182`, `.orkestrel/agent/capacity.md:80` |
| E9 | `endurance-capacity` measures a workspace-loading failure and `endurance-capacity-2` a goal-admission failure; neither supports a quality comparison | `RESULTS.md:21`, `RESULTS.md:23` |
| E10 | The +2 and +35 forecast misses stayed inside the actual prompt room, and `compaction-room` was a pre-dispatch projection refusal; none was a native context overflow | `ANALYSIS.md:418`, `.orkestrel/agent/compaction.md:16`, `.orkestrel/agent/qualification.md:17-18` |
| E11 | The 512-token cushion covered the retained development readings and missed the changed trajectory; the qualifying profile keeps the cushion and drops residual-as-failure | `.orkestrel/agent/qualification.md:26-27`, `ANALYSIS.md:186`, `ANALYSIS.md:423` |
| E12 | The memory consumer fails every goal's operational criterion on any failure in the attempt: 96 unsuccessful operational judgments are not 96 generation failures | `ANALYSIS.md:80`, `.orkestrel/agent/compaction.md:34-36` |
| E13 | The source lets an empty summarizer return become a section; the empty rolling recaps recorded completion 1 and decode 1000 ns, and their cause is not established | `.orkestrel/agent/rolling.md:115-117`, `.orkestrel/plan.md:324-330` |
| E14 | Candidate 3 and `compaction-output-2` ran on different builds after successive repairs; a difference between them is not a controlled strategy effect | `ANALYSIS.md:184` |
| E15 | Both Study references mostly fail facts, work and obligations; Grok achieved criterion shares are 0.1875 R and 0.1458 C | `ANALYSIS.md:194-198` |
| E16 | R's selected history: 95 of 96 tasks referred to earlier products not carried as work; 21 of 24 handoffs off focus; 11 stale dates; a hypothesis, not an isolated effect | `ANALYSIS.md:208`, `ANALYSIS.md:419` |
| E17 | C protocol loss: 74 of 96 refusals in goals 17 to 92; 62 of 67 lookups malformed; all ten recaps omitted account IDs; an inference, not an ablation | `ANALYSIS.md:210` |
| E18 | C refusals were 0 append-only (37 products), 41 rolling, then 60, 74 and 74 for task, output and output-2; builds and instructions changed, so rolling is not shown to cause refusal | `ANALYSIS.md:211` |
| E19 | Identical replay bodies on the same 0.40.3 runner matched the sealed final product at 3 of 12 checkpoints; body bytes do not fix output identity | `ANALYSIS.md:216` |
| E20 | The l13 to l15 comparisons show no aggregate advantage and do not authorize aggregate integration | `RESULTS.md:190`, `RESULTS.md:334` |
| E21 | The l14 and l15 strict calibration refusals are calibration outcomes, not task-quality results | `RESULTS.md:316` |
| E22 | Lexical metrics do not replace semantic labels: composite-rubric correlations -0.09 to +0.03; completion-claim detector precision 0.50, recall 0.20; 46 of 74 refusals passed no-false-completion | `ANALYSIS.md:218` |

## Semantic labels and adjudicator agreement

The Study rubric grades facts, requested work, obligations and unsupported external completion per goal; only completion is critical, and an arm has 384 criteria (`.orkestrel/agent/endurance.md:33`, `ANALYSIS.md:190`).

| Reference, adjudicator | Achieved/unsuccessful/unknown | Critical | Achieved facts/work/obligations/completion, of 96 | Source |
| --- | --- | --- | --- | --- |
| R, Sol high | 78/305/1 | 18, derived from 96 - 78 | 0/0 (one unknown)/0/78 | `ANALYSIS.md:194` |
| R, Grok 4.7 Extra High | 72/312/0 | 30 | 1/5/0/66 | `ANALYSIS.md:195`, `.orkestrel/plan.md:658` |
| C, Grok 4.7 Extra High | 56/328/0 | 41 | 0/1/0/55 | `ANALYSIS.md:196`, `.orkestrel/plan.md:658` |

| Reading | Figures | Source |
| --- | --- | --- |
| Label import | grading `69281cae…`; shares 0.1875 R and 0.146 C, which `ANALYSIS.md:198` gives as 0.1458 | `.orkestrel/plan.md:658` |
| Sol and Grok on R | 362/384 criteria agree (94.3%), kappa about 0.82; 14 Sol-achieved Grok-failed, 7 reversed, 1 Sol-unknown; completion 80/96, facts 95, work 91, obligations 96 | `ANALYSIS.md:200` |
| Grok schema | v1 failed its first batch; v2 passed nine synthetic controls; refused R batches 051 and 057 stay outside the accepted import | `ANALYSIS.md:202` |
| Gauge and cushion packets | 384 unknown criteria each, pending labels; no label imported | `.orkestrel/agent/compaction.md:39-41`, `.orkestrel/agent/qualification.md:43-48` |
| c1 off integrity | 19 q4 adjudicators saw arm-revealing phrasing: 14 C recap prefixes, 5 R recall phrases; one q4, one q2 and one continue adjudicator missed the ambiguous control | `RESULTS.md:102` |
| c1 on integrity | q4 145 and q2 140 labels, 0 refused, 0 unlabeled, no design leaks; one missed control each; batch invalid flag, labels kept by the frozen rule | `RESULTS.md:129`, `RESULTS.md:154` |

## Costs and timing

| c1 run | Agent requests | Agent prompt/completion | Judge calls | Summary prompt/completion | Wall | Replies at length | Summaries at cap | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| off q4 R | 209 | 438376/48790 | 2626 | none | 109 min, 63 judge | 47/209 | none | `RESULTS.md:81`, `RESULTS.md:99` |
| off q4 C | 129 | 230104/37552 | 0 | 99609/26991 | 53 min | 39/129 | 69/93 at 320 | `RESULTS.md:82`, `RESULTS.md:99-100` |
| off q2 R | 461 | 976815/61403 | 2627 | none | 100 min, 56 judge | 74/459 | none | `RESULTS.md:83`, `RESULTS.md:99` |
| off q2 C stop | 29 | 51780/7896 | 0 | 16105/3530 | 5 min | 13/27 | not stated | `RESULTS.md:84`, `RESULTS.md:99` |
| off q2 C continue | 176 | 324761/48634 | 0 | 112825/25054 | 36 min | 70/176 | not stated | `RESULTS.md:85`, `RESULTS.md:99` |
| on q4 R | 136 | 288337/100058, incomplete | 1291 | none | 77 min, about 30 judge | 40/136 | none | `RESULTS.md:162`, `RESULTS.md:167-169` |
| on q4 C | 152 | 278308/113474 | 0 | 114917/31275 | 83 min | 53/152 | 72/107 | `RESULTS.md:163`, `RESULTS.md:169` |
| on q2 R | 329 | 666705/224381 | 2620 | none | 131 min, about 57 judge | 91/329 | none | `RESULTS.md:164`, `RESULTS.md:167-169` |
| on q2 C | 383 | 729433/144533 | 0 | 91759/20007 | 52 min | 61/383 | 40/91 | `RESULTS.md:165`, `RESULTS.md:169` |

| Note | Reading | Source |
| --- | --- | --- |
| On-mode figures | calibration excluded; the q4 R overflow request has no usage | `RESULTS.md:162`, `RESULTS.md:167-169` |
| Length-flagged goals | 36 R and 53 C at q4; 80 and 61 at q2 | `RESULTS.md:167` |
| Judge load | R asks 27 one-token questions per goal, spends 767130 judge prompt tokens per off run, and about 1.3 times C's agent tokens per served q4 goal | `RESULTS.md:87` |

| Reading | Figures | Meaning | Source |
| --- | --- | --- | --- |
| Candidate 3 R wall | 6303563 ms (105.06 min): 74.23 Agent, 29.51 judge min | sealed R reference cost | `ANALYSIS.md:172` |
| R judge bursts | goals 49, 53 and 77: 410/729 calls (56.2%), 240908/335490 judge prompt tokens (71.8%) | filing cost concentrates in three bursts | `ANALYSIS.md:209` |
| Output-2 phases | of 2816236 ms: Agent decode 1312780 (46.61%), Agent prefill 577410 (20.50%), summary prefill 512871 (18.21%), summary decode 380433 (13.51%); residual 4131 ms | phase costs, not additive with provider totals | `ANALYSIS.md:212` |
| Output-2 cache | Agent cached 623730/740505 prompt tokens (84.23%); summaries 0/107380; uncached about 202 to 209 tokens/s, decode about 51 | a cached count is not time saved | `ANALYSIS.md:213` |
| Prefix replay | 18 bodies, 54 requests; cold/warm/changed wall 469688/182861/621259 ms, prefill 319548/30201/462452 ms, cached 32072/97436/0 | a changed prefix lost reuse | `ANALYSIS.md:214` |
| Repeatability | 94/94 products, 10 summaries and 127 request counts matched; time ratios 1.0108 Agent, 1.0087 summary | one pair, not a variance | `ANALYSIS.md:215` |
| R timing model | judge 3.704 s/goal + 0.852 s/call + 2.367 ms/prompt token (R² 0.998); Agent 4.37 s/goal + 2.23 ms/prompt + 18.9 ms/completion (R² 0.925); 33.47 predicted against 37.47 observed min | regression estimates | `ANALYSIS.md:217` |
| Span costs C/R | goals 1 to 4: 1.12/3.50 min; 17 to 20: 1.86/2.88; 49 to 52: 2.59/9.65; totals 46.65/105.03 min | planning baseline | `ANALYSIS.md:404` |
| Cushion attempt | 30 Agent requests, 203812 tokens, 763602 ms; 3 summaries, 32352 tokens, 198874 ms; metadata 2704 ms | durations overlap and are never summed | `.orkestrel/agent/qualification.md:50-55` |
| Grok labeling | C 96 batches, 7512618 tokens, 17944685 ms; R 96 batches, 8507083 tokens, 22647151 ms | label process, not model-under-test cost | `ANALYSIS.md:202` |
| Offline Ledger rebuild | 0.2 s for 12 goals, 2.8 s for 48, 18.4 s for 96, without live judge inference | replay cost floor | `ANALYSIS.md:226` |

## Limits

| Limit | Consequence | Source |
| --- | --- | --- |
| One trajectory per arm and configuration | no variance or general superiority; one repeat pair is not a noise distribution | `ANALYSIS.md:412`, `RESULTS.md:104` |
| Rubrics differ | c1 atoms and the Study holistic criteria use different denominators; percentages are not interchangeable | `ANALYSIS.md:82` |
| Builds differ | c1 0.0.30 vendored (`ANALYSIS.md:105`) or published (`RESULTS.md:31`), `differs`; R and C Study references from different builds; published and captured Study 0.0.1 differed in all 14 `dist` files | `ANALYSIS.md:184`, `ANALYSIS.md:415` |
| Runner and model identity | the sealed runs used Ollama 0.40.3; the q2 manifest digest starts `78a738…` and the registry note's `1e2d21…` | `ANALYSIS.md:242`, `.orkestrel/plan.md:318-322`, `.orkestrel/agent/capacity-extended-verification.md:21` |
| Adjudicators | engines changed between packets and settings; Sol and Grok agreement is cross-adjudicator; same-judge repeat is unmeasured | `RESULTS.md:104`, `ANALYSIS.md:200` |
| Thinking | budgets and adjudicator changed with the mode; `think:false` records requested policy only; thinking characters are not tokens | `RESULTS.md:171`, `ANALYSIS.md:244`, `.orkestrel/agent/capacity.md:80` |
| Truncation | adjudicators judged cut replies and cut recaps | `RESULTS.md:99-100` |
| Host load | a shared GPU and overlapping cloud labeling make wall times incomparable across arms | `RESULTS.md:101`, `RESULTS.md:171` |
| Missing R observations | original judge answers, selected request bodies, recall arguments and native phase timings are absent | `ANALYSIS.md:417` |
| Denominators | q2 judge calls 2627 (`RESULTS.md:83`) against 2626 (`.orkestrel/agent/direction.md:23`), `differs`; q2 R requests 461 (`RESULTS.md:83`) against 459 (`RESULTS.md:99`) by calibration convention; the mechanical report names eight C runs and tabulates seven | `ANALYSIS.md:132`, `ANALYSIS.md:424` |
| Deadline proof | tests prove the composed deadline and the shorter recorder deadlines; an isolated recorder fallback after native timeout loss is unproved | `.orkestrel/agent/capacity-proof.md:9`, `.orkestrel/agent/c1-capacity-review-deadline-exposure.md:23` |
| Prefill bound | 90000 ms extrapolates one cold q4 prefill; q2 sufficiency is unmeasured | `.orkestrel/agent/c1-capacity-prefill-review.md:7-11` |
| Strict wire proof | proves native input refusal on 0.40.3, not generation-time shifting | `.orkestrel/agent/usage.md:77-78` |
| Not verified | raw per-goal labels, recomputed custody hashes, tokenizer behavior, historical test passes, exact l13 to l15 samplers, external model claims, any live boost benefit | `ANALYSIS.md:427` |

## Raw evidence

| Evidence | Location | State |
| --- | --- | --- |
| c1 packets, labels, reports, keys, freeze manifests, capacity receipts, thinking summary | `.orkestrel/agent/instruments/results/c1/`: `<key>/audit/`, `<key>/private/`, `<key>/freeze/manifest.json`, `capacity/`, `thinking-summary.jsonl` | gitignored (`.gitignore:43`); stays on disk until the user sweeps it |
| c1 raw runs | `.orkestrel/agent/instruments/results/c1/raw/{c1,c1-continue,c1-think,c1-think-void}/`, moved from the retired harness `tmp/` (`RESULTS.md:31`) | gitignored; stays on disk until the user sweeps it |
| Capacity raw runs | `.orkestrel/agent/instruments/results/c1/raw/{c1-capacity,c1-capacity-extended}/`, moved from the retired `harness-capacity/tmp/` (`.orkestrel/agent/capacity.md:66`, `.orkestrel/agent/capacity.md:78`) | gitignored; stays on disk until the user sweeps it |
| Study results and runtimes | `tmp/studies/`: `compaction-provisional`, `compaction-cushion`, `compaction-rolling-runtime`, the endurance and output-2 results (`.orkestrel/agent/compaction.md:9`, `.orkestrel/agent/qualification.md:10`, `.orkestrel/agent/rolling.md:92`) | custody; open nothing there |
| Endurance workload sources | `studies/endurance/sources/` (`studies/endurance/sources/README.md`) | tracked; byte-identical to `692e551:.orkestrel/agent/instruments/units/aggregates/endurance/` |
| Retired harness, tools, lifecycle and every record cited here | `git show 692e551:PATH` | absent from the tree after `692e551` |
| Handoff-sourced figures | candidate 3, `compaction-task` to `compaction-output-2`, the qualifying profile, the semantic labels and the labeling cost reach `ANALYSIS.md` from the handoff | handoff at `8c62459` |
| l13 to l15 reports | GitHub URLs pinned at agent `e85f5eea` and scaffold `6124f4c2` (`RESULTS.md:210`, `RESULTS.md:320`) | the local paths are absent |
| Diagnostic distillates | `tmp/units/realign/`, `tmp/units/ladder/`, `tmp/units/compaction-output-2-perf-diagnostic.md`, `tmp/units/performance-terminal-map-report.md` | gitignored working files; the `ANALYSIS.md` lines cited here carry their figures |
