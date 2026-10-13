1. Correction placement: src/core/ledgers/Ledger.ts:695; test: tests/src/core/ledgers/Ledger.test.ts:791.
2. Held owner rules: src/core/ledgers/Ledger.ts:568; test: tests/src/core/ledgers/Ledger.test.ts:791.
3. Group-three ordering: src/core/ledgers/Ledger.ts:643; test: tests/src/core/ledgers/Ledger.test.ts:841.
4. Live amendments: src/core/ledgers/Ledger.ts:750; test: tests/src/core/ledgers/Ledger.test.ts:873.
5. Lookup leads: src/core/ledgers/Ledger.ts:489; tests: tests/src/core/ledgers/Ledger.test.ts:53, :109, :586.
6. Seed assistant content: src/core/ledgers/Ledger.ts:841; test: tests/src/core/ledgers/Ledger.test.ts:53.
7. Superseded tail turns: src/core/ledgers/Ledger.ts:848; test: tests/src/core/ledgers/Ledger.test.ts:984.
8. Partial entity matching: src/core/ledgers/Ledger.ts:470; test: tests/src/core/ledgers/Ledger.test.ts:936.
9. Empty-topic counter: src/core/ledgers/Ledger.ts:957; test: tests/src/core/ledgers/Ledger.test.ts:561.
10. Recall topic matching: src/core/ledgers/Ledger.ts:979; test: tests/src/core/ledgers/Ledger.test.ts:936.
11. Recall correction ordering: src/core/ledgers/Ledger.ts:1022; test: tests/src/core/ledgers/Ledger.test.ts:873.
12. No-match guidance: src/core/ledgers/Ledger.ts:1045; test: tests/src/core/ledgers/Ledger.test.ts:1085.
13. Short-room handling: src/core/ledgers/Ledger.ts:959; test: tests/src/core/ledgers/Ledger.test.ts:561.
14. Empty lookup digest: src/core/ledgers/Ledger.ts:1086; test: tests/src/core/ledgers/Ledger.test.ts:1156.
15. Final-answer reserve: src/core/ledgers/Gauge.ts:112, src/core/ledgers/Ledger.ts:342; tests: tests/src/core/ledgers/Gauge.test.ts:191, tests/src/core/ledgers/Ledger.test.ts:1007.
16. Selection faults retain usage: src/core/ledgers/Ledger.ts:517, src/core/ledgers/Classifier.ts:51, src/core/ledgers/types.ts:468; tests: tests/src/core/ledgers/Ledger.test.ts:339, :392, tests/src/core/ledgers/Classifier.test.ts:364.
17. Pass-state reset: src/core/ledgers/Ledger.ts:365; test: tests/src/core/ledgers/Ledger.test.ts:442.
18. Constructor validation: src/core/ledgers/Ledger.ts:103, src/core/ledgers/factories.ts:18; test: tests/src/core/ledgers/factories.test.ts:41.
19. Calibration abort contract: src/core/ledgers/types.ts:299, :310; test: tests/src/core/ledgers/Ledger.test.ts:318.
20. Throwing lookup reader: src/core/ledgers/Ledger.ts:421; test: tests/src/core/ledgers/Ledger.test.ts:466.
21. Nonpositive calibration usage: src/core/ledgers/Ledger.ts:269; test: tests/src/core/ledgers/Ledger.test.ts:300.
22. Named threshold checks: src/core/ledgers/Ledger.ts:104; test: tests/src/core/ledgers/factories.test.ts:29.
23. Removed `strict`: src/core/ledgers/types.ts:227; test: tests/src/core/ledgers/factories.test.ts:21.
24. Calibration concurrency: src/core/ledgers/Ledger.ts:250; test: tests/src/core/ledgers/Ledger.test.ts:318.
25. Recovery after rejection: src/core/ledgers/Ledger.ts:359; test: tests/src/core/ledgers/Ledger.test.ts:300.
26. Continuation message assertion: src/core/ledgers/Ledger.ts:522; test: tests/src/core/ledgers/Ledger.test.ts:185.
27. Successful/failed lookup classification: src/core/ledgers/Ledger.ts:391; test: tests/src/core/ledgers/Ledger.test.ts:466.
28. Getter TSDoc: src/core/ledgers/Ledger.ts:219, :226, :233; getter coverage: tests/src/core/ledgers/factories.test.ts:20, tests/src/core/ledgers/Ledger.test.ts:265.
29. Verb-first private methods: src/core/ledgers/Ledger.ts:365, :407, :478; behavioral coverage: tests/src/core/ledgers/Ledger.test.ts:53, :109, :586.
30. Recall identity documented: src/core/ledgers/types.ts:114; test: tests/src/core/ledgers/Ledger.test.ts:586.
31. Seed lookup success documented: src/core/ledgers/types.ts:167; test: tests/src/core/ledgers/Ledger.test.ts:466.

Gate exit codes:

- `npx tsc --noEmit --project tsconfig.json`: 0
- `npm run check:src:core`: 0
- `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers`: 0 — 147 passed
- `npm run test:src:core`: 0 — 1,174 passed
- `npm run lint:check`: 0
- `npm run format:check`: 0
- `npm run test:policy`: 0 — 119 passed, 1 skipped

`git status --porcelain`:

```text
 M src/core/index.ts
 M src/core/ledgers/Classifier.ts
 M src/core/ledgers/Gauge.ts
 A src/core/ledgers/Ledger.ts
 A src/core/ledgers/factories.ts
 A src/core/ledgers/index.ts
 M src/core/ledgers/types.ts
 M tests/src/core/ledgers/Classifier.test.ts
 M tests/src/core/ledgers/Gauge.test.ts
 A tests/src/core/ledgers/Ledger.test.ts
 A tests/src/core/ledgers/factories.test.ts
```