# Agent and Study handoff — 2026-10-15

This is the starting point for another session. Read this repository's `AGENTS.md` and its
Scaffold authority before acting. Paths without a sibling prefix resolve from
`C:/Users/mikes/WebstormProjects/agent`. The long chronological handoff is archived at Agent
commit `78ea378`; do not treat its historical process or deadline entries as active.

## Session of 2026-10-17

The live campaign plan is `.orkestrel/plan.md` (goal, exit criterion, units, routing). User instruction: resume the
`let` sweep, the budget redesign and the Records labeling with full use of Claude, Codex Astra and Cursor Grok; publish
nothing; regenerate each changed package's distributable and point consumers' `package.json` at it locally, always
working on the latest builds. That instruction outranks `wave.md`'s keep-the-registry-range sentence; the release law's
other terms still bind (tarball, never link; record the replaced range; restore before publishing).

- **Records Grok population complete.** PID 53796 exited 0, uncapped, in 8801896 ms: summary
  `{"labeled":39,"skipped":57,"total":96,"complete":true}` (057–095 labeled in this attempt; 001–056 and the 096 pilot
  re-verified). Agent's `node_modules/@orkestrel/scaffold` is no longer frozen. The import unit
  (`tmp/units/records-grok-label-import-brief.md`) audits all four disclosed attempts against grading `4868d734…`.
- **Records Grok grading imported (2026-10-17).**
  - Audit: `tmp/units/records-grok-label-import-audit.ts`, exit 0. It covers 96 batches and 384 unique judgments
    across the four disclosed attempts. The refused 051 and 057 attempts are excluded. The merged labels file is
    `tmp/studies/records-grok-labels.json`, SHA-256 `48a9a610…5d98`, created once.
  - Review: an independent Astra review (`tmp/units/records-grok-label-import-review.md`) failed two claims.
    - Claim 7: the captured `422d549` Study refuses the Records manifest and grading formats.
    - Claim 6: `report` took an unbound digest.
  - Fix 2 adopted both prescriptions and closed with 24 mutation probes.
    - The launcher now runs the inventory-pinned `f977e68` runtime (`tmp/units/study-root-install-f977e68`, 17 files),
      which imported Sol's Records labels on 2026-10-15.
    - Its runtime check (`tmp/units/records-grok-label-runtime-check.ts`) proves three things: the runtime reads the
      Records formats, it rebuilds packet `2ac2a898…`, and it refuses a foreign packet.
    - `report` takes its digest from the label result record.
  - `study label` returned grading `69281caeec6e5a8c9f159c922e9f4e1056d86c2d94e9b4091fd06ff2b2ddeafb`: exit 0,
    uncapped, 4072 ms. Its previous grading is `4868d734…`, its packet `2ac2a898…`, its labeler `grok-4.7-xhigh`.
  - `study report`: exit 0, uncapped, 1957 ms. Records reads 72 achieved, 312 unsuccessful, 0 unknown and 30 critical
    out of 384 (0.1875).
  - Judge usage: 96 calls, 8507083 tokens (6735651 input plus 1771432 output; 559488 cached input, not added again),
    22647151 ms.
- **Records against Compaction, judge for judge (exploratory).** Both readings use Grok 4.7 Extra High, which
  substitutes for the frozen Sol-high adjudicator.

  | Arm | Achieved | Unsuccessful | Unknown | Critical | Share |
  | --- | --- | --- | --- | --- | --- |
  | Records (`69281cae…`) | 72 | 312 | 0 | 30 | 0.1875 |
  | Compaction `compaction-output-2` (`69a7a63a…`) | 56 | 328 | 0 | 41 | 0.146 |

  - **Judge agreement.** On the same Records packet, Sol (`b3636a40…`, 78 achieved, 305 unsuccessful, 1 unknown) and
    Grok agree on 362 of 384 judgments. That is 0.943, with Cohen's kappa 0.82 (`tmp/units/records-labeler-agreement.json`).
    The disagreements: 14 Sol achieved where Grok found unsuccessful, 7 the reverse, and 1 Sol unknown where Grok found
    achieved.
  - **What this does not show.** Each arm is one repetition. The arms ran on different builds and rooms, and both
    adjudicate the same 96-goal workload (`e6d2396c…`). So this is descriptive, not a causal claim about the strategies
    and not a replicated quality difference.
- **Benches live** (probed 2026-10-17): Codex `gpt-6-astra`, Cursor `grok-4.7-xhigh`, native Claude Haiku.
- **Stray file removed.** An empty untracked `src/core/compilers.ts` (0 bytes, created 2026-10-16 14:48) was deleted.
- **Second stray removed (2026-10-18).** Agent held an untracked `src/core/Meter.ts`, created 2026-10-17 23:22 during
  budget fix 2. It was a re-encoded copy of budget's fixed `Meter.ts`, with its em dashes turned to mojibake, so a
  builder had written through a relative path after its shell's working directory reset to Agent. Budget's own file is
  intact, and no other Agent source or test file changed. Every brief now requires absolute write paths.
- **Budget U1 accepted (2026-10-18), budget commit `4d74195`.** It covers the meter surface, the typed `BudgetError`,
  the budget test sweep, and falsify fix rounds 2 and 3 (verdict `.orkestrel/budget/budget-u1-audit-verdict.md`).
  - `charged` is now the total growth the budget accepted from the meter. Charges in flight sit in a registry of claim
    records.
  - Grok's fleet survey (`tmp/units/budget-fleet-survey-grok-1.md`) confirms that design 2 § 1.4 names every
    consumer-visible sink. The one row it adds is agent-phase's copy of Agent's partial-run payload.
  - The cross-copy `isBudgetError` hazard is fleet-wide and recorded, not fixed here.
  - Nothing is published. The budget tarball is pinned into Agent through `tmp/units/local-pin.ts` after Agent's unit H
    returns.
- **The local-pin convention (user-endorsed 2026-10-18).** The user's words: "I liked your idea of the pins.json with
  the `tmp/tarballs` that way we have a manifest to track and make sure we are using the correct build … keep track of
  that … for later sessions and models and across repos and packages".
  - **The ledger** is `<consumer>/tmp/tarballs/pins.json`, beside the content-named tarballs. It is the record of which
    build each consumer runs. `local-pin.ts status` checks the installed bytes against it.
  - **Canonical home.** Scaffold's `orkestrel-publish` skill, `references/release.md` § Fix a dependency before it
    publishes and `references/wave.md:48-52`. Both still describe only the `npm install --no-save` route.
  - **Planned unit `scaffold-local-pins`.** It runs after scaffold's fix chain closes and before the fleet repair, so
    every target receives it. It writes the ledger convention into the skill and ships `local-pin.ts` as a vendored
    skill script.
  - **Scaffold verbs.** The blueprint refuses a non-caret `@orkestrel` range in `dependencies`
    (`scaffold/src/core/compilers.ts:3284-3291`). So restore the pins, stage the scaffold tarball, run `repair`, then
    re-pin.
- **Local pins in Agent (2026-10-18), through `tmp/units/local-pin.ts`.** The ledger is `tmp/tarballs/pins.json`, which
  records each replaced range; `restore` puts the ranges back.
  - `@orkestrel/budget` is `file:tmp/tarballs/orkestrel-budget-0.0.13-39343e7e9395.tgz`, built from budget commit
    `4d74195`, replacing `^0.0.13`.
  - `@orkestrel/study` is `file:tmp/tarballs/orkestrel-study-0.0.1-5a199349197d.tgz`, replacing `file:../study`. It is
    packed from a copy of Agent's installed `422d549` build (`tmp/units/study-root-install-422d549`), so the installed
    Study bytes did not change. The ledger's `commit` field for Study shows Agent's HEAD, because the copy lives in
    Agent's `tmp/`.
  - `overrides` maps `@orkestrel/budget` to `$@orkestrel/budget`, so every nested budget dependency resolves to the one
    copy.
  - The fresh Study build replaces the Study pin in wave 3, together with the studies' `clear()` edits.
  - **Standing reading, superseded on 2026-10-18.** Each pinned package's `test:distribution` was red by construction:
    the packed manifest named `file:tmp/tarballs/…`, which does not resolve in the scratch consumer, as `wave.md`
    warns.
    - Unit `local-pin-absolute` (fixture-proved) now writes absolute specs,
      `file:<consumer>/tmp/tarballs/<file>`, which resolve anywhere on this machine. The tool still recognizes the old
      relative form.
    - Under a hand-made absolute manifest, Agent's `test:distribution` passed 9 of 9.
    - Re-pin each consumer to take the new form. Restore the pins with `tmp/units/local-pin.ts restore` before a release
      gate as before.
  - **Formatting.** The tool appends `overrides` last, and `oxfmt` sorts `package.json` keys. Run
    `npx oxfmt package.json` in the consumer after each pin. Agent's is fixed; Study's is pending.
  - The pins stay uncommitted. Acceptance commits exclude `package.json` and `package-lock.json`.
- **Bindings rule landed (2026-10-18).** Draft 4 is in scaffold's `typescript.md` § Bindings and `architecture.md`
  § Middleware, after an Astra re-audit. Claims 1–4 were confirmed, and claim 5's census controls are pinned to
  immutable revisions in the draft. User decision (D-1): Agent's runner spawn record becomes a per-runner entity.
- **Checkpoints before the fix units.** Scaffold `499ade7ab`, Study `42fe9ac` and Agent `9136fd9`. Each is a commit of
  the falsify-failed sweep tree, not an acceptance.
- **Study restaged into Agent (2026-10-18).** The pin is now `file:tmp/tarballs/orkestrel-study-0.0.1-bba37038e8d2.tgz`,
  Study `983dba7` (the fix chain plus naming Unit A). `local-pin.ts` packs a pinned source with its registry ranges, so
  the tarball carries no `file:` spec.
- **Agent round 2 (2026-10-18).**
  - Waves 1–3 are integrated uncommitted on `9136fd9`: units T, P, C, H, A, K, L, ST and SM, with their shared patches
    applied.
  - `dist/` was rebuilt from that tree, and `test:studies` passes 100 of 100 against it.
  - Unit D (guide parity, Opus) is running. The tree-wide verifier, an Agent census re-run and Agent's falsify round
    follow.
- **Agent round 2 accepted (2026-10-18), commit `53bfe20`.** It carries the Bindings sweep, D1, budget layers U2 and
  U3, `AgentFanout`, `LedgerRequest` and `LedgerPass`.
  - **Verdicts.** `.orkestrel/agent/agent-r2-audit-verdict.md` and `agent-r2-fix-audit-verdict.md`. Every finding was
    reproduced against the `f52daa4` baseline.
  - **Gates.**

    | Project | Result |
    | --- | --- |
    | src:core | 1580 |
    | policy | 119 |
    | config | 229 |
    | setup | 175 |
    | guides | 147 |
    | studies | 100 |
    | distribution | 9 of 9, under the absolute pins |
  - **Downstream pins.**
    - Study is pinned to Agent tarball `f22e76bd50c9` and to budget, and its gates are running on it.
    - Ollama is pinned to the same two, for U4.
  - **The live proof.** U4's runs on a dedicated daemon on port 11435, under a cap with its PID recorded. Port 11434
    is untouched.
- **Study and budget sweeps (2026-10-18).**
  - **budget, commit `a26ff9a`, tests only.**
    - The recorders are converted.
    - 30 000 differential sequences found no regression.
    - The tarball `39343e7e9395` is unchanged.
  - **Study, commit `c1a289f`.**
    - **Restored, all found by a differential sweep against `ca81174`:**
      - a custody-attempt hole;
      - holes in the packet links;
      - the packet lookup order;
      - the trace flush timing;
      - the channel's re-entry limit.
    - **The review then found two more,** both fixed: the grading traversal was eager, and the channel misrouted a
      reply when the request frame was mutated.
    - **Restage.** Study is restaged into Agent as `62b0c34f2995`, and Agent's studies pass 100 of 100.
  - **Ollama's own Bindings sweep is now in scope (2026-10-18).** The user's words: "Why not do the ollama let sweep?
    Id rather you get it out of the way as soon as possible unless there is an actual issue."
    - **Done: Ollama commit `c7c611a`**, on the baseline `ba171bd`, with the pins left uncommitted.
      - **The work:** six builders (`tmp/units/ollama-sweep-brief.md`), three falsify rounds, fix rounds OS-F, OS-G and
        OS-H, and one closure check under the exit rule.
      - **Published `src`:** only `src/core/helpers.ts` changed, and it is proven equivalent to `ba171bd`.
      - **Evidence:** live passes 80 of 80 on 11435 and discovery exits 0. The guarded gates are green.
      - **Restaged** as `9a5756095d99` into Agent (devDependency) and Study.
      - **The record:** `.orkestrel/ollama/u4-audit-verdict.md`.
    - **Follow-up `ollama-probes-drift`, done.** The git-ignored series probes typecheck again. `wire-dump` dumps
      `provider.encode(...)`, which `0a36af3` renamed from `body`, and both wrappers drop `format`.
    - **Follow-up `study-admission-timing`, queued.** A Study case fails under full three-project load and passes
      alone. It is recorded in `.orkestrel/plan.md`, and Study's quiet rerun is owed.
    - **Exit rule (the user, 2026-10-18): "One closure check, then commit".** Once the gates and the live run are
      green, one single-reviewer round checks that each named finding is closed, and then the work is committed. Ollama
      has finished under this rule, and scaffold takes it after E3. New minor findings become follow-up units.
    - **Hazard, found 2026-10-18: Ollama's `setup` project contacts the user's 11434 daemon.**
      - `tests/setupStore.ts` imports `tests/setupService.ts`, and that module's load gate sends a warm-up chat with
        `keep_alive: '30m'` to `OLLAMA_HOST`, which defaults to 11434. This predates the sweep.
      - Until unit OS-hermetic lands and is verified, and as a standing guard afterwards, run every non-service Ollama
        command with `$env:OLLAMA_HOST = 'http://127.0.0.1:1'`. That covers `npm test`, `setup`, gates and probes.
      - Never merge the `probe` project into a probe config, because `tmp/probes/**` holds live probes.
      - The record is in `.orkestrel/ollama/u4-audit-verdict.md`.
    - **T3 task ids** are `node:delegated-task:command%3Amcp%3A11386d00-6ff3-44cb-aa2b-c3824db22fc7%3Adelegate-task%3A`
      followed by the clientRequestId, such as `os-store-sonnet-1`. The bare clientRequestId gives `task_not_found`.
- **Scaffold Bindings fix chain: accepted, commit `4d67f0f32` (2026-10-19).**
  - **How it closed.** Round E, then F1. Then a closure check (B1, fixed by round F's `iterateAnswers`), then a
    narrow re-check (B2, a `@throws` form, fixed).
  - **Gates.** The build and every gate are green.
  - **`PARALLEL.md`** carries the hash and the next steps.
  - **Records:** `.orkestrel/scaffold/scaffold-fix-audit-verdict.md` § Fix round E.
  - **`scaffold-local-pins` is accepted**, commit `8cc944140` on branch `local-pins`. It ships
    `.agents/skills/orkestrel-publish/scripts/swap.ts` (`--pin`, `--restore`, `--status`) and the ledger convention in
    `release.md` and `wave.md`. It passed a falsify lane, two fix units, and a closure check.
  - **Scaffold 0.0.102 (2026-10-19).** The Veneer session relays the user's rulings in `PARALLEL.md`: 0.0.102 ships the
    chain plus Veneer's commands hook U1 (`2cc1ded7a` on branch `commands`, from `4d67f0f32`). The fleet re-pins to
    0.0.102 **after it publishes**. This session answered there: local-pins rides 0.0.102, and this session carries
    the fleet re-pin.
  - **The order:**
    1. Veneer fast-forwards `main` to `2cc1ded7a`. The window is granted, with `main` idle at `4d67f0f32`.
    2. This session rebases `local-pins` onto it, rebuilds, gates, fast-forwards `main`, and writes the section.
    3. Veneer runs its falsify round and the release commit.
    4. The user publishes.
    5. The fleet repair runs to the registry `^0.0.102`, from `tmp/units/fleet-repair-brief.md` (restore, repair,
       commit the index, re-pin the local builds). Expect G1's `ERESOLVE` in Agent, Ollama and Study.
  - **Done ahead of the window (2026-10-19, 6:59 AM),** in worktree `scaffold/tmp/worktrees/local-pins`:
    - `local-pins` is rebased onto U1. It reads `2cc1ded7a`, then `cb5745417` (the swap script; every gate green,
      with src:core 586 and skills 122), then `5ae2e8d8f` (the serve hoist, `createServedList`).
    - `PARALLEL.md` offers Veneer one fast-forward of `main` to `5ae2e8d8f`.
    - The scaffold checkout's own working tree and `main` (`4d67f0f32`) are untouched.
  - **Observation.** `tests/setupServer.test.ts`'s distribution-boundary test needs `<root>/tmp`, so a fresh clone
    fails it. It predates the chain. Closed by Veneer's `97eea2ea3`.
  - **Scaffold 0.0.102 is published (2026-10-19, about 8:37 AM).** Veneer fast-forwarded `main` to `5ae2e8d8f`, then
    to its fixes `97eea2ea3` and `06f329115` and the release commit `19671436e` (falsify round: Astra and Opus; the
    whole `prepublishOnly` chain green in a standalone clone). The user published it, and `main` is pushed.
    - **Fleet repair done (2026-10-19).** Brief `tmp/units/fleet-repair-brief.md`; reports under
      `tmp/units/fleet-repair/`. Every repair ran `scaffold repair --offline`, committed only the scaffold-owned paths and
      the manifest and lock, with no pins, and then re-pinned.

      | Repo | Commit | Gates against the pins |
      | --- | --- | --- |
      | budget | `ca99510` | src 255, policy 120, config 280, setup 17, guides 33, distribution 9 (no ledger) |
      | Agent | `e8cdcba` | format, lint, check, build; test green (policy 120, config 280, setup 175, guides 147, src:core); distribution 9; studies 100 |
      | Ollama | `3ddedba` | src 183, setup 597, policy 120, config 280, guides 47, conformance 17, distribution 9 (guarded) |
      | Study | `4d97e8d` | src 598, policy 120, config 280, setup 72, guides 15, distribution 10 |

      - **Pins now.**
        - Agent: budget `7b84bb63fa67` (`ca99510`), Study `30f5cc940540` (`4d97e8d`), Ollama `21664fdcacd7`
          (`3ddedba`), and its own override `be567d309dc1` (`e8cdcba`).
        - Ollama and Study pin the same budget and Agent tarballs. Study also pins MCP `4d6d65c80d4f` (`b0e9d7f`,
          unchanged).
        - After the final refresh, Agent's `check`, studies 100 and distribution 9 are green.
      - **Rulings (Orchestrator), recorded in the brief.** Agent commits `@orkestrel/study: file:../study`, because Study
        is unpublished.
        - `repair --offline` refuses that spec ("names no concrete floor"). It ran with `^0.0.1` for the verb only.
        - Agent's committable lock was generated with Study restored.
        - `swap.ts --pin` refuses to pack Agent ("would pack a local dependency spec", `devDependencies` included), so
          every Agent row is pinned with `tmp/units/local-pin.ts`. `swap --status` exits 3 on that one row (no
          `inventory`), and `local-pin.ts status` exits 0.
        - Both gaps close when Study publishes, or when scaffold rules on unpublished `file:` devDependencies.
      - **Follow-ups.**
        - `guides/scaffold.md` and `guides/test.md` mirrors are stale against 0.0.102, because offline repair skips the
          catalog. Run `scaffold catalog` online.
        - `@orkestrel/test` stayed `^0.0.25`, because repair did not move it. An `overwrite` would.
        - Budget's builder amended its own unpushed commit message, and its tree is unchanged. Briefs now say never
          amend.
    - **Release order for the Agent–Study cycle (user decision, 2026-10-19).** Agent publishes first, then Study
      re-pins to it and publishes 0.0.1, then Agent adds Study as a registry devDependency and pushes, with no bump.
      - Agent's release commit leaves `@orkestrel/study` out of `devDependencies`, because the online overwrite refuses
        an unpublished package.
      - Its gates run on registry ranges, with Study staged `--no-save`.
      - `test:studies` runs against Agent's own packed release tarball. That split from the single `prepublishOnly`
        run is a recorded ruling.
      - The full registry proof of `test:studies` comes in the final Agent step.
      - Before any visit: a backup branch per repository, and copies of the pinned manifest, lock and `pins.json` under
        `tmp/units/release/`. Restore the pins before each visit and re-pin after it. The user holds every window.
      - The readiness assessment is workflow `wf_a3600de5-195`, with reports under `tmp/units/publish-readiness/`.
        Its verdict: not ready yet. No visit, release commit or push had run. The round, in windows:

        | Window | Packages |
        | --- | --- |
        | W1 | budget 0.0.14, terminal 0.0.20, mcp 0.0.39 (each has every dependency served) |
        | W2 | workflow 0.0.23, middleware 0.0.25, browser 0.0.29, probe 0.0.24 |
        | W3 | agent 0.0.31 |
        | W4 | ollama 0.0.24, toolbox 0.0.20 |
        | W5 | study 0.0.1 |
        | After W5 | Agent's dev-only commit |

      - **User answers (2026-10-19).**
        - The `BudgetError` brand: "go with your recommendation … all i care about is transparency, clarity, and chain
          of responsibility that we can follow to audit". So BR-1 brands it, and SL-1 adds Study's layer trace.
        - terminal ships in the round.
        - The user created `github.com/orkestrel/study`, and Study's `origin` points at it.
        - "Prepare and push": every layer is prepared end to end and pushed, and the user is called only for each window.
      - **Orchestrator ruling.** Agent's `studies/` also imports Ollama's unpublished `extractTiming`, a second
        development edge. The Study staging split extends to it: Ollama's local build is staged with Study for `check` and
        `test:studies`, and the registry proof runs after W5.
      - `handleAgentRunnerJob` leaves Agent's surface on purpose: round 2's per-runner entity (D-1) replaced it. The
        release note names the removal.
      - **OL-1 done (Ollama `a07d08a`, tests only).** Three live service cases cover the user's "each layer fails
        first" requirement:
        - meter first, under a tighter separate allowance;
        - model first, under loose bounds;
        - the default truncation claim.

        They ran live on a dedicated 11435 daemon (PID 39676, stopped by PID with its children 46508 and 72040;
        receipts in `tmp/units/ol-1-daemon/`), and `tests/service/budget.test.ts` passed 12 of 12. Port 11434 was
        untouched.
        - The first two runs failed. The new cases named `tev1:0.8b` as the chat model, because the brief said so,
          which was the Orchestrator's error. `tev1:0.8b` is the suite's decision model (`OLLAMA_DECISION_MODEL`,
          capability `decision`) and refuses chat.
        - The chat model is `qwen3.5:2b-q4_K_M` (`OLLAMA_CONFIG.model`). The Orchestrator fixed the four constructions to
          use it.
      - **AG-1 done (Agent `4a3f52e`).** GPT-6.1 Sol built it on Codex (`ag-1-sol-1`), and the Orchestrator reviewed
        the report and the diff.
        - A case where a malformed delta rejects the run with the meter's `ContractError`, leaves the allowance unmoved
          and emits the error once. The swallow mutant fails it, and `Agent.ts` was restored, with matching SHA-256.
        - A case where a prompt-scoped allowance stays uncharged.
        - The allowance TSDoc and the guide state the meter's completion-only charge.
        - Gates: src:core 1582, guides 147.
        - Agent's declarations moved, so the Agent tarball pinned in Ollama and Study is stale until the next re-pin or
          the W3 visit.
      - **W1 published (2026-10-19).** `@orkestrel/budget` 0.0.14 (`38c9a66`, carrying the brand `53f3b46`),
        `@orkestrel/terminal` 0.0.20 (`afe1a87`) and `@orkestrel/mcp` 0.0.39 (`5b90ebc`) are all served, and their
        tarballs answer 200.
        - terminal's list support (`802834a`) failed an Astra review on a buffered-EOF truncation. It was fixed in
          `afe1a87` and closed by one closure check.
        - W2 preparation runs on Codex Sol: workflow, middleware, browser and probe.
      - **Keep Ollama current (user, 2026-10-19).** Use the latest daemon and the latest `ollama` npm client, the
        conformance reference.
        - The daemon is 0.40.6, the latest stable; 0.40.7-rc0 is a pre-release and is not adopted.
        - `@orkestrel/ollama` pins `"ollama": "0.6.3"` while the registry serves 0.6.4. W4's preparation moves it to
          `"0.6.4"`, keeping the exact pin, and reruns conformance.
        - A daemon change opens a new runner lineage for the boost: screen it with G0 first. Memory:
          `feedback-ollama-latest`.
      - **Rule slip (2026-10-19), disclosed to the user.** The Orchestrator ran `ollama.exe --version` without the
        `OLLAMA_HOST` guard. That command asks the default server for its version, so one read-only `GET /api/version`
        most likely reached the user's 11434 daemon. No model was loaded and nothing changed. Guard every Ollama command,
        `--version` included.
      - **Preparation brief:** `tmp/units/release/layer-prep-brief.md`. terminal and mcp are being prepared now (workflow
        `wf_bfede446-695`).
    - **Realignment running** (workflow `wf_70cdc1b9-ec6`, reports under `tmp/units/realign/`). The user asked to
      re-read every message and file, find what was missed, and plan forward: the studies extraction cleanup, the
      budget meter and `let` work, and the series boost (Records first, then Compaction). The human messages of all 63
      sessions are extracted to `tmp/units/realign/user-messages.md` by `extract-user-messages.mjs`.
- **Study `65e0188` (2026-10-19).** The admission test's custody margin is widened, tests only.
- **Scaffold is shared (2026-10-18).**
  - The user, 2026-10-18: "There's another session working on scaffold so be careful and communicate with it through
    the PARALLEL.md".
  - The Veneer session, which is releasing `@orkestrel/test` 0.0.26, wrote `scaffold/PARALLEL.md`. It asked about a
    browser-wrapper candidate (`chooseFiles`) and about anything that touches `@orkestrel/test`, `wave.ts` or the
    journey templates.
  - **This session's reply.**
    - The candidate is not in this chain.
    - Nothing is published.
    - The chain changes the emitted journey and integration templates (`tests/app/*/integration.test.ts`,
      `configs/browsers.ts`, `DistributionSuite`, `mergeOverride`).
    - G1 (`wave.ts` cluster pin) and G2 (`captures.md`) are queued.
  - **This session's hold section** says what it holds and what it writes next.
  - **The rule:** re-read `PARALLEL.md` before every scaffold commit, build, `repair` or `overwrite`, and never commit
    the file.
- **U4 Ollama (2026-10-18).**
  - **The work.** Design 2 § 4.3 is built on Agent `53bfe20`. The live proof ran on a dedicated daemon on port 11435,
    which was stopped afterwards by its recorded PID; port 11434 was untouched.
    - `budget.test.ts` passed 9 of 9.
    - After the user re-pulled `tev1:0.8b`, the full service suite passed 80 of 80.
    - The daemon answers `done_reason: 'length'` at the cap.
  - **The review.** One Astra lane (`.orkestrel/ollama/u4-audit-verdict.md`) confirmed the mechanism, the layers, the
    contract sites, the guide, and that no test was weakened.
  - **Closed since.**
    - O1, fixture placement, closed by U4-F.
    - Ollama's own Bindings sweep is committed as `c7c611a`.
- **Census gap: count-only recorders (2026-10-18), fleet-wide.** The draft-4 census key's N2 and N6 signatures never
  match `createRecorder`, `.count` or `toHaveLength` on `calls`. Yet the rule bans a recorder whose every read is a
  count or a length: `running.carriers` and `logs.reads`, whose own example is a test reading only a length.
  - So every census so far missed test recorders that are read only for their count: scaffold, Study, budget and
    Agent.
  - Agent's fix round sweeps them (unit FS), and scaffold's fix chain adds C9.
  - **Owed:** a recorder sweep of Study and budget, each with its own falsify round, before their final acceptance,
    and the corrected N2 and N6 signatures in the census key.
  - **Owed fleet-wide (2026-10-18): `distribution.test.ts` helpers.** The Ollama falsify round overturned the
    ruling that kept them local.
    - `tests.md` § Shared test infrastructure has no exception for the emitted gate, and scaffold's own
      `tests/distribution.test.ts` imports from `./setupServer.js`.
    - Budget, Study and Agent, all accepted, keep `decodeSegment` and `readPackageType` local. Each owes a move into
      `tests/setupServer.ts`.
    - Scaffold's template (`src/core/templates.ts:1891-`) emits `isPackageTarget`, `resolvePackageTarget`,
      `resolveTarget` and `readPackageType` locally. It owes a ruling: make an explicit exception, or emit them into
      the setup module.
    - **Sized 2026-10-19: rule on the template first.** budget's `tests/distribution.test.ts` holds 37 local helpers,
      Study's 35 and Agent's 34: the template's whole emitted harness (`runNpm`, `checkSurface`, `buildStage`,
      `driveRuntime` and the rest), not two helpers. The file is `presence`-owned, so repair never overwrites it. But
      moving the harness consumer by consumer forks every workspace from its template.
      - Ollama has already moved its helpers (OS-F-dist).
      - The template ruling is a scaffold design lane (Opus), not a follow-up patch. Then come one template change and
        one fleet pass.
  - **Owed too: the key's mis-cited controls.** OS-store and OS-server found them independently, 2026-10-18.
    - **N7's pool control.** It sits at scaffold `Upstream.ts` about 963-1003 (`Array.from({ length`,
      `Promise.allSettled`). It is not at the cited `:210-211`, which holds the `spent` creation.
    - **N5's `Ledger.ts:366-376` and N8's `renderCauseChain`.** At Agent `f52daa4` both are `let` loops of the N1
      shape, not a fold and a worklist.
    - **N16's `MemorySessionStore.ts:106` clear control.** It was never run.
    - **No Agent revision is pinned for Agent controls.** OS-server chose `f52daa4`.
- **Scaffold falsify round 3 (2026-10-18).**
  - Verdict: `.orkestrel/scaffold/scaffold-fix-audit-verdict.md`. Objective Astra failed 1, 2, 4, 6, 7, 8. Subjective
    Opus failed 4, 5, 6, 7, 8, plus S1.
  - Every finding was reproduced. Among them: a fractional `--cap` crashes `launch.ts` after it has spawned, and the
    instruments normalized comments and host bytes.
  - Release evidence: 0.0.102 retypes `@orkestrel/scaffold/server`'s `ReadAllowance` from an interface to a class. No
    fleet target imports it.
  - Checkpoint `615ae1b72`. Fix units C (source) and C-instruments (the probes) are running on disjoint files.

## State and scope

The `compaction-output` attempt is interrupted, unsealed, and preserved; it has no operational
reading. T3 Code stopped the owning Codex session at `2026-10-15T22:50:24.140Z` and its process tree
died with it, during goal 95 (`ev-24-3`) with 94 of 96 products complete. See
§ Interrupted Compaction attempt. Its successor `compaction-output-2`, with the same treatment and
detached through WMI outside every provider session tree, sealed 96/96 at `2026-10-16T00:51Z`. Its
reader status is `acceptance-candidate`, and its operational grading achieved 96/96. Semantic grading
waits for the frozen Sol-high adjudicator, by the user's choice; see § Sealed successor attempt.
Records is sealed and labeled at 96/96. Never rerun, replay, or relabel Records for this campaign.
The original c1 thinking comparison is graded and closed; this run is the separate q4
thinking-off Compaction qualification, not a restart of that comparison.

Accepted source and remaining work are distinct:

| Checkout | Accepted source | Status |
| --- | --- | --- |
| Agent | `34862bc` consumer extraction; `78ea378` launch record | Authored workload, prompts, strategies, provenance, checkpoints, tool semantics, and grading remain under `studies/`; tests are under `tests/studies`. |
| Study | `422d549334ddb025651c9dd989168e1631938d5e` | Portable package and CLI, macro/micro refinement, shared instrumentation, lifecycle repairs, and consumer extraction are accepted locally. |
| Ollama | `f2a94d6` | Accepted usage/timing and strict native request behavior; do not alter captured runtime bytes. |
| MCP | `b0e9d7f` | Accepted remote tool-refusal classification; physical proof tree `f9fffad`. |

Study is the package name; earlier messages calling it “story” refer to this effort. Agent's
`studies/` directory is the real consumer, not a temporary mirror. Study owns reusable execution
and measurement in `src/core`, `src/server`, and `src/bin/main.ts`; outputs belong in the
consumer's `tmp/studies/`. See [integration acceptance](../study.md) and
[Study's guide](../../../study/guides/study.md). Do not resurrect private `app/studies` or the
abandoned Scaffold runtime-root proposal.

The user authorizes necessary Orkestrel dependencies and requires their latest published
versions for ordinary development. Non-Orkestrel additions need explicit authorization.
Frozen experiments retain their admitted versions. No version bump or publication was
authorized for this continuation. Scaffold was published by another session; leave its
release and `PARALLEL.md` work alone. Use the canonical contracts and direct matching Orkestrel
primitives; retain the user's single setup-file-per-layer convention. In both Agent and Study, `tests/setupStudy.ts`
is the harness and development setup module, kept separate from implementation setup (`setup.ts`, `setupServer.ts`)
the way `tests/setupPolicy.ts` is (user decision, 2026-10-16). Scaffold does not plan it or the `tests/studies`
project; that deviation stands until Study is production-ready and scaffold is updated to propagate the structure.

The user requests Claude models for implementation: Sonnet for bounded work, Opus for
subjective and adversarial work, and Haiku for precise lookups. No Fable without fresh explicit
permission. On 2026-10-15 around 22:09 UTC, the Haiku lookup returned a session-limit refusal
until 18:30 America/New_York (22:30 UTC); no substantive lookup ran. No allowance percentages
are visible. The refused session was `4cb1d976-b61b-4c17-ad0e-24980edc59c1`; its launcher
exited 1 uncapped in 2865 ms. Native Claude Code subagents later ran without refusal: an Opus
objective lane and a Haiku checker (2026-10-15 23:49Z to 23:58Z), and a Haiku verifier
(2026-10-16 00:00Z). Re-probe availability after any refusal.
Native Luna handled mechanical verification; this is not a Claude gate claim. The semantic
adjudicator is independently frozen as GPT-6.1 Sol high and must not change with helper routing.

## Interrupted Compaction attempt

At `2026-10-15T22:50:24.140Z` the T3 Code server ran `stopSession` (`provider.kind` `codex`) for
thread `caf10b8d-3ff4-4392-bfe5-d98dad29bdb1`, titled "Finish Thinking Series Handoff", 30 minutes
after that thread's last turn completed at `22:20:03.268Z`. The thread had launched the supervisor
through its own `exec_command`, so the supervisor, the captured Study execute, the daemon script,
and the Ollama daemon died with the session. None wrote an exit record; the daemon log stops
mid-generation of request 695. The observer stopped writing after goal 32. The Codex app-server
restarted at `23:04:07.126Z`, and its next turn refused on a usage limit until
`2026-10-22 06:12` local, so the Codex bench, and with it the frozen Sol-high semantic
adjudicator, is dark until then.

The result tree holds `execution/manifest.json` and an unsealed trial `evidence.jsonl`
(4717180 bytes, SHA-256 `d08fc82b2fcf2b71bb07a7ae1d27b60653d1be519c6d5a266917cc4e3bce7811`, no
partial line): 95 goals started, 94 completed, `ev-24-3` attempted, one unexecuted, 10 summaries.
The 4096 summary allowance carried the trial past the predecessor's goal-79 output-limit failure.
The reader refuses unsealed evidence by design, so the attempt has no operational reading and
proves no quality claim; do not run `read` against it. `tmp/units/compaction-output-terminal.json`
records these identities and the cause, and `tmp/units/compaction-output-stop-spans.ndjson`
preserves the T3 trace spans, which rotate out of T3's own logs. Reader pins and the external
build receipt verified after the death. No owned process or listener on 11434 or 11435 remains.

A successor needs a fresh namespace and staged custody, because `custody.json` binds the output
path. Launch it outside every T3 provider session's process tree: T3 stops an idle provider
session and its descendants, and a harness background command dies with its session. The
predecessor's facts follow; § Running successor attempt records the successor that applies them.

The `compaction-output` treatment raises summary output allowance from 2048 to 4096. It keeps
context 20480, Agent output 8192, safety 512, `think:false`, the affine gauge, model/digests,
workload, rubrics, rolling history, and the final-user summary instruction unchanged. Summary
input room becomes 15872. The previous `compaction-task` attempt completed 78 products and
failed at goal 79 on summary prompt 10408, completion 2048, finish `length`. Preserve that
output-limit failure; it is not a context overflow. The preceding rolling result completed
96 products but was rejected for empty recaps. No earlier rejected result qualifies a baseline.

Request limit is 360000 ms, goal limit 900000 ms, and trial/series limit 9600000 ms. The
attempt has zero retries. Native `truncate:false` and `shift:false`, missing-usage checks,
output-limit refusal, and blank-summary refusal remain. Positive prediction residuals are
diagnostics; do not change the estimator or turn them into observed overflow. Preserve the
first real failure, its cost, and unexecuted goals separately. No rescue or optional model-visible
time/token/budget metadata is enabled.

The fixed execute deadline is `2026-10-16T00:55:00.000Z` (20:55 EDT on October 15).
The owned daemon expires at `2026-10-16T01:02:00.000Z`. Do not extend either. Daemon wrapper
cap is 10800 seconds; supervisor and observer caps are 10320 seconds. The daemon is separate
on port 11435; the user's port 11434 is untouched.

These are the recovery identities:

| Item | Identity or path |
| --- | --- |
| Runtime | `tmp/studies/compaction-output-runtime` |
| Captured project | `tmp/studies/compaction-output-runtime/project` |
| Result | `tmp/studies/compaction-output` |
| Root launch receipt | `tmp/units/compaction-output-launch.json` |
| Custody SHA-256 | `f7fd6acc551860ba89b904fc506b0eab5f11a49515ab1e183ea4fbb4a0bce4ef` |
| Study fingerprint | `50c186e330f2684ef3c0536c34dac0bc390db33fa522717a805640d7cd3ca7c0` |
| Reader SHA-256 | `ea9bd6966cf9810c24f3711bb058a8ab348764c4abd71f483b5ab111d858e0ac` |
| Build receipt | `tmp/units/compaction-output-build-receipt.json` |
| Build receipt SHA-256 | `d0f3c0f87f5b8db1bbacc3bdd3d46c65f416a10271c2d32b60055ea1ae95cdc2` |
| Study build worktree | `../study/tmp/worktrees/compaction-output`, clean accepted commit `422d549` |

Read process identity, not merely an old PID, before acting on a process:

| Process | Recorded PID | Journal and errors |
| --- | --- | --- |
| Supervisor | 29536 | `tmp/codex/compaction-output-supervisor.jsonl` and `.err` |
| Captured Study execute | 2268 | `tmp/codex/compaction-output-series.jsonl` and `.err` |
| Ollama daemon / daemon script | 72624 / 55192 | `tmp/codex/compaction-output-daemon.jsonl` and `.err` |
| Metadata observer | 84596 | `tmp/units/compaction-output-watch.jsonl` and `.err` |

Daemon start is `2026-10-15T22:04:15.149Z`. Matching `.jsonl.pid` files and the daemon-start
receipt retain process identities. An empty execute stdout journal while running is normal;
progress comes from evidence metadata. The observer exits on terminal state and never controls
execution. From Agent root, read progress without generating anything:

```text
node tmp/units/compaction-output-progress.ts
node tmp/units/compaction-output-reader.ts pins f7fd6acc551860ba89b904fc506b0eab5f11a49515ab1e183ea4fbb4a0bce4ef
```

Read the observer journal and the last dispatcher `exit=… capped=… duration_ms=…` record in
the series errors file. If execution remains live, wait; never run the launch script again.
If it terminates or dies, inspect its seal and terminal errors before any further inference.
This attempt is create-only and has no resume/retry path. Preserve a failed or interrupted
attempt; a repaired successor needs a separate namespace, captured identity, finite bounds,
and disclosure. Do not reuse an expired deadline, overwrite its result, or restart Records.
After terminal work, stop only the verified owned daemon tree and confirm its descendants
are gone, following the canonical dispatch procedure. Never kill by process-name pattern.

## Sealed successor attempt

`compaction-output-2` repeats the `compaction-output` treatment and every control under a fresh
namespace. Its tooling is `tmp/units/compaction-output-2-*.ts`, produced by the deterministic copy
`tmp/units/compaction-output-2-copy.ts` (readings in `-copy-result.json`) plus reviewed hand edits.
It reuses the accepted Study build worktree and `tmp/units/compaction-output-build-receipt.json`;
the staged source delta, file counts and package counts equal the predecessor's.

`tmp/units/compaction-output-2-detach.ts` started every long-lived process through WMI
`Win32_Process.Create`; each launcher's parent is `WmiPrvSE.exe` in session 1. On 2026-10-16 a probe
found a WMI-started process in no job object while this session's shell was in one. The live
daemon's `server config` line equals the predecessor's, on the same CUDA device.

| Item | Identity |
| --- | --- |
| Runtime and result | `tmp/studies/compaction-output-2-runtime`, `tmp/studies/compaction-output-2` |
| Custody SHA-256 | `01f4be1742a6c35515e2752252a724eaa4459ef8e388af6b83468af529e8f2f9` |
| Study fingerprint | `d13d3477c391e9e243caa2dc5b0b0caa1bc16c68a133916c6ed13e021bf741f9` |
| Pinned reader SHA-256 | `5b936b22bbb333bdd936d81f0812c057866b667bb1db9af51f2f563000334b73` |
| Launch receipt | `tmp/units/compaction-output-2-launch.json` |
| Execute and daemon deadlines | `2026-10-16T02:54:33.403Z`, `2026-10-16T03:01:33.403Z` |
| Daemon start | `2026-10-16T00:03:34.053Z` |

| Process | PID | Journal | Detach receipt |
| --- | --- | --- | --- |
| Daemon launcher, script, Ollama | 100256, 16052, 83388 | `tmp/codex/compaction-output-2-daemon.*` | `tmp/units/compaction-output-2-daemon-detach.json` |
| Supervisor launcher | 78236 | `tmp/codex/compaction-output-2-supervisor.*` | `tmp/units/compaction-output-2-supervisor-detach.json` |
| Captured Study execute | 56332 | `tmp/codex/compaction-output-2-series.*` | child of the supervisor's dispatcher |
| Observer launcher | 68192 | `tmp/units/compaction-output-2-watch.*` | `tmp/units/compaction-output-2-observer-detach.json` |

The captured Study execute exited 0, uncapped, in 2821089 ms, and the supervisor exited 0 with
`custodyAfter: true`. The seal ID is `dfec78c05ee82231e8858d8721d03bbeffadcf0b23251bf768371b5aa398b017`
and the result ID is `0b883171-6ddf-4574-bcd1-8cc03e10e954`. The reader
(`tmp/units/compaction-output-2-reader-result.json`) returned `acceptance-candidate` with no issues.
All 96 goals completed with known usage: 773 calls and 933394 tokens. The deadline window was
accepted, and the rolling status is `qualified`, with 10 nonempty summaries, 9 repeated folds and
9 reductions, starting at `ev-03-3`. The largest summary used 3244 of 4096 output tokens and 12244 of
15872 prompt tokens. The largest Agent prompt was 11292 tokens and the largest Agent completion 1667.
Recap length grew from 5545 to 11918 characters across the folds; this is a description, not a
quality claim. Root stopped the daemon launcher tree by PID 100256 at about 00:52Z and confirmed every
descendant gone and port 11435 free.

Public operational grading ran through the captured CLI under the dispatch launcher. The grading
`22edabb2ba21b843f3ee3a989f614951c8d62dd224ee7953d036118b3a9feb1d` (exit 0 in 2666 ms) achieved 96 of
96 qualification criteria, with 0 critical, 0 unknown and no faults. The report (exit 0 in 671 ms)
attributes 1900700 ms to the 120 Agent calls and 898612 ms to the 10 summary calls in a 2816236 ms
trial. One repetition is descriptive and establishes no replicated capacity, quality or speed.
Semantic grading with `studies/endurance/rubric.json` and the honest Records comparison remain; the
user chose to wait for the frozen Sol-high adjudicator.

The observer reports milestones late. Windows defers change notices for a file another process holds
open for appending, so `watch` emits when something else reads the evidence. The dispatcher `exit=`
records, written through a separate append, arrive reliably.

The tooling passed one independent review round on numbered claims, retired with this record. The
Codex bench was probed dark at 2026-10-15T23:48Z (session `01a141f7-1001-7532-9de5-0dc254c4d4e8`,
usage limit until 2026-10-22 06:12 local), so Claude Opus held the objective lane, with a Haiku
checker. Two repairs followed the prescriptions. `pin` refuses unless the execute deadline still
leaves the supervisor's 9805000 ms plus 120 s; a live negative control refused before any write.
`detach` writes its receipt whenever WMI started a process. The adopted advisories are canonical ISO
deadlines, mirrored daemon checks in `pin`, and complete-line observer parsing. Validation
(`tmp/units/compaction-output-2-validation.json`) ran strict `tsc --erasableSyntaxOnly`, the reader
selftest (55 and 25 controls), and a write-free stage validation. The predecessor's validation
recorded `node --check` exits it never ran, and `node --check` does not strip types from a module
without imports.

## Work in flight on 2026-10-16

- **Exploratory Grok semantic labeling (user decision).** Grok 4.7 Extra High labels `compaction-output-2` only; Sol-high
  labels it after 2026-10-22 06:12 local for the Records comparison, and Records is never relabeled. Semantic grading
  `54a3e4844ae71627aab629e282094f9efd50cb5dd3f7456b85e37e560f6557de` created packet `30e98922…` (trial `t-e41a44ec…`);
  batches are `tmp/studies/labels-30e98922/` (96, largest 410211 bytes). The reviewed Cursor runner is
  `tmp/units/study-label-grok/` (Opus review: resolved model pinned to `Grok 4.7 256K Extra High`, atomic labels write).
  Runner v1 stopped at batch 001 on a judgments object keyed by criterion (Cursor has no output-schema option); runner v2
  states the answer schema in the prompt (mutation-probed). v2 synthetic controls passed 9 of 9 expected verdicts and the
  v2 pilot (batch 096) passed in 278 s. The population runs WMI-detached from
  `tmp/units/study-label-grok-population.ts` (launcher PID 51320, journal `tmp/cursor/grok-label-population-v2.jsonl`,
  output `tmp/studies/labels-grok-30e98922-v2/`, 900 s per batch, 36000 s outer cap, about 4.3 minutes per batch). It
  stops at the first failure without retry. v1 artifacts stay in `tmp/studies/labels-grok-30e98922/`. It completed on
  2026-10-16 (95 labeled plus the retained 096 pilot; summary `complete: true`; terminal exit 0, uncapped, 17688507 ms).
  The import unit (Cursor Claude Sonnet 5.5, task `compaction-output-2-label-import-1`, brief
  `tmp/units/compaction-output-2-label-import-brief.md`) writes an audit modeled on the Records import and a create-only
  merged file `tmp/studies/compaction-output-2-grok-labels.json`; after an independent review the Orchestrator runs
  `study label` against grading `54a3e484…` and `study report` through the captured CLI, disclosing the adjudicator
  substitution. Cursor's limit stopped that builder, so the unit ran as native Claude subagents: a Sonnet builder wrote
  `tmp/units/compaction-output-2-label-import-audit.ts` and `-label-command.ts`, and an independent Opus review
  (`tmp/units/compaction-output-2-label-import-review.md`) confirmed all nine claims and found two low custody gaps
  outside them. F1: the audit did not compare `answer.json` with the transport result. F2: the launcher did not pin
  the audited merged hash. The Orchestrator applied both prescribed fixes and re-ran the audit (exit 0, all 96 answers
  equal their transport results, merged file `verified-existing` at
  `bb398331cadc06b8488a161770b32659008642416d0991154e23e914414221fd`). Root and captured Study `dist` are byte-equal
  (14 files). The label command (exit 0, uncapped, 3407 ms) returned grading
  `69a7a63af747be903fb414daa36756dafbe04cbae8d406d61f5fe16391ed2061` over `54a3e484…`, packet `30e98922…`, labeler
  `grok-4.7-xhigh`. Its `grading.json` hashes to its id, and the two earlier gradings are unchanged. The report (exit
  0, uncapped, 1721 ms) reads Compaction 56 achieved, 328 unsuccessful, 0 unknown, 41 critical over 384 criteria
  (0.146), with 96 of 96 goals completed and no faults. Judge usage: 96 calls, 7512618 tokens (6110917 input plus
  1401701 output; 559872 cached input not added again), 17944685 ms. **Exploratory only:** Grok 4.7 Extra High
  substituted for the frozen GPT-6.1 Sol high adjudicator. Records (78 achieved, 305 unsuccessful, 1 unknown, Sol
  labels over a different build and room) is not comparable with it. The honest Records comparison waits for Sol
  labels after 2026-10-22 06:12 local.
- **Performance diagnostic (complete).** See `tmp/units/compaction-output-2-perf-diagnostic.md`: gate table, the
  cold/warm/changed checkpoint replay (21.2 minutes of model time), and the single admitted candidate, summary prefix
  alignment. Prefix reuse is output-neutral on this runner; uncached prefill is fixed near 223 tokens/s.
- **Local dependencies follow the scaffold's tarball law.** `orkestrel-publish/references/release.md` § Fix a dependency
  before it publishes and `wave.md:50-52` govern: manifests keep registry ranges and local builds are packed and staged
  with `npm install --no-save`. A first attempt that added a tracked `tools/siblings/`, a `tools` test project and
  `file:` ranges in Study's manifest contradicted those laws and the project model; it was taken out of both trees on
  2026-10-16 (kept for reference in `tmp/units/siblings-retired/`). `tmp/units/local-stage.ts` stages local Agent, Ollama
  and MCP builds into Study; Study's audit is clean, its build stays byte-identical to the accepted `422d549` build, and
  its gates pass (two `test:src` timeouts under load pass alone). Rerun it after any source change. Agent's installed
  Study stays held at the captured `422d549` build until Sol grading closes; run no npm install in Agent root before then.
- **Routing decision (user, 2026-10-16).** While Grok serves series work, non-series absorption uses another model
  rather than waiting: Claude Sonnet 5.5 native lanes for classification reading, and Cursor models for quick small
  subagent work (`composer-2.5-fast` bench-probed live, session `6dea88b0-d445-4f31-b160-95f389d6e2e9`). Codex stays dark
  until 2026-10-22 06:12 local.
- **Open cleanup (user request 2026-10-16).** Finish the studies extraction cleanup: keep Agent's study tests in
  `tests/studies` under a renamed project and script (the blueprint plans no such project, so its audit question
  stands), move tests of extracted mechanisms to Study with their code, drop what neither package needs, and decide what
  belongs in Study versus Agent. Maps: `tmp/units/studies-cleanup-map-{agent,study}.txt`. Absorption
  (`tmp/units/studies-cleanup-absorb-{a,b,c,d}.md`; lanes A-C on native Sonnet, lane D on Cursor `composer-2.5-fast`,
  session `6f705a16-60bf-4f06-b53d-945c7f8d4af4`) found that most Agent study tests to clean up re-test Study-owned
  transport, trace and summary mechanisms already covered in Study, two summary cases have no Study equivalent and move
  there, and Study itself has nothing to drop. The design round (`tmp/units/studies-cleanup-design-brief.md`) runs as T3
  delegated tasks on Cursor: planner on Claude Opus 5.5 (`studies-cleanup-design-planner-1`), analyst on Gemini 4 Argon
  (`studies-cleanup-design-analyst-1`). Subagent work now routes to the user's enabled Cursor models, never Composer.
  The lanes returned `tmp/units/studies-cleanup-design-{planner,analyst}-1.md`; the reconciled plan
  `tmp/units/studies-cleanup-plan.md` (user-approved 2026-10-16, including the U4 layout unit and a recorded deviation
  editing the scaffold content-owned `vite.config.ts` to rename project `service` to `studies`) keeps `setupStudy.ts`
  in both repos, changes nothing under `studies/**`, and drops an Agent test only when a named Study test reddens under
  a mutation of the mechanism it exercised (rule R). U1 (Study tests in; Cursor Claude Opus 5.5, task
  `studies-cleanup-u1-1`) and U2 (Agent rename; Cursor Claude Sonnet 5.5, task `studies-cleanup-u2-1`) run in parallel
  from briefs `tmp/units/studies-cleanup-u{1,2}-brief.md`; U3 (drops, folds, setup trim, ledger) follows U1, then U4,
  one falsify round on the integrated result, and a verifier. U1 landed as Study `7508dff` (19 claims, each reddened by
  a mutation; two reproduced by the Orchestrator; Study gates green, `test:src` 522) and U2 as Agent `74604c6`. The first
  U3 builder stopped on a Cursor provider failure after 31 minutes with draft edits and no ledger (diff saved as
  `tmp/units/studies-cleanup-u3-1-partial.patch`; `studies` 155 to 88); the successor (task `studies-cleanup-u3-2`, brief
  `tmp/units/studies-cleanup-u3-brief-2.md`) accounts for every draft removal or restores it, writes the ledger
  incrementally, and must pass `tmp/units/studies-cleanup-ledger-check.ts`. U3 landed as Agent `a96fe45` (native
  Sonnet after Cursor's limit). `studies` went from 155 to 94 tests and `setup` from 159 to 155. The 79 removed names
  are 20 U1 claims, 38 drops each reddened by a Study mutation, and 21 folds (`tmp/units/studies-cleanup-ledger.md`).
  The Orchestrator re-ran every gate and the checker against regenerated lists, and reproduced two drop mutations.
  Six tests stayed in Agent because no Study test binds their Study mechanism. U5 (native Sonnet, brief
  `tmp/units/studies-cleanup-u5-brief.md`, ledger checked by `studies-cleanup-ledger-check.ts u5`) moves those claims
  into Study and then drops the Agent copies. U4 (layout), the falsify round and the verifier follow.
- **U5 landed** as Study `a1dea1a` and Agent `8641370`. Study's tests now redden under all six gap mutations, which
  the Orchestrator reproduced. `h-canonical-zero` was already caught in `src:core`. The six Agent tests were trimmed
  rather than dropped, because each still carries Agent-only claims, so the `u5` ledger is empty and the checker
  passes. A Study deadline test (`StudyResults.test.ts`, "expired within budget") flaked under heavy mutation load and
  passed alone. U4, the test layout, runs in workflow `wf_6f6ce0b4-9d0`.
- **Boost and boosted series (user decisions 2026-10-16).**
  - Set Sol aside for now.
  - Do the deferred performance and quality work and implement it.
  - Then run Records and Compaction again with the boost, as one boosted run per arm compared against the sealed
    runs. The user chose this over fresh paired baselines; the plan must disclose its confounds.
  - Grade semantics with Grok 4.7 Extra High through the Cursor CLI. It is outside the Cursor premium limit:
    `grok-4.7-xhigh` was bench-probed live after the limit hit.
  - This is a new series. The sealed runs and their gradings stay untouched; the "never rerun Records" line governed
    the closed campaign.
  - The two-lane design round (Opus planner, Sonnet analyst, brief `tmp/units/boost-design-brief.md`) runs in the same
    workflow.
- **Publish first, then boost locally (user, 2026-10-16).** Agent's distributable has moved since 0.0.30 (71 `src` files),
  so the series fixes are pushed and published first. The boost then stays a local, unpushed version measured against
  the published one.
  - The release covers MCP (L4); Agent, Browser and Probe (L5); and Ollama and Toolbox (L6). Unpushed commits: Agent
    58, Ollama 2, MCP 2.
  - Scaffold learns the studies structure first: a planned `studies` project, `test:studies`, the `tests/setupStudy.ts`
    harness module and the root `studies/` directory. Scaffold then releases, so the wave's `scaffold overwrite` keeps
    the structure instead of restoring `vite.config.ts` to the canonical set (`scaffold/guides/scaffold.md:1679-1683`).
  - The design round (brief `tmp/units/scaffold-studies-design-brief.md`) has an Opus planner (workflow
    `wf_c6aa3609-269`) and a Grok analyst (task `scaffold-studies-design-analyst-1`).
  - Grok 4.7 xhigh was to build the scaffold fix and the release preparation under tightly constrained briefs (user).
  - **Superseded (user, 2026-10-16).** Only Claude models implement.
    - Sonnet builds; Grok does non-implementation work: objective and adversary lanes, audits, labeling, readings.
    - The Grok scaffold build (`scaffold-studies-build-1`) added local functions to the vendored
      `tests/config.test.ts`, which had none at HEAD.
    - The build was cancelled. Its 51 KB partial diff is kept in
      `tmp/units/scaffold-studies-build-grok-partial.patch`, and scaffold was reset to `1f2eed70e` so the Sonnet
      builder starts clean.
    - **`let` ban (user, 2026-10-16).** The user rejects `let` anywhere, for example `let studies = false`
      reassigned in a loop.
      - Scaffold `typescript.md` gains a Bindings rule: `const` only, derive instead of accumulating.
      - Scaffold sweeps its `let` declarations (116 in `src`, 65 in `tests`) before its release.
      - Agent sweeps its 156 (including `src`, before its publish) and Study its 109 in this campaign.
      - A vendored policy lint rule follows in a later scaffold release, after the fleet sweep.
      - Every brief forbids `let` and scans added lines at acceptance.
      - Agent and Study sweeps run now (brief `tmp/units/let-sweep-brief.md`, Sonnet, workflow `wf_c2e51d47-2dc`).
        Scaffold's sweep and its rule text follow its in-flight build.
      - **The scaffold studies build landed uncommitted** (Sonnet; report `tmp/units/scaffold-studies-build-2-report.md`,
        diff `tmp/units/scaffold-studies-build-2.patch`).
        - All gates are green, and 256 recorded `studies: false` outputs are byte-identical across 64 blueprints.
        - Agent converges in one repair; the only difference is the `setupFiles` line. All four mutations turn red.
        - It added two `let`s, since it predated the rule, and left local helpers that predate it in scaffold's
          tests.
      - **Scaffold sweep** (`tmp/units/scaffold-sweep-brief.md`; three Sonnet lanes `src`, `support` and `tests`;
        workflow `wf_e336ca46-1b1`):
        - adds the Bindings rule to `typescript.md` and a `tests/studies` row to `tests.md`;
        - fixes the factory comment;
        - removes every `let` and `var` (about 266);
        - relocates every local test helper and lowercase constant into exported, proven setup members.
      - **Let-sweep round 1 failed falsify** (claims `tmp/units/let-sweep-claims.md`; verdicts
        `tmp/units/let-sweep-verdict-{subjective-1,objective-agent-1,objective-study-1}.md`; backups
        `tmp/units/let-sweep-{agent,study}.patch`). The Orchestrator reproduced the main findings.
        - Defects in Agent `src`:
          - `iterateRange` holds 76 MB at a count of 1e7 and up to 256 MB at larger counts (`Array(n).keys()`).
          - Function-argument spreads (`Math.min(...)`, `unshift(...)`) throw past about 130–140k elements.
          - Sparse `attachUserImages` now throws.
          - A guide fence regressed.
        - In Study, overlapping `StudyLauncher` launches share `#failure`: the hold launch rejects with the burst
          launch's overflow.
        - Test claims were weakened:
          - the CLI build runs at collection time, so it is unbounded and leaks on failure;
          - the `StudySeries` waits check reads `calls[0]`;
          - the Ledger fault window changed.
        - The sweeps removed the keyword but kept the pattern: mutated `const` records and per-call resets of `#`
          fields.
        - **User decision "Derive, else per-call entity":**
          - each step returns a readonly result into a local list, and aggregates are derived from that list;
          - state that callbacks must mutate lives on a per-call entity;
          - a mutated `const` record, or a `#` field reset on every call, is the banned pattern.
          - The extension text is in `tmp/units/bindings-rule-extension.md` and lands in scaffold `typescript.md`
            § Bindings after the scaffold sweep.
        - **Round 2** (brief `tmp/units/let-sweep-brief-2.md`; workflow `wf_2b3e3055-f3f`): one pipeline per repo
          with an Opus design, a Sonnet build of `src`, a Sonnet build of the tests, and a Haiku gate. Designs go to
          `tmp/units/let-sweep-design-{agent,study}.md`. Falsify round 2 follows.
        - Study is not restaged into Agent until the Records population ends, to protect custody.
      - **Scaffold sweep round 1 returned** (`wf_e336ca46-1b1`; reports `tmp/units/scaffold-sweep-{src,support,tests}-report.md`;
        whole-tree backup `tmp/units/scaffold-sweep-round1.patch`).
        - **Lane results.** The lanes removed the `let`s. Scoped gates failed on:
          - a stale `host.json` and built host;
          - a stale studies-comment expectation;
          - a guide row;
          - a timeout under load.
        - **Mirrored guides.** The support lane rewrote 14 mirrored fleet guides, which `documentation.md:54` forbids. The
          Orchestrator reverted them and kept the diff in `tmp/units/scaffold-sweep-mirror-guides.patch` for the owning
          packages.
        - **Bindings rule.** The Orchestrator added the three extension bullets to scaffold `typescript.md` § Bindings.
        - **Round 2** (brief `tmp/units/scaffold-sweep-brief-2.md`; workflow `wf_b81bb9a6-50b`): an Opus design, three
          Sonnet lanes, a Sonnet integrator and a Haiku gate.
        - **Rulings.**
          - `BuildState` is lawful.
          - Widening `PolicyExpression.kind` to `string` is refused.
          - The `SCRATCHES` and `STAGES` const arrays are banned.
          - So are unbounded counting allocations and argument spreads.
      - **Round 2 designs returned** (`tmp/units/let-sweep-design-{agent,study}.md`,
        `tmp/units/scaffold-sweep-design-2.md`). Every one stopped for a surface question or a ruling.
        - **User answers.**
          - Agent: approve `AgentTurn` and the meter, but check whether `Meter` belongs in `@orkestrel/budget` and move it
            there if it does ("don't be afraid of churn").
          - Ledger: `LedgerRequest` now.
          - Study: approve all.
        - **Orchestrator rulings** are in `tmp/units/let-sweep-rulings-2.md`.
          - Scaffold `typescript.md` § Bindings now has nine bullets. The ninth lists what is not a running value:
            - worklists and visited sets;
            - registries of in-flight per-call entities;
            - write-once memos;
            - straight-line lists;
            - platform-required writes.
          - Scaffold may delete its `ReadAllowance` type.
          - Study's single-slot interrupt is a defect.
        - **In flight.**
          - The scaffold lanes resumed (`wf_b81bb9a6-50b`).
          - The Study build and the budget meter design run as one workflow (`wf_499c081b-9e8`; design goes to
            `tmp/units/budget-meter-design.md`).
          - The Agent build waits for the budget design and for the Records population to end. Agent's `node_modules`
            stay frozen until then (the last check showed 52 of 96 batches done at 12:11).
        - **Session limit (2026-10-16, reset 14:30).** It cut both workflows.
          - The scaffold `src` and `tests` lanes, the integrator and the gate failed. The `src` and `tests` lanes had each
            run about 40 minutes, so their partial edits are in the tree. The support lane finished, and its report is
            saved to `tmp/units/scaffold-sweep-2-support-report.md`.
          - The Study `src` builder failed. The tree showed 65 changed paths against round 1's 43.
          - The budget meter design finished (`tmp/units/budget-meter-design.md`): the placement is
            `@orkestrel/budget`, with eight new names (`Meter`, `MeterInterface`, `MeterOptions`, `TokenMeterOptions`,
            `createTokenMeter`, `isBudget`, `validateMeterOptions`, `validateTokenMeterOptions`). Agent keeps
            `estimateTokens`, `chargeUsage` and `AgentTurn`. Three user questions are pending: when budget publishes,
            strict validation, and where `chargeUsage` lives.
          - Relaunched as continuation workflows. Each builder is told to verify its predecessor's partial edits
            against the round-1 patch before trusting them.
            - Scaffold `src`, `tests`, integrator and gate: `wf_27b65689-d91`.
            - Study `src`, tests and gate: `wf_b3576ae8-dc0`.
            - Reports go to `tmp/units/scaffold-sweep-2-{src,tests,integrate}-report.md` and
              `tmp/units/let-sweep-2-study-{src,tests}-report.md`.
        - **Records Grok population stopped (12:12), then resumed (14:48).** It had stopped at 51 of 96 batches.
          - **Cause.** Batch 051 (`ev-13-3`) failed its exact-string model guard. Cursor's init line read `"Grok 4.7
            Extra High"`, with a double space where `256K` belongs. The request was the same pinned `grok-4.7-xhigh`,
            and the batch ran to a successful result. The user confirmed Grok still has usage.
          - **Probe (14:45).** The same pinned request resolved `"Grok 4.7 256K Extra High"` again, so the label drop was
            transient. The probe directory was deleted.
          - **Kept immutable.**
            - The refused attempt moved to `tmp/studies/labels-grok-2ac2a898-refused/051.attempt1`.
            - Its journals are `tmp/cursor/grok-label-records-051.*.attempt1`.
            - The population journals are `*.attempt2`.
          - **User decision "Capture Study, then unfreeze".**
            - `tmp/units/study-label-grok/helpers.ts` and its test now import Study and contract from the captured series
              runtime `tmp/studies/compaction-output-2-runtime/node_modules`.
            - Its Study `dist` and manifest bytes, and its contract bytes, equal Agent's root install (only `LICENSE`
              and `README.md` are absent). Its `@orkestrel/agent` build differs, but the label checks call only Study's
              guards.
            - The helpers run 80 of 80 tests, and all 51 published batches re-verify through `checkPublication`.
            - Agent's `node_modules` are therefore unfrozen for Study and budget staging. They stay frozen for the
              scaffold package, because each batch's launcher loads from `node_modules/@orkestrel/scaffold` until the
              population ends.
          - **Relaunch.** It is detached through WMI as PID 51700 (receipt
            `tmp/units/study-label-grok-records-detach-3.json`) and resumed at 051. A skip re-checks each published
            batch.
          - **Second stop (15:18) at batch 057** (`ev-15-1`), after 051–056 were labeled.
            - The refusal read "Journal line 553 has an unexpected event type".
            - Mid-run, the Cursor CLI lost its connection and resumed from a checkpoint. It wrote `connection`
              `reconnecting`/`reconnected` and `retry` `starting`/`resuming` (`is_resume: true`) events.
            - The run resolved Grok 4.7 256K and succeeded. Its usage reports `inputTokens: 70` and `cacheReadTokens:
              85760`, which is only the resumed segment, so the accounting is incomplete.
            - The allowlist refusal matches `semantic.md` § Admit labeling: no hidden retry, no missing accounting.
            - The refused attempt moved to `tmp/studies/labels-grok-2ac2a898-refused/057.attempt1`. Its journals are
              `*.attempt1`, and the population journals are `*.attempt3`.
            - **Relaunched** as PID 53796 (receipt `tmp/units/study-label-grok-records-detach-4.json`). Batch 057 runs
              fresh. Each relaunch is a disclosed re-run of a refused batch, not a hidden retry.
        - **Study round 2 returned** (`wf_b3576ae8-dc0`; reports `tmp/units/let-sweep-2-study-{src,tests}-report.md`).
          - **Gates.** All exit 0:
            - format, lint and check;
            - `test:src` 560 (round 1: 535), `test:setup` 58, `test:policy` 119, `test:config` 229, `test:guides` 14,
              `test:distribution` 10.
          - **New per-call entities.** D4 `StudyLaunchChild`, D5 `StudyTrialLease`, D6 `StudyTaskChild`,
            `StudyOllamaExchange` and `StudyProcessGoal`. All five are interned, each with a mirrored test.
          - **Registries under R2.** `StudyAgentScript#serving` and `StudyAgentTrace#flushes`.
          - **Haiku gate verdict: FAIL** on ten per-goal resets of long-lived entities:
            - `StudyAgentTrace` `start`/`flush`;
            - `StudyAgentScript` `prepare`;
            - `StudyOllamaTransport` `prepare`.
          - **Orchestrator check of the deviations.**
            - The tests builder's `decodeSegment` in the self-contained distribution proof is a lawful returning helper
              (Bindings bullet 4).
            - The fixture-before-`try` regression in `StudyTask.test.ts` was fixed by the tests builder.
          - **Fix 3** (brief `tmp/units/let-sweep-study-fix-3-brief.md`; workflow `wf_681241bb-63c`) runs an Opus
            design, a Sonnet build and a Haiku gate. It adds per-goal entities reached through registries and keeps the
            public surface. If a public change is needed, it stops for the user.
          - **Staged files.** Study's builders staged their new files: 10 are staged, none untracked.
        - **Scaffold round 2 is green** (`wf_27b65689-d91`; reports `tmp/units/scaffold-sweep-2-{src,tests,integrate}-report.md`).
          - The Haiku gate passed:
            - format, lint, check and `check:skills` exit 0;
            - `npm test` passes 8 of 8 projects serially;
            - every criterion-3 hit is lawful;
            - the mirrored guides are byte-equal to HEAD.
          - The integrator also ran `test:templates` (61) and `test:distribution` (11 passed, 1 skipped; the registry was
            reachable). It repaired two TSDoc examples that the distribution drive exposed.
          - **Falsify round 2 is running.** Claims are in `tmp/units/scaffold-sweep-2-claims.md` (nine claims).
            - The tree is backed up as `tmp/units/scaffold-sweep-round2.patch`, plus `scaffold-sweep-round2-untracked/`
              for `GitQuery.ts` and its test.
            - Objective lane: Grok 4.7 xhigh, T3 task `scaffold-sweep-2-falsify-objective-grok-1`.
            - Subjective lane: Opus, a native background agent.
            - Verdicts go to `tmp/units/scaffold-sweep-2-verdict-{objective,subjective}-1.md`.
            - The commit follows reconciliation.
          - **Falsify round 2 returned FAIL from both lanes.**
            - **Grok failed claims 1, 2, 4, 5, 6 and 9, plus F1:**
              - `#gather` with a hole, and the `launch.ts` cap above 2^32 ms;
              - emitted changes beyond the exception list;
              - rule numbering, and `log.at(-1)`;
              - seven exports missing from the surface list;
              - `BuildState.trusted`.
            - **Opus failed claims 2, 3, 4, 5 and 9, plus O1:**
              - the studies selector admits a nested `node_modules` path;
              - rule-text disguises, and the conflict with `architecture.md:206`;
              - seven syntax-only sites: `Upstream` `notes` and `spent`, `resolveRealPath` `trail`, `stepYamlState`
                text accretion, `GitQuery`'s published intake, `TestAuditRegistry` and `TestHolder`;
              - the ambiguous `tests.md` `setupStudy` sentence.
            - **Orchestrator checks.**
              - HEAD's emitted journey proof compared a `Set` with an array, so the array form fixes a latent failure.
              - `SheetEntry` has no importer in the fleet; the only hit is veneer's own emitted copy.
            - **Reproduction.** Workflow `wf_9b130a7d-07c` runs five Sonnet reproducers, including a HEAD-baselined
              full-emission diff.
            - **User answers.**
              - "Close all, middleware too": the tightening closes every disguise, states R1's conditions, bans
                reassigning a parameter or a `catch` binding, and moves middleware state into the pluggable class.
              - "Barrel it per the law" for Study's `StudyProcessGoal`.
            - **Rule draft.** Workflow `wf_7d9337ac-23a`.
              - Opus (max) writes the draft to `tmp/units/bindings-rule-3-draft.md`.
              - Sonnet then takes a census per repository into `tmp/units/bindings-rule-3-census-{repo}.md`.
              - Next come a Grok objective review of the draft, then the Orchestrator lands the text, then one fix
                unit per repository.
        - **Study fix 3.** The user answered the designer's two questions: "Add explicit clear()" and "Approve per-goal
          attach". The rerun is `wf_e5e69aa9-847`: an Opus revision, then a Sonnet build, then a Haiku gate. Agent's
          `clear()` calls land with the Agent build.
          - **Result: PASS** (report `tmp/units/let-sweep-study-fix-3-report.md`).
            - Gates: `test:src` 584 (56 files), `test:setup` 58, `test:guides` 14, `test:distribution` 10. Format,
              lint and check exit 0.
            - There are zero `let` and zero unlawful field assignments.
            - The only public changes are `clear()` and the documented refusals.
          - **Orchestrator ruling.** The transport's `#previous` is lawful under Bindings bullet 5. It is cross-goal
            owner state: updated, never reset, and read by HEAD's next-goal `previous`/`changed` row.
          - **Agent consumer change** (design § 9): `this.#transport.clear()` in `StudyMemorySession#execute`'s innermost
            `finally`, and `this.#provider.clear()` in `StudyToolsSession#run`'s. They land with the Study restage,
            because without them every multi-goal study fails at the second `prepare`.
          - **Study falsify round.**
            - The six new untracked files were marked intent-to-add.
            - Backup: `tmp/units/let-sweep-study-round2.patch`.
            - Claims: `tmp/units/let-sweep-study-2-claims.md`.
            - Opus subjective lane is running.
            - Grok objective lane: T3 task `let-sweep-study-2-falsify-objective-grok-1`, dispatched once the budget
              review returned.
          - **Study falsify returned FAIL from both lanes.** Verdicts:
            `tmp/units/let-sweep-study-2-verdict-{objective,subjective}-1.md`.
            - **Grok** failed claims 4 and 8:
              - `StudyAgentTrace#slots` is a latest-value `Map`;
              - `StudyCommand#prepare` pushes in parallel onto two lists inside an awaiting loop.
              - Every other claim held: behaviour, leaks, test strength, guide parity, and Agent's restage edits being
                exactly the two `clear()` calls.
            - **Opus** failed claims 1, 5 and 8, plus O1:
              - the timing extractor is now called on every row, against its terminal-only contract;
              - `StudyProcessGoal` needs barrelling, which the user approved;
              - O1: the D4 proof is vacuous.
            - **Reconciliation on claim 1.** The lanes answered different questions: Grok asked whether the
              recorded timing is unchanged, Opus asked about the callback contract. Both findings stand.
            - **Reproduction.** Workflow `wf_3d43915c-935`. The Study fix unit follows the final rule text, because
              the lawful form of `#slots` depends on the "log read only at its last entry" sentence.
        - **Budget design 2 is final** (`tmp/units/budget-meter-design-2.md`, `wf_50cf95ca-136`; reviews
          `tmp/units/budget-meter-review-2-{law-intent,code-evidence}.md`). The user accepted every recommendation:
          - no meter layer by default, with `allowance: budget` giving HEAD's behaviour;
          - a typed `BudgetError` (`'exhaust'`);
          - `truncated` and the model layer in this wave;
          - all the rest as recommended (`tmp/units/let-sweep-rulings-2.md`).
          - Grok objective review: T3 task `budget-meter-design-2-objective-grok-1`, report
            `tmp/units/budget-meter-review-2-grok.md`.
          - Budget's visit (re-pin to the registry, `scaffold overwrite` to 0.0.101, audit, gates, commits): workflow
            `wf_e5bb6d28-464`. **Green.**
            - Commits, unpushed: `39e4455` re-pin, `fda8528` catalog agent migration, `edd3553` overwrite with scaffold
              0.0.101.
            - The audit drifts 0 of 56 paths.
            - Gates: `test:src` 132, `policy` 119, `config` 229, `setup` 7, `guides` 26, `test:distribution --mode
              release` 9.
            - `compare` finds the dist identical, so no bump is owed by the visit.
            - The gate's only red was `test:probe` ("No test files found"). That script is a workbench no gate
              selects, and the Orchestrator ruled it not a gate.
            - Notices: the `guides/test.md` mirror differs from the hosted guide (scaffold raises this on every run);
              `typescript` 6 against 7 and `vitest` 4 against 5 are major drift and are not re-pinned.
          - Next are the build units: U1 budget, U2 Agent's provider contract, U3 Agent's loop on D1, and U4 Ollama.
          - **Grok review: PASS-WITH-FIXES** (3 major, 4 minor; `tmp/units/budget-meter-review-2-grok.md`).
            - **Major 1.** A meter stop must also require `allowance.exhausted` and matching `id` and `max`, because a
              parent linked through the allowance's `signal` wins `AbortSignal.any`.
            - **Major 2.** A truncated answer counts as a model stop only when the reason is `undefined` or a
              `BudgetError`. A listener or timeout abort after the return gives no stop.
            - **Major 3.** B1 also changes queue/workflow's `QueueError` message (`Queue.ts:613-614` via
              `WorkflowRunner.ts:475`, `Runner.ts:480-481`) and Study's `readStudyFailure` message
              (`StudyAgentScript.ts:160-165`).
            - **Minor.** The B5 exception on the HEAD path; three citations; the `tokenUsageToJSON` description; the
              queue and supervisor staging text.
          - **The amendment and U1 returned** (`wf_6747e950-b2f`).
            - **Amendment.** It adopted G1, G3, G4, G5b, G5d, G6 and G7, and adopted G2 in part. It rejected G5a and
              G5c, both on file readings. The user answered the new Q15 with "Keep stop: 'model'".
            - **U1.** Every gate exits 0:
              - `test:src` 244, `test:guides` 30, `test:setup` 15;
              - check, lint, format and build.
              - All 11 exports are documented, guided and proven.
              - The `Budget.ts:108` guard deviation is justified by a probe.
            - **U1's open item.** Budget's presence-owned `tests/distribution.test.ts` holds pre-existing `let`s at
              196, 287 and 323, and a text-accreting slot at 513. The first design's inventory missed them. Budget
              sweeps them against the final rule text.
          - Workflow `wf_6747e950-b2f` runs two things in parallel:
            - an Opus amendment of the design, which reproduces each finding and writes a "Grok review reconciliation"
              section;
            - U1 in budget (Sonnet build, then Haiku gate; report `tmp/units/budget-u1-report.md`). It does not
              commit or bump; new files are marked intent-to-add.
        - **Budget meter answers (user).**
          - Publication: "Stage now, publish in wave".
          - `chargeUsage` stays in Agent.
          - The meter's behaviour is reopened. The meter is "an additional layer", and the user wants to trace "across
            all three layers of possible allowed failure points" (the meter estimate, the budget, the model). Each
            layer must be able to fail first. The verbatim answer is in `tmp/units/let-sweep-rulings-2.md`.
          - The redesign brief is `tmp/units/budget-meter-brief-2.md`. The workflow `wf_50cf95ca-136` runs an Opus
            planner, then an Opus law and intent critic beside a Sonnet code-evidence critic, then an Opus revision.
            Its output is `tmp/units/budget-meter-design-2.md`.
    - **Source-layer naming.** The test-layer fixes landed as Agent `f52daa4`.
      - The Opus planner's table is `tmp/units/naming-design-planner-1.md`. It confirms the clear rows and names the
        judgment rows for what they are, for example `StudyLabels` → `StudyLabeling` and `Artifacts` →
        `ArtifactLoader`.
      - It rules that derived guards, parsers and builders follow their type, and that persisted keys (`bounds`,
        `settings`, `labels`) keep their term.
      - Grok attacks it (task `naming-design-objective-1`). Sonnet implements after reconciliation.
      - **Reconciled** in `tmp/units/naming-plan.md`.
        - Grok confirmed every name and failed the table for incomplete families.
        - Adopted: `resolveStudyMemoryObservation`; `StudyMemorySettings` → `StudyMemoryOptions` after the driver
          options become `StudyMemoryDriverOptions`; `{Entity}Options` for the other driver and sink classes.
        - Kept: `StudyBounds` and `StudyScore.total`.
        - Unit A (Study `src`, tests and guide) runs after the `let` sweeps.
        - Unit B (Agent consumer, tests and the Study restage) waits for the Records Grok population. The runner
          imports root Study for every batch. Unit B first repoints the series labeling tools at the captured
          runtime's Study.
    - The Sonnet successor build runs from `tmp/units/scaffold-studies-build-brief-2.md` (workflow
      `wf_65bc6dda-e7b`). The brief states the law that was broken: declaration placement, no local helpers in test
      files, and the vendored set's helpers as exported members of `tests/setupPolicy.ts`. It also states the naming
      law and requires a cleanup-pass scan.
  - **Reconciliation.** Reports: `tmp/units/scaffold-studies-design-{planner-1,analyst-grok-1}.md`.
    - Both lanes agree:
      - an exact-case `tests/studies/**/*.test.ts` file selects the `studies` project, so Study gets none;
      - the factory sits between `service` and `distribution`;
      - `test:studies` runs from `prepublishOnly` after `npm test` (publishing) or from `test` (private);
      - extra accepted `prepublishOnly` predecessors;
      - no seeded `setupStudy.ts`, no `check:studies`, no `configs/studies`, no mirror law;
      - scaffold bumps to 0.0.102; targets re-pin and repair without bumping.
    - The Orchestrator ruled two splits:
      - `setupFiles` is `['./tests/setup.ts']` only. That was the planner's reading and matches the user's `setupPolicy.ts` analogy. Agent's `vite.config.ts` rewrites once on repair.
      - Widening the `setupPolicy.ts` sweeps to `studies/` is deferred to a later release.
    - Build brief: `tmp/units/scaffold-studies-build-brief.md`, Grok task `scaffold-studies-build-1`.
  - **Cleanup falsify round.** Verdict `.orkestrel/agent/studies-cleanup-audit-verdict.md`.
    - Grok and Opus both returned FAIL. Study mechanisms unproven by any test: reported durations, the summary role
      on room refusal, and the `collectStudyEvidence` checks. Also misplaced files, two uncovered removed
      assertions, a guide sentence, a non-durable ledger, and a forbidden poll.
    - Fix unit `tmp/units/studies-cleanup-u6-brief.md` (Sonnet, workflow `wf_d8ccec47-7be`) adopts the prescriptions
      verbatim. It landed uncommitted with every gate green in both repos:
      - Study `test:src` 527, with five new tests, each reddened by its mutation.
      - Agent `test:studies` 94 and `test:setup` 155.
      - Durable ledger: `.orkestrel/agent/studies-cleanup-ledger.md`.
    - **User correction (2026-10-16).**
      - Fix S4 hid two Study setup helpers (`buildOllamaJudgeRow`, `buildStudyAgentOrigins`), following the objective
        lane's prescription, and U3 had hidden `executeStudyProcess`.
      - The user rejected un-exporting. The law: `tests.md:189` (export every reusable setup helper) and
        `architecture.md:51` (every declaration exported; fold or export and test, never hidden).
      - Correction unit U7 (`tmp/units/studies-cleanup-u7-brief.md`, Sonnet, workflow `wf_4b2fc8aa-a69`) exports and
        proves, or folds, every hidden declaration in the non-vendored setup modules of both repos, including five
        pre-existing constants in Agent `tests/setup.ts`.
      - Every subagent prompt now carries the user's instruction verbatim: read scaffold's `AGENTS.md` and the files it
        points to (rules, agents, skills) and follow them strictly, especially on repository structure.
    - **Naming correction (user, 2026-10-16).**
      - U6's `MemoryGradingFixture` (`tests/studies/memory/types.ts`) has compound members (`completeAttempt`,
        `faultedAttempt`, `completeEvidence`). `names.md` requires one-word entity members grouped by entity, for
        example `complete: { trial, attempt, evidence }`.
      - A Grok naming audit (`tmp/units/naming-audit-brief.md`) covers two areas: tests (Agent `tests/studies/**` and
        setup modules; Study setup modules), task `naming-audit-tests-1`; and source (Agent `studies/**`, Study
        `src/**`), task `naming-audit-source-1`.
      - Fix units follow after U7.
      - The tests-area audit returned 13 violations, all in Agent tests: the `MemoryGradingFixture` grouping, the
        conversation-store exercise results (`beforeDelete`, `gotAlpha`…), the plural types `RecordedHeaders`,
        `LedgerClassificationParts` and `LedgerInputParts`, and a non-verb method `headers`.
      - Study's setup modules are clean.
      - The Orchestrator checked every row against `names.md`. Fix unit `tmp/units/naming-u8-brief.md` (Sonnet,
        workflow `wf_0ea2cbe8-bb8`) applies them. The source-area audit is still running.
  - Each upload window needs the user at the keyboard for `npm login` and the one-time code.
  - The boosted series uses one boosted run per arm, with no control run. Grok also grades the sealed Records packet,
    started in parallel: `tmp/units/study-label-grok-records-population.ts`, output
    `tmp/studies/labels-grok-2ac2a898`, journals `tmp/cursor/grok-label-records-*`. The largest batch runs first as the
    pilot. Sol's labels stay untouched.
    - The first launch (PID 60668, receipt `tmp/units/study-label-grok-records-detach.json`) stopped in 234 ms, before
      any model call. The runner requires the output parent to exist ("Destination parent does not exist"). Its
      journals were kept as `*.attempt1`.
    - After the Orchestrator created the empty output directory, the relaunch runs as PID 32584 (receipt
      `tmp/units/study-label-grok-records-detach-2.json`).
  - Package improvements: now, in parallel, default-preserving.
- **Lane routing (user, 2026-10-16).** Grok 4.7 xhigh (Cursor, T3 `delegate_task`, `reasoning_effort: xhigh`) is the
  Astra/Sol alternative for every adversary (falsify/reviewer) and objective (analyst) lane while Codex is dark. Opus
  holds subjective/planner lanes; Sonnet builds. The running Sonnet analyst lane was not interrupted. A Grok analyst
  lane (task `boost-design-analyst-grok-1`) holds the round's objective verdict, and the Sonnet report is
  supplementary evidence at reconciliation.
- **Deferred to the post-results sweep (found 2026-10-16).** These are changes under `studies/**`, so they wait for
  the series' final results:
  - Bind or remove two seams of `studies/memory/StudyMemorySession.ts` that no test binds. Removing the
    post-generate `check()` (near `:293`) or the provider request-timeout wiring (near `:99`) leaves every test green.
  - Decide whether `isStudyToolsResponse` should validate scripted tool arguments. It does not today; the analyst's
    cited `isStudyToolsArguments` does not exist, and U3 asserts `isStudyToolsWrite` refusing `../escape` instead.
  - Resolve the planner/analyst split on the profile re-checks in `studies/memory/helpers.ts` (planner U6).
  - Make the memory profiles runnable from the root.
  - Extract what Agent's own studies keep from the series, then sweep the series declarations and runtimes.
- **Cursor usage exhausted (2026-10-16 ~06:49 local).** Every premium Cursor model returns `You've hit your usage limit
  ... set a Spend Limit`, resetting 2026-11-16; T3 tasks then fail in seconds as "Provider turn failed" (the first U3
  builder, its successor and the label-import builder all ended this way; trees verified clean of mutations, draft
  edits intact). By user decision the delegated units now run as native Claude subagents (Sonnet 5.5 builders, Opus
  review) in workflow `wf_89a0ac79-c4f`. Bench-probe before routing to Cursor again.
- **Study commands (user decision 2026-10-16).** Agent's manifest adds one alias per Study operation beside the bare
  `study` passthrough: `study:check`, `study:execute`, `study:grade`, `study:label` and `study:report`, with arguments
  after `--` (from PowerShell call `npm.cmd`: PowerShell drops a bare `--` before `npm.ps1` receives it). Studies run
  evaluations, not tests, so they never take the `test:` prefix; the `tests/studies` proofs keep a `test:` script. No
  `study:*` plan existed before; the 2026-10-14 design planned a single `npm run study` entry
  (`tmp/units/study-scripts-evidence-archaeology.md`). The scaffold audit never examines a script without `vitest`, so
  the aliases raise no question (audit unchanged; config 229 and policy 119 pass). Agent's root is a captured root of
  every root-run identity, so the manifest edit moved the `tools`/`local` fingerprint from `fa42d8d9…` to `a9540f90…`,
  and the next Compaction staging must disclose `package.json` through `--delta`.
- **Committed declarations (finding 2026-10-16).** From the root, `study check` passes only `tools`/`local` of the 13
  study and profile pairs (`tmp/units/study-scripts-evidence-guide.md`): the memory `local` profile is a placeholder
  template, and `q4` and `q4-room` lack the `settings.gauge` the compaction arm now requires. The series runs from staged
  runtimes whose derived `compaction` profile carries the gauge, observation, checkpoint and rolling settings. Study's
  guide placed the rubric in the driver bundle; the source resolves it in the study's own directory. The guide now says
  so and states the forward-slash path rule and the `--out` default (Study `guides/study.md`, uncommitted; `test:guides`
  13 pass; guides do not ship, so Agent's installed copy stays current).
- **Series viability first (user decision 2026-10-16).** Keep the series runnable until its final results are in: the
  cleanup changes nothing the series stages or reads (`studies/memory/**`, its profiles and scenarios). After the final
  results, extract what Agent's own studies should keep from the series, then clean and sweep the series declarations
  and runtimes, keeping the Agent-specific studies.

## Terminal reading and grading

After execution seals, read it once into a fresh result file:

```text
node tmp/units/compaction-output-reader.ts read tmp/studies/compaction-output tmp/studies/compaction-output-runtime/project tmp/units/compaction-output-reader-result.json f7fd6acc551860ba89b904fc506b0eab5f11a49515ab1e183ea4fbb4a0bce4ef
```

Exit 2 is a rejected reading, not a broken command by itself. Acceptance requires the full
96-goal horizon, known usage, unique request joins, actual room/output compliance, exercised
compaction pressure, nonempty recaps, and successful reducing rolling folds. No pressure is
inconclusive. A clean process exit alone establishes neither quality nor performance.

Run public Study commands from the captured project, using
`C:/Users/mikes/WebstormProjects/agent/tmp/studies/compaction-output-runtime/node_modules/@orkestrel/study/dist/bin/main.js`.
Use absolute result paths: the result lies outside that project's relative output boundary.
Wrap grade, label, and report commands with the canonical dispatch launcher under a 120-second
outer cap; each has its own 60-second allowance. Use a fresh journal per command. The captured
CLI's verified syntax is:

```text
study grade RESULT --rubric RUBRIC
study label RESULT --grading GRADING_SHA --labels LABELS
study report RESULT --grading GRADING_SHA
```

Here `study` means Node plus the captured CLI path, `RESULT` is the absolute result directory,
and `GRADING_SHA` comes from the preceding command's output. Use
`studies/qualification/rubric.json` for operational reporting, then the independently frozen
`studies/endurance/rubric.json` for semantic grading. A whole-trial operational predicate can
mark every criterion unsuccessful; report actual completed, attempted-failed, and unexecuted
counts alongside it. Do not describe those rows as independent semantic violations.

The semantic rubric SHA-256 is
`1c192f973185dec7fba312dcb630a64416baf9a36a5d8c79752d25dc94320206`; workload SHA-256 is
`e6d2396c71979f64e6147df3bd4a8bc7bf7bc3e2d1d0fa118dac2fae0e6e65ed`.
Grade retained products without another generation pass. See
[semantic protocol](../../../study/.orkestrel/semantic.md). Prepare neutral public-history
batches with `tmp/units/study-label-prepare.ts PACKET SCENARIO TRIAL DESTINATION`;
`tmp/units/study-label-runner/main.ts` takes `BATCH_PATH EXPECTED_SHA256 CREATE_ONLY_DESTINATION`.
Verify the actual packet and neutral trial before creating successor population/import
wrappers; historical wrappers bind earlier results. Keep full preceding public history,
and verify the runner/checker's Study contract against the captured build before dispatch.
Do not assume Agent's historical root installation validates the successor packet. Keep
verbatim current criteria, no future evidence, at most two independent Sol-high labelers,
frozen controls and bounded pilots. Stop scheduling on invalid output, missing accounting,
quota/access failure or timeout; keep launched work under its cap. No hidden retry, changed
adjudicator or reused labels across packet identities. Import through public Study commands.

Retained Records custody is under `tmp/studies/endurance-capacity-3`: result
`fe9bd623-258a-44fa-91dd-cb6cd5a564ff`, seal
`3fbafc2bbcc7c551438adba20ee90654209bff0720bb18a2499210e8f6e35b6f`.
Its semantic grading is `b3636a404a274942dde10f5cc7bddcfee4592643ee978cd17b4f7eb067fa99f8`;
labels are `tmp/studies/retained-label-population-study-labels.json`. See
`tmp/units/retained-label-import-report.md` for immutable receipt and packet identities.
The labeled reading is 78 achieved, 305 unsuccessful, 1 unknown across 384 criteria. These
are model judgments, not ground truth. Changed build/room conditions and one trajectory limit
causal comparisons. Preserve the completed Records labels rather than requesting them again.

## Accepted implementation and remaining work

Study owns the reusable trace, gauged summary provider, scripted provider, response guards,
message/readings projections, and Ollama model/settings projections. Agent source fell from
2595 lines / 97140 bytes to 2104 lines / 80231 bytes; workload assets stayed 461437 bytes.
Trace flush/goal ownership, Script cancellation settlement, and Summary gauge ownership were
reproduced, repaired, and independently reviewed. No additional macro or per-file review is
pending for that accepted extraction. See [integration acceptance](../study.md) and
[promotion acceptance](../../../study/.orkestrel/promotion.md#acceptance).

Study verification passed 509 source, 119 policy, 229 configuration, 42 setup, and 13 guide
tests, with two applicability skips. The test chain resumed after a guide-only correction;
do not claim a single all-green `npm test` invocation. Agent passed 2118 main tests with two
skips and 155 separate study integration tests. Both packages passed formatting, lint, types,
and build. Agent's discovery instrument still flags core as ungated, but direct discovery
matched 44 files and `npm test` ran them with 1474 passes; no configuration was changed.

Agent consumes Study as the devDependency `file:../study`, a copied `--install-links
--ignore-scripts` installation. On 2026-10-16 root replaced the frozen `f977e68` copy (preserved at
`tmp/units/study-root-install-f977e68`) with the accepted `422d549` build: all 14 installed `dist`
files equal `../study/tmp/worktrees/compaction-output/dist`, and the other 32 root `@orkestrel`
packages are byte-unchanged (`tmp/units/compaction-output-2-root-orkestrel-before.json`), as are
`package.json` and `package-lock.json`. The refresh happened after staging; staging reads Study from
the build worktree. A Haiku verifier then measured `npm run check` passing (54 type errors before),
`npm test` passing 2118 with two applicability skips, and `npm run test:service` passing 154 of 155.
The failing test, `StudyMemoryDriver.test.ts:704` (rolling recap framing), passes alone in
`tmp/worktrees/study-slim` and fails alone at root. The difference is the `@orkestrel/agent` that
Ollama loads: published 0.0.30 at root, a development build in the slim tree. That is the unpublished
Agent API limit, not a Study install defect.

npm's `install-links` is `false` in this project, so a plain `npm install` replaces the copy with a
link to `../study` (a dry run reports `change @orkestrel/study`). Because the version stays 0.0.1,
npm also treats an outdated copy as up to date. Refresh it by moving the copy aside and running
`npm install --install-links --ignore-scripts`. Persisting `install-links=true` belongs in a
project `.npmrc`, which agents may not read or write; it is the user's change. Both lockfiles still
list Study's `f977e68` dependency set, without `@orkestrel/agent`, `@orkestrel/ollama` and
`@orkestrel/tool`. The checkout's own build cannot compile against the published Agent 0.0.30 it
resolves (`RequestMeasure`, `estimateRequest` and `measureRequest` are absent), so root restored
`../study/dist` from the accepted build after a failed rebuild. Study root `dist` equals that
build. The accepted consumer proof worktree is
`tmp/worktrees/study-slim`, with physical dependencies under
`tmp/studies/study-slim-dependencies`. Its Study server SHA-256 is
`01bff1edf977435415d21bb572150ae6434fb900a65dd3c53c877720a6304ecd`.
Study's older `tmp/worktrees/slim` proof tree is dirty but source-equivalent to accepted root;
do not reset it. Its dependencies live under `../study/tmp/studies/slim-dependencies`.
A Study build needs the development Agent and Ollama, so build in an isolated worktree whose
`node_modules` resolves them (as `slim-dependencies` does), then compare its `dist` before copying.

The next work follows these dependencies:

1. Grade `compaction-output-2` semantically after the Sol bench returns (2026-10-22 06:12 local);
   its terminal custody and operational reading are complete. Then close the qualification with
   an honest comparison against retained Records. Preserve failures and unknowns. The labeling
   tools import `@orkestrel/study` from the root installation, which equals the captured `422d549`
   build; confirm that equality again before dispatching labelers.
2. Read qualified Compaction phase/component/checkpoint evidence before a performance
   diagnostic. Observation is implemented; no optimization or speedup is accepted. Follow
   [performance protocol](../../../study/.orkestrel/performance.md), which supersedes the
   early suggestions in [direction](direction.md). History's context share is not elapsed-time
   attribution; retained decoding measurements point to substantial Agent generation cost.
3. Admit only measured candidates under that protocol: eager filing, batching, pending joins,
   repeat handling, runtime preparation, and residency changes remain conditional. Records
   lacks exact request checkpoints and must not be replayed to fill them. No parallel GPU
   treatment during this run. The historical protocol's 1200-minute total is a ceiling for
   gated stages, not permission to execute every stage. Require its paired quality and
   whole-trajectory criteria; no component-only speedup claim.
4. Reconcile publication/installed consumption only when authorized. Study's physical
   integration proofs use unpublished Agent/Ollama APIs; registry loading is not proof that
   those APIs are published. Needed owner releases and installed-consumer verification remain
   before publication readiness. MCP's repair is accepted, not implicitly published.
5. Before retiring historical harness custody, preserve raw runs/builds and promote the
   complete-capture golden probe with negative controls into Agent ledger tests as the
   separate unit described in `direction.md`. Do not remove the temporary harness build ignore
   or relocate absolute-path inputs while a retained proof still binds them.

See [metrics follow-up](../../../study/.orkestrel/metrics.md) for optional measurements and
model-context ablations. Its attempted/unexecuted reporting defect was already repaired at
Study `065f2aa`, and package-owned format counters/compatibility branches were removed;
those historical findings are not pending implementation. Model-visible dates/budgets remain
off and require a separate frozen treatment. Research references are in `usage.md`,
`rolling.md`, `records-research.md`, and `models-research.md`; read selectively by decision.

## Verification and cleanup custody

The summary-room design used actual Opus session `feac08f8-c4de-4b0e-baae-f9756204cc37`
(81954 ms, uncapped). Root accepted 4096 as a finite next allowance, not a guarantee or the
report's incorrect uniqueness claim about powers of two. All eight prior summary inputs fit
15872: maximum projected 13033, actual 12244; the original evidence hash stayed
`24b7f43a96df1cbe6444a9f87d0c1759f0c86529693d6a5a851c0d89540e0b8d`.
Sonnet sessions `75f33e24-527a-4195-841d-de1c1dd512c6` and
`56a32507-3d1b-47f9-a92d-a88b5b40b0f7` wrote disjoint launch/reader adaptations in 166991 ms
and 213037 ms. Independent Opus `7ef12568-8d34-42e3-95e1-610076114d81` returned
`VERDICT: PASS` in 204981 ms; source rulings were supplemented by host checks. No Fable ran.

Host checks passed Node parsing and strict standalone TypeScript for the successor scripts,
reader selftest 55 controls plus 25 rolling controls, frozen staging, wrong custody,
extra-project/runtime membership and stale-deadline refusals with exact restoration.
Offline/public launch checks exited 0 uncapped in 1920/1624 ms; reader pins verified without
reading results. The isolated Study build exited 0 uncapped in 9224 ms. No model completion,
semantic quality or speed conclusion follows from these checks.
Opus noted that the existing selftest does not separately mutate every summary-specific
numeric boundary. It found no incorrect guard; retain that coverage limit when interpreting
the reader proof, rather than treating the control count as exhaustive.

The accepted code seams in `series-audit-verdict.md` and `series-repair-verdict.md` are
archived at Agent `78ea378`; their verdict documents can be retired. Their acceptance does
not close the live qualification or its grading.

The ready handoff was committed before cleanup at Agent `dd170a8` and Study `aed20fc`.
The 2026-10-15 sweep removed 49 reviewed artifacts totaling 2145106 bytes: accepted bench
transcripts/briefs, duplicate drafts/preparation copies, the quota-refused lookup artifacts,
and the archived verdicts. The sweep helper was also retired. A native Luna checker found
no live dependency on the candidates. After deletion, reader pins and the external build
receipt hash still matched; progress remained at 32/96 and the supervisor error file was empty.

Remove further accepted bench transcripts, briefs, duplicate drafts and preparation copies
only after their decisions/readings are retained.
Protect all captured runtimes/results, original c1 evidence/oracle/golden inputs, worktrees and
physical dependencies, label batches/receipts, and canonical dispatch tools. In particular,
the current launcher rechecks the external build receipt; deleting it invalidates the run.
Keep `tmp/units/compaction-output-{stage,launch,daemon,controls,progress,watch,reader}.ts`,
their stage/build/launch/daemon/control/validation receipts, and every active check/series/
daemon/supervisor/observer journal and PID file. Keep every `tmp/units/compaction-output-2-*`
script, receipt, detach receipt, reader result and grade journal, every
`tmp/codex/compaction-output-2-*` journal and PID file, and the preserved
`tmp/units/study-root-install-f977e68` copy until semantic grading and the Records comparison
close. Keep historical `compaction-task-*` and other frozen proof tools until their custody is
retired. Do not use a broad `sweep --tmp` before that grading. The next session must verify these
paths before a further sweep.
