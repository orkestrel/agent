# Unit aggregate-successor-q4-fault-read — Read the retained pilot through sustained admission without inference

Read saved evidence only. No model execution or source change.

## Role and engine

Verifier on native GPT-6 Luna high through Codex. Executor: NATIVE_SUBAGENT.

## Objective

Capture the actual existing sustained admission result for the retained operationally failed q4-think0 pilot, and the classification of its failed requests.

## Context

- **Evidence.** `.orkestrel/agent/instruments/results/l15/q4-think0/pilot/manifest.json` retains judge request302 and flush315 HeadersTimeout faults. Root read readPilotFeasibility, verifyMatrixFeasibility, and readRequestOutcome. Their operational-refusal path is defined; this is an exact raw-evidence observation, not an audit.
- **Law.** `AGENTS.md`, `.agents/orchestration.md`, quality/portability/TypeScript/writing rules, `.agents/skills/orkestrel-dispatch/SKILL.md` and its launch reference.
- **Installed primitives.** Existing emitted readPilotFeasibility, readAttempt or parseMatrixRun, isStoppedRequest, readRequestOutcome, hashFile, and validators under `.orkestrel/agent/instruments/harness/.build/bench5/`. Read the matching signatures before use. Never duplicate their logic.
- **Host.** Windows PowerShell; every exec cwd C:/Users/mikes/WebstormProjects/scaffold.
- **Standing conditions.** HEAD b33dc98e13f589b0196b9f1aad9bd100306926f5, fixed accepted build. Gemma4 aggregate is live; its files are off limits. Both services, including PID32104, remain untouched. Root owns Git/prose.

## Unknowns

Whether the exact saved pilot returns a feasibility boolean or throws, and whether its failed requests are stopped exclusions. Report the actual outcome without forcing the expected answer.

## Scope

- **Owned.** Only aggregate-successor-q4-fault-read-prefixed TypeScript saved-evidence reader, complete captures, and report under tmp/units.
- **Shared (read-only).** Named Q4 pilot and prerequisite evidence, emitted helpers/signatures.
- **Off-limits.** Canonical source/build, all model calls, services, active Gemma4 files, unrelated runs, prior quality grades, Git mutations, installs, publication, cleanup, and new driver/validators.
- **Made false by this change.** None; reading evidence only.
- **Tools and limits.** Existing helpers, exact file/byte checks, syntax check, tracked launch under cap180 seconds, captures, and citations.

## Execution

Perform the assignment yourself and spawn nothing. Validate the manifest shape using existing guards and preserve its exact frozen/resource reference objects. Call readPilotFeasibility exactly once and print either its boolean result or the thrown error message without relabeling it. Decode the same raw run through an existing reader and report role, sequence, error, status, stopped classification, and readRequestOutcome for the failed requests. Do not print raw conversation content. Capture stdout/stderr/exit/duration through the existing dispatcher. Read complete bare captures and return the actual observation. No repeated inference or source change.

## Output

Return aggregate-successor-q4-fault-read-report.md under tmp/units, with exact command, helper result, selected failed-request classifications, hashes, exit/cap/duration, and preserved input checks. Check citations.

## Deviation contract

On missing evidence or a required unowned change, stop with expected/found/evidence/done and one hypothesis. Settle reader/capture presentation in scope.

## Acceptance criteria

1. Read helper signatures and validate saved input shape.
2. Execute the saved-evidence reader and preserve its actual result.
3. Return complete captures without inference, writes to input, or policy decision.

**Observations, not criteria.** Related saved full admission took37892ms; cap180seconds includes slack. Duration is operational only.

**Measurement.** Actual retained raw pilot requests only; no model or quality measurement.

## Review evidence

Root reads the complete report, reader, and captures before deciding the bounded next measurement.
