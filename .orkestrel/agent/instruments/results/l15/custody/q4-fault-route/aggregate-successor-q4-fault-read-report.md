# Retained q4-think0 pilot read

`readPilotFeasibility` threw `operational matrix fault is not configuration infeasibility`. The same saved run decoded with status `complete` and 343 requests. Both selected failed requests classify as `fault`, and neither is a stopped-request exclusion. See the complete capture at `tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl:1` and the dispatcher record at `tmp/units/aggregate-successor-q4-fault-read-stderr.txt:1`.

The reader validated the manifest record, frozen and resource references, fit reference, and attempt using `isRecord`, `isRefitFile`, and `isMatrixAttempt`. It passed the original frozen and resource reference objects directly to `readPilotFeasibility`; both object identity checks remained true. The reader then decoded the raw run with `readAttempt` and classified sequences 302 and 315 with `isStoppedRequest` and `readRequestOutcome`. Their roles are `judge` and `flush`; both retain `TypeError: fetch failed <- HeadersTimeoutError: Headers Timeout Error`, have no HTTP status, return `fault`, and have `stopped: false`. The emitted signatures are [pilot feasibility](../../.orkestrel/agent/instruments/harness/.build/bench5/sustained/helpers.d.ts:83), [attempt decoding](../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.d.ts:60), [request outcome](../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.d.ts:101), and [stopped classification](../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.d.ts:125).

The retained reference and primary evidence hashes are:

| Input | SHA-256 |
| --- | --- |
| Pilot manifest | `7ad28d29d94d1b8710f2a35dd60168b0fb1c5279fceb13ff0b28a057edb7e8a0` |
| Frozen manifest | `95da49bbb6f4811f2bcad63e87ace42c380ba15ceb5ee42c0bd113b509ac72a9` |
| Resource manifest | `a4db9c340ad82e69b0f8b6b877ca4d330dac8d3375bb363e0378e58c96f1edcb` |
| Fit | `46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8` |
| Execution | `650a641d5c7124a35cabe0c5decaba801911c6ed84e3e1169d72e887cc699631` |
| Run manifest | `cf1471a9447fc3ae5370c4ed56662df2a167c215c9db1190e485ce610402eba7` |
| Requests | `93273d27ca6efac4faa31d9778bae6cebd4d83e3ce2e2a606c7db92331bc2758` |

The stdout capture contains hashes for the entire manifest custody population, including all attempt files. The reader source SHA-256 is `f22973171dfcfdf48230fe8d984b4b59d4fe392d0c66c1e8294c9384df0f633e`; the stdout capture SHA-256 is `0e6b65aa28f64f4ca72ba52ca17fd6199dbc34b1b6e80cf43a486abfed832aea`; the stderr capture SHA-256 is `d80d13ade353cd69a603742fc186fb52f1f0b8bcd87f459ddf3906e82f261cb8`. The dispatcher status-before and status-after captures both hash to `cfa8619ccc3a2e2885ecaab9cef80b7cfc13e89b9efb9f0cde74c250718ac82f`.

The exact launch command was:

```text
node dist/host/agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl --errors tmp/units/aggregate-successor-q4-fault-read-stderr.txt --cap 180 --status -- node tmp/units/aggregate-successor-q4-fault-read-reader.ts
```

The reader syntax check was `node --check tmp/units/aggregate-successor-q4-fault-read-reader.ts` and exited 0. The dispatcher completed with `exit=0`, `capped=false`, and `duration_ms=28345` against its 180-second cap. It recorded PID 48020; a later Windows `tasklist /FI "PID eq 48020" /NH` read returned `INFO: No tasks are running which match the specified criteria.` The complete captures are `tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl:1`, `tmp/units/aggregate-successor-q4-fault-read-stderr.txt:1`, `tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-before.txt:1`, and `tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-after.txt:1`.
