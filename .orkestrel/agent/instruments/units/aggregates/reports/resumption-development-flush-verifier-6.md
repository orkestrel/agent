# Aggregate development flush verifier 6 — products passed; preparation failed

## Outcome

The only authorized pending files ran serially on the existing fixture-bound build without a build step. Products passed. Preparation failed at its expected-ledger deep equality. Both test processes and launcher closed. The runner confirmed all nine source hashes and the build-manifest hash were unchanged before and after; no source/build mutation occurred.

## Identity and launch

The runner `tmp/units/aggregate-development-flush-verifier-6-run.ts` passed `node --check` and strict standalone TypeScript checking. The checked brief `tmp/units/aggregate-development-flush-verifier-6-brief.md` reported 4 checked paths and no missing paths. Before testing, the source hashes matched `aggregate-development-flush-verifier-5-report.md`; `.build/build-manifest.json` SHA-256 was `d8546db78ae17d5427e38a9e11ab14e7ff8808589706123324ceb4b502f37d5e`.

Launcher command:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-development-flush-verifier-6-launch.jsonl --errors tmp/units/aggregate-development-flush-verifier-6-launch.err --cap 600 -- node tmp/units/aggregate-development-flush-verifier-6-run.ts
```

Launcher PID 8272 exited 0, uncapped, after 121,402 ms. Exact stage JSON, identities, and durations are retained in `tmp/units/aggregate-development-flush-verifier-6-result.json`.

## Products

Command: `node --test --test-concurrency=1 .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/products.test.js`.

Exit 0, stage duration 64,045 ms, PID 40936. TAP: one test passed, zero failed, duration 63,981 ms. Leaf: `keeps an empty measured-refusal suffix without inventing a product and rejects missing or changed produced replies`. Full bare output is `tmp/units/aggregate-development-flush-verifier-6-logs/products.stdout.log`; stderr is empty. Synthetic inner error/refusal lines are expected fixture cases, not TAP failures.

## Preparation

Command: `node --test --test-concurrency=1 .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/preparation.test.js`.

Exit 1, stage duration 57,237 ms, PID 32916. TAP leaf: `retains authentic exposure-only pilots and rejected fits through ranked inconclusive reporting` (TAP duration 56,915 ms). It failed at `preparation.test.js:307:24` with `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal`.

Expected entries were trajectory summarizer (8 requests), trajectory judge (16 requests), and calibration judge (25 requests, 390.383 ms). Actual entries contained only the two trajectory entries. Full bare assertion output is `tmp/units/aggregate-development-flush-verifier-6-logs/preparation.stdout.log`; stderr is empty. This is reported as observed; no diagnosis or repair was performed.

## Closure

Direct before/after verification in the result JSON confirms all nine source SHA-256 identities from report 5 remained unchanged and the build manifest remained `d8546db78ae17d5427e38a9e11ab14e7ff8808589706123324ceb4b502f37d5e`. No child process remained after launcher completion. No build, source edit, previously accepted test, canonical build, model/service call, or private oracle read was made. Custody returns unchanged.
