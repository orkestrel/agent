# Study and Scaffold release preparation, 2026-10-24

The user requested preparation of Study and Scaffold for their next publication and a readiness report before supplying the one-time code. This authorizes the repository visits, necessary release repairs, commits, and pushes for these packages. Upload waits for the code. It opens scaffold work previously held by U23 and Study release preparation previously held by U25; it does not authorize an Agent release or an unrelated roadmap campaign.

## Entry and order

Registry readings on 2026-10-24: Scaffold 0.0.105 at `b40ed8a6536251455f3a1b647b46e204631ca6e8`; Study 0.0.3 at `89c58bfe1ebeb9bb598e2573a63c168e103962aa`. Initial clean tips: Scaffold `ce5393a26`, Study `6e30457`. Both fetched origin without incoming commits. Node is 24.22.1 with npm 12.0.2; the floor runtime is Agent's `tmp/runtimes/node-v22.18.0-npm11-win-x64`.

Scaffold publishes ahead as the development authority, then Study. Candidate versions are Scaffold 0.0.106 and Study 0.0.4, subject to the artifact comparison and independent review. The catalog reports Scaffold L3 and Study L7. Study's runtime dependencies remain registry releases; its development Scaffold pin can stay on the registry-served 0.0.105 for this preparation, then adopt 0.0.106 after publication with the required checks. No local pin exists in either release checkout.

## Parallel ownership

The Orchestrator ran independent visit preparation in the disjoint main checkouts. Each checkout has one writer. D1's read-only reviews remain in Agent; no D1 source or GPU run starts while this release is prepared. Preserve their results and the original campaign objective. Heavy gate chains run serially under a verifier; read-only review can overlap them. Every subagent performs its own assignment and spawns nothing. No broad cleanup runs over retained campaign evidence.

## Visits

| Package | Preparation | Evidence | Remaining |
| --- | --- | --- | --- |
| Scaffold | `wave --visit --to record --prior 0.0.105` exited 0, 15.069 seconds; registry audit and installs passed; self-pin sweep found 41 hits for ruling; no self-overwrite ran | `../scaffold/tmp/units/release-20261024-scaffold-visit.log`; matching `.err` | self-pin disposition, rebuilt artifact comparison, release review, bump, full release gates and floor proofs, pack identity, commit and push |
| Study | `wave --visit --to record --prior 0.0.3` exited 0, 18.356 seconds; re-pinned Scaffold to 0.0.105, overwrite and audit passed, no self-pin hit | `../study/tmp/units/release-20261024-study-visit.log`; matching `.err` | rebuilt artifact comparison, release review, bump, full release gates and floor proofs, pack identity, commit and push |

No upload, login, one-time-code request, model request, or GPU charge has occurred. Agent's local Study pin and dependent unpublished commits remain under custody until the published Study adoption is proved. Save unit IDs and each gate result here before handing work back.

## Artifact rulings

Study build exited 0 in 12.866 seconds; the corrected direct comparison exited 3 in 1.141 seconds, with eight changed core/server JS and declaration files. Scaffold's corrected build in `C:/Users/mikes/WebstormProjects/scaffold` at `9be602771e194b30dcb26e39c06867a583bc66a4` exited 0 in 22.686 seconds; compare exited 3 in 1.318 seconds, changing `bin/main.js`, `src/core/index.cjs`, and `src/core/index.js`. Both trees remained clean and Scaffold's host inventory stayed unchanged. The material-artifact trigger requires Study 0.0.4 and Scaffold 0.0.106. Reports: `tmp/units/release-20261024-compare-report.md` and `tmp/units/release-20261024-compare-report-2.md`.

The first verifier used the wrong Scaffold checkout (`scaffold-release-0105`); discard its equal-artifact verdict. It also used an unrequested `npm exec` form for its first Study comparison, which attempted temporary `node@26.12.1` resolution and failed. That command is invalid evidence and violated the runtime/install constraints. The corrected direct Study command and the successor Scaffold command use Node 24.22.1. Subsequent briefs require absolute root/HEAD checks and forbid `npm exec`, `npx`, and temporary package resolution. Do not repeat either invalid command.

## Active dispatches

- Study final verifier: GPT-6 Luna medium, task `node:delegated-task:command%3Amcp%3A0cc53948-e0cd-428d-bcba-9827c577dde4%3Adelegate-task%3Arelease-20261024-study-gates-r1`. Brief: `tmp/units/release-20261024-study-gates-brief.md`; report expected at `tmp/units/release-20261024-study-gates-report.md`. Owns the host's test/build execution: full prepublishOnly on Node24.22.1 then22.18.0, each under3600seconds, then wave from compare. No source writer in Study or executable validation elsewhere until it returns. The full prepublish gate is the visit's quality-gate superset; avoid a duplicate wave gate run on the same tree.
- Scaffold finish builder: GPT-6.1 Sol low, task `node:delegated-task:command%3Amcp%3A0cc53948-e0cd-428d-bcba-9827c577dde4%3Adelegate-task%3Arelease-20261024-scaffold-finish-r1`. Brief: `../scaffold/tmp/units/release-20261024-finish-brief.md`; report expected alongside it. Owns exact aligned-fixture updates and release wording substitutions. This unit edits only and runs no executable validation while Study's verifier owns the host. Its touched tests and guide parity must be run later by a verifier. No concurrent root source or catalog write in Scaffold.

The first builder stopped correctly without writes: its baseline had four compiler failures (three manifest snapshots plus the showcase expectation) and one selected CLI diagnostic failure. The original brief incorrectly treated showcase Vite 8.3.4 as an immutable source pin. Root read `src/core/constants.ts:740-743`, which derives showcase Vite from the package manifest, and `blueprintToDevDependencies`, which applies that selected pair after extras. The successor moves the dependent expected literals to 8.3.5 while retaining singlefile 2.3.3 and every unrelated canned registry value; it changes no product source. The earlier failure logs are retained and need no repeated baseline.

At most two T3 children run. After these returns, inspect and commit the bounded Scaffold repair; refresh the canonical catalog before sequencing; obtain Scaffold's release review; bump and install from the registry readings; regenerate version-derived snapshots; run each package's full prepublishOnly on Node 24 and Node 22.18.0 under a verifier, serial on the host; inspect pack contents and identity; commit and push. The visit through gates/compare remains to be closed against the final artifacts. Record every command and duration. Complete all preparation before asking for a code. No release is ready yet.

## Study acceptance and preparation

The release reviewer passed every release-boundary claim at3862a52. Its exact report is `tmp/units/release-20261024-study-review-report.md`; root sampled the digest, continuation and distribution staging citations directly. `cite` found no recognized citation tokens because the report used Markdown absolute links, so its zero count is not citation coverage. Version-only adoption changes content identity, not runtime identity: locally captured accepted-schema records can replay but cannot continue across the bump. Preserve Agent's captured build and local pin for continuation custody. Old published0.0.3 recording schemas remain refused.

Root bumped Study to0.0.4, installed (exit0,0.947seconds), found no self-pin hit or local dependency pin, and committed `a1b4a8c`. The install's moderate audit notice is development-only; `npm audit --omit=dev --json` reported no runtime vulnerability. The required wording sweep resulted in comment/prose substitutions only, returned by `release-20261024-study-wording-r1`; root read the complete zero-context diff. Its guide gate passed23 tests in4.101seconds; root format exited0 in0.329seconds. Those uncommitted comment files are the verifier's frozen expected status and must join the final release commit after green gates.

## Scaffold fixture repair

The second expectation builder refreshed the owned literals and compiler snapshots. Compiler289 passed in29.901seconds. CLI then failed28/passed154 in172.185seconds because aligned-manifest helpers and served-version expectations still held8.3.4 while the fixture registry derived8.3.5. The writer stopped without expanding scope. Root inspected the helper definitions and failing diagnostics and checkpointed the already-reviewed exact substitutions as `04d9ada84`. The finish brief updates only those correlated fixture literals and the guide's stated Vite pin, keeping arbitrary replacement/parser fixtures unchanged. It also carries the root's contextual writing-sweep rulings: temporal once and prose cross-references move; numeric once, temporal since, physical/numeric above/below, keywords, and literal registry tag names stay. Full checks remain owed.

Both D1 review reports are saved under `tmp/units/ledger-sentence-review-objective-report.md` and `tmp/units/ledger-sentence-review-subjective-report.md`. They reject dispatchability; reproduce and reconcile their bounded findings after this release preparation. No calibration or GPU use occurred.

RELEASE: OPEN — Scaffold and Study are in preparation.
