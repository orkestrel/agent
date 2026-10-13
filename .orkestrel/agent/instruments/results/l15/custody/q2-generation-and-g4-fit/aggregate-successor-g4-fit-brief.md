# Execute the fixed offline Gemma4 calibration fit

## Role and engine

Verifier on native GPT-6 Luna. Execute yourself and spawn nothing.

## Objective

Run the fixed offline l15 Gemma4 fit once against root-adjudicated labels and return the actual acceptance or refusal, diagnostics, costs, and custody.

## Context

- Evidence: root accepted the clean audit unchanged after source review in `tmp/units/aggregate-successor-g4-adjudication.md`. The materializer `tmp/units/aggregate-successor-g4-labels.ts` exited 0, validated through emitted isRefitLabels/verifyLabels, and wrote wrapper SHA 09d8e5171e2d65dd1a65fd85cc571a13984d03705b4370fc7e63c8c4ae95d819. It measured 179 labels: 136 supported, 15 contradicted, 28 ambiguous. Original array SHA 51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf. Generation is complete and committed at current HEAD 34cacc767afd55db97b611645c3e5e7e5c4ab3a2. The command is the existing fifth entry in the accepted model-g4 plan.
- Law: `AGENTS.md`, `.agents/orchestration.md`, `.claude/rules/quality.md`, `.claude/rules/portability.md`, `.claude/rules/writing.md`, `.agents/skills/orkestrel-dispatch/SKILL.md`, and `.agents/skills/orkestrel-dispatch/references/launch.md`.
- Installed primitives: accepted emitted refit command and its build/frozen/generation/label/fit readers. Reuse them; no new validation framework.
- Host: Windows PowerShell, cwd C:/Users/mikes/WebstormProjects/scaffold. Build SHA 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc. Frozen g4-think0 SHA 9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36.
- Standing conditions: Qwen2 generation owns the sole campaign model workload at endpoint 11435. This fit is offline. Source, build, HEAD, frozen inputs, both services, labels, and other outputs are immutable. Preserve the separate user service PID32104. Existing bench4 Driver.mjs and nested harness .orkestrel dirt are unowned. Use TypeScript launch/capture helpers; no inline PowerShell process wrapper.

## Unknowns

Strict/exploratory acceptance and recall are unknown. Report the actual result; never tune labels, regenerate, or retry after refusal.

## Scope

- Owned: l15 calibration g4 fit destination, g4-calibration-fit log/error/PID/status captures, and aggregate-successor-g4-fit evidence/report files under tmp/units.
- Shared: source/build/input material is read-only.
- Off-limits: source edits, build, Git mutation, model calls, service changes, installation, publication, label edits, resource/full/pilot execution, retries, and semantic regrading.
- Made false: none.
- Tools: sealed-input reads, fixed capped operator, emitted validation, bare output and PID closure, citation checking.

## Execution

Verify prerequisite seals and absent fit/output/log/error/PID/status destinations. Retain before/after custody. Execute yourself and spawn nothing. Run exactly:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal .orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl --errors .orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.err --cap 240 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/refit.js fit --frozen .orkestrel/agent/instruments/results/l15/g4-think0/freeze/manifest.json --corpus .orkestrel/agent/instruments/results/l15/calibration/g4/corpus --attempts .orkestrel/agent/instruments/results/l15/calibration/g4/generation --labels .orkestrel/agent/instruments/results/l15/calibration/g4/labels.json --model gemma4:e4b-it-q4_K_M --out .orkestrel/agent/instruments/results/l15/calibration/g4/fit --url http://127.0.0.1:11435
```

Absent destinations are intentionally create-only. Read complete bare output at closure. Validate actual diagnosis and emitted fits with existing readers. Report strict/exploratory outcomes separately, lexical failures, supported denominators, unique-context recall when supplied, every score/cost error, manifest hashes, exit/cap/duration, and process closure. No inference requests are authorized.

## Output

Completed aggregate-successor-g4-fit-report.md under tmp/units with exact command, input/output hashes, raw logs, process/exit/cap/duration, fit/refusal and limitations, and cite.ts result. Root decides pilot release.

## Deviation contract

Stop on custody mismatch, occupied paths, unexpected live access, operational failure, or unowned change. Return expected/found/evidence/done and one hypothesis. Settle report formatting only.

## Acceptance criteria

1. Exact seals and absent destinations.
2. One capped execution with unfiltered output.
3. Output validation, costs/custody, and process closure.

Observations: retain the fixed command plan's 240-second offline cap.

Measurement: generated support calibration, not task quality or adoption.

## Review evidence

Source correction and command plan already accepted. Root settled the blind label ambiguities from actual candidates and source-local evidence. No new mechanism or criterion is proposed.
