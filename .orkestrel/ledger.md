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
