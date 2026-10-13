# Validate Qwen4 thinking-enabled command plan

## Role and engine
Verifier on native GPT-6 Luna. Execute yourself and spawn nothing.

## Objective
Run the existing prepared cell driver in dry mode for q4-think1 with the accepted strict fit and current HEAD; return the exact ready commands and absence/custody checks, without executing any model work.

## Context
- Evidence: root read and accepted `tmp/units/aggregate-successor-cell-run.ts` and its preparation report. Strict fit hash 46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8; current released HEAD 5ef0eb4fa719386ab7ba9c2dba542552231e6c8e. Thinking-enabled freeze SHA 8c9f816203eb24a8ab3c9d87e94e3da5d841200d1737691fbb91c3596bac0b07.
- Law: `AGENTS.md`, `.agents/orchestration.md`, `.claude/rules/quality.md`, `.claude/rules/writing.md`, `.agents/skills/orkestrel-dispatch/SKILL.md`.
- Primitives: the accepted cell driver and its emitted readFrozen/readBuild/hashFile readers. Add no plan framework.
- Host: Windows PowerShell, cwd C:/Users/mikes/WebstormProjects/scaffold. Full-view q4-think0 is the sole live model workload. Dedicated endpoint port 11435.
- Standing conditions: source/build/HEAD/service, canonical inputs and all measurement outputs remain immutable. The existing bench4/nested harness dirt remains untouched.

## Unknowns
Whether the dry helper validates fit/frozen/build and reports all later outputs absent.

## Scope
- Owned: aggregate-successor-q4-thinking-plan raw stdout/stderr, exit/duration metadata, and report under tmp/units. A minimal TypeScript capture file under that prefix may launch the exact dry command with shell false and windowsHide true, preserving bare captures.
- Shared: accepted driver and inputs read-only.
- Off-limits: --live, model/network calls, fit execution, source edits/build, Git mutation, service changes, installation, publishing, retries, any stage output creation.
- Made false: none.
- Tools: exact dry command, captures, source-bound command comparison, cite.ts. No extra gates or test suites.

## Execution
Run once from scaffold:
```text
node tmp/units/aggregate-successor-cell-run.ts q4-think1 --head 5ef0eb4fa719386ab7ba9c2dba542552231e6c8e --fit 46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8
```
Read full captured output. Confirm q4-think1 identity/thinking, expected freeze/build/deployment/fit, all output/log/sequence destinations absent, resource/full/pilot ordering and caps, and explicit endpoint 11435 in each model command. Report exact live launch with HEAD revalidation required at future root release. Do not execute it. Execute yourself and spawn nothing.

## Output
Completed aggregate-successor-q4-thinking-plan-report.md under tmp/units with observed exit/duration, hashes, canonical source custody, raw plan path/hash, prepared command, prerequisites, and resolving citations.

## Deviation contract
Stop on dry-command failure, occupied outputs, custody mismatch, or any unexpected mutation/network request. Return expected/found/evidence/done and one hypothesis. Do not correct source or rerun. Settle report layout only.

## Acceptance criteria
1. Exact existing dry command and current input identities.
2. Exit/output truth and absent future paths.
3. Root-relative resolving citations; no model calls.

Observations: none.
Measurement: command preparation only, not a model result.
Review evidence: accepted driver and fixed operator plan; this checks bindings rather than proposing a change.
