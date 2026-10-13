# Execute the fixed offline Gemma2 calibration fit

## Role and engine

Verifier on native GPT-6 Luna. Execute yourself and spawn nothing.

## Objective

Run the fixed offline l15 Gemma2 fit once against root-adjudicated labels and return the actual acceptance or refusal, diagnostics, costs, and custody.

## Context

- Evidence: root accepted the independent audit with the original analyst's sealed fragment addendum after complete source review in `tmp/units/aggregate-successor-g2-adjudication.md`. The materializer `tmp/units/aggregate-successor-g2-labels.ts` exited 0, validated through emitted isRefitLabels/verifyLabels, and wrote wrapper SHA d4c33651a0db676d2b1498224e93613ece7b11b654814f6922c75c3ccd88fa10. It measured 174 labels: 132 supported, 20 contradicted, 22 ambiguous. Original array SHA 5f2c0c2a781a9e3888b07e17ee9a3fd484984be9a0916c37d6514fcb7ce7a923. Generation is complete and committed at current HEAD 4acb51125833e96aa771574ce248f49cc9ebddc0. The command is the existing fifth entry in the accepted model-g2 plan.
- Law: `AGENTS.md`, `.agents/orchestration.md`, `.claude/rules/quality.md`, `.claude/rules/portability.md`, `.claude/rules/writing.md`, `.agents/skills/orkestrel-dispatch/SKILL.md`, and `.agents/skills/orkestrel-dispatch/references/launch.md`.
- Installed primitives: accepted emitted refit command and its build/frozen/generation/label/fit readers. Reuse them; no new validation framework.
- Host: Windows PowerShell, cwd C:/Users/mikes/WebstormProjects/scaffold. Build SHA 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc. Frozen g2-think0 SHA 470d01c30a1a91e87f6bfd022508487bce1574fb7f31e44229298cbbcc8ec9b9.
- Standing conditions: Gemma4 records resource owns the sole campaign model workload at endpoint 11435. This fit is offline. Source, build, HEAD, frozen inputs, both services, labels, and other outputs are immutable. Preserve the separate user service PID32104. Existing bench4 Driver.mjs and nested harness .orkestrel dirt are unowned. Use TypeScript launch/capture helpers; no inline PowerShell process wrapper.

## Unknowns

Strict/exploratory acceptance and recall are unknown. Report the actual result; never tune labels, regenerate, or retry after refusal.

## Scope

- Owned: l15 calibration g2 fit destination, g2-calibration-fit log/error/PID/status captures, and aggregate-successor-g2-fit evidence/report files under tmp/units.
- Shared: source/build/input material is read-only.
- Off-limits: source edits, build, Git mutation, model calls, service changes, installation, publication, label edits, resource/full/pilot execution, retries, and semantic regrading.
- Made false: none.
- Tools: sealed-input reads, fixed capped operator, emitted validation, bare output and PID closure, citation checking.

## Execution

Verify prerequisite seals and absent fit/output/log/error/PID/status destinations. Retain before/after custody. Execute yourself and spawn nothing. Run exactly:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal .orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl --errors .orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.err --cap 240 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/refit.js fit --frozen .orkestrel/agent/instruments/results/l15/g2-think0/freeze/manifest.json --corpus .orkestrel/agent/instruments/results/l15/calibration/g2/corpus --attempts .orkestrel/agent/instruments/results/l15/calibration/g2/generation --labels .orkestrel/agent/instruments/results/l15/calibration/g2/labels.json --model gemma4:e2b-it-q4_K_M --out .orkestrel/agent/instruments/results/l15/calibration/g2/fit --url http://127.0.0.1:11435
```

Absent destinations are intentionally create-only. Read complete bare output at closure. Validate actual diagnosis and emitted fits with existing readers. Report strict/exploratory outcomes separately, lexical failures, supported denominators, unique-context recall when supplied, every score/cost error, manifest hashes, exit/cap/duration, and process closure. No inference requests are authorized.

## Output

Completed aggregate-successor-g2-fit-report.md under tmp/units with exact command, input/output hashes, raw logs, process/exit/cap/duration, fit/refusal and limitations, and cite.ts result. Root decides pilot release.

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

Use the checkout TypeScript dispatcher at .agents/skills/orkestrel-dispatch/scripts/launch.ts; do not substitute an installed or dist path in this scaffold checkout. Copy tmp/units/aggregate-successor-g4-fit-read.ts to the owned aggregate-successor-g2-fit-read.ts with only literal g4-to-g2 paths and output identities changed. Preserve every predicate, including the conditional fit-file presence check for accepted versus refused outcomes. Return its exact diff and complete validation captures. The exact model tag gemma4:e2b-it-q4_K_M was read from the accepted model-g2-plan.json fifth entry; do not substitute an alias. Root resolved the fragment cases and sealed the wrapper before fitting.
