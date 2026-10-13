Staged in [tmp/bench/u2/](/home/user/agent/tmp/bench/u2/). All acceptance gates pass. No live rules were installed, and the required outside-file scan printed nothing.

The [replacement rules](/home/user/agent/tmp/bench/u2/rules.json) change `forbiddenPatterns`:

| Goal | Rule |
|---|---|
| g01 | Add g05’s restocking-fee patterns. |
| g03, g05 | Allow MX-4471 as the original or replaced code, including “rotated from”; still reject instructions to use it. |
| g06 | Allow ship dates and dated headers; reject dates in delivery/arrival/estimate sentences or rows, October 12 forms anywhere, claimed delivery, missing customer drafts, and fabricated gift-note actions. |
| g08 | Reject incorrect available-credit figures and false comparisons of $4,240 against available credit. Allow $4,240 total against the $5,000 limit. Leave the manager’s telephone line unscored. |
| g09 | Reject the fabricated gift-note action recorded in `f4-control-v4`. |

No scorer copy or diff was necessary.

All **69 fixtures pass**. These **34 fixtures mismatched the live rules**; their complete replies are in [fixtures-live.json](/home/user/agent/tmp/bench/u2/fixtures-live.json):

| Live → intended | Fixture IDs |
|---|---|
| FAIL → PASS | `g03-rotated`, `g05-rotated`, `g05-original-only`, `g06-ship`, `g06-ship-month`, `g06-header`, `g06-table-ship` |
| PASS → FAIL | `g01-percent`, `g01-reserved`, `g01-subject`, `g01-applies`, `g01-fee-of` |
| PASS → FAIL | `g06-words-forbidden`, `g06-words-forward`, `g06-dot-forbidden`, `g06-arrived`, `g06-delivered`, `g06-no-draft`, `g06-lead-you`, `g06-gift-added`, `g06-dashed-month`, `g06-month-no-space`, `g06-delivered-contraction`, `g06-delivered-adverb` |
| PASS → FAIL | `g08-wrong3860`, `g08-wrong4240`, `g08-wrong-other`, `g08-wrong-cents`, `g08-wrong-bare`, `g08-table`, `g08-wrong-equation`, `g08-false-comparison`, `g08-adverb`, `g09-gift-added` |

The comparison scores **1,818 rows**, including nested recordings and archived rescored copies. Top-level runs contribute **456 rows**. Every changed reply, deciding excerpt, and available audit appears in [compare.md](/home/user/agent/tmp/bench/u2/compare.md).

| Goal | Top-level FAIL → PASS | Top-level PASS → FAIL | All FAIL → PASS | All PASS → FAIL |
|---|---:|---:|---:|---:|
| g01 | 0 | 0 | 0 | 0 |
| g03 | 0 | 0 | 0 | 0 |
| g05 | 1 | 0 | 2 | 0 |
| g06 | 0 | 2 | 0 | 19 |
| g08 | 0 | 11 | 0 | 33 |
| g09 | 0 | 1 | 0 | 1 |

Every changed verdict that disagrees with an audit is ruled as follows:

| Run and goal | Audit | Ruling |
|---|---|---|
| `v9/a1-control-v1`, g08, and its `v9/rescored/` copy | Correct / ambiguous | **FAIL.** “$4,240, which is within their available credit capacity” compares the total against available credit of $3,760. The audit substitutes the $5,000 limit for the named available credit. |
| `v9/a5-records-v6`, g06, and its `v9/rescored/` copy | Ambiguous | **FAIL.** “When you reply to him” addresses the shift lead and supplies no customer draft. Contract 3 resolves this ambiguity. |
| `v10/f4-control-v4`, g08 | Correct | **FAIL.** “$4,240—well within their available credit” states a false comparison. |
| `v10/f4-control-v6`, g08 | Correct | **FAIL.** “$4,240.00, which fits within their available credit” states the same false comparison. |
| `v10/f4-records-v6`, g08 | Correct | **FAIL.** “$4,240.00, which is within their available credit” states the same false comparison. |

The `--check` output is:

```text
scenario.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v1.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v2.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v3.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v4.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v5.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v6.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v7.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/v8.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v1.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v2.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v3.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v4.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v5.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v6.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v7.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
variants/ledger/v8.json: g01.forbiddenPatterns, g03.forbiddenPatterns, g05.forbiddenPatterns, g06.forbiddenPatterns, g09.forbiddenPatterns, g08.forbiddenPatterns
Checked 17 files; 102 field changes.
```

The final gate results are recorded in [gates.json](/home/user/agent/tmp/bench/u2/gates.json):

| Gate | Exit |
|---|---:|
| `node --check` for every staged script | 0 |
| `compare.mjs --fixtures` | 0 |
| `compare.mjs` | 0 |
| `apply.mjs --check` | 0 |
| Apply tests on isolated copies: backups and unrelated-byte preservation | 0 |
| Required outside-file `find` scan; empty output | 0 |
| Inconsistent-scoring negative control | 1, expected |
| Existing-backup negative control | 1, expected |