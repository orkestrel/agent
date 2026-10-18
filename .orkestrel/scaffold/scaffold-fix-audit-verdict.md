# Scaffold fix chain: falsify round 3 verdict

The successor round after `.orkestrel/agent/scaffold-sweep-2-audit-verdict.md`. Subject: scaffold
`C:/Users/mikes/WebstormProjects/scaffold`. The base is `1f2eed70e` (0.0.101), with checkpoint `499ade7ab` and fix units
A, B, B2 and B3 uncommitted on top. Claims: `tmp/units/scaffold-fix-claims.md`.

## Lanes

| Lane | Engine | Transport | Report |
| --- | --- | --- | --- |
| Objective | GPT-6 Astra high (`analyst`) | T3 `delegate_task` `scaffold-fix-falsify-objective-astra-1` | `tmp/units/scaffold-fix-verdict-objective-1.md`: FAIL 1, 2, 4, 6, 7, 8; outside: none |
| Subjective | Claude Opus 5.5 high (`reviewer`; told that Opus wrote unit A, the design and the rule) | native Workflow `wf_52564f99-6d1` | `tmp/units/scaffold-fix-verdict-subjective-1.md`: FAIL 4, 5, 6, 7, 8; outside: S1 |

Both reports resolve under `cite.ts` from the scaffold root: 13 of 13 citations and 40 of 40.

## Rulings

Each BROKEN finding and outside finding was reproduced by the Orchestrator before ruling.

1. **BROKEN (objective).**
   - **Reproduction.** Ran `launch.ts --journal … --errors … --cap 0.1001 -- node -v` on Node 24.22.0. It exited 1
     with `ERR_OUT_OF_RANGE … Received 100.1`, raised by `AbortSignal.timeout` at `launch.ts:97`. By then the child
     was already spawned (pid printed) and `run.jsonl` and `run.jsonl.pid` existed.
   - **Engines.** The subjective lane confirmed the listed rewrites by reading and did not run a fractional cap, so the
     two lanes answered different questions.
   - **Fix:** C1.
2. **UNRESOLVED, split.**
   - **2a, the declared regions are approved changes: CONFIRMED.** The subjective lane diffed the emitted
     distribution proof hunk by hunk.
   - **2b, every other byte is identical: UNRESOLVED.**
     - Reproduced: `regions.test.ts.txt:32` prints with `removeComments: true`.
     - Reproduced: `emission.test.ts.txt:124-134` records host artifacts as `(host) ` descriptors, not bytes.
     - So "LICENSE compares equal" is descriptor equality.
   - **Fix:** settled by C6's raw-byte emission run.
3. **CONFIRMED** by both lanes. Each lane ran a segment-skip mutation, and the assertions distinguish it.
4. **BROKEN.** Three sites; the objective lane found one and the subjective lane two.
   - **4-obj, Lists and logs** (`tests/src/server/WriteTransaction.test.ts:327-356`).
     - Reproduced: `observations` is read only by `toHaveLength(attempt)` and `.at(-1)`.
     - Fix: C2.
   - **4a, Entity state** (`tests/setupServer.ts`).
     - Reproduced at `createSink` (`:2281-2295`) and `createWhoamiRegistry` (`:5221-5240`). A function the factory
       creates pushes into a closure array after the factory returns, against `typescript.md` § Bindings **Entity
       state**.
     - `createUpstreamServer` (`:3172`) and `createOllamaServer` (`:3679`) are named by the lane and carried.
     - The census missed these sites because N12's signature needs a returned function or an `.on(`.
     - Fix: C3.
   - **4b, Bound values and Unit resets** (`src/core/templates.ts:2573-2605`).
     - Reproduced: `DistributionSuite` holds one run in `#scratch` and `#stage`.
     - `destroy` resets both. The refusal guards `#scratch` alone.
     - `stage` answers `undefined` for "not started" and for "registry unreachable" alike.
     - Fix: C4.
5. **BROKEN on the record (subjective). No code change.**
   - **Reproduced.** `git show 1f2eed70e:src/server/types.ts` publishes `export interface ReadAllowance { remaining:
     number }`. The chain turns the name into a class with a `#` field, a nominal retype that the claims recorded as an
     addition.
   - **Engines.** The objective lane checked that the additions carry proofs, a different question. Both lanes hold.
   - **Bound.** No fleet target imports the name (the subjective lane's `git grep`).
   - **Fix:** C5.
6. **BROKEN.** Both lanes; the Orchestrator reproduced each part.
   - **6a.** `DECLARED` names the `describe`, `beforeAll` and `afterAll` regions whole for `tests/distribution.test.ts`
     (`drive.ts:111-113`), so any change inside them passes.
   - **6b.** The region reading flattens enclosing control flow (objective).
   - **6c.** `compareBehaviour` (`drive.ts:202-212`) counts any absence as one-sided without checking it against an
     approved addition or removal.
   - **6d.** The budget-boundary case (`behaviour.server.ts:947-957`) uses budget 600 against three packuments of 127
     bytes each, 381 bytes in all, so the boundary is never reached. Measured by the Orchestrator through
     `buildPackument`'s shape.
   - **Fix:** C6.
7. **BROKEN.** Both lanes.
   - **Reproduced.** The only non-ASCII name in `tests/src/bin/GitQuery.test.ts` is the BOM-led `:73`, and no case
     forces a chunk boundary inside a UTF-8 sequence. HEAD's `collect` case did, and it was deleted.
   - **Bound.** `src/bin/GitQuery.ts:129` keeps `stream: true`. This is a lost proof, not a decoder bug.
   - **Fix:** C7.
8. **BROKEN.** It follows from 1, 4, 6 and 7, and 2b and 5 must close or be recorded before 0.0.102.

**S1 (subjective, outside the claims). Reproduced; fix C8.**

- **The defect.** `.claude/rules/workspace.md:177-178` still says any exact-case `*.test.ts` file beneath
  `tests/studies`, nested or direct, defines `studies`. The selector skips `node_modules` and `.git` segments.
- **Other sites.** The lane also names `guides/scaffold.md:688`, `:1101`, `src/bin/CLI.ts:1125-1126` and
  `src/core/constants.ts:457-458`.

**ADVISORY (subjective; outside the terminal line).** `computeTotal` re-sums the whole log on each chunk in three loops,
which is quadratic in the chunk count. No measured effect under the byte limits. Not carried.

## Findings carried into fix units

| Item | Finding | Fix | Bound (what not to break) |
| --- | --- | --- | --- |
| C1 | 1 | Normalize the admitted cap to HEAD's `setTimeout` millisecond semantics before any side effect. Keep the refusal above 2147483 s. Add a fractional-cap test and a differential instrument case. | Never reject a cap HEAD admitted. The cap-boundary tests keep passing. |
| C2 | 4-obj | Return the observed result from a bounded attempt helper. Drop the `observations` log. | Keep the real filesystem race, the per-attempt assertions and the final success assertion. |
| C3 | 4a | Move each factory's log into a class with `#` fields (or `createRecorder()` from `@orkestrel/test`, a scaffold dev dependency), read through the existing getters. | The returned interfaces and their copies-on-read stay as they are. Callbacks that finish inside the creating call (`tests/config.test.ts:691`, `:3468`, `tests/src/bin/main.test.ts:41-46`, `spawnSkillScript`) stay. |
| C4 | 4b | Use one `#run: DistributionRun \| undefined`, where `DistributionRun` is `{ readonly scratch: string; readonly stage: Stage \| undefined }`, declared in the emitted file. `start` throws while `#run` is set and publishes the run once. `destroy` removes `run.scratch` and clears `#run`. The getters narrow. | The refusal, the release in `destroy`, the rebinding after `destroy` (`templates.test.ts:2034-2067`) and `requireStage`'s skip on an unreachable registry. |
| C5 | 5 | Record the `ReadAllowance` interface-to-class retype in the release evidence: this verdict, the handoff and the commit message. | No code change. |
| C6 | 2b, 6 | See the four rows below. | Keep the planted `resolvePinnedBrowser` and `LICENSE` controls. Keep the rejection of an undeclared return change and a changed hash. |
| C6.1 | 2b | Compare raw target bytes for every artifact, host files hydrated from the data root. Attribute each differing span to a declared region. | |
| C6.2 | 6a, 6b | Keep enclosing control flow and call arguments in the region reading. Replace the whole-block `describe`, `beforeAll` and `afterAll` declarations with the approved leaves. | |
| C6.3 | 6c | Fail an absence that no explicit approved addition or removal names. | |
| C6.4 | 6d | Measure the fixtures so the case lands exactly on the allowance and one byte over, and assert outcomes and request counts. | |
| C7 | 7 | Restore a split-byte UTF-8 proof through `GitQuery.read()`, distinguished by the `stream: false` mutation. If no input reaches the boundary deterministically, record the gap at `src/bin/GitQuery.ts:124-125` as `tests.md` § Untestable directs. | Keep the intake private. The `findGitRefusal` threshold proofs stay. |
| C8 | S1 | Append the `node_modules` and `.git` exclusion at the rule, guide and comment sites, and correct the constants remark. | No selector change. |

Closing: C1–C4, C7 and C8 adopt the lanes' prescriptions, so each closes with a mutation probe (the reconcile rule for
a verbatim fix). C6 closes when the repaired instruments run clean and their new controls fail as designed, which also
settles 2b.
