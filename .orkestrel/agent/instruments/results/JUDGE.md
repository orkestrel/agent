# Which judge: tev1, Mica, or another model on Ollama

Written 2026-10-08 from five research lanes, two adversarial reviews of them, and the calibrations run in this session. Numbers from this host are measured on 4 CPUs, 15 GB, no GPU, Ollama 0.40.0. Numbers from a model card or a vendor page are labeled as such.

## The answer

Mica is needed today and tev1 does not replace it: on the real 48-message scenario tev1's yes probabilities for a needed message and for a distractor overlap (0.36 to 0.61 against 0.18 to 0.67 over all 10 goals), so no threshold both keeps the facts and drops the noise, while Mica separates them at every threshold with a residual of 3 misses in 21 that a criterion change targets. Whether tev1 is the right judge for anything here is unproven, because tev1 is undocumented: no vendor page, card, or evaluation names it, and the only thing known about its limits is a `num_ctx 2050` in its Modelfile. The judge choice is one judge per use case across development and production with only the hardware differing, because the two wires, probability scales, and judgment identities differ, so a judge swapped between environments carries no calibration and no recorded judgment across.

## What tev1 is and what it does here

tev1 (`tev1:0.8b`, served at `/v1/systemone`) answers the System One wire the agent's `createSystemOneJudge` speaks. TypeSafe's documentation describes one model, Jev 1.13, hosted, with a 32k-token state and a per-token price (see the TypeSafe models page); it names no tev1, no sizes, no open weights, and no self-hosting terms. The 2,050-token refusal is the Modelfile's `num_ctx`, not a documented limit of the weights. The System One wire carries no calibration field, so tev1's probability scale cannot be stretched without a package change.

Measured on this host (bounded state, 2 neighbors, one question per request, `cal-tev1-bounded`, all 10 goals, 480 questions):

| threshold | must-keep kept | must-drop dropped | share of the view kept |
| ---: | ---: | ---: | ---: |
| 0.55 | 11 of 21 | 96 of 140 | 38% |
| 0.60 | 17 of 21 | 56 of 140 | 66% |
| 0.65 | 21 of 21 | 27 of 140 | 87% |
| 0.70 | 21 of 21 | 7 of 140 | 97% |
| 0.80 and up | 21 of 21 | 1 of 140 or fewer | 99% to 100% |

The must-keep probabilities span 0.36 to 0.61 and the must-drop ones 0.18 to 0.67, so the classes overlap end to end: the only threshold that keeps every fact (0.65) drops 19 percent of the noise, and the one that drops most of the noise (0.55) loses half the facts. Timing: 1.4 s mean and 1.2 s median per question after the 70 s first load, on prompts of about 510 tokens. A whole-view plain state fits under the cap at about 1,960 tokens, and at 0.90 it keeps everything and drops nothing. The lookup criterion (the wording that lifted Mica, `cal-tev1-b2-lookup`) does not move tev1: the first threshold that keeps all 21 facts, 0.60, drops 19 percent of the noise, and 0.75 and up drop none. The toy probe's flat 0.44 to 0.49 was worse than this, so the state shape matters to tev1, and the Jev jaggedness page names the two mechanisms at play: a question that links two messages is an indirection, and the page recommends a structured state with named parts rather than a conversation string. A structured-state test is a harness change and has not run.

## What Mica is and what it does here

Mica-v0.1-4B (`hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`) is Qwen3.5-4B with a merged rank-16 LoRA, trained as a decision model for the same System One request shape, Apache-2.0, 8,192-token hard limit (card). The ollama package drives it through `/api/generate` with `raw: true`, `num_predict: 1`, and the first position's top-20 logprobs over the labels `No` and `Yes`, then applies a fitted temperature (1.124 on the card; the desk carries the same value). The card's robustness and accuracy figures were read through a summarizer by two lanes that disagree on which number is the perturbed set (77.3 against 69.1 percent) and on the held-out figure (67.4 against 67.0); the card reports ECE 5.4 percent and 2.5 percent wrong at confidence 0.9 or higher; a GPU median of 47 ms per decision on an RTX 3090 is the card's figure and unmeasured here.

Measured on this host (bounded state, 2 neighbors, `cal-mica-bounded`, all 10 goals, 480 questions):

| threshold | must-keep kept | must-drop dropped | share of the view kept |
| ---: | ---: | ---: | ---: |
| 0.70 | 16 of 21 | 138 of 140 | 14% |
| 0.80 | 16 of 21 | 136 of 140 | 16% |
| 0.90 | 18 of 21 | 128 of 140 | 25% |
| 0.95 | 19 of 21 | 119 of 140 | 37% |

The 5 misses at 0.80 are all indirect needs: the approval-code correction for a refund note (p 0.04 and 0.08), the no-written-date rule for a shipping reply (0.04), and an order or account number the task must look up (0.11 and 0.15). A threshold of 0.96 would keep all 21 in-sample with a 0.0015 margin, which is a fit to the scored rows, not a setting. Timing: 2.0 s per question on goal 1 and 4.3 to 5.1 s on the other goals, about 4.3 s mean; 363 prompt tokens mean. Memory: 7.2 GB resident at `num_ctx` 8,192, which the kernel's out-of-memory killer took 30 times beside the 2B agent runner; the resident size at 4,096 is unmeasured, and the desk loads Mica at 8,192 beside the agent model and runs the two concurrently.

Two caveats on both tables. The must-drop set is the same 14 chatter and distractor lines in every goal, and the other goals' facts are unscored, so a judge that answers by message kind would score 100 percent on both columns; the kept-share column is the check on that, and the ratio of must-keep to kept share says Mica is goal-aware (25 percent kept at 0.90 with the facts kept). And the stock selection keys every judgment by the request and purges the others, so use case 1 pays the full question count on every request; reuse happens only within one request's turns.

## Decision matrix

The rows are the candidates the evidence supports; the columns are what each use case needs. "Unmeasured" means no run here and no published figure on this task.

| candidate | separates needed from noise | calibration | input limit | per question, this CPU host | memory beside the 2B agent | license | on Ollama | per-message reusable question |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| tev1:0.8b | no (classes overlap end to end) | none on the wire | 2,050 tokens (Modelfile) | 1.4 s | fits (unmeasured) | unknown | yes, `/v1/systemone` | yes, if its scale were usable |
| Mica-v0.1-4B Q4_K_M | yes, 3 indirect misses in 21 | fitted temperature, ECE 5.4% (card) | 8,192 tokens | 4.3 s | 7.2 GB at 8,192, killed; 4,096 unmeasured | Apache-2.0 | yes, logprob judge | yes |
| Qwen3.5 0.8b or 2b as logprob judge | unmeasured | needs its own fit | 256k | unmeasured | 1.3 to 2.6 GB | not stated on the library page | yes, but the judge template and labels are Mica's | unmeasured |
| Qwen3-Reranker 0.6B or 4B | MTEB-R 65.8 and 69.8 (authors) | none published | 32k | unmeasured | small | Apache-2.0 | GGUF on Hugging Face; not a drop-in: different prompt and lowercase labels | fits a query-document question |
| Jev 1.13 (hosted) | not published for relevance | vendor claim | 32k state | network | none | proprietary, hosted | no | yes |

Encoder rerankers and NLI classifiers (bge, mxbai, DeBERTa) have no Ollama endpoint; the rerank request on the Ollama tracker has been open since 2024-03.

## Recommendations

One judge per use case in both environments; development pays latency on the CPU, production pays for a GPU.

- **Selection (use case 1).** Primary: Mica over the bounded state at `num_ctx` 4,096 with the lookup criterion, threshold picked from the calibration queued now. Fallback: none measured; tev1 at 0.65 keeps every fact and cuts the view by 13 percent, and at 0.60 cuts it by a third while losing 4 facts in 21, either of which is worse than the sections cap alone.
- **The desk (use case 2).** Primary: Mica, which is already the desk's judge and the only candidate with a published calibration for probabilities a person reads. Fallback: tev1 as the contrast slot only, because its scale is uncalibrated; whether the unguided-Mica slot stays is a product ruling.
- **Per-message questions (use case 3).** Primary: Mica, asked once per message with a state that is the message alone, which the judgment store reuses. tev1 becomes a candidate here only if a structured-state probe shows separation, because the question is short and the cap is not binding.
- **Production hardware.** A GPU turns Mica's 4 s into the card's tens of milliseconds; a hosted Jev is the alternative when the data policy allows a third party and the price per request is acceptable.

## The measurements that confirm this before adoption

1. Queued: `--calibrate --goals 10 --state bounded --neighbors 2 --criterion lookup --judge mica --judge-ctx 4096`, the same with `--neighbors 6`, and the same with `--judge tev1`; the first decides the criterion, the second the window, the third whether tev1 moves at all.
2. A desk request with `ollama ps` and process RSS captured, at judge `num_ctx` 8,192 and 4,096, to settle the memory claim where it bites.
3. A structured-state probe for tev1 (named parts: request, candidate message, two neighbors) as a harness change, 10 goals.
4. A Qwen3-Reranker-0.6B run through a judge template with its own prompt and labels, which needs the ollama judge's template and labels to be options.
5. A held-out goal set before any threshold is fixed, because the 0.96 fit above is in-sample.

## What the fleet changes if this holds

- ollama: the judge template and labels become options so a model other than Mica can be a logprob judge; the default judge `num_ctx` for a bounded state drops to 4,096.
- agent: the stock selection renders a bounded plain state instead of the whole view as JSON, the guide states that the threshold must exceed 0.5 and is fitted per judge and per criterion, and the criterion names the lookup case.
- desk: Mica stays the judge; the contrast slot is the user's ruling; the judge `num_ctx` follows the state size.
- The calibration mode moves from the harness into a fleet instrument, because every judge and criterion change needs the table.
