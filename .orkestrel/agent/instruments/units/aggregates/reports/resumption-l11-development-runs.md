# Aggregate l11 development live — complete custody and outcomes

This report preserves the three arm outcomes and the initial pre-spawn invocation refusal. It records automated row outcomes, not audited correctness, and makes no quality, exposure, pair-selection, or adoption claim. No answer prose was read for grading.

## Frozen identity and controls

Before the authorized calls, source commit was `dff5df9d4fdcbcd20b4553d6027f5e8fe1608892`; canonical build manifest SHA256 was `7cbe4b125656f9b4dc54b79c7d8891965367fa25f3a3d2ec9c4f3fc0a4335644`; deployment SHA256 was `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31`. Freeze manifest SHA256 was `74fdcef1eab7ba3c8e6ad7660547c99713b398d39a604b10e66d650e96662988`; fixed development policy SHA256 was `a6ba26482b23029baff907f1e5f3ceb94a20b4638afa6bc38b1b300933baf676`; generated command-data SHA256 was `a4cc51d444da5dc36b9bfe99786b96e1c2e5ef7b2677206c7566414778fbf9df`.

The freeze and prepared helper exited 0. The inert relative-cache control exited 0 with `childSpawned:false`; all three dry reads exited 0 and resolved the absolute l11 cache/output paths. The parent-owned Ollama PID33232 owned `127.0.0.1:11434` for the runs. No daemon operation occurred. Root accepted the source/build custody release after full completed and process closure was verified; no further canonical build reads or writes were made after that release.

## Records

The first records invocation (tracker PID37564, 588ms, exit1) passed `--status` after the command delimiter and was refused by the prepared launcher as `unknown launcher mode`; the bench child was never spawned. Its logs remain at `tmp/units/aggregate-l11-development-live-records.jsonl` and `.err`, and the refusal is described in report 1. Root released the corrected command; the failed artifacts were preserved.

Corrected tracked command:

`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l11-development-live-records-2.jsonl --errors tmp/units/aggregate-l11-development-live-records-2.err --cap 900 --status -- node tmp/units/aggregate-l11-development-live-launch.ts tmp/units/aggregate-l11-development-live-commands.json records`

Tracker PID18876 / exec session45566 exited 0 uncapped in 349081ms. Run path: `.orkestrel/agent/instruments/results/l11/q2-think0/records/run`; execution manifest: `.orkestrel/agent/instruments/results/l11/q2-think0/records/execution.json`. Process PID18876 and bench child PID70720 were confirmed gone before aggregate launched. There are 24 rows: 14 automated successes, 10 failures, 0 unattempted. Run status is `development-failed-goals`, with 78 requests, 78 requests carrying usage, 53 turns, and run wall 347903ms. Fresh usage sums to 101937 prompt + 3294 completion = 105231 tokens; no request usage was missing. These are cost/row measurements, not correctness findings.

Failed-goal request costs (prompt/completion tokens):

| Goal | Events: usage / sent | Prompt | Completion | Sent without usage | Unsent followers |
|---|---:|---:|---:|---:|---:|
| g06-kenji-shipping | 3/3 | 3152 | 154 | 0 |
| g10-sigrid-callback | 3/3 | 3475 | 87 | 0 |
| g12-copperline-gesture | 3/3 | 3686 | 66 | 0 |
| g15-luis-returns | 3/3 | 3652 | 259 | 0 |
| g16-walk-in-return | 2/2 | 1679 | 36 | 0 |
| g18-chase-list | 3/3 | 4320 | 135 | 0 |
| g20-copperline-manager | 3/3 | 4242 | 69 | 0 |
| g21-copperline-buyer | 3/3 | 4199 | 84 | 0 |
| g23-grace-reopened | 5/5 | 9599 | 297 | 0 |
| g24-halvorsen-claim | 3/3 | 4287 | 149 | 0 |

Hashes: `run.json` `647e978758a24a23ae8d2f837d350ca495affc6241a9889ba1fbd3df82757d44`; `requests.jsonl` `ae5c617e304f68e0cbd4c08f52e9111e31e25c00923ec1a98e522cbc91abdd5e`; `calls.jsonl` `c8da49b1a5a65868e2a8d3f342474109295220964d7479026f14b13b3013b162`; `rows.jsonl` `edb12fd66b96c8d862cba732e0446aab5baf2c745739021c85bd4591f33b9265`; `turns.jsonl` `9c3686a1621194683c4d0ef06a67b6d25aad37c1b0f604bbac08d13ff521b8dd`; `selections.jsonl` `923694ef253728599b28e5b238920a037175d10a33b7ad375382d8edc5db651f`; `judgments.jsonl` `841b44739c8d91e43152c8178294107b23a4acac0c170af30169bdfafa62fb93`; `messages.jsonl` `c0d44aca87b01176964d19707aee281e4ee4241267b44f5ad16e6236a8c23c01`; `model-inventory.json` `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986`.

## Aggregate

Corrected tracked command:

`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l11-development-live-aggregate-2.jsonl --errors tmp/units/aggregate-l11-development-live-aggregate-2.err --cap 1800 --status -- node tmp/units/aggregate-l11-development-live-launch.ts tmp/units/aggregate-l11-development-live-commands.json aggregate`

Tracker PID39620 / exec session88261 exited 1 uncapped after24994ms. Run path: `.orkestrel/agent/instruments/results/l11/q2-think0/aggregate/run`; execution manifest: `.orkestrel/agent/instruments/results/l11/q2-think0/aggregate/execution.json`. Exact harness error: `aggregate maintain g01-luis-refund-amount: Error: harness fault: the judge failed 3 times: Error: development integrity failure at request 4 <- Error: development integrity failure at request 4`. The first judge request (request 4) returned HTTP200 with prompt805 and completion1; root triage identified reason `length`, `num_predict: 1`, and `raw/logprobs: true`. The saved stream then contains two judge attempts without HTTP status; no row was emitted. The fault was preserved and not retried. PID39620 and its process children were confirmed gone before full started.

Aggregate recorded 6 request events: 4 were sent and all 4 have usage (5671 prompt + 98 completion = 5769 tokens); 2 additional judge followers were unsent and carry no model expense. The partial g01 trajectory had 4 events: 2 sent with usage (1258 prompt + 96 completion = 1354 tokens), followed by 2 unsent judge followers; the two setup requests were sent and have usage (4413 prompt + 2 completion). The first g01 judge response was HTTP200 with prompt805/completion1; its request used num_predict1 and raw/logprobs=true and finished with reason length. Development integrity failed at request4 under that declared one-token judge capacity. This is a faulted partial trajectory, not a served goal. Planned denominator remains 24; 0 rows served and 23 goals unattempted after partial g01 request activity. No aggregate retry was made.

Hashes: `run.json` `6e4b4a519c5676acef90de461fa89f759a24b0dc4af2c1bbf20a7ec5ce139ebe`; `requests.jsonl` `9ab78fafe416b18990b0b3f244c5201fae08f637f30f5a4fbaaa22d168c496a7`; `calls.jsonl` `84d7eb4566e3220cb3aefde396085c5b83b93654d847ca6e419e90b47bd9726f`; empty `rows.jsonl` and `selections.jsonl` both SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `turns.jsonl` `8afd6f01d29eaba350d85a0c27467a4525d780376794e1b0242d917cb5e804cf`; `aggregates.jsonl` `a3803dcf11077b8b4993cbed4593e76db1b23314af82e9c259034e45547f36c0`; `judgments.jsonl` `07482ee8ac17574281299c0ee1ac98c22f18f59381f1904bd10bffbb00b12628`; `messages.jsonl` `3ca478f1d138a3d5a9c98cf0c4dfe4acf090c43a792a420871434639e48d3ebd`; `model-inventory.json` `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986`.

## Full

Root released this independent reference after confirming the aggregate process tree was closed; the source/build/freeze/policy/deployment identities were unchanged and all full outputs were absent. Correct tracked command:

`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l11-development-live-full-2.jsonl --errors tmp/units/aggregate-l11-development-live-full-2.err --cap 2400 --status -- node tmp/units/aggregate-l11-development-live-launch.ts tmp/units/aggregate-l11-development-live-commands.json full`

Tracker PID72440 / exec session98780 exited 0 uncapped in874459ms; bench child PID56440 is gone. Run path: `.orkestrel/agent/instruments/results/l11/q2-think0/full/run`; execution manifest: `.orkestrel/agent/instruments/results/l11/q2-think0/full/execution.json`. All 24 planned rows arrived: 11 automated successes, 13 failures, 0 unattempted. Run status development-failed-goals; 65 sent, 66 request events, 41 turns, run wall873203ms. Raw requests had usage for 64/66 events: 269257 prompt + 2493 completion = 271750 known tokens. Of the two events without usage, one was a sent HTTP500 request with unknown expense; one was an unsent follower with no model expense. Failed-goal request costs:

| Goal | Events: usage / sent | Prompt | Completion | Sent without usage | Unsent followers |
|---|---:|---:|---:|---:|---:|
| g03-grace-escalation | 4/4 | 9424 | 254 | 0 | 0 |
| g05-luis-approval-note | 2/3 | 4804 | 28 | 1 | 1 |
| g06-kenji-shipping | 3/3 | 10866 | 153 | 0 | 0 |
| g07-depot-release | 3/3 | 11483 | 108 | 0 | 0 |
| g09-kenji-gift-note | 4/4 | 19098 | 141 | 0 | 0 |
| g11-grace-signoff-today | 3/3 | 17270 | 81 | 0 | 0 |
| g12-copperline-gesture | 2/2 | 8981 | 21 | 0 | 0 |
| g15-luis-returns | 2/2 | 10067 | 113 | 0 | 0 |
| g17-phone-list | 2/2 | 10648 | 113 | 0 | 0 |
| g18-chase-list | 2/2 | 10884 | 88 | 0 | 0 |
| g19-farah-code | 2/2 | 11027 | 112 | 0 | 0 |
| g23-grace-reopened | 2/2 | 11889 | 261 | 0 | 0 |
| g24-halvorsen-claim | 2/2 | 12302 | 69 | 0 | 0 |

The g05 raw HTTP500 response error is: XML syntax error on line 6: element <function> closed by </parameter>. Its following agent request is an unsent/status-null follower. An earlier intermediate classification called this transport-only; it was withdrawn after reading the raw error field. Root checked the built isParserRequest/permitsContinuation behavior and confirmed this exact error matches the declared shared XML pattern; the harness continued to later goals. The HTTP500 request has unknown expense because usage is absent; its unsent follower has no model expense. Full automated row flags are not audited semantic correctness.

Hashes: `execution.json` `2ba973183f3ee2cf19be56659cee98a8d9a78383eb24a63f37c277442ab64f56`; `run.json` `3934f138b9e2a6e08ba2e476441ae226d3bee2887a5ff670d584c0bccdac6f29`; `requests.jsonl` `8ed07c83201322eaf52c86654ec8e63b1239229da6be346e8c6002bd32e99d0f`; `calls.jsonl` `aa9b0ac48bb6eab512b03f56945f2e911464fc3a0fc85e0bfb82dbb09a3a5485`; `rows.jsonl` `9635fa3b70119b834e3441577c36ce5e1d9f593f3e232c13f8d5252512fd7505`; `turns.jsonl` `09e149fa906ff3f228d81209b9e35652b0b5fe5b012d406352d2cb99fce444e9`; `selections.jsonl` `a2233cd722bea1b63f73e90f76bd705a076726f59f148cabe753345e3d598788`; `judgments.jsonl` `cf971914e4a2525da37b9a8b24eb7162ebf6ba5098af921bdd2228001b535db4`; `messages.jsonl` `40a3a72ba2c22da6bf00ebc1a17a780f49138e2638c6b9a4d316dff753a79f5e`; `model-inventory.json` `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986`.

## Limits and release

Records and full are development observations and were run against the disclosed build; their row outcomes do not constitute a matched-build qualification claim. Aggregate faulted before emitting rows, so there is no completed records/aggregate pair, aggregate exposure, or pair-selection claim. Full was launched only after the aggregate tracker and child were confirmed closed. The final check found records/full trackers and bench children gone, aggregate tracker gone, and daemon PID33232 still owning the loopback listener. Final source commit, canonical build hash, and deployment hash matched the values above. Root owns subsequent source/build work and blind grading.



