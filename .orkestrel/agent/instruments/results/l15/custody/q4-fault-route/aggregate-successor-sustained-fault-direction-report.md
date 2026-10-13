# Proposal: getting past the Q4-think0 transport fault before the continuous pair

## Conflict in the current state
The code now blocks the ranked selection at its first candidate, q4. The faulted pilot is neither feasible nor validly infeasible. It cannot be read at all.

- `readPilotFeasibility` calls `verifyMatrixFeasibility`, and that call throws whenever any request outcome is `fault` (`bench5/sustained/helpers.ts:815`, `bench5/matrix/helpers.ts:1156-1157`). A transport error or a missing status counts as `fault` (`matrix/helpers.ts:862-870`).
- Qualified q4 development needs `readPilotFeasibility === true` (`sustained/Sustained.ts:290-295`).
- Recording q4 as a refused candidate needs a pilot that reads `false`, a matrix refusal, or a failed preparation (`Sustained.ts:224-231`). Q4 calibration passed, so a matrix refusal isn't available.
- Rank cannot skip q4 (`sustained/helpers.ts:573-574`). A refused qualified selection must contain all four ranked candidates (`helpers.ts:681-684`).
- Exploration needs that refused qualified selection first (`helpers.ts:388-389`, `Sustained.ts:125-130`). Q4 also cannot use the exploratory pair form, because `readDevelopment` admits only a strict calibration refusal (`matrix/helpers.ts:560`). Q4's only matrix evidence is a qualified pilot.

So without a readable q4 pilot, neither the qualified route nor the exploratory route can start. Nothing in the code or the accepted direction resolves this. Changing a guard, relabeling the failed pilot as a refusal, or skipping q4 would each break the direction.

## Recommended route: one fresh q4-think0 pilot, declared in advance, configuration unchanged
This is not outcome-driven repetition. The first pilot produced no admissible outcome either way; it is unreadable, not unfavorable. The direction already says "a preparation fault is not evidence of infeasibility." One fresh observation is the smallest measurement that can produce the missing ranked evidence.

**Root fixes these before any model call:**
1. **Same inputs.** Run `matrix.ts pilot --live` with exactly the same `--frozen`, `--resource` and `--fit` files and hashes as the manifest (`95da49bb…`, `a4db9c34…`, `46f1bcf2…`).
2. **New output directory.** Use one new `--out`, such as `results/l15/q4-think0/pilot-2/`. `mkdirSync(out)` and the `wx` writes refuse to overwrite (`matrix/Matrix.ts:84, 186, 358`). Each attempt seeds its own cache (`Matrix.ts:188-190`), so caches stay independent and the original run is untouched.
3. **Nothing else changes.** Source, build, models, digests, settings, budget (512/3072/3072), judge and endpoint all stay as they are. The Ollama PID32104 service and its workers stay running.
4. **Exactly one attempt.** Root sizes a wall cap from the prior 3030068 ms. No retry inside the run, and no further attempt is authorized by this route.
5. **Outcomes decided in advance** (table below), plus a written record that the first pilot stays retained and stays unbound.
6. **Observations only.** Record GPU and service state before and after. Contention stays a timing qualifier, not a cause or a gate.

**What the fresh pilot establishes.** The pilot runs only the aggregate arm. It is paired against the accepted resource records baseline (`sustained/helpers.ts:804-821`, `Matrix.ts:338-343`). It answers only whether q4-think0 is feasible in the matrix. It says nothing about endurance feasibility or quality.

| Result | Meaning | Next step |
|---|---|---|
| Reads `true` | q4 qualified matrix prerequisite met | Qualified q4 sustained development: classification, fit, then two development attempts (`helpers.ts:628-635`) |
| Reads `false`, no fault | Valid q4 infeasibility | `sustained.js candidate --pilot` records q4 refused (`Sustained.ts:216-252`). Rank continues to g4/q2 (refused by matrix calibration) and then g2 |
| Throws, or no manifest (fault, cap kill, crash) | q4 still operationally unresolved | Terminal boundary below |

## Boundary if another fault occurs
- The second faulted pilot is retained like the first. Neither is turned into a refusal.
- No qualified selection can be written, so no exploratory policy can exist. The required continuous pair stays unrun and the comparison stays unresolved. Root reports exactly that.
- There is no third attempt, timeout change or endpoint change under this route. Any of those needs its own named, bounded decision from root or the user. A timeout change would also be a source change, so it would break the frozen build.

## Evidence to preserve
- The original pilot directory and manifest, the faults on requests 302 and 315 with unknown usage, the 350266 known tokens, the 72-entry blind packet `6d10d40b…`, and its blind grading.
- The selection manifest has a single `pilot` slot (`types.ts:106`) and cannot carry the first pilot. Root's custody record must cite it explicitly, so the selection never looks as if the first pilot didn't exist.
- Candidate order q4, g4, q2, g2 (`helpers.ts:48`), the split between qualified and exploratory routes, and every quality observation and unknown cost.

## Exploratory evidence, if that route later opens
- **q4 and g2 (strict calibration accepted):** `exploration.matrix = { pilot }` must read `true` (`helpers.ts:496-499`).
- **g4 and q2 (strict calibration refused):** the `{ records, aggregate }` pair is required. Both members must be `phase: 'development'`, `copy: 1`, and bind the same `development` policy and the accepted resource (`helpers.ts:502-532`, `matrix/validators.ts:110-114`). Each arm needs a fresh seeded cache (`Driver.ts:1328-1329`).
- **A separate development records run is necessary.** The resource baseline is `phase: 'resource'` with no `development` field (`Matrix.ts:234-243`), so `helpers.ts:509-515` rejects it. That baseline stays valid for matrix quality comparison, but it cannot be relabeled to satisfy this check.
- **Each candidate also needs a fresh endurance diagnosis.** Its cutoff comes from strict calibration or the derived majority, never from the matrix cutoff (`helpers.ts:439-482`).

## Claims that need a probe
1. That neither faulted request (302, 315) counts as stopped under `isStoppedRequest` (`matrix/helpers.ts:1021`). If either did, it would leave the fault check. Root's inspection supports the throw; I did not re-run it.
2. That the ~304 s duration is the HTTP client's default 300 s headers timeout. This is an inference from timing, read only, with no proposed change.
3. That `readFrozen` and the build inventory still match the frozen file hashes when the fresh pilot starts.
4. Whether g2-think0 already has a pilot.
5. Whether the untracked `g4-think0/exploration*/` work includes a development-phase records arm. Only `policy.json` and `aggregate-execution.json` are present.

I made no writes, including no plan-mode file, because the brief forbids it.