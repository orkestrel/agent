Completed all rulings:

- F1: Default-budget and pass-options test — [Ledger.test.ts:198](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:198).
- F2: Thinking departures and live-series requirement — [records-port-plan.md:49](/home/user/agent-port/tmp/units/records-port-plan.md:49).
- F3: Observable captured-policy checks — [Ledger.test.ts:102](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:102), [RelayStream.test.ts:23](/home/user/agent-port/tests/src/core/providers/RelayStream.test.ts:23).
- F4: Populated briefing survives discarded thinking — [Ledger.test.ts:273](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:273).
- F5: Narrowed prose and executed ledger assertion — [agent.md:624](/home/user/agent-port/guides/agent.md:624), [guides.test.ts:1991](/home/user/agent-port/tests/guides.test.ts:1991).

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
| Touched-file Vitest run | 0 |
| `git diff --stat -- src` | 0; empty |

Guides: 96 passed; six failures solely from sandbox listeners (`listen EPERM 127.0.0.1`). F4’s in-memory cap mutation produced exactly one expected failure, exit 1; unchanged source passes.

`git status --porcelain`:

```text
 M guides/agent.md
 M tests/guides.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
 M tests/src/core/providers/RelayStream.test.ts
```