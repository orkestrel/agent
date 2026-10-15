# Study package integration

The consumer cleanup is accepted at Study `422d549` and Agent `34862bc`. Study owns the
request trace, gauged summary execution, scripted provider, response validation, message and
reading projections, and Ollama model/settings projections. Agent keeps workload declarations,
prompts, strategy choices, source joins, checkpoints, tool semantics, and grading. The measured
`studies/` TypeScript source falls from 2595 lines / 97140 bytes to 2104 lines / 80231 bytes;
workload assets remain 461437 bytes. This is source consolidation, not a speed measurement.

Actual Sonnet implemented the extraction. Independent Opus design and correctness lanes
closed ownership and treatment preservation, then a focused Opus review confirmed the repaired
Trace, Script and Summary boundaries. Physical reproduction failed 10 tests before repair and
passed the unchanged 10 afterward. Mutation controls distinguish the repaired invariants.
Final physical-install verification passed Study's 509 source, 119 policy, 229 configuration,
42 setup and 13 guide tests, with two applicability skips; the test chain resumed at policy
after a guide-only correction. Agent passed 2118 main tests with two applicability skips and
155 study integration tests. Both packages passed format, lint, types and build. Agent's
discovery instrument flags its core project as ungated, but the direct Vitest list matches all
44 census files and `npm test` executed those files with 1474 passes. No configuration changed.

Accepted source matches the isolated proof trees. The development installation remains at
`tmp/studies/study-slim-dependencies`; its Study server SHA-256 is
`01bff1edf977435415d21bb572150ae6434fb900a65dd3c53c877720a6304ecd`. Agent's historical root
Study installation remains unchanged and is not the installation that verified the promoted
exports. Preserve the physical proof trees for the separate Compaction successor. No bump,
publication, model execution, retry, scoring change or frozen-result edit occurred.

The earlier shared instrumentation promotion is accepted at `019f5ce`, with Agent's consumer
migration at `8a9087b` and MCP's owner repair at `b0e9d7f`. Actual Sonnet implementation,
independent review including Opus, mutation controls and host gates closed the work. See
[promotion acceptance](../../study/.orkestrel/promotion.md#acceptance) for the readings and
the remaining unpublished Agent/Ollama API limitation. The separate Compaction qualification
uses a physical captured runtime; [the series handoff](agent/handoff.md) owns its status.
No version bump or publication occurred. Installed-copy readings below are historical;
preserve the copies and captured builds that retained results still bind.

The portable @orkestrel/study package is implemented in the sibling Study checkout. Its public runtime uses src/core, src/server and src/bin/main.ts. Agent owns the authored adapters and scenarios under studies/; results and scratch belong in the consuming checkout's tmp/studies/. The superseded private app code was removed at 8a14ac9. The abandoned scaffold root-axis proposal was restored and its verified historical files moved to Study. Do not resume either layout.

The contract is [Study's guide](../../study/guides/study.md). Research, design rounds and the per-file refinement record are retained in Study's git history through `3b7d6f3`; earlier private-app and scaffold-root proposals are superseded. No publication or version bump has occurred. Agent's file:../study development dependency is a real copied installation made with --install-links and --ignore-scripts. After the native package-root repair at Study `f977e68`, independent comparison found all 14 installed Study dist files byte-identical to the verified sibling build, totaling 2159504 bytes. The package manifest is identical too. The receipt is `tmp/units/study-native-final-installed.json`.

Agent's `studies/memory/` and `studies/tools/` code drives the actual Agent package. Their scenarios, rubrics, declarations, and consumer proofs stay with Agent. The generic cross-package adapter proposal and migration record belong to Study's git history; they do not establish implemented adapters in sibling packages. Frozen historical benchmark custody stays in Agent until its absolute-path identities and retained proofs can be retired safely.

The consumer migration to Study's promoted instrumentation selects the runtime and the tested subject separately. Each public profile declares `agent` beside `subject`, equal for these Agent studies, and the drivers construct the Agent from `options.agent` only. The memory driver takes the shared observer, judge and Ollama transport from Study and declares the exact wire policy of each role its arm dispatches: the summary role and strict native flags for Compaction, the one-token judge for Records, and neither for Full. Ledger and judge factories, the judge pin and the recap allowance are required only where the selected arm uses them. Grading runs through Study's `gradeStudyEvidence` with Agent's mechanical predicates, and tools ticket cleanup runs through `failStudyTicket`. Agent keeps the prompts, thresholds, provenance, checkpoints, lookup, summary policy and the whole-attempt operational predicate. Staged consumer proofs and the promotion gates passed; the frozen root installation stays unchanged.

The user authorizes needed Orkestrel dependencies without another permission request and requires their latest published versions. Non-Orkestrel additions still require explicit authorization. The final Fable allowance is consumed; never invoke it without new permission. Opus 5.5 remains authorized for subjective and adversarial work. No parallel GPU work.

## Implementation and proof

Independent Astra and Opus macro reviews identified defects in lookup admission, consumer naming and room bounds, offline import isolation, required quality qualification, label provenance and cross-copy error classification. Root reproduced them, Opus refined every authored Study and Agent consumer file, and Sol completed scoped repair proofs and actual mutation controls. Opus's CLI sessions lacked shell execution, so their reports are design and implementation evidence only.

The final independent Astra review confirms all repaired claims. It preserves ordinary import isolation within a trusted-code model, rather than claiming a security sandbox. CONFIG survives the captured StudyError boundary; other task errors retain their FAULT translation. Mechanical judgments cite retained files and one-based rows; unavailable and semantic facts remain unknown.

The first real endurance launch exposed a native dependency-root omission before inference. Study now admits distinct captured package roots with the same package name while retaining path and digest checks; repeated canonical roots remain refused. Agent's q4 profile captures both its local subject and the installed Agent dependency used by Ollama. No package is aliased or substituted. Independent Astra review passed; the original guard mutation failed the intended regression. Independent Luna verification measured 3 native-topology tests, 4 integration tests, 51 service tests in 46863 ms, and 139 setup tests in 1903 ms, all passing. Scoped static gates and offline declaration checks passed. The original failed result remains sealed and unchanged; fresh capacity custody is `tmp/studies/endurance-capacity-2`.

Study's independent format, lint, type checks, build and test gates passed at 2eddf7d. Its test run measured 485 passes and two applicability skips. Agent's same gates passed at 28fde65: 2016 tests passed with two applicability skips, followed by 43 service tests with no skips. The final installed Agent/Ollama capacity-to-quality execution, grading and reporting proof also passed separately with one test, no skips, exit 0 in 40804 ms. It uses the actual packages and an ephemeral protocol fixture, and supplies CPU integration evidence rather than model-quality evidence. The implementation and repaired claims are accepted; publication remains outside this work.

Contract, abort, budget and timeout supply the matching primitives. The ecosystem review retained serial fresh-process execution and a small noninteractive JSON CLI; terminal, console, queue, pool and workflow are not added where their semantics do not match. Process 0.0.15's stopChild always starts POSIX termination with SIGTERM, uses per-step confirmation bounds and never rejects. Study requires immediate forced termination with surfaced cleanup failure, so that candidate is ruled retain rather than deferred implementation. The CLI exposes help, exact next argv, explicit fingerprints and grading selection, contained relative output and bounded commands.

The user-requested renewed actual Opus 5.5 pass is accepted at Study `d06b30c`. Per-file metadata reconciled all 101 authored paths. The changes consolidate hashing, custody encoding, role/cause guards, instrument framing, product validation and deadline ownership, with matching Contract primitives used directly. Independent Astra review found an invalid-duration late-rejection defect; its prescribed repair and actual observer-removal mutation closed the claim at `3b7d6f3`. Final Luna gates passed 503 tests with two applicability skips; isolated release tarball consumption passed 9 tests without skips. Study's campaign folder is retired, with evidence and decisions in git history and permanent tests. Agent's copied f977e68 installation remains frozen through candidate 3 execution and grading, including any accepted quality phase. Refresh that copy and run the installed consumer proof only after the series releases its captured inputs.

## Cleanup and model evidence

Scaffold 0.0.101 is published at registry gitHead 3c043f0a394be94dd00cc2e8d3a5c1044cb28887. Agent and Study declare that dev dependency at 0f89cd0 and cbcc936. Study's canonical repair updated existing tool ranges and lockfile at 53b0207. Agent reports, lifecycle records and old temporary artifacts belong to Agent; generic Study records belong to Study. See [relocation custody](agent/relocation.md). The other session owns Scaffold and PARALLEL.md cleanup; this continuation changes neither.

Independent Luna verification passed the Scaffold audits and format, lint, type, build, and test gates against those revisions. Agent measured 2016 passes and 2 applicability skips in a 46005 ms gate chain; Study measured 485 passes and 2 applicability skips in 95203 ms. Agent's unpublished local Study dependency prevents online registry audit. Its offline plan comparison temporarily substituted the installed concrete Study version, restored the original manifest bytes, and found no drift. This is not a registry audit of Study. The evidence is `tmp/units/scaffold-0101-verifier-report.md`.

The original thinking comparisons are graded and closed. The extended capacity successor stopped after 48 completed q4 records goals, exhausting the 8192-token output cap on attempt 49. Fail-fast prevented further requests; remaining arms never started. See [capacity.md](agent/capacity.md). The selected prospective [Study endurance successor](agent/endurance.md) retains those finite bounds, disables thinking, and requires full-horizon capacity before quality. No failed historical run restarts and no further budget increase is selected.

Preserve frozen harness sources, builds, dependencies, manifests, raw results and private oracle. The dedicated daemon on 11435 remains separate from the user's 11434. The temporary harness/.build ignore stays until dependent custody and reporting no longer require those bytes. Never rebuild a frozen harness beside generation or labeling.
