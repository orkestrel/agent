Implemented the code rulings; only owned files changed.

1. Claim 2: lifetime fingerprint set, including judge model — [Classifier.ts:37](/home/user/agent-port/src/core/ledgers/Classifier.ts:37), [Classifier.ts:331](/home/user/agent-port/src/core/ledgers/Classifier.ts:331).
2. Claim 3/O4: shared ID-based pairing with wholly idless positional fallback — [helpers.ts:33](/home/user/agent-port/src/core/ledgers/helpers.ts:33); consumers at [Ledger.ts:447](/home/user/agent-port/src/core/ledgers/Ledger.ts:447), [Ledger.ts:848](/home/user/agent-port/src/core/ledgers/Ledger.ts:848), [Ledger.ts:895](/home/user/agent-port/src/core/ledgers/Ledger.ts:895).
3. Claim 4: tail pricing reserves the larger possible stub — [Ledger.ts:897](/home/user/agent-port/src/core/ledgers/Ledger.ts:897).
4. Claim 5: active request ownership guard and rejected-selection isolation — [Ledger.ts:556](/home/user/agent-port/src/core/ledgers/Ledger.ts:556), [Ledger.ts:218](/home/user/agent-port/src/core/ledgers/Ledger.ts:218).
5. O3: documented `LedgerError` code `'REQUEST'` — [types.ts:657](/home/user/agent-port/src/core/ledgers/types.ts:657), [errors.ts:13](/home/user/agent-port/src/core/ledgers/errors.ts:13).
6. Claim 8: calibration applies replay at the upcoming user boundary — [Ledger.ts:283](/home/user/agent-port/src/core/ledgers/Ledger.ts:283).
7. Claim 10a: `LedgerPlanningGroup` literal union and documented tie-break order — [types.ts:652](/home/user/agent-port/src/core/ledgers/types.ts:652), [helpers.ts:53](/home/user/agent-port/src/core/ledgers/helpers.ts:53).
8. Claim 10b/O1: corrected “entries” and pronoun-prefix TSDoc — [helpers.ts:545](/home/user/agent-port/src/core/ledgers/helpers.ts:545), [helpers.ts:359](/home/user/agent-port/src/core/ledgers/helpers.ts:359), [types.ts:372](/home/user/agent-port/src/core/ledgers/types.ts:372).

The failing-first command against unchanged `6981e2d` source exited **1: 8 failed**. The same command after implementation exited **0: 8 passed**:

```text
npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Classifier.test.ts tests/src/core/ledgers/Ledger.test.ts tests/src/core/ledgers/helpers.test.ts -t 'alternates|reordered|400-character|next user boundary|direct run during|wholly idless'
```

| New test | Failure on `6981e2d` |
|---|---|
| keeps held fingerprints when the judge model alternates A B A | 3 asks; expected 2 |
| keeps reordered seed results paired with their retained lookup calls | Result `c1`; expected `c2` |
| files reordered lookup text under its own owner and names its own call in each stub | Brightwater received Lighthouse’s $30 text |
| prices the final hidden stub before accepting a seed tail with a 400-character argument | 341 units exceeded 264.1509433962264 |
| calibrates turn and all replay at the next user boundary | Calibration retained `PRIVATE`; request dropped it |
| faults a direct run during calibration without judging or replacing the active selection | No `LedgerError` |
| faults a direct run during first pass without judging or replacing the active selection | No `LedgerError` |
| pairs by call id and falls back to position only for a wholly idless group | Helper absent |

Gate results:

| Gate | Exit | Result |
|---|---:|---|
| `npx tsc --noEmit --project tsconfig.json` | 0 | Earlier test typing error corrected |
| `npm run check:src:core` | 0 | Passed |
| Touched test files | 0 | 161 passed |
| `npm run test:src:core` | 0 | 1,247 passed |
| `npm run lint:check` | 0 | Earlier conditional assertions corrected |
| `npm run format:check` | 0 | Passed |
| `npm run test:policy` | 0 | 119 passed, 1 skipped |
| `npm run test:guides` | 1 | 108 passed; failures listed below |
| Offline measured replay | 0 | 108 checks passed across 8 runs; **0 unlisted bodies** |
| Discovery script, `--projects src:core` | 2 | Sandbox `spawnSync /opt/node22/bin/node EPERM` |
| `git diff --check` | 0 | Passed |

Guide failures were left unchanged as instructed:

| Failed guide test | Test line | Guide line / cause |
|---|---|---|
| documents every barrel export | `tests/guides.test.ts:260` | `guides/agent.md:1226,1316`: missing `LedgerPlanningGroup`, `resolveLedgerCall` |
| keeps every compared summary and example equal to its source | `tests/guides.test.ts:281` | `guides/agent.md:1253,1295,1335`: `LedgerLine`, `LedgerError`, `cutListing` summaries |
| resolves the judgments fence’s question once over a started listener and reuses the record | `tests/guides.test.ts:558` | `guides/agent.md:405`; sandbox-only listener `EPERM` |
| drops only the decisive no through the stock selection fence over a started listener | `tests/guides.test.ts:624` | `guides/agent.md:451`; sandbox-only listener `EPERM` |
| reads the select receipt beside the active mode’s description as the judge pattern fence claims | `tests/guides.test.ts:1161` | `guides/agent.md:2378`; sandbox-only listener `EPERM` |
| round trips both relay fence halves over a started listener and refuses what the route declines | `tests/guides.test.ts:2956` | `guides/agent.md:1938,1968`; sandbox-only listener `EPERM` |
| cancels the upstream turn when the relay reader goes away with the first pull pending | `tests/guides.test.ts:3029` | `guides/agent.md:1966`; sandbox-only listener `EPERM` |
| asks the System One fence’s three questions over a started listener and reads the published measures | `tests/guides.test.ts:3219` | `guides/agent.md:1832`; sandbox-only listener `EPERM` |

`git diff --stat`: 8 owned files, 325 insertions, 28 deletions. `git status --porcelain`:

```text
 M src/core/ledgers/Classifier.ts
 M src/core/ledgers/Ledger.ts
 M src/core/ledgers/errors.ts
 M src/core/ledgers/helpers.ts
 M src/core/ledgers/types.ts
 M tests/src/core/ledgers/Classifier.test.ts
 M tests/src/core/ledgers/Ledger.test.ts
 M tests/src/core/ledgers/helpers.test.ts
```