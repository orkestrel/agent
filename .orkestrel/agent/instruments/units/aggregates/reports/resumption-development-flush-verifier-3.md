# Aggregate development flush verifier successor 3: bounded result

The resource-bound build, scoped static gates, and direct Peer protocol regression passed. The first sustained consumer failed, so the runner stopped before the remaining sustained files, any mutation control, restoration stage, or canonical build. No source was mutated by this verifier.

Dispatch command (scaffold root, cap 900 seconds):

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-development-flush-verifier-3-launch.jsonl --errors tmp/units/aggregate-development-flush-verifier-3-launch.err --cap 900 -- node tmp/units/aggregate-development-flush-verifier-3-run.ts
```

The runner source is `tmp/units/aggregate-development-flush-verifier-3-run.ts`; command records and complete output are in `tmp/units/aggregate-development-flush-verifier-3-logs/`.

| Stage | Exit | Duration | PID |
| --- | ---: | ---: | ---: |
| Resource-bound harness build | 0 | 5,743 ms | 460 |
| Harness TypeScript check | 0 | 3,085 ms | 41384 |
| Peer-only lint | 0 | 303 ms | 43348 |
| Peer-only format check | 0 | 71 ms | 53412 |
| Direct Peer protocol test | 0 | 358 ms | 60132 |
| Sustained runtime test | 1 | 504,813 ms | 25336 |

The bound build used the existing fixture argument `--resource tmp/units/aggregate-runtime-workload-audit-2/manifest.json`. Its emitted manifest contained the fixture resource exactly once. The saved manifest SHA-256 is `69beb984b6f31a2d3cb3b639c22f58a33a1649faa865cb1bae07c7ff63e18116`; the current harness build manifest is still this resource-bound manifest. No canonical build ran.

The direct Peer test `recognizes both current contextual support questions only for the exact synthetic candidate` passed, 1/1. Runtime test `runs real bounded continuous ledgers, seals runtime-only filing, transfers a fresh refit, and retains late invalidity` failed, 0/1, at emitted `sustained/tests/runtime.test.js:409`. The assertion expected the inner operation to exit 3 but received 1 (`1 !== 3`). In the retained output, the filing reports requests 1–4 as `operational transport or response fault`, requests 2–4 as `model role differs`, and says the run ended without measured resource refusal (`Sustained.js:315`). Thus the fixture fit/admission failure is cleared in this test; the reached failure is a later runtime filing expectation. This report records that boundary without inferring whether the fixture or product behavior is responsible.

Raw evidence: `positive-sustained-runtime.stdout.log` and `positive-sustained-runtime.stderr.log`; stage record: `positive-sustained-runtime.json`; launcher journal/error files are at the report command paths above. The full TAP leaf and assertion are retained at the end of the stdout log. Inner synthetic control errors in the log are not counted as TAP failures.

No remaining positive consumer ran: sustained `transport.test.js`, `products.test.js`, `preparation.test.js`. No flush or Peer mutation ran, no post-control restored suite ran, and no final build ran. The runner stopped at the first unexpected test exit. It completed uncapped in 514,491 ms with exit 1. Launcher PID 34560 and its children 25336 and 29952 are confirmed closed.

Source custody after stop matches all released hashes:

- `matrix/helpers.ts`: `93780d9d39d2f5fc8e72273c50f4e72b19eae8928cec84664c947a0a05f34565`
- `tests/matrixFixture.ts`: `4761fcc8709332b407c2c92953adea0c96b27175623263df571e8f79cf294708`
- `tests/development.test.ts`: `eb73f3107cb0e580fea964884d20c1ce1cdfc231197f913ed1a94cfe4e8cc37b`
- `matrix/tests/capacity.test.ts`: `36932ed08139292c6eebce716df8f917d754e0af52afd9b0bc3792d560cd3e8a`
- `Driver.ts`: `c34f1b6c4216a1dcc01f74722e060917b0061393b6f511dd09739b741d603977`
- sustained `Peer.ts`: `48587b3614c76ad0454deb1daeaf09a4776a3cf3df77b5f1e75846ecf282671d`
- sustained `Peer.test.ts`: `3be3127f71ce81368c0a6e8c55ee465ca3b776cbd95d714c9119fe4c43732778`

All logged checks completed with exit 0 before the first runtime test. The test stopped before the prescribed controls, so no source restoration was necessary. The resource-bound build remains in `.build`; canonical build custody has not yet been restored. Await root diagnosis and release before further gates.
