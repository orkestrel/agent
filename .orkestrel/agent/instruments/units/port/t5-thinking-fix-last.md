All rulings applied. Acceptance remains blocked by the guide gate’s sandbox listener failures.

1. Calibration: `src/core/ledgers/Ledger.ts:276`; test `tests/src/core/ledgers/Ledger.test.ts:54`.
2. Serialization fallback: `src/core/ledgers/helpers.ts:65`; tests `tests/src/core/ledgers/helpers.test.ts:59`, `tests/src/core/ledgers/Ledger.test.ts:81`.
3. Calibrated gauge options: `src/core/ledgers/Ledger.ts:297`; tests `tests/src/core/ledgers/Ledger.test.ts:328`, `tests/src/core/ledgers/Ledger.test.ts:363`.
4. Policy ownership wording: `src/core/types.ts:9`, `src/core/providers/types.ts:81`; tests `tests/guides.test.ts:280`, `tests/src/core/providers/RelayProvider.test.ts:202`.
5. Redundant sites removed: `src/core/ledgers/Ledger.ts:745`, `src/core/ledgers/Ledger.ts:944`; test `tests/src/core/ledgers/Ledger.test.ts:236`.
6. Joined thinking wording: `src/core/agents/types.ts:70`, `src/core/helpers.ts:53`; test `tests/src/core/agents/Agent.test.ts:1450`.
7. Summary filtering: `src/core/conversations/Conversation.ts:258`; test `tests/src/core/conversations/Conversation.test.ts:152`.
8. Root ownership: `src/core/types.ts:14`, `src/core/helpers.ts:101`; tests `tests/src/core/helpers.test.ts:16`, `tests/guides.test.ts:280`.
9. Shared thinking member: `src/core/agents/Agent.ts:511`; test `tests/src/core/agents/Agent.test.ts:178`.
10. Construction defaults: `src/core/agents/Agent.ts:127`, `src/core/ledgers/Ledger.ts:122`, `src/core/providers/RelayStream.ts:39`; tests `tests/src/core/agents/Agent.test.ts:141`, `tests/src/core/ledgers/Ledger.test.ts:102`, `tests/src/core/providers/RelayStream.test.ts:22`.
11. Shared cap validation: `src/core/ledgers/helpers.ts:32`; test `tests/src/core/ledgers/helpers.test.ts:73`.
12. Formula references: `src/core/ledgers/Gauge.ts:16`, `src/core/ledgers/types.ts:613`; test `tests/guides.test.ts:280`.
13. Recording method name: `src/core/ledgers/Ledger.ts:959`; test `tests/src/core/ledgers/Ledger.test.ts:303`.
14. Scripted replay option: `tests/setup.ts:465`; tests `tests/setup.test.ts:251`, `tests/src/core/ledgers/Ledger.test.ts:275`.
15. Integer completion domain: `src/core/ledgers/helpers.ts:48`; test `tests/src/core/ledgers/helpers.test.ts:41`.
16. Literal expectations: `tests/src/core/ledgers/Ledger.test.ts:228`, `tests/src/core/agents/helpers.test.ts:300`; tests at those same lines.
17. Thinking estimate description: `src/core/agents/helpers.ts:114`; tests `tests/guides.test.ts:280`, `tests/src/core/agents/helpers.test.ts:296`.

Gate results:

| Command | Exit |
|---|---:|
| `npx tsc --noEmit --project tsconfig.json` | 0 |
| `npm run check:src:core` | 0 |
| `npm run test:src:core` | 0 |
| `npm run test:guides` | 1 |
| `npm run lint:check` | 0 |
| `npm run format:check` | 0 |
| `npm run test:policy` | 0 |
| `npm run test:setup` | 0 |
| `grep -rn "?? 'none'" src/core` | 0 |

Core: 1,224 passed. Guides: 95 passed; six failed with `listen EPERM: operation not permitted 127.0.0.1`. Replay-default search: one line per resolving owner.

`git status --porcelain`:

```text
 M guides/agent.md
 M src/core/agents/Agent.ts
 M src/core/agents/helpers.ts
 M src/core/agents/types.ts
 M src/core/conversations/Conversation.ts
 M src/core/helpers.ts
 M src/core/ledgers/Gauge.ts
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/helpers.ts
 M src/core/ledgers/types.ts
 M src/core/providers/AgentProvider.ts
 M src/core/providers/RelayStream.ts
 M src/core/providers/types.ts
 M src/core/types.ts
 M tests/guides.test.ts
 M tests/setup.test.ts
 M tests/setup.ts
 M tests/src/core/agents/Agent.test.ts
 M tests/src/core/agents/helpers.test.ts
 M tests/src/core/conversations/Conversation.test.ts
 M tests/src/core/helpers.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
 M tests/src/core/ledgers/helpers.test.ts
 M tests/src/core/providers/RelayStream.test.ts
```