Contracts implemented; all required gates exited 0.

| Contract | Fix | Test |
|---|---|---|
| 1 | `types.ts:269,581`; `Gauge.ts:45`; `Ledger.ts:105` | `Gauge.test.ts:21`; `Ledger.test.ts:54` |
| 2 | `types.ts:582`; `Ledger.ts:146,295` | `Ledger.test.ts:189` |
| 3 | `helpers.ts:37`; `Ledger.ts:973` | `helpers.test.ts:39`; `Ledger.test.ts:150,220` |
| 4 | `Ledger.ts:584` | `Ledger.test.ts:76` |
| 5 | `Gauge.ts:96` | `Gauge.test.ts:171` |
| 6 | `Gauge.ts:140` | `Gauge.test.ts:215` |
| 7 | `Gauge.ts:125` | `Gauge.test.ts:264` |
| 8 | `Ledger.ts:1020` | `Ledger.test.ts:189,245` |
| 9 | `Ledger.ts:595,748,923,964` | `Ledger.test.ts:121` |
| 10 | `types.ts:240`; `Ledger.ts:393` | `Ledger.test.ts:99` |
| 11 | `types.ts:256,550,568,607`; `Gauge.ts:13` | `Gauge.test.ts:264`; lint gate |

Source paths: `src/core/ledgers/`. Test paths: `tests/src/core/ledgers/`.

| Gate | Exit |
|---|---:|
| `npx tsc --noEmit --project tsconfig.json` | 0 |
| `npm run check:src:core` | 0 |
| Focused ledger tests — 153 passed | 0 |
| `npm run test:src:core` — 1,215 passed | 0 |
| `npm run lint:check` | 0 |
| `npm run format:check` | 0 |
| `npm run test:policy` — 119 passed, 1 skipped | 0 |
| Scoped discovery — `spawnSync /opt/node22/bin/node EPERM` | 2 |
| `git diff --check` | 0 |
| Off-limits patch applicability check | 0 |

`git status --porcelain`:

```text
 M src/core/ledgers/Gauge.ts
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/helpers.ts
 M src/core/ledgers/types.ts
 M tests/src/core/ledgers/Gauge.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
 M tests/src/core/ledgers/helpers.test.ts
```

Off-limits change: [exact guide patch](/home/user/agent-port/tmp/units/t3-thinking-budget-off-limits.patch), prepared but unapplied.