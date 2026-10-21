# Fleet campaign: Bindings sweep, budget layers, Records grading (2026-10-17)

## Goal

Finish three workstreams the user named on 2026-10-17: the `let` sweep under the tightened Bindings rule, the
three-layer budget redesign, and the Records Grok labeling. On 2026-10-17 the user ruled: publish nothing, and every
consumer works on fresh local builds, pinned in its `package.json` ("regenerate the distributables so that you can point
at them locally in the package.json … always working on the latest distributables as you work through each package").
On 2026-10-19 the user superseded that ruling ("Yes, prepare and push", then a one-time code per window): the release
round published every changed package, and the consumers take registry ranges with no pin (§ Release round).

## Exit criterion

1. Scaffold `typescript.md` § Bindings and `architecture.md` § Middleware carry the reviewed draft 3 text, and
   scaffold, Study, budget and Agent are swept under it: census sites and verdict fix items closed, one falsify round
   passed per repository, gates green, committed locally.
2. Budget design 2 is built: U1 budget, U2 Agent's provider contract, U3 Agent's loop on D1, U4 Ollama. Falsify passed,
   gates green, committed locally.
3. The Records Grok labels are audited, imported through `study label`, reported, and compared judge-for-judge with
   the `compaction-output-2` Grok grading, with the adjudicator substitution disclosed.
4. Each consumer pins the fresh tarball of every changed package it depends on, through `tmp/units/local-pin.ts`, with
   the replaced registry range recorded in `<consumer>/tmp/tarballs/pins.json`. No version bump, no publish.

The pins criterion, with its "no version bump, no publish", held until acceptance. The release round of 2026-10-19 then
bumped and published the changed packages and retired the pins: Agent's `tmp/tarballs/pins.json` reads empty
(`.orkestrel/ledger.md:273`), and the W4 and W5 visits left Ollama, toolbox and Study with no pins (`:259`, `:264`).

## Exit rule for the open sweeps (the user, 2026-10-18)

Asked "Where are we at on this? It's taking forever.", the user chose "One closure check, then commit".

- **Ollama.** When OS-H lands with the gates and the live run green, run one final single-reviewer round. It checks
  only that each named finding is closed; it starts no new open-ended hunt. Then commit and restage.
- **Scaffold.** The same rule, when E3 lands with the build and the gates green.
- **New minor findings** from the closure check become follow-up units. They do not block the commit.

## Acceptance (2026-10-19)

The exit criterion is met.

1. The Bindings rule landed, and scaffold, Study, budget, Agent and Ollama are swept, falsified, gated green and
   committed.
2. Budget design 2 is built, from U1 through U4.
3. The Records Grok labels are imported, and their comparison is reported.
4. Every consumer pins fresh local builds, and the fleet runs on scaffold 0.0.102 (repairs `ca99510`, `e8cdcba`,
   `3ddedba` and `4d97e8d`). That held at acceptance; § Release round records the move to registry ranges and scaffold
   0.0.103.

The successor campaign, the series boost, is open. Its plan of record is `tmp/units/ladder/ladder-2.md`; the
closure check ruled CLOSED. The user approved, 2026-10-19:

- the 0.40.6 runner with fresh same-seed controls;
- Records optimized for both quality and speed, quality first;
- development atoms with a held-out check;
- the ladder's remaining recommendations as written ("Yes, adopt them"). That option named seed ingress through a
  default-off Compaction adapter and a Records harness, one bounded metered first-pass reasoning probe, the hold on
  model downloads, the 2026-10-16 package features in isolated work, request framing as a default-off treatment, and
  closing the fleet campaign with the boost exit criterion (`tmp/units/ladder/dispatch-ledger.md` rows U3, U8 to U10,
  U12a, U12b and U14). It named none of the ladder-2 § S8.3 rows, so those stay open for the user
  (`tmp/units/realign-2/critic.md` § 4).

**Boost exit criterion (user-approved):** report the calibrated same-root pairs, the targeted semantic and cost effects,
the frozen rubric by kind and quarter, every guard, and every unresolved or capped idea. Completed runs alone are not
"solid improvement". The decision and run ledger is `tmp/units/ladder/dispatch-ledger.md`.

The open queue moves to the successor campaign, the series boost. Its first draft was a micro-to-macro ladder
(`tmp/units/ladder/ladder.md`) under the user's 2026-10-19 directive: try everything but bounded, micro before macro,
and seed long runs from staged checkpoints. The critic ruled that draft unsound, `ladder-2.md` replaced it, and the user
approved the exit criterion in the preceding paragraph (`.orkestrel/ledger.md:194,198,208,214`).

**Sweep and clean (user, 2026-10-19).** "Once we are done with the publishing and the boost design, we need to sweep
and clean, the tmp and relevant `.orkestrel` folders." It runs after the release lands and the ladder is approved, in
every touched repository: Agent, Study, budget, Ollama, and MCP where a visit wrote there. The sweep of 2026-10-20 has
the following shape. The executor's `tmp/units/sweep/plan.json` names every root the sweep removes, so a `tmp/` path
that another record cites is gone after the sweep when it falls under one of those roots. The sweep archive keeps each
removed file that is neither regenerable nor secret-named.

- **Manifests.** The inventory `wf_53634417-a82` (`.orkestrel/ledger.md:271`, `:280`) wrote five manifests to
  `tmp/units/sweep/`, each delete list attacked by a skeptic: `agent-orkestrel.json` (Agent's `.orkestrel/`),
  `agent-units-dirs.json` and `agent-units-files.json` (the directories and the files of Agent's `tmp/units/`),
  `agent-tmp-root.json` (the rest of Agent's `tmp/`, its worktrees and the scaffold release clone), and
  `other-repos.json` (the round's other repositories). Each row deletes, keeps, saves, promotes or rewrites.
- **Records passes.** The `.orkestrel` pass carried `agent-orkestrel.json`'s promote rows and the title diff into
  § Standing readings, and the records commit `b56eb69` deleted the closed verdicts (`.orkestrel/ledger.md:292`,
  `:295`). The carry pass of 2026-10-20 carried the other manifests' promote rows into § Standing readings,
  § Packages and layer order and § Units, Queued by the sweep, and rewrote the handoff lines that cite a removed path
  (`tmp/units/sweep/records-carry-report.md`).
- **Executor.** `tmp/units/sweep/execute.ts`, run by `node` (`sweep-executor-sol-1`, `.orkestrel/ledger.md:285`):
  - `--plan` resolves the four `tmp` manifests and the binding overrides into `plan.json`, `plan.md` and
    `plan.sha256`, and deletes nothing. The first plan, `ef4130d5…`, refused 19 conflicts, on which the
    secret-named-file and internal-link overrides rule; the round-2 plan `402219ce…` (2026-10-20) names no refusal.
  - `--apply --plan-sha SHA256` refuses until the Orchestrator records `tmp/units/sweep/readiness.json`: the plan's
    SHA-256, `idle: true`, and the completed disposition of every requirement the plan lists. It revalidates the plan,
    its sources and every live path, refuses while a journal under a swept `tmp/` changed within five minutes, refuses a
    worktree that is not clean, and creates no backup ref, so the refs the worktree rows name must exist first. It
    unlinks each junction by itself before any `fs.rmSync`.
  - It archives each removed root that is not regenerable under `tmp/units/sweep/archive/`, one `.tar.gz` per
    repository. A regenerable root, such as a `node_modules` tree or a clean worktree, and a secret-named file go
    without an archive. Before apply, the Orchestrator copied the ignored `tmp/` files of the removed worktrees (113
    files, each hash-verified: `empty-recap` 7, `performance` 8, `promotion-consumer` 58, `summary-task` 40,
    `study-slim` none) to `tmp/units/sweep/kept/worktree-reports/<worktree>/`, among them
    `performance/tmp/units/calibration-stage-report.md`, which has no other copy. The worktrees' uncommitted edits are
    snapshotted under `refs/backup/wt-empty-recap` (`ea70d2a`), `refs/backup/wt-promotion-consumer` (`0f40da3`) and
    `refs/backup/wt-summary-task` (`328fbbf`), and their clean heads under `backup/wt-performance-b6904bd` and
    `backup/wt-study-slim-7018039`.
  - It writes `tmp/units/sweep/apply-receipt.json` with the absence, kept-path and link-target proofs.
  - Until `tmp/units/sweep/apply-receipt.json` exists, each record line that says a path was removed in the 2026-10-20
    sweep describes the planned state. Commit this plan and the handoff with the deletion, after three preconditions
    hold: the backup branches `backup/wt-performance-b6904bd` and `backup/wt-study-slim-7018039` exist; the edits of
    the worktrees `empty-recap`, `promotion-consumer` and `summary-task` are snapshotted under
    `refs/backup/wt-empty-recap`, `refs/backup/wt-promotion-consumer` and `refs/backup/wt-summary-task`; and those
    three worktrees read clean, because `--apply` refuses a dirty worktree even where a manifest row proposes
    `--force`. On 2026-10-20 at 08:11 none of those refs exists and the three worktrees are dirty. Run `--plan` again
    first: `orchestrator-overrides.md` changed after the round-2 plan hashed it (`plan.json` embeds `ed7a3a2a…`, the
    file reads `a75e554a…`), and `--apply` refuses a drifted plan with `PLAN_DRIFT`.
- **Binding overrides** (`tmp/units/sweep/orchestrator-overrides.md`):
  - the scaffold release clone may go after its tree reads clean and its `HEAD` is in `origin/main`, because Playwright
    1248 is in the default cache;
  - the open units' files stay: `tmp/units/study-002-*`, `sweep/`, `realign-2/`, the whole `ladder/`, and
    `release/fleet-0103-repair-*`;
  - apply runs only while no unit is live, and the Study rows only after the Study 0.0.2 units finish or pause;
  - every junction is unlinked alone and its target verified; no recursive delete follows a junction;
  - the promote rows and the handoff rewrites are carried before any deletion;
  - `tmp/runtimes/` and `tmp/units/ladder/fix-w5-2/` stay;
  - a secret-named file goes with its root, unread and unarchived, and the plan lists it by path only;
  - a link whose target the same plan deletes is internal and skips the target checks;
  - `tmp/units/replace-token.ts` is not a secret, and its byte-identical copy is
    `tmp/units/sweep/kept/replace-token.ts`.
- **What stays.**
  - Custody: `tmp/studies/` with the sealed results, captured runtimes, labels and gradings, and the pins ledgers
    `tmp/tarballs/pins.json` of Agent, Study and Ollama.
  - The ladder: `tmp/units/ladder/` whole for the boost campaign (`tmp/units/ladder/ladder-2.md:58`), with its
    `w5-fixture-*` artifact directories until the W5 closure round 2 and its verifier. The closure and fix units keep
    adding to them under `closure-w5/artifacts/` and `fix-w5-2/artifacts/` while they run.
  - The live series probes under `tmp/probes/`, and the pinned Node 26 under `tmp/runtimes/` for the W5 native host
    (`.orkestrel/ledger.md:289`, `:290`).
  - The checkpoint, replay, stage and pin tooling the ladder names (`ladder-2.md:58`), including
    `tmp/units/local-pin.ts` for the whole boost campaign. Its earlier keep condition is met: Agent takes Study
    `^0.0.1` from the registry (`b47ce06`), `swap.ts` accepts the Agent self-override (`.orkestrel/ledger.md:252`), and
    the pin ledger is empty (`:273`). A `swap.ts` pack of Agent under the registry Study is unproven
    (`tmp/units/realign-2/critic.md` § 3).
  - `tmp/units/title-diff.mjs`, until its TypeScript port lands (§ Standing readings, Equivalence contract).
  - `tmp/units/release/layer-prep-brief.md` and `tmp/units/publish-readiness/readiness.md`, which the kept
    `tmp/units/release/w5-brief.md` cites, until Study 0.0.2 publishes; and the 28 pre-window review-kit files that
    the `rest-prewindow-review*` rows of `agent-units-dirs.json` exclude, until the Study 0.0.2 pre-window review
    reuses them. Then carry one generalized review kit into scaffold `orkestrel-publish` as a `PARALLEL.md` queue
    item, or discard the files.
  - The source of each queued test promotion, until its unit lands (§ Units, Queued by the sweep).
  - `tmp/units/bindings-rule-4-draft.md`, whose § 5 is the census key, until the corrected key lands in scaffold
    (§ Standing readings, Let-sweep rulings and the census key).
  - `tmp/units/let-sweep-rulings-2.md` and `tmp/units/budget-meter-design-2.md`, until their remaining rulings reach
    the owners' guides or this plan: among them the user's answers on the Agent surface, `LedgerRequest` and the Study
    surface, "Close all, middleware too", `StudyProcessGoal` in Study's server barrel, Study `#goals` to `#goal`, the
    `DistributionSuite.start` ban, the `Conversation#pending` form, and the Study fix 3 answers
    (`let-sweep-rulings-2.md:39-117`).
  - `tmp/units/agent-r2-head-orch/`, which `tmp/probes/orchestrator-r2-repro.test.ts` and
    `orchestrator-r2-fix-repro.test.ts` import.
  - `tmp/units/u4-daemon-2/` and `tmp/units/os-daemon-4/`, whose daemon logs read Ollama 0.40.6 on 11435
    (2026-10-18) and which `tmp/units/ladder/probes.md:36` cites, until G0 records its own 0.40.6 daemon receipt and
    the citations are re-pointed.
  - `tmp/units/study-install-before-roots/`, the sole byte copy of the Study build whose digests
    `tmp/studies/endurance-plan.json` pins (`:356`, `:366`).
  - The `tmp/codex` daemon logs, `tmp/claude/scaffold-history/` until the post-results sweep, and the
    `tmp/worktrees/` directory, where the ladder and the Study 0.0.2 consumer proofs create worktrees.
  - The sweep's own record in `tmp/units/sweep/`: `plan.json`, `plan.md`, `plan.sha256`, `archive/`,
    `kept/replace-token.ts` and `apply-receipt.json`, until the user rules the archive disposable. This plan and the
    handoff cite the archive as the remaining copy of each removed file that is neither regenerable nor secret-named,
    and `plan.json` `kept` lists the paths the plan protects.
- **Prove it.** After apply, every kept path still resolves, every reader pin still verifies, and every external link
  target keeps its entry count (`apply-receipt.json`). The boost's first wave (W1, W2, W4 and W5) ran before the
  sweep. Run the sweep window before the tracked-file writers W7, W3b, W11 and W12, as `tmp/units/realign-2/boost.md`
  § 6 recommends.
- **Open after the sweep.** These edits to other `.orkestrel` records stay owed:
  - The placement of `.orkestrel/study.md` stays a separate decision (`tmp/units/realign/critic.md` § CR-11). Its
    lines 21-26 still say to preserve the physical proof trees. After the worktree removals, rewrite them as the
    `agent-tmp-root.json` rewrite row for that file prescribes (`agent-orkestrel.json` R6): the dependency trees under
    `tmp/studies/` stay as custody, the Study server SHA-256 sentence stays, and the proof worktrees were removed on
    2026-10-20, with Agent `34862bc` and the backup refs as their sources.
  - Append to `.orkestrel/agent/relocation.md:13` the deletion date of `tmp/units/scaffold-history/`, which this
    sweep removes, and later that of the `tmp/claude/scaffold-history/` daemon logs, when the post-results sweep
    removes them (`agent-orkestrel.json` R4).
  - Correct row S4 of `.orkestrel/agent/studies-cleanup-ledger.md` when track X-residue appends rows: the user's
    correction of 2026-10-16 reversed it (`agent-orkestrel.json` R5; § Standing readings, Studies cleanup acceptance).

**Sweep guard.** Never run `sweep.ts --tmp` in Agent while the boost series is open. Its threshold deletes custody
and pin tooling: the `compaction-output-2-*` tooling and receipts, the `study-root-install-*` runtimes,
`tmp/units/local-pin.ts`, the `tmp/codex` daemon logs, and the live series probes under `tmp/probes/`. Remove
accepted unit directories one at a time with `sweep.ts --unit UNIT --delete`.

## Release round (2026-10-19)

The release round is closed. The user gave a one-time code for each window, and `window.ts --confirm` reports every
package served. W3, W4 and W5 record each served tarball as byte-identical to the reviewed one; W1, W2a and W2b record
each tarball served and answering 200. The following table cites the ledger rows; it copies none of their evidence.

| Window | Packages and release commits | `.orkestrel/ledger.md` |
| --- | --- | --- |
| W1 | budget 0.0.14 (`38c9a66`, carrying the brand `53f3b46`), terminal 0.0.20 (`afe1a87`), mcp 0.0.39 (`5b90ebc`) | `:197`, `:200` |
| W2a | middleware 0.0.25 (`adba018`), workflow 0.0.23 (`d6a0cf1`), probe 0.0.24 (`569ae33`) | `:207`, `:225`, `:239`, `:242` |
| W2b | scaffold 0.0.103 (`7ad00d294`), browser 0.0.29 (`b10f0e4`) | `:235`, `:244`, `:249`, `:250` |
| W3 | agent 0.0.31 (`df795dc`) | `:252` to `:255` |
| W4 | ollama 0.0.24 (`7dfa020`), toolbox 0.0.20 (`8ef5ab7`) | `:259`, `:261`, `:262` |
| W5 | study 0.0.1 (`eed15ac`), its first publish | `:266` to `:268` |

- **Agent takes the registry.** `b47ce06` holds Study `^0.0.1`, Ollama `^0.0.24` and scaffold `^0.0.103` with no pin
  and no bump. Its registry proof is recorded at `.orkestrel/ledger.md:273`.
- **Scaffold 0.0.103 across the round.** The fleet repair moved budget (`5eea66c`), terminal (`34a0b9b`), workflow
  (`64f7362`), mcp (`8efb220`), middleware (`49a0dd3`), probe (`7b51198`) and browser (`be09c02`) with their versions
  unchanged (`:275`). Ollama, toolbox and Study took 0.0.103 in their visits (`8b7698e`, `8e8a0ae`, `eed15ac`), and
  Agent's repair on 0.0.103 changed no hosted path (`:273`). Each of those manifests declares `@orkestrel/scaffold`
  `^0.0.103` (read 2026-10-19).
- **Follow-ups outside the round**, none blocking (`tmp/units/realign-2/plan.md` § 2):
  - desk and taverna break on agent 0.0.31 and pin `^0.0.30` (`:254`); unit BR-5 migrates them, moving Agent and
    Ollama together;
  - Study 0.0.1's non-blocking review items go to Study 0.0.2 (`:267`);
  - Ollama's README and TSDoc import the development dependency `@orkestrel/abort`, toolbox's TSDoc examples import
    `@src/core` and `@src/server`, and the transitive `@orkestrel/sqlite` declares `^22.18.0 || >=24.4.0` under the
    fleet's `>=22.12.0` (`:261`);
  - agent 0.0.31's README `guides/` links are dead in the tarball, and its `prepublishOnly` runs `test:studies`, which
    `--ignore-scripts` leaves inert (`:254`).

## State on 2026-10-19 (evening)

**The user's decisions after the realignment** (`.orkestrel/ledger.md:279`; lane reports in `tmp/units/realign-2/`):

- Study 0.0.2 builds all four moves (the gauge guard, the quality rule, the tool projections and the declaration reader)
  and publishes when green, pushing Study `main` first.
- The W5 closure covers the native Job Object bridge. Keep the bridge only if the closure finds it safe and Node has no
  equivalent; otherwise replace it before G0. Then add the two ladder units the boost lane found missing: the driver
  adapter, so that W4's capture and the G0 replay speak W5's protocol, and the successor stage, freeze, pin and reader
  tool (`tmp/units/realign-2/boost.md` § 6).
- Install Playwright revision 1248 into the default cache: done (`:282`).
- Finish the `let` sweep per package visit, each with a census on the corrected key and a review, and land the scaffold
  lint rule after the last visit.

**The boost** is at L0. W0, W1, W2 and W4 are accepted. W5 is built and repaired, and its closure check, widened to the
bridge, is dispatched (`ladder-w5-closure-astra-1`, `:284`); its verifier follows the verdict. No GPU unit, daemon
operation or model call has run for the ladder (`tmp/units/realign-2/boost.md` § Finding). The order that
`tmp/units/realign-2/boost.md` § 2.1 gives:

1. Close W5.
2. Re-verify W4 on the registry install. The recorder hashes `tmp/tarballs/pins.json` into its identity, and that hash
   moved when the pin ledger emptied, so every stored W4 transcript reads as drifted.
3. Dispatch the no-GPU units with disjoint files: W8, W9 (then W10), W6, W3 and W11's design preparation, one Grok
   lane at a time.
4. Dispatch W7 after a checkpoint commit.
5. After W3, run W3b serially with W11 and W12; after W7, run W13.
6. Write the runner receipt for Ollama 0.40.6 from an offline `--version` probe under the `OLLAMA_HOST` guard, then run
   G0 and G1A, then G3 and G1R.

Finish Study 0.0.2 before W3b imports Study and before G2 fixes the runtime's Study, as `boost.md` § 6 recommends.

**Work in flight** at 2026-10-19 22:34 local:

- Study 0.0.2 (`tmp/units/study-002-design.md`: units S1 to S4, then one falsify round). S1, one copy of core, is Study
  `88acd00`, committed locally and unpushed (`:281`). S2, `--version` and the missing-file codes, is building (`:283`),
  and Study's working tree holds its uncommitted edits. S3 (the moves) and S4 (the manifest and README) follow.
- The W5 closure (`:284`).
- The sweep (`tmp/units/sweep/`). The records rewrite of 2026-10-19 carried the standing readings into this file and the
  handoff (`tmp/units/sweep/records-rewrite-report.md`); the deletions wait for the Orchestrator's review and a quiet
  checkout.

## Standing readings

These readings outlive the records they came from, and each names its source. A verdict marked archived is tracked and
unmodified in git at `acff094`.

### Release and gate readings

- **Browser's Windows release chain.** Browser's release-mode distribution fails host-bound cases on Windows (no
  `/proc`, no FIFO; WSL and Docker absent). Ship browser through the Windows release chain: default-mode distribution
  plus `test:service`, with the skips recorded, on browser's own 0.0.28 precedent `e887416`
  (`.orkestrel/ledger.md:224`).
- **Playwright 1.64.1.** `@orkestrel/test` 0.0.27 locks Playwright 1.64.1, which needs Chromium headless-shell revision
  1248 (`:244`). On 2026-10-19, with the user's approval, the default cache `C:/Users/mikes/AppData/Local/ms-playwright`
  received `chromium-1248`, `chromium_headless_shell-1248` and `ffmpeg-1013` (`:282`). Browser and scaffold-skills gates
  run without `PLAYWRIGHT_BROWSERS_PATH`.
- **Node 24.22.0 signals.** `AbortSignal.any` validates its private brand before a proxy trap, so a test premised on a
  proxied signal's trap is stale on Node 24.22.0; Node 24.11.0 passes it. Workflow's replacement test asserts the
  `TypeError` (`ERR_INVALID_ARG_TYPE`) in `b819672` (`:218`, `:223`). On the same Node, `AbortSignal.any` propagates a
  parent's abort eagerly, so budget's "first source in array order" note (D1) and its mutant M3 are Node 24.21.0
  observations (budget U1 verdict, archived as `budget-u1-audit-verdict.md`).
- **Vite 8.3.4 frames.** Vite 8.3.4 no longer clones unmapped call sites, so a private-method frame reads `#commit`, not
  `Pool.#commit`. Assert the frame without its class prefix, as browser `82abd60` does, and keep its negative control
  (`:212`, `:216`, `:224`).
- **Browser's codegen race.** Browser's codegen flake was a test race that predates the round (a hidden sink-frame
  navigation invalidates the accessibility capture), fixed by a barrier in browser 0.0.29 (`:247`, `:249`).
- **Load-sensitive gates.** Under concurrent Codex load, the default `npm test` chains of scaffold, probe, browser and
  Study timed out, and each passed on a quiet serial run, scaffold's after its Playwright cache was set (`:221`, `:229`,
  `:231`, `:235`, `:239`, `:244`). Run release gates serially on a quiet machine, and rerun a timed-out gate one time
  before treating it as a failure. Write the quiet serial runner as a TypeScript file run by `node`: the PowerShell
  runner `quiet-run.ps1` of row `:238`, removed in the 2026-10-20 sweep, broke the script law in scaffold's
  `AGENTS.md` and `.agents/orchestration.md` § Dispatch.
- **Study CLI durations.** In the W5 gates of 2026-10-19, `tests/src/bin/main.test.ts` took 63 s,
  `StudyLauncher.test.ts` 62 s (its default-deadline case waits 60 s by design), and the adapter integration 42 s
  (`:266`). Run Study's gates quiet and serial.
- **Move Agent and Ollama together.** A consumer that moves Ollama without Agent nests a second Agent copy, and
  `instanceof` guards such as `ProviderAbortError` miss across the copies (`:261`, `:262`).
- **The overwrite commit.** `wave.ts --visit` leaves the scaffold overwrite's writes uncommitted. Commit them
  separately, titled "Overwrite with scaffold VERSION", where VERSION is the scaffold version: toolbox `8e8a0ae` and
  Study `eed15ac` follow that title, and Ollama's `8b7698e` reads "Repair ollama to scaffold 0.0.103" (`:259`).
- **Upload the proved bytes.** `window.ts --publish` runs `npm publish --ignore-scripts` in each package directory, so
  it uploads the working tree. Before each upload, restore the pins (`swap.ts --restore`), `npm pack` the clean tree,
  and compare its SHA-256 with the proved artifact (`:253`).
- **A fresh worktree pins twice.** In the W3 proof of 2026-10-19, the first `swap.js --pin` into a fresh worktree
  exited 1 after 24410 ms: with no installed baseline, its proof reported the other Orkestrel packages as added by the
  install, and it refused no source. An identical second run exited 0 after 21754 ms with no problems and the same
  tarball hashes. Before treating a first pin's exit 1 in a fresh worktree as a failure, read its problems, and rerun
  the pin one time when they name only packages the install added. The report,
  `tmp/units/release/agent-w3-report-3.md`, was removed in the 2026-10-20 sweep, and the sweep archive keeps it.
- **A first publish lags.** A first publish can read pending on `--confirm` for minutes; Study 0.0.1 confirmed served
  under `--confirm --wait 540` (`:268`).
- **Keep Ollama current.** Use the stable daemon (0.40.6 on 2026-10-19; 0.40.7-rc0 is a pre-release and is not adopted)
  and the exact conformance pin `ollama` 0.6.4 (`f56f2cc`). Re-check both releases at each Ollama visit and before each
  GPU phase. A daemon change opens another runner lineage, which G0 screens first (handoff § Session of 2026-10-17).
- **The 0.40.3 lineage.** The c1 dedicated daemons, relocated from scaffold (`.orkestrel/agent/relocation.md:13`),
  served Ollama 0.40.3 on 11435: each log reads "Listening on 127.0.0.1:11435 (version 0.40.3)"
  (`tmp/claude/scaffold-history/c1-daemon.err:5` and `c1-daemon-1/c1-daemon.err`), and the start receipt
  `tmp/claude/scaffold-history/c1-daemon-1/c1-daemon-start.json` sets `OLLAMA_NUM_PARALLEL=1`,
  `OLLAMA_MAX_LOADED_MODELS=0`, `LLAMA_ARG_CONTEXT_SHIFT=0` and `LLAMA_ARG_N_PARALLEL=1`. The sealed runs used 0.40.3
  too (`tmp/units/realign/critic.md` claim 10). On 2026-10-20 scoop holds 0.40.3 only in its cache
  (`ollama-full#0.40.3#495099e.exe`) and has 0.40.6 installed. The daemon logs stay until the post-results sweep.
- **Empty recaps.** In the rolling successor run that closed on 2026-10-15 (`.orkestrel/agent/rolling.md` § Execution
  closed on 2026-10-15), each of the 8 empty summaries among the 12 completed recorded a completion count of 1 and a
  decode duration of 1000 ns, while the 4 nonempty ones recorded 1050 to 1444 completion tokens. The retained
  projection holds no per-row `done_reason` or wire content, so the cause (a stop or special token, a model that
  declines to start, or a decode loss) is not established. The scout report, `tmp/claude/empty-recap-scout-report.md`,
  names the one terminal wire row of an empty summary whose read can settle it, and that raw-evidence read needs the
  user's approval. The 2026-10-20 sweep removed the report, and the sweep archive keeps it.
- **Grok takes a long prompt on stdin.** Cursor Grok 4.7 received a 40,312-character prompt on stdin as one `user`
  event, resolved "Grok 4.7 256K Extra High", and closed with a `success` result in 14310 ms
  (`tmp/cursor/grok-stdin-probe.jsonl`, 2026-10-15). The probe tests the transport only; the model declined the
  probe's request. The retained label runner `tmp/units/study-label-grok/` sends its prompt on stdin and never as an
  argument (`helpers.ts:286`), fails a call whose stdin write does not finish (`main.ts:57-75`), and asserts that its
  Cursor arguments carry no `--force` (`helpers.test.ts:500`).
- **Browser gates in a linked worktree.** A linked MCP worktree whose `node_modules` was a junction failed MCP's
  `src:browser` and `setup:browser` projects: `environmentBoundary` in `configs/helpers.ts` refused with "package
  root", because `packageRootOf` found no `@orkestrel/contract` root among the resolved file's ancestors. The cause, an
  optimized-cache path under `node_modules/.vite` or the junction's resolution, was not established; the accepted route
  was a physical `npm ci` tree, MCP's worktree `study-refusal-physical` at `f9fffad` (handoff § State and scope). Run
  browser-project gates in a linked worktree on a physical `node_modules`. The diagnosis,
  `../mcp/tmp/claude/mcp-browser-gate-report.md`, was removed in the 2026-10-20 sweep, and the sweep archive keeps it.
- **Probe's guide receipt pins the toolchain.** The `verdict.receipt` sample in probe's `guides/probe.md` and in the
  `Probe` TSDoc (`src/server/Probe.ts`) embeds the installed TypeScript, oxlint and vitest versions. Each move of
  one of them fails probe's guides test until both samples are re-pinned, as probe `fccd508` did for oxlint 1.89.0
  and vitest 4.1.12. The guides test is the standing gate, so no other test is owed.
- **Scaffold's gates read `PARALLEL.md`.** Write each `PARALLEL.md` section in oxfmt form and without the terms
  scaffold's `writing.md` bans. Scaffold's `format:check` runs `oxfmt --check .`, and the untracked root `PARALLEL.md`
  is not git-ignored (`git check-ignore` exits 1); the policy prose sweep (`readPolicyProse`,
  `scaffold/tests/setupPolicy.ts:2644`) reads every Markdown file outside `.git`, `.orkestrel`, `dist`, `node_modules`
  and `tmp` (both read 2026-10-19). On 2026-10-18 one formatting finding and four prose findings in that file, "Please
  reply below" among them, failed scaffold's `format:check` and policy test (scaffold fix verdict, archived as
  `scaffold-fix-audit-verdict.md`).

### Ollama hermeticity

Sources: the U4 and Ollama sweep verdict, archived as `u4-audit-verdict.md`, and the handoff.

- **Guard every Ollama command.** Run every non-service Ollama command with `OLLAMA_HOST=http://127.0.0.1:1`:
  `npm test`, `setup`, the gates, the probes, and `ollama --version`, which asks the default server for its version
  (handoff § Session of 2026-10-17, the rule slip of 2026-10-19).
- **Collection contacts the daemon.** `vitest list` evaluates the `service` project's `setupFiles`, so discovery in
  Ollama reaches `OLLAMA_HOST` even in a clean checkout, and `--projects` does not avoid it because the first listing is
  full. Run Ollama discovery only during a live window, with `OLLAMA_HOST=http://127.0.0.1:11435` on the dedicated
  daemon.
- **Queued Ollama change, for the user's ruling.** Move the `tests/setupService.ts` readiness gate and warm-up from
  module load into a `beforeAll` that its setup file registers. Collection and `vitest list` then need no daemon, and a
  failed gate fails each test instead of the import.
- **Series-read probes.** Ollama's git-ignored `tmp/probes/store-live.test.ts` and `wire-dump.test.ts` import helpers
  from `tests/setupServer.ts`, `tests/setupStore.ts` and `tests/setupService.ts` (`store-live.test.ts:7-10`,
  `wire-dump.test.ts:6-9`, read 2026-10-19). `store-live.test.ts` is the live instrument of the open small-model
  campaign (`.orkestrel/agent/lifecycle/reading/small/`; rows V5 and V6 were queued when the verdict was written), so it
  is series-read. A unit that moves those exports checks the `tmp/probes` importers first: the Ollama sweep broke both
  probes' imports (four `TS2305` errors, repaired in OS-F-server), and `ollama-probes-drift` then fixed older API drift
  (`format` dropped, `body` renamed `encode`; § Units).
- **The probe project.** Never merge the `probe` project into a probe config, because `tmp/probes/**` holds live probes.
- **`computeAnswer` cost.** The duplicate check in Ollama's `computeAnswer` is quadratic. After OS-F-src,
  `computeAnswer` takes 1855 ms and `extractTopLogprobs` 1009 ms at 20 000 tokens, against the baseline's 3.4 ms and
  4.3 ms. It is ruled advisory because the daemon asks for 20 (about 400 comparisons) and a lazy O(n) check needs an
  added `src` class (§ Units, the Ollama Bindings sweep row).

### Equivalence contract for Bindings sweeps

Source: the scaffold fix chain, ruled in fix round E and refined with E2 (verdict archived as
`scaffold-fix-audit-verdict.md`). The fleet `let` sweep judges equivalence by this text until scaffold gives the
contract a home (§ Scaffold queue).

- **Inside the contract:** every value within the declared parameter types. That includes holes, entry getters (count
  and order), throwing entries, an array whose `Symbol.iterator` is missing or replaced, and iterator `return()`.
- **What must match:** the outcome (the return, or the thrown constructor); the element-level reads (which indices are
  read, in what order and how often); and the effects before a throw. A message may differ only where the throwing
  expression differs, and each such row is named.
- **Entries:** for an entry whose own getters are pure (the same value on every read and no side effect), the outcome
  must match. A throwing entry must throw the same constructor. The count and order of an entry's own property reads
  are out of contract.
- **Outside the contract:** values outside the declared types, such as a number or a plain array-like where an array is
  declared; Proxy traps other than element `get` and `Symbol.iterator`, such as `has`, `constructor`, `length` and
  method lookups; the order in which a record's own properties are read, provided each is read as many times as before
  and no outcome changes; and global prototype tampering.
- **Consume lazily, and know the forms that break the contract.** Over a caller's array:
  - `Array.from(source, mapper)` falls back to index access when `Symbol.iterator` is missing, so it returns where
    `for…of` threw `TypeError` (Ollama's `extractTools`, U4 verdict claim 2; scaffold E2b).
  - `source.values()` and `flatMap` read by index, so they accept a missing iterator and bypass a replaced or closing
    one (scaffold E2b; E3's F1), and `flatMap` skips a hole that `for…of` read (scaffold round 4, finding 7a).
  - A spread copies every element first, so it reads past a hole, or ahead of a throwing entry, where the baseline
    threw at the earlier element (scaffold round 5, finding 3 and reproduction f3).

  Consume through `Iterator.from(source)` or scaffold's exported generator `iterateAnswers`, whose body is the baseline
  `for…of` (E2b moved 52 sites to the iterator protocol). To keep `Array.from`, hand it an iterable that forwards only
  `[Symbol.iterator]()`, as Ollama's OS-F-src does. Never bound a hand stepper by `length`: a replaced iterator that
  yields more entries than `length` is truncated (closure finding B1, fixed by round F).
- **Test titles.** Before any claim that a sweep lost no test title, run `node tmp/units/title-diff.mjs REPO REV`, where
  REPO is the repository path and REV the baseline commit. It lists each `describe`, `it` and `test` title of the
  baseline's `tests/**/*.test.ts` files that no `*.test.ts` file in the working tree still carries, so a title moved
  into a setup module, such as one `tests/setup.ts` registers through `it(scenario.title)`, reads as a false positive.
  Ollama's sweep lost the `distribution classifiers` block, which OS-F-server's report called added by the sweep; the
  title diff found it, and OS-F-dist restored it (U4 verdict). The tool is a JavaScript module, outside scaffold's
  `AGENTS.md` script law: keep it until a TypeScript port lands (§ Scaffold queue).

### Let-sweep rulings and the census key

Sources: `tmp/units/let-sweep-rulings-2.md` and `tmp/units/bindings-rule-4-draft.md` § 5. The remaining `let` visits
(the user's decision of 2026-10-19) judge by scaffold `typescript.md` § Bindings and `architecture.md` § Middleware.

- **Landed.** The Orchestrator's round-2 rulings are in the landed rule: a step that carries an aggregate from the
  record before it (R1) under **Lists and logs**; the in-flight registry, kept even when a refusal stops calls from
  overlapping (R2), under **Call slots** and **Registries**; and traversal worklists and membership sets (R4),
  write-once memos (R5), straight-line lists, and platform or fixture writes (scaffold A to C) under **Exemptions**,
  except that scaffold B's append-only logs in synchronous dependent-step loops belong under **Lists and logs**.
- **Not in the rule text.** Keep a traversal's O(V+E) worklist; never trade it for O(V²) persistent-set recursion
  (R4).
- **Pinned census controls** (re-audit claim 5). Run a historical control with `git show REVISION:PATH` at the
  immutable revision named for it: scaffold `499ade7ab09ce8bbd26f153c8466ac57f2dedc0c` for the draft-era controls,
  Study `ca81174e319194dc68c8a96caf7f663ff8262449` for the former HEAD scalar-slot and unit-reset controls, and Study
  `42fe9ac7194efec9881f2e60091be353662de356` for the draft-era goal collections and retained registries. Treat a live
  repaired site as a clear control, never as the historical hit control. No Agent revision is pinned for Agent controls
  (§ Scaffold queue, Census key).
- **The key** is `tmp/units/bindings-rule-4-draft.md` § 5, items N1 to N21, each with its signatures, its reading and
  its controls. Keep that file until the corrected key lands in scaffold.

### Cross-copy error guards

Source: the budget U1 verdict, archived as `budget-u1-audit-verdict.md`.

- **`BudgetError` is closed** by its `Symbol.for` brand (BR-1, budget `53f3b46`, shipped in budget 0.0.14), and
  `isBudgetError` keeps refusing a lookalike.
- **The fleet finding stays open.** Every guard that narrows an error by `isInstance` misses an instance built by a
  second copy, whether another version or the other module format. A consumer that moves Ollama without Agent nests a
  second Agent copy, and `ProviderAbortError` then fails `instanceof` (`.orkestrel/ledger.md:261`). BR-2 asks scaffold
  for a `patterns.md` or `typescript.md` § Errors ruling on the cross-copy guard form that `contract` and `server`
  already ship, by which `AgentError`, `ProviderError` and `LedgerError` are judged. It is proposed as a scaffold design
  lane (Opus planner, Astra analyst) through `PARALLEL.md`, and no unit is scheduled (§ Scaffold queue;
  `tmp/units/realign-2/plan.md` § 1.10). Its only earlier record is `tmp/units/realign/budget.md:270`.
- **Meter bounds.** Never add a re-entry flag, slot or refusal to the meter, because a flag is a call slot under
  § Bindings. Never advance `charged` after a failed charge.
- **`createBudget`** is a pass-through factory, which scaffold `.claude/rules/architecture.md:165` deletes. It is
  recorded as a separate fleet finding and not repaired (the first budget meter design, `budget-meter-design.md:101`,
  removed in the 2026-10-20 sweep; the sweep archive keeps it), and it is still published API
  (`budget/src/core/factories.ts:52`).

### Budget design 2

Source: `tmp/units/budget-meter-design-2.md` (2026-10-16) and the user's answers on it
(`tmp/units/let-sweep-rulings-2.md`). Budget 0.0.14, agent 0.0.31 and ollama 0.0.24 ship it. Its home is the owners'
guides: budget's `guides/budget.md` (`BudgetError`, `isBudgetError`, § Trace an exhaustion) and Agent's
`guides/agent.md` § Three failure layers: meter, budget, model, which states the layers. This section keeps only what
those guides lack.

- **Recorded text changes.** A budget's abort reason is a `BudgetError` with the fixed message "budget reached its
  ceiling". The design's fleet survey (§ 1.4, 2026-10-16) found three sinks that record that text where they recorded
  "This operation was aborted": the `ToolManager` tool result, the `Queue` entry-abort `QueueError` message, and
  Study's recorded agent failure.
- **Deferred and unscheduled**, as the user accepted the design's recommendations ("Accept all",
  `tmp/units/let-sweep-rulings-2.md:74`): metering reasoning
  deltas, decided on calibration data (Question 8); validating `ProviderDelta.text` on runs with no meter
  (Question 7); and an `allowance` member on `AgentJobInput` (Question 10). `@orkestrel/timeout`'s untyped deadline
  reason is a finding outside the design (Question 2).

### Study write sets

- **`Promise.allSettled` over a pending set stays advisory.** Real callers await each append, so the set holds at most
  one entry (the Study fix 4 verdict, § Bounds, archived as `study-fix-4-audit-verdict.md`). The verdict names no class.
  Study 0.0.1 (`eed15ac`) builds `Promise.allSettled([...this.#writes])` in `src/server/stores/StudyEvidenceSink.ts:61`
  and `:79` and in `StudyGradingStore.ts:88`; which site the verdict meant is unverified.

### Studies cleanup acceptance

- The falsify round of 2026-10-16 audited Agent `c0a23f8`, `74604c6`, `a96fe45`, `8641370` and `c7973ae`, and Study
  `a2ae4c7`, `7508dff` and `a1dea1a` (`.orkestrel/agent/studies-cleanup-audit-verdict.md`).
- The fix unit U6 adopted both lanes' prescriptions verbatim, so it closes by mutation probe and owes no re-audit
  (`.agents/orchestration.md` § Size gate). The ledger records each added Study test red under its own mutation
  (`.orkestrel/agent/studies-cleanup-ledger.md` § U6 additions).
- The user's correction of 2026-10-16 reversed prescription S4: U7 keeps `buildOllamaJudgeRow` and
  `buildStudyAgentOrigins` exported with direct proofs. That departure is the user's own ruling.
- The fix landed as Agent `c3402bc` and Study `ca81174`; the naming correction followed in Agent `f52daa4`.
- Open residue: track X-residue (units residue-tests and seams-bind; seams-bind starts from the ledger's seam table and
  its two unbound seams) and cleanup-close (`tmp/units/realign/studies.md:169-183`). `studies-cleanup-ledger.md`,
  `studies-cleanup-audit-verdict.md`, `relocation.md` and `history/` under `.orkestrel/agent/` stay until cleanup-close.

### Evaluation canon

Source: the evaluation research of 2026-10-14 under `tmp/units/`: the six `agent-eval-*-report.md` files, the
user-supplied article `agent-eval-article-supplied.md`, and `agent-study-proposal.md`. The boost carries part of it
as its plan of record: eligible denominators (`tmp/units/ladder/ladder-2.md` § S2.1) and the frozen development and
held-out split (row B-M8). Judge a study design, a report or a boost reading by it.

- **Pair the arms.** Give every arm the same initial world, task, tools, model, prompt and user behaviour, from a reset
  state (see [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World
  Domains](https://arxiv.org/abs/2406.12045)).
- **Freeze the failure classes before execution:** capacity, charged to the arm and never re-executed to improve it;
  infrastructure, which voids the trial pair, with each re-execution listed as another attempt; grader, re-gradable
  without a rollout; and outcome.
- **Headline denominators cover every declared goal.** An unserved or capacity-failed goal counts as unachieved with
  its cause. A served-only score is secondary and compares only goals every arm served. A grader's unscored item stays
  in the coverage count (see [Inspect scoring policy](https://inspect.aisi.org.uk/scoring-policy.html)).
- **Report separate columns:** facts, downstream work, obligations, critical violations, coverage, blind semantic
  score, feasibility, and cost per role (agent, memory filing, summarization, simulated user, grader).
- **One trajectory per arm is a point observation,** and its paired differences are descriptive. Size a repeated
  subset from pilot dispersion and the paid budget before execution, and report its observed interval or dispersion
  (see [Towards Reproducible LLM Evaluation: Quantifying Uncertainty in LLM Benchmark
  Scores](https://arxiv.org/html/2410.03492v2)). Report pass^k, success on every repeat, apart from pass@k, success on
  at least one (see [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World
  Domains](https://arxiv.org/abs/2406.12045)). Counterbalance arm order and record host load per trial
  (`tmp/units/agent-eval-review-report.md` O1).
- **Grade checkable facts with deterministic predicates,** each with a negative control. Run a `null` arm: a `null`
  pass on a goal that needs an action fails the check, and a `null` pass on a refusal or abstention goal is a coverage
  finding (see the [ABC benchmark audit](https://arxiv.org/abs/2507.02825)). A model judge scores only what predicates
  cannot settle, blind to arm, in randomized order, with its outputs retained (see [Judging LLM-as-a-Judge with
  MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)).
- **Keep truth away from the agent.** A held-out oracle lives outside the checkout, and only its digest enters the
  study declaration. A report carries verdicts and coverage, never oracle values.
- **An equal context and output envelope is a controlled resource envelope, not equal compute.** A cost-matched
  comparison is a separate study.

### Harness retirement order

- Before `harness-retire` deletes `.orkestrel/agent/instruments/`, land the ledger golden promotion (§ Units, Queued
  by the sweep, Ledger golden).
- The same retirement waits for W11, which reads the development and evaluation oracles under
  `.orkestrel/agent/instruments/units/aggregates/endurance/private/`, and for the move of the evaluation oracle that
  `tests/studies/endurance/study.test.ts` reads (`tmp/units/realign-2/boost.md` § 6; `tmp/units/realign-2/plan.md`
  § 1.5).

### Sweep execution hazards

- Junctions under `tmp/units/release/prewindow-review/consumers/compile/*/node_modules` point at the live
  `node_modules` of desk, ollama, study, tactica, taverna and toolbox. Unlink each junction by itself first, record and
  verify its target, and delete with Node `fs.rmSync`; never run a recursive `Remove-Item` through a junction
  (`.orkestrel/ledger.md:280`; `tmp/units/sweep/orchestrator-overrides.md`).
- `.orkestrel/agent/instruments/harness-capacity/node_modules` is a junction to `harness/node_modules`. At
  harness-retire, remove the link first with a non-recursive directory removal, then the real tree
  (`tmp/units/sweep/agent-orkestrel.json`, keep rows).

## Scaffold queue

No scaffold window is open. Read `scaffold/PARALLEL.md` before every scaffold commit, build, `repair` or `overwrite`,
and carry each item there before its unit runs.

**Scaffold 0.0.104 is published (2026-10-20).** It shipped every item of the queue that stood before it (the list
below, kept as history), under `tmp/units/scaffold-0104/plan.md` § 1.1, with the falsify verdict in
`.orkestrel/scaffold/0104-audit-verdict.md`. A3.2 closed at the first fleet visits: budget and middleware each ran
`git diff --check` after `scaffold catalog`, exit 0 (`tmp/units/release/fleet-0104-repair-lane{1,2}.md`).

### Queue for 0.0.105

- **Deferred from 0.0.104** (`tmp/units/scaffold-0104/plan.md` § 1.2):
  - L1 and L2, the window refusals and the `--digest` comparison;
  - L5, the resume ranges, and L7, the swap fresh baseline;
  - `@types/node` against the 22.18.0 floor, which needs its own fleet scan;
  - a BR-2 instrument, after the fleet conforms to the brand rule;
  - the alias lint over `app/*`;
  - the Bindings lint rule, after the last `let` visit (the user's decision of 2026-10-19).
- **From the Veneer session (`PARALLEL.md` § visit readings, a Sass 1.106.0 regression, 2026-10-20):**
  - Sass 1.106.0 refuses empty attribute-selector values and unquotes identifier-like ones; a visit's `pin` step and
    `STYLES_DEV_DEPENDENCIES` `^1.105.1` both admit it. Hold or exclude 1.106.x for styles targets until Sass fixes
    it;
  - three `writing.md` § Substitutions hits in vendored tests, which surface in every target's release pass:
    `tests/policy.test.ts:799` and `:852` ("above"), and `tests/setupPolicy.ts:351` ("once").
- **Not scaffold's:** item I, the type-proof instrument resolving the wrong root, sits in the probe package's queue.

### Queue before 0.0.104 (history)

- **G1.** `wave.ts --visit` cannot move the exact-peer vitest cluster from an existing lockfile (`ERESOLVE`). A visit
  needs a step that regenerates the lock and `node_modules`; Codex's policy refuses that destructive remedy, so the
  Orchestrator applies it (`.orkestrel/ledger.md:204`, `:206`). Recorded in `PARALLEL.md`.
- **G2.** A `captures.md` line on duplicate capture placements; documentation only. Recorded in `PARALLEL.md`.
- **G3 and G4.** `repair` refuses an unpublished `file:` devDependency, and `swap.ts` scans `devDependencies` for local
  specs. They are recorded only in this file (`PARALLEL.md` names neither on 2026-10-19), and their trigger ended when
  Study 0.0.1 published. Carry them into `PARALLEL.md` or close them as moot.
- **Catalog refresh.** Scaffold's catalog table (`scaffold/.claude/agents/orkestrel.md:49-96`) lists the versions from
  before the round and no `@orkestrel/study` row, and the hosted guides for budget, agent, ollama, mcp, probe and
  terminal differ from their owners' guides (BR-4). Each consumer then runs an online `scaffold catalog` for its guide
  mirrors (`tmp/units/realign-2/plan.md` § 1.10).
- **Template and lint items from the Study 0.0.2 design** (`tmp/units/study-002-design.md` § 1.3, the design's scaffold
  rows S1 to S4, which are not the build units S1 to S4):
  - make the vendored `.oxlintrc.json` refuse a relative import of a sibling environment (`../core` from `src/server`,
    `src/browser` and `src/vue`; `../core`, `../server` or `../browser` from `src/bin`), each with a message naming the
    alias; no override refuses one (`scaffold/.oxlintrc.json`, read 2026-10-19);
  - change the template `bin` value from `./dist/bin/main.js` (`scaffold/src/core/compilers.ts:1051`) to
    `dist/bin/main.js`, which `npm publish` otherwise rewrites with a warning (`.orkestrel/ledger.md:267`, `:268`);
  - state in `workspace.md` § Aliases that another environment is imported only through its alias;
  - add a cross-entry `instanceof` driver, a declaration-copy scan and the `npm pkg fix` fixed point to the
    distribution template.
- **Guide whitespace.** The vendored `guides/scaffold.md:2201-2205` carries a space before a tab, so `git diff --check`
  exits 2 on each visit's overwrite diff (`.orkestrel/ledger.md:259`).
- **The overwrite commit.** `wave.md` states that the visit's overwrite is committed separately (§ Standing readings).
- **Census key.** The N2 and N6 signatures miss count-only recorders, the N5, N7, N8 and N16 controls are mis-cited, and
  no Agent revision is pinned for Agent controls (handoff § Session of 2026-10-17, Census gap). Correct the key before
  the first `let` visit. Recorded in `PARALLEL.md`.
- **`distribution.test.ts` template ruling.** Make an explicit exception for the emitted harness, or emit its helpers
  into the setup module; a scaffold design lane (Opus) rules first, then one template change and one fleet pass (handoff
  § Session of 2026-10-17, Census gap). Recorded in `PARALLEL.md`.
- **BR-2,** the cross-copy guard ruling, proposed and unscheduled (§ Standing readings, Cross-copy error guards).
- **From the Ollama hermeticity verdict:** `orkestrel-harden` discovery documents that collection evaluates
  `setupFiles`; and a workspace-law home for a real-tree assertion, because Ollama's hermetic-closure proof sits in
  `tests/setupServer.test.ts` only because `config.test.ts` and `policy.test.ts` are vendored (finding A2).
- **From the scaffold fix chain:** `BOUND_PATHS` binds `configs/helpers.ts`, `configs/policy.ts` and
  `configs/browsers.ts` to their sources, and older scaffold instrument files carry lint debt. Neither blocks.
- **A home for the equivalence contract.** `.orkestrel` is never a home for a rule (`.agents/orchestration.md`
  § .orkestrel layout). Move the contract into scaffold's `typescript.md` § Bindings or the `orkestrel-falsify`
  references, then reduce § Standing readings, Equivalence contract to a pointer.
- **The title diff.** Port `tmp/units/title-diff.mjs` to a TypeScript skill script with its mirrored proof, carried
  through `PARALLEL.md`. Keep the `.mjs` file until the port lands (§ Standing readings, Equivalence contract).
- **The Bindings lint rule** lands after the last `let` visit (the user's decision of 2026-10-19).

## Packages and layer order

Catalog order (`.claude/agents/orkestrel.md`): `@orkestrel/budget` L1; `@orkestrel/workflow` and `@orkestrel/middleware`
L4; `@orkestrel/agent` L5; `@orkestrel/ollama` L6. `@orkestrel/scaffold` is every package's development dependency and
stages on its own. `@orkestrel/study` 0.0.1 is published (2026-10-19) and consumes Agent, Ollama and budget; Agent
takes Study `^0.0.1` from the registry as a development dependency (`b47ce06`).

The publish-readiness assessment read these repositories as outside the round on 2026-10-19
(`tmp/units/publish-readiness/readiness.md` § 1). The five decisions it listed are answered (handoff § Session of
2026-10-17, User answers (2026-10-19) and the Orchestrator ruling that follows them).

- **test:** the Veneer session published 0.0.27, and the local `main` was 23 commits behind `origin/main` (`84af7d0`).
- **supervisor:** its unpublished 0.0.2 has stale ranges and no `dist/`, so it needs its own unit.
- **tactica:** it sits on `rewrite/orkestrel`, 149 commits ahead of `origin/main`.
- **veneer:** the Veneer session owns it.
- **agent-phase:** a retained proof tree, waiting on the user's budget ruling D6.

The assessment does not name desk and taverna. They break on agent 0.0.31 and are outside the round too (§ Release
round, the follow-ups outside the round, unit BR-5).

## Units

The table records the queue as it stood at acceptance, with later outcomes marked.

| Unit | Repository | Depends on | Engine | State |
| --- | --- | --- | --- | --- |
| records-grok-label-import | Agent `tmp/` | Records population (complete) | Sonnet builder; Astra review | **done**: grading `69281cae…`, Records 72/312/0 (0.1875) against Compaction 56/328/0 (0.146); Sol–Grok kappa 0.82 |
| bindings-rule-3-review | text | draft 3 | Astra analyst | FAIL 2–7, 10, F1, each with a prescription |
| bindings-rule-4 | text | review | Opus planner; Astra re-audit of repaired claims | **landed** in scaffold `typescript.md` § Bindings and `architecture.md` § Middleware (re-audit: claims 1–4 confirmed; claim 5 census controls pinned in the draft) |
| scaffold-fix verify | scaffold | A, B, B2, rule landing | Haiku verifier | **done** (`wf_23c86f09-0a5`); superseded by the later fix rounds and the accepted chain `4d67f0f32` |
| agent-round-2-plan | text | designs, census | Opus planner | written (`tmp/units/agent-round-2-plan.md`); D-1 answered "Per-runner entity" |
| scaffold-fix A, B, B2, B3 | scaffold | design, checkpoint `499ade7ab` | Opus (A), Sonnet (B, B2, B3), T3 tasks | done; checkpoint `615ae1b72`; falsify round 3 FAIL 1, 2b, 4–8 plus S1 (scaffold chain `4d67f0f32`; verdict archived in git at `acff094`) |
| scaffold-fix C, C-instruments, C9 | scaffold | round 3 verdict | Sonnet builders (T3 tasks, workflows) | done, gates green; falsify round 4 (Astra) FAIL 1 (wording), 5, 6, 7, 8, 10: `tests/setupPolicy.ts` regressions (sparse overrides, read catch boundary) hidden by a whole-file approval; fix round D (D1 setupPolicy, D2 hole and catch-boundary sweep with D3, then D4 instruments): **D1–D4 accepted**. D4 removed whole-file approvals, and its behaviour run exits 0 over 197 cases with 14 plants firing. Emission exits 0 over 459 regions after the Orchestrator restored a comment that a rename had leaked into (`config.test.ts:4004`). The build is done and **every gate is green** (src:core 519, src:server 503, src:bin 336, policy 121, config 240, setup 296, skills 108, guides 47, templates 64, distribution 11). The first run's only reds were in the untracked `PARALLEL.md`, now repaired. **Round 5 FAILED**: objective lane 2, 3, 4, 6, 7, 8, 9; subjective lane 2, 4, 6, 7, 8, 9. All 7 findings reproduced, several wider than stated (laziness at 14 or more of D2's sites; guide sentences at `:196` and `:1716`; region approvals pass comments and guide text). **Checkpoint `61acbceb3`.** **Fix round E** (`tmp/units/scaffold-fix-e-brief.md`): **E1 and E2 accepted**: E2's differential has 0 mismatches over 3 822 cases against `1f2eed70e`, and 320 against the checkpoint. The equivalence contract is ruled and refined (§ Standing readings). **E2b accepted**: 52 sites on the iterator protocol, the pins, the helpers moved, and `:196` fixed. **E2c accepted**. The 10 value rows turn out to be intended `templates.ts` emission changes (0 differences once that file is swapped in), approved by exact hunk in E3. **E3 accepted** (`tmp/units/scaffold-fix-e3-report.md`): binding-aware renames, exact-shape deviations, code-only regions, 217 exact-hunk approvals each with an authority, 1099 behaviour cases over ten shapes (the class methods included), and all 23 plants fail. The class methods show no finding. E3's one finding, **F1** (`inspectPolicyConfiguration`'s `ignorePatterns` on `Array.prototype.flatMap`), is fixed by the Orchestrator with `Iterator.from` and a 7-row pin, which failed before the fix and passes after. Both instruments now exit 0 against `1f2eed70e`. `PARALLEL.md` carries the build note. **Build and gates green** (src:core 571, src:server 519, src:bin 345, policy 121, config 280, setup 368, skills 108, guides 47, templates 64, distribution 11). **Closure check: 8 of 11 closed. It FAILED 3 and 4 on B1, a blocking `src` defect:** E2c's three hand-steppers budget `length + 1` steps, so a replaced iterator yielding more entries than `length` is truncated (`dependenciesToFloors`, `filesToHost`). **Fix round F accepted** (`tmp/units/scaffold-fix-f-report.md`): `iterateAnswers` (a generator whose body is the baseline `for…of`) replaces the three steppers, and the class search found and fixed a fourth site, `planToSummary`. 270 cardinality rows show 0 differences against `1f2eed70e`, and the Orchestrator's mutants each fail the pins. **The narrow re-check of F** closed equivalence, class completeness and regressions. Its one finding, B2 (the `@throws` form, `typescript.md:217`), was fixed by the Orchestrator. Rebuilt, every gate green (src:core 582 on two quiet reruns, after one load-induced worker timeout), emission exits 0. **Accepted, scaffold commit `4d67f0f32`**, with the hash written to `PARALLEL.md`. `scaffold-local-pins` (Opus, T3 `scaffold-local-pins-opus-1`) and the fleet repair followed (rows scaffold-local-pins and scaffold release 0.0.102) |
| scaffold queue from the Veneer session (`scaffold/PARALLEL.md`) | scaffold | none | later units | **G1**: `wave.ts --visit` step 1 cannot move an exact-peer toolchain cluster (`vitest`, `@vitest/browser`, `@vitest/browser-playwright`) from an existing lockfile (`ERESOLVE`), so a visit needs a step that regenerates the lock and `node_modules` when such a cluster moves. **G2**: a `captures.md` line about duplicate capture placements hidden while capture is off, after test 0.0.26 lands. Both noted, not scheduled; carried in § Scaffold queue |
| scaffold release 0.0.102 (rulings the Veneer session relays in `PARALLEL.md`, 2026-10-19) | scaffold | the chain, U1, local-pins | Veneer: U1 (the commands hook), falsify round, release commit; the user publishes. This session: the local-pins rebase and the fleet re-pin | Veneer's rulings: 0.0.102 ships the Bindings chain with the commands hook, and the fleet re-pins to 0.0.102 **after it publishes**. **Sequence:** (1) Veneer fast-forwards `main`. The window is granted, with `main` idle at `4d67f0f32`. (2) Done ahead of time in worktree `scaffold/tmp/worktrees/local-pins`: `local-pins` is rebased onto U1 as `cb5745417` (the swap script, every gate green) plus `5ae2e8d8f` (the serve hoist). `PARALLEL.md` offers one fast-forward of `main` to `5ae2e8d8f`, or `2cc1ded7a` followed by this session's fast-forward. (3) Veneer runs its falsify round and the release commit. (4) The user publishes. (5) This session runs the fleet repair to the registry `^0.0.102` (`tmp/units/fleet-repair-brief.md`, adjusted: no local scaffold tarball). Answered in `PARALLEL.md`: local-pins rides 0.0.102, and this session carries the fleet re-pin. **Published 2026-10-19 (release commit `19671436e`). Fleet repair done:** budget `ca99510`, Agent `e8cdcba`, Ollama `3ddedba`, Study `4d97e8d`, each gated green against fresh pins (handoff § Session of 2026-10-17, Fleet repair done). Rulings for the unpublished `file:../study`: a temporary `^0.0.1` floor for the repair verb, and `local-pin.ts` for every Agent row, because `swap.ts` refuses to pack Agent. Queued for scaffold: G3 (repair refuses an unpublished `file:` devDependency), G4 (`swap.ts` scans `devDependencies` for local specs), and an online `catalog` run for the stale guide mirrors (§ Scaffold queue) |
| scaffold-local-pins | scaffold | fix chain committed | Opus (T3 task) | **accepted, commit `8cc944140` on branch `local-pins`** (to be rebased onto U1); built (`tmp/units/scaffold-local-pins-report.md`): `.agents/skills/orkestrel-publish/scripts/swap.ts`, with `--pin`, `--restore` and `--status` (status drift exits 3) and an `inventory` digest in each ledger row; `release.md`, `wave.md` and `SKILL.md` carry the convention; 6 of 6 offline tests. **Correction:** a `devDependencies` `file:` pin does not survive `repair`. Offline it fails ("names no concrete floor"); online it is rewritten to `^latest`. **The full gates are green**, apart from `test:skills`' discovery test, which tripped on the review's leftover probe directory (now removed). **The Astra falsify lane FAILED 2, 3, 4, 7, 8 and 9**, on edge-case robustness and one names rule: B1–B6, plus F1, a missing write-order test (`tmp/units/scaffold-local-pins-verdict-1.md`). The ordinary paths and parity are confirmed. **The fix unit returned.** B1–B6 and F1 are fixed. It also fixed D1: restore kept the lockfile's `file:` entry, and the new loopback-registry fixtures found it. 10 mutants each fail. **The closure check** closed B1, B2, B3, B5, B6, F1 and the fixture. It left B4 open (a bare relative `.tgz` spec slips past the guard) and D1's containment (a crafted ledger key made restore delete outside `node_modules`). **Fix 2 accepted** (`tmp/units/scaffold-local-pins-fix-2-brief.md`); rebased onto U1 as `cb5745417` and shipped in 0.0.102. Then the commit, the build, and the fleet repair (`tmp/units/fleet-repair-brief.md`). Original scope: the user-endorsed `pins.json` ledger convention written into `orkestrel-publish` `release.md`/`wave.md`, and `local-pin.ts` ported as a vendored skill script; then build, pin and `scaffold repair --offline` into the fleet (restore pins, stage, repair, re-pin). Agent, Ollama and Study have vitest 4.1.11 installed, and budget has 4.1.12, so expect the Veneer session's G1 `ERESOLVE` on the exact-peer cluster. Remedy: regenerate the lockfile and `node_modules` from the repaired manifest. Test 0.0.26's `place` change does not reach the fleet, since no consumer calls `createPortfolio`. A chooser unit (Veneer's spec in `PARALLEL.md`) must start from this chain's commit, because both edit the root `vite.config.ts` template. Write the commit hash into `PARALLEL.md` when the chain lands |
| bindings-rule-3-census-{scaffold,agent,study,budget} | read-only | draft 3 | Grok (scaffold); Astra (others) | **done**: all four returned, and their findings fed Agent round 2 and the fix chain |
| local-pin | Agent `tmp/` | none | Sonnet builder | accepted (fixture-proved; dry-run on Agent verified) |
| local-pin-absolute | Agent `tmp/` | local-pin | Sonnet builder (T3 task) | **accepted** (fixture-proved): absolute `file:` specs, so `test:distribution` runs under pins; re-pin Agent after its falsify lanes, then Study and Ollama |
| scaffold-fix-design | text | verdict | Opus planner | **done**; it fed fix units A to F |
| rule landing | scaffold rules | draft 4, re-audit | Orchestrator | **done** (`typescript.md` § Bindings, `architecture.md` § Middleware) |
| scaffold fix | scaffold | rule landing | Sonnet builders; falsify Astra + Opus | **accepted**, commit `4d67f0f32`; shipped in 0.0.102 |
| Study fix 4 and 5 | Study | verdict, census, draft 4; checkpoint `42fe9ac` | Sonnet builders (T3 tasks); falsify Astra + Opus | **accepted**, commit `a8e9443` (fix 5 adopted the prescriptions; mutation-proved); Study pinned to budget `4d74195` |
| budget sweep and U1 falsify | budget | census | Sonnet builder, Haiku gate; falsify Astra + Opus | **accepted**, commit `4d74195` (fix 3 adopted Astra's prescription; fleet survey confirms claim 5); pinned into Agent after unit H; shipped in budget 0.0.14 (`38c9a66`, § Release round) |
| Agent round 2 (D1–D10, U2, U3, census, Study restage, naming Unit B; plan `tmp/units/agent-round-2-plan.md`) | Agent | budget, Study, rule | waves 1–4 (T, P, C; A, H; K, L, ST, SM; D); falsify Astra + Opus | checkpoint `9136fd9`; waves 1–4 integrated; gates green (`tmp/units/agent-r2-verify.md`: src:core 1549, setup 168, guides 143, studies 100, distribution 9 under absolute pins); **accepted**, commit `53bfe20` (falsify round 2 FAIL closed by the fix round; successor round FAIL 3, 5, 6, 7 closed by R1–R5 with mutation probes, claim 1 the approved B0; final gates src:core 1580, setup 175, guides 147, studies 100, distribution 9); pinned into Study (`f22e76bd50c9`) and Ollama |
| Ollama Bindings sweep (the user, 2026-10-18: "Why not do the ollama let sweep? Id rather you get it out of the way as soon as possible unless there is an actual issue.") | Ollama | U4 committed (`ba171bd`, the baseline) | six Sonnet builders (T3 tasks) on disjoint file groups (OS-src, OS-setup, OS-store, OS-server, OS-service, OS-docs), each running its own draft-4 census plus the count-only recorder and hole/timing classes with differential probes; then gates, a live run on a dedicated 11435 daemon, falsify (Astra + Opus), commit, restage | **accepted**, commit `c7c611a` (`tmp/units/ollama-sweep-brief.md`); 70 `let`/`var` sites in 17 of 40 authored files; **OS-src accepted** (0 mismatches over about 24 000 differential cases; src:core 172); **OS-setup accepted** (30 of 30 differential matches; setup 101; `fetchDaemon`'s one-tick change ruled lawful; `FixtureDaemon` owed a move into `tests/setupServer.ts` after OS-server); **OS-docs accepted** (7 differential groups matched; guides 42; README fence patched by the Orchestrator; `TURN` and `RECLASSIFIED` owed the same move); **OS-store swept** (eight differential subjects matched; setupStore 167; `check` 0), its deviations D1 (`collectTurnThinking` text fold) and D2 (concurrent `timings` list) authorized as setup signature changes and sent to OS-store-F (`tmp/units/os-store-f-brief.md`); **OS-service accepted by typecheck** (eight files; one page-producer mismatch caught and fixed; its stronger whole-history assertions owed to the live run); **OS-server accepted** (34 of 36 differential scenarios matched, with the 2 differences ruled lawful; setupServer 62; setup 330; policy 119; D4, the `buildRelayRoute` closure sink, ruled banned); **OS-store-F accepted** (`StoreTimer`, `deriveTurnThinking`; 49 conversations and 5686 prefix checks matched; setupStore 181); **OS-place accepted** (D4 fixed; 16 placement moves; setup 365). **Found 2026-10-18: Ollama's `setup` project contacts the user's 11434 daemon on every run.** `setupStore.ts` imports `setupService.ts`, whose module-load gate sends a warm-up chat with `keep_alive: '30m'`. It predates the sweep (`f2a94d6`), and it was reproduced with `OLLAMA_HOST` unreachable. **OS-hermetic accepted**: the helpers moved, there is a structural import proof, `setup` passes 382 with the daemon unreachable, and `captureProviderRequest` carries 29 cases. Every non-service Ollama command runs with `OLLAMA_HOST=http://127.0.0.1:1`. **Gates green**, guarded: src:core 172, setup 383, policy 119, config 227, guides 42, conformance 17, distribution 10. **Live passes 80 of 80** on a dedicated 11435 daemon (PID 5192, stopped by PID), and discovery against it exits 0. **Falsify FAILED**: objective 2, 3, 4, 5, 7, 8, 9, 10; subjective 3, 4, 5, 7, 8, 9, 10, plus O1 (the sweep broke the open campaign's live probes). Every finding reproduced (`wf_5ca72aa3-030`), including a quadratic `computeAnswer` in `src` and a stack overflow in `findContinuedRead`. The `distribution.test.ts` ruling is reversed. **Fix round OS-F accepted**: the src, store, store-2 and server units. `computeAnswer`'s quadratic cost is ruled advisory. The live probes compile again, and the hermetic walker follows the closure. **Guarded gates green**. A lost baseline test was found by the title diff (`tmp/units/title-diff.mjs`) and restored by OS-F-dist. **Live passes 80 of 80** (11435, PID 44204, stopped by PID), and discovery exits 0. **Round 2 FAILED**, on narrow findings (both lanes: 1, 3, 5, 7, 8, 9, 10). Held: `src` equivalence, stream timing, the live run, and every round-1 closure. **OS-G accepted** (store, main and place). Gates are green, and **live passes 80 of 80** (11435, PID 41300, stopped by PID). **Round 3 FAILED, narrower still** (both lanes: 1, 5, 7, 8, 9, 10; S1). Held: `src`, the setup repairs, timing, and the live run. The `attachThinking` ruling is withdrawn, and the OS-G mode-argument prescription is corrected (the Orchestrator's error). **OS-H accepted.** The guarded gates are green, **live passes 80 of 80** (11435, PID 41108, stopped by PID), and discovery exits 0. **Closure check** (exit rule): items 2–8 closed. **Item 1 reopened at one site**, OS-H's own count-only recorder at `setup.test.ts:615`. The Orchestrator fixed it (whole history asserted; the closure mutant now fails) and reran the gates. **Accepted**, commit `c7c611a`, restaged as `9a5756095d99` into Agent (devDependency) and Study. **Agent's restage gates are green**: `check`, test 147, studies 100, distribution 9. **Study:** `check` 0 and distribution 10, but one load-sensitive red (follow-up `study-admission-timing`), done in Study `65e0188` (row study-admission-timing) |
| study-admission-timing (follow-up) | Study `tests/src/server/stores/StudyResultStore.test.ts:239` | none | Sonnet builder (T3 task) | **done, Study commit `65e0188`** (tests only, so the tarball bytes are unchanged). The mechanism was confirmed by a delayed-`finish` reproduction: `StudySeries` bounds custody by `bounds.request.duration` (25 ms in the test), and the first latched failure is rethrown as CUSTODY. `STUDY_ADMISSION_DURATIONS` (request and goal 400 ms, wait 500 ms) widens it. The case passes in plain runs and under a four-core load, and every gate passes. **Observation for the user, not changed:** a custody timeout after an earlier failure reports that failure's message, because `StudyControl` latches the first failure, and no rule or guide states this. Under heavy CPU load, other Study tests hit Vitest's 5 s default timeout. That is noted, not scheduled. The case "seals only admitted output after a goal deadline" (`expired oversized`) fails in the full three-project `test:src` (twice, 2026-10-18, while the scaffold E3 builder ran). It passes 3 of 3 alone, and `src:server` alone passes 451. It fails two ways: an output-allowance CUSTODY error (`StudyTrialLease.ts:143`), or "Goal deadline expired" surfacing as CUSTODY (`StudySeries.ts:129`) instead of as the goal observation. Its path does not import Ollama. It passed at `c1a289f`. Decide whether this is a test-timing margin (25/50 ms bounds against a 100 ms synchronous wait) or a Study race, where a deadline that fires during the evidence write is attributed to custody |
| scaffold-serve-hoist (follow-up) | scaffold `tests/` | the chain's commit | Sonnet builder | **accepted**, commit `5ae2e8d8f` (`createServedList`), shipped in 0.0.102. Originally queued: fix round F's near-duplicate `serve` iterator builders in `tests/src/bin/helpers.test.ts` and `tests/src/server/helpers.test.ts` move into `tests/setup.ts`, with a proof in `tests/setup.test.ts` (`tests.md`, near-duplicate helpers). The change is test-only: no hosted file, so no fleet re-repair |
| ollama-probes-drift (follow-up) | Ollama `tmp/probes` (git-ignored) | the sweep commit | Sonnet builder (T3 task) | **done**. The 5 type errors were API drift that predates the sweep: `format` was dropped from `ProviderInterface` (Agent `70c92d7`), and `body` was renamed `encode` (Ollama `0a36af3`, `src/core/OllamaProvider.ts:81`), so `wire-dump.test.ts` threw on its first turn. `wire-dump` now dumps `provider.encode(...)`, the body `AgentProvider` sends, and both wrappers drop `format`. The probes' `tsc` exits 0, verified by the Orchestrator. No probe ran |
| U4 Ollama | Ollama | Agent round 2 | Sonnet builder (T3 task); live proof on a dedicated daemon on 11435 (Orchestrator); Astra review | built (non-live gates green: src:core 169, setup 285, policy 119, config 227, guides 42, conformance 17, distribution 9); live `budget.test.ts` 9/9 (the daemon answers `done_reason: 'length'` at the cap; model, meter and budget stops live); full service suite 79/80, the one failure environmental (a stale `tev1:0.8b`); after the user re-pulled it (2026-10-18), judge 1/1 and the full service suite **80/80** (`tmp/units/u4-daemon-2/`); daemon stopped; Astra review FAIL 5 (reporting, recorded) and O1 (fixtures, closed by U4-F); final gates green; **accepted**, Ollama commit `ba171bd`; restaged into Agent (devDependency `baef3aed35a2`, with an `@orkestrel/agent` override to Agent's own `f22e76bd50c9`) and Study; that restage was superseded by the Bindings sweep's restage `9a5756095d99` (row Ollama Bindings sweep) |
| SB-study, SB-budget | Study, budget | the recorder ruling; the hole class from Agent and scaffold | Sonnet builders (T3 tasks); independent Haiku checker | **budget accepted**, commit `a26ff9a` (6 recorders and 1 counter converted, mutation-proved; 0 hole mismatches over 30 000 sequences; `src` unchanged, so the tarball `39343e7e9395` stays; the consumer ledgers' commit field refreshes at the fleet re-pin). **Study accepted**, commit `c1a289f`: B1–B5 restored, and the review's claim 5 (lazy grading) and O1 (channel reply id) closed by SB-study-F, mutation-proved; gates src 598 and distribution 10; restaged into Agent as `62b0c34f2995` (Agent check, setup 175, studies 100 green) |
| Study on Agent round 2 | Study | Agent `53bfe20` | Haiku verifier | **green**: re-pinned to Agent `f22e76bd50c9` and budget, Ollama and MCP copies converted to absolute (same hashes); format, lint, check, build, `npm test` (src 590, policy 119, config 229, setup 69, guides 15), `test:distribution` 10, discovery clean. Study compiles against round 2's declarations and does not exercise its behaviour |
| Study naming Unit A | Study | Study fix | Sonnet builder (T3 task) | **accepted**, commit `983dba7` (rulings: `buildCustodyPacketLabeling` added to row 10's family; `StudyProcessOptions` kept); restaged into Agent as `bba37038e8d2` (handoff § Session of 2026-10-17) |

Staging follows each accepted unit: scaffold into budget, Study, Agent and Ollama; budget into Agent, Study and Ollama;
Agent into Study and Ollama (and itself through Ollama, by override); Ollama into Agent and Study; Study into Agent.
That staging ran until the release round; from 2026-10-19 the consumers take registry ranges (§ Release round).

### Queued by the sweep (2026-10-20)

Each unit promotes an instrument that settled a claim into a test (`.claude/rules/quality.md` § Instruments), or repairs
a defect the sweep found. None is dispatched. Keep each source until its unit lands.

- **Endurance preflight test** (Agent).
  - Source: `tmp/units/endurance-preflight.ts` and `tmp/units/endurance-preflight-test.ts`.
  - Settled: the endurance admission preflight refuses six negative controls, each with its exact reason
    (`DUPLICATE_ARRIVAL:arrival.id`, `DUPLICATE_GOAL:goal.id`, `ORDERED_ARRAY:goal.input.arrivals`,
    `FINITE_SAFE_INTEGER:goal.calls` for an unsafe bound and for a nonfinite bound, and
    `FINITE_SAFE_INTEGER:arithmetic.goal.tokens` for an unsafe product), refuses the former profile
    (`PUBLIC_ENVELOPE:trial.calls`), and admits the room profile with its exact population
    (`endurance-preflight-test.ts:112-142`); `tmp/units/endurance-preflight-audit-report.md` claim 1 confirmed it.
  - Target: an Agent test under `tests/` that regenerates its controls in a scratch directory. The script writes its
    outputs as `tmp/units/endurance-preflight-*.json` (`endurance-preflight-test.ts:125`, `:150`, `:173`), among them
    the `-room`, `-check-endurance`, `-check-qualification` and `-test` files that `tmp/studies` custody pins by path
    (keep row K4 of `tmp/units/sweep/agent-units-files.json`), so neither the test nor a rerun of the script may write
    there.
  - Deadline: before either source file is deleted. Both are custody-pinned by the same keep row. The 2026-10-20 sweep
    removed the controls directory `tmp/units/endurance-preflight-controls/`, the per-case outputs
    `endurance-preflight-{old,duplicate,goals,order,unsafe,nonfinite,product}.{json,err}`, the `.err` files of `-room`
    and `-check-*`, and the unit's brief, report, audit brief, audit diff and audit status. The sweep archive keeps all
    of them. A run of the script regenerates them but also rewrites the custody-pinned files, so take them from the
    archive or from the test's scratch run.
- **Ledger golden** (Agent, ladder W7).
  - Source: the git-ignored `tmp/probes/ledger-golden.test.ts` and `tmp/probes/ledger-golden-full.test.ts`, with
    `.orkestrel/agent/instruments/harness/golden/` and its `baseline-materialize.ts`.
  - Settled: the complete-capture request-byte golden for the Records design.
  - Target: `tests/src/core/ledgers/Ledger.test.ts`, with no `golden.test.ts`. `tmp/units/ladder/ladder-2.md:401`
    governs; `tmp/units/ladder/probes.md:236` still names `tests/src/core/ledgers/golden.test.ts`.
  - Deadline: before `harness-retire` deletes `.orkestrel/agent/instruments/`, and before any sweep touches
    `tmp/probes/`.
- **Performance gates** (Study, conditional).
  - Source: `tmp/units/compaction-output-2-perf-gates.ts`, kept with the `compaction-output-2-*` tooling.
  - Settled: over one sealed reader result, a component is prioritized at 20% or more of its role's request wall and is
    a sole whole-run candidate at 15% or more of the attempt wall; the script refuses a role whose phase sum exceeds its
    provider total, a provider total above its request wall plus 1%, and role walls above the attempt wall
    (`compaction-output-2-perf-gates.ts:1-4`).
  - Target: a Study performance-reader test whose control triples the summary prefill and is refused with "phase sum
    1919193 ms exceeds provider total 898587 ms" (`tmp/units/ladder/probes.md:241`), only if the ladder keeps using
    the script ("a test if the ladder keeps using it", `tmp/units/sweep/agent-units-files.json`). Otherwise the script
    is deleted with the campaign tooling at the boost's acceptance (`probes.md:248`).
  - Deadline: before the boost closes and releases its tooling (`tmp/units/ladder/ladder-2.md:58`).
- **Browser service scratch path** (browser).
  - Defect: `tests/service/document.test.ts:101-104` writes `tmp/codex/reading-joining-source.json` with no
    `mkdirSync`, so the service run fails with `ENOENT` in a fresh clone or after a sweep that removes `tmp/codex/`
    (browser `be09c02`, read 2026-10-20). Browser's `ROADMAP.md` does not name it.
  - Repair: create the directory recursively, or write into a scratch path.
  - The 2026-10-20 sweep removed only the files in browser's `tmp/codex/` (`tmp/units/sweep/other-repos.json`, delete
    row 47), so the directory stays until this lands.

## Routing

The user's 2026-10-17 instruction makes Claude, Codex and Cursor available and asks for full use of Astra (Codex) and
Grok 4.7 (Cursor). Lanes follow `.agents/orchestration.md` § Engines and § Routing: Astra holds the objective lanes
(analyst, correctness audit, falsify objective lane), Opus the subjective lanes, Sonnet builds, Haiku gates, and Grok
broad mapping and labeling. Grok never takes a design or review lane. Benches were probed live on 2026-10-17: Codex
`gpt-6-astra` session `01a14cd6-e19f-7681-95ac-1b923f7d6c0e`, Cursor `grok-4.7-xhigh` session
`2e8af759-282c-4b87-9904-5ff0ab471c80`, and a native Haiku scout.

On 2026-10-19 the user asked to spread the workload onto the Codex models. From that row on, units go to Codex through
T3 `delegate_task`: Sol builds, Astra designs and reviews, Luna gates and drives, and Claude keeps the Orchestrator,
with Claude Sonnet and Opus in native Workflow lanes (`.orkestrel/ledger.md:182`).
