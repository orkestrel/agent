# Parallel holders — status and hand-off (updated 2026-10-06)

**Owner: the desktop session.** No other session takes over this work, or acts as if it has, unless the user gives the explicit go-ahead (the user, 2026-10-05). A session that reads this file without that go-ahead reads it for context only.

The design record kept beside this file is `synthesis.md` (the holder tools, shipped in browser 0.0.24). The sweep of 2026-10-07 removed the other records of the closed campaign from `lifecycle/`: `review-h2.md`, `readings.md` (H6 contention), the contexts round (`contexts-design-brief.md`, `contexts-proposal-analyst.md`, `contexts-proposal-planner.md`, `contexts-attack.md`, `contexts-synthesis.md` with the user's rulings), the reviews this file cites, and the eager, reading, and lane folders. Read any of them at scaffold `cf5f3ae9e`.

## Published

- Pool 0.0.15 (`4c589c6`), browser 0.0.24 (`b81c22c`), scaffold 0.0.92 (`5612beb`), on 2026-10-04; record `scaffold/.orkestrel/release.md` § 2026-10-04 evening round.
- **The 2026-10-05 round, complete** (record `scaffold/.orkestrel/release.md` § 2026-10-05 round; logged for veneer in `lanes.md`):
  - pool 0.0.16 (`f5c3289`);
  - worker 0.0.16 (`5c14ed7`);
  - browser 0.0.25 (`ea8477b`) and 0.0.26 (`0379087`);
  - probe 0.0.21 (`0745af2`);
  - scaffold 0.0.93 (`916820149`).

  Every package is confirmed through `npm view`.

## Browser 0.0.25 — prepared, blocked at its gate

- On browser `main` and pushed: `e931740` (simultaneous replays of one journey on two holders no longer fail `BROWSER_JOURNEY_LOCKED`; run allocation queues per journey in process), `132c580` (the test launcher's Vite watcher ignores `tmp/`, which had pushed two global-setup cases past their budget), `74161b0` (scaffold 0.0.92 overwrite), `86140d2` (the release visit's re-pin).
- Uncommitted in the browser checkout: the version bump to 0.0.25 (`package.json`, `package-lock.json`) and the HAR creator stamp `0.0.25` (`src/core/constants.ts`); the visit ruled a bump (source moved).
- `prepublishOnly` steps: format, lint, typecheck, build, `npm test`, and the default-mode distribution test pass; `test:service` fails one `tests/service/document.test.ts` case at its startup precondition in two runs of two (logs browser `tmp/codex/r25-test-service.log`, `r25-test-service-2.log`). That is ROADMAP item 15, unrelated to 0.0.25's changes and present since at least 2026-10-04's census; it passed in the 0.0.24 release run by chance. Not published until it is resolved or the user rules to publish with it named.

### Item 15 investigation (2026-10-05)

- Ruled out: the fixture server's keep-alive race (`tmp/codex/keepalive-last.md`), a server-side read failure (the handler answers every path), and a toolset start that waits on an animation frame in a hidden page (`tmp/codex/item15-last.md`, `item15-hidden-startup.json`).
- At a captured failure (`tmp/codex/item15-failure-full-3.json`) the page was hidden and unfocused, two module requests were cancelled within 0.3 ms, and the browser carried Edge's onboarding, sync-confirmation, and extension targets; four unchanged full runs: two passed, one failed the document case, one the renderer-crash case.
- Running: unit `item15b` (brief browser `tmp/codex/item15b-brief.md`) compares repeated full runs with and without Playwright-style background-suppression flags, narrows the decisive flags, and reports whether they belong in the library's `BROWSER_LAUNCH_ARGS` (today only `--no-first-run`, `--no-default-browser-check`), since `browse` launches the same Edge on fresh profiles.

- The user ruled (2026-10-05): **hold browser 0.0.25 until item 15 is fixed.** Unit `item15b` was inconclusive (controls passed five of five that session; the first flagged run hung; no flags adopted). The Orchestrator's own full runs failed three of three (`tmp/codex/r25-test-service*.log`). Running: unit `item15c` (brief `tmp/codex/item15c-brief.md`), testing whether Edge freezes the hidden document page (sleeping tabs or efficiency mode on this laptop), which would cancel its in-flight module requests. Result: ruled out (`tmp/codex/item15c-last.md`): a frozen page suspends at `interactive` with no status-0 requests. Running: unit `item15d` (brief `tmp/codex/item15d-brief.md`), which loops full runs with Chromium's network log until a failure and reads the cancelling component and error. Result: zero document failures in six logged runs (one renderer-crash budget failure); the log suppresses or misses it. Also ruled out by reading the code: a double navigation in page creation (`BrowserContext.ts:181-210` creates `about:blank` and navigates once) and cross-page request interception (`BrowserNetworkManager.ts:272-290` enables `Fetch` per page only with routes or credentials). Running: `tmp/probes/engine-split.ts`, alternating full runs between the system Edge and Playwright's Chromium (`chromium-1243`) to read whether the flake is Edge-specific; results land in `tmp/probes/engine-split/results.json`. Result: all six passed (Edge three of three, Chromium three of three); the flake did not appear, so the split is unsettled. Across the day the rate moved by session (the Orchestrator's runs near 01:30 to 02:30 failed three of three; the next sixteen full runs in three series failed none). The cause is unknown; 0.0.25 stays held; resume item 15 when it recurs, reading the failing run first.
- The contexts campaign started while item 15 waits: P1 landed on pool `main` at `3ff0c63` (per-record `capacity`, 21 cases each red under its mutation; report pool `tmp/codex/contexts-p1-last.md`), unreleased (pool 0.0.16 later); its Opus review (`review-p1.md`) ruled FAIL (idle reuse order, the unstated validation exposure, ownership wording, one test, item 1's trigger) and unit `contexts-p1fix` repaired all seven findings with mutation probes (pool `main`, the commit after `3ff0c63`; `isPoolMax` renamed `isPoolLimit`, used only in vendored guide mirrors); M1's first attempt stopped on an instrument hang (an isolation control's in-page step waited on a permission prompt; `tmp/probes/contexts/m1/report.md`); unit `contexts-m1b` (brief browser `tmp/codex/contexts-m1b-brief.md`) finished on 2026-10-05 at 09:39, exit 0, 81 minutes, no probe Edge process left; its record is in the following section.

## M1 result (unit `contexts-m1b`, 2026-10-05)

Report: browser `tmp/probes/contexts/m1b/report.md` (prose, tables, commands); raw records beside it. Edge 154.0.4258.53, Node v24.21.0, browser `132c580`, three interleaved samples per cell, meaningful difference 15.4167% declared before the final series (`performance-weRPGQ/sizing.json`), observed ranges, not confidence intervals.

- **Wall:** contexts match separate browsers at equal holder counts (core loop: 2 holders 12.91 [12.61–15.61] s against 12.94 [12.77–15.71] s; quiet: 3 holders 10.13 against 10.30 s). Contexts on one browser: 1 to 2 holders improved 40.9% under the core loop (21.85 to 12.91 s, disjoint ranges); 2 to 3 improved 11.1% (below the threshold); quiet 3 to 4 showed no gain; the balanced twelve-workflow control read 3 against 4 contexts at 7.5% quiet and 7.6% loaded (below the threshold, loaded ranges overlap).
- **Cost:** at 2 holders under the core loop, contexts settle at 917 MiB private against 1610 MiB for two browsers, 13.9 against 17.0 browser CPU-seconds, 19 against 36 processes; at 3 holders 1130 against 3507 MiB. An idle second browser (hybrid at 1 holder) adds about 1 GiB private (2551 against 1414 MiB).
- **Latency:** context acquire 113 to 266 ms, `close()` about 22 ms, replacement 126 to 240 ms, against a 980 to 1898 ms browser relaunch.
- **Isolation:** every store passed 3/3 on one browser and on separate browsers, quiet and loaded: cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, service-worker registration presence, permission overrides (set through `Browser.setPermission` with the context id), HTTP cache by origin counts, downloads; `Target.getBrowserContexts` omits each closed context; disposed listener counts read 0.
- **Turnover soak:** 30 generations, three repetitions per load: owned context, target, and download-folder counts return to one each batch; private memory rises from about 505 to about 670 MiB by generation 5 and then holds; a longer leak is not excluded.
- **Blast radius:** 24 cells. A killed browser loses every holder on it (one browser 4/4; two browsers 2/4, holders on the other browser answer); a renderer crash loses only its holder. Rebuilding the first lost holder takes 0.99 to 1.57 s from the loss event, sequential rebuilds stacking to 2.8 s for the fourth.
- **Recommendation (the writer's, for the user's ruling):** one browser with `BROWSE_CONTEXTS=2`, the shared holder counted; `BROWSE_POOL` stays 1; a second browser is an availability choice at about 1 GiB idle.
- **Defect candidate, browser library (browser `ROADMAP.md` item 16):** `navigator.serviceWorker.register()` never resolves under the library's page setup (`Target.setAutoAttach` with `waitForDebuggerOnStart: true`, `src/core/BrowserContext.ts:510`, `BrowserPage.ts:1347`, `:1490`); the registration exists with no installing, waiting, or active worker; with `waitForDebuggerOnStart: false` set through `page.send()` it activates. The worker attach path (`BrowserPage.ts:2052`) returns early for a target reported by a session other than the page's own, which might leave a service worker paused; unconfirmed.
- **Headed limit:** a page hidden behind a popup runs timers at 1 to 2 Hz and animation frames at 0 Hz; headed popup clicks succeeded 3/9, timing out in `Runtime.callFunctionOn` because element positioning waits on `requestAnimationFrame` (`src/core/elements/BrowserPageElement.ts`); headless succeeded 9/9.
- **Unresolved:** one quiet 3-context cell (`final-false-contexts-3-1`) failed a bounded 15-second `read` call; the focused repeat (three context runs, three browser controls) did not reproduce it. The loaded steady CPU calibration passed 2/3, so small CPU differences carry no claim.

## The contexts campaign (P1 and M1 done, C1 waits on the topology ruling)

- The user's rulings (2026-10-05): holders become isolated contexts on pooled browsers; a per-browser bound `BROWSE_CONTEXTS` with total admission `size × contexts`; the shared holder counts; the call-paced relaunch loop is a recorded limit; the default `BROWSE_POOL` stays 1 until contexts land; the default topology is ruled from M1.
- The user ruled Q4 from M1 (2026-10-05): one browser, default `BROWSE_CONTEXTS` 2, the shared holder counted, `BROWSE_POOL` 1.
- Unit `contexts-c1` (brief browser `tmp/codex/contexts-c1-brief.md`) stopped after 2.5 minutes on "ties by warm order" against the pool's release-order idle ties (`tmp/codex/contexts-c1-last.md`); the Orchestrator ruled that browse follows the pool's tie rule (`contexts-synthesis.md`, § Where the lanes agree). Unit `contexts-c1b` (the same brief with a continuation, `tmp/codex/contexts-c1b-brief.md`) finished in 46 minutes (`tmp/codex/contexts-c1b-last.md`): 13 files plus tests, 28 added cases with 27 mutation controls (`tmp/codex/contexts-controls-final.json`), owning projects 1839 passed. Uncommitted on browser `main` beside the 0.0.25 bump; `npm run test:guides` is red (seven new exports undocumented, three summaries drifted; log `tmp/codex/contexts-c1-guides.log`), to be synced in the review-fix unit. The Opus objective review (`review-c1.md`) ruled FAIL with eight required changes, three of them correctness defects: an unwatched prepared generation, a release-then-declare race with a co-holder, and over-broad retirement. The Orchestrator ruled the two referred questions in the same file. Unit `contexts-c1fix` (brief browser `tmp/codex/contexts-c1fix-brief.md`) stopped on change 5 with nothing changed; the Orchestrator restated change 5 (`review-c1.md`, § Orchestrator rulings). Unit `contexts-c1fix2` (brief browser `tmp/codex/contexts-c1fix2-brief.md`, report `tmp/codex/contexts-c1fix2-last.md`) repaired all eight changes and applied both rulings, each code repair red without its mechanism (ledger `tmp/codex/contexts-c1fix-controls/ledger.json`). Owning projects: 1844 passed. Guide parity: 250 passed. Policy: 119 passed. **C1 landed:** browser `main` `6bedbb1`, pushed 2026-10-05. Until pool 0.0.16 publishes and the browser re-pins, a fresh clone of browser `main` fails typecheck, because `package.json` pins pool `^0.0.15`; this checkout carries the pool build in `node_modules`. **C2 landed:** browser `main` `50e6017`, seven real-Chromium proofs, each red under its source mutation (`tmp/codex/contexts-c2-mutation-ledger.json`). Running the file whole showed three pre-existing cases failing since C1, which the Orchestrator had not run before committing C1:
- `contains downloads and destroys their process and profile before capacity is reused cleanly`;
- `reports a real filesystem refusal while ending several live leases`;
- `forces a hung stand-in process to exit at the ping deadline and serves its successor`.

Unit `contexts-c1svc` (report browser `tmp/codex/contexts-c1svc-last.md`) classified the four failures:
- two obsolete expectations, rewritten at `contexts: 1` with every true claim kept;
- two C1 defects, fixed with red cases: the forced kill waited on context cleanup, and an expected shutdown disconnect became a teardown fault.

It stopped at a core defect C1 exposed. Closing a crashed-renderer page stalls about 30 s, because `BrowserPage.#close()` releases resources before closing the target and the WebMCP registry waits on a crashed renderer. Running: unit `contexts-c1svc2` (brief browser `tmp/codex/contexts-c1svc2-brief.md`, cap 3 hours), with `src/core/BrowserPage.ts` in scope. It must pass the service file alone twice and rerun the server project's `FileBrowserStore` timing case after the probe unit finishes. All of this stays uncommitted, and one Opus review covers it before commit.

`contexts-c1svc2` result (`tmp/codex/contexts-c1svc2-last.md`):
- `BrowserPage.#close()` sends `Target.closeTarget` before `#release()`. A crashed-renderer close takes 21 ms instead of about 30 s, and its core case fails under the old order.
- Core project: 1250 passed.
- `tests/service/browse.test.ts` alone: two consecutive passes, 37 passed and 6 skipped, at 76.2 s and 71.8 s.
- Open: the server project's `FileBrowserStore` race case missed its 5,000 ms deadline only while the probe unit ran. The Orchestrator reruns `npm run test:src:server` after probe finishes.
- The Opus review (`review-c1svc.md`) ruled FAIL on F1, F2, F3a, and F3b.
- Unit `contexts-c1svc3` (`tmp/codex/contexts-c1svc3-last.md`) repaired F1, including a second window where a launched browser defers its loss event, and F2 (no `detach` after `close()` starts). Six mutation controls fail without their fixes. The whole `BrowserMCPServer.test.ts` and `BrowserPage.test.ts` files pass.
- F3a uncovered a core defect: `CDPClient` never settles a detached session's pending commands.
- The service file passed once and failed once: the downloads case timed out at 30,445 ms, with three replay cases after it, while the probe unit loaded the host.
- Unit `contexts-c1svc4` (`tmp/codex/contexts-c1svc4-last.md`):
  - `CDPClient` rejects a detached session's pending commands with `CDPConnectionError` (`method`, `session`); root and other-session commands resolve.
  - Eight mutation controls fail without their fixes; core project: 1253 passed.
  - `tests/service/browse.test.ts` alone passed twice consecutively on a quiet host: 37 passed, 6 skipped, 65.3 s and 68.2 s.
  - The downloads stall did not recur; its cause stays unestablished.
- The Orchestrator's `npm run test:src:server`: 388 passed, 10 skipped, so the `FileBrowserStore` misses were load from the probe unit.
- The Opus delta review (`review-c1svc2.md`) ruled FAIL on four items, and unit `contexts-c1svc5` repaired them:
  - registry guards once a page closes;
  - healthy-browser and lost-browser cleanup-fault cases;
  - a child-session detach delivered on its parent;
  - the `CDPConnectionError` description.
- Its results: 15 mutation controls, each failing exactly its case; core 1255 passed; guides 251; policy 119; the service file passed alone a third time. The Orchestrator's server rerun: 390 passed.
- **The C1 follow-up landed:** browser `main` `708f0dc`, pushed 2026-10-05.
- Probe U4 (`eager-probe-u4`; readings copied to `eager/probe-readings.md`):
  - The negative control passed.
  - M-A, spawn to `initialize`: probe 8.55 s; scaffold 13.41 s, so T1 is yes, above Codex's 10 s default; veneer **refused** at about 61 s in 3 runs of 3, `The type stage warm exceeded 30000 ms`.
  - M-B, Oxlint kill to a working replacement: 3.0 s.
  - M-C is not a clean comparison: the historical server suite failed one case.
  - M-D: no persistent handle.
  - M-E: Codex with `required = true` refuses and prints the cause. Claude Code connects in both the healthy and the refusing case.
- The veneer readings (`eager-probe-veneer2`):
  - Veneer's type warm takes 37.2 s at the median (36.4 to 50.0 s), whole arm 46.4 s.
  - Published 0.0.20 also refused its first two `prove` calls on veneer, at 76.7 s and 35.5 s, and recovered only after an idle replacement warm.
  - Scaffold: warm 7.3 s, arm 14.6 s.
- **The user ruled (2026-10-05):** `initialize` waits for lint and runtime only, and the type stage warms behind it under its own warm bound, separate from the 30 s inspection deadline (`eager/probe-design.md`, T1 revised).
- Unit `eager-probe-warm` stopped on the Orchestrator's own overreach, "lint keeps working while type is unavailable", which the `Verdict` contract forbids, and the correction withdrew it.
- Unit `eager-probe-warm2` committed probe `e8d4715`:
  - `PROBE_WARM` is 90,000 ms, overridable through `ProbeOptions.warm`.
  - `initialize` takes veneer 7.1 to 7.9 s, scaffold 3.2 to 4.1 s, and probe 1.5 to 1.7 s, all under Codex's 10 s default.
  - Veneer's first type `prove` succeeds without a retry, 43 to 46 s from the call.
  - Six cases each fail without their mechanism. Source suite: 268 passed.
- Probe U5 committed `3e43264`:
  - the guide's surfaces, § Lifecycle, § Registering the server, and § Cost;
  - the pool 0.0.15 mirror, refreshed to 0.0.16 at the release visit;
  - the queue mirror removed and ROADMAP item 1 deleted.

  The Orchestrator fixed the two TSDoc summaries U5 could not own, in `23ddcea`. Guides: 32 passed. Policy: 119 passed.
- Running: U6, the Opus review of `dee8845..23ddcea`. Then U7 (gates); push probe after U7.
- **M2** (unit `contexts-m2`, report browser `tmp/probes/holders/m2/report.md`) completed its quiet series, three repetitions per cell, through the built binary. Body wall time:
  - 1×1: 49.7 s;
  - 1×2: 29.7 s, 40.2% less than 1×1, with disjoint ranges;
  - 1×3: 24.3 s, 18.1% less than 1×2, with overlapping ranges, so not established;
  - 2×2: 24.6 s, at 87 against 49 browser CPU-seconds and 3,470 against 2,217 MiB idle; the holders on the surviving browser kept working after a kill.
- M2 stopped before the loaded series:
  - the host-CPU preflight failed twice (17 to 21%, mostly Cursor);
  - the core loop failed `tests/src/core/CDPClient.test.ts:277` once. That case, written 2026-09-29 (`91ec857`), counts process-wide `Timeout` resources, so an unrelated timer expiring between its two readings fails it under load. A flake candidate, not the session-detach change.
- **The user confirmed the defaults (2026-10-05):** one browser with 2 contexts, the shared holder counted, from M1's loaded library readings and M2's quiet binary readings. ROADMAP item 14 closed: browser `main` `10802f3`, pushed 2026-10-05.
  - The guide's defaults bullet cites M1 and M2.
  - The `CDPClient` timer case records only its own request's timer through `node:async_hooks`. It is red under a test-config overlay that skips clearing the timer on abort, and it passed 20 runs in a row.
  - Core: 1255 passed; guides 251; policy 119.
- **The browser contexts campaign is complete on `main`:** C1 `6bedbb1`, C2 `50e6017`, C3 `b1b1c8f`, the follow-up `708f0dc`, and the item 14 close `10802f3`, plus item 16 `e8aa649`. It is unpublished; the release waits for pool 0.0.16 and the user's item 15 decision.
- Probe: U6 (`review-u6.md`) ruled FAIL. Unit `eager-probe-u6fix` committed `0c78588`:
  - the type refill refusal is consumed by the call that receives it, red on the stale cause;
  - `LINT_TEARDOWN` (16,000 ms) bounds lint disposal with `deadline`; at `deadline: 500`, live pids read `[1,1]` against `[1,2]` before the fix;
  - the `arm-` cleanup assertion moved to a case that fails;
  - the TSDoc drift fixed, and the guide states the reworded survivor ruling.

  Its gates passed: `npm test` with source 269, policy 119, config 227, setup 19, and guides 32.
- U7, the Orchestrator's independent gate run:
  - The first run failed `spends silent initializes through the coordinator deadline` under full-suite load. Its 3 s replacement wait predated `0c78588`, which made each replacement follow a lint disposal bounded by `LINT_TEARDOWN`. The wait and the timeout now derive from `LINT_TEARDOWN` (`4428ae1`), and the overlap pin is unchanged.
  - The rerun passed every gate.
- **Probe landed:** probe `main` `0437a29..4428ae1`, pushed 2026-10-05. It pins pool `^0.0.15`, so a fresh install fails the idle-loss cases until the release re-pins to `^0.0.16`.

## Release, in layer order (the user, 2026-10-05: publish up to browser, not browser yet; then research item 15 in depth, upstream included)

- **pool 0.0.16: published** 2026-10-05 (`window.ts`: accepted, confirmed; log `tmp/units/publish--orkestrel-pool.log`), from `f5c3289`.
- **worker 0.0.16: published** 2026-10-05 from `5c14ed7`. `window.ts` reported accepted and unconfirmed while npm processed it; `npm view` then served 0.0.16 with `@orkestrel/pool` `^0.0.16` (log `tmp/units/publish--orkestrel-worker.log`).
- **probe:** its visit failed the test gate on one case. The silent-initialize case's `await probe.destroy()` rejected while worker's gates ran alongside.
  - The file alone passes: 37 passed in 481.6 s (`probe/tmp/codex/layer-probe-rerun.log`).
  - Likely cause, unconfirmed: under heavy load the lint kill confirmation overruns its window, and teardown (since U6) reports the slow child as a survivor.
  - The visit also reported 2 self-pin hits. It committed the re-pin (`a550341`) and left the overwrite's files uncommitted.
  - Reproduce it under load and rule on it after `item15e`, which needs the host.
- **Item 15 deep research** (records in `lifecycle/item15/`):
  - **The leading cause, H1, which the attack confirmed and strengthened:** Edge signs each fresh profile in to the user's Windows Microsoft account and syncs the account's extensions. The second install wave, about 20 to 22 s after launch, brings Claude (`declarativeNetRequest`, `debugger`) and Capital One Shopping (`webRequest`). The first such extension resets the URL loader factories, and a page's import wave in that window gets `net::ERR_ABORTED` before dispatch.
  - **The user ruled (2026-10-05):** `--disable-sync` goes into `BROWSER_LAUNCH_ARGS` for every browser the library and `browse` launch, and the experiment series may run.
  - Unit `item15e` (`tmp/codex/item15e-last.md`, `tmp/probes/item15/`) confirmed H1's behavior:
    - Reloading Capital One alone reproduced the signature (1 of 3 reloads, 0 of 1 controls), and so did Claude alone (1 of 2), so H7 is not needed.
    - E1 calibration: arm A failed at +20.779 s, beside Claude's install at +20.748 s; arm B (`--disable-sync`) installed neither extension and failed nothing.
    - No network-change or 4227/4231 events showed in the nine failure windows (H5 and H6 contradicted).
  - It committed no fix: `--disable-sync` leaves Edge's implicit sign-in to the Windows Microsoft account in place. No documented per-launch switch stops it; Edge's `ImplicitSignInEnabled` and `BrowserSignin` are machine-wide policies.
  - **The user ruled (2026-10-05):** land `--disable-sync` and close item 15 on sync off with no account extension, recording the sign-in as a limit. Research a per-launch way to stop implicit sign-in afterward, in its own unit.
  - **Item 15 closed:** unit `item15f` committed `1ebeca7`, pushed. `--disable-sync` is in `BROWSER_LAUNCH_ARGS`.
    - The formal E1 series of 8 interleaved pairs, declared beforehand: arm A failed 3 of 8 launches, each right after Claude's install; arm B failed 0 of 8 and installed no account extension. The rate comparison alone reads p = 0.10, against 0.05 declared, so the closure rests on the reproduced trigger and B's zero.
    - The regression case `tests/service/launch.test.ts` reads Edge's sync diagnostics: red in 1.1 s without the flag, green in 1.2 s with it.
    - Three full `npm run test:service` runs each passed 205 with 6 skipped, and 0 account installs across 77 profiles per run.
    - The guide records the implicit sign-in limit.
  - The bump and HAR stamp were committed as `11da79d`. The browser 0.0.25 visit committed the re-pin to pool `^0.0.16` (`1000f05`), and the Orchestrator committed the first visit's overwrite output (`6330805`, scaffold 0.0.92).
  - The visit's test gate then failed three times on `FileBrowserStore > preserves committed results when an empty lock removal races another writer`, which timed out at Vitest's 5,000 ms under the whole `src:server` load. The case loops 512 real-filesystem lock races and passes alone; it is the same case that missed earlier under the probe unit's load.
  - Unit `store-race-tune` committed `75c8fc2`:
    - The case drops from 512 iterations to 8. With the mechanism disabled, 59.96 to 68.55% of iterations fail, so 8 gives a 0.07% chance of missing the defect, under the declared 0.1%.
    - It is red with the mechanism disabled (4 of 8) and green at about 30 ms. Five whole `src:server` runs passed 390 each.
  - The fourth visit then passed every gate:
    - `npm test` and the compare (dist moved, range moved, ruling bump).
    - `prepublishOnly`'s `test:distribution --mode release` needs `/proc` and FIFOs, and fails on Windows. Per the release record, the default mode passed (14 passed, 9 host-bound skips), and `test:service` passed (205 passed, 6 skipped).
  - **Browser 0.0.25: published** 2026-10-06 UTC from `ea8477b`. `window.ts` reported accepted and unconfirmed, and `npm view` served 0.0.25 with pool `^0.0.16` about 4 minutes later. Recorded in `.orkestrel/release.md` § 2026-10-05 round and logged for veneer in `lanes.md`.
  - Probe: its pending overwrite was committed (`288f600`).
    - Unit `teardown-load` ran 20 runs at about 85% CPU (14 busy workers). The teardown rejection reproduced 0 times; every `destroy()` resolved, and every pid was gone afterward.
    - Instead, the case failed 20 of 20 because the fixture's `overlaps` record was never written: the observation depends on fixture timing under load.
    - `teardown-load2` committed `140c5bd`:
      - The fixture wrote `spawns`, then ran `tasklist` before writing `overlaps`, so cleanup could kill it between the two writes. It now records the overlap in its startup write.
      - Under load: 20 of 20 failed before, 0 of 20 after. With the disposal bound removed, 5 of 5 fail.
    - The quiet full suite failed only the executed receipt example (Oxlint moved to 1.87.0); the Orchestrator re-quoted it in TSDoc and the guide (`24b8a27`), and guides pass 32.
    - Under a synthetic 85% CPU load, 12 timing cases across 3 files fail (handshake, warm, deadline). That load is harsher than a release visit, so this is a follow-up, not a blocker.
    - The release-visit teardown rejection stays unreproduced in 20 runs.
    - Next: `layer.ts probe` once browser 0.0.26's preparation is done, with visits run one at a time.
  - Unit `signin` (`tmp/codex/signin-last.md`, `tmp/probes/signin/`):
    - On Edge 154.0.4258.53, `--disable-features=msImplicitSignin` stops implicit sign-in: no account in 3 of 3 launches plus 3 confirmations, against a control that signed in 3 of 3. The library's drive passes with it.
    - `msIdentityCore` also works. `--guest` breaks CDP with `ECONNRESET`. The `signin.*` preference seeds, `--disable-signin`, and `--allow-browser-signin=false` do not stop it.
    - Candidates came from `msedge.dll` strings; 84 launches, all profiles deleted.
  - Unit `signin-fix` committed `fee07dd`, pushed:
    - Every library launch emits one `--disable-features=` switch containing `msImplicitSignin`, merged with any caller's disabled features.
    - The service assertion "no account identity or consent after a 2 s settle" is red without the flag (3.3 s) and green with it. The merge case is red with two switches (18 ms).
    - Server 392, core 1255, guides 251, policy 119, and `test:service` 205 passed.
    - The guide states that Edge automation profiles carry no Microsoft account, synced extensions, or synced settings.
  - The 0.0.26 bump and HAR stamp were committed as `7a5ce85`.
    - The first 0.0.26 visit failed `npm install`: `@microsoft/api-extractor` 7.59.4, published at 01:54 UTC, needed `@rushstack/ts-command-line@5.3.17`, which reached npm about 10 minutes later.
    - The rerun passed every visit gate. The Windows `prepublishOnly` ran with the default-mode distribution (14 passed, 9 skipped) and `test:service` (205 passed, 6 skipped).
    - **Browser 0.0.26 READY** at `0379087`, waiting for the user's code.
  - **Probe 0.0.21 READY** at `0745af2`: `npm test` 514 s, `prepublishOnly` passed, and the compare shows pool `^0.0.16` added and queue removed. Waiting for the user's code.
  - Follow-up, its own unit after the browser release: a per-launch way to stop Edge's implicit sign-in (an internal `--disable-features` name, or guest mode) without touching the user's Edge.
- **worker** (L4): after pool publishes. **probe** sits in browser's layer (L5) and does not depend on browser.
- **Item 15 deep research:** running as the workflow `item15-deep-research` (evidence reader, code reader, upstream researcher, a synthesis with decisive experiments, an adversarial critic). Its experiments run after it returns.

The layer plan:

1. **pool 0.0.16:** `capacity`, the idle-loss strike, and the `isPoolMax` to `isPoolLimit` rename (breaking; no fleet source imports it).
2. **browser:** the held 0.0.25 work plus item 16, C1 to C3, the follow-up, and the item 14 close. Re-pin to pool `^0.0.16`. It needs the user's item 15 decision.
3. **probe and worker:** each re-pinned to pool `^0.0.16`.
4. **scaffold:** the catalog regenerated, the guide mirrors (pool, worker, browser, probe), and the fixture pins; coordinated with the cloud session's lanes. Then a veneer entry in `lanes.md`.
- M2 (browse confirmation) runs on a quiet host after U5's test runs.
- M2 waits for a quiet host after it. Drafted: `tmp/codex/contexts-c3-brief.md` (Opus, after c1svc), with its limit line amended by the correction to rulings 4 and 8.

Parallel lanes (the user, 2026-10-05; `native/synthesis.md`):
- worker unit `pool16` (worker `tmp/codex/pool16-brief.md`): narrow `WorkerOptions.pool` to refuse `capacity`, and pin the idle-loss strike;
- probe unit `eager-probe2` (probe `tmp/codex/eager-probe2-brief.md`): ROADMAP item 1 on pool 0.0.16, with local commits per unit and no push.

Both build against the pool tarball installed without saving. Pool ROADMAP item 1 stays unbuilt, and Q3(a) stands.

Lane results:
- **Worker landed:** worker `main` `11db32a`, pushed 2026-10-05, after units `pool16`, `pool16b`, and `pool16c` and one Opus review (`native/review-worker.md`, FAIL, then repaired).
  - `WorkerOptions.pool` refuses any value that can carry `capacity`.
  - The idle-loss strike case fails on pool 0.0.15.
  - Until the release visit re-pins worker to `^0.0.16`, a fresh install takes pool 0.0.14 and that case fails.
- **Probe:**
  - Unit `eager-probe2` stopped on L-3, because a retained survivor refuses for the life of the pool. Unit `eager-probe3` stopped on L-3's failed-warm branch, where `create` retains nothing. The Orchestrator re-ruled and extended L-3 in `eager/probe-design.md`.
  - Unit `eager-probe4` (report probe `tmp/codex/eager-probe4-last.md`) committed U1 `0437a29`, U2 `65ed2df`, and U3 `08ca166` on probe `main`, unpushed.
    - Format, lint, check, and build pass; server and bin cases pass.
    - The idle-loss case shows three spawns on pool 0.0.15 and two on 0.0.16.
    - Both survivor branches are implemented and NOT-EVIDENCED (the fixture cannot make a child outlive a kill).
    - `npm test` failed one core audit case: `MCPError` in the handshake. The Orchestrator ruled a named factory plus an explicit audit exception. Running: unit `eager-probe-audit`.
  - Unit `eager-probe-audit` committed `058a946`: `createHandshakeError` builds the handshake's `MCPError`, and the audit names that factory as its sole exception. Source suite: 263 passed, 12 skipped. Guide parity waits for U5, which must also document `createHandshakeError`.
  - Then U4 readings (after `contexts-c1svc4` finishes its service runs, for a quiet host; M-E uses `claude -p --mcp-config` as browse's U11 did, the user's choice of 2026-10-04), U5 docs, U6 Opus review, and U7 gates (`eager/probe-design.md`, § Units). Push probe after U7.
- **C3 landed:** browser `main` `b1b1c8f`, fast-forwarded and pushed 2026-10-05, ahead of the uncommitted C1 follow-up, whose files do not overlap.
  - The Opus writer worked in a worktree with no shell, so the Orchestrator ran its validation: guides 251 passed and policy 119 passed.
  - Its hung-renderer guide assertion fails when a failed call counts as a browser loss (a mutation in `BrowserMCPServer.ts`, restored), and passes restored.
  - ROADMAP item 14 holds the M2 confirmation.
  - The worktree and branch are removed. It builds against pool `main` `1f194d7`, installed in browser `node_modules` with `npm install --no-save` from pool `tmp/pack/pool-main-1f194d7.tgz`; `package.json` keeps `^0.0.15` until the release re-pins 0.0.16, and an `npm ci` in the browser checkout restores 0.0.15 and breaks the C1 build until then.
- Pool ROADMAP item 1 (a waiter waits while a release could return capacity above floor 1) names the contexts consumer at `BROWSE_POOL` greater than 1 as its trigger; the default size 1 never reaches it, and the analyst's proposal (§ 7) argues the opposite rule for browse (terminal unavailability rather than waiting on another holder). Rule it before the release, not inside C1.
- Units in order (`contexts-synthesis.md` § Units): M1 feasibility and sizing (extend browser `tmp/probes/contexts/`, whose first run `run-swgN81` and report are the pilot), P1 pool shared leases (pool 0.0.16), C1 contexts in browse, C2 real-Chromium proofs, C3 guide and roadmap, M2 confirmation, release (pool 0.0.16, browser, scaffold re-pin).

## Evidence and instruments

- H6 instrument: browser `tmp/probes/holders/` (`node tmp/probes/holders/main.ts [--control] [--load] --sizes 1,2,3 --count 5`); runs `run-9IesXQ` (quiet), `run-7fAPBz` (loaded); readings in `readings.md`.
- Contexts probe: browser `tmp/probes/contexts/` (`report.md`, `run-swgN81/record.json`).
- Duration census: browser `tmp/probes/test-census.ts --label NAME` (before and after summaries under `tmp/probes/census/`).
- Unit briefs and reports: browser `tmp/codex/*-brief.md` and `*-last.md` (holders-h1 to h6b, item6 to item8, gone, keepalive, service-flakes, replay-race, test-tune, contexts-probe).

## Open, in order (2026-10-06)

**The user (2026-10-06): proceed with what's left.**
- Workflow `remaining-items-analysis` finished; records in `lifecycle/remaining/` (three analyses and the attack).
  - **Probe:** 11 of the 12 loaded failures come from quiet-host test budgets; the twelfth misreads its handshake frame.
  - **mcp item 14:** inject the clock (the existing `clock` seam pattern and `createManualClock`).
  - **mcp item 13:** answer a legacy pre-initialize `ping` without a session. The Orchestrator ruled to admit only that request and to record the departure from the transport page's 400 recommendation in the guide.
- Running in parallel:
  - unit `load-cases` (probe `tmp/codex/load-cases-brief.md`): the handshake diagnostic, the event-wait fixes, and the derived budgets;
  - unit `items13-14` (mcp `tmp/codex/items13-14-brief.md`).
- The ollama store campaign resumes last, on a quiet host.
- **mcp:**
  - `items13-14` committed `c98d82f` (item 14: `MCPInputOptions.clock`; the expiry reads use it; the cases run on `createManualClock`) and `8f743a8` (item 13: `isPingRequest`; a headerless legacy `ping` passes the session middleware while initialization is pending; the guide records the departure). `ROADMAP.md` item 15 covers 404 versus 400.
  - Gates green: source 1537, guides 202, conformance 47, integration 4.
  - The Opus review (`remaining/review-mcp.md`) ruled FAIL on two test gaps, and `items13-14fix` repaired them (`51b4d0a`):
    - the expiry cases start their manual clock at `2 * Date.now()`, with added admission and pre-seal cases, so each of the six expiry reads goes red when reverted to `Date.now()`;
    - the guard pins a wrong `jsonrpc`, array `params`, and a batch;
    - the `clock` TSDoc states the trust;
    - source 1539, guides 202, check passed.
  - mcp ROADMAP item 16 (`44a8002`) records the stdio client transport cases' fixed `waitForDelay(300)` waits: 5 failed under the probe unit's load and passed alone.
  - **mcp `main` pushed** (`c98d82f`, `8f743a8`, `51b4d0a`, `44a8002`). **mcp 0.0.37 published** on 2026-10-06 at `9e374f2` (`.orkestrel/release.md` § 2026-10-06 round).
- **Probe:** `load-cases2` committed `adea0d3`, and **probe `main` is pushed** (`482666c`, `adea0d3`).
  - P2 to P12 derive their budgets from the lifecycle bounds, with the formulas in comments, and their waits are bounded events; P10 awaits the public refusal.
  - Each negative control fails 1 case. The quiet whole `npm run test` passed in 554.7 s.
  - Under the declared load, the 12 targeted cases pass. The full loaded suite failed 3, each on a named product refusal and none on a Vitest timeout:
    - P1: `The Oxlint language server exited with code 0` during onset, under 85% synthetic load only;
    - P5: its 3 s type warm, by design;
    - an unchanged workspace-snapshot case.
  - Follow-up, unscheduled: why Oxlint exits with code 0 during initialize under extreme load.
- **The ollama store campaign resumed** on 2026-10-06 near 08:06 local, through `scaffold/tmp/codex/codex.resume.ts`.
  - It runs the same Codex session (`01a10821-2df6-71d2-a0ef-7c7e1a4db929`) with the pause note's prompt plus the Orchestrator's notes (ollama `tmp/codex/store-campaign-resume-prompt.md`). The notes say: the arms stay at `3924fbb`, and check whether Edge sync at that build could affect S2 or S3 readings.
  - Journal: ollama `tmp/codex/store-campaign-resume.jsonl`. Cap 12 hours. No other unit runs on the host until it ends.
  - **Stopped under the preregistration's identity rule** after 12.5 minutes (report ollama `tmp/codex/store-campaign-resume-last.md`). The daemon reads Ollama 0.35.1, against the registered 0.35.0; the Orchestrator read `/api/version` and confirmed 0.35.1. The model digest is unchanged.
  - Kept candidates: none. S1 (paging fixture) was reverted by its fact-exposure guards at n=16. S2 (task after the seeded view) was reverted at closure without a final ruling. S3 to S6 and acceptance never ran. The discarded S2 run 9 is archived outside the counts.
  - Edge sync: the arms launch Edge without `--disable-sync` or `msImplicitSignin`, and every store attempt runs in an isolated CDP context. The archives record no executable, sync, or network diagnostics, so sync effects on S2 cannot be excluded.
  - Branch heads kept, worktrees removed: browser and agent `store-reliability` carry no campaign commits; ollama `store-reliability` is at `2529bb2`. Ollama `main` is unchanged: 3 unpushed commits plus the uncommitted 0.0.21 version bump.
  - **The user's ruling (2026-10-06):** release ollama 0.0.21 re-pinned to browser `^0.0.26`, then run a fresh campaign on Ollama 0.35.1 and browser 0.0.26 with S0 from run 1. The user holds Ollama's auto-update for the series. Publish mcp 0.0.37 in the same round.
  - Release visits run one at a time: mcp first, then ollama.
  - **Ollama's visit failed `test:service`** on the shipping and paging store cases (scaffold `tmp/units/layer-ollama.log`). Every other gate passed, 73 of 75 service cases among them. The build equals 0.0.20; only the agent range moved, to `^0.0.26`.
    - Paging has passed in none of 17 runs since `90901da` (attempt 2's S0 and this visit), against 3 of 8 at `b4a18c3`. The bases also differ in browser build.
  - **The user ruled (2026-10-06): hold ollama 0.0.21 until campaign 3's acceptance series passes.** Its release head `58c08d8` (re-pin plus overwrite) stays local and unpushed. Campaign 3 launches on it.
  - Unit `store-campaign3` (ollama `tmp/codex/store-campaign3-brief.md`) launched on `58c08d8` on 2026-10-06, with a 24-hour cap. Its journal is ollama `tmp/codex/store-campaign3.jsonl`.
    - Two Opus reviews of the brief (preregistration integrity and operations) ruled FAIL. Every finding was repaired before launch:
      - every arm runs as registered, S1 included;
      - the in-run capture identifies the campaign Edge by its command line;
      - attempt 3's scripts take collision-free `store-campaign3-` names;
      - the 2026-10-04 rulings bind;
      - the paging reading goes only into the report.
    - Both attempt-2 candidates apply to `58c08d8` (`git merge-tree`, no conflict).
    - A run whose campaign Edge lacks either disable stops the series.
  - **Check, 2026-10-06 near 10:15 local** (scaffold `tmp/units/campaign3-status.ts`, `transcript-diff.ts`, `codex-tail.ts`):
    - S0 completed 8 runs; S1 is on run 6. Each run takes about 5 minutes. The daemon read 0.35.1 throughout, and no stop fired.
    - In every completed run, the Edge capture identified the campaign browser (Edge 154.0.4258.53, headless) carrying `--disable-sync` and `--disable-features=msImplicitSignin`. The sampler polls every 2 s and costs about 20% of one core, the same in every arm.
    - **The baseline moved.** In S0, shipping passed 0 of 8 runs (attempt 2: 13 of 16) and search 4 of 8 (13 of 16). Click and checkout passed 8 of 8, and paging 0 of 8.
      - 23 of 24 shipping attempts repeat `look` searches and never call `read` (F-1, S3's target class).
      - The system text, the page view, and the task are byte-identical to attempt 2's after masking ports and ids. The model's first reply differs: 0.35.0 wrote prose and called `look` with `shipping`; 0.35.1 writes nothing and calls `look` with `shipping cutoff time`.
      - Two input changes confound the cause. The daemon moved to 0.35.1, and browser 0.0.26's journey toolset adds `capture` and shortens the `edit` description (browser `192a9ee`, 2026-10-04). Ollama's harness enables journeys, so the model sees both.
    - **Orphaned Edge processes:** about 166 crash-handler and utility processes from earlier test launches remain, about 2.6 GB of working set. Their browser processes are gone. Most come from browser's `tests/setupGlobal.ts:174` profile (`orkestrel-browser-global-*`); the rest come from library-profile launches. The newest is from 2026-10-05 21:09, and the campaign's runs left none.
  - **The user ruled (2026-10-06): all three recommendations.**
    - Let campaign 3 run.
    - When it ends, terminate the orphans: `node tmp/units/edge-orphans.ts --kill` from scaffold, after a dry run.
      - The script lists only `msedge.exe` helpers that have an `orkestrel-browser-` profile, a `--type=` switch, and a dead parent. Its dry run listed exactly the 166.
    - Then launch unit `toolset-probe` (ollama `tmp/codex/toolset-probe-brief.md`).
      - It measures the first reply on 0.35.1 under four toolset arms: attempt 3's definitions, without `capture`, attempt 2's with `capture`, and attempt 2's. That separates the toolset from the daemon.
      - When a toolset change is named, it runs full shipping and search attempts without that change.
  - Unscheduled follow-up: why Edge helpers outlive their browser on Windows after a test launch's teardown (browser `tests/setupGlobal.ts:174` and library-profile launches through 2026-10-05).
  - **The user ruled (2026-10-06 near 11:15): 24 hours is too long.** Stop, run the probe, then a lean rerun. The rerun runs without journey, 8 runs per arm with no extensions, S3 to S5, then acceptance, in about 4 to 5 hours in total.
    - **Campaign 3 stopped** near 11:20 by a process-tree kill. The interrupted S1 run 15 sits outside the counts in attempt-3 `discarded-stop/`. No ruling was taken. Pass counts:

      | Arm | Runs | Shipping | Click | Search | Checkout | Paging | Journey |
      | --- | --- | --- | --- | --- | --- | --- | --- |
      | S0 | 16 | 0 | 16 | 12 | 16 | 0 | 4 |
      | S1 | 14 | 1 | 14 | 12 | 14 | 0 | 3 |

    - S1's first look at 8 runs: paging F-15 fell from 5 of 8 to 0 of 8 (p = 0.013 against 0.0042), so its registered extension ran until the stop.
    - The attempt-3 worktrees are removed. Each repository keeps its `store-reliability-3` branch: ollama `c486c53` carries the S1 cherry-pick, and browser and agent sit at their bases.
    - The 166 orphaned Edge helpers are terminated (`edge-orphans.ts --kill`: 166 terminated, 0 failed), and a recount finds 0.
    - **Unit `toolset-probe` launched**, with a cap of 90 minutes (ollama `tmp/codex/toolset-probe-brief.md`, journal `tmp/codex/toolset-probe.jsonl`).
    - The lean rerun's brief follows the probe's ruling.
  - **The toolset probe ruled: the toolset causes the divergence** (45 minutes; ollama `tmp/codex/toolset-probe-last.md`, evidence under `tmp/codex/toolset-probe/`).
    - On Ollama 0.35.1, attempt 2's definitions reproduced attempt 2's archived first replies exactly in 40 of 40 literal replays, across all five page tasks.
    - Full runs with attempt 2's definitions on 0.35.1: shipping passed 14 of 16 (campaign 3's S0: 0 of 16) and search 14 of 16 (12 of 16).
    - Both browser edits are needed. Removing `capture` alone does not restore the archived reply, and neither does restoring the older `edit` description alone. Together they do.
    - The first reply is repeatable for fixed input bytes, yet a different loopback port in the seed changes it. This model's tool choice at temperature 0 is sensitive to input bytes that carry no meaning for the task.
    - The daemon upgrade is not needed to produce the divergence. Whether it contributes to other outcomes is not established.
  - **The user ruled (2026-10-06): lean rerun on browser 0.0.26 as shipped.**
  - **Unit `store-campaign4` launched** near 12:50 local, capped at 4.5 hours (ollama `tmp/codex/store-campaign4-brief.md`, journal `tmp/codex/store-campaign4.jsonl`).
    - An Opus review of the first draft ruled FAIL, and every repair is in the launched brief:
      - the classifier ignores the skipped journey;
      - S0's 16 runs are reclassified into `attempt-4/` and checked against campaign 3's 8;
      - Fisher compares 16 against 8;
      - there is no `extend` outcome, and guards are rates;
      - the registered guards, including F-2;
      - a cap-safe acceptance start;
      - the preregistration's arm labels;
      - an identity check against S0's hashes.
    - The Orchestrator ruled two further items:
      - S4 gets a paging F-15 guard, because it runs without rank 3;
      - an arm whose test cannot settle even at 0 of 8 is skipped and recorded.
    - The design:
      - Control: campaign 3's S0.
      - Arms: S3, S4, and S5, at 8 runs of the store tasks only, one look, alpha 0.05/3 each.
      - Acceptance runs only after an arm passes every page task in all 8 runs.
  - **Campaign 4 finished** in 87 minutes, uncapped, and kept no candidate (ollama `tmp/codex/store-campaign4-last.md`, records under `attempt-4/`).
    - S0's 16-run reclassification reproduced campaign 3's 8 classified runs exactly, and every identity hash matched.
    - **S3 (rank 1):** target F-1 stayed in 8 of 8 runs (control 16 of 16, p = 1). Search fell from 12/16 to 3/8, and it was reverted (browser `76b6130`).
    - **S4 (rank 2):** target F-14 stayed in 8 of 8 (control 14/16). Shipping moved from F-1 to F-2 in 8 of 8, click fell to 6/8, and search to 1/8, and it was reverted (browser `322fcd0`, ollama `2fd1082`).
    - **S5:** skipped. Its target appears in 1 of 16 control runs, so p(0/8) = 0.667.
    - **Acceptance:** skipped. S0 passed every page task in none of its 16 runs. Its one-sided 95% lower pass bounds are shipping 0%, click 82.9%, search 51.6%, checkout 82.9%, and paging 0%.
    - Nothing was pushed. Every worktree was removed, and each `store-reliability-4` branch keeps its reverts.
  - Under the standing constraints, acceptance is out of reach: the same model, no budget or oracle change, and browser 0.0.26's copy. The local daemon also holds `hf.co/sky7350/Mica-v0.1-4B` and `qwen3.8:latest` (27.3B, 16.5 GiB), and the registry serves `qwen3.5:4b-q4_K_M` at 3.10 GiB (read 2026-10-06).
  - **The user ruled (2026-10-06): try qwen3.5 4B.** The ruling approves the download.
    - Measure the store tasks 8 times on browser 0.0.26, unchanged.
    - If every page task passes in all 8 runs, run the 29-run acceptance with it and propose moving the live cases to it. Otherwise stop and report.
    - The download is pulled through `ollama pull`. The harness takes the model from `OLLAMA_MODEL` (ollama `tests/setupService.ts:13`), so the unit changes no code.
    - Pulled `qwen3.5:4b-q4_K_M` (digest `d8b0f5e9760c…`, 3.1 GiB). The daemon stays 0.35.1.
    - Unit `store-model4b` launched near 14:35 local (ollama `tmp/codex/store-model4b-brief.md`, journal `tmp/codex/store-model4b.jsonl`), with a cap of 4.5 hours.
  - **The user (2026-10-06):** "a model as small as the 2b" must run these tests; if the 4B cannot do them all without an issue, the cause lies deeper in the implementation. The tests must also be tuned for time.
    - `store-model4b` was stopped during setup. Its records are in `model-4b-stopped-setup/`.
    - Unit `model4b` relaunched it as a quick answer: stop at the first failed run, at most 8 runs, no acceptance, a 75-minute cap.
  - **4B answer** (ollama `tmp/codex/model4b-last.md`): it completed 1 run and failed 3 of the 5 page tasks.
    - Shipping passed in 36 s, and cart passed.
    - **Search and checkout:** both answered correctly, but an unsolicited `record` journey call returned 4,087 and 4,086 characters. That breaks `BROWSER_TOOL_LIMIT` (4,000), which the shared assertion requires of every result (ollama `tests/service/browser.test.ts:130`, `tests/setupStore.ts:1411`). **This is a browser library defect.**
    - **Paging:** it answered the token correctly through search, without the `read` continuation the case pins.
    - **Checkout:** it clicked Place order after `type` had already submitted, ignoring the instruction to wait, which created 2 orders per attempt.
  - **Workflow `store-implementation-investigation` launched** (run `wf_8a2ad37c-d95`), with the 2B as the target.
    - Map: Grok lanes for the surface, the harness and time, and the transcripts, plus Opus external research.
    - Design: three Opus designers, one each for the surface, the harness and oracles, and the economics.
    - Then an Opus synthesis and an Opus review.
  - **Investigation finished** (44 minutes; outputs in `lifecycle/store-design/`).
    - The Grok map lanes returned briefs, not distillates, because the workflow's `grok` driver had no shell. The designers and the synthesis read the sources themselves.
    - **The plan** (`store-design/synthesize.md`) separates three kinds of cause:
      - **Library defects:**
        - L2: journey results are unbounded;
        - L1: a `look` search reaches only referenced elements, never page text;
        - L3: the agent JSON-encodes string tool results.
      - **Harness and oracle defects:**
        - H1: page tasks advertise 7 unneeded journey tools;
        - H2: paging seeds a `look` view yet counts only `read` footers, and its token line shares search words with the prompt;
        - H3: search retries on a weaker predicate than it asserts;
        - H4: an unread meter costs about 6 s per attempt;
        - H5: checkout accepts a double order that the journey oracle depends on.
      - **Surface:** the model follows the last footer, not the system prompt.
    - **Ranked changes:**
      1. ollama: page tasks advertise only page tools.
      2. ollama: paging seeds with `read`, the oracle counts the seed's footer, and the token section shares no search word.
      3. ollama: the search predicate equals its assertion.
      4. ollama: drop the unread meter.
      5. browser: bound every journey result.
      6. browser: `look` and `read` searches reach page text and carry a matched heading's section.
      7. agent: string tool results reach the model unchanged.
      - Deferred: the checkout single order (R1).
    - **Experiments:** E1 to E5, about an hour of daemon time.
    - **Per-case budgets:** the five store tasks at 75 s or less in total, against 173.5 s.
  - **The review ruled FAIL** (`store-design/review.md`):
    1. The guards cannot detect a material fall at the planned counts. They need preregistered non-inferiority margins.
    2. Change 2 widens the paging oracle and needs the user's ruling.
    3. `secret` stays on `type` without journeys.
    4. The section carry cannot work for `plain`.
    5. Change 5 must slice the view to the room left after the prefix, so its footer offset stays exact.
    - Findings 6 to 11 are low: wording, decision rules for every count, the `vitest list` scope, the time budget (shipping turns take about 5.5 s, and the warmup reloads at 16,384), and a `read` seed lists no references.
    - Outside its claims: change 7 reaches every live tool test, and the 2B's F-21 journey calls caused no 2B failure.
  - **The user ruled (2026-10-06): unify the reading surface.** Fold `look`, `read`, and `plain` into one line-addressed read: numbered lines with references inline, from and to ranges with a bounded default, and a grep-style search.
    - All three library changes go in, the double-order trio goes in this round, and confirmation is 16 runs.
    - **Campaign opened:** `lifecycle/reading/campaign.md`, with the exit criterion.
    - **Absorb running:**
      - map: `tmp/units/reading-map.txt`;
      - Grok lane `reading-absorb` (scaffold `tmp/cursor/`), on the internals and the prior reading design under `showcase/browse/reading-design/`;
      - research lane on line-addressed reading in coding and browser harnesses.
    - **Consumers:** only ollama's harness consumes the toolset in code. Six repositories carry the guide as a mirror.
  - **The user's principle (2026-10-06): fewer, more capable tools.** Each tool covers one intent and completes its own flow, and options are preferred over extra tools. It is recorded in `reading/campaign.md`, and the design brief widens to the whole page vocabulary, with the journey tools as a proposal.
  - **Absorb done:**
    - `reading/research.md`: SWE-agent's 100-line window beat 30 lines and the whole file; capped search with a narrow-it fallback; continuation by line, never by character position.
    - `reading/absorb.md`: Grok 4.7, 450 s, session `e78524be`.
      - The prior design never weighed a numbered-line tool.
      - `look` is the accessibility outline with references, while `read` and `plain` are Markdown and text projections of one inert HTML capture, with no references.
  - The Workflow and Agent `grok` driver has no shell here, so the Orchestrator drove the Cursor bench directly. This is recorded in memory.
  - **Design round launched,** blind lanes on `reading/design-brief.md`:
    - Astra `reading-analyst`, effort xhigh, cap 3600 s (scaffold `tmp/codex/reading-analyst*`);
    - Opus `planner`, native.
  - **Design round done:** `reading/proposal-planner.md` and `reading/proposal-analyst.md`, reconciled into `reading/plan.md`.
    - The page vocabulary falls from 11 tools to 8: `read`, `click`, `type`, `press`, `navigate`, `wait`, `dialog`, and `switch`.
    - The plan's table rules on each difference between the lanes.
    - Units: R1 to R5 for browser in series, A1 for the agent in parallel, O1 and O2 for ollama, then F (falsify), V (gates), M (measurement), and P (releases).
    - Waiting on the user before R1.
  - **The user approved the plan (2026-10-06).**
  - **Implementation running:**
    - **`reading-browser`** (browser `tmp/codex/reading-browser-brief.md`): Astra, effort high, cap 4 h.
      - The browser units R1 to R4 run as one unit, because one breaking change cannot compile in parts.
      - It owns `src/**` and `tests/**`; the guide is left for R5 (Opus).
    - **`reading-agent`** (agent `tmp/codex/reading-agent-brief.md`): Astra, effort high, cap 1 h, in parallel.
  - **A1 landed:** agent `65c706a`, pushed, unreleased.
    - A string tool result reaches the model unchanged.
    - The new cases went from 2 failed to 134 passed. `test:src:core` 766, check, guides, and lint pass.
    - Sweep: no reader decodes tool content.
    - **mcp follow-up at its agent re-pin:** `mcp/tests/distribution.test.ts:1596` and `:1732` expect `['"receipt-1"']`, which becomes `['receipt-1']`.
  - **`reading-browser` stopped after 12 minutes under its deviation contract** (browser `tmp/codex/reading-browser-last.md`).
    - The cause: Chromium's accessibility tree shows a password input as a `textbox` whose value is the mask `••••••`, indistinguishable from a text field holding bullets, and no captured source discriminates the two.
    - It left a draft over 7 files; the copy measures 6,037 and 3,360, within bounds.
  - **The Orchestrator ruled:** print the accessibility value (the mask, never the secret, as `look` in 0.0.26 did), drop the duplicate text line, and keep every `secret` redaction, pinned by a test.
    - The unit's provisional choices are accepted: 800-unit wrap, `↳` hard-token marker, header and tabs caps, context never crossing `from`, and heading levels clamped to 6.
    - Its fixed receipt reserve and its required journey `search` are refused.
    - The plan is amended.
  - **The same Codex session resumed** (session `01a112f5`, scaffold `tmp/codex/codex.resume.ts`, cap 4 h).
  - **The resume stopped after 17 minutes under the no-mock rule** (browser `tmp/codex/reading-browser-resume-last.md`, report `tmp/codex/reading-browser-report.md`).
    - The cause: the existing submission tests run the compiler inside the handwritten `BrowserSubmitWindow` (browser `tests/setup.ts:1284`), which lacks the DOM query API and the mutation observation the new observer needs.
    - Done and tested:
      - password masks, the duplicate-value drop, and `secret` redaction;
      - windows, exact continuation, search past the first window, the change note, and refusals;
      - the journey bound, 7,729 characters before the fix and green after;
      - copy at 6,035 and 3,358.
    - Open: 142 core assertions to migrate, 7 stale test accesses, the settle proofs, and DOM parity.
  - **The Orchestrator ruled:**
    - move the submission and settle proofs to real pages and delete the fake;
    - the same applies to any substitute the new behavior outgrows;
    - the deviation contract narrows to a plan rule or the whole-result bound.
    - Resumed as unit `reading-browser-2` on the same session (cap 4 h).
  - **R1 to R4 complete** (browser `tmp/codex/reading-browser-report.md`, 46 minutes).
    - Results:

      | Gate | Result |
      | --- | --- |
      | core | 1,140 |
      | browser placement | 478 + 1 skipped |
      | service (toolset, document, journey, browse) | 189 + 6 skipped |
      | server | 392 + 10 skipped |
      | distribution (default mode) | 14 + 9 skipped |
      | `check`, lint, format, build | pass |

    - Journey bound: 7,729 characters before the fix, green after.
    - Copy: 6,024 and 3,347.
    - The `BrowserSubmitWindow` fake was deleted, and the submission proofs run on real Chromium pages.
    - The guide check fails 10 of 251; R5 owns that drift.
    - **Committed locally as browser `9b7a06f`, unpushed** until the guide is green.
  - Packs built by the Orchestrator into ollama `tmp/codex/store-campaign5/packs/`: browser `31D1D891…` from `9b7a06f`, and agent `17F8A491…` from `65c706a`.
  - **Running in parallel:**
    - **`reading-guide`** (browser `tmp/codex/reading-guide-brief.md`): Astra, cap 2 h. It is routed to Astra rather than Opus because guide parity needs a shell to iterate; Opus reviews the guide's voice in the falsify round.
    - **`reading-harness`** (ollama `tmp/codex/reading-harness-brief.md`): Astra, cap 3 h, covering O1 and O2.
  - **R5 landed:** browser `74ba389`, pushed. `test:guides` went from 10 failed to 255 passed; its `src` changes are doc comments only. Browser `main` is pushed at `74ba389`, unreleased.
  - **Falsify claims drafted:** scaffold `tmp/units/reading-claims.md`, 17 claims on browser and agent, with the harness claims added when it lands. Both lanes are Opus, because Astra wrote all the code: one objective, one subjective.
  - **O1 and O2 landed:** ollama `e8f29f1`, local, on top of the held release head. Report: ollama `tmp/codex/reading-harness-report.md`.
    - setup 238 + 1 skipped; check and lint pass; each instrument wrote one validation row.
    - Positions:
      - shipping fact on line 52, past the seed's 1–46;
      - paging token on line 80, past the seed's 1–34 and the next window's 35–63.
    - Validation row: the 2B's first call was `read({ from: 47, search: "shipping cutoff time" })`, and its single shipping attempt passed in 4.4 s.
  - **Falsify round running:** workflow `reading-falsify` (run `wf_479b08ad-2cf`), with an objective and a subjective Opus lane on 21 claims.
    - Claim 19 asks whether the paging predicate's refusal of any non-empty `search` narrows the claim.
  - **The falsify round ruled FAIL:** objective FAIL on 15 claims plus F1 and F2; subjective FAIL on 6 plus F1 to F4.
    - Rulings: `reading/audit-verdict.md`. Lane reports: `reading/falsify/`.
    - The Orchestrator reproduced the role-word span, the whitespace secret, and the unchanged journey call allowance.
    - **Browser fix round** `reading-browser-3`: the resumed browser session, cap 4 h, items B-fix 1 to 14. Each item gets a failing test first and a mutation.
    - Then the **harness fix:**
      - paging accepts a non-matching `search`, and "earlier" means any read under the same page until an action or a change note;
      - `productive` matches the singular `1 line matches`;
      - M1 runs the page arm only, with interleaved rows that carry their arm;
      - stale fixtures are fixed;
      - positions are re-pinned on the fixed pack.
    - The plan's `read.search` copy is amended.
  - **The user (2026-10-06): improve browser's API from the ecosystem's patterns,** naming agent, database, relation, table, workspace, workflow, and form (scaffold `guides/`) as examples. It is recorded in `reading/campaign.md`, and the design goes to the user before implementation.
    - **Census:** browser `src/core` exports 557 symbols: 181 functions, 203 interfaces, 52 classes, 67 constants, and 54 types.
    - **The browser fix round landed:** browser `51cf268`, pushed.
      - All 14 items fixed, each with a failing test first; all 17 reverting mutations caught.
      - Results:

        | Gate | Result |
        | --- | --- |
        | core | 1,145 |
        | browser placement | 478 |
        | service (toolset, document, journey, browse) | 204 |
        | server | 392 |
        | guides | 258 |
        | check, lint, format, build | pass |

      - Copy 6,041 and 3,360, both bounds unmoved.
      - A 0.0.26 journey file loads and replays.
      - Capturing a 5,000-paragraph outline takes a median of 917 ms.
      - It closes by mutation, under the skill's rule for fixes that adopt the prescription.
    - **Grok session A, slice 1** (`reading/api/patterns-1.md`, session `5ffd96d4`) covers entities, managers, and vocabulary across agent, database, relation, table, workspace, workflow, form, and tool. Slice 2, on surface hygiene, is running.
    - **Absorb done:**
      - `api/patterns-2.md`: surface hygiene;
      - `api/browser-1.md`: Grok session `09c1dfdb`, browser's entities and a deviations table;
      - `api/consumers.md` with `api/browser-usage.json`: 721 export declarations, and only ollama's tests import the API in code.
    - **Design round launched,** blind lanes on `api/design-brief.md`:
      - Astra `api-analyst`, effort xhigh, cap 1 h (scaffold `tmp/codex/api-analyst*`);
      - Opus `planner`, native.
    - **Design round done:** `api/proposal-planner.md` and `api/proposal-analyst.md`, reconciled into `api/plan.md`.
    - **The user approved it (2026-10-06):**
      - E: bare error codes;
      - B: reuse `@orkestrel/codec`, a dependency the user approved explicitly.
    - The Orchestrator rerouted the contract types to Astra, as vertical slices that each end green:
      1. errors;
      2. construction and the toolset;
      3. plumbing, the recorder, the managers, and the stores;
      4. hygiene, with codec;
      5. the guide.
    - **Unit `api-impl`** (browser `tmp/codex/api-impl-brief.md`, cap 3 h per launch) runs slice 1, errors. Each later slice resumes the same session, and the Orchestrator commits each green slice.
    - **Slice 1 landed locally:** browser `8f5e6f4`, unpushed, with the push held until slice 5 greens the guide.
      - 486 construction sites migrated, and 181 catch-all sites mapped (browser `tmp/codex/api-catchall-final.json`).
      - The page tools, copy, and reading code are unchanged, per an audit script.
      - Results:

        | Gate | Result |
        | --- | --- |
        | core | 1,145 |
        | browser | 478 |
        | server | 389 |
        | service | 248 |
        | setup | 180 |
        | bin | 19 |
        | distribution | 14 |
        | check, lint, format | pass |

      - Guide drift: 6 checks, reserved for slice 5.
      - Session `01a113b2`. Slice 2 resumed (journal `tmp/codex/api-impl-resume.jsonl`).
    - **Slice 2 landed locally:** browser `2d0ad52`, unpushed.
      - `createBrowserContext`;
      - seven owner-built classes made internal;
      - `createWebSocketCDPTransport` and `createFileBrowserWriter`;
      - one `createBrowserToolset(view)` with `isBrowserPage`, and `createDocumentToolset` gone;
      - `execute`, with `notes` off the contract;
      - the MCP option groups;
      - one `engine`;
      - `BrowserNavigationCondition`.
      - Results:

        | Gate | Result |
        | --- | --- |
        | core | 1,149 |
        | browser | 478 |
        | server | 389 |
        | service | 250 |
        | setup | 180 |
        | conformance | 69 |
        | bin | 19 |
        | distribution | 14 |

      - Guide drift: 10 checks.
    - **Slice 3 resumed** (browser `tmp/codex/api-impl-3-resume*`).
    - **Slice 3 landed locally:** browser `c5b1cb1`, unpushed.
      - plumbing off the contracts, with emulation ordering pinned;
      - `page.recorder`;
      - `routes` and `apply`;
      - the cookie, storage, clock, HAR, worker, and handle vocabulary;
      - `depth` and `breadth`;
      - `listed` and `found`;
      - atomic `{ revision, exclusive }` journey writes;
      - `BrowserStorePageOptions`;
      - run store `create` and `write`.
      - Results:

        | Gate | Result |
        | --- | --- |
        | core | 1,159 |
        | browser | 478 |
        | server | 393 |
        | service | 250 |
        | setup | 181 |
        | bin | 19 |
        | distribution | 14 |

      - Guide drift: 38 checks.
    - **`@orkestrel/codec ^0.0.5` installed** in browser by the Orchestrator, per user ruling B. The manifest is uncommitted and rides with slice 4.
    - **Slice 4 resumed** (browser `tmp/codex/api-impl-4-resume*`). The unit also rules on the helper names added in the series, `assertBrowserPage` and `validateBrowserJourneyWriteOptions`.
    - **Slice 4 landed locally:** browser `89a9776`, unpushed, with the codec dependency.
      - dead search and byte wrappers removed;
      - codec's refusals coded `PROTOCOL` and `ARGUMENT`;
      - `findSystemBrowser` removed;
      - 14 private shapes inlined;
      - policy clean;
      - both helper names kept, because each throws on refusal.
      - Results:

        | Gate | Result |
        | --- | --- |
        | core | 1,161 |
        | browser | 478 |
        | server | 393 |
        | service | 204 |
        | setup | 181 |
        | bin | 19 |
        | distribution | 14 |
        | policy | 119 |

      - Guide drift: 39 checks.
    - **Slice 5, the guide, resumed** (browser `tmp/codex/api-impl-5-resume*`).
    - **API falsify claims drafted:** scaffold `tmp/units/api-claims.md`, 12 claims.
    - **Slice 5 landed:** browser `ae1c9a1`.
      - The entity-led guide, with the tagline and README equal.
      - `test:guides` 269 passed; 670 exports documented; 55 method tables match; 9 fences execute from the Markdown.
      - **Browser `main` pushed at `ae1c9a1`**, with all five API slices. Unreleased.
      - Observation: the browse renderer-crash recovery case failed once beside a concurrent discovery scan, and passed alone and on a rerun. It is carried into the audit's claim 1.
    - **Packs** (ollama `tmp/codex/store-campaign5/packs-api/`): browser `AC3A5B97…` from `ae1c9a1` (superseded), and agent `17F8A491…` from `65c706a`.
    - **Running in parallel:**
      - the API falsify workflow `api-falsify` (run `wf_92b6692e-f17`), with two Opus lanes;
      - unit `harness-fix` (ollama `tmp/codex/harness-fix-brief.md`): the reading audit's harness items (H1 paging, H2 instruments, A6 fixtures), the API migration, and re-pinned positions.
    - **API falsify: both lanes FAIL.** Rulings: `api/audit-verdict.md`. Lane reports: `api/falsify/`.
      - Closed pages fail `isBrowserPage`.
      - The code synonyms collapse to `CLOSED`, `TIMEOUT`, and `ARGUMENT`, with `STORE_*` codes for the shared file store.
      - The manager classes are made internal.
      - Context and isolate options are split.
      - An empty cookie filter is refused.
      - `network.clear()` replaces clearing by `undefined`.
      - The in-process lock race is fixed in code.
      - Renames: `started` → `active`; `buildBrowserHAREntry`; `validateBrowserPageOpen`; `BrowserTraversalOptions`.
      - Stale docs are fixed, and the Surface is reordered entity-first.
      - A crash-flake probe compares 20 runs at `51cf268` with 20 at HEAD.
      - `depth`/`breadth` and `listed`/`found` are kept.
      - **Fix round `api-fix` landed:** browser `b6dda22`, pushed (report: browser `tmp/codex/api-fix-resume-last.md`, appended to `api-impl-report.md`; 73 minutes).
        - Every ruled item is fixed; 60 reverting mutations each fail their tests, one per required guard key.
        - Acceptance passes: check, build, lint, format, guides 274, policy 119, setup 181, core 1,203, browser 478, server 395, service 250, bin 19, distribution 14.
        - The page-tool audit against `51cf268` passes: 8 handlers, their copy, and the reading code are unchanged.
        - **Crash probe:** `51cf268` failed 13/20 and `ae1c9a1` 14/20 beside discovery. The cause was in the test: it crashed `launcher.browsers[0]`, which served the session only in launch order. The case finds its lease by URL and runs in both inventory orders. The unit raised the crash event's wait from 1 s to 5 s after 1/20 lease-only failures; final stress 0/20.
        - **The 5 s wait is kept.** The Orchestrator measured the event latency at `b6dda22`, from the crash request, across 20 invocations with a 30 s budget and discovery beside (`scaffold/tmp/units/crash-latency.ts`; logs in browser `tmp/codex/api-fix-crash-latency/`). All 80 events arrived: median 708 ms, p90 1,050 ms, max 4,428 ms; 2 over 2 s, none over 5 s. The events are late under load, not lost, and a missing event still fails at any budget. The worktree is removed.
        - Advisory: the shared store's `STORE_LOCKED` message still reads "Journey is locked".
    - **Packs rebuilt:** browser `A0A54AAA…` from `b6dda22`; agent unchanged (`17F8A491…`).
    - **Harness fix landed locally:** ollama `b3083aa`, unpushed, on top of the held release head.
      - Each finding red then green.
      - Positions held: fact on line 52, token on line 80.
      - setup 256; check and lint pass.
      - **Recheck on the `b6dda22` pack passed** (ollama `tmp/codex/harness-recheck.log`): setup 255 passed and 1 skipped (`TIMER_LEAD`'s host-conditional case); check, lint, and the instrument typecheck pass; store-first and store-series at count 1 pass (shipping in 4.9 s, 1 call). Ollama's source and tests use none of the renamed or collapsed names; only its browser guide mirror does, refreshed at the re-pin.
    - **Unit `store-measure`** (ollama `tmp/codex/store-measure-brief.md`, report `store-measure-report.md`, records in `tmp/codex/store-campaign5/`; 9 minutes). Twenty orphaned Edge helpers (17:06 to 23:31) were cleared before launch.
      - **V passed:** agent and ollama format, lint, check, build, and test; browser's V is the fix round's acceptance. **M0 passed.**
      - **M1 stopped the series.** Productive first calls on the 2B, out of 8: shipping 8, cart 0, search 0, checkout 0, paging 8. Identities unchanged (Ollama 0.35.1; 2B digest `124a03c3…`). M2 to M5 did not run.
      - **Every cart, search, and checkout first call was a `read` from line 47,** the line the seed's footer names. The seed (ollama `tmp/codex/store-campaign5/M1/seeds/`, from `tmp/probes/store-seed.test.ts`) already shows Checkout `e3` (line 3), the search box `e4` (line 6), and the tray link `e7` (line 11), and it ends `[lines 1–46 of 52; 6 below; call read with from 47 for more]`.
      - **Candidate causes:**
        - the footer's imperative, the last text before the reply;
        - the system prompt's "For more text, follow the footer" sentence;
        - the task placed before the seed.
    - **Unit `store-ablate`** (ollama `tmp/codex/store-ablate-report.md`, records `tmp/codex/store-campaign5/ablate/`; 35 minutes). First replies, 5 tasks × 8 ports per variant, judged against the untransformed seed. Productive first calls out of 8 (shipping, cart, search, checkout, paging):

      | Model, variant | Counts |
      | --- | --- |
      | 2B A0, as shipped | 8, 0, 0, 0, 8 |
      | 2B A1, declarative footer | 6, 1, 0, 1, 5 |
      | 2B A2, no footer sentence in the system prompt | 8, 0, 0, 0, 8 |
      | 2B A3, A1 and A2 | 8, 0, 0, 1, 5 |
      | 2B A4, seed first, task last | 8, 2, 0, 3, 0 |
      | 2B A3 and A4 | 8, 0, 0, 0, 0 |
      | 4B A0 | 8, 0, 8, 8, 0 |

      - **No copy variant fixes the 2B.** Search is 0 of 8 under every variant: the first call is `read` with `search: "kettle"`.
      - **The 4B's cart first call is `click e11` on every port.** The tray is `e7` on line `11`, so the line number is read as the reference.
      - **The 4B answers paging with text and no call.**
      - The 2B's malformed tool-call XML (Ollama HTTP 500) appears under A1, A3, and A3 with A4 on checkout.
    - **Unit `store-ablate-2`** (ollama `tmp/codex/store-ablate-2-report.md`, records `tmp/codex/store-campaign5/ablate-2/`; 59 minutes). Variants:
      - X1: no line numbers;
      - X2: no footer;
      - X3: neither;
      - X4: no read sentences in the system prompt;
      - X5: X3 and X4;
      - X6: `search` renamed `find`.

      Productive first calls out of 8 (shipping, cart, search, checkout, paging):

      | Variant | 2B | 4B |
      | --- | --- | --- |
      | A0 | 8, 0, 0, 0, 8 | 8, 0, 8, 8, 0 |
      | X1 | 1, 0, 0, 4, 8 | 8, 8, 6, 8, 0 |
      | X2 | 0, 1, 0, 5, 0 | 0, 0, 8, 8, 0 |
      | X3 | 0, 0, 0, 0, 7 | 0, 8, 8, 8, 0 |
      | X4 | 8, 0, 0, 0, 8 | 8, 0, 8, 8, 0 |
      | X5 | 0, 4, 0, 2, 0 | 0, 8, 8, 8, 0 |
      | X6 | 8, 0, 0, 0, 8 | 6, 0, 8, 8, 0 |

      - **Line numbers cause the 4B's cart failure:** without them, every first call clicks `e7`.
      - **Both models need the footer to page.** Without it, shipping falls to 0 on both, and the models answer "not mentioned" or invent a time.
      - **The 2B needs the numbers to follow the footer.** Without them, shipping falls to 1 of 8.
      - **The 4B never pages the policy page,** in any variant. It replies "I've reviewed the entire shipping policy page… no policy token", although the view ends at line 34 of 80 with "46 below".
      - **No single factor moves the 2B's search,** and the system prompt's read sentences and the `search` name change nothing on their own.
    - **Old-format comparison** (ollama `tmp/codex/toolset-probe-last.md`): on browser 0.0.26, the 2B also opened the action tasks with a read, `look {"search":"add"}` for cart and `look {"search":"kettle"}` for search, and those tasks still passed (search 14 of 16 runs). So M1's first-call gate would have stopped the old format too. The real difference: `look` searched the whole page, while `read` searches from `from` onward, and the 2B takes `from` from the footer (47), so a search for the tray on line 11 misses it.
    - **Unit `store-m2diag`** (ollama `tmp/codex/store-m2diag-report.md`, records `tmp/codex/store-campaign5/M2diag/`; 18 minutes). Single attempts to completion on the shipped input; passes out of 8 (shipping, cart, search, checkout, paging):
      - **2B:** 8, 0, 0, 0, 8. Each attempt 4 to 12 s.
      - **4B:** 8, 8, 8, 8, 0. Each attempt 10 to 21 s.

      Failure classes:
      - **2B cart, C-loop:** the search from `from` 47 misses the tray on line 11; the model then types into buttons for 8 turns.
      - **2B search, S-answer:** it reads from 47, then answers from the review prose and never types into `e4`. On 0.0.26 its first call was `type e4 kettle submit`, 16 of 16.
      - **2B checkout, O-reference:** it completes the one order and reports `HG-48213`, but clicked `e3` after a window of lines 47 to 52 that listed no references. The harness replaces the exposed set on every listing, empty windows included.
      - **4B paging, P-premature:** no call; it answers that it reviewed the entire page.
      - **4B cart:** passes after a 2-turn detour from `click e11`.
    - **Running: the redesign round** (scaffold `.orkestrel/veneer/lifecycle/reading/redesign/design-brief.md`). An Opus planner (Agent tool) and the Astra analyst `redesign-analyst` (scaffold `tmp/codex/redesign-analyst-brief.md`, xhigh, cap 90 min) work blind. The brief asks seven questions:
      1. the number and reference forms;
      2. the search scope past `from`;
      3. truncation salience;
      4. the footer's pull;
      5. what made 0.0.26's 2B type into `e4`;
      6. reference tracking against the oracle's claim;
      7. probe validation before implementation.

      Next: reconcile both proposals, validate the change set by probe transforms on both models, then take the plan to the user. Numbered lines with inline references are the user's ruling, so any change that leaves it goes to the user.
    - **Both proposals landed:** `redesign/proposal-planner.md` and `redesign/proposal-analyst.md`. The reconciliation is in `redesign/reconcile.md`.
      - **Agreed:**
        - rule R, references accumulate per unchanged page;
        - outside-range matches without moving the window;
        - the footer stays;
        - every line stays numbered, while the bare number beside a bare reference goes;
        - a partial-view header line.
      - **Splits, to be measured:**
        - the line form, `[ref=e7]` after the name or `[line N]` at the end;
        - the partial-view wording;
        - the framing;
        - 2B search, a prompt sentence or control cues and `read` copy;
        - a purpose-qualified footer.
      - **Ruled:**
        - search past `from` quotes the best page-wide match line under the header;
        - M1 becomes a diagnostic, with M2 the gate;
        - rule R goes to the user.
    - **Unit `store-validate`** (ollama `tmp/codex/store-validate-report.md`, records `tmp/codex/store-campaign5/validate/`; about 2.5 hours).
      - **Stage 0, rule R:** 2B checkout goes from 0 to 8 of 8, and no other task classification changes. All seven controls pass, including an invented reference, a reference listed before a page change, an action checked before its reset, and the not-in-view refusal.
      - **L1, `[ref=e7]` after the name with `N: ` kept:** 4B cart 8 of 8, with every guard at 8. N1, `[line N]` at the end, breaks 2B shipping (4) and 4B shipping (2).
      - **No arm moves 2B search from 0:** not P1, K1, D1, F1, or any other.
      - **Judging artifact, corrected by the Orchestrator.** The paging judge read the untransformed footer (35), while H1 and H2 re-fit the window so the footer the model saw named 34. The re-judge (`scaffold/tmp/units/paging-rejudge.ts`) gives:
        - 2B paging 8 of 8 under H1, H2, every H×G pair, K1, and N1;
        - **4B paging 8 of 8 under H1 with G1,** where the 4B reads from line 34 instead of claiming the whole page;
        - 4B paging at most 2 under every other arm.
      - **The unit's chosen C1 (L1 + G1) is superseded** by C2 = L1 + H1 + G1.
    - **Unit `store-validate-2`** (ollama `tmp/codex/store-validate-2-report.md`; 34 minutes).
      - **C2 first calls:** the 4B is 8 of 8 on every task. The 2B is unchanged: shipping and paging 8; cart, search, and checkout read from 46. The guard passes, and C2R matches C2.
      - **The 2B's second turn under C2:**
        - checkout `click e3`, 8 of 8;
        - cart `type e7` on the tray link, 8 of 8, so the best-match line reaches the tray, but the 2B types instead of clicking;
        - search `read {"from":1,"search":"kettle"}`, 8 of 8, with no `type` on `e4`.
      - The unchanged-page wording (C2R) moves nothing.
    - **Unit `store-validate-3`** (ollama `tmp/codex/store-validate-3-report.md`; 25 minutes). 2B completions under C2, every result transformed:
      - **Cart passes 8 of 8 under every arm:** the best-match line reaches the tray, and a refused `type` on the link leads to `click`.
      - **Search:**
        - C2, P1, and D1 score 0;
        - X6 scores 1, and P1 with X6 scores 1;
        - **T1 scores 6**, with `type` described as "Types into a field such as a search box, optionally submits its form, and returns the page.". Its passes run `read 46–52` then `type e4 kettle submit`, in 6.4 s.
      - **T1's guard passes:** 2B shipping and paging 8, and the 4B 8 on all five tasks.
    - **Plan drafted:** `reading/redesign/plan.md`, the change set for the user's approval. Rule R needs the user's ruling.
    - **Unit `store-validate-4`** (ollama `tmp/codex/store-validate-4-report.md`; 21 minutes). 2B search and cart passes out of 8:

      | Arm | Search | Cart |
      | --- | --- | --- |
      | T1, the control, reproduced | 6 | 8 |
      | T1 + D1 | 0 | 8 |
      | **T1 + P1** | **8** | **8** |
      | T1 + D1 + P1 | 2 | 8 |

      The guard for T1 + P1: every cell holds 8 except 4B checkout's first call at 7, where one port reads from line 46 before acting. The plan's threshold is 7, so this passes.
    - **Plan ready for the user:** `reading/redesign/plan.md`.
      - **Browser:**
        - `[ref=eN]` after the name;
        - the partial-view line;
        - the best-match line;
        - the change note from line 1;
        - the `type` description.
      - **Harness:**
        - the framing;
        - the type sentence;
        - rule R;
        - the parsers;
        - M1 as a diagnostic, with M2 the gate.
      - **The user's rulings asked for:**
        - approval of the change set;
        - rule R;
        - whether the type sentence counts as task copy.
    - **The user approved all three (2026-10-07):** the change set, rule R, and the type sentence as procedure. They are recorded in `reading/campaign.md`.
    - **Unit `redesign-impl` landed:** browser `d921838`, pushed. Its report is in browser `tmp/codex/api-impl-report.md` § Line-view redesign; it took 66 minutes.
      - **Red then green** for each of the five rules.
      - **Byte equality:** the real catalogue and policy renders equal the measured records, port-masked.
      - **The audit script** confirms the 8 page tools and their parameters are unchanged.
      - **Acceptance:** check, core 1,207, browser 478, server 395, bin 19, guides 274, policy 119, setup 181, lint, format, build, and the touched service, distribution, and conformance files.
    - **Pack:** browser `3175EDE4…` from `d921838`, at ollama `tmp/codex/store-campaign5/packs-redesign/`.
    - **Running: unit `redesign-harness`** (ollama `tmp/codex/redesign-harness-brief.md`, cap 3 h, from `b3083aa`):
      - the framing and the type sentence;
      - rule R;
      - the `[ref=eN]` parsers, with the paging window parsed explicitly so a quoted best-match row earns no credit;
      - the M1 judge;
      - byte equality with the measured seeds and the cart range-miss reply.
    - **The falsify claims** for the integrated round are drafted at scaffold `tmp/units/redesign-claims.md`: ten browser claims, with the harness claims added when the harness lands. One round runs on the integrated result, with two blind Opus lanes, because Astra wrote both halves.
    - **Harness landed locally:** ollama `b45eae7`, unpushed because the release is held. Its report is `tmp/codex/redesign-harness-report.md`.
      - **The stop and resume.** The unit stopped once on a position requirement the brief misworded. The Orchestrator ruled the oracle's wording: shipping's fact lies past the first window, and paging's token past the seed and the next window. It also ruled that the `press` assertion follows rule R. The unit resumed as `redesign-harness-2`.
      - **What landed:**
        - byte equality for all five seeds and for the cart range-miss reply;
        - the positions hold: the fact on line 52 is past lines 1–45, and the token on line 80 is past lines 1–33 and 34–61;
        - setup 261 passed; check, lint, format, and the instrument typecheck pass;
        - store-first and store-series at count 1 pass.
    - **The falsify round ruled FAIL in both lanes.** Rulings are in `reading/redesign/audit-verdict.md`; lane reports are in `falsify/`.
      - **The defect that would fail the measurement:** claim 11. The harness clears the exposed set on every action call, refused ones included, so the measured 2B cart path (a refused `type e7`, then `click e7`) would be flagged unlisted.
      - **Browser fixes:**
        - refusal subjects in the `ROLE "NAME" [ref=eN]` form;
        - the best-match note quotes the 120-unit query and never cuts a numbered row;
        - the click hint restored to the measured `call type with e4`;
        - the guide's receipts table and framing;
        - `to` in miss sentences, only when it ends before the last line;
        - a wrap that keeps a reference on its line;
        - a boolean switch for the partial line;
        - no evidence writes from the committed test.
      - **Harness fixes:**
        - only a successful action resets the set;
        - the bytes probe compares the full user turn, with a real control;
        - the legacy reference parser is dropped.
    - **Harness fixes landed locally:** ollama `78da8b9`, unpushed. Its report is `tmp/codex/redesign-harness-report.md` § Audit fixes.
      - Only a successful action resets the set, and a real-browser case pins the measured cart path.
      - The bytes probe compares the full user turn; restoring the old framing fails 10 assertions.
      - The legacy parser is gone.
      - Setup passes 267; check, lint, format, the probes, and store-first and store-series at count 1 pass.
    - **Browser fixes landed:** `a204d97`, pushed. The report is browser `tmp/codex/api-impl-report.md` § Redesign fixes.
      - Every ruling was applied as prescribed, and 19 reverting mutations each fail their tests, which closes the round without a successor. One addition beyond the ruling: a limit too small for the miss sentence and one row refuses, the toolset's existing rule for a row that cannot fit.
      - **The measured bytes still hold,** pinned by committed tests: both seeds, the cart range miss, and the exact `type` refusal.
      - **Gates:** check, core, browser, server, bin, guides 278, policy, setup, lint, format, build, and the touched service, distribution, and conformance files pass.
    - **Pack:** browser `5F8662C2…` from `a204d97`, at ollama `tmp/codex/store-campaign5/packs-redesign/`.
    - **Unit `store-measure-2`** (ollama `tmp/codex/store-measure-2-report.md`; 25 minutes) stopped at M2. Four orphaned Edge helpers were cleared before launch.
      - **V passed:** ollama `test` covers core 100, setup 267, policy 119, config 227, guides 34, and conformance 17.
      - **M1, productive first calls out of 8** (shipping, cart, search, checkout, paging):
        - 2B: 8, 8, 0, 0, 8;
        - 4B: 8, 8, 8, 7, 8.
      - **M2 on the 2B, single attempts:** shipping 8, cart 8, search 8, and checkout 8, each attempt 4.6 to 7.9 s. **Paging 0.**
        - Every paging attempt read `{"from":34,"search":"policy token"}`.
        - The reply quoted the best match, line 4 `# Shipping policy`, which matches on "policy" alone.
        - The model then answered "line 4" instead of following the footer to 62.
      - **The 4B's M2, M3, M4, and M5 did not run.**
      - **The Edge readings:** 25 Edge processes whose parents had exited, none with an `orkestrel-browser-` profile, so they may be the user's own. Left alone.
    - **Ruling:** narrow the best-match line to a best match that carries an element reference, the planner's original condition. That reverses the Orchestrator's reconciliation ruling; `reconcile.md` and `plan.md` are amended.
    - **`redesign-narrow` landed:** browser `7e45703`, pushed. It quotes a best match only when the line carries a reference.
      - The touched helper and toolset tests pass (229), and `check` and `test:guides` (278) pass.
      - The Orchestrator stopped the unit before its full gates, at the user's direction.
    - **The user's direction, 2026-10-07:**
      - Kill the orphaned processes. 25 orphaned `msedge.exe` were killed.
      - Run the 2B and 4B store tasks directly, without the full suites, because the issues are known.
      - Live runs now go straight through `tests/service/browser.test.ts -t "(shipping|cart|search|checkout|paging)"`. The case names quote the task key (`'shipping'`), so the earlier filter `… satisfies its complete predicate` with a bare key matched nothing.
    - **Live run, 4B, on `a204d97`:** all five pass on the first attempt, each under its target.

      | Task | Time | Target |
      | --- | --- | --- |
      | shipping | 21.9 s | 35 s |
      | cart | 12.5 s | 25 s |
      | search | 12.9 s | 27 s |
      | checkout | 13.4 s | 20 s |
      | paging | 17.0 s | 31 s |

      The run took 84 s in all.
    - **Live run, 2B, on `7e45703`:**
      - shipping 9.8 s, cart 7.2 s, search 6.7 s, and checkout 7.8 s pass;
      - paging fails all 3 attempts. After reading lines 34–61, the 2B answers "the token is on line 61 or 62" instead of following the footer to 62.
    - **Paging second-turn replays** (`ollama tmp/probes/paging-turn.test.ts`; 8 ports, from the recorded attempt): ports that follow the footer, out of 8.
      - As shipped: 4.
      - Prompt-side reverts: old framing 2, old `type` description 6, old type sentence 3, old reference form 2, all reverts 5.
      - Partial-line rewordings: 0.
      - **Window never ends on a heading: 7.**
      - System-prompt closers: S1 (only text shown) 0, S2 (follow the footer if not shown yet) 6, S1 and S2 together 3.

      An earlier R8 run was invalid: a PowerShell rewrite turned the probe's en dashes into mojibake. The file was rewritten clean, and R8 was measured again.
    - **`heading-boundary` landed:** browser `07a906e`, pushed, pack `B6DEE567…`. A window never ends on a heading while rows follow.
      - The touched tests (232), `check`, and guides (278) pass.
      - Ollama `debc48c`, local, pins the policy windows at 33 and 61.
    - **Live confirmation on `07a906e`** (ollama `tmp/codex/confirm.ts`; records in `tmp/codex/confirm/`):
      - **2B: 11 of 12 runs clean.**
        - Shipping, cart, search, and checkout passed on the first attempt in all 12 runs: 9.5–9.8 s, 7.3–7.4 s, 6.2–6.3 s, and 7.8–8.0 s.
        - Paging took 22 attempts for 11 passes, so about 50% per attempt; it ran 7.7–16.9 s.
        - Run 12 failed paging on all 3 attempts: after the window 33–60, the 2B answered "line 54" instead of following the footer.
      - **S4, reworded footer sentence in the system prompt, rejected:**
        - in replay, the failing turn followed the footer on 8 of 8 ports;
        - live, paging passed every run (17 attempts for 10 passes);
        - but search regressed: it needed retries in 4 runs, and run 10 failed all 3 attempts. The sentence is reverted.
      - **4B: 2 of 2 runs clean,** each task under target: shipping 17 s, cart 12.7 s, search 13.2 s, checkout 13.7 s, paging 17–18 s.
      - **Journey:**
        - 2B fails all 3 attempts in 107 s: repeated `save` after saving, a stale-reference loop, and an invented tool;
        - 4B passes in 83 s, on attempt 2.
    - **The user's answer (2026-10-07): push until 16 clean,** paging then the journey, before any release.
    - **`miss-placement` landed:** browser `06d1975`, pushed; pack `1A60AB50…` installed in ollama. An unquoted miss sits immediately before the footer; the touched tests (234), `check`, and guides (278) pass.
    - **2B confirmation on `06d1975`: 16 of 16 runs clean** (`tmp/codex/confirm/2b-c2/`), every task on its first attempt: shipping 9.5–10.1 s, cart 7.3–7.4 s, search 6.2–6.3 s, checkout 7.8–7.9 s, paging 7.8–8.4 s.
    - **The user's directive (2026-10-07):** drill into every issue the 2B meets until it uses the tools reliably; where the 4B also stumbles, the implementation is at fault; try every sensible idea and get the evidence.
    - **Census** (ollama `tmp/probes/census.test.ts`, `tmp/probes/census.ts`, report `tmp/codex/census.md`, 230 attempts against the real oracles): every 2B cart and checkout run first calls `type` on a link or button and recovers (33 of 33 each; the 4B never); every failed paging attempt is a single `read` (18 of 18) and every `read>read` passes (34 of 34); the 2B journey fails on `journeys{}` (refused: `from` required) followed by 7 plain reads to the turn limit, repeated `save` after its own save, a stale `e4` loop, and an ollama 500 on malformed tool-call XML (ollama `server.log`, qwen35 parser); the 4B's journey attempt 1 clicked the seed's `e3` right after the page changed.
    - **Ollama `5cfa5ed`, local:** the journey prompt says `call journeys with from 1`.
    - **Live variant probe:** ollama `tmp/probes/store-live.test.ts` wraps the provider boundary (system prompt, advertised definitions, tool-result text) and runs whole attempts through the real harness over fixed ports; records in `tmp/codex/store-live/<label>.{json,md}`. Running: the 2B journey baseline `journey-T0` over 8 ports. Port 49171: the 2B typed the buyer's name into the seed's search box `e4` after the page changed, 17 times.
    - **Lanes:** Opus planner on the tool surface for small models (returns text; the `planner`, `researcher`, and `analyst` roles have no write tool here), Astra analyst on the harness and oracle (ollama `tmp/codex/small-analyst-brief.md`, journal `small-analyst.jsonl`), prior art filed at `reading/small/research-prior-art.md`. The matrix: `reading/small/matrix.md`.
    - **Records filed under `reading/small/`:** `proposal-planner.md` (V1–V6), `analysis-harness.md` (the analyst: the opening turn's 8-call budget marks every 2B attempt partial; the save conflict; the oracle's refused-stale strictness), `rulings-planner.md` (§1 journey start: adopt an optional `start`; §2 relax the refused-stale pin and report the count; §3 per-turn budgets, 8 is right; §4 empty-recording words; §5 the 500: no retry, a past-the-end read shows the end), `matrix.md` (every arm with its result).
    - **Journey arms on the 2B (ollama `tmp/codex/store-live/journey-arms*.md`, 8 ports each, all 0 of 8):** T0 baseline; JL (budget 12) only lengthens loops; JS (deferred-save sentence) moved the deterministic 500 onto 5 ports; JA/JB/JC used a wording that put `record` last (my error; the empty-recording trap S4 followed); **JE (literal `then click the Cart link`, V1c copy, V4 wording, TB2) completes the whole journey on 5 of 8 ports** and fails only on the `save` loop after each later turn; JG (original wording) types into stale links; JF (JE + budget 12) same as JE; X3 shows the 500's trigger is the situation, not the refusal's words. V1c removes the `type!` detour on the flow-first ports (8 of 8) and reduces it elsewhere.
    - **Audit of ollama `tests/setupStore.ts`, `setupStore.test.ts`, `setupStore/types.ts`** (the user's request): a 10-lane workflow (5 Opus reviewers, one per rule file; 5 adversarial verifiers) confirmed 180 findings and refuted 37 (ollama `tmp/codex/setup-store-audit.md`; extracted by scaffold `tmp/units/audit-findings.ts`). The fix brief `tmp/codex/setup-store-fix-brief.md` rules the open shapes (types folded into the setup module, `StoreRunOptions extends StoreTask`, the renames, fixed-port draws removed, the proof's fixtures moved to the setup module). **Running:** Astra unit `setup-store-fix` (journal `tmp/codex/setup-store-fix.jsonl`, cap 2 h). The live series pauses until it lands, because the probes import the harness.
    - **Running in browser:** Astra unit `journey-start` (brief `tmp/codex/journey-start-brief.md`): the optional `start` on a journey and the replay that navigates there first. Next browser unit, brief ready: `small-refusals` (S4 words, V3 `from` default with digit strings, the V4 edit refusal).
    - **Codex note:** at 11:20 Codex refused `gpt-6-astra` and `gpt-6-sol` ("not supported when using Codex with a ChatGPT account"); the user's subscription had lapsed and was renewed; Astra serves again.
    - **Queue after the harness unit lands:** JSV/JEV/JEW (a success-shaped reply to a repeat `save`), X6, JX (the edit follow-up names `journey`), V2 (stable links, emulated), V1a/b/c on the five page tasks for regression, M4 (the 4B journey through the probe), then the adoption units in browser for what holds.
    - **2026-10-07 afternoon.** The conformance unit landed (ollama `1319362`: 180 findings, setup 139, tsc, lint, format, policy 119 green). The other session published agent 0.0.27 (System One judge additions; `main` updated) and pushed three ollama commits (the Ollama judge wire for Mica); merged into ollama `main` at `50d911b` (one add-add conflict in `tests/setupServer.ts`, lockfile regenerated from the manifest; tsc, 250 tests, lint, format, guides green). Agent 0.0.27 compiles against the harness beside the browser pack. Browser 0.0.27 is prepared and held: release commit `59abac3` pushed, dist rebuilt, all gates green on this host (distribution default mode 14/9 skips; service file by file), the journey start with in-place replay included. **The user's ruling:** crack the 2B first; the other session holds; publishing authority on ollama, browser, and scaffold once everything is green; the ollama service gate runs on the 2B as it stands. Running: browser unit `small-refusals`; live arms JEV, JEW, X6, then JN/JEN (drop a tool call emitted with no tool advertised). Scaffold fast-forwarded to `30d31d3eb`.
    - **Ready:** the measurement brief, ollama `tmp/codex/store-measure-2-brief.md`. It covers V, M1 as a diagnostic, the M2 gate at 7 of 8 on both models, M3's 16 runs, M4, and M5. It launches after both fix rounds land and the pack is rebuilt.
    - **Order:**
      1. the browser fix round, done;
      2. absorb, read-only, in parallel: Grok session A on the ecosystem patterns (scaffold `tmp/cursor/api-patterns*`, sliced), then session B on browser's API inventory;
      3. a blind design round (Opus planner and Astra analyst);
      4. the user's approval;
      5. the API implementation;
      6. the harness fix;
      7. the gates, M1 to M5, and the releases.
- **Probe:** `load-cases` committed P1 (`482666c`, the handshake diagnostic; its loaded rerun passed and named no bound). It stopped at P10, where no public event marks a failed idle refill. The Orchestrator ruled to observe the spent floor's refusal through `prove`, since pool refuses only after pending refills settle. Running: `load-cases2`.

1. **Probe under heavy load:** probe's whole `npm run test` under a synthetic 85% CPU load (14 busy workers) fails 12 timing cases across 3 files: handshake, warm, and deadline (probe `tmp/codex/teardown-load2-last.md`, `teardown-load2-suite-loaded.err`). Release visits run alone and pass. Rule whether to size those cases to the load a release host sees, after reading which bound each one holds.
2. **The ollama store campaign** stopped on 2026-10-06 when the daemon changed from 0.35.0 to 0.35.1, with no candidate kept. mcp 0.0.37 is published. Ollama 0.0.21 is held for campaign 3's acceptance series, and `store-campaign3` runs on its release head.
3. **mcp items 13 and 14.**
4. **Veneer's re-pin** to browser `^0.0.26`, probe `^0.0.21`, and scaffold `^0.0.93` is the cloud session's (`lanes.md`, 2026-10-06 entry).

Closed in the 2026-10-05 round, with the history in the earlier sections:
- the contexts campaign (C1 to C3, M1, M2, and the follow-up);
- ROADMAP items 14, 15, and 16;
- the implicit sign-in fix;
- probe item 1;
- the worker re-pin.

Earlier entries, kept for the record:

1. Superseded: ROADMAP item 15 (the document-startup flake), now blocking browser 0.0.25. Closed by `--disable-sync` in browser 0.0.25.
2. Superseded: the contexts campaign, C1, C2, C3, M2, and the release.
3. Done: browser `ROADMAP.md` item 16, the service-worker defect candidate (M1 result). Ran in parallel with C1b at the user's request (2026-10-05): unit `item16` in the worktree browser `tmp/worktrees/item16` (branch `item16` from `fd362be`, `node_modules` by `npm ci`, pool 0.0.15), brief and journal under that worktree's `tmp/codex/item16*`, cap 3 hours. It owns `src/core/BrowserPage.ts`, `BrowserWorker.ts`, their core tests, one case in `tests/service/browser.test.ts`, and item 16's removal; `BrowserContext.ts` and `src/core/types.ts` are report-only because C1b owns them. Merge the branch into `main` after C1b lands. Result (2026-10-05, 13 minutes, `tmp/codex/item16-last.md` in the worktree): `#attachWorker` awaited `Runtime.enable` before resuming, and a paused service worker cannot answer it (traces `tmp/probes/item16/traffic.json` against `traffic-green.json`); the fix queues the enable, resumes a service worker, then awaits the reply before publishing it, and a non-frame target reported by a frame session is resumed and detached instead of left paused. Three cases, each red without its mechanism (real-browser activation about 1.1 s green); `test:src:core` 1247 passed; `tests/service/browser.test.ts` alone 43 passed. Uncommitted in the worktree. The Opus objective review (`review-item16.md`) ruled FAIL on a forbidden test deferred and two guide overclaims; the code fix holds. Unit `item16fix` repaired all six findings (`tmp/codex/item16fix-last.md`); dedicated and shared workers start under the page setup on Edge 154 with no ordering change, so only the service worker needed it. Landed: browser `main` `e8aa649` (fast-forward, pushed 2026-10-05); the worktree and branch are removed, and its records sit in browser `tmp/codex/item16*` and `tmp/probes/item16/`. Item 16 is closed; it publishes with the next browser release.
4. The paused ollama store campaign (`ollama/tmp/codex/store-campaign-pause.md`): resume the same Codex session from S2's extension when the host can stay quiet for hours.
5. `@orkestrel/worker`'s re-pin to pool `^0.0.15` (and later 0.0.16), probe item 1 (brief at probe `tmp/codex/eager-probe-brief.md`), mcp items 13 and 14.

## Unpublished work across the fleet (read 2026-10-05, scaffold `tmp/units/fleet-status.ts` and `fleet-deps.ts`)

- Material and unpublished:
  - **pool:** `3ff0c63` and `1f194d7` (capacity, the idle-loss strike) go out as 0.0.16.
  - **browser:** 0.0.25 is prepared and held for item 15, plus item 16 (`e8aa649`), C1 (`6bedbb1`), and C2 and C3 when they land.
  - **scaffold:** 64 commits since 0.0.92, including the cloud session's S46 Oxlint rule and both sessions' records; the cloud session's lanes coordinate its release.
  - **worker:** owes a re-pin to pool 0.0.16, which changes its runtime range.
- Unpublished by design:
  - **ollama:** local 0.0.21 with 3 unpushed commits and a dirty manifest, held by the paused store campaign.
  - **supervisor:** local 0.0.2, dropped from the waves.
  - **veneer:** never published.
- Every other package carries only post-release visit commits (scaffold overwrites and devDependency re-pins). Their runtime dependency ranges match their published manifests.
- `mcp` 0.0.36 and `server` 0.0.22 were published after their last source commits, at 2026-10-04T01:20Z and 2026-10-01T21:01Z.

## Rules that bind the rest

- Tests pin claims at the least cost; report durations; never weaken a pin; no retries or longer waits to hide a failure.
- The desktop session writes no veneer path; it logs each `browse` release veneer consumes in `scaffold/.orkestrel/veneer/lanes.md`.
- Every unit's records go in its checkout's `tmp/` and this folder; commit and push each green checkpoint.

## 2026-10-07 — the small-model store campaign (owner: the desktop session)

The row-by-row record is `lifecycle/reading/small/matrix.md`; this section is the hand-off.

- **Published:** agent 0.0.28 (scope at dispatch: a call to a tool the active scope does not admit is denied, and a turn that advertised no tool ends on the reply). Notes for the context session: `.orkestrel/agent/refine.md` § Scope at dispatch.
- **Browser, prepared and unpublished (0.0.27 at `5c4b84d`, pushed):** journey start and in-place replay, one-exit refusals, stable link references, the field-aware `type` refusal, the `save` text, the `click`/`type.text` descriptions at their prior bytes, the `type` description `Focuses a field such as a search box and types into it, …`, and `edit` with `journey` optional (an omitted name resolves to the only saved journey across every store page; refused by name with none, several, or a faulted entry). Unit `small-model` (`4f253a8`) and its review repair (`5c4b84d`, report `tmp/codex/api-impl-report.md` § Small model fix).
- **Ollama, local and unpushed (25 commits on `main`):** the harness conformance, the journey prompt and opening budget, the refusal bound counted across a turn, and the wire audit's findings: the harness runs the model with its thinking on (`STORE_BOUNDS.think`, `predict` 1024), the search task says "Use the search box", the journey's store starts with a product in the cart, the edit instruction names the journey right before the edits, and a later turn's tool access ends after its first successful call (the follow-ups each ask for one call). The model's own sampling penalties stay (plain greedy is refuted on search).
- **The finding (matrix row W1):** the wire between the agent and the browser is sound; the provider sends `think: false` unless told otherwise, so a thinking model ran reflexively, and its `click`/`type` choice on a link was a near-tie that irrelevant bytes tipped. With thinking on, the choice is byte-stable, the transcript keeps the model's reasoning, and the remaining confusions were the fixture's (a checkout from an empty cart) and the prompt's ("Search for kettle" read as a page search).
- **Instruments (ollama `tmp/`):** `tmp/probes/wire-dump.test.ts` (every `/api/chat` body of one live attempt), `tmp/codex/wire-replay.ts` (re-send one dumped or logged turn under sampling overrides and print thinking, content, and calls), `tmp/codex/wire-audit.ts` (token and shape audit over attempt logs), `tmp/probes/store-live.test.ts` (variant arms), `tmp/codex/confirm.ts` (the real-harness confirmation).
- **Confirmations:** `confirm.ts 2b-final2` on pack `b8236a18…` (`4f253a8`): 5 clean runs of 6, then the journey failed run 6 on a second replay after a refused save (matrix row F2). **`confirm.ts 2b-final3` on the follow-up policy: 16 of 16 clean, every task in every run** (row F3).
- **Browser 0.0.27: published** 2026-10-07 from `36cde8f` (`.orkestrel/release.md` § 2026-10-07 round, continued): the visit's gates passed, the bump was ruled, the three self-pin hits are the 0.0.26 compatibility fixture and stay, the distribution gate read 14 passed with 9 skips, and the service suite read file by file.
- **Ollama 0.0.21 at `058e770`, pushed:** the visit's gates passed and ruled the bump (agent `^0.0.28`; dev browser `^0.0.27`, scaffold `^0.0.94`); the whole service suite reads 75 passed with 1 skipped and the judge file red at its load gate for the missing `tev1:0.8b` model (`.orkestrel/release.md` § 2026-10-07 round, continued). The user ruled the judge model: `tev1:0.8b` pulled beside Mica; the judge file passes on 0.35.1 and the whole service suite reads 76 passed. **Ollama 0.0.21: published** 2026-10-07 from `058e770` (`.orkestrel/release.md` § 2026-10-07 round, continued).
- **The round is closed:** agent 0.0.28, browser 0.0.27, and ollama 0.0.21 are served. The user ruled the provider's `think` default stays `false`. mcp's distribution pins moved with the published agent and its visit ruled no bump: mcp stays at 0.0.37, its `main` pushed at `ad9276d`. The hand-off for the context session is `.orkestrel/agent/small-models.md`.
- **Ruled (the user, 2026-10-07):** `@orkestrel/ollama`'s provider keeps sending `think: false` when the caller sets nothing; a caller that wants a thinking model's reasoning sets `think: true`.
- **Deferred candidates, no consumer yet** (carried from `lifecycle/reading/plan.md` § Deferred, swept 2026-10-07): receipts that open at the first changed line, `journeys` run selectors, and a relative `navigate` path. Build one when a consumer needs it.
