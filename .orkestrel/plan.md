# Refuse-by-default fleet campaign plan

## Goal and exit criterion

Make `@orkestrel/agent`, its related packages, and the `reason` family refuse what they cannot read, with `@orkestrel/contract` and JSON Schema as the shared boundary, so that missing or malformed input never settles as a value.

- The user, 2026-11-03: "it feels like the default wasn't already to refuse or error out on stuff especially when it's something missing". "the contract package is literally the backbone of all orkestrel packages, you are supposed to use it and apply it rigorously throughout these packages". "address all the issues you find". "don't worry about bumps right now, just worry about making the corrections in the packages and then pointing the dependents to the latest built local path of the dependency".
- Exit: every row of `failopen.md` and every section of `semantics.md` landed or ruled out; one `orkestrel-falsify` round closed on the integrated result; `verifier` read the tree-wide gates on each package's final commit; the user published the layers in order with `test:distribution` read at each.
- Out of this campaign: moving the door and fault text into `@orkestrel/contract`, unbounded refusal text in `@orkestrel/workspace`, `@orkestrel/database`, and `@orkestrel/relation`, `@orkestrel/mcp` losing the blocks of a result with only non-text content (needs a contract decision), and every package outside the table below.

## Repositories

Layer order, lowest first. A dependent reads a lower layer's local build until the user publishes it. No `version` field moves before publication.

| Layer | Package | URL | Work |
| --- | --- | --- | --- |
| 0 | `@orkestrel/contract` | https://github.com/orkestrel/contract | a field's default, strict conversion, lenient soundness, build cost, discriminated union faults, fault guards, lossless repair |
| 1 | `@orkestrel/ndjson` | https://github.com/orkestrel/ndjson | strict by default |
| 2 | `@orkestrel/reason` | https://github.com/orkestrel/reason | three states, one settle loop, the subject door |
| 2 | `@orkestrel/tool` | https://github.com/orkestrel/tool | the argument door, enforced `parameters`, a bare tool takes nothing |
| 3 | `@orkestrel/qualifier`, `@orkestrel/rater`, `@orkestrel/interpret` | https://github.com/orkestrel | states, doors, shapes and contracts; `interpret` fills nothing by position or by distance and gains an exact number reader |
| 4 | `@orkestrel/program`, `@orkestrel/brief` | https://github.com/orkestrel | states, doors, shapes and contracts |
| 4 | `@orkestrel/workflow`, `@orkestrel/mcp` | https://github.com/orkestrel | definition, snapshot, and patch doors; listing and result refusals |
| 5 | `@orkestrel/agent` | https://github.com/orkestrel/agent | authority required for tools, strict streams, the provider door, store refusals, the approved-instance dispatch |
| 6 | `@orkestrel/ollama`, `@orkestrel/toolbox` | https://github.com/orkestrel | `truncate` off, wire refusals, option shapes; tool doors, bridge token |
| 7 | `@orkestrel/study` | https://github.com/orkestrel/study | the visit: keyed replay, the labeling pool, filled contracts, `-ing` members, refusals |
| 8 | `@orkestrel/learn` | none; local | the model, after the family |

## State

| Item | Status | Evidence |
| --- | --- | --- |
| Rulings on semantics and fail-open rows | done 2026-11-04, each reopenable by the user | `semantics.md`, `failopen.md` |
| Writers, each package above through layer 7 except `program` and `brief` | landed locally, open rows in § Sequence | `ledger.md`; each package's commits |
| Independent review by an engine that did not write the work | `contract`, `reason`, `ndjson`, `tool`, `workflow`, `agent`, `ollama`, `toolbox`, `study` read; `mcp`, `qualifier`, `rater`, `interpret`, `program`, `brief` open | `ledger.md` |
| Live proofs on the dedicated daemon | `ollama` at `9ef095b` and `4109f7e`, 14 files, 82 passed | `ledger.md` |
| Deviations from `.agents/orchestration.md`, all before the user's realignment of 2026-11-04 | writers committed and installed, where § Permission floor reserves both; fix rounds went by message, where § Sessions and consultation asks for a brief file; writers read their own gates; scripts written in bash, which `AGENTS.md` forbids | corrected in § Sequence |
| Next action | close the open rows, then the falsify round, then `verifier` | § Sequence |

## Sequence

Each unit's role runs on the Codex column of `.agents/orchestration.md` § Roles by the user's word of 2026-11-04, unless the ledger row names why not. The Orchestrator commits by explicit paths and runs each install. A writer leaves its work uncommitted and reports its paths.

| Step | Units | Done when |
| --- | --- | --- |
| Open rows | `contract`'s build cost, discriminated union faults, fault guards, and lossless repair; then `tool`, `workflow`, `reason`, and `ollama` taking them; `toolbox`'s union tools; `agent`'s approved-instance dispatch and its Study half | each row's failing test and mutation probe recorded |
| Family | `program`, then `brief` | the same, with one independent review |
| Independent reviews | `mcp`; `qualifier`, `rater`, `interpret`; `program`, `brief` | each finding fixed, deferred, or ruled out |
| Falsify | one round over the integrated result, numbered claims, the objective lane | an all-confirmed round, or a stop stated per `orkestrel-falsify` § End the depth search |
| Verify | `verifier`, each package in layer order, once | exits read bare |
| Publish | the user, in layer order, re-pinning at each; `test:distribution` at each; a new replay lineage screened first | registry serves each layer |
