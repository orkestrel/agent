1. Replay getter and inheritance: `src/core/providers/AgentProvider.ts:109`, `src/core/providers/RelayProvider.ts:59`; tests: `tests/src/core/providers/AgentProvider.test.ts:26`, `tests/src/core/providers/RelayProvider.test.ts:26`.
2. Stored thinking: `src/core/agents/Agent.ts:537,579`; tests: `tests/src/core/agents/Agent.test.ts:141,172`.
3. Provider filtering: `src/core/agents/Agent.ts:830`; tests: `tests/src/core/agents/Agent.test.ts:172,230`.
4. Compaction estimate: `src/core/agents/Agent.ts:655`; test: `tests/src/core/agents/Agent.test.ts:289`.
5. Relay filtering: `src/core/providers/RelayStream.ts:41`; test: `tests/src/core/providers/RelayStream.test.ts:22`.
6. Documentation: `src/core/agents/Agent.ts:55,610,815`, `src/core/providers/AgentProvider.ts:32`; behavioral tests: `tests/src/core/agents/Agent.test.ts:172,289`.

Gate results:

| Gate | Exit |
|---|---:|
| `npx tsc --noEmit --project tsconfig.json` | 0 |
| `npm run check:src:core` | 0 |
| `npm run test:src:core` — 1,200 passed | 0 |
| `npm run lint:check` | 0 |
| `npm run format:check` | 0 |
| `npm run test:policy` — 119 passed, 1 skipped | 0 |

`git status --porcelain`:

```text
 M src/core/agents/Agent.ts
 M src/core/providers/AgentProvider.ts
 M src/core/providers/RelayProvider.ts
 M src/core/providers/RelayStream.ts
 M tests/src/core/agents/Agent.test.ts
 M tests/src/core/providers/AgentProvider.test.ts
 M tests/src/core/providers/RelayProvider.test.ts
 M tests/src/core/providers/RelayStream.test.ts
```

Off-limits guide correction: [exact unapplied patch](/home/user/agent-port/tmp/units/t2-thinking-replay-guide.patch).