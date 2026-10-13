Incomplete: implementation and tests are written, but compilation fails and Vitest cannot start.

Diff summary: added src/core/ledgers/Classifier.ts (+291 lines) and tests/src/core/ledgers/Classifier.test.ts (+406 lines). No shared files changed.

The following tests are written but unverified:

| Behavior | Test |
|---|---|
| Literal category/topic/pair keys, questions, states; asking order; request trimming; reuse; usage; classification | tests/src/core/ledgers/Classifier.test.ts:12 |
| Category and group cutoffs; stale-record rejection; criteria order | tests/src/core/ledgers/Classifier.test.ts:142 |
| Whole-name pairing; call arguments; amendment token requirement; supersession ordering | tests/src/core/ledgers/Classifier.test.ts:211 |
| Deterministic failure retention and transient retry | tests/src/core/ledgers/Classifier.test.ts:295 |
| Abort propagation and completed-record retention | tests/src/core/ledgers/Classifier.test.ts:352 |

Gate results:

| Command | Exit | Failure |
|---|---:|---|
| `npx tsc --noEmit --project tsconfig.json` | 2 | TS2375: optional instructions at src/core/ledgers/Classifier.ts:188; TS2769: possibly undefined criteria at tests/src/core/ledgers/Classifier.test.ts:194; TS7022/TS7024: transport inference at tests/src/core/ledgers/Classifier.test.ts:299 |
| `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Classifier.test.ts` | 1 | `EROFS: read-only file system, open '/home/user/agent-port/node_modules/.vite-temp/vite.config.ts.timestamp-…mjs'` |
| `npm run check:src:core` | — | Not run after mandatory stop |
| `npm run lint:check` | — | Not run |
| `npm run format:check` | — | Not run |
| `npm run test:policy` | — | Not run |

Expected: Vitest collects and executes the classifier tests. Found: Vite’s temporary config write was rejected. Hypothesis: the shared `node_modules` symlink directs that write into the read-only sibling checkout. Work stopped under ../scaffold/.agents/orchestration.md:97: “When a sandbox rejects a write, the unit stops and reports the rejection.”

`git status --porcelain`:

```text
?? src/core/ledgers/Classifier.ts
?? tests/src/core/ledgers/Classifier.test.ts
```