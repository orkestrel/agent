# Refuse-by-default fleet campaign ledger

| Date | Unit | Role | Carrier |
| --- | --- | --- | --- |
| 2026-11-03 | The user's rulings: refuse by default, `contract` as the backbone, no bumps, fix what is found, run the Study visit | user | `plan.md` § Goal and exit criterion |
| 2026-11-03 | Fail-open audits of the related packages | `reviewer` on `opus` and `sonnet` | `failopen.md` |
| 2026-11-03 | Semantics and fail-open rulings, each with one independent refuter | `planner` on Fable; `reviewer` on `opus` | `semantics.md`, `failopen.md` |
| 2026-11-04 | Daemon readings on `truncate`, `shift`, `messages: []`, and token estimates | Orchestrator | `failopen.md` corrections |
| 2026-11-04 | `contract`: default, strict conversion, lenient soundness | `opus` on `opus` | `537b4ba`, `cf742f6`, `8db6206`, `17df726`, `bfd9235`, `e5b3888` |
| 2026-11-04 | `contract` review | `reviewer` on `opus`; `reviewer` on `astra` | fix rows in `contract` |
| 2026-11-04 | `ndjson` and `tool` | `opus` on `opus` | `ndjson` `416ff8e`; `tool` `b78cc54`, `351eaf2`, `f04f9f3`, `e7f76d9`, `a22ce29`, `da116a6`, `c551964` |
| 2026-11-04 | `ndjson` and `tool` review | `reviewer` on `opus`; `reviewer` on `astra` | fix rows in `tool` |
| 2026-11-04 | `workflow` | `opus` on `opus` | `4d80169`, `317f730`, `6e389db`, `c106ece`, `07abe9a`, `63eafdf` |
| 2026-11-04 | `workflow` review | `reviewer` on `sonnet`; `reviewer` on `astra` | fix rows in `workflow` |
| 2026-11-04 | `mcp` | `opus` on `opus` | `7d826d2`, `e44d1d2`, `4aaed7b` |
| 2026-11-04 | `mcp` review | `reviewer` on `sonnet` | fix rows in `mcp`; an independent read is open |
| 2026-11-04 | `agent` | `opus` on `opus` | `agent` commits from `4989cee4` onward |
| 2026-11-04 | `agent` and published 0.0.35 review | `reviewer` on `astra` | `../agent/plan.md` O176 |
| 2026-11-04 | `ollama` | `opus` on `opus` | `43f81ed`, `7c9eba2`, `052bbae`, `7c7340f`, `8bf56af`, `5bc8342`, `9ef095b`, `4109f7e` |
| 2026-11-04 | `toolbox` | `opus` on `opus` | `e93870c`, `c7a6129`, `bdacac9`, `fb215d5`, `8e078c4`, `bec68eb`, `6b30712`, `ee12b81` |
| 2026-11-04 | `ollama` and `toolbox` review | `reviewer` on `astra` | fix rows in each |
| 2026-11-04 | `ollama` live proofs on the dedicated daemon: 14 files, 82 passed at `4109f7e`; the holder's start proves a declared daemon starts | Orchestrator | `failopen.md` corrections |
| 2026-11-04 | `study`, the visit and its fix rounds | `opus` on `opus` | `study` commits from `c6331ad` through `5a8a97d` |
| 2026-11-04 | `study` review | `reviewer` on `opus`; `reviewer` on `astra` | fix rows in `study` |
| 2026-11-04 | `reason`, `qualifier`, `rater`, `interpret`, and the viewer's removal | the `learn` session, `opus` | each package's commits |
| 2026-11-04 | `reason` review | `reviewer` on `sonnet`; `reviewer` on `astra` | fix rows in `reason` |
| 2026-11-04 | The user's realignment: Codex-family engines are the default for every new unit, Claude only when needed, and follow `AGENTS.md`, its rules, and `.agents/` strictly. Verbatim: "going forward use the codex models as much as you can, it should be our default instead of claude so that we can save on usage. You can still use claude models but when they are needed." | user | `plan.md` § Sequence |
| 2026-11-04 | The user's word on `contract`: no deferrals, in parallel, into the same version bump | user | `plan.md` § Goal and exit criterion |
| 2026-11-04 | Door and fault text in `contract`: one design pass | `analyst` on `astra` | open |
| 2026-11-04 | `ndjson` acceptance gates at `416ff8e`: format, lint, check, build, `npm test` (96, 179, 544, 23, 37 passed), distribution in release mode (10 passed), every exit 0 | `verifier` on `luna` | this row |
| 2026-11-04 | `mcp` independent read; `mcp` fix round | `reviewer` on `astra`; `builder` on `sol` | `a60c4d5` |
| 2026-11-04 | `qualifier`, `rater`, `interpret` independent read | `reviewer` on `astra` | fix rows in `learn`'s campaign |
| 2026-11-04 | Last rows: `tool`, `workflow`, `ollama`, `toolbox` | `builder` on `sol` | `fe77b9d`, `fc8b8ce`, `1fc131a`, `ac31925` |
| 2026-11-04 | Rulings ported into tracked records | `builder` on `sol` | `semantics.md`, `failopen.md` |
| 2026-11-04 | `database` joins the campaign: `shapeToColumnStorage` switches on every `category`, and `contract`'s new `shape` breaks it | `contract`'s review; Orchestrator's census | `plan.md` § Repositories |
| 2026-11-04 | The user asked for a plan and goals, and named `learn` as where nothing was moving. The skeleton moves ahead of the hardening, and reader experiments stop after the run in flight | user; Orchestrator's ruling | `plan.md` § What this wave serves |
| 2026-11-04 | The user kept the hardening scope open and named depth against breadth; approved deleting `learn`'s regressor, `dense*`, and `app/`. The wave now runs by class, with a release bar and stops | user; Orchestrator's reading of § Depth, breadth, and machinery | `plan.md` § How the wave runs |
| 2026-11-04 | Four class censuses dispatched across the sixteen packages | `scout` on `luna` | open |
| 2026-11-04 | Census of defaults: 279 sites marked, each flagged row read; one new row, `SQLiteDriver`'s absent `path`. Census of limits: 9,510 calls across the contracts and guards, no throw and no oversized report; 1M-element values read linear, at 5.8 s at worst | `scout` on `luna`; Orchestrator's probe | `plan.md` § Sequence, § Deferred |
| 2026-11-04 | Census of contracts against guards: 88 pairs measured, 31 distinct splits, seven causes, two above the bar; the snapshot case reproduced, with restore and store still working. Censuses closed, each hit ruled | `analyst` on `astra`; Orchestrator | `plan.md` § How the wave runs, § Sequence |
| 2026-11-04 | `contract`'s laws generated on `aadb739`: 49,722 pairs, no violation. The re-audit's `oneOf` break needs an unstable accessor, so that test doesn't replace review of accessors. The stop on hand-built review stands, pending the user's reading | `analyst` on `astra` | `plan.md` § How the wave runs |
| 2026-11-04 | The user moved the debrief to follow the hardening and asked that it cover performance, patterns, and conventions with evidence and examples, for scaffold's skills and rules. Its working input opens | user | `methods.md`; `plan.md` § Sequence |
| 2026-11-04 | The model's first independent review found `interpret` reading part of a number and approving past the authority, and quadratic time on message length. Ruled: a whole-token law with a table test, and a published text limit. `program`'s authoring checks join its take-up | `reviewer`; Orchestrator's ruling | `plan.md` § Sequence; `methods.md` |
| 2026-11-04 | The user: "we need to work in parallel". Independent rows move out of the take-ups and start now: `agent`, `database`, `workflow`, `program`, and `reason`'s table. The debrief's performance rows start distilling | `builder` on `sol`; `astra`; `distiller` on `luna` | open |
| 2026-11-04 | `contract` corrections closed at `32b987b` on bare gates, with a standing table over 27 doors; no third re-audit, by the stop. The door unit started, with `tool` as first consumer | `learn`'s writer and `verifier`; `astra` | `plan.md` § How the wave runs |
| 2026-11-04 | The user called the extraction rounds tuning that belongs to later learning, and asked for safe extraction, proper defaults, security, and transparency. `interpret`'s reading freezes after the links land, with an entry bar and a known-limits list, and a refusal says why in its public result | user, through the `learn` session; Orchestrator's ruling | `plan.md` § How the wave runs |
| 2026-11-04 | A take-up measured published `reason` at 19.44 ms against 36.85 ms today, correcting an earlier claim of 93.3 ms published. One bounded unit reads what `contract` spends at import | `builder` on `sol`; Orchestrator's reading; `astra` | `methods.md` |
| 2026-11-04 | The door landed, `contract` `0174733` and `d359d94`, `tool` `af33ffb`. Take-ups landed: `reason` `f8646a5`, `qualifier` `cad8d58`, `rater` `241c807`, `program`, `brief` `ba59122`, `workflow` `8281d5c`, `ollama` `d4020d1`, `study` `6b2d69a`, `toolbox` `37b9d1a`, `agent` `0d0ddf80`; `database` `97f7b31`. Each on its writer's gates, with `verifier` still to read them | `astra`; `builder` on `sol` | each package's commits |
| 2026-11-04 | `contract`'s cold import read: 18.6 ms of self time is about 5.1 compile, 6.1 declaration preparation, 6.2 observation, 1.1 module setup. Deferring `schema` saved 4.7 ms on `reason`, and is declined, pending the user | `astra`; Orchestrator's ruling | `plan.md` § Deferred |
