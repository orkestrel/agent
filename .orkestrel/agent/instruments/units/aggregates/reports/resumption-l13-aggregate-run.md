# L13 q2/think=false aggregate development run

## Accepted identity and launch

- Source commit: `0913a0966641298f9cf732f1ed62a30fe783dfcb` (pushed).
- Canonical build-manifest SHA256: `51880a44f7f11e509e0c797e8b3321c6921c551fcc24ff26b2d1c0f97747da9b`.
- Deployment SHA256: `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31`.
- Parent-owned Ollama at preflight and after terminal: PID `33232`, `ollama.exe serve`, owning `127.0.0.1:11434`.
- Freeze manifest SHA256: `f7bd6776945658b1df664a2423dc188cad5093f87cabb59b6f2a33dc546e13d8`.
- Development policy SHA256: `176af3183dae91d8c2b97df974358378b52fac29e391f88af2d44828382027c8`; it explicitly sets `withhold: true`.
- Aggregate execution manifest SHA256: `c7a13fdc0829d8dfd8a974cec0ef2410cb7b1d158e360b2b7f2ff3acc86814ed`.
- Generated commands JSON SHA256: `33850a17e3292646970b7009234e16a443f1b575809092171bd8bee5282771a7`. The aggregate command hash is `3596dfd52ccf7159a255eddb518ba56da78dde1cb3d4ade422e42f491034c662` and used its absolute l13 manifest, cache, and run paths.
- Paired budget remained `{ reserve: 512, window: 3072, ceiling: 3072, predict: 0 }`; expanded full-arm budget remained `{ reserve: 512, window: 1068663, ceiling: 262144, predict: 0 }`. The helper retained the l9 diagnosis, labels, packet, generation, resource, full, and predecessor references.

Commands executed before the single aggregate launch:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js freeze --key q2 --think false --seed .orkestrel/agent/instruments/results/l5/pilot-resumption/cache/judge.jsonl --settings .orkestrel/agent/instruments/harness/bench5/settings.json --deployment tmp/units/aggregate-comparison-deployment.json --out .orkestrel/agent/instruments/results/l13/q2-think0/freeze --live --url http://127.0.0.1:11434
node tmp/units/aggregate-l13-development-live-prepare-2.ts .orkestrel/agent/instruments/results/l13/q2-think0/freeze/manifest.json
node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json aggregate --relative-control
node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json records --dry-read
node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json aggregate --dry-read
node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json full --dry-read
```

Freeze and preparation exited 0. The negative relative-cache control exited 0 with `childSpawned=false`; all three dry reads exited 0 with `spawned=false` and resolved the intended absolute l13 cache/output paths. The live command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l13-development-live-aggregate.jsonl --errors tmp/units/aggregate-l13-development-live-aggregate.err --cap 3600 --status -- node tmp/units/aggregate-l13-development-live-launch-2.ts tmp/units/aggregate-l13-development-live-commands.json aggregate
```

Dispatch PID `61340`, tracked exec session `73908`, cap `3600` seconds. Terminal: exit `0`, no signal, uncapped, dispatch duration `1117586 ms`; run wall `1116380 ms`.

## Goal and request counts

All 24 planned goals emitted rows: 13 automated `success=true`, 11 `success=false`, 0 unattempted. Run status is `development-failed-goals`, with 53 turns. These automatic row fields are not a correctness assessment.

The request ledger contains 348 events: all 348 were sent, HTTP 200, and have prompt/completion usage. There are no unsent followers and no sent requests with unknown usage. Total known usage is prompt `351495` + completion `8591` = `360086` tokens.

| Role | Sent | Prompt | Completion |
|---|---:|---:|---:|
| agent | 55 | 111453 | 3182 |
| summarizer | 50 | 36404 | 5166 |
| judge | 219 | 203110 | 219 |
| flush | 24 | 528 | 24 |

Setup requests without a goal account for2 sent requests,4413 prompt tokens, and2 completion tokens already included in the role totals. Setup is not an additional cost row.

Per-goal request costs (all events were sent with usage):

| Goal | Events | Prompt | Completion |
|---|---:|---:|---:|
| Setup | 2 | 4413 | 2 |
| g01-luis-refund-amount | 40 | 29332 | 824 |
| g02-luis-card | 3 | 3483 | 56 |
| g03-grace-escalation | 9 | 8821 | 460 |
| g04-halvorsen-ticket | 4 | 4681 | 240 |
| g05-luis-approval-note | 4 | 6858 | 278 |
| g06-kenji-shipping | 3 | 3288 | 133 |
| g07-depot-release | 6 | 8627 | 334 |
| g08-halvorsen-credit | 4 | 3924 | 256 |
| g09-kenji-gift-note | 10 | 8527 | 334 |
| g10-sigrid-callback | 4 | 4468 | 225 |
| g11-grace-signoff-today | 43 | 34010 | 474 |
| g12-copperline-gesture | 25 | 25955 | 548 |
| g13-farah-address | 21 | 18961 | 296 |
| g14-beatriz-remedy | 20 | 20585 | 381 |
| g15-luis-returns | 7 | 6141 | 263 |
| g16-walk-in-return | 17 | 15573 | 208 |
| g17-phone-list | 12 | 13866 | 339 |
| g18-chase-list | 11 | 12501 | 143 |
| g19-farah-code | 19 | 21761 | 464 |
| g20-copperline-manager | 11 | 12666 | 295 |
| g21-copperline-buyer | 17 | 19433 | 617 |
| g22-kenji-returns | 21 | 18159 | 410 |
| g23-grace-reopened | 24 | 31659 | 789 |
| g24-halvorsen-claim | 11 | 13803 | 222 |

## Withheld summaries and structured row exposure

Six sent summarizer requests reached `num_predict=160`, returned HTTP 200 with completion `160` and reason `length`, and were recorded as `Error: local capped summary unavailable at request N`. Their request and goal metadata is:

| Sequence | Goal | Prompt | Completion | Error |
|---:|---|---:|---:|---|
| 46 | g03-grace-escalation | 625 | 160 | local capped summary unavailable at request 46 |
| 55 | g04-halvorsen-ticket | 614 | 160 | local capped summary unavailable at request 55 |
| 66 | g07-depot-release | 614 | 160 | local capped summary unavailable at request 66 |
| 72 | g08-halvorsen-credit | 614 | 160 | local capped summary unavailable at request 72 |
| 86 | g10-sigrid-callback | 745 | 160 | local capped summary unavailable at request 86 |
| 289 | g21-copperline-buyer | 827 | 160 | local capped summary unavailable at request 289 |

All 24 goal maintenance events ended `status=complete`; none ended failed or aborted. For g03, the recorded cap refusal at request 46 was followed by change/agree/keep decisions and a completed maintenance event. Its emitted row is automated success, with `rendered=[delivery]`, `emptied=[escalations]`, `filtered=1`, `cut=[]`, and `partial=false`. This documents continuation and metadata only.

Across the 24 row records, all have `faults=0` and `partial=false`; 15 have a nonempty `rendered` list, totaling 23 rendered-area entries; 17 have nonempty `emptied` lists; 15 have positive `summary` values; 9 have `summary=0`; none have a nonempty `cut` list. The exact per-goal row fields are retained below. `success` is the automated field, not an answer-quality verdict.

| Goal | Automated success | Usage P+C | Rendered areas | Emptied areas | Filtered | Summary | Cut |
|---|---|---:|---|---|---:|---:|---|
| g01-luis-refund-amount | true | 5106+66 | owner:LH-44870, refunds, returns | — | 0 | 289.6680 | — |
| g02-luis-card | true | 4289+60 | owner:LH-44870 | — | 0 | 148.3159 | — |
| g03-grace-escalation | true | 4781+299 | delivery | escalations | 1 | 106.6848 | — |
| g04-halvorsen-ticket | true | 4868+84 | escalations, delivery | — | 0 | 186.5656 | — |
| g05-luis-approval-note | true | 7654+282 | owner:LH-44870, refunds, returns | — | 0 | 308.1713 | — |
| g06-kenji-shipping | false | 4104+137 | delivery | — | 0 | 112.7211 | — |
| g07-depot-release | true | 8869+178 | escalations, contacts | delivery | 1 | 176.4989 | — |
| g08-halvorsen-credit | true | 4161+100 | — | — | 0 | 0 | — |
| g09-kenji-gift-note | true | 4250+86 | delivery | contacts | 1 | 95.0996 | — |
| g10-sigrid-callback | false | 4574+69 | contacts | delivery | 1 | 88.1944 | — |
| g11-grace-signoff-today | false | 24503+181 | owner:LH-20418 | delivery, contacts | 2 | 91.9852 | — |
| g12-copperline-gesture | false | 15885+124 | — | owner:LH-71592 | 1 | 0 | — |
| g13-farah-address | true | 8756+79 | — | delivery | 1 | 0 | — |
| g14-beatriz-remedy | true | 15708+309 | owner:LH-60214 | delivery | 1 | 115.0386 | — |
| g15-luis-returns | false | 7103+276 | — | owner:LH-44870, refunds, returns | 3 | 0 | — |
| g16-walk-in-return | false | 10049+75 | — | returns | 1 | 0 | — |
| g17-phone-list | true | 6324+232 | — | contacts | 1 | 0 | — |
| g18-chase-list | false | 7793+154 | — | delivery | 1 | 0 | — |
| g19-farah-code | true | 5996+99 | owner:LH-58841 | — | 0 | 84.6085 | — |
| g20-copperline-manager | false | 6422+87 | owner:LH-71592 | contacts | 1 | 122.4987 | — |
| g21-copperline-buyer | false | 14272+129 | — | contacts | 1 | 0 | — |
| g22-kenji-returns | true | 6308+156 | owner:LH-52307 | delivery, contacts | 2 | 96.2696 | — |
| g23-grace-reopened | false | 11837+308 | — | escalations, delivery | 2 | 0 | — |
| g24-halvorsen-claim | false | 8500+108 | owner:LH-31055, refunds, returns | delivery | 1 | 302.9005 | — |

## Artifact hashes and closure

| Artifact | SHA256 | Bytes |
|---|---|---:|
| `tmp/units/aggregate-l13-development-live-aggregate.jsonl` | `abe7e4661904ecf0b7eaca55d394f98df9b803e5ae9cb292b7d13f0ba0ec815e` | 1563 |
| `tmp/units/aggregate-l13-development-live-aggregate.err` | `049d95a409749ccec8221472768c252f03086eab5e40f78141f73586698e07dc` | 674 |
| `.orkestrel/agent/instruments/results/l13/q2-think0/freeze/manifest.json` | `f7bd6776945658b1df664a2423dc188cad5093f87cabb59b6f2a33dc546e13d8` | 19378 |
| `.orkestrel/agent/instruments/results/l13/q2-think0/development-policy.json` | `176af3183dae91d8c2b97df974358378b52fac29e391f88af2d44828382027c8` | 2116 |
| `.orkestrel/agent/instruments/results/l13/q2-think0/aggregate/execution.json` | `c7a13fdc0829d8dfd8a974cec0ef2410cb7b1d158e360b2b7f2ff3acc86814ed` | 697 |
| `tmp/units/aggregate-l13-development-live-commands.json` | `33850a17e3292646970b7009234e16a443f1b575809092171bd8bee5282771a7` | 5611 |
| `aggregate/run/run.json` | `3a46074194d216636f1442978946e5015cc01a2b35f86abecc38264559614aac` | 24424 |
| `aggregate/run/rows.jsonl` | `f42e3de0f6704a1e085a51a53e8984d8ae4e59558c2415ae9d1bcaf0af9430c6` | 37667 |
| `aggregate/run/requests.jsonl` | `46d79431af0d8413743ca354df703a5c8a5483e0ebe2ce7ec1684e471b4781b6` | 3025018 |
| `aggregate/run/calls.jsonl` | `ebccd2c05832bc971feb1eb3303f0ddd96b9b7032bfdd5dfa62e1671d6d711cf` | 43941 |
| `aggregate/run/aggregates.jsonl` | `899b88def309390268fe47c051cae6d2316ea1340bf28e63bcf025a2f089bfd3` | 3855339 |
| `aggregate/run/turns.jsonl` | `0472cbc6231c4fcc78f0879ba613eab5ca18680640c248ca15221d843100e4aa` | 4038 |
| `aggregate/run/selections.jsonl` | `57b3aad7512e0abf2152af58fae401457704e80d7a0f931209507c70adb02451` | 138386 |
| `aggregate/run/judgments.jsonl` | `96cbd0ec88cb8b4b3afdf86248ea4b9a918b09ec95e1c7fc46432fe1f71b61ff` | 915428 |
| `aggregate/run/messages.jsonl` | `5fc66f5a84006dec38c9b4708ea6f823864289fda74fa391e9adce46de45c4d1` | 75321 |
| `aggregate/run/model-inventory.json` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` | 3451 |
| `aggregate/cache/judge.jsonl` | `bdda7595ce229283d248076262bff9cd2119b20e059a4dbbc036fcbb62479f35f` | 2656952 |

After terminal, `git rev-parse HEAD`, canonical build-manifest hash, and deployment hash still matched the accepted identities above. Dispatch PID `61340` and tracked session `73908` were closed; no aggregate launcher or `bench.js --run` process remained. Parent daemon PID `33232` still owned `127.0.0.1:11434`. Source/build custody is returned to root. This aggregate report is complete and will remain unchanged during the separately released records arm.
