# L13 q2/think=false full arm report

This report accompanies aggregate report 2 and records report 3. All `success` values are automatic row fields; they do not assess answer correctness. The “Setup” cost line is included in role totals, not an additional role total.

## Exact invocation and terminal

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l13-development-live-full.jsonl --errors tmp/units/aggregate-l13-development-live-full.err --cap 2400 --status -- node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json full
```

Dispatch PID `17104`, tracked session `25043`; exit `0`, no signal, uncapped, duration `936483 ms`. Bare terminal stdout/stderr artifacts: `tmp/units/aggregate-l13-development-live-full.jsonl` and `tmp/units/aggregate-l13-development-live-full.err`. The run status is `development-failed-goals`; all 24 planned goals emitted rows, with 11 automated successes and 13 automated failures. No planned goal was unattempted.

## Request accounting

The existing built `parseMatrixRun` parser accepted the completed run, validating run custody and frozen source/version bindings. `readWireReading` was used to read only usage/completion metadata; no reply text or bodies were emitted.

There were 66 request events: 65 sent and one explicitly unsent follower. Of the sent requests, 64 returned HTTP 200 with known usage; one returned HTTP 500 with unknown usage. Known usage is prompt `269257` + completion `2493` = `271750`; the HTTP 500’s cost is unknown and is not included. The unsent follower had no model request/cost.

The unknown-usage event was sequence 20, goal `g05-luis-approval-note`, role `agent`, HTTP 500, `complete=false`, failure `transport`. Sequence 21 is the same goal/role’s explicitly unsent follower, failure `transport`. No retry occurred.

| Role | Events | Sent | Unsent | Unknown usage | Known prompt | Known completion |
|---|---:|---:|---:|---:|---:|---:|
| agent | 42 | 41 | 1 | 1 | 268729 | 2469 |
| flush | 24 | 24 | 0 | 0 | 528 | 24 |

| Goal | Auto success | Events | Sent | Unsent | Unknown usage | Known prompt | Known completion |
|---|---:|---:|---:|---:|---:|---:|---:|
| Setup | — | 2 | 2 | 0 | 0 | 4413 | 2 |
| g01-luis-refund-amount | true | 3 | 3 | 0 | 0 | 5128 | 71 |
| g02-luis-card | true | 3 | 3 | 0 | 0 | 5487 | 55 |
| g03-grace-escalation | false | 4 | 4 | 0 | 0 | 9424 | 254 |
| g04-halvorsen-ticket | true | 5 | 5 | 0 | 0 | 16150 | 164 |
| g05-luis-approval-note | false | 4 | 3 | 1 | 1 | 4804 | 28 |
| g06-kenji-shipping | false | 3 | 3 | 0 | 0 | 10866 | 153 |
| g07-depot-release | false | 3 | 3 | 0 | 0 | 11483 | 108 |
| g08-halvorsen-credit | true | 3 | 3 | 0 | 0 | 11940 | 110 |
| g09-kenji-gift-note | false | 4 | 4 | 0 | 0 | 19098 | 141 |
| g10-sigrid-callback | true | 3 | 3 | 0 | 0 | 13493 | 98 |
| g11-grace-signoff-today | false | 3 | 3 | 0 | 0 | 17270 | 81 |
| g12-copperline-gesture | false | 2 | 2 | 0 | 0 | 8981 | 21 |
| g13-farah-address | true | 2 | 2 | 0 | 0 | 9409 | 16 |
| g14-beatriz-remedy | true | 2 | 2 | 0 | 0 | 9627 | 226 |
| g15-luis-returns | false | 2 | 2 | 0 | 0 | 10067 | 113 |
| g16-walk-in-return | true | 2 | 2 | 0 | 0 | 10371 | 29 |
| g17-phone-list | false | 2 | 2 | 0 | 0 | 10648 | 113 |
| g18-chase-list | false | 2 | 2 | 0 | 0 | 10884 | 88 |
| g19-farah-code | false | 2 | 2 | 0 | 0 | 11027 | 112 |
| g20-copperline-manager | true | 2 | 2 | 0 | 0 | 11352 | 33 |
| g21-copperline-buyer | true | 2 | 2 | 0 | 0 | 11486 | 29 |
| g22-kenji-returns | true | 2 | 2 | 0 | 0 | 11658 | 118 |
| g23-grace-reopened | false | 2 | 2 | 0 | 0 | 11889 | 261 |
| g24-halvorsen-claim | false | 2 | 2 | 0 | 0 | 12302 | 69 |

Setup’s `4413+2` tokens above are included in agent role totals, not added again. Per-goal known totals exclude the unknown HTTP 500; the unsent follower adds no request cost.

## Artifacts and custody

Run artifacts: `run.json` SHA256 `6fa3b055125446363c2c94b71110ef20461b1c18d8de3be7f92ce9ca9838421a`; `rows.jsonl` SHA256 `9b4191a7369adadcbeb83181231d89c72e6d4a7b069a9dbaa8346fe2103d1fce8`; `requests.jsonl` SHA256 `3c34056f5d7e002a34275f047a162c1cf3c050c1cd8294d6f8e48d6e2e42b209`.

Post-terminal read-only checks from scaffold:

```powershell
git rev-parse HEAD
Get-FileHash -Algorithm SHA256 .orkestrel/agent/instruments/harness/.build/build-manifest.json
Get-FileHash -Algorithm SHA256 tmp/units/aggregate-comparison-deployment.json
Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 11434 -State Listen
Get-CimInstance Win32_Process -Filter 'ProcessId=33232'
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*aggregate-l13-development-live-launch-2.ts*' -or $_.CommandLine -like '*bench.js*--run*') }
```

Observed HEAD `0913a0966641298f9cf732f1ed62a30fe783dfcb`, canonical build-manifest SHA256 `51880a44f7f11e509e0c797e8b3321c6921c551fcc24ff26b2d1c0f97747da9b`, and deployment SHA256 `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31` match the accepted identities. The daemon PID `33232` (`ollama.exe serve`) owned the loopback listener. The post-run query found no full-arm launch or bench process. These are checked content hashes plus a separately checked HEAD value, not a claim inferred only from HEAD.
