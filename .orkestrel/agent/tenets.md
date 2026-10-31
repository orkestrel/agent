# Agent records campaign tenets

Every brief and every unit of this campaign follows these directives. Each line cites the record that holds the ruling.

## Scope

- Ship fixes only; an experiment without a measured benefit leaves `src/` together with the bench code that serves it, and every experiment's removal path is written before it is built (U45: `152ac3c3:.orkestrel/agent/r2-u45-ruling.md`; `7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).
- Go micro to macro: offline and single-request evidence before any long run, long runs seeded from staged checkpoints, the promotion gate written first, and a cap treated as a resource boundary, never a quality verdict (`152ac3c3:.orkestrel/agent/plan.md` § Goal and exit).
- Keep the three budget layers apart: every stop names its layer (meter, budget, or model), and no unit collapses them into one ceiling (`152ac3c3:.orkestrel/agent/plan.md` § Levels and gates, row Stop, controls; `inferStop` in `src/core/agents/types.ts`, as of `1e82d145`).
- Exclude exact token counting; keep the estimator and the affine gauge, record prediction misses, and raise no cushion from a failed forecast (U11 and Estimator: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).
- Keep reasoning opt-in: `@orkestrel/ollama` sends `think: false` when the caller sets nothing (Think: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).

## Evaluation

- Judge every study, report, and screen by the evaluation canon: paired arms from a reset, failure classes frozen before execution, headline denominators over every declared goal, one trajectory read as a point observation, predicates for checkable facts and a model judge blind to arm for the rest (`1e82d145:.orkestrel/plan.md` § Evaluation canon).
- Tune on public development text only; read the evaluation oracle one time, aggregate-only, after freezing, and never tune on its atom text (U5: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).
- Never read `.env*`, `.npmrc`, `auth.json`, keys, tokens, or `studies/endurance/sources/private/` (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).

## Host

- Never contact the user's Ollama daemon on port 11434; set `OLLAMA_HOST` to `http://127.0.0.1:1` as its own statement before every node or npm command (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; `1e82d145:.orkestrel/plan.md` § Standing readings, row Ollama guard).
- Run GPU work only as the Orchestrator, on the dedicated daemon on port 11435, after notifying the user and screening the most recent stable Ollama release, because a different runner opens a separate lineage (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; `152ac3c3:.orkestrel/agent/plan.md` § Standing rules).
- Keep one process-running lane on the host, the Orchestrator included; read-only lanes use file tools and run no shell command (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).
- Run Node 22.18.x through 24.x only, and gate every release on Node 22.18.0 (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work; `1e82d145:.orkestrel/plan.md` § Rulings in force, row Node floor gate).
- Add no native code: no FFI, Node-API addon, or compiled helper (U22: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force).

## Git and release

- Commit by explicit paths; never amend, force, or run `git add -A`; never commit a local `file:` pin (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).

### Release

- Publish Agent first, then its runtime dependents `@orkestrel/ollama` and `@orkestrel/toolbox`, then `@orkestrel/study`, then Agent's devDependencies; a `0.0.x` caret pins exactly, so every dependent re-pins in the same wave or a second Agent copy installs (`7ada8b77:.orkestrel/agent/plan.md` § Outcome and § Rules for future Agent work).
- The user runs `npm login` and owns every publication (`7ada8b77:.orkestrel/agent/plan.md` § Rules for future Agent work).

## Briefs

- Carry the user's sentence verbatim in every brief: "Make sure you thoroughly read the AGENTS.md in the neighboring scaffold folder along with the files that it points to especially the rules/agents/skills and follow them strictly, especially in regards to repo structure." (Brief: `152ac3c3:.orkestrel/agent/plan.md` § Rulings in force)
