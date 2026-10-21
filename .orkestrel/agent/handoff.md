# Agent boost handoff — 2026-10-21

This is the starting point for the next session on Agent, Study and this session's related packages: Ollama, budget,
terminal, workflow, mcp, middleware, probe, browser and toolbox. It is not about the Veneer session's packages (test,
veneer, form, table, guide, html, workspace); that session owns them and coordinates through `scaffold/PARALLEL.md`.

Paths without a prefix resolve from `C:/Users/mikes/WebstormProjects/agent`. The previous handoff, a 115 KB history of
the sessions through 2026-10-19, is in git: `git show 8c62459:.orkestrel/agent/handoff.md`. Do not treat its process
entries as active.

## Read first

1. Agent's `AGENTS.md`, then everything it points to in the neighboring scaffold checkout: `../scaffold/AGENTS.md`, the
   `../scaffold/.agents/orchestration.md` file, the applicable `../scaffold/.claude/rules/`, and the dispatch-named
   skills under `../scaffold/.agents/skills/`. In Claude Code, also the `../scaffold/.claude/AGENTS.md` file.
2. This file. Its ladder table is the current state of each unit.
3. `tmp/units/ladder/dispatch-ledger.md`.
   - § Settled decisions holds the boost's numbered rulings. Later rulings sit in § Run ledger rows, among them the
     "Orchestrator rulings for the handoff (2026-10-21)" row.
   - The run ledger is not strictly chronological: read a unit's state from its latest result row by unit name, never
     from the end of the file.
4. `tmp/units/ladder/ladder-2.md`, the boost's plan of record, with `tmp/units/ladder/ladder-2-closure.md`.
5. `.orkestrel/plan.md` for the fleet campaign's standing readings and the scaffold queue (§ Scaffold queue, § Queue
   for 0.0.105). Its runner and sweep readings are updated for U1c and the 2026-10-21 sweep.

## Where things stand

- **Scaffold 0.0.104 and Study 0.0.2 are published.** Every package of this session takes Scaffold 0.0.104.
- **The boost ladder has run no GPU work.**
  - Accepted: W0, W1, W2, W4, W5, unit A (driver adapter), unit B (stage, freeze, pin, reader), W3 (seed ingress
    design) and W7 (Ledger capture tests, committed).
  - Built and reviewed FAIL: W6 (fix owed) and W8 (fix done; closure and verifier owed).
  - Built and unreviewed: the 0.40.7 runner pin and S-T.
  - W4 owes the re-verify the realignment note records (`dispatch-ledger.md`: its pins-ledger identity moved from
    `251544b1` to `1974e76a`). No row closes it; unit A's "affected W4 tests pass" is the only later evidence, and unit A
    moved W4's admission to the captured runtime receipt.
- **The runner is Ollama 0.40.7** (user ruling U1c). The scoop install moved from 0.40.6 to 0.40.7 on 2026-10-21. The
  receipt is `tmp/runtimes/ollama-0.40.7-receipt.json` (physical executable
  `C:/Users/mikes/scoop/apps/ollama-full/0.40.7/ollama.exe`, SHA-256 `563f2040…`). The user restarts their own 11434
  daemon.
- **Codex was paused for this handoff only** (the user, 2026-10-21, to avoid a usage cutoff). The next session uses
  Codex again under § Engines.
- **A scratch sweep ran on 2026-10-21.**
  - It removed 41.16 GiB (about 44.2 GB; 441,330 files) of fixture output, mutation copies and suite copies from
    accepted ladder units, plus the nested scratch of `tmp/units/scaffold-0104/` and `tmp/units/study-002-falsify/`.
  - `ladder-2.md:58` allows the Orchestrator to remove an accepted ladder unit's disposable files after the keep check.
    The scaffold-0104 and study-002-falsify scratch fall outside that line and rest on the Orchestrator's keep check,
    which a Claude Opus review confirmed.
  - It kept:
    - every deliverable and every in-flight unit's directory;
    - every role directory's top-level reports, and every file a kept document cites;
    - every other directory under `tmp/units/` whole: custody copies, the previous sweep's archive, and the sources the
      live probes import;
    - `fix-w5-2/` except its `artifacts/`.
  - Each cited directory it emptied holds a `SWEPT.md` note.
  - Links were removed without being followed. The one live link target, Agent's `node_modules`, is unchanged, and so
    is the `.orkestrel/agent/instruments` tree the sweep guarded (3,462 files before and after).
  - A census of 2,037 kept documents before and 2,039 after found no additional dangling reference outside the sweep's
    own records. The two extra documents are those records.
  - The plan, the executor, the exclusions and the record are in `tmp/units/sweep-1021/`. Never run `sweep.ts --tmp`
    in Agent while the boost is open (the "Sweep guard" paragraph under § Acceptance in `.orkestrel/plan.md`).

## Repositories

| Repository | State |
| --- | --- |
| agent | `main` at the handoff commit, local only: Agent carries unpushed commits by standing practice. Version 0.0.31; Study `^0.0.2`, Scaffold `^0.0.104`. Root `ANALYSIS.md` and `PROPOSAL.md` are the user's (§ Rules) |
| study | `main` `1f33206` (0.0.2, pushed, clean). S-T sits on the local branch `st-collaborator` (`7eb0f56`), unreviewed and unreleased. 14 old worktrees remain under `C:/Users/mikes/WebstormProjects/study/tmp/worktrees/` (§ Open follow-ups) |
| scaffold | `main` `408a9924d` (0.0.104, pushed). `PARALLEL.md` is untracked and shared; never commit it |
| ollama | `3582325` (0.0.24, Scaffold 0.0.104, pushed). O1, the reuse of the harness's `DistributionResolution`, landed one commit earlier in `bdbc036` |
| budget, terminal, workflow, mcp, middleware, probe, browser, toolbox | Scaffold 0.0.104 repairs, each pushed with no bump: `b247889`, `2ba9eda`, `8d97346`, `ac11c79`, `5d40c0c`, `4c5658f`, `78ad754`, `c7e5e56` |

## The boost ladder

Every ladder path in the following sections is under `tmp/units/ladder/`. A unit's brief is `<unit>-brief.md`, its
build report is `build-<unit>/report.md` or `<unit>-report.md`, and its review is `<unit>-review-astra.md`.

| Unit | State | Evidence | Next |
| --- | --- | --- | --- |
| W6, request variants (`replay/`) | built: W6-5 and W6-7 partial for absent inputs; **review FAIL** W6-2, W6-3, W6-4, W6-6, W6-7, W6-8 and O1 | `build-w6/report.md`, `w6-review-astra.md` | a fix round against the review's findings, then a closure check and a verifier. The acceptance bar is in the ledger's handoff-rulings row: the two input gaps block only G7's fold 93 and RS3 |
| W8, offline idea readings (`l0-readings.ts`) | review FAIL W8-1, W8-2, W8-4, W8-5, O1, O2; fix round 1 done (16/16, mutations 0/1/0) | `w8-review-astra.md`, `w8-fix-report.md` | a closure check and a verifier; then promote the regenerated readings from `fix-w8/` over `l0-readings.json` |
| Runner pin 0.40.7 (sized medium) | built as a patch, not applied: W5 and B read the runner from `constants.ts`; W5 61/61, B 38/38 in an isolated copy | `runner-0407-report.md`, `runner-0407/changes.patch`, `runner-0407/before.json`, `runner-0407/after.json` | see the order of dispatches |
| S-T, Study's optional role-aware `fetch` collaborator | built and gated, 0/1/0 mutations; on Study branch `st-collaborator` | `tmp/units/study-st/st-report.md`, `tmp/units/study-st/st-brief.md` | an Astra contract review, then § Releasing S-T |
| W3b seed portion | brief ready, not dispatched | `w3b-seed-brief.md` (with its § Before dispatch), `seed-ingress-design.md` | name claim 12's captured-root route in the brief, then dispatch on a clean Agent checkpoint |
| A-G, B-G | not briefed | `seed-ingress-design.md` § Separately dispatched prerequisites | after the runner pin's in-place verify, because they edit the same `launch/`, `drivers/` and `staging/` files |
| W3b transport portion | waits for S-T's adoption, A-G and B-G | `seed-ingress-design.md` § Falsifiable W3b exit checks 8 to 10 | after its prerequisites |
| G0, the first GPU screen | waits for W6 acceptance and the runner pin's in-place verify | `ladder-2.md` § S7.2; inputs `tmp/units/perf-replay-packet/index.json` (`824ea009…`) | a G0 run brief (see the order of dispatches) |
| W9 to W13, G1A to G7 | not started | `ladder-2.md` § S7.1 and § S7.2 | in the plan's order, gated as written; W9, W13 and W11's projection preparation are ready now |
| R-G | not started | `seed-ingress-design.md` § Separately dispatched prerequisites | first needed by a live treated Records segment |

The accepted instruments and their tests live in `instrument/`, `compaction-seed.ts` with the W2 seed exports under
`artifacts/` (`w2-c17-0d75d382…`, `w2-c52-1ca8e91b…`), `records-seed/`, `launch/`, `drivers/`, `receipts/`,
`staging/`, `replay/`, and the W5 suite in `fix-w5-2/`. Verify an accepted unit's bytes before relying on them:
- until the runner patch applies, against `fix-a/audit.json`, `fix-a2/final-hashes.json` and `fix-b/source-hashes.json`;
- after it applies and verifies in place, against `runner-0407/accepted-hashes.json`, which that verifier writes.

### Order of the next dispatches

1. **Reviews and fixes, in parallel where the files are disjoint:**
   - the W6 fix round;
   - the W8 closure check and verifier;
   - the runner pin's Astra closure, on the isolated patch;
   - the S-T Astra contract review.

   Read-only reviews may run beside one another. Every gate run is serial on a quiet host: Study's gates are
   load-sensitive (`.orkestrel/plan.md` § Release and gate readings), and the runner verify's W5 and B populations take
   about 15 minutes and several GB of fixtures. Ready no-GPU units can fill idle lanes on disjoint files:
   - W9, one Grok mapping lane;
   - W13, which needs W2, W4 and W7, all accepted;
   - W11's projection preparation.
2. **The runner pin applies,** with `git apply` from `tmp/units/ladder/`. Apply it only after the W6 cycle, the W8 cycle
   and any W3b run that reads `drivers/`, `launch/`, `staging/` or `fix-w5-2/` have exited. Then run Luna's in-place
   verify:
   - W5 61 on the pinned Node 26, B 38, and the added `launch/Launcher.test.ts`;
   - a hash match with `runner-0407/after.json`;
   - it writes `runner-0407/accepted-hashes.json`.
3. **W3b seed portion,** on a clean Agent checkpoint, after its brief names claim 12's captured-root route.
4. **G0, after W6 is accepted and the runner pin is verified in place.** Tell the user before the GPU phase. The G0 run
   brief:
   - **Daemon:** the dedicated 11435 daemon from the 0.40.7 receipt, with the environment the 0.40.3 lineage used
     (the "0.40.3 lineage" reading in `.orkestrel/plan.md` § Release and gate readings).
   - **Procedure:** model-unload cold state (W6-COLD); inputs from W6's post-fix construction artifacts.
   - **Caps and charge:** 15 model minutes and 20 elapsed minutes, charged to L1 with a run-ledger row, because the
     production launcher refuses an L0 charge. Record the host load before and during the run.
   - **Roles:** Luna drives and Astra analyzes.
   - **Release check:** if the pre-GPU check finds a stable Ollama newer than 0.40.7, stop and ask the user, because
     adopting it reopens the runner pin.
5. **A-G, then B-G,** after step 2, in parallel with S-T's release. Then the W3b transport portion, after S-T's
   adoption, A-G and B-G. Then G2's remaining prerequisites (`seed-ingress-design.md` § Separately dispatched
   prerequisites).

### Releasing S-T

- **Scope ruling first.** The Scaffold 0.0.104 plan (§ 3.3 of `tmp/units/scaffold-0104/plan.md`) owes two passes at
  Study's next release, which is this one:
  - Study's own F-dist pass: keep the C1 driver, and fold C3 and C23 into the harness rows;
  - F-wording.

  Ask the user whether Study 0.0.3 carries them as a separately scoped unit reviewed with S-T, or defers them to 0.0.4
  with the deferral recorded.
- **Review, then verify on `main`.** After the Astra review passes, the Orchestrator fast-forwards Study `main` to
  `st-collaborator` locally, without pushing. Luna then verifies on `main`, serially, on a quiet host.
- **Bump and gate.** Bump to 0.0.3 per scaffold's release rules. Run every `prepublishOnly` step in clean clones, on
  Node 24.22.0 and on the portable Node 22.18.0 with npm 11 (`tmp/runtimes/node-v22.18.0-npm11-win-x64`).
- **Push and publish.** Push after the user approves. Publish with scaffold's `window.ts --publish <dir> --otp <code>`,
  using the user's one-time code, then `--confirm`.
- **Adopt.** Agent takes `@orkestrel/study@^0.0.3` from the registry with its gates and commits. Then re-baseline unit
  B's installed-manifest pins (§ Rules, Study freshness hold).

## Settled decisions

`tmp/units/ladder/dispatch-ledger.md` § Settled decisions holds the boost's numbered rulings; later rulings sit in
§ Run ledger rows. The newest:

- **W6-COLD (2026-10-21):** G0's cold state is model unload on the dedicated daemon.
- **U1c (2026-10-21):** G0 screens Ollama 0.40.7, and U1b's fresh same-seed controls carry over.
- **S-T (2026-10-21):** build and release Study's collaborator.
- **PROPOSAL.md (2026-10-21, run ledger):** the next wave follows the ladder plan, with `PROPOSAL.md` unread.
- **The Orchestrator's handoff rulings (2026-10-21, run ledger):** the W6 acceptance bar, the runner pin's size, order
  and baseline, the Study freshness hold, and the A-G and B-G order.

## Engines

- **Codex, through T3 `delegate_task` with provider `codex`:**
  - GPT-6.1 Sol builds;
  - GPT-6 Astra designs and reviews;
  - GPT-6 Luna verifies and drives.
- **Claude:** orchestrates, writes documentation voice, and holds a lane the Codex filter stops. Never Fable.
- **Cursor:** its premium models are available for subagent lanes. Grok only labels and maps; never Composer.
- **Codex content filter:** it has stopped Astra review lanes on attack wording. Brief reviews as neutral quality
  assurance, have the lane write its verdict early, retry one time, then fall back to Claude.
- **Every subagent prompt carries this sentence verbatim:** "Make sure you thoroughly read the AGENTS.md in the
  neighboring scaffold folder along with the files that it points to especially the rules/agents/skills and follow
  them strictly, especially in regards to repo structure."
- **Unit cycle:** a build, an independent review, a fix round when needed, a closure-only check, then a verifier. When
  rounds only touch test plumbing, one closure-only check and then commit.

## Rules

- **Ollama guard.** Set `$env:OLLAMA_HOST = 'http://127.0.0.1:1'` before every Node or npm command, including
  `ollama --version`. The user's daemon on 11434 is theirs. Ladder GPU work uses a dedicated 11435 daemon, started from
  the receipted physical executable and stopped by its recorded process id only.
- **Study freshness hold.** Agent's installed Study stays at registry 0.0.2 until S-T publishes and Agent adopts it.
  Never pin `st-collaborator` into Agent: unit B's accepted audit pins the installed `@orkestrel/study` manifest, and
  W3b builds against 0.0.2. After the adoption, re-baseline those pins.
- **Custody.** Never write under `tmp/studies`. Read only its manifests, never raw transcripts or labels.
- **Secrets.** Never read `.env*`, `.npmrc`, `auth.json`, keys or tokens. Never run `npm login` or `npm publish`;
  publish only through `window.ts` with the user's one-time code.
- **User's notes.** Agent's root `ANALYSIS.md` and `PROPOSAL.md` are the user's. Never read or edit them unless asked.
  Agent's `format:check` and `test:policy` read the whole tree, so the notes stay formatted and free of `writing.md`
  banned terms (2026-10-20, `2d2b964`).
- **Commits.** Stage and commit by explicit path (`git commit -m … -- <paths>`). Never amend, force, or skip hooks.
- **Pins.** `tmp/tarballs/pins.json` pins stay uncommitted; restore them before a scaffold verb or a publish.
- **Worktrees.** Use them only to parallelize writers; merge back, remove, prune, and delete the branch afterwards.
- **Shell.** Windows PowerShell 5.1: no `&&`, use `npm.cmd` and `npx.cmd`, and give absolute paths in every write. A
  subagent's shell restarts in Agent's root on each call.
- **Test discovery.** Never list Vitest projects without naming them. The dispatch census lists every project, and
  Agent's `tests/distribution.test.ts` packs and installs at module load.
- **Scaffold.**
  - Edit no scaffold-owned file in a consumer; `scaffold repair` restores them.
  - `repair` does not run the catalog step. Run `npx scaffold catalog` after it, then `npm install` to converge the
    re-declared ranges.
  - Read `scaffold/PARALLEL.md` before any scaffold commit, build or repair, and reply there.
- **Node.** Packages support Node 22 and 24 LTS; releases also gate on Node 22.18.0. Node 26 is only the W5 launcher's
  pinned native host (`tmp/runtimes/node-v26.12.0-receipt.json`).
- **Ollama releases.** Check the GitHub releases before each GPU phase and each Ollama visit, and adopt stable releases
  after asking the user. Scoop refuses to update while the tray app and daemon run, so the user quits them first. A
  runner change opens a separately screened lineage.

## Open follow-ups

- **Study worktrees.** 14 old worktrees under `C:/Users/mikes/WebstormProjects/study/tmp/worktrees/`. `compaction-output`
  (`422d549`) matches the Study build the sealed compaction-output-2 series captured. Before removing any worktree,
  check that no series reads it, that it is clean, and that its HEAD is merged.
- **The agent-phase worktree.** The `agent-phase` sibling worktree (detached `f0c2e03`) waits on the user's budget ruling
  D6.
- **Historical references.** `.orkestrel/ledger.md`, the instrument READMEs under `.orkestrel/agent/instruments/`, and
  the lifecycle records under `.orkestrel/agent/lifecycle/` cite `tmp/` files that earlier rounds swept. They are
  records; git history and `tmp/units/sweep/archive/` keep the files. Never chase those paths.
- **Fleet work owed at each package's next release** (§ 3.3 of `tmp/units/scaffold-0104/plan.md`):
  - F-dist: Agent's `tests/distribution.test.ts` still stages at module load; Study keeps its C1 driver and folds C3
    and C23 into the harness rows (§ Releasing S-T);
  - F-floor: Node 22.18.0;
  - F-errors: the brand guards;
  - F-wording: guide and comment rewording.
- **Development re-pins at each package's next visit.** The Veneer session published guide 0.0.25 and test 0.0.29
  (`scaffold/PARALLEL.md`, 2026-10-21).
  - Take `^0.0.25` and `^0.0.29` as development re-pins with no bump: install with `npm_config_prefer_online=true`,
    sweep the self-pins, rebuild, and bump only where `compare.ts` exits 3.
  - test 0.0.29 adds `SEGMENTED_INPUT_TYPES`, `FOCUS_SEGMENT_LIMIT` and `supportsSegmentedFocus` to the names it
    claims under `test:policy`.
- **Scaffold 0.0.105 queue:** `.orkestrel/plan.md` § Queue for 0.0.105.
