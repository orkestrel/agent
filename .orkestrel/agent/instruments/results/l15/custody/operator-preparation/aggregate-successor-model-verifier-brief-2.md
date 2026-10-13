# Verify prepared calibration operators

## Role and engine
Verifier on native GPT-6 Luna. Execute yourself and spawn nothing.

## Objective
Independently compare the prepared g4/q2/g2 command plans with their fixed prior operators, without executing any planned command or modifying the plans/runner.

## Context
- Evidence: `tmp/units/aggregate-successor-model-preparation-report.md` returns the prepared paths and SHA256 seals. Root read both complete successor scripts and the actual runner diff against the accepted Q4 runner; allowed deltas are key selection and explicit plan seal, with preserved custody/exit/absence mechanics.
- Law: `AGENTS.md`, `.agents/orchestration.md`, quality/portability/writing rules, `.agents/skills/orkestrel-dispatch/SKILL.md`.
- Primitives: contract guards, node assertions, emitted hash/build readers if needed; no new framework.
- Host: Windows PowerShell, explicit cwd C:/Users/mikes/WebstormProjects/scaffold. Source/build/HEAD 5ef0eb4fa719386ab7ba9c2dba542552231e6c8e frozen during live full view.
- Standing conditions: one live model workload; source/build/service and prepared artifacts read-only.

## Unknowns
Whether all actual JSON bytes preserve the accepted operators exactly.

## Scope
- Owned: aggregate-successor-model-verifier check/capture/report files under tmp/units only.
- Shared: the preparation report, prepared plans/scripts and `tmp/units/aggregate-final-calibration-command-plan-2.json` read-only.
- Off-limits: any generated command or runner execution, plan preparer rerun, source/build mutation, Git mutation, model/network/service calls, installation/publication, answer/label content.
- Made false: none.
- Tools: one bounded TypeScript conformance reader; bare captured stdout/stderr, exit/duration and hash checks. No extra gate/test suite.

## Execution
Preserve the stopped report, reader, and captures. Root read the reader, full stderr, and actual plan: only the root/results/deployment metadata stores forward slashes; command and label paths retain backslashes. Create a successor reader and captures with suffix -2. Compare these metadata paths with node:path resolve on both sides. Leave exact operator, seed/settings, label, seal, absence, and changed-operator comparisons unchanged. This correction is confined to the verifier; do not modify the prepared plans. Read and return the complete actual output even when it fails. Do not run a separate typecheck, gate suite, or model call.

Check actual plan/script hashes against the report. For each key, require exactly its think0 freeze, think1 freeze, corpus, generation and held fit in order. Compare each actual command object to its matching prior object after only l14-to-l15 path rebinding, deployment filename replacement, endpoint suffix insertion and local sequence renumbering. Check seed/settings/label bindings, cap 240 for freeze/corpus/fit and 1800 for generation, explicit endpoint 11435, and absent key-specific canonical outputs/cache/log/PID/status plus future sequence/custody destinations. Keep existing Q4 outputs permitted. Reject an in-memory changed operator as a control. Do not execute source scripts. Capture complete output and return; no semantic methodology review. Execute yourself and spawn nothing.

## Output
Completed aggregate-successor-model-verifier-report-2.md with actual per-key checks, artifact seals, exit/duration, raw captures and resolving root-relative citations. Distinguish the prior reader's failed path comparison from this result. Root owns acceptance and future launch.

## Deviation contract
Stop on mismatch or missing evidence. Return expected/found/evidence/done and one hypothesis; do not fix prepared artifacts. Settle private capture formatting only.

## Acceptance criteria
1. Actual hashes and exact operator/label comparison.
2. Absent future destinations and changed-operator refusal.
3. Bare captured result, no measurement execution.

Observations: none.
Measurement: command conformance only.
Review evidence: accepted predecessor plus root-read mechanical adaptations; this is the single independent check of prepared JSON.
