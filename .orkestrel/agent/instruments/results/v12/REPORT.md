# v12: Gemma 4 E4B in place of the Qwen 3.5 4B (2026-10-10)

The series reads the `v11` question at the 4B size. It reruns the records arm and the full view with only the agent model changed: `gemma4:e4b-it-q4_K_M` (Google Gemma 4 E4B, 4.5B effective parameters, Q4_K_M) in place of `qwen3.5:4b-q4_K_M`, thinking off, copies 1 to 8, under the `f4-records` and `f4-control` arguments (`plan-g4.json`; `run-log.txt`; all 16 runs exit 0). It is the first series planned and run from `../../harness/`.

## Band

Both sides were audited blind under the `audit/audit.js` brief (`audit/verdicts-g4.json`; keys in `audit-keys/`; 160 items, 15 disagreements settled by the tiebreak, 0 unresolved). The scorer's 134 passes hold 6 false passes and 8 ambiguous rulings; of its 26 failures, 1 is a misread and 7 are ambiguous. `audit/tally-g4.json` holds the tally. The following table sets the four thinking-off bands side by side; the Qwen bands come from `../v10/FINAL-CHECK.md` and the Gemma 4 E2B band from `../v11/REPORT.md`.

| Model, thinking off | Records | Full view | Records minus full view, lower bounds (strict, lenient, across) | Clears |
| --- | --- | --- | --- | --- |
| Qwen 3.5 2B | 5.50–6.38 | 3.50–4.13 | 1.07, 0.80, 0.13 | at every end |
| Gemma 4 E2B | 5.88–6.88 | 4.75–6.00 | −0.41, −0.16, −1.56 | at no end |
| Qwen 3.5 4B | 7.63–8.00 | 6.13–7.63 | 0.19, −0.37 | at the strict end only |
| Gemma 4 E4B | 7.75–8.38 | 7.38–8.63 | −0.98, −1.16, −1.83 | at no end |

At each size, records reach the same level on both model families; the full view moves with the model, and on Gemma 4 E4B it matches records. Records reach that level on a smaller prompt: at the tenth request of copy 1 the records prompt holds 1,904 tokens and the full view's 4,962.

## Per requirement

`../../harness/bench/goals/read.mjs` scores every requirement of every goal (mechanical passes over 8 copies; the audit is not applied). The following table lists the requirements that differ by arm or by model.

| Requirement | Qwen 4B full view | Qwen 4B records | Gemma E4B full view | Gemma E4B records |
| --- | --- | --- | --- | --- |
| g05 current approval code | 8/8 | 8/8 | 6/8 | 8/8 |
| g05 the over-$200 rule applies | 7/8 | 8/8 | 6/8 | 8/8 |
| g08 says whether the reorder fits | 3/8 | 2/8 | 8/8 | 8/8 |
| g08 credit after the reorder | 6/8 | 7/8 | 4/8 | 6/8 |
| g04 claims no send to Priya | 4/8 | 7/8 | 6/8 | 2/8 |
| g06 gift note reported truthfully | 3/8 | 2/8 | 7/8 | 7/8 |
| g06 ship day kept apart from today | 3/8 | 4/8 | 8/8 | 8/8 |
| g06 no delivery date | 0/8 | 0/8 | 1/8 | 0/8 |

Records keep the corrected approval code and the over-$200 rule where the Gemma full view loses them in 2 of 8 copies; records claim a send to Priya more often. Gemma 4 E4B states the credit verdict and reports the gift note and the ship day truthfully in both arms, where the Qwen 4B fails them in both.

## Ruling

The records lead is a property of the model's long-context reading. Records give both families the same level at each size, and the gain over the full view shrinks as the full view improves: 2.00 to 2.25 passes per copy on the Qwen 3.5 2B (low and high ends), 0.88 to 1.13 on Gemma 4 E2B (mean differences, clearing at no end), 0.37 to 1.50 on the Qwen 3.5 4B (clearing at the strict end only), and −0.25 to 0.38 on Gemma 4 E4B, which still answers from a prompt under half the full view's size.
