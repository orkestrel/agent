Implemented all contracts within the owned files.

- Recall listing: stored text, repeated readings, seed assistants, breadth-first amendments, and whole-item cuts — [Ledger.ts:1030](/home/user/agent-port/src/core/ledgers/Ledger.ts:1030).
- Recall searches: measured topic/word matching retained; v7 “Halvorsen shipment” history restored through the earlier note — [Ledger.ts:1011](/home/user/agent-port/src/core/ledgers/Ledger.ts:1011), [regression:265](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:265).
- Answer note: generated lookup leads removed; stored lines retained; duplicates and recall cut lines omitted — [Ledger.ts:1096](/home/user/agent-port/src/core/ledgers/Ledger.ts:1096).
- Seed tail: stale sentences and superseded messages retained — [Ledger.ts:845](/home/user/agent-port/src/core/ledgers/Ledger.ts:845).
- Unchanged: briefing projection, R2a, `collectLive`, public API, and T1 — [Ledger.ts:487](/home/user/agent-port/src/core/ledgers/Ledger.ts:487), [helpers.ts:633](/home/user/agent-port/src/core/ledgers/helpers.ts:633).
- TSDoc: stale removal scoped to records and briefing — [types.ts:406](/home/user/agent-port/src/core/ledgers/types.ts:406).

The unchanged-source regression command was:

```text
npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Ledger.test.ts -t 'recalls a call-free|recalls both seed|writes lookup lines|lists an earlier answer|recalls the Halvorsen|keeps stale sentences|keeps superseded user'
```

It exited **1: 7 failed, 47 skipped**. Each named test failed before implementation:

- **X1:** recalls a call-free, non-quiet seed assistant statement and lists its amender after it in one item
- **X2:** recalls both seed readings of one lookup and lists each once in the answer note
- **X3:** writes lookup lines in the answer note without their call text
- **X4:** lists an earlier answer note through a word match but never through a topic match
- **X5, amended:** keeps stale sentences and superseded messages in recall results while the briefing drops them
- recalls the Halvorsen shipment owner history carried by the v7 00061 answer note
- **Amended:** keeps superseded user messages in an otherwise uncut seed tail

The same targeted command then exited **0: 7 passed**. Final gates returned:

| Gate | Exit | Result |
|---|---:|---|
| `npx tsc --noEmit --project tsconfig.json` | 0 | Passed; intermediate migration run exited 2 |
| `npm run check:src:core` | 0 | Passed |
| Ledger test file | 0 | 54 passed |
| `npm run test:src:core` | 0 | 1,231 passed |
| `npm run lint:check` | 0 | Passed |
| `npm run format:check` | 0 | Passed |
| `npm run test:policy` | 0 | 119 passed, 1 skipped |
| `npm run test:guides` | 1 | 96 passed; 6 sandbox-only failures |
| Scoped skill discovery | 2 | `spawnSync /opt/node22/bin/node EPERM` |
| `git diff --check` | 0 | Passed |

Every guide failure reported `listen EPERM: operation not permitted 127.0.0.1`. These files remain unchanged:

| Failing test | Test line | `guides/agent.md` line |
|---|---:|---:|
| resolves the judgments fence’s question once over a started listener and reuses the record | 557 | 415 |
| drops only the decisive no through the stock selection fence over a started listener | 623 | 465 |
| reads the select receipt beside the active mode’s description as the judge pattern fence claims | 1137 | 2379 |
| round trips both relay fence halves over a started listener and refuses what the route declines | 2373 | 1935, 1965 |
| cancels the upstream turn when the relay reader goes away with the first pull pending | 2446 | 1961 |
| asks the System One fence’s three questions over a started listener and reads the published measures | 2636 | 1831 |

`git diff --stat` lists only owned files: **3 files changed, 400 insertions, 110 deletions**.

`git status --porcelain`:

```text
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/types.ts
 M tests/src/core/ledgers/Ledger.test.ts
```