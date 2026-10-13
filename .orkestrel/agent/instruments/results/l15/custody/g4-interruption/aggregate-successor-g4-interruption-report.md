# Interrupted Gemma4 aggregate evidence

The saved aggregate is incomplete: its raw status remains `running`, with 16 goal rows and parser closure failures. The existing reader decoded partial evidence and measured retained request usage; this report makes no completion or quality claim. See the reader capture at `tmp/units/aggregate-successor-g4-interruption-reader.stdout.txt:74` and the raw status at `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/run.json:431`.

## Partial outcome

The frozen plan contains 24 goals. The reader returned 16 rows: 13 rows have `success: true` and 3 have `success: false`; all 16 have `partial: false`. The recorded failures are `g06-kenji-shipping`, `g10-sigrid-callback`, and `g11-grace-signoff-today`. Eight of the 16 rows match the existing exposure reader: g01, g02, g03, g05, g06, g07, g10, and g13. See the planned list at `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/run.json:438`, row and exposure output at `tmp/units/aggregate-successor-g4-interruption-reader.stdout.txt:109`, and goal failures at `tmp/units/aggregate-successor-g4-interruption-reader.stdout.txt:141`.

Goal g17 was selected and has retained judge, summarizer, and flush requests, but it has no answer row or agent request. Goals g18 through g24 have no selection or request. The saved selection and final turn identify g17; its retained request entries are at `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/requests.jsonl:259` and `:268`. Keep all 24 planned goals in the later grading denominator, with g17 unfinished and g18–g24 unattempted.

The reader reports `admissionMatches: true` and no pair failures. Its closure failures are `incomplete or reordered trajectory`, `run status running`, `actual sent-request count mismatch`, and `turn observation count mismatch`. The raw `run.json` says 258 sent requests and 33 turns; retained request records contain 268 sent requests, and `turns.jsonl` ends at turn 34 for g17. See `tmp/units/aggregate-successor-g4-interruption-reader.stdout.txt:101`, `:103`, `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/run.json:429`, and `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/turns.jsonl:34`.

## Usage and elapsed measurements

The existing `measureMatrixCosts` output reports these retained wire readings. `missing` counts absent prompt or completion usage on the sent requests counted in that phase.

| Role | Phase | Requests | Wall (ms) | Prompt tokens | Completion tokens | Missing |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Agent | Calibration | 2 | 29,197 | 4,072 | 2 | 0 |
| Agent | Trajectory | 33 | 305,158 | 51,488 | 1,459 | 0 |
| Judge | Calibration | 0 | 0 | 0 | 0 | 0 |
| Judge | Trajectory | 173 | 601,368 | 158,825 | 173 | 0 |
| Summarizer | Calibration | 0 | 0 | 0 | 0 | 0 |
| Summarizer | Trajectory | 43 | 653,873 | 27,791 | 4,969 | 0 |
| Flush | Calibration | 0 | 0 | 0 | 0 | 0 |
| Flush | Trajectory | 17 | 95,120 | 323 | 17 | 0 |

Retained request usage sums to 242,499 prompt tokens and 6,620 completion tokens, 249,119 tokens total. These are recorded partial-run readings; final and in-flight usage is unknown. The aggregate reader reports no missing prompt or completion usage on the 268 sent requests it decoded.

The reader reports 35 capacity metadata readings with `wall: 38`, total row stage time `1,357,751.8137 ms`, and row flush time `84,882.8942 ms`. `run.json` records elapsed `wall: 1,861,888 ms` and `tokens: 0`; the zero token field is not reconciled with the retained per-request token readings. The role readings and totals are in `tmp/units/aggregate-successor-g4-interruption-reader.stdout.txt:213` and `:291`; the raw metadata is at `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/run.json:543`.

The original `.err` capture contains seven `local capped summary unavailable` messages. Those messages do not establish that the aggregate command reached its cap. See `tmp/units/aggregate-successor-g4-interruption-launch.err:1` and `:7`.

## Process and terminal evidence

The saved PID file records launch PID 58884. The process inventory at 2026-10-12T12:40:26Z contains no row for original PID 58884, dedicated daemon PID 1620, or a process parented to either PID. Recovery launcher PID 42008 and its later daemon PID 4668 are separate processes; the root reported the daemon launch at 2026-10-12T12:36:58.200Z. The user service PID 32104 remains present. An earlier process snapshot showed its child PID 39984; the 12:40:26Z inventory contains no row for that child. This later worker absence has no established cause, and this unit did not control PID 32104 or its processes. See `tmp/units/aggregate-successor-g4-interruption-launch.pid:1` and `tmp/units/aggregate-successor-g4-interruption-evidence.json:48`.

The complete saved dispatcher log has 16 goal lines and no terminal receipt. The complete stderr capture has seven summary messages but no `exit=`, signal, or cap record; no status-after file exists. The raw run still says `running`. Thus exit code, signal, cap state, exact termination time, and interruption cause remain unknown. See `tmp/units/aggregate-successor-g4-interruption-launch.jsonl:16`, `tmp/units/aggregate-successor-g4-interruption-evidence.json:187`, and `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/run.json:431`.

The run metadata stores `started=2026-10-12T11:57:37.300Z`, `finished=2026-10-12T12:28:39.188Z`, and `wall=1,861,888 ms`; because the status remains `running` and later request artifacts were written through 2026-10-12T12:30:07.968Z, the `finished` field does not establish process termination time. The latest raw artifact timestamp is on `turns.jsonl`. See `.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2/aggregate-run/run.json:541`, `:543`, and `tmp/units/aggregate-successor-g4-interruption-evidence.json:165`.

## Custody and stability

The checkout HEAD matches `b33dc98e13f589b0196b9f1aad9bd100306926f5`; the build manifest hash matches `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc`. The frozen, resource, full, execution, development policy, and daemon deployment inputs hash to their recorded values. The saved reader accepted the freeze, resource, and development policy through the existing readers. See `tmp/units/aggregate-successor-g4-interruption-evidence.json:3`, `:7`, `:12`, `:16`, `:20`, `:24`, `:28`, and `:32`.

The launch log, stderr, PID file, status-before capture, and raw run files were re-read at 2026-10-12T12:40:26Z and again at 2026-10-12T12:43:25Z. Their observed SHA-256 values match the first hash collection on both reads; every recorded stability comparison is `true`. The latest raw artifact is `turns.jsonl`, 2,607 bytes, last written at 2026-10-12T12:30:07.968Z. See `tmp/units/aggregate-successor-g4-interruption-evidence.json:80`, `:85`, `:117`, `:165`, and stability results at `:201`, `:207`, `:213`, `:219`, `:225`, `:231`, `:237`, `:243`, `:249`, `:255`, and `:261`.

The complete reader stdout capture is 17,046 bytes with SHA-256 `abec791db6cd4fc0d1f5f783f484e252df2fc5cae7d7166eccaf6db11cd885e`; stderr is empty. The reader ran once with `node tmp/units/aggregate-successor-g4-think0-aggregate-read-2.ts` from the scaffold checkout. The host returned complete JSON stdout, but its exit code and exact duration were not captured. No retry was made. The original launch log, stderr, PID, and status-before bytes are preserved in the `aggregate-successor-g4-interruption-launch.*` captures. See `tmp/units/aggregate-successor-g4-interruption-evidence.json:170` and `:178`.

The observed commands used PowerShell with cwd `C:\Users\mikes\WebstormProjects\scaffold`: `Get-CimInstance Win32_Process`, `Get-FileHash -Algorithm SHA256`, the one saved-reader invocation above, and raw JSONL reads for descriptive counts. No service, model, source, build, or Git state was changed by this unit.



