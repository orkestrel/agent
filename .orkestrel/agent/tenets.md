# Agent records campaign tenets

Every brief and every unit of this campaign follows these directives. Each line cites the record that holds the ruling.

## Scope

- Ship fixes only; an experiment without a measured benefit leaves `src/` together with the bench code that serves it, and every experiment's removal path is written before it is built (U45: `152ac3c3:.orkestrel/agent/r2-u45-ruling.md`; `7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).
- Keep a change whose measurement shows it faster on the case it targets, the interval clearing no change in the faster direction, even when the point misses its improvement target, and record the miss as read, with no bar moved after the data. When the reading shows no gain (the interval includes no change: not shown), keep the change only when its brief names a merit beyond speed before the run (correctness, bounded retention, or a simpler reading for a developer or a small model), and revert a pure speed change whose gain is not shown (`@orkestrel/scaffold` `.claude/rules/quality.md` § Performance). Revert a change that makes a case users hit slower beyond its no-regression bar in every case, and revert a mixed change, faster in one case and slower beyond the bar in another, or take it to the user (the user's standing rule of 2026-11-01, "If something misses a target by a bit but still had better performance, we should keep it and not revert it.": O64, `plan.md` § Rulings; `designs/measurement.md` § Method, MM-18).
- Go micro to macro: offline and single-request evidence before any long run, long runs seeded from staged checkpoints, the promotion gate written first, and a cap treated as a resource boundary, never a quality verdict (`152ac3c3:.orkestrel/agent/plan.md` § Goal and exit).
- Keep the three budget layers apart: every stop names its layer (meter, budget, or model), and no unit collapses them into one ceiling (`152ac3c3:.orkestrel/agent/plan.md` § Levels and gates, row Stop, controls; `inferStop` in `src/core/agents/types.ts`, as of `1e82d145`).
- Exclude exact token counting; keep the estimator and the affine gauge, record prediction misses, and raise no cushion from a failed forecast (U11 and Estimator: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).
- Keep reasoning opt-in: `@orkestrel/ollama` sends `think: false` when the caller sets nothing (Think: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).

## Evaluation

- Judge every study, report, and screen by the evaluation canon: paired arms from a reset, failure classes frozen before execution, headline denominators over every declared goal, one trajectory read as a point observation, predicates for checkable facts and a model judge blind to arm for the rest (`1e82d145:.orkestrel/plan.md` § Evaluation canon).
- Tune on public development text only; read the evaluation oracle one time, aggregate-only, after freezing, and never tune on its atom text (U5: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).
- Build for the smallest local models: read every gate on the smallest model the Study carries, and fail a change that only a larger model tolerates; run no hosted provider (Q5: `plan.md` § Decisions).
- Never read `.env*`, `.npmrc`, `auth.json`, keys, tokens, or the endurance answer key, at any commit or in any untracked copy: git history holds the key at rc-u12's parent commit `64da0a29` under `studies/endurance/sources/private/`, and its untracked copy lives under `tmp/studies/private/endurance/`; never open, list, copy, or search either, and name the subfolders a search reads so no glob reaches them (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; O27: `plan.md` § Rulings).

## Trust

- Put only host-authored text in the `system` message: the system text, instructions with loaded skill bodies, the skill index, and host-registered tool definitions; never text a user wrote, a tool returned, a judge or summarizer produced, or a model wrote, a model-written memo included (O11: `plan.md` § Rulings).
- Hold every security protection in a deterministic check in the loop, never in the model obeying text (O14: `plan.md` § Rulings; `designs/authority.md` § Principle).
- Write model-facing denial text as fixed, runtime-written notes that state the status first, name one next step, and echo no arguments (O14: `plan.md` § Rulings; C38 to C40: `research/evidence.md` § External claims).

## Host

- Never contact the user's Ollama daemon on port 11434; set `OLLAMA_HOST` to `http://127.0.0.1:1` as its own statement before every node or npm command (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; `1e82d145:.orkestrel/plan.md` § Standing readings, row Ollama guard).
- Run GPU work only as the Orchestrator, on the dedicated daemon on port 11435, after notifying the user and, at each lineage start, screening the most recent stable Ollama release, because a different runner opens a separate lineage (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; `152ac3c3:.orkestrel/agent/plan.md` § Standing rules). The screen at each lineage start, with one daemon pin across a lineage, is ruled (Q9, approved 2026-10-31; `plan.md` § Decisions; `designs/runs.md` § Replay and pins).
- Keep one process-running lane on the host, the Orchestrator included, for every test, build, mutation, gate, and long-running command; a writer runs only its owned-file format check, non-fix lint, and scoped type checks beside it; read-only lanes use file tools and run no shell command (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; O22 and O47: `plan.md` § Rulings).
- Run every check, gate, probe, and study run on the newest Node 22 release at the start of the run, recorded in its run record, and on the newest Node 24 release at the start of the run, recorded in its run record, only for a package whose manifest requires 24; the declared floor stays `engines` `>=22.18.0` (O18, superseding the 22.18.0 release gate of `1e82d145:.orkestrel/plan.md` § Rulings in force, row Node floor gate). For a GPU lineage, read the Node 22 release at the lineage's start and hold it to that lineage's last replay; this hold is ruled (Q8, approved 2026-10-31; `plan.md` § Decisions; `designs/runs.md` § Replay and pins).
- Add no native code: no FFI, Node-API addon, or compiled helper (U22: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).

## Git and release

- Commit by explicit paths; never amend, force, or run `git add -A`; never commit a local `file:` pin (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).

### Release

- Publish a runtime dependency that an Agent release adds before that Agent release: `@orkestrel/ndjson` 0.0.15 goes out after rc-nd1 and ahead of Agent 0.0.35, moves no consumer, and is re-pinned by Ollama together with Agent 0.0.35 at the wave (O47: `plan.md` § Rulings; `plan.md` § Release).
- Then publish Agent, then its runtime dependents `@orkestrel/ollama` and `@orkestrel/toolbox`, then `@orkestrel/study`, then Agent's devDependencies; a `0.0.x` caret pins exactly, so every dependent re-pins in the same wave or a second Agent copy installs (`7ada8b77:.orkestrel/agent/plan.md` § Outcome and § Rules for future Agent work).
- The user runs `npm login` and owns every publication (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).

## Briefs

- Carry the user's sentence verbatim in every brief: "Make sure you thoroughly read the AGENTS.md in the neighboring scaffold folder along with the files that it points to especially the rules/agents/skills and follow them strictly, especially in regards to repo structure." (Brief: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force)
