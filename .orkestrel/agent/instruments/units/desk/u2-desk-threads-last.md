Implemented U2. Focused tests pass; full gates retain the out-of-scope failures listed below.

- `ThreadInterface` — [types.ts:72](/home/user/desk/app/server/types.ts:72)
- `ThreadTurn` — [types.ts:86](/home/user/desk/app/server/types.ts:86)
- `ThreadContext` — [types.ts:92](/home/user/desk/app/server/types.ts:92)
- Measured windows — [constants.ts:92](/home/user/desk/app/server/constants.ts:92)
- `COMPACTION_SETTINGS` — [constants.ts:102](/home/user/desk/app/server/constants.ts:102)
- `DESK_TOPICS` — [constants.ts:105](/home/user/desk/app/server/constants.ts:105)
- `LEDGER_THRESHOLDS` — [constants.ts:129](/home/user/desk/app/server/constants.ts:129)
- Resident-thread bound, `MAX_THREADS` — [constants.ts:138](/home/user/desk/app/server/constants.ts:138)
- `resolveCall`, all twelve combinations — [helpers.ts:77](/home/user/desk/app/server/helpers.ts:77)
- `RecordsThread`, receipts and gauge — [RecordsThread.ts:14](/home/user/desk/app/server/RecordsThread.ts:14)
- `AgentThread`, answer passes and folds — [AgentThread.ts:17](/home/user/desk/app/server/AgentThread.ts:17)
- `createRecordsThread` — [factories.ts:52](/home/user/desk/app/server/factories.ts:52)
- `createViewThread` — [factories.ts:74](/home/user/desk/app/server/factories.ts:74)
- `createCompactionThread` — [factories.ts:87](/home/user/desk/app/server/factories.ts:87)

Failing runs, both against unchanged implementation:

```text
R1: PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:server -- tests/app/server/helpers.test.ts tests/app/server/AgentThread.test.ts tests/app/server/RecordsThread.test.ts --reporter=verbose
Exit 1: 18 failed, 3 passed.

R2: PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:server -- tests/app/server/helpers.test.ts -t 'refuses an unknown thread model'
Exit 1: 1 failed, 14 filtered out.
```

Each added test and its failing run:

| Test name | Failing run |
|---|---|
| `resolves 'records' 'qwen3.5:2b-q4_K_M' thinking=false` | R1 |
| `resolves 'records' 'qwen3.5:4b-q4_K_M' thinking=false` | R1 |
| `resolves 'records' 'qwen3.5:2b-q4_K_M' thinking=true` | R1 |
| `resolves 'records' 'qwen3.5:4b-q4_K_M' thinking=true` | R1 |
| `resolves 'view' 'qwen3.5:2b-q4_K_M' thinking=false` | R1 |
| `resolves 'view' 'qwen3.5:4b-q4_K_M' thinking=false` | R1 |
| `resolves 'view' 'qwen3.5:2b-q4_K_M' thinking=true` | R1 |
| `resolves 'view' 'qwen3.5:4b-q4_K_M' thinking=true` | R1 |
| `resolves 'compaction' 'qwen3.5:2b-q4_K_M' thinking=false` | R1 |
| `resolves 'compaction' 'qwen3.5:4b-q4_K_M' thinking=false` | R1 |
| `resolves 'compaction' 'qwen3.5:2b-q4_K_M' thinking=true` | R1 |
| `resolves 'compaction' 'qwen3.5:4b-q4_K_M' thinking=true` | R1 |
| `refuses an unknown thread model` | R2 |
| `answers an empty thinking pass with the cue and never replays thinking on the next full-view turn` | R1 |
| `reports compaction and merged section summaries with an uncapped thinking-off summarizer` | R1 |
| `guards an active full-view turn and skips the answer pass after caller cancellation` | R1 |
| `releases a full-view thread after a provider failure and omits the thinking-off cap` | R1 |
| `sends the records window on its first request and reports briefing, filing, and every recall result` | R1 |
| `calibrates without a supplied gauge and turns thinking off for the records answer pass` | R1 |

Consumer errors outside owned files, left unchanged:

- `tests/app/server/index.test.ts:5:36`: export assertion omits `createCompactionThread`, `createRecordsThread`, `createThreadProvider`, and `createViewThread`.
- `app/vue/App.vue:68:16`: TS2554, `openBoard` expects two arguments.
- `tests/app/vue/helpers.test.ts`: the same TS2554 at `99:17`, `127:17`, `156:17`, `166:17`, `193:17`, `217:17`, `234:17`, `255:17`, `287:4`, `294:20`, `320:17`, `371:30`, `404:17`, `442:4`, `460:21`, `464:17`, `550:30`, and `573:17`.
- `tests/app/server/ApplicationServerRunner.test.ts`, “serves health and the page, rejects a bad turn, and releases the port”: sandbox-only `listen EPERM` on `127.0.0.1`.

Final gate results:

| Gate | Exit | Result |
|---|---:|---|
| Focused server tests | 0 | 21 passed |
| `PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:server` | 1 | 34 passed; sandbox listener and export assertion failed |
| `PATH=/home/user/desk-npm11/bin:$PATH npm run check:app:server` | 0 | Passed |
| `PATH=/home/user/desk-npm11/bin:$PATH npm run check` | 2 | Only the listed Vue consumer errors |
| Scoped Oxlint | 0 | Passed |
| Scoped Oxfmt check | 0 | Passed |
| `git diff --check` | 0 | Passed |
| Discovery script, `--projects app:server` | 2 | `spawnSync /opt/node22/bin/node EPERM`; Vitest listing blocked |

`git status --porcelain`:

```text
 M app/server/constants.ts
 M app/server/factories.ts
 M app/server/helpers.ts
 M app/server/types.ts
 M tests/app/server/helpers.test.ts
?? app/server/AgentThread.ts
?? app/server/RecordsThread.ts
?? tests/app/server/AgentThread.test.ts
?? tests/app/server/RecordsThread.test.ts
?? tests/app/server/setupThreads.ts
```