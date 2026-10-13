Implemented the code contracts. Final core run: **1,239 tests passed**. Only owned files changed; guides remain untouched.

- **Claim 1:** Final-text cancellation commits `partial: true` — `src/core/agents/Agent.ts:591`.
- **Claim 7:** Holds `QUESTION` and deterministic-pattern failures; transient retry coverage passes — `src/core/ledgers/Classifier.ts:357`.
- **O2 / claim 9:** Shared `collectExchanges` preserves leading exchanges and joins tool-spanned exchanges — `src/core/conversations/helpers.ts:22`; consumers: `Conversation.ts:227`, `src/core/contexts/helpers.ts:151`, `src/core/ledgers/Ledger.ts:871`. Compaction assertions remain unchanged; selection expectations follow the required leading-exchange contract.
- **O1:** Inactive ledger selection faults before classification or planning — `src/core/ledgers/Ledger.ts:551`.
- **O4:** One unit-to-record mapping and one exported cut-ranking function, each calculated once per unit — `src/core/ledgers/Ledger.ts:708`, `Ledger.ts:746`, `src/core/ledgers/helpers.ts:33`.
- **Claim 11:** Renamed to `cutListing` and `LedgerTopic.requested`; corrected boolean returns and measurement citations — `src/core/ledgers/helpers.ts:534`, `types.ts:74`, `types.ts:523`, `types.ts:530`, `Classifier.ts:137`, `Classifier.ts:150`, `constants.ts:98`.
- **O3:** Distinguished canonical repeat identity from normalized projection identity — `src/core/ledgers/types.ts:167`, `helpers.ts:170`.

The following command ran against unchanged source at **`7f346b5`**, after adding the tests: **exit 1; 8 failed, 345 passed**. The identical command after implementation returned **exit 0; 353 passed**.

```text
npx vitest run --config vite.config.ts --project src:core tests/src/core/agents/Agent.test.ts tests/src/core/ledgers/Ledger.test.ts tests/src/core/ledgers/Classifier.test.ts tests/src/core/ledgers/helpers.test.ts tests/src/core/conversations/helpers.test.ts --reporter=dot
```

Each added test failed in that baseline run:

| Test name | Location | Baseline failure |
|---|---|---|
| commits a partial agent result when final usage aborts the caller | `tests/src/core/agents/Agent.test.ts:80` | `partial` was false |
| commits a partial reply without an answer pass when final usage aborts the caller | `tests/src/core/ledgers/Ledger.test.ts:54` | `partial` was false |
| keeps interleaved seed calls and results on the same side of the tail cut | `tests/src/core/ledgers/Ledger.test.ts:70` | Orphan result reached provider |
| sends a leading assistant seed exchange when it fits the tail | `tests/src/core/ledgers/Ledger.test.ts:89` | Seed absent |
| faults direct agent generation without planning for the earlier request | `tests/src/core/ledgers/Ledger.test.ts:97` | Fault absent |
| holds a QUESTION rejection without asking the refused spec twice | `tests/src/core/ledgers/Classifier.test.ts:22` | Asked twice |
| keeps leading messages separate and joins exchanges spanned by tool groups | `tests/src/core/conversations/helpers.test.ts:22` | Helper absent |
| ranks name matches before loose sources, off-topic corrections, rules, and on-topic sources | `tests/src/core/ledgers/helpers.test.ts:42` | Helper absent |

Final gate results:

| Command | Exit | Result |
|---|---:|---|
| `npx tsc --noEmit --project tsconfig.json` | 0 | Passed |
| `npm run check:src:core` | 0 | Passed |
| `npm run test:src:core` | 0 | 1,239 passed |
| `npm run lint:check` | 0 | Passed |
| `npm run format:check` | 0 | Passed |
| `npm run test:policy` | 0 | 119 passed, 1 skipped |
| `npm run test:guides` | 1 | 96 passed, 10 failed as detailed below |
| `git diff --check` | 0 | Passed |
| Auxiliary scaffold discovery, `--projects src:core` | 2 | Sandbox `spawnSync /opt/node22/bin/node EPERM` |

Every guide failure follows. Test locations are in `tests/guides.test.ts`; guide locations are in `guides/agent.md`.

| Failing test | Test line | Guide line / cause |
|---|---:|---|
| documents every barrel export | 260 | 1000, 1330, 1335: missing `collectExchanges`, `cutListing`, `rankLedgerCut` |
| documents only barrel exports | 264 | 1330: obsolete `cutItems` |
| keeps every compared summary and example equal to its source | 281 | 1283, 1321, 1331: changed summaries |
| documents an example for every Surface function | 286 | 1330: obsolete `cutItems` |
| resolves the judgments fence’s question once over a started listener and reuses the record | 558 | 417: sandbox-only listener failure |
| drops only the decisive no through the stock selection fence over a started listener | 624 | 470: sandbox-only listener failure |
| reads the select receipt beside the active mode’s description as the judge pattern fence claims | 1138 | 2373: sandbox-only listener failure |
| round trips both relay fence halves over a started listener and refuses what the route declines | 2539 | 1933, 1963: sandbox-only listener failure |
| cancels the upstream turn when the relay reader goes away with the first pull pending | 2612 | 1961: sandbox-only listener failure |
| asks the System One fence’s three questions over a started listener and reads the published measures | 2802 | 1827: sandbox-only listener failure |

All listener failures reported `listen EPERM: operation not permitted 127.0.0.1`. `git diff --stat` lists only owned files: **17 files changed, 342 insertions, 175 deletions**.

`git status --porcelain`:

```text
 M src/core/agents/Agent.ts
 M src/core/contexts/helpers.ts
 M src/core/conversations/Conversation.ts
 M src/core/conversations/helpers.ts
 M src/core/conversations/types.ts
 M src/core/ledgers/Classifier.ts
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/constants.ts
 M src/core/ledgers/helpers.ts
 M src/core/ledgers/types.ts
 M tests/src/core/agents/Agent.test.ts
 M tests/src/core/contexts/factories.test.ts
 M tests/src/core/contexts/helpers.test.ts
 M tests/src/core/conversations/helpers.test.ts
 M tests/src/core/ledgers/Classifier.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
 M tests/src/core/ledgers/helpers.test.ts
```