# Refuse-by-default fleet campaign plan

## Goal and exit criterion

Make `@orkestrel/agent`, its related packages, and the `reason` family refuse what they cannot read, with `@orkestrel/contract` and JSON Schema as the shared boundary, so that missing or malformed input never settles as a value.

- The user, 2026-11-03: "it feels like the default wasn't already to refuse or error out on stuff especially when it's something missing". "the contract package is literally the backbone of all orkestrel packages, you are supposed to use it and apply it rigorously throughout these packages". "address all the issues you find". "don't worry about bumps right now, just worry about making the corrections in the packages and then pointing the dependents to the latest built local path of the dependency".
- The user, 2026-11-04, on what follows the hardening: "once we have fully hardened contract and the other packages, we should proceed with the debrief". This replaces the earlier order, which put the debrief after `learn`.
- Exit: every row of `failopen.md` and every section of `semantics.md` landed or ruled out; one `orkestrel-falsify` round closed on the integrated result; `verifier` read the tree-wide gates on each package's final commit; the user published the layers in order with `test:distribution` read at each.
- The user, 2026-11-04: "Make sure to take care of the contract issues, don't defer it, work on it in parallel, especially since contract is so important to the ecosystem, we need it to be a tight and hardened as possible, and since it is required in all packages, it's best to get done as soon as possible so it goes into the same version bump." So these join the campaign: a nested `shape` that `is` refuses, the door and fault text in `@orkestrel/contract` subject to one `analyst` pass, and `rawShape` refusals naming a real path.
- Out of this campaign: unbounded refusal text in `@orkestrel/workspace`, `@orkestrel/database`, and `@orkestrel/relation`, `@orkestrel/mcp` losing the blocks of a result with only non-text content (needs a contract decision), and every package outside the table below.

## What this wave serves

The user, 2026-11-04: "I need a solid plan and goals. We're doing a lot of work and I appreciate the hardening of these packages but I feel like we need some direction here, we're doing a lot at once but I don't feel like we are getting anywhere with the learn package."

The model in `@orkestrel/learn` comes first. This wave exists so that model stands on packages that refuse what they cannot read. The skeleton no longer waits for it: `learn`'s plan holds the model's goal, its four exit bars, and its milestones. No new finding delays the skeleton.

The user, 2026-11-04, on hardening: "Let's continue with the hardening scope". And: "You say it is as if it has no end because once a hole is plugged, then another is open but I think that is a depth vs breadth issue that you need to consider, whether within the package itself or across packages." So the scope stays open, and the wave runs by the rules below.

## How the wave runs

- **Extraction is a safe floor, not a tuning target.** The user, 2026-11-04: "we are getting too into the weeds where we are trying to tune for a perfect model that should come from learning, training, and tuning over time... I care about quality, that is most important above all, we just need to find the right point where we need to be reasonable... what we really need to look at is safely extracting and having proper defaults and security and transparency, since we know we can't account for every scenario but we want to make sure we handle them in a way that we can see where the issue was". A rule about what the reader may do, true of any message, stays in. A rule about what particular English words mean does not. After the links land, `interpret`'s reading takes only a wrong decision reproduced through the whole model that holds for a class of messages; everything else goes on `learn`'s known-limits list with its example message. A refusal says why, in the public result.

- **Breadth first, by class.** One read-only census per class across every package in § Repositories: copies of what an owner publishes, defaults that fill a value, a contract against its guard, and what is unbounded at a door. Each hit is ruled once and fixed at its cause, proved in one consumer before it spreads.
- **Depth only where a run shows a defect.** One independent reviewer per change. A fix round re-audits the repaired claim only. The same class recurring is a design question, never another repair row.
- **Release bar.** A finding outside a row's claims blocks if it returns a wrong result as success, bypasses an authority or a refusal, makes a contract refuse its own valid value, allows a hang or unbounded cost from untrusted input, loses or corrupts stored data, or breaks a consumer at install. In `@orkestrel/contract`, every substantiated finding blocks, by the user's word. Anything else enters § Deferred, which the user can lift.
- **One take-up per package.** `contract`'s additions land first, and each dependent takes them in one pass.
- **Stops.** `contract`: after its corrections, one re-audit of the repaired claims with no new fixture classes ends hand-built review on that seam. A generated test of its three laws read 49,722 pairs with no violation, so on stable values the walkers agree, and it joins the suite as regression coverage. It can't reach accessor read discipline, reentrancy, refusal identity or paths, or capture limits, which stay claims in the integrated falsify round. Anything that round finds blocks. Every other seam: one review, one fix round; a second round needs its stop stated in the brief.
- **The law between a guard and its contract names the representation.** A definition needs `is` to imply the structural guard, with semantic validation after it. A result needs `wire.is(project(result))` on every outcome its producer advertises, refusals included, and raw `guard` implying `is` is not required, so runtime guards keep `NaN` and host values. A foreign value stays open. An owned snapshot passes its contract and survives restoration.
- **The standing check is a table in each package's tests, not a shared engine.** Each pair declares its direction and projection, with a canonical positive case and a negative control, using `contract`'s generator and `@orkestrel/test`'s values and actual producer outputs. A generated value the guard refuses stays visible.
- **Real runs are the deep instrument.** The model's example and its evaluation, `test:studies`, and the live `ollama` project read what reviews miss.

## Repositories

Layer order, lowest first. A dependent reads a lower layer's local build until the user publishes it. No `version` field moves before publication.

| Layer | Package | URL | Work |
| --- | --- | --- | --- |
| 0 | `@orkestrel/contract` | https://github.com/orkestrel/contract | a field's default, strict conversion, lenient soundness, build cost, discriminated union faults, fault guards, lossless repair |
| 1 | `@orkestrel/ndjson` | https://github.com/orkestrel/ndjson | strict by default |
| 2 | `@orkestrel/database` | https://github.com/orkestrel/database | `shapeToColumnStorage` and any other exhaustive switch on `category` take the new `shape` category; `agent`, `toolbox`, and `workflow` declare it |
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
| Writers, each package above through layer 7 except `database` and `brief` | landed locally, open rows in § Sequence | `ledger.md`; each package's commits |
| Independent review by an engine that did not write the work | `contract`, `reason`, `ndjson`, `tool`, `workflow`, `agent`, `ollama`, `toolbox`, `study`, `mcp`, `qualifier`, `rater`, `interpret` read; `program`, `brief` open | `ledger.md` |
| Live proofs on the dedicated daemon | `ollama` at `bf6fbfc`, 16 files, 89 passed, its daemon proof on the dedicated executable; `agent`'s study suite 161 passed | `falsify.md` |
| Acceptance gates on each package's final commit | all sixteen green on format, lint, type check, build, and test: 30,196 passed, 36 skipped | `ledger.md` |
| Deviations from `.agents/orchestration.md`, all before the user's realignment of 2026-11-04 | writers committed and installed, where § Permission floor reserves both; fix rounds went by message, where § Sessions and consultation asks for a brief file; writers read their own gates; scripts written in bash, which `AGENTS.md` forbids | corrected in § Sequence |
| Next action | `interpret` 0.0.21 and `brief` 0.0.16 carry M3's repair. `learn` follows `tmp/learn/extraction/strategy.md`, and its overnight reads are in. The user rules on the sentence-end fixes, ask once, the tied rule, and the bars, per `tmp/learn/morning-report.md`. The wave's close is done but for `scaffold` 0.0.125, which is ready and awaits the user's code | `release.md`; `tmp/learn/rulings-m3.md` Round 13; `learn`'s plan |

## Sequence

Each unit's role runs on the Codex column of `.agents/orchestration.md` § Roles by the user's word of 2026-11-04, unless the ledger row names why not. The Orchestrator commits by explicit paths and runs each install. A writer leaves its work uncommitted and reports its paths.

| Step | Units | Done when |
| --- | --- | --- |
| `contract`, one writer at a time | corrections to a nested `shape` that `is` refuses and to `rawShape`'s paths; a generated test of the three laws; then `admitValue`, `describeFaults`, and `auditFaultShape` with `@orkestrel/tool` as the first consumer | each proved in `tool` before spreading |
| One take-up per package, layer order | `reason`, `qualifier`, `rater`, `interpret`, `program`, `brief`, `workflow`, `toolbox`, `ollama`, `study`, `agent`: `contract`'s additions with no shim, the standing check, and each package's census rows. `agent`: `Conversation` projects a stored call and refuses non-JSON `arguments`, and `isJudgeAnswer` matches its contract. `workflow`: its raw-id lines. `interpret`: roots narrow to records. `program`: `validate` refuses a shape field named `outcome` or `aggregate`, a shape declaring a rule's conclusion key, a ruling token no field fills, and an authority reading a key that isn't there, with one attempt to reach an authority bypass through a shadowing field | failing test and mutation probe per row; gates green |
| `database` | every exhaustive switch on `category` takes `shape`, once `contract` is final; `SQLiteDriver` requires `path`, with `':memory:'` explicit, since an absent path loses data at close; `requireColumns` bounds a table name; a census of the other consumers by type check | failing test and mutation probe recorded |
| Family | `interpret`'s last rows, `program`'s review, then `brief` | the same, with one independent review |
| Independent reviews | `program`, `brief` | each finding fixed, deferred, or ruled out |
| Falsify | one round over the integrated result, numbered claims, the objective lane | an all-confirmed round, or a stop stated per `orkestrel-falsify` § End the depth search |
| Verify | `verifier`, each package in layer order, once | exits read bare |
| Debrief | `orkestrel-debrief` once `contract` and the other packages are hardened, not after `learn`: performance, patterns, and conventions, each with evidence, research, and an example, landed in scaffold's skills and rules as a method per package and scenario. `methods.md` is its input | every finding has a carrier, on the user's go-ahead for scaffold |
| Migration notes for the next `contract` release | ordinary `oneOf` returns its input; `shape` is a new category, so an exhaustive switch on `category` breaks; a cyclic graph too deep says `cycle`; a graph holding a shared container past 262,144 retained edges refuses with `clone`, where it used to pass `cloneShape` or abort; `matchesJSONValue` takes an optional budget; `cloneShape` and `validateShape` agree on which refusal only below the limit; `admitValue`, `describeFaults`, and `auditFaultShape` are new, and `tool`'s `describeFaults` and `scanFaults` go. `interpret`: `proposed` joins `PROVENANCE_CATEGORIES`, a new `undeclared` joins `NUMBER_UNREADABLE_REASONS`, `Extractor.extract().numbers` holds the reader's values, and `ReaderMarks`, `READER_WORDS`, and `READER_SHAPES` lose members. `database`: `SQLiteDriver` requires a non-empty `path`, and a value a column can't hold refuses. `reason`: `faultShape` and `describeFault` go | stated in the release |
| Publish | the user, in layer order, re-pinning at each; `test:distribution` at each; a new replay lineage screened first | registry serves each layer |

## Deferred

Findings below the release bar, each one line with the reason it stays below. The user can lift any.

| Finding | Why below the bar |
| --- | --- |
| `@orkestrel/mcp` loses the blocks of a result with only non-text content | needs a contract decision; a text result is unaffected |
| Unbounded refusal text in `@orkestrel/workspace` and `@orkestrel/relation` | outside § Repositories; `toolbox` caps what it translates |
| `reason`'s cold import reads 36.6 ms against 19.4 ms published, about 17 ms of contracts built at load. Deferring `schema` to first read saved 4.7 ms on a throwaway copy, and was declined | it would replace a plain `schema` value with a getter, so a spread could compile and a compile failure could surface after `createContract`. The rest is builder construction and validation, the safety this wave added |
| On a host with a polluted `Object.prototype`, `contract`'s builders may read an inherited option, so `stringShape()` can gain an inherited `description` | the guide's guarantee is stated with honest intrinsics; a repair reaches every fresh node at the shared builder boundary, and the seam's stop ended it. Refusal text and refusal paths stay exact |
| `admitValue` with a getter changing between `is` and `parse` can publish a value with no repair recorded | the door requires stable reads and says so; a caller holding a foreign object snapshots first, as `Tool.execute` does. JSON can't deliver a getter, and whoever supplies one already controls that value. Flagged to the user, who can lift it |
| `agent.generate({ shema })` ignores an unknown key; `program`'s definition refusal gives no path, and `rating.lines: 'x'` throws a bare `TypeError` | a type check refuses the first, and the others are correct refusals with no remedy; the user can lift either |
| `@orkestrel/mcp` `buildCallOutcome` throws a tool's error text unbounded; `@orkestrel/agent` `Channel.push` and `AgentProvider` success bodies have no size cap | a host chooses its endpoint, the timeout and budget bound it, and `AgentProvider` documents the choice |
