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

## Added after the round (2026-10-18)

- **C9: count-only recorders in scaffold's tests.**
  - **Source.** Agent round 2's falsify ruled that count-only recorders are banned in tests too. The grounds are
    `running.carriers` and `logs.reads`, whose draft-4 example is a test that "reads only its length", and census item
    N6's `toHaveLength(` signature. Ruling: `.orkestrel/agent/agent-r2-audit-verdict.md` § Rulings added during the
    fix round.
  - **Why the census missed them.** Scaffold's census and both round-3 lanes missed this class, because the census
    signatures never matched recorders.
  - **Fix.** Sweep scaffold's own tests under the declaration-site rule (`agent/tmp/units/agent-r2-fix-fs-brief.md`).
    Candidates include `tests/src/server/Upstream.test.ts:68`, `:282`, `:441` and `:610`, and
    `tests/src/server/Materializer.test.ts:515` and `:588`.
  - **Bound.** No emitted template declares a recorder, so emission is unchanged. `tests/config.test.ts` is vendored,
    and its one `createRecorder` text is a code string in a case table.
- **Close-out gates for C and C-instruments: GATE PASS.** Verifier workflow `wf_5f39527e-88f`, outputs in
  `agent/tmp/units/scaffold-fix-c-verify-*.txt`.
  - The build moved four host digests (`launch.ts`, `workspace.md`, `guides/scaffold.md`, `tests/setupPolicy.ts`).
  - Instruments: behaviour 112 cases, 5 declared deviations, 11 approved absences; emission 331 blueprints and 278
    declared regions, with LICENSE equal as hydrated bytes. All nine controls fail as designed.
  - `npm test`: src:core 500, src:server 498, src:bin 333, policy 121, config 236, setup 282, skills 108, guides 47.
  - `test:templates` 64, `test:distribution` 11, `check:skills` and discovery clean.
- **C9 result (native Workflow `wf_eaf21bbd-c18`). Accepted.**
  - The census found count-only recorders in two files: `tests/src/server/Upstream.test.ts` and
    `tests/src/server/Materializer.test.ts`.
    - Upstream: the destroy, error, release (read by last entry), mirror and file listeners.
    - Materializer: the error and destroy listeners.
  - Each now asserts its whole history. The independent checkers passed Upstream 62 of 62 and Materializer 63 of 63,
    with nothing removed or weakened.
  - A `mirror` payload mutation that the old `count` passed fails the converted assertion.
  - Everything else is lawful by declaration site. That includes `createSink` and the server fixtures in
    `tests/setupServer.ts`, and inert `createRecorder().handler` callback values.
- **Falsify round 4.** One Astra lane, claims `agent/tmp/units/scaffold-fix-c-claims.md` 1–10 (C9 included).

## Falsify round 4 verdict (2026-10-18)

The lane was GPT-6 Astra xhigh, T3 `scaffold-fix-c-falsify-astra-1`. Its report is
`agent/tmp/units/scaffold-fix-c-verdict-objective-1.md`: FAIL 1, 5, 6, 7, 8, 10; outside the claims: none. The
Orchestrator reproduced every BROKEN finding by reading against `1f2eed70e`.

1. **Wording only, no code change.** Normalization runs before any side effect, and the timer is necessarily armed
   after the spawn it bounds. The claim said "arms … before any side effect", which overstated it. C1's ruling, which
   asked for normalization before side effects, is met.
2. **CONFIRMED** (C2, by reading).
3. **CONFIRMED** (C3).
4. **CONFIRMED** (C4).
5. **UNRESOLVED (C7), settled by the route C7 allows.**
   - The mutation corrupted 13 records on this host, but the process transport leaves chunk boundaries to the host,
     so no input can force a split through `read()`.
   - Record the untestable boundary at `src/bin/GitQuery.ts:124-125`, as `tests.md` § Untestable directs. Keep the
     test, which catches the mutation whenever the host splits a sequence, and narrow the claim to that. Fix: D3.
6. **BROKEN, reproduced.** The vendored comment at `tests/config.test.ts:658-660` states the studies population with no
   exclusion. Fix: D1.
7. **BROKEN, reproduced.** The whole-file approval of `tests/setupPolicy.ts` hid two behaviour changes that no
   authority approves:
   - **7a.** `inspectPolicyConfiguration`'s overrides check at `:689` uses `flatMap`, which skips holes, where the
     baseline's `for…of` reported "override entries must be records".
   - **7b.** `readPolicyPackage` at `:2116` moved `readFileSync` outside the baseline's read-and-parse `try`, so a read
     failure now throws.
   - **The systemic cause.** The behaviour instrument's inventory covers `src`, `configs`, `.agents/skills` and
     `vite.config.ts`, and never covered the vendored helper module `tests/setupPolicy.ts`. Its emission approval was
     whole-file, so no reviewed change bound it.
   - The same hole class appeared in Agent (H1, R1, R5). So scaffold's chain rewrites get a differential hole sweep
     too, not only the reproduced site. Fixes: D1, D2, D4.
8. **BROKEN.** It follows from 7: the hydrated emission carries both regressions into every target.
9. **CONFIRMED** (C9).
10. **BROKEN.** It follows from 5–8.

### Round 4 fix results

- **D1. Accepted** (T3 `scaffold-fix-d1-sonnet-1`).
  - **The differential harness.** It ran `tests/setupPolicy.ts` and `configs/policy.ts` against the staged
    `1f2eed70e`, after confirming the staged copies are byte-equal to the git blobs. The final run made 82 655
    observations with 0 mismatches; the first run had 143.
  - **The fixes.**
    - **7a:** a spread over `overrides`.
    - **7b:** a new `readPolicyJSON(path)` puts the read and the parse inside one catch boundary.
    - **Item 6:** the `config.test.ts:658-661` comment.
    - **Sweep:** `inspectPolicyMirrorPaths`; `inspectPolicyFilenamePaths` (`Array.from`); `inspectPolicyWiring`'s
      `rules` and `populations`; and `matchesSkillToken`, whose `split` rewrite lost overlapping matches when the name
      contains `$`, restored with start-index `startsWith`.
  - **The 7b control.** The directory control the brief prescribed does not discriminate, because `isPolicyFile`
    refuses a directory before any read. D1 used a real read denial instead: the setup helper `denyPolicyRead`, with
    `icacls` on Windows and `chmod 0` elsewhere, skipping under POSIX root. It asserts that the denial takes effect
    first.
  - **Proofs.** Before the fixes 6 of 9 failed; after them 10 pass. Reverting each fix fails exactly its named test.
    `setupPolicy.test.ts` passes 124 and `policy.test.ts` 121.
  - **Expected until the build.** `config.test.ts`'s host-inventory check fails, because two vendored files changed.
    The build regenerates `host.json`.

- **D2 and D3. Accepted** (T3 `scaffold-fix-d2-sonnet-1`).
  - **The differential harness.** For every array, at every depth, it built hole-first, hole-middle, trailing-hole,
    hole-only and hole-pair variants, and compared them against the staged `1f2eed70e`.

    | Area | Cases |
    | --- | --- |
    | core | 6930 |
    | bin | 207 |
    | server helpers | 117 |
    | configs | 87 |
    | setup | 42 |
    | dispatch | 47 |
    | Compiler | 108 |
    | Upstream | 21 |
    | Materializer | 337 |

    Apart from the fixed sites, every case matched. "Text only" `TypeError` message differences count as matches.
  - **28 hole sites fixed and mutation-proved:**
    - `compilers.ts`: dev dependencies; config, source and test artifacts; `planToFindings`; `dependenciesToQuestions`;
      `blueprintToQuestions`; `artifactsToQuestions`; `overridesToQuestions`.
    - `core/helpers.ts`: `catalogToLayers` and `planToSummary`.
    - `bin/helpers.ts`: `dependenciesToFloors`, `releasesToQuestions` and `releasesToPins`.
    - `server/helpers.ts`: `pruneEmptiedDirectories`, `readSnapshot`, `filesToHost` and `stageBytes`.
    - `WriteTransaction`: its constructor.
    - `configs/policy.ts`: `statementToPolicyBindings`, `programToPolicyDocs` (body and comments) and `reportDomain`.
    - `tests/setupServer.ts`: `buildTargetAudit` and `buildInstalledHostReplies`.
  - **Catch boundaries.** Every moved `try` matches the baseline.
  - **D3.** The untestable chunk-boundary note is at `src/bin/GitQuery.ts:127-132`, and the test claim is narrowed.
  - **Integration.** The Orchestrator applied D2's four policy-reader tests to `tests/config.test.ts` (D1's file).
    Afterwards 239 pass, and the only failure is the stale host inventory, which the build clears.
  - **Ruled not a regression.** `environmentBoundary(...).configResolved` on a partial config (`{ root }`) now throws
    where the baseline returned. Vite's `ResolvedConfig` always carries `root`, `command` and `build`, so this is
    contract-violating input only, the same as the `requireBudget` `Infinity` precedent.
- **D4. Accepted** (T3 `scaffold-fix-d4-sonnet-1`).
  - **The approvals.** `Declared.whole` is removed, so no path can be approved whole. The three vendored test files
    now carry approvals by region, by exact hunk and by rename, each naming its authority.
    - `tests/policy.test.ts`: 2 exact hunks.
    - `tests/setupPolicy.ts`: 109 region rows, each bound to an inventory row, and 18 exact hunks.
    - `tests/config.test.ts`: 73 exact hunks and 71 renames.
  - **How renames are judged.** Both sides are compared as TypeScript tokens, so a changed comment is never a rename.
  - **The behaviour inventory.** It now covers `tests/setupPolicy.ts`, growing from 248 rows over 27 paths to 289 over
    28. It adds 47 sparse cases and 38 policy cases, including a real read denial.
  - **Results.**
    - **Behaviour:** 197 cases, exit 0. There are 19 declared differences:
      - the 5 existing ones;
      - 14 hole rows, `artifactsToQuestions` and planned `overridesToQuestions`, where both trees throw `TypeError` and
        only V8's message differs. Each row is declared on its own.
    - **One-sided:** 19 cases, the 11 existing absences plus 8 new `policy.helper.*` functions.
    - **Against `615ae1b72`:** run there, every D1 and D2 site differs, so the instruments see the regressions round 4
      found.
    - **Plants:** 14 of 14 exit 1.
  - **Harness change.** `stage.ts` copies the checkout's `dist` into the staged baseline. The baseline had none, so one
    control read a missing declaration there.
  - **Emission.** One hunk was unapproved: a rename had leaked into a comment at `tests/config.test.ts:4004`, "The
    POLICY_ROOT project". The Orchestrator restored "The root project". A search finds no other comment with a leaked
    rename.
  - **The emission re-run exits 0:** 331 blueprints, 459 differing regions, all approved, and `LICENSE` equal as
    hydrated bytes in all 331. The log is `agent/tmp/units/scaffold-fix-d4-emission.log`.
- **Build and gates after round D** (Haiku, T3 `scaffold-fix-d-verify-haiku-1`; logs
  `agent/tmp/units/scaffold-fix-d-verify-*.txt`).
  - **The build exits 0.** `host.json` regenerated: its diff against HEAD went from 5 insertions and 5 deletions to 7
    and 7.
  - **Passed:**
    - `lint:check` and `check`;
    - `test:templates`: 64;
    - `check:skills`;
    - `test:distribution`: 11 plus 1 skipped;
    - discovery: config 240, setup 296, skills 108, guides 47, policy 121.
  - **Failed, and not because of the subject.** `format:check` and the policy test failed only on the untracked
    `PARALLEL.md` in the repository root, which the gates scan. There was one formatting finding and four `prose`
    findings: three in this session's sections, and one, "Please reply below", in the Veneer opener.
  - **Repaired.** The Orchestrator reformatted the file, reworded the four phrases, and left a note there for the other
    session.
  - **The re-run** (`scaffold-fix-d-verify-6-*.txt`; the first run's `npm test` had stopped at `test:policy`, because
    its script chains with `&&`).
    - **`format:check` exits 0.**
    - **`npm test` exits 0:**

      | Project | Passed | Skipped |
      | --- | --- | --- |
      | src:core | 519 | |
      | src:server | 503 | 12 |
      | src:bin | 336 | |
      | policy | 121 | |
      | config | 240 | 1 |
      | setup | 296 | 3 |
      | skills | 108 | |
      | guides | 47 | |

    - **Every gate is green.**
  - **Round 5 is dispatched.** Both lanes run from `agent/tmp/units/scaffold-fix-d-falsify-brief.md`:
    - objective, Astra xhigh, T3 `scaffold-fix-d-falsify-astra-1`;
    - subjective, Opus high, T3 `scaffold-fix-d-falsify-opus-1`.
  - **The timestamp change the verifier flagged** was this session's own: the 16:10 append noting the build, and the
    16:14 correction of its time. Nothing else changed the file.
## Falsify round 5 (2026-10-18)

### Objective lane: FAIL 2, 3, 4, 6, 7, 8, 9

The lane is GPT-6 Astra xhigh, T3 `scaffold-fix-d-falsify-astra-1`. Its verdict is
`agent/tmp/units/scaffold-fix-d-verdict-objective-1.md`.

1. **CONFIRMED (7a).** 127 sparse `overrides` arrays matched `1f2eed70e`, and removing the spread fails the
   exact-array proof.
2. **BROKEN.**
   - `denyPolicyRead`'s Windows restore at `tests/setupPolicy.ts:263`, `icacls /remove:d <user>`, also strips deny
     entries that existed before. Its POSIX restore at `:268` sets a hard-coded `0600`, not the original mode.
   - The read-and-parse catch itself holds: the checkpoint throws `EPERM`, while the baseline and the worktree return
     `undefined`.
3. **BROKEN, laziness.**
   - `inspectPolicyMirrorPaths` at `:610` and `inspectPolicyWiring`'s populations at `:805` spread the input before
     inspecting it.
   - With a hole and then a throwing getter, the baseline throws `TypeError` at the hole, and the worktree throws the
     getter's error.
4. **BROKEN.** `compilers.ts:3624`, `artifactsToQuestions`, and `:3710`, the planned map in `overridesToQuestions`,
   read past a hole.
   - The constructor matches, but the effects differ.
   - So "message-only" is not sound, and the tests at `compilers.test.ts:4744` assert only `toThrow(TypeError)`.
5. **CONFIRMED.** Vite's `ResolvedConfig` guarantees `root`, `command` and `build` before `configResolved` runs.
6. **BROKEN.** `guides/scaffold.md:666` still states the studies population without the exclusion. D3's note holds.
7. **BROKEN, the instruments.**
   - The rename judgment compares spellings without resolving bindings. It approves a changed property, a changed
     binding, and an elision dropped by the comma filter.
   - `drive.ts:231` approves any observation whose case id is in `DEVIATIONS`, even a success replacing a throw.
8. **BROKEN.** It follows from 3: the hydrated `tests/setupPolicy.ts` (`host.json:1192`, `7b188a88…`) carries the
   eager copy.
9. **BROKEN.** It follows from the rest.

### Subjective lane: FAIL 2, 4, 6, 7, 8, 9

The lane is Claude Opus 5.5 high, T3 `scaffold-fix-d-falsify-opus-1`. Its verdict is
`agent/tmp/units/scaffold-fix-d-verdict-subjective-1.md`, and its 37 citations resolve.

- **Agreed with the objective lane:**
  - claim 2's restore defect, at both `:263` and `:268`;
  - claim 6b, the line-666 sentence;
  - claim 7b, the rename judgment. Its probe approved `scope.root` → `scope.POLICY_ROOT` and an object key
    `root:` → `POLICY_ROOT:`, which drops Vite's root;
  - claims 8 and 9.
- **New findings:**
  - **6a.** `tests/src/bin/GitQuery.test.ts:22-23` claims every boundary inside a path splits a UTF-8 sequence. A
    boundary between characters splits none. In 76-byte records, 24 of 74 interior offsets split nothing. Under
    64 KiB chunks, 13 of 23 boundaries split one, which matches round 4's 13 corrupted records.
  - **7a.** `judge.ts:85` approves any leafless hunk inside a declared region. That covers every comment in a
    region-approved `tests/setupPolicy.ts` function, and every line under an approved guide heading.
    - It approved a comment planted inside `inspectPolicyWiring`, and the deletion of `readPolicyPackage`'s
      `isPolicyFile` guard.
    - `guides/scaffold.md:666` reached every target through the whole-heading approval of `### Baselines` at
      `declared.ts:212`.
  - **4, wording.** "Same throw site" is false. V8's message names the throwing expression, and the 14 rows show
    `path` against `origin`, and a `Map`-entry refusal. The criterion should read: same constructor, no return, and
    the same effects before the throw.
  - **ADVISORY.** `matchesSkillToken` allocates an index array as long as the prompt on every call.
- **Held:** claims 1, 3, 5, 7c, 7d, 7e and 7f. Every `host.json` digest and every `dist/host` file equals its source,
  across all 199 entries.
- **Divergence on claim 3.** The subjective lane tested holes only. The objective input, a throwing getter after a
  hole, is what tells an eager copy from lazy iteration, so the subjective CONFIRMED does not answer it. Reproduction
  f3 settles it.

### Reproductions (native Workflow `wf_e5417653-afc`, Sonnet, one agent per finding)

Every finding reproduced, and three are wider than stated.

- **f2, permissions: reproduced.**
  - **Windows, by probe.** A pre-existing `(DENY)(W)` is removed by `restore()`, and the write that failed now
    succeeds. The control with no earlier deny restores correctly.
  - **POSIX, by reading.** The restore hard-codes `0o600`, so the test's `0o644` scratch file is left at `0o600`.
  - **Also found:** `tests/src/server/WriteTransaction.test.ts:446-451` restores a hard-coded `0o700`. That predates
    the chain, and its scratch directory is destroyed afterwards, so it is minor.
  - `denyPolicyRead` is new in the chain.
- **f3, policy laziness: reproduced, and wider.**
  - **The named sites.** A hole followed by a throwing getter makes the baseline throw `TypeError` with an empty
    read log. At `inspectPolicyMirrorPaths` and at `inspectPolicyWiring`'s populations, the worktree reads index 1 and
    throws the getter's error.
  - **The same shape at two more sites:** `inspectPolicyConfiguration`'s `overrides` spread at `:756`, and
    `inspectPolicyWiring`'s `[...rules]` at `:802`. They show it when entry 0 itself throws: a throwing proxy, or a
    `Symbol`.
  - **Held:** `inspectPolicyFilenamePaths` (`Array.from` with a mapper).
- **f4, compiler laziness: reproduced, and wider.**
  - **The named sites.** At `artifactsToQuestions` and `overridesToQuestions`, the baseline throws `TypeError` at the
    hole with an empty log. The worktree reads index 1, and in throw mode it throws the getter's error.
  - **The same failure at 14 or more of D2's 28 sites:**
    - `blueprintToDevDependencies` (peers), `planToFindings` and `dependenciesToQuestions`;
    - `blueprintToQuestions`: extensions, axes, extras and dependencies;
    - `releasesToQuestions`, `pruneEmptiedDirectories` and `filesToHost`;
    - `statementToPolicyBindings`, `reportDomain` and `programToPolicyDocs`. For `programToPolicyDocs`' comments, the
      baseline never reads them;
    - `compilers.ts:3281` `[...dependencies]`, which was not probed.
  - **A read count differs only:** `readSnapshot`, `buildInstalledHostReplies` and `blueprintToConfigArtifacts`.
  - **Held:** the `Array.from` sites, `catalogToLayers`, `releasesToPins` and `WriteTransaction`'s constructor.
  - **Also:**
    - `planToSummary` carries a stale "spread" comment.
    - Every D2 hole test uses a trailing-hole fixture and asserts only `toThrow(TypeError)`.
- **f6, docs: reproduced, and wider.**
  - `guides/scaffold.md:196`, the `STUDIES_TEST_INCLUDE` row, and `:1716` also omit the exclusion.
  - `tests/guides.test.ts:397-404` pins exactly two occurrences of the exclusion phrase (`split(…).toHaveLength(3)`),
    so it cannot detect the gap, and it would fail on a verbatim fix.
- **f7, instruments: reproduced.**
  - **(a)** `config.root` → `config.POLICY_ROOT`, and a local `root` → `POLICY_ROOT`, are both approved. The controls
    are refused.
  - **(b)** The elision is dropped only in a hunk that also carries a declared rename.
  - **(c)** A success, or a `RangeError`, replacing the `TypeError` is still approved.
  - **The same holes elsewhere.**
    - Every id-only `DEVIATIONS` row has the (c) hole.
    - The `publishes` and `extractorPath` pairs have the (a) hole.

- **6a: reproduced** (native Workflow `wf_48b33d44-363`).
  - Of the 74 offsets inside a 76-byte record's path, 24 split no sequence.
  - At offset 3, decoding with `stream: false` is exact, so the mutation goes uncaught there. Offsets 1, 2 and 4
    corrupt the record.
  - Of 23 boundaries at 64 KiB, 13 split a sequence, and the first three do not.
- **7a: reproduced** (`wf_48b33d44-363`). Each of these was approved on its region alone:
  - a comment planted inside `inspectPolicyWiring`;
  - the deletion of `readPolicyPackage`'s `isPolicyFile` guard;
  - the new sentence at `guides/scaffold.md:666`, through the `Baselines` region at `declared.ts:212`, with
    `approvalsOnRow: 0`.

  The control, the same comment inside a `describe`, is refused.

### Fix round E

- **Checkpoint.** `61acbceb3`, "Checkpoint the Bindings fix chain before fix round E". It holds the 33 tracked files of
  C, C9 and D1–D4, and `PARALLEL.md` is excluded. It gives the instruments a defective revision to tell apart from the
  fix.
- **The brief:** `agent/tmp/units/scaffold-fix-e-brief.md`.
- **E1** (T3 `scaffold-fix-e1-sonnet-1`), running. It covers:
  - `denyPolicyRead`'s exact restore: the ACL saved and restored, the POSIX mode read with `stat`, and a pre-existing
    deny that must survive;
  - lazy per-entry consumption in the four policy readers;
  - `matchesSkillToken`'s allocation;
  - the studies population at `guides/scaffold.md:666`, `:196` and `:1716`, with a guard that replaces the exact-count
    one.
- **E2** (T3 `scaffold-fix-e2-sonnet-1`), running. It covers:
  - lazy per-entry consumption at every reproduced site in `src/**`, `configs/policy.ts` and `tests/setupServer.ts`,
    with read counts matching the baseline;
  - pins that assert the read logs;
  - `planToSummary`'s comment, the GitQuery test comment (6a), and `WriteTransaction.test.ts`'s mode restore.
- **E1: accepted, with three follow-ups.**
  - **The sites.**
    - `inspectPolicyMirrorPaths`, `inspectPolicyConfiguration`'s `overrides`, and `inspectPolicyWiring`'s `rules`,
      `populations` and override entries all become `Array.from(input, mapper).flat()`, with the per-entry work inside
      the mapper.
    - `matchesSkillToken` becomes `prompt.matchAll(/\$/gu).some(…)`, which is lazy and drops the index array as long
      as the prompt. It still allocates an iterator and its match results; "allocates nothing" was corrected by the
      closure check.
    - `denyPolicyRead` restores exactly, through the new `runPolicyCommand` and `readPolicyPermissions`, with a check
      after the restore.
    - Guide lines `:666` and `:1716` now carry the exclusion. A `collectGuideStatements` guard replaces the
      exact-count one. It failed on the checkpoint text before the fix: 1 failing, 46 passing.
  - **Proofs.**
    - **Differential.** 95 of 120 scenarios match `1f2eed70e`. The control against `61acbceb3` differs on 52 rows.
    - **`matchesSkillToken`.** 4 000 032 pairs, 0 mismatches.
    - **Mutations.** 8 each fail. One mutation of `overrides` needed a new shape, `refusalFirst`, before it failed.
    - **Projects.** setupPolicy passes 171 plus 1 skipped, policy 121 and guides 47, and `check` exits 0.
    - **One failure, expected.** `test:config`'s host inventory is stale until the build.
  - **Ruled.**
    - **The Windows restore, accepted.** `icacls /restore` exits 1300 on a standard token, which lacks
      `SeRestorePrivilege`. So the deny goes through the Everyone SID, `*S-1-1-0`, and the restore removes only that
      principal's deny entries. A check after the restore throws unless the permissions equal the state before. A
      pre-existing user deny survives, and a pre-existing Everyone deny fails loudly.
    - **The POSIX paths** are proved by reading only. This is a Windows host.
    - **The type-laundering seam in `POLICY_LAZY_CASES`, accepted.** Its refusal producer returns a wrong-typed entry
      through `Object.getOwnPropertyDescriptor(…)?.value`. It is the only way to build a refused entry, and it sits in
      test infrastructure.
    - **`matchesSkillToken`'s allocation** is pinned by the differential only, because behaviour cannot show it.
  - **Ruled: the equivalence contract, stated from now on.**
    - **Inside it:** every value within the declared parameter types. That includes holes, entry getters (count and
      order), throwing entries, an array whose `Symbol.iterator` is missing or replaced, and iterator `return()`.
    - **What must match:** the outcome (the return, or the thrown constructor), the entry reads, and the effects
      before a throw. A message may differ only where the throwing expression differs, and each such row is named.
    - **Outside it:**
      - values outside the declared types, such as a number or a plain array-like where an array is declared;
      - Proxy traps other than element `get` and `Symbol.iterator`, such as `has`, `constructor`, `length` and method
        lookups;
      - the order in which a record's own properties are read, provided each is read as many times as before and no
        outcome changes;
      - global prototype tampering.
    - **E1's rows under the contract.**
      - The 12 rows for numbers and plain array-likes are outside it.
      - So are the 12 Proxy-only `config-ignore` rows and `config-proxy-order`.
      - The missing-`Symbol.iterator` class is inside it, as at Ollama's `extractTools`.
  - **Follow-ups.**
    - **E2b**, after E2. Every caller-supplied `Array.from(source, mapper)` from E1 and E2 must throw as `for…of` did
      on an array whose iterator is missing. `Iterator.from(source)…toArray()`, or a `yield*` wrapper, satisfies it.
      The fleet's engine floor is Node ≥ 22.12.
    - **The Orchestrator, after E2:**
      - change the first sentence of the doc block at `src/core/constants.ts:454` so it carries the exclusion;
      - resync `guides/scaffold.md:196` with `test:guides -- --to guide`;
      - extend E1's guard to table rows.
- **E2: accepted, with follow-ups to E2b.**
  - **The sites.** Every reproduced site reads its elements lazily, through `Array.from` mappers or iterator folds. E2
    also fixed four sites outside the brief: `blueprintToTestArtifacts`, `replaceManifestScripts`, the `src` and `app`
    maps in `blueprintToScripts`, and a read-ahead of the floor entries in `filesToHost`.
  - **The small fixes:** `planToSummary`'s comment, the GitQuery test comment (6a), and `WriteTransaction.test.ts`'s
    exact mode restore.
  - **Proofs.**
    - **Differential.** Against `1f2eed70e`, 0 mismatches over 3 822 cases. Against the checkpoint, 320 mismatches.
    - **Pins.** They pass on the baseline tree and fail on the checkpoint: compilers 21 against 20, core helpers 2
      against 1, bin 3 against 1, and server 4 against 4.
    - **Mutations.** Each fails, except one equivalent mutant: the last extras pass in `blueprintToQuestions`, whose
      list the earlier passes already refused.
    - **Checks.** `check` exits 0, and src:core passes 542 and setup 343. Eight failures in server, bin and config are
      the stale host inventory, which the build clears.
  - **Ruled: the equivalence contract is refined.**
    - **Element-level reads stay fully in contract:** which indices are read, in what order and how often; the missing
      iterator; and iterator `return()`. The outcome and the effects before a throw must match.
    - **Properties of an entry:** the outcome must match for any entry whose own getters are pure, meaning the same
      value on every read and no side effect.
    - **A throwing entry** must throw the same constructor, but the number of property reads before the throw is out of
      contract.
    - **The count and order of an entry's property reads** are out of contract.
    - **So:** E2's deviation 1 (fewer or reordered `artifact.path` reads, and `releasesToQuestions` building its
      messages later) and deviation 2 (the scripts family throwing the same constructor after fewer reads) are
      accepted.
  - **Accepted:**
    - E2 uses iterator helpers in scaffold `src/core` (`values().some`, `reduce`, `next`), which the engine floor of
      Node ≥ 22.18 supports;
    - some read-count pins also count passes made by `RootTsconfig`, `RootVite` and `blueprintToFaces`, so they are
      brittle, and that is recorded;
    - the `config.test.ts` pins use E1's `createPolicyLazyCases` and `POLICY_LAZY_SHAPES` from the vendored set.
  - **To E2b:**
    - **The missing-iterator class.** It covers every caller-supplied `Array.from(source, mapper)` from E1 and E2,
      and every `source.values()` site. `values()` still iterates an array whose `Symbol.iterator` was removed, where
      `for…of` threw.
    - **E2's `buildInstalledHostReplies` pin row,** which belongs in `tests/setupServer.test.ts`.
    - **E2's helpers in `tests/setupServer.ts`:** `createObservedList`, `refuseRead`, `refuseObject`, `refuseText`,
      `readLazily` and `buildLazyCase`. They move to `tests/setup.ts` where they are host-independent, with proofs.
    - **The Orchestrator's `:196` item:**
      - the first sentence of the doc block at `src/core/constants.ts:454`;
      - the resync of the guide cell;
      - the guard extended to table rows.
- **E2b: accepted, with three in-contract residuals sent to E2c.**
  - **The iterator protocol.** 52 sites now consume through `Iterator.from(source)…`, or a direct `[Symbol.iterator]()`
    for `filesToHost`'s hand steppers. A missing iterator throws `TypeError` with the baseline's read log, and a
    replaced iterator is honoured.
    - **Differential.** Against `1f2eed70e`, 261 rows: 205 the same, 42 message-only (the `[missing]` shape, where the
      message reads "undefined is not a function"), and 14 different (the residuals). Against the checkpoint, 98
      differ.
    - **Pins.** 22 in compilers, 2 in core helpers, 2 in bin, 5 in server, the config rows, and new vendored shapes.
      Both mutations fail them: the earlier `Array.from` forms, and `values()`.
  - **The other items.**
    - **The `buildInstalledHostReplies` pin.** Its hole row fails under the checkpoint's eager form.
    - **The lazy-proof helpers** moved to `tests/setup.ts`, with proofs. `refuseText` is now built on `readProperty`
      from `@orkestrel/test`, and `createObservedList` on `buildSparse`.
    - **The `:196` population sentence** is fixed in the `constants.ts` TSDoc and resynced. The guard now reads table
      cells, and it failed on the checkpoint text first: 1 failing, 46 passing.
  - **Checks.** `check` exits 0. src:core passes 567, setup 358, policy 121 and guides 47. Eight failures are the stale
    `host.json`.
  - **The residuals, ruled inside the contract.**
    - `blueprintToScripts` pre-reads elements, through a hoisted `.map` over `app` (`[0,1]` against `[0,1,0,1]`).
    - `blueprintToConfigArtifacts` and `blueprintToTestArtifacts` return different values on 10 rows, with the same
      reads. A different return is an outcome.
    - `filesToHost`'s steppers never call `return()` on an early stop.
  - **E2c** (`tmp/units/scaffold-fix-e2c-brief.md`, T3 `scaffold-fix-e2c-sonnet-1`) fixes these. It first identifies
    the 10 value rows, because a dense row among them would mean the emission regressed. It adds a seventh shape to
    the differential, an observed `return()`.
- **E2c: accepted.**
  - **The fixes.**
    - **`blueprintToScripts`.** The `test:src` and `test:app` aggregates are inlined, so the element reads match the
      baseline's, and the `app` missing-iterator case reads `[0,1]` again.
    - **`blueprintToWritableScripts`, found by the widened differential.** A hoisted `faces` read `extensions` 5
      times against the baseline's 30. It now calls `blueprintToFaces` once per script.
    - **`filesToHost`.** Both passes step `Iterator.from(list)` with a step for each element and a terminal step. They
      close through `take(0)` on an early exit or a throw, the body's own error winning, and leave the iterator
      unclosed on exhaustion.
    - **`dependenciesToFloors`, new.** It read past the first range with no version and never closed its iterator. It
      now uses the same form.
  - **The differential:** 8 170 rows over ten shapes, including an observed `return()`, a `return()` that raises or
    answers a non-object, and a list that serves one iterator.
    - **Against `1f2eed70e`, with the worktree's `templates.ts` swapped in:** 8 039 the same, 112 message-only, and
      19 different. Those 19 are only `insertManifestSection` and `extractPolicySection`, which the baseline lacks.
    - **Against the checkpoint:** 764 rows differ.
  - **The pins.** A new `createClosableList` in `tests/setup.ts`, with proofs. Every pin passes on the baseline and
    fails on the checkpoint, and nine mutations each fail.
  - **Checks.** src:core passes 571, setup 361, policy 121 and guides 47. The 8 stale-`host.json` failures remain.
  - **Ruled: the 10 value rows are approved emission, not regressions.**
    - The differing returns are emitted text: `vite.config.ts` in 5 hunks (the studies project and `mergeOverride`),
      and `tests/distribution.test.ts` in 33 hunks (round C's `DistributionSuite` and the Bindings rewrites).
    - All of it comes from `src/core/templates.ts`, which no E unit touched. Swapping that one file into the baseline
      leaves 0 differing rows.
    - E3 approves the hunks by exact hunk, each with its authority.
  - **Coverage gap.** The class methods converted before round E (`Materializer`, `CLI`, `Upstream`,
    `WriteTransaction`, `GitQuery`, `Compiler`) have no differential rows. E3 adds behaviour cases for them and reports
    any finding.
  - **Incident, repaired.** E2c rewrote `tests/src/server/helpers.test.ts` with PowerShell `Get-Content` and
    `Set-Content`, which produced mojibake and a BOM, then repaired it. The Orchestrator verified it: no BOM, no
    mojibake, no U+FFFD, and the checkpoint's non-ASCII characters plus 3 added `…`.
- **E3: accepted, with one finding, F1, which the Orchestrator fixed.** The report is
  `agent/tmp/units/scaffold-fix-e3-report.md`.
  - **The instruments.**
    - Renames are judged by binding, through the installed `typescript` binder. Property, key, shorthand and
      specifier positions are refused, and so is a binding that does not resolve to its module-level declaration.
    - Elisions are kept.
    - A region approval covers leafless code only. For `tests/setupPolicy.ts` it must also be `sourced`: the emitted
      declaration equals the checkout's own.
    - Deviations are judged by exact shape. Each row masks one field, and a stale entry fails the run.
    - There are 217 exact-hunk emission approvals, each with an authority and none without.
    - The behaviour cases grow from 197 to 1099: 890 lazy cases over 89 sites and ten shapes, the 15 class-method
      sites included.
  - **Plants:** 17 emission plants (7 new) and 6 behaviour plants (2 new) each exit 1. The 7 controls and 2 twins
    judge as designed.
  - **Discrimination.** Against `61acbceb3`, 265 of 890 lazy cases differ, across 49 of 89 sites, and every E1–E2c
    site is among them. Against `1f2eed70e`, the cases match apart from the declared rows and F1.
  - **Class methods:** `WriteTransaction`, `Materializer`, `Upstream`, `GitQuery`, `CLI` and `Compiler` show no
    finding.
  - **F1.** `inspectPolicyConfiguration`'s `ignorePatterns` (`tests/setupPolicy.ts:1184`) used `Array.prototype.flatMap`.
    So a list without an iterator returned where the baseline's `for…of` threw `TypeError`, and replaced or closing
    iterators were bypassed: 6 undeclared rows. No E unit had named the site.
    - **The Orchestrator's fix:** `Iterator.from(…).flatMap(…).toArray()`, the form its sibling `overrides` branch uses.
    - **A pin:** an `inspectPolicyConfiguration ignorePatterns` group in `POLICY_LAZY_CASES` (7 shapes; the reader skips
      every non-string, so it has no refusal row).
    - **The pin, before and after.** It failed on the defective form at its `unlisted` row, where it returned instead
      of throwing `TypeError`. After the fix, setupPolicy passes 184 plus 1 skipped.
    - **Approvals.** The emission run flagged exactly the two edited regions, `inspectPolicyConfiguration` and
      `POLICY_LAZY_CASES`. `approve.ts` rebound them with their round-E authority, 217 approvals with 0 lacking an
      authority. After `oxfmt`, only those two hunk texts changed in `approvals.hosted.ts`.
    - **The reruns.** `--emission` exits 0. `--behaviour` exits 0, with 53 differing rows, all declared. F1's
      `missing` row now differs only by message, under the declared `^lazy\..*/missing$` row, and its other five rows
      match exactly.
  - **Build and gates, all exit 0** (`agent/tmp/units/scaffold-f1/gates/`):
    - format, lint, `check` and the build;
    - src:core 571, src:server 519, src:bin 345, policy 121, config 280, setup 368, skills 108, guides 47, templates 64
      and distribution 11.

    The stale-`host.json` failures are gone.
- **The closure check (exit rule): FAIL 3 and 4, on one blocking `src` defect, B1** (Astra, T3
  `scaffold-closure-astra-1`, `agent/tmp/units/scaffold-closure-verdict-1.md`).
  - **Closed,** each by a named mutant:
    - 1, the permission restore, exercised by a real Windows deny;
    - 2, policy laziness with F1 (restoring `flatMap` fails exactly F1's pin);
    - 5, the studies population;
    - 6, the GitQuery comment;
    - 7, the instruments (all 23 plants and both twins replayed);
    - 8, the 217 approvals;
    - 9, the hydrated host (all 199 entries);
    - 11, the class methods.

    The regression spot-check holds: 127 sparse-override patterns, and the read catch.
  - **B1.** E2c's three hand-steppers budget `length + 1` steps: `dependenciesToFloors` (`src/bin/helpers.ts:560`),
    and `filesToHost`'s two passes (`src/server/helpers.ts:1462` and `:1494`). So a replaced iterator that yields more
    entries than `length` is truncated.
    - Over a zero-length array whose iterator yields two dependencies, the baseline returns both and the worktree only
      the first.
    - Over the same array, with one path yielded twice, `filesToHost` holds the first row's bytes, not the last's, and
      its digests differ.
    - The ten shapes never separated yield count from `length`. The reproduction is
      `scaffold/tmp/probes/closure-check/review.test.ts`.
  - **Follow-ups.**
    - Item 10's wording, which was in this record, not in source. It is corrected above.
    - E3's instrument notes: bind the `configs` regions to their sources, and the older lint debt.
  - **Ruled.** B1 touches published `src`, so it blocks.
    - **The repair:** one exported generic generator in `src/core/helpers.ts`, whose body is the baseline's own
      `for…of`. It yields each mapped value through the first refusal, which gives exactly the loop's iteration, close
      and precedence semantics. It replaces all three steppers.
    - **The class proof:** two cardinality shapes added to the behaviour differential across all 89 sites, so the whole
      class is checked, not only the three named sites.
    - **After it:** a narrow re-check of B1 only, then the commit.
- **Fix round F: accepted** (`agent/tmp/units/scaffold-fix-f-report.md`, T3 `scaffold-fix-f-sonnet-1`).
  - **The helper.** `iterateAnswers<TValue, TAnswer>` is in `src/core/helpers.ts`, exported, with its row in the guide's
    § Helpers. It is a generator whose body is the baseline `for…of`: it yields each answer and returns after the first
    refusal.
  - **The sites.** It replaces the three steppers. The class search found a fourth B1 site, `planToSummary`'s
    `computed`, which read `plan.artifacts.length` and now reads `origins.length`.
  - **Ruled outside the class:** `catalogToLayers`, `releasesToPins`, `Upstream#gather`, `auditToSummary` and the
    byte-budget folds.
  - **Pins.**
    - Four cardinality pins at each converted site, plus 8 `iterateAnswers` cases.
    - Before the fix, 8 failed and 7 passed. The "fewer" and "reordered" pins are regression guards that the old
      budget could not fail.
    - After the fix: src:core 582, src:bin 349, src:server 527.
  - **The differential.**
    - Three cardinality shapes (`yields-more`, `yields-refusal`, `yields-fewer`) were added across every lazy site, 270
      rows in all.
    - Against `1f2eed70e`, 0 of the 270 differ, and `--behaviour` exits 0 over 1380 cases with 52 declared rows.
    - Against `61acbceb3`, 84 differ.
    - Length-bounded control mutants differ on 12 rows.
  - **Instruments.** A `ROUND_F` authority binds the guide row, for 218 approvals. `--emission` exits 0, and all 23
    plants exit 1.
  - **The Orchestrator's verification.**
    - The first check's two B1 witnesses pass on the fixed tree.
    - The `iterateAnswers` mutants, applied and reverted with the hash checked: the eager `[...source]` fails 14 bin and
      server pins, and dropping the early `return` fails 10.
    - The closure probes are deleted (git-ignored), and `test:skills` passes 108.
    - The 2 closure-suite failures were stale text-substitution mutants of the deleted stepper. Their unmutated halves
      pass.
  - **Follow-up:** F's near-duplicate `serve` pin builders, in `tests/src/bin/helpers.test.ts` and
    `tests/src/server/helpers.test.ts`, are owed a hoist into `tests/setup.ts` with a proof (`tests.md`). It is
    test-only, and neither file is hosted.
- **The narrow re-check of F: FAIL 2, on a documentation-form rule only** (Astra, T3 `scaffold-closure-astra-2`,
  `agent/tmp/units/scaffold-closure-verdict-2.md`).
  - **Equivalence: closed.** There are 52 comparisons of the worktree functions against declarations extracted from
    `1f2eed70e`, over the ten shapes and the three cardinality shapes. Outcomes, element-read logs and iterator logs
    match. The probe's own length-bounded and `artifacts.length` controls fail.
  - **Class completeness: closed.** Each exclusion from F's search was checked against the baseline.
  - **No regression: closed.**
  - **Law: open, on B2 only.** `iterateAnswers`'s `@throws` read "Whatever `answer` raises…", against
    `typescript.md:217` ("a thrown error as 'Thrown when …'"). Its name, its type parameters, § Bindings, the barrel
    export and the guide row all conform.
  - **The Orchestrator's fix.** The tag now reads "Thrown when `answer` throws for a value, with that error, or when
    closing `source` after a refusal throws, with the close's error." It is a doc-only change, so the build and every
    gate are rerun (`agent/tmp/units/scaffold-f1/gates-final/`).
  - **The follow-up** remains the `serve` hoist.
- **Accepted, commit `4d67f0f32`** (2026-10-19), on `61acbceb3`: 22 tracked files, with `PARALLEL.md` excluded and the
  hash written there.
  - **The final gates** (`agent/tmp/units/scaffold-f1/gates-final/`): format, lint, `check` and the build exit 0;
    src:server 527, src:bin 349, policy 121, config 280, setup 368, skills 108, guides 47, templates 64, distribution
    11; emission exits 0.
  - **src:core.** One worker-spawning test (`compilers.test.ts:4131`) timed out at 5 s while the Study timing unit
    deliberately loaded all 16 cores. Two quiet reruns pass 582 of 582.
  - **Recorded and not done:** `BOUND_PATHS` could also bind `configs/helpers.ts`, `configs/policy.ts` and
    `configs/browsers.ts` to their sources. Older instrument files carry lint debt. Both are instrument follow-ups, not
    blockers.
- **Next, under the exit rule:** re-read `PARALLEL.md`, then the build and the gates, then the closure check
  (`agent/tmp/units/scaffold-closure-brief.md`), then the commit, excluding `PARALLEL.md`.
- **E3**, after E1 and E2 have returned and their gates are green. It covers:
  - binding-aware renames, with elisions kept;
  - deviations judged by their exact shape;
  - region approvals that cover code only, so comments and guide lines need exact hunks;
  - laziness cases;
  - nine new plants;
  - discrimination against `61acbceb3`. Its claims are
  `agent/tmp/units/scaffold-fix-d-claims.md`. It runs because D1 departed from both prescriptions, D2 counts
  message-only `TypeError`s as matches, and D4 approves by token-level rename.
- **Coordination (2026-10-18).** The Veneer session (`@orkestrel/test` 0.0.26) coordinates through scaffold
  `PARALLEL.md`. This session replied there and stated what it holds in the checkout. `PARALLEL.md` is never committed.

### Round 4 fix items

| Item | Findings | Owner files | Prescription | Bound |
| --- | --- | --- | --- | --- |
| D1 | 6, 7a, 7b | `tests/setupPolicy.ts`, `tests/setupPolicy.test.ts`, `tests/config.test.ts` | Restore 7a (`Array.from(overrides, …)`), with a sparse-`overrides` control. Restore 7b: one catch boundary around the read and the parse, with a portable read-failure control, such as a `package.json` that is a directory. Append the exclusion to the `config.test.ts:658` comment. Then sweep every chain rewrite in `tests/setupPolicy.ts`, using `git diff 1f2eed70e`, differentially against the staged baseline for holes and catch boundaries, and fix and pin each mismatch | Keep each lawful Bindings form. Dense and valid inputs stay unchanged. Malformed JSON stays caught |
| D2 | 7 (class) | `src/**`, `configs/**`, `.agents/skills/*/scripts/**`, `tests/setupServer.ts`, `tests/setup.ts`, the emitted code in `src/core/templates.ts`, and their tests | Run a differential hole and catch-boundary sweep, as Agent's FH did, over every rewrite in `git diff 1f2eed70e` of a `for…of` over a caller-supplied or nested array, and every moved `try` boundary. Match the baseline in both directions, and pin each fix with a sparse or failure test | Make no change where the baseline already matched. Leave `tests/setupPolicy.ts` (D1) and the instruments alone |
| D3 | 5 | `src/bin/GitQuery.ts` | Record the untestable chunk boundary at `:124-125` (`tests.md` § Untestable), and keep the inventory test | The intake stays private |
| D4 (results below) | 7, 8 | `tmp/probes/scaffold-fix/**` | Replace the three whole-file approvals with reviewed region or hunk approvals. Extend the behaviour inventory and cases to `tests/setupPolicy.ts`'s exported helpers, comparing HEAD and the worktree, with sparse and read-failure cases. Re-run with the controls after D1 and D2 land | No approval that does not name a reviewed change. Every existing control keeps failing as designed |
