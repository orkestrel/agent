# L12 q2/think=false aggregate development run

## Custody and execution

- Accepted source commit: `18cd5ffa29420927b7d88c46ad05da48c2aa1cf9` (pushed).
- Accepted canonical build-manifest SHA256: `da4a2f8be82aeb0bacc83dfc5729f8617fdd00f0fb75fe34ee7cdd5da9d9cfc0`.
- Accepted deployment SHA256: `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31`.
- Parent-owned Ollama service at release: PID `33232`, tracker PID `72828`, root exec session `24057`; listener `127.0.0.1:11434`. The recorded deployment hash stayed the accepted identity in the frozen run manifest.
- Freeze manifest SHA256: `5d2efac1edc91580c05a5d8f59bc707c7cb5d99fae520a538d87e81d84dce1ca`.
- Development policy SHA256: `cb5438563fff7e60a86b62600afceb3625549b4092031f93caf384cf70d0f0fd`.
- Prepared aggregate command used the absolute l12 manifest, independent cache/output, unchanged paired budget `{ reserve: 512, window: 3072, ceiling: 3072, predict: 0 }`, and preserved l9 provenance. The helper validated it. The relative-cache refusal passed with `childSpawned=false`; the aggregate dry-read passed and resolved the intended absolute l12 manifest/cache/output.

Commands executed:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js freeze --key q2 --think false --seed .orkestrel/agent/instruments/results/l5/pilot-resumption/cache/judge.jsonl --settings .orkestrel/agent/instruments/harness/bench5/settings.json --deployment tmp/units/aggregate-comparison-deployment.json --out .orkestrel/agent/instruments/results/l12/q2-think0/freeze --live --url http://127.0.0.1:11434
node tmp/units/aggregate-l12-development-live-prepare.ts .orkestrel/agent/instruments/results/l12/q2-think0/freeze/manifest.json
node tmp/units/aggregate-l12-development-live-launch.ts tmp/units/aggregate-l12-development-live-commands.json aggregate --relative-control
node tmp/units/aggregate-l12-development-live-launch.ts tmp/units/aggregate-l12-development-live-commands.json aggregate --dry-read
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l12-development-live-aggregate.jsonl --errors tmp/units/aggregate-l12-development-live-aggregate.err --cap 1800 --status -- node tmp/units/aggregate-l12-development-live-launch.ts tmp/units/aggregate-l12-development-live-commands.json aggregate
```

The single live launch was dispatch PID `41068`, tracked session `98496`, cap `1800` seconds. It terminated with exit `1`, no signal, uncapped, after `148136 ms`. This was an operational integrity fault; there was no retry or substitution.

## Outcome and costs

There were 24 planned goals. Two rows were emitted and both have automated `success=true`, `faults=0`: `g01-luis-refund-amount` and `g02-luis-card`. No row was emitted for g03 or the remaining 21 goals. This is automated row status only and says nothing about answer correctness.

The terminal fault occurred at `g03-grace-escalation`, request 46. The exact error was `Error: development integrity failure at request 46`. The harness logged that the judge failed three times with this error and exited faulted. Those three judge records, sequences 47–49, were unsent followers; they have no model expense. Request 46 itself was sent and HTTP 200. No answer prose was read or graded.

The request ledger contains 49 events: 46 sent and 3 unsent. All 46 sent events returned HTTP 200 and carry prompt/completion counts, so sent-request usage is complete: prompt `37853`, completion `1042`, total `38895`. By role: agent 6 requests (`11954+117`), summarizer 10 (`4745+895`), judge 28 (`21110+28`), flush 2 (`44+2`). The three unsent g03 judge followers have no model expense. No sent request lacks usage.

Run summary: status `fault`, turns `5`, sent `46`, requests/events `49`, emitted rows `2`. The journal records both automated PASS rows and the fault. The error log records the owner and maintenance fault at g03, followed by the same harness fault and terminal exit.

## Artifact custody

SHA256 (bytes) for retained outputs:

| Artifact | SHA256 | Bytes |
|---|---|---:|
| `tmp/units/aggregate-l12-development-live-aggregate.jsonl` | `6cd9dc034efee2513ea0cc9d81ab68f91fcc85b2d775d08e3951e16005ad04b6` | 128 |
| `tmp/units/aggregate-l12-development-live-aggregate.err` | `272221c5ca89bc1984ab9b171e1a1c669b10219ff486bc9c583fd749bc94799b` | 500 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/freeze/manifest.json` | `5d2efac1edc91580c05a5d8f59bc707c7cb5d99fae520a538d87e81d84dce1ca` | 19378 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/development-policy.json` | `cb5438563fff7e60a86b62600afceb3625549b4092031f93caf384cf70d0f0fd` | 2096 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/aggregate/run/run.json` | `9138069c6c08ba5866b3e205abe6a52dd8bc18d5c729bc531e098547bc32c993` | 24540 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/aggregate/run/rows.jsonl` | `09aa4ef86532210898ffc9d8d24630345ca9e419cbdaba331342097e28aaefc6` | 2124 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/aggregate/run/requests.jsonl` | `166cd3aa61e883e156ba163bf352b100c9800c8be711ccbed2eaebfe2d84bf7a` | 373317 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/aggregate/run/calls.jsonl` | `249b93759800f3fa7628717e3e7719e94ad187c9f6f3fee5e538b155f36d352c` | 6255 |
| `.orkestrel/agent/instruments/results/l12/q2-think0/aggregate/cache/judge.jsonl` | `cddbf23cf901f63bb1689384725db3b816f7720d3779d85a058d7c9c0c1cbb64` | 1451555 |

At terminal, dispatch PID `41068` was gone and no aggregate launcher or bench command remained. Root owns the daemon. Prior l11 records/full and the l11 aggregate integrity fault remain preserved; this is an unqualified l12 development observation, not adoption or matched-build qualification.

## Bounded raw-evidence supplement

Request 46 is the actual capped summarizer generation preceding the judge integrity failure. Its structured fields are role `summarizer`, goal `g03-grace-escalation`, HTTP `200`, prompt `625`, completion `160`, request option `num_predict=160`, response `done=true`, `done_reason=length`, and `eval_count=160`. The decoded output is recorded verbatim below to preserve the truncation point; it is not graded:

```text
(2026-10-08) tool: lookup_order {"id":"LH-77302"}: Order LH-77302 for account LH-20418 (Grace Okafor): linen duvet set, queen, total $148.50.
(2026-10-08) tool: lookup_order {"id":"LH-77302"}: Shipped 2026-09-30 by Parcelway, tracking PW-5521-9930; marked delivered 2026-10-03 to a parcel locker at Elm Street station.
(2026-10-
```

Thus request 46's `length` termination is a real summarizer generation cap. It is distinct from the later development integrity failure and the unsent judge followers; no classifier or completed row was emitted for g03. Existing structured aggregate records classify g03 as failed, followed by maintenance abort with the exact harness fault already quoted above.

The two emitted row records expose these aggregate fields:

| Goal | Automated success / faults | Usage (prompt + completion = total) | Partial | Missing / violations / patterns | Passes / via | First–last request | Cut / emptied | Summary / filtered / sole |
|---|---|---:|---|---|---|---:|---|---|
| `g01-luis-refund-amount` | true / 0 | 5106 + 66 = 5172 | false | all empty | 1 / `final` | 3–42 | both empty | 289.6680424528302 / 0 / 0 |
| `g02-luis-card` | true / 0 | 4289 + 60 = 4349 | false | all empty | 1 / `final` | 43–45 | both empty | 148.31588132635252 / 0 / 0 |

There are 24 planned goals: 2 served rows, g03 maintenance attempted and aborted before any answer row, and the remaining 21 goals unattempted. The integrity failure prevented a row classifier/result for g03. Request 46's raw response and the aggregate metadata are already included in the hashed `requests.jsonl`, `aggregates.jsonl`, and `rows.jsonl`; no raw artifacts were edited.

After terminal closure, the source checkout still resolved to accepted commit `18cd5ffa29420927b7d88c46ad05da48c2aa1cf9` and canonical build-manifest SHA256 remained `da4a2f8be82aeb0bacc83dfc5729f8617fdd00f0fb75fe34ee7cdd5da9d9cfc0`. Dispatch PID `41068` was absent and a process query found no aggregate launcher or `matrix.js run` command. Source/build custody is released to root.
