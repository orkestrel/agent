Implemented the contracts; the diff contains only owned files.

1. Pairing: unmatched calls leave the tail at [Ledger.ts:851](/home/user/agent-port/src/core/ledgers/Ledger.ts:851); repeated ids pair positionally at [helpers.ts:41](/home/user/agent-port/src/core/ledgers/helpers.ts:41).
2. Concurrent runs: limit documented at [agent.md:543](/home/user/agent-port/guides/agent.md:543), TSDoc narrowed at [types.ts:314](/home/user/agent-port/src/core/ledgers/types.ts:314), and post-`await pending` gauge assertion at [Ledger.test.ts:299](/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:299).
3. Guide gates: executed cases and sentence guards at [guides.test.ts:1985](/home/user/agent-port/tests/guides.test.ts:1985) and [guides.test.ts:2037](/home/user/agent-port/tests/guides.test.ts:2037).
4. Measured wording: removed requested claims and series citations at [constants.ts:37](/home/user/agent-port/src/core/ledgers/constants.ts:37); corresponding guide rows updated at [agent.md:1283](/home/user/agent-port/guides/agent.md:1283).
5. `'REQUEST'` documentation: prescribed wording at [types.ts:658](/home/user/agent-port/src/core/ledgers/types.ts:658).
6. Restated claims: next-user-boundary policy and whole-view calibration pricing stated at [agent.md:634](/home/user/agent-port/guides/agent.md:634); calibration and pricing code unchanged.

Test-first results against `c5dbac9`:

| New test name | Baseline result |
|---|---|
| sends no unmatched call and reads each result under its own arguments for a mixed id-and-idless group | Failed: unmatched call retained |
| sends no unmatched call and reads each result under its own arguments for a repeated-id group | Failed: result missing |
| pairs repeated call ids by position under their own arguments | Failed: second result received first arguments |
| faults a direct run during calibration after the answer pass rejected, as calibration admits no run | Passed; removing the request reset failed with missing `'REQUEST'` |
| fits a short-id lookup at the tail boundary when its shown stub is longer, as the plan claims | Passed; hidden-only pricing failed: `60 > 59.25` |

The pairing baseline command exited **1**, with **3 failures**:

```text
npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Ledger.test.ts tests/src/core/ledgers/helpers.test.ts -t 'mixed id-and-idless|repeated-id|pairs repeated|faults a direct run during'
```

The guide cases already held at `c5dbac9`, so they have no unchanged-source failure to report. Each specified mutation exited **1**; restored cases passed. Pairing mutations and the concurrent-accounting mutation also failed their targeted assertions. All mutations were restored.

Gate results:

| Gate | Exit | Result |
|---|---:|---|
| `npx tsc --noEmit --project tsconfig.json` | 0 | Passed |
| `npm run check:src:core` | 0 | Passed |
| `npm run test:src:core` | 0 | 1,250 passed |
| `npm run lint:check` | 0 | Passed after assertion corrections |
| `npm run format:check` | 0 | Passed |
| `npm run test:policy` | 0 | 119 passed, 1 skipped |
| `npm run test:guides` | 1 | 114 passed; only sandbox listener failures |
| Offline recorded replay | 0 | 108 checks; 8 runs; **0 unlisted bodies** |
| Scoped discovery script | 2 | Sandbox `spawnSync /opt/node22/bin/node EPERM` |
| `git diff --check` | 0 | Passed |
| `git diff --stat` | 0 | Only owned files |

Each guide failure was sandbox-only: `listen EPERM: operation not permitted 127.0.0.1`:

- resolves the judgments fence’s question once over a started listener and reuses the record
- drops only the decisive no through the stock selection fence over a started listener
- reads the select receipt beside the active mode’s description as the judge pattern fence claims
- round trips both relay fence halves over a started listener and refuses what the route declines
- cancels the upstream turn when the relay reader goes away with the first pull pending
- asks the System One fence’s three questions over a started listener and reads the published measures

`git status --porcelain`:

```text
 M guides/agent.md
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/constants.ts
 M src/core/ledgers/helpers.ts
 M src/core/ledgers/types.ts
 M tests/guides.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
 M tests/src/core/ledgers/helpers.test.ts
```