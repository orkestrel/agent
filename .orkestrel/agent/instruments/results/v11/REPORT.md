# v11: Gemma 4 E2B in place of the Qwen 3.5 2B (2026-10-10)

The series asks how much the agent model decides the records lead. It reruns the records arm and the full view with only the agent model changed: `gemma4:e2b-it-q4_K_M` (Google Gemma 4 E2B, 2.3B effective parameters, Q4_K_M) in place of `qwen3.5:2b-q4_K_M`, thinking off, copies 1 to 8, under the `a5-records` and `a1-control` arguments (`plan-g2.json`; `run-log.txt`; all 16 runs exit 0). The judge stays Mica, a Qwen 3.5 fine-tune, because it is part of the records method; the harness sends the same sampler settings to both models.

## Choosing the model

`../models/research.json` holds the four-angle research and the ranking; `../models/pilot.jsonl` and `../models/caps.jsonl` hold the pilot of each candidate on this host against two recorded g06 calls, with the model swapped and every other request field kept. Gemma 4 E2B and E4B are the closest match to the Qwen pair: the same effective sizes, tool calling and a thinking toggle on Ollama 0.40.0, and comparable time per call. The following table gives the pilot readings, thinking off.

| Model | Tokens for the records prompt | Prompt tokens per second | Generated tokens per second | Tool call | Thinking |
| --- | --- | --- | --- | --- | --- |
| `qwen3.5:2b-q4_K_M` | 1,505 | 152–167 | 12.8–13.3 | correct | yes |
| `gemma4:e2b-it-q4_K_M` | 1,233 | 118–119 | 11.1–11.6 | correct | yes |
| `granite4:tiny-h` | 1,253 | 97–102 | 16.9–17.5 | correct | no |
| `lfm2.5-thinking:1.2b` | 1,211 | 249–291 | 21–22 | none with thinking off | always on |
| `qwen3.5:4b-q4_K_M` | 1,505 | 68–71 | 6.2–6.3 | correct | yes |
| `gemma4:e4b-it-q4_K_M` | 1,233 | 65 | 8.2–8.6 | correct | yes |
| `ministral-3:3b` | 1,160 | 85–93 | 6.4–8.1 | correct | no |
| `granite4.2:3b` | 1,436 | 69–83 | 6.2–8.0 | searched the history first | yes |
| `lfm2.5:8b` | 1,204 | 96 | 16.7–17.6 | 1 of 2 | yes |
| `granite4.1:3b` | 1,253 | 77–84 | 6.5–7.7 | none | no |

## Band

Both sides were audited blind under the `audit/audit.js` brief (`audit/verdicts-g2a.json` for copies 1 to 6, `audit/verdicts-g2b.json` for copies 7 and 8; keys in `audit-keys/`; 160 items, 23 disagreements settled by the tiebreak, 0 unresolved). The scorer's 120 passes hold 18 false passes and 18 ambiguous rulings; of its 40 failures, 1 is a misread. `audit/tally-g2.json` holds the tally. The following table sets the band beside the Qwen 3.5 2B band at the same settings (`../v10/FINAL-CHECK.md` § The live port).

| Model, thinking off | Records | Full view | Records minus full view, lower bounds (strict, lenient, across) | Clears |
| --- | --- | --- | --- | --- |
| Qwen 3.5 2B | 5.50–6.38 | 3.50–4.13 | 1.07, 0.80, 0.13 | at every end |
| Gemma 4 E2B | 5.88–6.88 | 4.75–6.00 | −0.41, −0.16, −1.56 | at no end |

Records score about the same on both models; the full view gains 1.25 to 1.87 passes per copy on Gemma, and the records lead falls from about 2 passes per copy to about 1, which no longer clears. Many of Gemma's false passes commit the desk to an action the record does not allow, for example "I will process this refund now" on a refund over $200 with no approval code.

## Per requirement

`../../harness/bench/goals/read.mjs` scores every requirement of every goal (mechanical passes over 8 copies; the audit is not applied).

| Requirement | Qwen full view | Qwen records | Gemma full view | Gemma records |
| --- | --- | --- | --- | --- |
| g03 note binds only Grace's facts | 0/8 | 4/8 | 8/8 | 8/8 |
| g07 who releases the depot hold | 4/8 | 7/8 | 8/8 | 8/8 |
| g10 Sigrid's extension | 4/8 | 8/8 | 7/8 | 8/8 |
| g10 Sigrid's call window | 4/8 | 8/8 | 3/8 | 8/8 |
| g08 credit after the reorder | 5/8 | 8/8 | 8/8 | 7/8 |
| g08 says whether the reorder fits | 8/8 | 2/8 | 8/8 | 5/8 |
| g05 current approval code | 1/6 | 6/7 | 3/8 | 3/8 |
| g09 the gift-card wording | 7/8 | 8/8 | 6/8 | 8/8 |
| g06 no delivery date | 1/8 | 2/8 | 0/8 | 1/8 |

Gemma's full view recovers the far facts and the thread binding that the Qwen full view loses, so the records lead it keeps comes from Sigrid's call window and the gift wording. Records still drop the credit "fits" verdict more often than the full view on both models, and neither Gemma arm reliably applies the approval-code correction.

## Ruling

The model decides most of the records lead at the 2B size: a model that reads the long conversation well narrows it to one pass per copy, the same pattern the Qwen 3.5 4B showed (`../v10/FINAL-CHECK.md` § The 4B read). Records hold their level across both model families, so the method's value is the floor it gives a model that loses facts in a long context. The Gemma 4 E4B series (`v12`) reads the same question at the 4B size.
