All 13 differences are cut effects; no candidate-selection or Gauge formula defect reproduced. Source remains unchanged. [The report](/home/user/agent-port/tmp/units/f2-recall-residue-rooms.json) records both rooms, every item’s estimate, both cuts, and the differing replay inputs.

| Body | Cause and ruling |
|---|---|
| v1 g04 c2 | Cut: recorded 8 items, port 9; retain under T1. |
| v1 g04 c3 | Answer note inherits that cut; retain under T1. |
| v3 g04 c2 | Cut: recorded 8, port 9; retain under T1. |
| v3 g04 c3 | Answer note inherits that cut; retain under T1. |
| v6 g04 c2 | Cut: recorded 8, port 9; retain under T1. |
| v6 g04 c3 | Answer note inherits that cut; retain under T1. |
| v7 g04 c2 | Cut: recorded 8, port 9; retain under T1. |
| v7 g04 c3 | Answer note inherits that cut; retain under T1. |
| v7 g07 c1 | Larger g04 note causes cut: recorded 2, port 1; retain under T1. |
| v7 g07 c2 | Inherits c1; escalations cut keeps 7 versus 8; retain under T1. |
| v7 g07 c3 | Answer note inherits preceding cuts; retain under T1. |
| v8 g04 c2 | Cut: recorded 8, port 9; T1 plus replay repricing of admitted text differences. |
| v8 g04 c3 | Answer note inherits that cut; same ruling. |

Gauge agrees with the harness on identical inputs. The shipment recall selects the same candidates; the approval-code text is inside the earlier answer note.

New tests and failing runs on `7f346b5`: none; no repair was required.

| Gate | Exit |
|---|---:|
| `npx tsc --noEmit --project tsconfig.json` | 0 |
| `npm run check:src:core` | 0 |
| `npm run test:src:core` | 0 |
| `npm run lint:check` | 0 |
| `npm run format:check` | 0 |
| `npm run test:policy` | 0 |
| `npm run test:guides` | 1 |

Guide failures: six sandbox-only `listen EPERM` failures on `127.0.0.1`; 100 tests passed. No guide lines were contradicted.

`git diff --stat`: empty.  
`git status --porcelain`: empty. The report is gitignored.