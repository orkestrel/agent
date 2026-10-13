# Gemma4 fixed calibration generation

Root accepts this fixed generation on execution HEAD `26549dc37437fd38448d60f9648f903edc2c8bfb`. Both decision-thinking freezes, corpus preparation and generation exited 0 uncapped. The complete sequence took 1395916 ms; the generation launcher took 1383783 ms. Source, build, settings, deployment and inputs remained fixed. Recorded processes have closed. The separate user-owned Ollama service remains running; shared GPU conditions limit elapsed-time comparisons.

The packet contains 179 items, exactly joined to 179 attempts, covering all 162 corpus contexts and 24 points. Its SHA256 is `64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5`, size 3263411 bytes. Generation manifest `b9c622ed08613260e489f87a8539b8d7c177ece7a20e5fe0ea8108799fc74d26` is complete with no errors. Attempts contain 53 sent summary requests and 126 reused observations, with no unmeasured or errored attempt. Twelve controls and all observed cache memberships validate.

| Calibration role | Requests | Prompt tokens | Completion tokens | Recorded wall time |
| --- | ---: | ---: | ---: | ---: |
| Summarizer | 53 | 37103 | 6342 | 688320.8044 ms |
| Judge, trajectory | 165 | 177349 | 165 | 634676.1719 ms |
| Judge, controls | 25 | 18236 | 25 | 56496.7934 ms |

Total calibration usage is 239220 tokens. There are no missing usage records or emitted cost failures; 448 cache reads were replayed. These are calibration costs, separate from any future goal-run costs.

The temporary evidence reader initially imported a symbol from the wrong module, then passed the summarizer tag where `verifyEvidence` requires a configuration-bound judge identity. Independent Astra diagnosed that caller error. A successor also used the wrong temporary vendor import path. Root corrected that path; native Luna ran reader 4 once against the saved evidence, exit 0 in 775.761 ms with empty stderr. The original report's provisional evidence-integrity conclusion is superseded by this successful validation. No model inference, canonical source or build was repeated or changed. All failures, the diagnosis, literal changes and complete captures remain preserved.

Root read the closed reports, terminal receipts, corrected helper, full successful output and process metadata before acceptance. See [the original execution report](aggregate-successor-model-g4-generation-report.md), [the caller diagnosis](aggregate-successor-g4-reader-diagnosis-report.md), [the successful validation](aggregate-successor-model-g4-generation-reader-4-addendum.md), and [its complete machine output](aggregate-successor-model-g4-generation-read-4.stdout.txt).

The opaque packet release preserves exact bytes and occurrence IDs. A clean independent Astra analyst receives only that alias and its hash/census. Labels, root adjudication, fit, task-quality and adoption remain pending. This archive also preserves the unexecuted alias-c/d quality preparations with unreleased seals; they change no grading criterion. Raw freezes, corpus, packet, attempts, controls and cache evidence remain in their original l15 directories.

Root read the complete data-only retention diff and preparation report, then executed the unchanged custody operation: exit 0 in 676 ms, 70 originals totaling 5788198 bytes, 67 fixed seals matching, exact before/after byte equality and unchanged HEAD/tracked working paths/index. The 72 generated/retained files total 5807236 bytes before this README. The [restoration map](restoration.json) has SHA256 `9cff87422241b6239ca0049b90911edee32292799ad995146875515ed7af9de6` and records original paths, sizes and hashes. Root added this README after the builder's absence check; the custody operation accepts that separately owned file.
