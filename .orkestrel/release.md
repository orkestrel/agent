# Study and Scaffold release preparation, 2026-10-24

## Ready for publication

Preparation is complete. No package has been uploaded. All release tasks are terminal, both release repositories are clean and pushed, and the prepared archives are retained. Agent's package.json/package-lock.json local Study pin remains intentionally dirty and unchanged.

| Package | Prepared version | Pushed main | Archive |
| --- | --- | --- | --- |
| Scaffold | 0.0.106 | b92f12067faca7f42dec3e7073c6af75b326d70c | ../scaffold/tmp/releases/20261024/orkestrel-scaffold-0.0.106.tgz |
| Study | 0.0.4 | c56619841d9dcde72fa1f07fe91c057c96b2e2cb | ../study/tmp/releases/20261024/orkestrel-study-0.0.4.tgz |

Study passed full prepublishOnly on Node24.22.1 and22.18.0. Scaffold passed full prepublishOnly on Node24.22.1 and completed every Node22 gate across the original run and successful templates/distribution continuations. The original Node22 invocation and first distribution attempt remain failed due to registry metadata refusals; they were not relabeled. Final distribution on an isolated cache passed11/1skip in300.876seconds. Final comparison exited0 in3.525seconds and resolved dist moved/ranges unchanged. Root checked the actual outer result and launcher exit directly. No source or dependency change was needed after those registry refusals.

Scaffold's archive was packed with --ignore-scripts in1.782seconds. Its243 entries match npm's complete file list; the208-entry archived host digest equals the generated checkout inventory. The archive contains only the package manifest, license, README, runtime/declarations/maps, host authority/files, and executable skill twins. SHA-256: `c61065c32efc2f1696fbdb4007305e9dec3fd0a23f45f95a1e96596bb72548ae`. Integrity: `sha512-MWoeUGPiELtuYhmjvYqw/WpjwJXHP28VodP3NGyoZlW0aKEZAU86OX+aWlJIywxYJQoiOq98ZPin0LU5d9OJvQ==`. Study's archive identity is recorded under its acceptance section and was rechecked unchanged. Do not rebuild either prepared artifact before upload without recording the changed identity and applicable validation.

Final registry reads still served Scaffold0.0.105 and Study0.0.3. Both git comparisons returned0/0 against origin/main. The read-only authentication probe answered live for mikesaintsg; the upload runner rechecks authentication immediately before sending. Publishing remains the user's action and code.

The accepted Scaffold review report is also retained at `tmp/releases/20261024/scaffold-review-report.md`, SHA-256 `04f2ee352dcc55747024d998715ecd6be322350a3e89e5509c8ad0cd27bfe1f7`, with its destination citation record alongside it. Gate reports, failure logs, original seals, and D1 reports remain under their recorded paths. A read-only cleanup inventory is at `tmp/units/release-20261024-cleanup-inventory.json` (plain report text). Automatic approval review rejected the command combining scoped review cleanup with recursive removal of the isolated npm cache, giving only “blocked by policy”; none of that command ran. Keep the isolated cache and original review files rather than repeating the rejected deletion. The redundant root log-reader process was identified by its exact owned command and PID67420, then stopped; it wrote no files. No verifier or release process remains active.

## Enter the publication code locally

The private secret tool returns an opaque reference, and no available terminal/upload tool accepts that reference. Do not request a private code that cannot be forwarded, and do not ask for it in chat. When the user is ready, they can run the following command in their local PowerShell terminal. It reads the code without echo, uses the existing serial upload runner against the prepared primary checkouts, skips gates during upload, and clears the local code variables afterward. The runner captures each npm subprocess and stops on an authentication refusal; never retry a refused code. This block has not been executed.

```powershell
Set-Location 'C:\Users\mikes\WebstormProjects\scaffold'
$env:OLLAMA_HOST = 'http://127.0.0.1:1'
$env:PATH = 'C:\Users\mikes\scoop\apps\nodejs-lts\current;' + $env:PATH
$releaseSecureCode = Read-Host 'npm one-time code' -AsSecureString
try {
    $releaseCode = [System.Net.NetworkCredential]::new('', $releaseSecureCode).Password
    node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/release-20261024-publish.log --errors tmp/units/release-20261024-publish.err --cap 600 --status -- node .agents/skills/orkestrel-publish/scripts/window.ts --publish 'C:\Users\mikes\WebstormProjects\scaffold' 'C:\Users\mikes\WebstormProjects\study' --otp $releaseCode --json
} finally {
    $releaseCode = $null
    $releaseSecureCode.Dispose()
    $releaseSecureCode = $null
}
```

After upload, root reads both publish journals, confirms exact registry versions/integrities, and records the outcome. Do not infer publication from this preparation or a terminal exit alone. Preserve Agent's captured Study build/pin until adoption is proved. D1 design reconciliation remains the underlying campaign task after this release window; its reports and limits follow in the historical record.

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

None. Scaffold's final task `node:delegated-task:command%3Amcp%3A0cc53948-e0cd-428d-bcba-9827c577dde4%3Adelegate-task%3Arelease-20261024-scaffold-distribution-r1` completed successfully. Report: `tmp/units/release-20261024-scaffold-distribution-report.md`. Its independent gate result is accepted; inventory committed and pushed, archive inspected. The following sections retain prior measurements and failures as history; the ready-for-publication section owns the next action.

The first builder stopped correctly without writes: its baseline had four compiler failures (three manifest snapshots plus the showcase expectation) and one selected CLI diagnostic failure. The original brief incorrectly treated showcase Vite 8.3.4 as an immutable source pin. Root read `src/core/constants.ts:740-743`, which derives showcase Vite from the package manifest, and `blueprintToDevDependencies`, which applies that selected pair after extras. The successor moves the dependent expected literals to 8.3.5 while retaining singlefile 2.3.3 and every unrelated canned registry value; it changes no product source. The earlier failure logs are retained and need no repeated baseline.

At most two T3 children were allowed. Preparation for both packages is complete; no child remains active. The next release action is the user's authenticated upload, followed by root registry confirmation and adoption checks.

## Study acceptance and preparation

The release reviewer passed every release-boundary claim at3862a52. Its exact report is `tmp/units/release-20261024-study-review-report.md`; root sampled the digest, continuation and distribution staging citations directly. `cite` found no recognized citation tokens because the report used Markdown absolute links, so its zero count is not citation coverage. Version-only adoption changes content identity, not runtime identity: locally captured accepted-schema records can replay but cannot continue across the bump. Preserve Agent's captured build and local pin for continuation custody. Old published0.0.3 recording schemas remain refused.

Root bumped Study to0.0.4, installed (exit0,0.947seconds), found no self-pin hit or local dependency pin, and committed `a1b4a8c`. The install's moderate audit notice is development-only; `npm audit --omit=dev --json` reported no runtime vulnerability. The required wording sweep resulted in comment/prose substitutions only, returned by `release-20261024-study-wording-r1`; root read the complete zero-context diff. Its guide gate passed23 tests in4.101seconds; root format exited0 in0.329seconds. Those uncommitted comment files are the verifier's frozen expected status and must join the final release commit after green gates.

Study's final verifier completed GREEN. Full prepublishOnly exited0 on Node24.22.1 in341.997seconds and Node22.18.0 in353.314seconds; the npm CLIs actually used were11.19.1 and11.21.1 respectively, superseding the initial shell's npm12 reading. Each chain passed982 source tests with2 skips,124 policy tests with1 skip,281 config tests with1 skip,89 setup,23 guide, and16 release-distribution tests. Root read both terminal logs and the final comparison directly; the detailed verifier report is `tmp/units/release-20261024-study-gates-report.md`. Final wave from compare exited0 in2.466seconds and ruled dist moved/ranges unchanged. No timing rerun or source fix occurred. The source guards explain the skip classes: file-link privilege on Windows; Scaffold-only authored writing-table parity; and the unavailable-extractor branch when the extractor is installed. These are static guard dispositions; the dot logs do not name individual skips.

Root committed the eight verified prose/comment files as `c56619841d9dcde72fa1f07fe91c057c96b2e2cb`, fetched without incoming work, and pushed main. `HEAD...origin/main` is0/0 and Study's working tree is clean. The exact prebuilt archive is `../study/tmp/releases/20261024/orkestrel-study-0.0.4.tgz`, packed with --ignore-scripts in0.634seconds. Root inspected npm's full17-entry listing and tar's listing: only LICENSE, README, manifest, core/server JS/declarations/maps, and the CLI/map ship. No scratch, studies, profiles, credentials, or app sources ship. SHA-256 is `faf83e2f3ad8f835cd10e4552529f5145d057647bc4fd10fb0240086b0cfee5a`; npm integrity is `sha512-KWWLh0AZQF1jrpoN6oe9kbk8Ao5fEP6vvli4lEhyM9/bkCyIcj0m5xPn+hhaUWxrHEMl6P5e3mVY4aVZye8U7A==`. Pack logs: Study's `tmp/units/release-20261024-pack.log` and `.err`. Preserve this archive for upload without rebuilding. No publication or Agent pin adoption occurred.

## Scaffold fixture repair

The second expectation builder refreshed the owned literals and compiler snapshots. Compiler289 passed in29.901seconds. CLI then failed28/passed154 in172.185seconds because aligned-manifest helpers and served-version expectations still held8.3.4 while the fixture registry derived8.3.5. The writer stopped without expanding scope. Root inspected the helper definitions and failing diagnostics and checkpointed the already-reviewed exact substitutions as `04d9ada84`. The finish brief updates only those correlated fixture literals and the guide's stated Vite pin, keeping arbitrary replacement/parser fixtures unchanged. It also carries the root's contextual writing-sweep rulings: temporal once and prose cross-references move; numeric once, temporal since, physical/numeric above/below, keywords, and literal registry tag names stay. Full checks remain owed.

Both D1 review reports are saved under `tmp/units/ledger-sentence-review-objective-report.md` and `tmp/units/ledger-sentence-review-subjective-report.md`. They reject dispatchability; reproduce and reconcile their bounded findings after this release preparation. No calibration or GPU use occurred.

## Scaffold review freeze and catalog

The finish builder returned successfully with the prescribed18-file fixture/prose patch and no executable validation. Report: `../scaffold/tmp/units/release-20261024-finish-report.md`. Root read the complete diff and resolved its remaining contextual wording: highest stable/release in the lookup comments and precise reverse-order rollback wording. These edits change comments only. The working tree remains uncommitted for the release review; its actual diff and status are captured in Scaffold's `tmp/units/release-20261024-published.diff` and `release-20261024-review-status.txt`. Review brief checking resolved7 paths; git diff --check passed.

Canonical `catalog --all` on2026-10-24 wrote2 files, left50 unchanged, and removed none: the catalog's Scaffold row moves104 to105 and the Agent guide mirror refreshes from its upstream. Membership reported51 published rows;49 guides fetched. The command exited1 in7.124seconds because Supervisor's guide returned HTTP404. The guide contract preserves available rows and exposes the unresolved foreign row; do not call this complete all-guide success. No Supervisor source or guide was fabricated. The following declared-guide `catalog --json` exited0 in3.281seconds. Logs: Scaffold's `tmp/units/release-20261024-catalog*`. The regenerated table confirms ScaffoldL3 and StudyL7. This satisfies the catalog ordering read while retaining the all-guide limitation. No package repair, release, or downstream cascade was performed by these catalog commands.

Root diagnosed the touched CLI failures directly. `readHostFloor` uses checkout `host.json` when loaded from TypeScript, then verifies each destination's actual bytes. The committed inventory still declares catalog SHA-256 `0f1f2ca81f4f3d068111443bc3f732a7abe3450350bdc382bea33ccbf514e7b0`, while the refreshed file hashes to `3a8756c323e1ea31e2f9879ed9a14477c34ed5eef1654c60d760a7357cff2f48`. Agent and Scaffold guide hashes also differ from that pre-refresh inventory. Two CLI failures throw at this digest guard; three dependent provenance assertions fail after the same floor refusal. Root scheduled these tests before the required inventory generation; this is not evidence to weaken a digest guard or change assertions. After the review returns and the bump lands, run the existing build pipeline, which stages the host and inventory, before the final tests. Full prepublishOnly already orders build before tests and will cover the failed CLI cases and deferred guide parity. Preserve the failed run; do not repeat its successful setup baseline solely to relabel this touched run green.

Root's self-version search found only package.json, the three compiler snapshots (app-only-toolchain, source-manifest, setup-false-manifest), and the catalog row outside lock/scratch/dist. The three snapshot self-pins must move105 to106 with the bump. The catalog row records the published105 release and remains until registry publication; never change it by hand to the unserved candidate.

The current tool catalog provides a private secret request but no terminal/upload tool that consumes its opaque one-use secret reference. Do not collect an OTP until an execution route can use it, and never ask for it in chat. Preparation and the readiness report remain authorized; no code or authentication step has been requested.

## Scaffold review acceptance and gate handoff

The release reviewer returned FAIL1, CONFIRMED2–4, no outside findings. Root saved its exact report in Scaffold's `tmp/units/release-20261024-scaffold-review-report.md`. All35 Markdown link destinations resolved through the citation checker after extraction to a separate file; the initial8 unresolved items were shortened display labels, not missing destination files. Root sampled the fixture, manifest, host membership, and installed-pin assertions directly. The detailed temporary ruling is `.orkestrel/scaffold/release-audit-verdict.md`.

Root reproduced the documented wave example's inherited Vite failure: the named F2 case failed1 in1.921seconds, passed1 in1.957seconds with the prescribed explicit8.3.4 packument, and failed1 in1.859seconds after removing that response. The response is restored. All30 other cases were deselected by the name filter. Assertions, the worked example, and the shared manifest-derived registry remain unchanged. The exact prescribed repair closes with this mutation proof under orchestration; no additional review is required. Root's previous classification of this particular wave fixture as independent was incomplete: its expected value was independent, but its shared registry input was not.

Registry still served Scaffold0.0.105 before the bump. Root bumped to0.0.106, installed with exit0 in3.408seconds and0 vulnerabilities, updated only the three generated self-pin snapshots, and preserved the app-only snapshot's no-final-newline shape. Format exited0 in0.691seconds; root inspected its guide table spacing and the full diff, with no replacement characters or unintended debris found. Correct self-pin sweep --version0.0.105 found0hits in src/tests; swap reported0pins/0drifts. The first pins invocation used an unsupported --prior flag, printed usage, and supplied no sweep evidence. Prepared changes are committed as `a3d4c33b63073aa2000d35b016ca41857947af21`; Scaffold was clean at verifier dispatch. Host inventory regeneration remains deliberately with the full build, not a hand-edited digest.

The prior touched verifier is terminal: setup131 passed/3 skipped, CLI177 passed/5 failed, guides not run, unchanged source status. Its failing logs remain under Scaffold's `tmp/units/release-20261024-touched-*`; the stale inventory diagnosis precedes this section. Full release gates include those cases after generation. Do not call that old touched run green or repeat its successful setup test as a separate baseline.

## Scaffold full-chain results and Node22 continuation

The first final verifier completed, report `tmp/units/release-20261024-scaffold-gates-report.md`. Node24.22.1/npm11.19.1 full prepublishOnly passed with exit0 in935.628seconds. The chain passed core591, server530/12skips, bin351, policy125, config281/1skip, setup390/4skips, skills213, guides47, templates84, and the outer release-distribution suite11passed/1skipped in1file, including its nested consumer checks. The verifier's report mistakenly attributed a nested3tests/3files result to the outer distribution; root corrected this record from raw log lines605–608 while preserving the original report. Root read the terminal exit and inspected the generated host.json diff: only three changed file digests plus aggregate digest, as expected. This successful chain includes the repaired documented example and all previously failing CLI digest cases after regeneration.

Node22.18.0/npm11.21.1 passed format/lint/check/build and the same ordinary test projects through guides, then prepublishOnly exited1 in785.412seconds. The templates project's live-browser beforeAll install returned ETARGET for vite@^8.3.5;68 tests passed and16 cases were skipped after that suite setup failure. Release distribution and comparison did not run. Preserve the failed invocation as exit1.

Root inspected the raw npm debug log at `C:/Users/mikes/AppData/Local/npm-cache/_logs/2026-10-24T14_46_14_284Z-debug-0.log` and `tests/src/core/templates.test.ts:399`: the install requests --prefer-offline and its Vite reads report cache-stale responses. A subsequent direct Node22 npm view --prefer-online resolves vite8.3.5, including the exact^8.3.5 range. Journaled reading exited0 in1.009seconds; integrity `sha512-z1YpjieJ9g0ebTmQpLBv/oq9E3F9EIlOe+7LahW8SrE3LTiG3udBRUXQOlYXP9b+IC2q2phHeVxj9xGlw34OEQ==`. Evidence is Scaffold's `tmp/units/release-20261024-vite-registry-read.log` and `.err`. Present availability is established; the exact source of stale metadata is not. No source, dependency range, npm configuration, or shared cache deletion was made.

The successor verifier retries only the failed templates project on Node22, then runs the pending release-distribution project and comparison. Do not repeat passed stages on the unchanged tree. If these pass, accept the full Node22 gate population across the original run and continuation, explicitly retaining the original failed full invocation. If they fail, stop and diagnose that result. No repeated blind retries or silent skip is authorized.

That successor is complete: templates passed84/0skips in200.461seconds. Distribution then failed at the packed adopter's consumer install with ETARGET for @orkestrel/guide@^0.0.25,10other tests passed/1skipped, duration177.564seconds. Comparison did not run. Report: `tmp/units/release-20261024-scaffold-floor-finish-report.md`; raw logs are Scaffold's `tmp/units/release-20261024-floor-distribution.log` and `.err`. The npm debug file named in the error had already rotated away when root attempted to read/preserve it; no debug-file evidence is claimed for this refusal.

Root traced the adopter environment at tests/distribution.test.ts:65–130. It inherits the parent cache and invokes install with --prefer-offline; it does not provide a cache override. Installed npm-registry-fetch chooses force-cache for preferOffline before checking preferOnline, so an environment prefer-online setting alone cannot supersede that argument. Root created the isolated cache `../scaffold/tmp/units/release-20261024-floor-npm-cache` and read the exact Guide range live through it. Guide0.0.25 resolves with integrity `sha512-LrKyjMqREkHuYwB0YWj6uV20TmtWwbQ6yTgUSXPLhI4opQX0gtJ3fyHDvGEgPd7AfPuMfQP8qwWDqZs1BBLyNQ==`, exit0 in0.709seconds; see Scaffold's `tmp/units/release-20261024-guide-registry-read.log` and `.err`. Shared caches and source remain untouched. The active verifier reruns only distribution with npm_config_cache pointing at this isolated directory, then comparison if green. Retain failed runs and do not rerun successful ordinary/template gates. No package dependency or test was weakened to obtain a pass.

RELEASE: OPEN — Scaffold0.0.106 and Study0.0.4 are prepared; upload awaits the user's code.
