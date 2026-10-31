# Agent records campaign plan

## Goal and exit criterion

Make `@orkestrel/agent`'s two long-conversation strategies durable and honest, and give `AgentContext` memos and skills in the package's own vocabulary, adding nothing the evidence does not carry.

- Fixes: blank-recap refusal, owner-trim order, ledger head pricing, literal vocabulary.
- Capabilities: ledger snapshot and hydrate, correction cap, memo and skill managers wired into the context and the ledger's agent options.
- Experiments, each promoted or deleted on its written gate: anchored recaps, briefing at the foot, moving tail, pair narrowing.
- Exit: every unit accepted cheap-first; every experiment switch either promoted (switch deleted, behavior always on) or deleted with its bench; Agent 0.0.35 published with the guide corrected; Agent 0.0.36 published with Authority `ask` in the toolbox wave; no `src/` line whose justification is "an experiment might test it".

The campaign builds no second log, no CRDT, no frontmatter parser, no default literal extractor, and no core repeat-stop switch.

## Repositories

| Package | URL | Work |
| --- | --- | --- |
| `@orkestrel/agent` | https://github.com/orkestrel/agent | every unit except rc-t1 |
| `@orkestrel/toolbox` | https://github.com/orkestrel/toolbox | rc-t1 |
| `@orkestrel/ollama` | https://github.com/orkestrel/ollama | re-pin only |
| `@orkestrel/study` | https://github.com/orkestrel/study | re-pin only |

Re-pins follow the release order of `tenets.md` § Release.

## State

| Item | Status | Evidence |
| --- | --- | --- |
| Absorb: prior art, source terrain, reuse map, external research, evidence digest, claim verification | done 2026-10-30 | `ledger.md`; `research/evidence.md` |
| Design: one blind round, subjective and objective lanes | done 2026-10-31 | `ledger.md`; `designs/` |
| Reconciliation: one read-only consultation the user named | done 2026-10-31 | this plan; `ledger.md` |
| Orchestrator rulings O1 to O8 and verified facts F1 to F3 | done 2026-10-31 | § Rulings |
| Records: this folder's first commit, in the window the fleet wave named on 2026-10-31 | done 2026-10-31 | O8 |
| Dependency: every unit designs against the names Agent 0.0.34 publishes; the fleet wave pushes Agent's `main` after the registry serves 0.0.34 | blocks S1 | O8 |
| User decision Q1 (the noun) | blocks rc-u7 only if the user overrules O4 | § Open decisions |
| User decision Q4 (GPU allowance) | blocks rc-a9 and every later GPU unit | O5 |
| Next | After Agent 0.0.34 is served and pushed, write the rc-p1, rc-u1, rc-u2, and rc-a8 briefs and start S1 | O5 |

## Open decisions

Each decision is the user's. A recommendation names the default the plan runs on until the user rules.

| Id | Decision | Recommendation |
| --- | --- | --- |
| Q1 | The noun: `Memo` or another word (`Fact` collides with the `fact` category, `Note` with `LedgerNote`) | `Memo` (O4) |
| Q2 | Whether the Study compaction arm with the authority repeat rule becomes the compaction baseline | yes: every experiment's off arm runs on 0.0.34, and the 0.0.30 c1 arm is not comparable |
| Q3 | Whether the memo and skill managers ship in Agent 0.0.35 with the `studies/context` mechanism study as their only consumer, the toolbox tools following | yes |
| Q4 | The GPU allowance in model minutes for rc-a9 and rc-a10, and whether the recording extends to goal 77 (needed only by rc-a7 and rc-a11) | none; the campaign stops before rc-a9 (O5) |
| Q5 | Whether a hosted-provider consumer is planned | none; a hosted consumer raises rc-a6 from marginal to material (`designs/records.md` § Render path) |

## Rulings

### Verified facts

- F1. The Ollama judge sends one request per question: the `OllamaJudge` remarks in `@orkestrel/ollama` 0.0.27 read "Each question uses a separate non-streaming generate request." Grouping a message's asks saves zero wire calls, so the grouped-asks experiment (the subjective proposal's E3) is refused.
- F2. The owner-record trim drops the most recent lines first: `Ledger#plan` builds owner-record steps from `record.lines` in conversation order, and each `Ledger#trim` step replaces the keyed record's lines with `record.lines.slice(0, -1)` (`src/core/ledgers/Ledger.ts`, as of `1e82d145`). The rules record survives only because `selectRecords` moves on-topic rules lines ahead of off-topic ones. rc-u5 is a fix, test first.
- F3. `Message.id` never reaches the Ollama wire: `mapMessages` in `@orkestrel/ollama` 0.0.27 sends `role`, `content`, `tool_calls`, and `images` only. The system-message id that `AgentContext#build` mints on every call leaves Ollama prefix reuse intact. Probe rc-p1 (c) is dropped, and D17 closes.

### Orchestrator rulings

- O1. Adopt the consultation's decision, reconciliation, records, compaction, memos and skills, context and machinery, measurement, sequence, and deferrals, with F1 to F3 applied. The `designs/` files hold that substance.
- O2. Authority `ask` ships in the same wave as the toolbox `remember` tool, never before it (D6).
- O3. When the objective bench returns, route the `astra` units to it from the next dispatch on. Until then the `astra` units run on the subjective lane's engine, and each carrying commit records the substitution.
- O4. The noun defaults to `Memo`. The user can rule otherwise before rc-u7 starts.
- O5. Stop line: after Agent 0.0.34 is served and pushed, the campaign runs every CPU-only unit (S1 through S5, plus rc-a3 and rc-a8) without further user input. It stops and reports before rc-a9, because the GPU allowance in model minutes is the user's decision (Q4).
- O6. Estimate: no measurement of these units exists. The closest is the prior campaign's R2 CPU proof, which ran 327 of 335 implementation minutes for one medium unit (`152ac3c3:.orkestrel/agent/r2-u41-ruling.md`). Each unit brief states its own estimate and stop cost.
- O7. The closed fleet records `.orkestrel/plan.md`, `.orkestrel/ledger.md`, `.orkestrel/release.md`, and `.orkestrel/scaffold/release-audit-verdict.md` record closed campaigns (fleet 2026-10-17, Mechanisms, Recording, the 2026-10-24 release, the boost campaign), and the fleet wave confirmed on 2026-10-30 that it reads none of them. The records commit deletes them per `.claude/rules/campaign.md` § Hand off and close; git history keeps them.
- O8. These records are committed by explicit pathspecs in the window the fleet wave named on 2026-10-31, leaving the wave's uncommitted tarball pins in `package.json` and `package-lock.json` out of the commit. Nothing in this campaign pushes Agent's `main` before the fleet wave pushes it after Agent 0.0.34 is served.

## Deferred

Each item reopens on its trigger and on nothing else.

| Id | Item | Reopen when | Design |
| --- | --- | --- | --- |
| D1 | Cache-safe summarizer prefix | the summary prompt share reaches 5% of the run prompt with 0 cached on rc-a9, or a hosted consumer appears | `designs/compaction.md` |
| D2 | Masking old tool results | a census shows tool messages over 30% of folded estimate tokens | `designs/compaction.md` |
| D3 | Verbatim rule pins across folds | rule retention falls under 0.8 after three folds on the rc-a8 rule-retention instrument, which joins rc-a8 when rc-e1 promotes | `designs/compaction.md` |
| D4 | Loaded skill bodies in the late `system` slot | rc-a6 promotes and a `studies/context` reading shows at least one skill load per 10 turns | `designs/context.md` |
| D5 | Core repeat stop (`distinct`) | the authority rule with a static reason fails to stop repeats in the Study arm | `designs/compaction.md` |
| D6 | Authority `ask` | ships in rc-a14 with rc-t1's `remember` tool, never before (O2) | `designs/context.md` |
| D7 | Path-activated instructions | a consumer whose rules depend on active-workspace paths | `designs/context.md` |
| D8 | Workspace index mode | a reading shows workspace text over half the head | `designs/context.md` |
| D9 | `SKILL.md` parsing | `@orkestrel/markdown` gains a frontmatter parse and a consumer loads skills from files | `designs/context.md` |
| D10 | Memo consolidation from ledger records | a consumer runs several conversations for one owner | `designs/context.md` |
| D11 | Public `trace` or `why`, and `at(version)` | an instrument or application needs omission attribution | `designs/records.md` |
| D12 | Memoized projection | the rc-a3 gate passes | `designs/records.md` |
| D13 | Incremental ledger persistence | a save measures over 1 MiB or over 5% of request wall on rc-a9 | `designs/records.md` |
| D14 | One-row-per-revision memo store | rc-u8's timing of `set` over growing memo sets reads over 50 ms | `designs/context.md` |
| D15 | Recall listing assistant replies | rc-a7 carriage reads under 0.8 for products older than the window | `designs/records.md` |
| D16 | Fork timelines as a public helper | a subagent consumer needs fork at the parent's frontier | `designs/records.md` |
| D17 | Stable built system-message id | closed by F3; reopens only for a provider that serializes `Message.id` | `designs/records.md` |
| D18 | Briefing headings (`## Pinned` to `## Records`) | bundled with the next experiment that changes briefing bytes, never alone | `designs/records.md` |
| D19 | Endurance effect of the 0.0.32 ledger fixes | folds into each experiment's own off arm on 0.0.34 | `designs/measurement.md` |

## Sequence

Every unit starts after Agent 0.0.34 is published and pushed and designs against its names. Size `S` is small, `M` is medium; `run` is a GPU run. Each medium unit gets one independent review. "Gate row" points at `designs/measurement.md` § Gates.

### Phases

| Phase | Step | Units |
| --- | --- | --- |
| S1 | probes | rc-p1 |
| S2 | fixes | rc-u1, rc-u2, rc-u5 |
| S3 | durability | rc-u4, rc-a3, rc-a3b |
| S4 | write cost | rc-u6 |
| S5 | libraries and consumers | rc-u7, rc-u8, rc-u9, rc-s1 |
| S6 | measurement | rc-a8, rc-a9 |
| S7 | experiments and screens | rc-e1, rc-a6, rc-a7, rc-a11, rc-a5, rc-a10 |
| S8 | document, then Agent 0.0.35 | rc-d1 |
| S9 | toolbox wave, then Agent 0.0.36 | rc-t1, rc-a14 |

### Units

| Id | Step | Class | Size | Role | Owned files | Depends on | Key acceptance line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rc-p1 | S1 | throwaway probe | S | `builder` writes, `verifier` runs | throwaway probes in the probe directory of `.agents/orchestration.md` § tmp layout, never committed | 0.0.34 | (a) literal census over the public `studies/endurance/sources/runtime/evaluation.json` with a known-content control; (b) pair questions per correction at growing conversation lengths with an inert stub judge, control: a conversation with no correction counts 0. Probe (c) is dropped (F3). |
| rc-u1 | S2 | fix | M | `builder` | `src/core/conversations/{types,Conversation}.ts`, their tests, `tests/src/core/agents/Agent.test.ts` | 0.0.34 | gate row rc-u1; mutation on the blank check |
| rc-u2 | S2 | fix (vocabulary) | M | `builder` | `src/core/{types,helpers}.ts`, `src/core/ledgers/{types,helpers,Ledger,Classifier}.ts`, their tests, the `guides/agent.md` rows naming the two symbols | 0.0.34 | identical briefing bytes on a fixture; no `extractTokens` or `LedgerTokenSet` in `src`, `tests`, or `guides`; `test:guides` green |
| rc-u5 | S2 | fix | S | `builder` | `src/core/ledgers/Ledger.ts` (`#plan` steps), `tests/src/core/ledgers/Ledger.test.ts` | rc-u2 | test first: the fixture fails on 0.0.34 (F2); then the oldest non-decisive owner lines drop first and decisive lines last |
| rc-u4 | S3 | capability | M | `astra` | `src/core/ledgers/{types,Ledger,validators,errors}.ts`, their tests | rc-u2 | replay equivalence; `failures` control; `CONCURRENCY` during `respond`; unknown id refused; pending results flushed; no calibration when the snapshot carries a gauge |
| rc-a3 | S3 | measurement | S | `builder` writes, `verifier` runs | a throwaway bench in the probe directory, never committed | rc-u4 | thresholds stated before the run; host load reported |
| rc-a3b | S3 | fix (conditional) | S | `builder` | `src/core/ledgers/Ledger.ts`, its tests | the rc-a3 gate | at least a 50% CPU cut at 1600 messages; replay stays byte-identical |
| rc-u6 | S4 | capability (resource bound) | M | `builder` | `src/core/ledgers/{types,Classifier,Ledger}.ts`, `tests/src/core/ledgers/Classifier.test.ts` | rc-p1 (b), rc-u5 | pair questions at most `2 × limit`; identical classification when `limit` reaches the eligible count; `LedgerError('LIMIT')` on a bad value |
| rc-u7 | S5 | capability | M | `opus` | `src/core/contexts/{types,constants,helpers,validators,factories,index}.ts`, `src/core/contexts/memos/MemoManager.ts`, `src/core/contexts/skills/SkillManager.ts`, their tests | rc-u2 (Q1 blocks only if the user overrules O4) | gate row rc-u7; `scaffold surface` confirms the `Memo` and `Skill` names are free |
| rc-u8 | S5 | capability | M | `builder` | `src/core/contexts/stores/{MemoryMemoStore,DatabaseMemoStore}.ts`, the store factories, their tests | rc-u7 | one store contract test over both stores; mutation |
| rc-u9 | S5 | capability and fix | M | `opus` | `src/core/contexts/AgentContext.ts`, `src/core/agents/{types,Agent}.ts`, `src/core/ledgers/{types,Ledger}.ts`, their tests | rc-u7, rc-u6 | head order; scope lists filter; empty managers render no header; head pricing with a reverted-pricing control |
| rc-s1 | S5 | consumer | S per change | `builder` | `studies/memory/*`; a `studies/context/` mechanism study modeled on `studies/tools` | each unit that changes the public surface | `test:studies` green; the authority repeat rule lands here |
| rc-a8 | S6 | measurement | M (studies only) | `builder`, `checker` | `studies/memory/{helpers,types,constants}.ts`, their tests | none | each instrument mapped to `@orkestrel/study` first; four instruments, each with a negative control that fails |
| rc-a9 | S6 | GPU recording | run | Orchestrator | gitignored study output | rc-u4, rc-a8, rc-s1 checkpoint seeding, Q4 | the recording seals; snapshots validate; replay of goal k+1 from snapshot k matches live bytes on non-maintenance requests; the three single-request probes answered |
| rc-e1 | S7 | experiment | M | `builder`; GPU by the Orchestrator | `src/core/conversations/{types,helpers,Conversation}.ts`, their tests, the study profile | rc-u1, rc-u2, rc-p1 (a) | gate row rc-e1 |
| rc-a6 | S7 | experiment | M | `astra` | `src/core/ledgers/{types,Ledger}.ts`, their tests; on promotion `src/core/contexts/{types,AgentContext}.ts` | rc-u4, rc-a9 probes pass | gate row rc-a6 |
| rc-a7 | S7 | experiment | M | `astra` | `src/core/ledgers/{types,Ledger}.ts` (`#selectTail`), their tests | rc-a6, rc-a9 extended to goal 49, Q4 | gate row rc-a7 |
| rc-a11 | S7 | experiment | M | `astra` | `src/core/ledgers/{Classifier,types}.ts`, their tests | rc-u6, rc-a9 extended to goal 77 | gate row rc-a11 |
| rc-a5 | S7 | experiment (study-only) | S | `builder` | `studies/memory/` wiring only | rc-e1 reading, rc-a9 | gate row rc-a5 |
| rc-a10 | S7 | GPU screens | run | Orchestrator | gitignored study output | rc-a9, the unit under test | arms off, repeat, sham, and on at strata 17, 49, and 77; no tools on the final step; judge exchanges replayed |
| rc-d1 | S8 | documentation | M | `opus` | `guides/agent.md`, `guides/README.md`, TSDoc of touched `types.ts` files | every Agent unit from rc-p1 through rc-a10 accepted | `test:guides` green; the two guide drifts corrected; "the ledger is the records strategy" stated one time; a strategy-choice table |
| rc-t1 | S9 | capability (consumer) | M (toolbox) | `opus` | `@orkestrel/toolbox` tool files, per its layout | Agent 0.0.35 | tools drive real managers; `skill` adds instruction `skill:<name>` and returns a bare acknowledgement; `skill_file` refuses an unknown path with the valid list |
| rc-a14 | S9 | capability | M | `astra` | `src/core/agents/{types,Authority,Agent}.ts`, their tests, the `guides/agent.md` Authority rows, `studies/tools` | rc-t1 design, same wave (O2) | the four orderings of `designs/context.md` § Authority; `allowed` replaced; ships as Agent 0.0.36; Ollama, Toolbox, and Study re-pinned |

### Stop line

After Agent 0.0.34 is served and pushed, run S1 through S5 with rc-a3 and rc-a8 without further user input. Stop and report before rc-a9 (O5).

### Parallelism

- Run rc-u1, rc-u2, and rc-a8 as parallel in-process lanes under the `orkestrel-parallel` skill: their files are disjoint, and one runner lane owns every check.
- Serialize every unit that writes `src/core/ledgers/Ledger.ts`, in phase order: rc-u2, rc-u5, rc-u4, rc-a3b (when its gate passes), rc-u6, rc-u9, rc-a6, rc-a7.
- Serialize rc-u7, rc-u8, and rc-u9.
- Run GPU work only as the Orchestrator, never beside a builder's checks, with one compaction experiment on the GPU at a time.

### Release

- Strip or promote every experiment switch before 0.0.35; no switch ships while its verdict is open.
- Publish Agent 0.0.35 after rc-d1, then re-pin and publish in the order of `tenets.md` § Release.
- Then the toolbox wave: rc-a14 with its guide rows publishes as Agent 0.0.36, then `@orkestrel/ollama` and `@orkestrel/toolbox` (with rc-t1's tools) re-pin and publish, then `@orkestrel/study`, then Agent's devDependencies.
