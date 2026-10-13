- Contract 1: Boolean first-pass option at [types.ts:266](/home/user/agent-port/src/core/ledgers/types.ts:266); test [Ledger.test.ts:184](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:184).
- Contract 2: Answer pass forwards `false` at [Ledger.ts:365](/home/user/agent-port/src/core/ledgers/Ledger.ts:365), rationale at [types.ts:260](/home/user/agent-port/src/core/ledgers/types.ts:260); test [Ledger.test.ts:184](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:184).
- Contract 3: Recorder coverage for `true`, `false`, and omission at [Ledger.test.ts:184](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:184) and [guides.test.ts:1542](/home/user/agent-port/tests/guides.test.ts:1542).
- Contract 4: Guide updated at [agent.md:524](/home/user/agent-port/guides/agent.md:524) and [agent.md:1244](/home/user/agent-port/guides/agent.md:1244); tests [guides.test.ts:279](/home/user/agent-port/tests/guides.test.ts:279) and [guides.test.ts:1542](/home/user/agent-port/tests/guides.test.ts:1542).

Final gate results:

| Gate | Exit |
|---|---:|
| `npx tsc --noEmit --project tsconfig.json` | 0 |
| `npm run check:src:core` | 0 |
| Ledger test file — 47 passed | 0 |
| `npm run test:src:core` — 1,224 passed | 0 |
| `npm run test:guides` — 95 passed, 6 sandbox-only `listen EPERM` failures | 1 |
| `npm run lint:check` | 0 |
| `npm run format:check` | 0 |
| `npm run test:policy` | 0 |
| Scoped discovery — `spawnSync EPERM` | 2 |
| `git diff --check` | 0 |
| Brief’s exact grep | 0 |

The exact grep prints unrelated `<think>answer` and `<think>first` fixtures because `.` matches any character. Those files are off-limits. Searching with literal dots exits 1 with no matches.

`git status --porcelain`:

```text
 M guides/agent.md
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/types.ts
 M tests/guides.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
```