# L13 q2/think=false aggregate exposure supplement and records arm

This supplement leaves `aggregate-l13-development-live-report-2.md` unchanged. Automated `success` values below are run metadata, not correctness judgments. “Setup” request cost is a subset of role totals, not an additional role cost.

## Aggregate wire exposure

The existing built `parseMatrixRun` read-run parser accepted the closed aggregate; it validated maintained source/version bindings. `matchesMatrixExposure` was evaluated per goal and only booleans were emitted. No reply prose or body text was output.

| Goal | Exposed |
|---|---|
| g01-luis-refund-amount | true |
| g02-luis-card | true |
| g03-grace-escalation | true |
| g04-halvorsen-ticket | true |
| g05-luis-approval-note | true |
| g06-kenji-shipping | true |
| g07-depot-release | true |
| g08-halvorsen-credit | false |
| g09-kenji-gift-note | true |
| g10-sigrid-callback | true |
| g11-grace-signoff-today | true |
| g12-copperline-gesture | false |
| g13-farah-address | false |
| g14-beatriz-remedy | true |
| g15-luis-returns | false |
| g16-walk-in-return | false |
| g17-phone-list | false |
| g18-chase-list | false |
| g19-farah-code | true |
| g20-copperline-manager | true |
| g21-copperline-buyer | false |
| g22-kenji-returns | true |
| g23-grace-reopened | false |
| g24-halvorsen-claim | true |

Exposure was true for 15/24 goals. This is request-body exposure metadata, separate from the row summary fields in report 2.

## Records arm

The exact released command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l13-development-live-records.jsonl --errors tmp/units/aggregate-l13-development-live-records.err --cap 900 --status -- node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json records
```

Dispatch PID `51248`, tracked session `75508`; terminal exit `0`, no signal, uncapped, duration `387868 ms`. Run status `development-failed-goals`; all 24 planned rows emitted, 14 automated successes, 10 automated failures, 0 unattempted. There were 78 request events: 78 sent HTTP 200 with usage, 0 unsent, 0 unknown usage. Known total: prompt `101937` + completion `3294` = `105231`.

| Goal | Automated success | Events | Prompt | Completion |
|---|---:|---:|---:|---:|
| Setup | — | 2 | 4413 | 2 |
| g01-luis-refund-amount | true | 3 | 3190 | 56 |
| g02-luis-card | true | 3 | 3205 | 64 |
| g03-grace-escalation | true | 4 | 5788 | 322 |
| g04-halvorsen-ticket | true | 3 | 3553 | 58 |
| g05-luis-approval-note | true | 5 | 7199 | 296 |
| g06-kenji-shipping | false | 3 | 3152 | 154 |
| g07-depot-release | true | 2 | 1652 | 74 |
| g08-halvorsen-credit | true | 3 | 3300 | 115 |
| g09-kenji-gift-note | true | 3 | 3081 | 56 |
| g10-sigrid-callback | false | 3 | 3475 | 87 |
| g11-grace-signoff-today | true | 3 | 3932 | 83 |
| g12-copperline-gesture | false | 3 | 3686 | 66 |
| g13-farah-address | true | 2 | 1669 | 40 |
| g14-beatriz-remedy | true | 4 | 5014 | 343 |
| g15-luis-returns | false | 3 | 3652 | 259 |
| g16-walk-in-return | false | 2 | 1679 | 36 |
| g17-phone-list | true | 3 | 4102 | 221 |
| g18-chase-list | false | 3 | 4320 | 135 |
| g19-farah-code | true | 4 | 5806 | 106 |
| g20-copperline-manager | false | 3 | 4242 | 69 |
| g21-copperline-buyer | false | 3 | 4199 | 84 |
| g22-kenji-returns | true | 3 | 3742 | 122 |
| g23-grace-reopened | false | 5 | 9599 | 297 |
| g24-halvorsen-claim | false | 3 | 4287 | 149 |

Role totals: agent 54 events, prompt `101409`, completion `3270`; flush 24 events, prompt `528`, completion `24`. Setup’s two events and `4413+2` tokens are included in the agent total above.

Raw run artifact SHA256: `run.json` `08a049d681f74b5c3b440872fffc3eb9199c8cb65330f2c3d1b76a25e27bd2c0`; `rows.jsonl` `cdb5dcf7fd5473600905f9583806f0f7cf573b7819c7c1c332c951ecd13c237f`; `requests.jsonl` `c37a75960ebf66b1d34a88e41b9a37df5fba3e5c234d504266620d05e1da8870`.

## Custody checks

After terminal, the following read-only PowerShell checks were run (from the scaffold checkout):

```powershell
git rev-parse HEAD
Get-FileHash -Algorithm SHA256 .orkestrel/agent/instruments/harness/.build/build-manifest.json
Get-FileHash -Algorithm SHA256 tmp/units/aggregate-comparison-deployment.json
Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 11434 -State Listen
Get-CimInstance Win32_Process -Filter 'ProcessId=33232'
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*aggregate-l13-development-live-launch-2.ts*' -or $_.CommandLine -like '*bench.js*--run*') }
```

Observed HEAD `0913a0966641298f9cf732f1ed62a30fe783dfcb`, build-manifest SHA256 `51880a44f7f11e509e0c797e8b3321c6921c551fcc24ff26b2d1c0f97747da9b`, and deployment SHA256 `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31` all match the accepted identities. PID `33232`, `ollama.exe serve`, owned the loopback listener. The records dispatch/bench processes were closed before full started.
