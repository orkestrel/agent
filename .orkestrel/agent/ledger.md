# Agent records campaign ledger

One row per dispatched unit and per user ruling on routing or scope. The carrier names the tracked record that absorbed the result.

| Date | Unit | Role | Carrier |
| --- | --- | --- | --- |
| 2026-10-30 | campaign opened; routing ruled: the `grok` role absorbs local material, the `researcher` role researches external sources, and one read-only consultation reconciles the plan | user | `plan.md` |
| 2026-10-30 | rc-g1: prior-campaign distillation | `grok` | `research/evidence.md` § Prior-campaign readings; `tenets.md` |
| 2026-10-30 | rc-g2: source terrain as of `1e82d145` | `grok` | `designs/records.md`; `designs/compaction.md`; `designs/context.md` |
| 2026-10-30 | rc-g3: reuse map, conventions, and instruments | `grok` | `designs/context.md`; `designs/measurement.md` |
| 2026-10-30 | rc-r1: compaction research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-r2: records and memory research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-r3: versioned-context research | `researcher` | `research/evidence.md` § External claims; § DeltaDB |
| 2026-10-30 | rc-r4: skills, memories, instructions, and authority research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-r5: cache performance research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-digest: evidence digest of rc-r1 to rc-r5 | `distiller` | `research/evidence.md` |
| 2026-10-30 | rc-digest verification: claims C01 to C31 re-fetched from their primary sources, one lane per claim | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | objective-bench liveness probe; the objective `analyst` lane ran on the subjective lane's engine (O3) | `analyst` | this ledger; `plan.md` § Rulings, O3 |
| 2026-10-31 | rc-d planner: blind design proposal, subjective lane | `planner` | `designs/` |
| 2026-10-31 | rc-d analyst: blind design proposal, objective lane | `analyst` | `designs/` |
| 2026-10-31 | rc-consult: read-only consultation the user named, reconciling the two proposals | `planner` | `plan.md` |
| 2026-10-31 | rc-w: draft of these records | `opus` | every file in this folder |
| 2026-10-31 | rc-c: conformance check of these records (one blocking finding, the repository URLs; one minor) | `checker` | `plan.md` § Repositories; `designs/records.md` |
| 2026-10-31 | rc-v: coverage review of these records (one blocking finding, the release cycle that a second Agent release for `ask` resolves; fifteen minor) | `reviewer` | `plan.md`; `designs/records.md`; `designs/compaction.md`; `designs/context.md`; `designs/measurement.md` |
| 2026-10-31 | rc-briefs: first-wave briefs for rc-p1, rc-u1, rc-u2, and rc-a8 (the drafting lane ran one no-op command against its brief; it read and changed nothing) | `opus` | `plan.md` § State and § Sequence (rc-u1 and rc-a8 owned files) |
| 2026-10-31 | rc-briefs check: conformance of the four briefs against the dispatch skill | `checker` | `plan.md` § Sequence |
| 2026-10-31 | decisions Q1 to Q5 ruled: `Memo`; the repeat-rule compaction arm as the baseline; the managers in 0.0.35 with the toolbox tools and Authority `ask` deferred; the GPU allowance left to the Orchestrator; no hosted provider, the smallest local models as the target | user | `plan.md` § Decisions, O9, O10, D20; `tenets.md` § Evaluation; `designs/measurement.md` § Models and § GPU allowance |
| 2026-10-31 | rc-briefs-2: briefs for rc-u5 and rc-u7, which widened four owned-file cells (the drafting lane again ran one no-op command against its brief; it read and changed nothing) | `opus` | `plan.md` § Sequence (rc-u5, rc-u7, rc-u8, rc-u9 owned files; the guide-row rule) |
| 2026-10-31 | rc-briefs-2 check: conformance of the two briefs against the dispatch skill | `checker` | `plan.md` § Sequence |
| 2026-10-31 | rulings: the 2B subject confirmed ("Sounds good, we can start with the 2b model"); Authority `ask` and security integrated in the earliest Agent release, apart from the toolbox wave | user | `plan.md` O2, O10; § Decisions, Q3 |
| 2026-10-31 | rc-g4: trust-surface map (content inlets, elevation paths, tool-call gates, denial handling) as of `2da6d0b6` | `grok` | `designs/authority.md`; `designs/layout.md` § Boundary |
| 2026-10-31 | rc-r6 to rc-r8: runtime-enforceable injection defenses, approval and permission models, and small-model security behavior | `researcher` | `research/evidence.md` § External claims, C32 to C41 |
| 2026-10-31 | rc-d2 planner: blind security design proposal, subjective lane (its search printed match lines from a directory that `tenets.md` § Evaluation excludes, without opening a file; later briefs exclude that directory from the search glob) | `planner` | `designs/authority.md` |
| 2026-10-31 | rc-d2 analyst: blind security design proposal, objective lane on the subjective lane's engine (O3) (the same search deviation as the rc-d2 planner) | `analyst` | `designs/authority.md` |
| 2026-10-31 | rc-consult2: read-only consultation the user named, reconciling the two security proposals | `planner` | `designs/authority.md`; `plan.md` O14, D5, D21 to D31 |
| 2026-10-31 | ruling: the `system` message carries host-authored text only, and the rest of the request is ordered and formed so a small model digests it | user | `plan.md` O11; `tenets.md` § Trust |
| 2026-10-31 | rc-g5: prompt-layout census (exact strings, order, rendered layouts per study arm, wire form) | `grok` | `designs/layout.md` |
| 2026-10-31 | rc-r9 and rc-r10: Ollama's qwen3.5 renderer against Qwen 3.5's chat template, and small-model context placement, order, and form | `researcher` | `research/evidence.md` § External claims, C42 to C47 |
| 2026-10-31 | rc-d3 planner: blind layout design proposal, subjective lane | `planner` | `designs/layout.md` |
| 2026-10-31 | rc-d3 analyst: blind layout design proposal, objective lane on the subjective lane's engine (O3) | `analyst` | `designs/layout.md` |
| 2026-10-31 | rc-verify-2: claims C32 to C47 re-fetched from their primary sources, one lane per claim (14 confirmed, 2 partly, 0 refuted) | `researcher` | `research/evidence.md` § External claims |
| 2026-10-31 | rc-consult3: read-only consultation the user named, reconciling the two layout proposals and merging the sequence with the security unit | `planner` | `designs/layout.md`; `plan.md` O12, O13, O15, § Sequence, D32 to D38, Q6 |
| 2026-10-31 | checks of the security consultation's inputs: tool annotations, the MCP mapping, the unset toolbox annotations, Ollama's `allowed` test, the registry's `Promise.all`, `raceSignal`, and the event-map rule | Orchestrator | `plan.md` F4 to F9 |
| 2026-10-31 | rc-amend: amendment of these records with O2 restated, O10 amended, O11 to O17, F4 to F9, Q6, and the two consultations | `opus` | every file in this folder |
| 2026-10-31 | rc-amend check: conformance of the amended records (one blocking finding, closed deferrals left in the table; three minor), all applied | `checker` | `plan.md` § Deferred; `ledger.md`; `designs/measurement.md` |
| 2026-10-31 | rc-amend review: coverage and correctness of the amended records (one blocking finding, the rc-s1 dependency cycle; seven minor, among them the no-handler note, which O16's `Authority` settles on 2026-10-31 by rejecting into the `unanswered` note), all applied; the review lane ran one no-op command against its brief, reading and changing nothing | `reviewer` | `plan.md` § Sequence and § Parallelism; `designs/authority.md`; `designs/measurement.md` |
| 2026-10-31 | rulings: Q6 approved ("approved on `consequential`"), and every check runs on the newest Node 22 release at the start of the run, recorded in its run record, unless a package requires 24 | user | `plan.md` § Decisions, O18; `tenets.md` § Host; `designs/authority.md` |
| 2026-10-31 | rc-briefs-3: briefs for rc-a14 and rc-u10, each with its owned-file delta; the rc-a14 drafting lane ran one no-op command against its brief, reading and changing nothing | `opus` | `designs/authority.md` (an absent `ask` property counts as unanswered); `designs/layout.md`, `designs/records.md`, and `designs/measurement.md` (trim prices the system text, the tail, and the request copy) |
| 2026-10-31 | rc-briefs-3 check: conformance of the two briefs against the dispatch skill | `checker` | `plan.md` § Sequence |
| 2026-10-31 | ruling: ride out no model run; fail fast, keep fixing while a run is live, and track the quality of each run's inputs and outputs to gauge whether fixes work | user | `designs/runs.md` § Ruling; `plan.md` O19 to O22 |
| 2026-10-31 | rc-g6: Study run-operations map (lifecycle, live observation, bounds and stops, seeding, replay, grading as evidence arrives, concurrency, gaps); its search printed four lines from a file in a directory that `tenets.md` § Evaluation excludes, which it did not use, and later briefs name the `studies/` subfolders to search | `grok` | `designs/runs.md` |
| 2026-10-31 | rc-r11: early stopping, sequential and anytime-valid testing, live monitoring, seeded and replayed evaluation, and canary subsets | `researcher` | `research/evidence.md` § External claims, C48 to C51; `designs/runs.md` |
| 2026-10-31 | rc-d4 planner: blind run-operations design proposal, subjective lane (its report records no `studies/` search deviation; it ran over the brief's size cap and was read as returned) | `planner` | `designs/runs.md` |
| 2026-10-31 | rc-d4 analyst: blind run-operations design proposal, objective lane on the subjective lane's engine (O3) (its report records no `studies/` search deviation) | `analyst` | `designs/runs.md` |
| 2026-10-31 | rc-consult4: read-only consultation the user named, reconciling the two run-operations proposals | `planner` | `designs/runs.md`; `plan.md` O19 to O25, D39 to D48, Q7 to Q10 |
| 2026-10-31 | rc-verify-3: claims C48 to C51 re-fetched from their primary sources, one lane per claim (3 confirmed, 1 partly, 0 refuted) | `researcher` | `research/evidence.md` § External claims |
| 2026-10-31 | rc-amend-runs: amendment of these records with O19 to O25, Q7 to Q10, D39 to D48, C48 to C51, and the run-operation units | `opus` | `designs/runs.md`; `plan.md`; `designs/measurement.md`; `designs/records.md`; `research/evidence.md`; `README.md`; `ledger.md` |
| 2026-10-31 | rc-amend-runs-fix: the 33 findings applied as ruled (deviation notes kept and reworded); the Orchestrator replaced the c1 partial-replies reading with the source's wording (`692e551:RESULTS.md`, "half of the replies hit the reserve") | `opus` | `designs/runs.md`; `plan.md`; `designs/measurement.md`; `research/evidence.md`; `tenets.md`; `ledger.md` |
| 2026-10-31 | rc-amend-runs-fix closure: every finding resolved | `checker` | `ledger.md` |
| 2026-10-31 | rulings: Q7 ("work on the release as needed"; the campaign's Study release is 0.0.9), Q8 and Q9 approved, Q10 as recommended (no CPU lane beside a GPU segment); the answer-key files and the `studies/` organization to be reassessed | user | `plan.md` § Decisions; `tenets.md` § Host |
| 2026-10-31 | ruling: the answer-key files go to an untracked `tmp/` home when no later unit needs them; the `studies/` tree is reorganized to follow conventions; generated study output lives in an untracked `tmp/` home | user | `plan.md` O26, O27; `tenets.md` § Evaluation |
| 2026-10-31 | rc-g7: `studies/` organization map (conventions, the layout of each study folder, every consumer of every study file, departures, the answer key's role as the files naming it state, generated output) | `grok` | `plan.md` O26, O27; § Units, row rc-u12 |
| 2026-10-31 | rc-d5 planner: blind studies-organization design proposal, subjective lane (its repository-wide filename-only search printed nothing from the directory that `tenets.md` § Evaluation excludes) | `planner` | `plan.md` O26; § Units, row rc-u12 |
| 2026-10-31 | rc-d5 analyst: blind studies-organization design proposal, objective lane on the subjective lane's engine (O3) (its repository-root file listing printed the three file names in the directory that `tenets.md` § Evaluation excludes, without opening a file) | `analyst` | `plan.md` O27; § Units, row rc-u12 |
| 2026-10-31 | rc-consult5: read-only consultation reconciling the two studies-organization proposals | `planner` | `plan.md` O26 to O28, Q11, Q12, § Units (rc-u12, rc-p1, rc-a8, rc-s1, rc-p2, rc-a17, rc-a9, rc-a10), § Parallelism; `designs/measurement.md`; `designs/runs.md`; `tenets.md` § Evaluation |
| 2026-10-31 | rulings: tracked files and folders take single-word names, kebab-case only for generated files and anything under `tmp/`, and an ignored file or folder lives under `tmp/` with no `.gitignore` pattern reaching into a tracked folder; Q11 approved; Q12 called sensible, with its home, the user-level settings file, awaiting the user's OK | user | `plan.md` O29, § Decisions (Q11, Q12) |
| 2026-10-31 | rc-consult6: read-only consultation on single-word tracked names and per-segment runs: the final rc-u12 move table, segment selection and seed custody in Study (rc-st3), and Q12's home | `planner` | `plan.md` O26 amended, O29, O30, Q12, D40, D42, D49, § Units (rc-u12, rc-s1, rc-p2, rc-a17, rc-st3, rc-a9, rc-a10), § Parallelism, § Release; `designs/runs.md`; `designs/measurement.md` |
| 2026-10-31 | rc-naming-close: the closing pass (Study 0.0.9 carries rc-st1 and rc-st3 before rc-a9, rc-p3 retired, rc-st2 to Study 0.0.10; rc-a17 owns the checkpoint cap and moves to S6; one closure per lineage per arm profile) and its closure check, all items resolved | `opus` | `plan.md`; `designs/runs.md`; `designs/measurement.md`; `README.md` |
| 2026-10-31 | ruling: the naming rule refined in the scaffold session (tracked JSON single-word; kebab-case only where a convention requires it; dot folders exempt) | user | `plan.md` O29 |
| 2026-10-31 | ruling: commits stay local on `main` until the work is sure and ready to publish | user | `plan.md` O31 |
