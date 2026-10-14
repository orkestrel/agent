# Independent design: optional strategy-comparison surface for `@orkestrel/agent`

## Decision

I recommend **`study`** as the umbrella name. It would cover a development-only command (`npm run study`), a tracked top-level folder (`studies/`), and one folder per question (`studies/memory/` for records against compaction, with full history as the control). Nothing under `studies/` ships, and nothing moves until capacity qualification closes.

**Why `study`:**
- It is a short, common word.
- It avoids the terms the repository already uses: `evaluate` (`Authority.evaluate`), `test`, `check`, `bench`, `probe`, `prove`, `journey`, `showcase`, `trace`, `meter`, `audit` and `log` (facts.md ¶3–4).
- The inspected guide and name inventory has no owner for `study` or `studies` (facts.md ¶4).

**Unresolved:** I did not check npm registry or fleet availability (facts.md ¶4). The surface exports no symbol, so the fleet name-ownership rule for bare exported names (rules.md, names.md § Fleet name ownership) does not apply to it as proposed.

## Vocabulary

Each term below has one meaning. Several follow the candidate concepts in methods.md § Minimal conceptual vocabulary; I keep or reject each against the collision facts.

- **study**: one comparison question and its folder, manifest and reports.
- **scenario**: one workload the agent can see. The 96-goal continuing trajectory is one scenario made of goals (facts.md ¶6).
- **goal**: kept as the existing unit inside a scenario.
- **arm**: one strategy configuration: `records`, `compaction`, `full`, and a `null` do-nothing control.
- **trial**: one isolated trajectory of one arm on one scenario. This matches the existing `TrialConfig` meaning, so nothing is renamed (facts.md ¶4).
- **series**: the scheduled set of trials, kept from `SeriesEntry`.
- **oracle**: the truth only the grader reads.
- **report**: the curated, tracked result.

I rejected some terms on purpose:
- **run** as a phase or noun: it is a banned synonym for `execute` (rules.md, names.md § Fixed lifecycle vocabulary).
- **record** for raw trial output: it would collide with the `records` arm. Trial output is named by file: `events.ndjson`, `state.json`, `usage.json`.
- **check** for the offline phase: it collides with the gate. The existing word **preflight** is used instead (facts.md ¶7).

## Layout and ownership

The layout separates what the agent sees, what only the grader reads, and what stays local:

```text
studies/
  study.ts                 entry: one phase flag per invocation
  memory/
    study.json             arms, subject digest, model, budgets, scenario and grader digests
    scenarios/             agent-visible workload
    oracle/                visible-set truth; never copied into a trial workspace
    trials/                raw trial output, gitignored
    reports/               curated reports, tracked
```

- **Owner.** `@orkestrel/agent` owns `studies/` as a durable development surface. The package publishes only `dist/src` and `README.md` and has no `bin`, so `studies/` stays out of the tarball without a surface change (facts.md ¶3). A shipped CLI stays out of scope.
- **Not in `.orkestrel/`.** `.orkestrel/` is temporary and is deleted at acceptance (law.md, orchestration § .orkestrel layout; facts.md ¶5). A measurement surface the user wants to keep cannot live there.
- **Not in `scripts/`.** `scripts/` holds only Cloud hooks (law.md § Non-negotiable rules).
- **Runtime source.** `src/` gains nothing. The harness imports only the published entry of a frozen build, so the study measures a declared subject and never the live tree.
- **Unresolved:** whether `records` and `compaction` are public runtime capabilities or harness-side logic. If the harness has to add a runtime capability, that capability is a separate medium change with this study as its first consumer (law.md § Design laws, Minimal public API).

## Command flow

The flow keeps the c1 phases (facts.md ¶6) and renames only `run`. Each invocation names one phase. Paid work refuses to start unless it is given explicit caps.

1. **`--freeze`**: records the subject digest (vendored tarball or workspace build), scenario and grader digests, model, and budgets into `study.json`. Paths are relative to the study, not absolute.
2. **`--preflight`**: makes no model calls. It runs schema checks, state reset, solvability from the stated initial state, the `null` arm against the grader, and oracle coverage (article.md § What is decisive; methods.md § Prioritized considerations 8). It also covers the existing synthetic capacity preflight (facts.md ¶7).
3. **`--execute`**: the paid path. It refuses without request, goal, trajectory and series caps; it keeps calls serial on the shared GPU and keeps failed attempts (facts.md ¶7).
4. **`--series`**: schedules trials; kept from c1.
5. **`--blind`** and **`--labels`**: semantic grading with arm identity hidden; kept from c1.
6. **`--report`**: produces the outputs listed next.

The report contains:
- Paired results per scenario and goal.
- Separate dimensions: facts, downstream work, obligations, critical violations, coverage, blind semantic score, feasibility, and cost split into agent, simulator and grader lines (methods.md § Prioritized considerations 2, 3 and 7).
- A status for each trial that separates agent, task, grader and infrastructure failures (methods.md § Preserve, change, avoid, and defer).
- Every launched attempt and the score coverage, so a change in the denominator cannot hide a failure (methods.md, Inspect row).

## Retain, change, defer

**Retain:**
- The c1 phases, apart from the `run` rename.
- The separate outcome dimensions and blind semantic scoring.
- Fail-fast sticky termination and bounded budgets.
- Preserved failed attempts and the synthetic preflight.
- Serial live GPU calls, and frozen source and build during live measurement (facts.md ¶6–7).

**Change:**
- Add `full` and `null` as named arms, not ad hoc controls.
- Separate feasibility, such as a strategy-caused overflow, from semantic quality.
- Record actual tokens for each cost line (article.md § What is decisive).
- Pin relative paths and digests instead of absolute paths.
- Rename the `run` phase to `--execute`.

**Defer:**
- **Repeat count.** Add a repeated subset only after pilot variance is known (methods.md § Prioritized considerations 4).
- **Human calibration slice for the semantic grader.** The 0.6 kappa floor is not validated (article.md § What is decisive).
- **Held-out set size and custody.** This is an owner decision (methods.md § Prioritized considerations 5).
- **Simulated-user validation.** The packet does not say whether scenarios use a scripted user or a model user, so this stays unknown (methods.md § Unanswered questions).
- **Further out of scope:** any rename of the package or of c1, extraction into a separate package, and a hosted platform.

## Minimal migration

1. **Now:** record the name decision only. Q2 preflight is still running and source and build are frozen, so no file moves or renames (facts.md ¶7).
2. **After capacity qualification and c1 grading close:** leave the c1 artifacts in `.orkestrel/agent/` untouched. Their manifests bind absolute paths and hashed vendored builds, and a move would break that custody (facts.md ¶5).
3. **Port the harness once** into `studies/study.ts` with relative paths. Copy the workload into `studies/memory/scenarios/` and the visible oracle into `studies/memory/oracle/`.
4. **Carry curated c1 results** into `studies/memory/reports/c1.md`, with their original manifest digests marked as measured under the old layout. Git history keeps the rest after `.orkestrel/agent/` is deleted at acceptance.
5. **Re-freeze and re-run `--preflight`** before the first `--execute` under `studies/`. The ported harness is a new subject and does not inherit c1's qualification.

**Unresolved integration cost:** TypeScript under `studies/` has to pass lint and typecheck, because no file may be excluded from a gate (law.md § Non-negotiable rules). The packet does not include the workspace rule that would place `studies/` in a TypeScript project or a Vitest project. Grader predicates are reusable logic and need tests with negative controls (law.md § Design laws; rules.md, quality.md § Instruments). Where those tests live is unknown.

## Adversarial counterexamples

**1. The oracle leaks into the agent or into development. This is the most consequential risk.**
- *Attack:* `studies/memory/oracle/` sits in the same checkout. An agent under test with filesystem tools could read it. Coding agents that tune the `records` strategy can also read it and overfit to the held-out answers. Either way, the comparison measures memorized truth, not strategy.
- *Resolution:*
  - `--execute` builds each trial workspace in a fresh temporary directory that holds only the scenario material and never copies the oracle.
  - Trial output is sealed by digest before grading.
  - `--labels` reads the oracle only after sealing.
  - The in-repo oracle covers the visible development set only. A held-out oracle stays outside the repository at an owner-held path given by flag, and `study.json` records only its digest (methods.md § Prioritized considerations 5; Terminal-Bench and Harbor row).
- *Still open:* whether the repository is public, and whether the c1 private oracle is tracked in git. The packet does not say.

**2. One trajectory per arm is read as a ranking.**
- *Attack:* Q2 shows 96/96 against 38/96 served, which looks decisive, but no product passed every atom (facts.md ¶6).
- *Resolution:* the report labels single-trajectory differences as descriptive and puts feasibility next to quality. No reliability claim is made without the deferred repeated subset.

**3. Custody breaks during migration.**
- *Attack:* moving c1 invalidates its absolute-path manifests and silently changes what was measured.
- *Resolution:* nothing moves. The harness is ported, re-frozen and re-qualified, and c1 results keep their original digests.

**4. Authority conflict over where the folder lives.**
- *Attack:* "A campaign artifact never lives in the package it is about" (law.md, orchestration § Cleanup) could be read as forbidding `studies/` inside agent.
- *Resolution:* I read "package" as the published contents, which `studies/` is not part of. The user already placed `.orkestrel/agent/` in this repository (facts.md ¶5). This reading is unresolved and needs root or the user to rule.

**5. The `null` control passes.**
- *Attack:* the article's do-nothing agent passed refusal tasks on keyword checks (article.md § What is decisive).
- *Resolution:* `--preflight` fails when the `null` arm passes any goal that requires an action, and it reports `null` passes on goals that require no action as grader-coverage findings.

**6. Name drift.**
- *Attack:* `memory` might already mean something in the runtime. `study` might be claimed later in the fleet.
- *Resolution:* nothing is exported, so a collision costs only a folder rename. Both names stay subject to a collision check before the port.

## Limitations

- This is a proposal only. I made no model calls, did no research and read no live source.
- These remain unknown:
  - registry availability;
  - the runtime status of `records` and `compaction`;
  - the workspace gate configuration;
  - repository visibility;
  - whether the c1 oracle is tracked;
  - whether scenarios use a scripted user or a model user;
  - spend limits.
- I do not infer the final Q2 qualification result (facts.md ¶7).
- No packet source directly settles which strategy wins on long-horizon work (facts.md ¶8; methods.md opening paragraph).