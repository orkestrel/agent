| Finding | Fix | Test |
|---|---|---|
| 1 | [Ledger.ts:1030](/home/user/agent-port/src/core/ledgers/Ledger.ts:1030) | [Ledger.test.ts:974](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:974) |
| 2 | [Ledger.ts:712](/home/user/agent-port/src/core/ledgers/Ledger.ts:712), [739](/home/user/agent-port/src/core/ledgers/Ledger.ts:739) | [Ledger.test.ts:974](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:974) |
| 3 | [Ledger.ts:787](/home/user/agent-port/src/core/ledgers/Ledger.ts:787) | [Ledger.test.ts:94](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:94) |
| 4 | [Ledger.ts:882](/home/user/agent-port/src/core/ledgers/Ledger.ts:882) | [Ledger.test.ts:109](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:109) |
| 5 | [Ledger.ts:850](/home/user/agent-port/src/core/ledgers/Ledger.ts:850), [872](/home/user/agent-port/src/core/ledgers/Ledger.ts:872) | [Ledger.test.ts:109](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:109) |
| 6 | [Ledger.ts:864](/home/user/agent-port/src/core/ledgers/Ledger.ts:864) | [Ledger.test.ts:1108](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:1108) |
| 7 | [Ledger.ts:965](/home/user/agent-port/src/core/ledgers/Ledger.ts:965) | [Ledger.test.ts:660](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:660) |
| 8 | [Ledger.ts:964](/home/user/agent-port/src/core/ledgers/Ledger.ts:964) | [Ledger.test.ts:660](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:660) |
| 9 | [types.ts:296](/home/user/agent-port/src/core/ledgers/types.ts:296), [Ledger.ts:295](/home/user/agent-port/src/core/ledgers/Ledger.ts:295) | [Ledger.test.ts:399](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:399) |
| 10 | [types.ts:318](/home/user/agent-port/src/core/ledgers/types.ts:318), [615](/home/user/agent-port/src/core/ledgers/types.ts:615) | [Ledger.test.ts:316](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:316), [399](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:399) |
| 11 | [Ledger.ts:102](/home/user/agent-port/src/core/ledgers/Ledger.ts:102), [249](/home/user/agent-port/src/core/ledgers/Ledger.ts:249), [types.ts:319](/home/user/agent-port/src/core/ledgers/types.ts:319) | [Ledger.test.ts:325](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:325), [417](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:417) |
| 12 | [types.ts:472](/home/user/agent-port/src/core/ledgers/types.ts:472), [Classifier.ts:50](/home/user/agent-port/src/core/ledgers/Classifier.ts:50) | [Classifier.test.ts:364](/home/user/agent-port/tests/src/core/ledgers/Classifier.test.ts:364), [423](/home/user/agent-port/tests/src/core/ledgers/Classifier.test.ts:423) |
| 13 | [Ledger.ts:335](/home/user/agent-port/src/core/ledgers/Ledger.ts:335) | [Ledger.test.ts:358](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:358) |
| 14 | [Classifier.ts:347](/home/user/agent-port/src/core/ledgers/Classifier.ts:347) | [Classifier.test.ts:444](/home/user/agent-port/tests/src/core/ledgers/Classifier.test.ts:444) |
| 15 | [Ledger.ts:251](/home/user/agent-port/src/core/ledgers/Ledger.ts:251) | [Ledger.test.ts:331](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:331) |

Final gate exit codes:

| Gate | Exit |
|---|---:|
| `npx tsc --noEmit --project tsconfig.json` | 0 |
| `npm run check:src:core` | 0 |
| `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers` | 0 |
| `npm run test:src:core` | 0 |
| `npm run lint:check` | 0 |
| `npm run format:check` | 0 |
| `npm run test:policy` | 0 |

Additional discovery audit: exit 2 — `spawnSync /opt/node22/bin/node EPERM`; `vitest list failed`.

`git status --porcelain`:

```text
 M src/core/ledgers/Classifier.ts
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/types.ts
 M tests/src/core/ledgers/Classifier.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
```