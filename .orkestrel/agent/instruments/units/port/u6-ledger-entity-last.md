Implemented `Ledger`, validated `createLedger`, added barrel exports, and added 20 tests. Diff: 6 owned files, 1,735 insertions. Full patch: tmp/units/u6-ledger-entity.diff.

The numbered behaviors are pinned by these tests:

| Behavior | Test evidence |
|---|---|
| 1. Option validation | tests/src/core/ledgers/factories.test.ts:28; tests/src/core/ledgers/factories.test.ts:44; tests/src/core/ledgers/factories.test.ts:73 |
| 2. Owned conversation, agent, tools, defaults | tests/src/core/ledgers/Ledger.test.ts:41; tests/src/core/ledgers/Ledger.test.ts:525 |
| 3. Projection, budgeting, stale removal, truthful stubs | tests/src/core/ledgers/Ledger.test.ts:41; tests/src/core/ledgers/Ledger.test.ts:383; tests/src/core/ledgers/Ledger.test.ts:473 |
| 4. Stable continuation cache | tests/src/core/ledgers/Ledger.test.ts:91 |
| 5. Canonical repeat detection, reused call IDs | tests/src/core/ledgers/Ledger.test.ts:91 |
| 6. Recall matching, closure, topic-only pricing | tests/src/core/ledgers/Ledger.test.ts:269; tests/src/core/ledgers/Ledger.test.ts:323; tests/src/core/ledgers/Ledger.test.ts:554 |
| 7. Answer recovery, usage, cancellation, concurrency | tests/src/core/ledgers/Ledger.test.ts:91; tests/src/core/ledgers/Ledger.test.ts:163; tests/src/core/ledgers/Ledger.test.ts:183; tests/src/core/ledgers/Ledger.test.ts:215 |
| 8. Calibration and missing-usage error | tests/src/core/ledgers/Ledger.test.ts:234; tests/src/core/ledgers/Ledger.test.ts:260 |
| 9. Deterministic category assignment | tests/src/core/ledgers/Ledger.test.ts:359 |
| 10. Public exports | tests/src/core/ledgers/factories.test.ts:20 |

Calibration uses two non-streaming `generate` calls with `think: false`, with and without tool definitions. The provider contract exposes no per-call output-token cap. Scale is bare prompt usage divided by the message estimate; fixed cost is the nonnegative prompt-usage difference.

Final gate results:

| Gate | Exit | Result |
|---|---:|---|
| `npx tsc --noEmit --project tsconfig.json` | 0 | Passed |
| `npm run check:src:core` | 0 | Passed |
| Specified targeted Vitest command | 0 | 20 passed |
| `npm run test:src:core` | 0 | 1,158 passed |
| `npm run lint:check` | 0 | Passed |
| `npm run format:check` | 0 | Passed |
| `npm run test:policy` | 0 | 119 passed, 1 skipped |
| `npm run test:guides` — observation | 1 | 8 failed, 82 passed |

Guide failure excerpts: undocumented ledger exports, `LedgerInterface declares members and carries no method table`, and `listen EPERM: operation not permitted 127.0.0.1`. Guide files remain for U7.

The digest regression’s mutation control failed as intended; restoring the implementation passed. Evidence: tests/src/core/ledgers/Ledger.test.ts:592.

Exact unapplied shared patch: tmp/units/u6-ledger-shared.patch. It aligns agent-limit documentation with behavior 1’s nonnegative limits; `git apply --check` exited 0.

Load measurement was not performed: the expected 48-message seed and 10 requests are absent from the supplied fixture. Found: 9 messages at tests/setupLedger.ts:126. Hypothesis: the fixture expansion was omitted.

`git status --porcelain`:

```text
 M src/core/index.ts
?? src/core/ledgers/Ledger.ts
?? src/core/ledgers/factories.ts
?? src/core/ledgers/index.ts
?? tests/src/core/ledgers/Ledger.test.ts
?? tests/src/core/ledgers/factories.test.ts
```