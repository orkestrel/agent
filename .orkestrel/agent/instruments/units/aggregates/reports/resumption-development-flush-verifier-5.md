# Aggregate development flush verifier 5 — controls passed; transport consumer stopped the positive chain

## Outcome

All three remaining Peer mutation controls reached their prescribed failing assertion, restored `Peer.ts` byte-exactly, and rebuilt successfully. The positive chain passed the fixture-bound build, direct Peer protocol proof (2/2), isolated ranked-refusal proof (1/1), and sustained runtime proof (1/1). It stopped at the first unexpected sustained transport TAP failure; products, preparation, restored focused tests, and canonical build did not run.

## Preparation and custody

The checked brief is `tmp/units/aggregate-development-flush-verifier-5-brief.md` (14 paths, no missing paths). Runner `tmp/units/aggregate-development-flush-verifier-5-controls-run.ts` passed `node --check`, strict standalone TypeScript checking, and `--preflight-only`. Preflight confirmed the released Peer source SHA-256 `895a5248b1faefc2cbfc26d309db7c918cb3066d439f349548ae32c589ea43e7`, exactly one predicate anchor, and three distinct transformed source hashes. No preflight build was performed.

All mutation builds used `.orkestrel/agent/instruments/harness/tools/build.ts --compiler node_modules/typescript/bin/tsc --types node_modules/@types --resource tmp/units/aggregate-runtime-workload-audit-2/manifest.json`.

## Remaining controls

Launcher PID 60592 exited 0, uncapped, after 45,852 ms. The complete stage table is `tmp/units/aggregate-development-flush-verifier-5-controls-result.json`; raw output is in `tmp/units/aggregate-development-flush-verifier-5-controls-launch.jsonl`.

- Bound build before controls: exit 0, 4,778 ms, PID 47956.
- Obsolete Peer question mutation build: exit 0, 5,552 ms, PID 53832. `Peer.test.js` exited 1 at `focus:0:40 must accept the supported candidate` (422 ms, PID 68844). Restored build exit 0, 5,946 ms, PID 41592.
- Removed exact candidate restriction build: exit 0, 5,876 ms, PID 26404. `Peer.test.js` exited 1 at `focus:0:47 must reject the contradictory candidate` (488 ms, PID 38412). Restored build exit 0, 5,760 ms, PID 23276.
- Disabled measured boundary usage build: exit 0, 5,624 ms, PID 34288. `Peer.test.js` exited 1 at `complete boundary usage must produce measured refusal`; actual classification was `complete`, expected `refused` (470 ms, PID 47412). Restored build exit 0, 5,587 ms, PID 34328.
- Final fixture-bound restored build: exit 0, 5,222 ms, PID 1500.

`Peer.ts` before/after hash is `895a5248b1faefc2cbfc26d309db7c918cb3066d439f349548ae32c589ea43e7`. Runner recorded `restored_exactly: true`.

## Positive chain

Launcher PID 3008 exited 1, uncapped, after 641,086 ms; journal and full raw stages are `tmp/units/aggregate-development-flush-verifier-4-positive-launch.jsonl` and `.err`. The fixture-bound build passed (5,642 ms, PID 37460), with resource-bound manifest SHA-256 `d8546db78ae17d5427e38a9e11ab14e7ff8808589706123324ceb4b502f37d5e`. Direct Peer protocol passed TAP 2/2 (521 ms, PID 23240). Isolated ranked refusal passed TAP 1/1 (87,607 ms, PID 22092). Sustained runtime passed TAP 1/1 (491,485 ms, PID 62124), leaf `runs real bounded continuous ledgers, seals runtime-only filing, transfers a fresh refit, and retains late invalidity`.

The first unexpected failure was sustained transport, PID 9200, exit 1 in 55,715 ms. Exact TAP leaf: `retries transient judge transport within frozen bounds and refuses operational faults as ranked infeasibility`. At `transport.test.js:65:20`, the test asserted retry count and failed with `Expected values to be strictly equal: 1 !== 2` (actual 1, expected 2). TAP reported 1 test, 0 pass, 1 fail. The runner then stopped as prescribed; its wrapper error says `sustained-transport: got 1, expected 0`. Synthetic inner `gNN FAIL`/operational-fault messages precede the TAP result and are not separate test leaves.

The runtime fixture's latest named outputs and active commands were monitored by path/size/time only; no private oracle contents were read. The runtime test completed normally before transport started.

## Closed work and source identity

All processes in the launcher/test descendant tree were closed after the transport failure. The nine source inputs checked by the positive runner still match the released hashes:

- `matrix/helpers.ts`: `93780d9d39d2f5fc8e72273c50f4e72b19eae8928cec84664c947a0a05f34565`
- `tests/matrixFixture.ts`: `4761fcc8709332b407c2c92953adea0c96b27175623263df571e8f79cf294708`
- `tests/development.test.ts`: `eb73f3107cb0e580fea964884d20c1ce1cdfc231197f913ed1a94cfe4e8cc37b`
- `matrix/tests/capacity.test.ts`: `36932ed08139292c6eebce716df8f917d754e0af52afd9b0bc3792d560cd3e8a`
- `Driver.ts`: `c34f1b6c4216a1dcc01f74722e060917b0061393b6f511dd09739b741d603977`
- `sustained/tests/Peer.ts`: `895a5248b1faefc2cbfc26d309db7c918cb3066d439f349548ae32c589ea43e7`
- `sustained/tests/Peer.test.ts`: `d91291f1fd2acdf8356fb4053de1ac5d38bff8d8ecc27494565a039507c8650e`
- `sustained/tests/runtime.test.ts`: `386d835fa16010448813dd63a11086cb807c5a091acfc2279fa5e6ecb9bbd989`
- `sustained/tests/refusal.test.ts`: `847d8a33083deb48b6f1d494bcf7de04eefa3db02312682cfcac6c2f23b5b799`

No source repair occurred. No products/preparation test, restored development/capacity population, no-resource build, final canonical build, or final manifest check occurred. Source custody is returned unchanged. Report 4 remains preserved; its first flush-exception test duration correction is recorded in its per-stage JSON (15,968 ms), not rewritten here.
