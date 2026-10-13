# Exploratory matrix execution entry

The existing emitted `bench.js --manifest` entry supports exploratory copy1 through `phase: 'development'`. No canonical correction or additional runner is needed. The earlier lookup's separated-fit conclusion omitted the development branch: `readExecution` validates that branch and returns before the qualified fit gate; Driver constructs `{ agree, change, separated: false }` from its validated development policy. See the [emitted entry](.orkestrel/agent/instruments/harness/.build/bench5/bench.js:5), [emitted admission branch](.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js:497), and [emitted Driver branch](.orkestrel/agent/instruments/harness/.build/bench5/Driver.js:703).

This is source-contract analysis, not a runtime admission result. No fit, generation, inference, service operation, or gate ran. Only this report was written; no source, build, HEAD, historical evidence, or service was changed by this unit.

## Execute through the existing entry

From `C:/Users/mikes/WebstormProjects/scaffold`, the invocation for each cell and arm is the following. `ABS_EXECUTION_JSON` names the arm's immutable development execution JSON. `ABS_FRESH_CACHE` and `ABS_FRESH_RUN` name distinct absolute paths for that arm, with the run path absent and the cache fresh.

```text
node .orkestrel/agent/instruments/harness/.build/bench5/bench.js --run --live --copy 1 --manifest ABS_EXECUTION_JSON --cache ABS_FRESH_CACHE --out ABS_FRESH_RUN --url http://127.0.0.1:11435
```

The parser reads the execution manifest and derives the model, arm, thinking mode, reserve, and settings. It rejects conflicting flags and configuration or goal overrides. Driver additionally rechecks the effective development configuration before preparing the run. See [manifest parsing](.orkestrel/agent/instruments/harness/bench5/Driver.ts:389), [override refusal](.orkestrel/agent/instruments/harness/bench5/Driver.ts:428), and [effective configuration validation](.orkestrel/agent/instruments/harness/bench5/Driver.ts:817). Supply no `--fit`, `--study`, or `--goals` argument.

Each cache starts from the target freeze's seed. Driver refuses an existing development lineage and an unbound summary cache. The output directory must be absent. See [cache custody](.orkestrel/agent/instruments/harness/bench5/Driver.ts:1317) and [output creation](.orkestrel/agent/instruments/harness/bench5/Driver.ts:1548).

## Construct the admission artifacts

The production constructor inputs are the `MatrixDevelopment` and `MatrixExecution` object contracts, serialized as JSON. The emitted `hashFile` helper supplies each `{ path, hash }` reference; supply absolute paths because the helper retains its input path verbatim. There is no need to construct an exploratory `fit.json`. See [policy contract](.orkestrel/agent/instruments/harness/bench5/matrix/types.ts:113), [execution contract](.orkestrel/agent/instruments/harness/bench5/matrix/types.ts:101), and [emitted hash constructor](.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js:17).

The following object construction records the required artifact shape; it is not a runner. The uppercase names denote retained absolute artifact paths. `resource` is the validated cell resource manifest, `full` is its validated full-view manifest, and `frozen` is the validated target freeze. `ARM` is the selected `records`, `aggregate`, or `full` arm. Retain the accepted withholding policy when freezing the policy; omission of `withhold` means false.

```ts
const policy = {
  phase: 'development',
  frozen: hashFile(CELL_FREEZE),
  calibration: hashFile(CALIBRATION_FREEZE),
  diagnosis: hashFile(RETAINED_DIAGNOSIS),
  labels: hashFile(RETAINED_LABELS),
  packet: hashFile(RETAINED_PACKET),
  generation: hashFile(RETAINED_GENERATION_MANIFEST),
  resource: hashFile(CELL_RESOURCE_MANIFEST),
  full: hashFile(CELL_FULL_MANIFEST),
  agree: 0.61,
  change: 0.56,
  selection: 'highest-grid-majority-occurrences-and-identities',
  continuation: 'failed-goal-after-xml-function-parameter-error',
  limitation: 'seed-candidates-do-not-certify-diverged-history',
  paired: resource.budget,
  expanded: full.attempts[0].budget,
}
const execution = {
  protocol: 'l6',
  phase: 'development',
  key: frozen.key,
  think: frozen.think,
  arm: ARM,
  copy: 1,
  frozen: hashFile(CELL_FREEZE),
  budget: ARM === 'full' ? policy.expanded : policy.paired,
  development: hashFile(SAVED_POLICY_JSON),
}
```

Save the policy before hashing it into the execution, then save the execution for the command's `--manifest` argument. The established callers use these shapes and the same command flags; see [policy construction](.orkestrel/agent/instruments/harness/bench5/tests/refit/helpers.ts:166), [shared-calibration cell construction](.orkestrel/agent/instruments/harness/bench5/tests/development.test.ts:118), and [execution and flag construction](.orkestrel/agent/instruments/harness/bench5/tests/development.test.ts:1057). Those are inspected examples, not tests run by this unit. Do not invoke `writeDevelopmentFixture`: that helper creates fixture calibration and makes protocol-peer calls.

For L15, `CELL_FREEZE` is `.orkestrel/agent/instruments/results/l15/g4-think0/freeze/manifest.json` or its `g4-think1` counterpart. `CALIBRATION_FREEZE` must reproduce the generation's bound original freeze. The retained generation declares the G4 nonthinking calibration; see [generation identity](.orkestrel/agent/instruments/results/l15/calibration/g4/generation/manifest.json:6). The shared retained labels, packet, and generation manifest are under `results/l15/calibration/g4/`; use root's already accepted diagnosis. The `0.61` value is the brief's accepted G4 result, not an independent measurement by this unit. Admission rederives it and refuses a mismatch.

The nominal `results/l15/g4-think0/resource/manifest.json`, `g4-think0/full/manifest.json`, `g4-think1/resource/manifest.json`, and `g4-think1/full/manifest.json` paths were absent in this unit's direct `Get-Item` check. This observation does not establish absence at another path. Cell resource/full preparation is a prerequisite, not a missing implementation. The existing `matrix.js resource` and `matrix.js full` phases construct those artifacts; see [resource constructor](.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:232) and [full constructor](.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:263).

## Preserve the bindings and separation

The admission reader checks the following conditions.

- **Calibration and cutoff:** The policy binds the original calibration freeze separately from the target cell. Summarizer, judge, source files, settings, seed, and configuration must match. The generation must be complete, error-free, matrix-specific, and bound to that calibration and model. The retained diagnosis must reproduce its evidence, remain strictly refused without operational errors, and yield the policy's highest-grid majority cutoff. See [development calibration validation](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:544), [diagnosis recomputation](.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:579), and [cutoff derivation](.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:594). This supports sharing calibration across decision thinking modes without copying another model's cutoff.
- **Cell, model, and resources:** The execution key, thinking mode, and freeze must match exactly. The freeze validates source, settings, seed, deployment, role samplers, and recorded model digests; Driver also checks actual daemon digests before the trajectory. Resource evidence must be accepted and belong to that cell. The full bound is recomputed from its resource trace, with the deployment context ceiling; the full attempt must have valid raw evidence. A valid full-view refusal can be retained: development does not require `full.accepted === true`, but verifies the declared acceptance against its attempt and rejects operational faults. See [cell validation](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:525), [freeze validation](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:330), [resource and full-bound validation](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:576), [operational-fault refusal](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:1122), and [actual digest check](.orkestrel/agent/instruments/harness/bench5/Driver.ts:1565).
- **Qualified separation:** Development executions permit only copy1 and forbid top-level `fit`, `resource`, `full`, and `pilot` references; those references belong inside the policy. Policies reject `accepted` and `separated` claims. Qualified aggregate execution still requires a separated fit; evaluation additionally requires a qualified pilot, and the attempt reader expressly rejects development executions. See [execution and policy validators](.orkestrel/agent/instruments/harness/bench5/matrix/validators.ts:104), [qualified admission](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:671), and [attempt separation](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:418).

The run emits raw files and `run.json` with the development execution, budgets, seed/cache lineage, and nonseparated fit. Development terminal statuses remain explicit. The emitted `parseMatrixRun` reader revalidates development custody and complete ordered goal coverage. Pair matching and majority actual-body exposure remain separate post-run observations through existing helpers; launching the command does not establish them. See [run provenance](.orkestrel/agent/instruments/harness/bench5/Driver.ts:2111), [development statuses](.orkestrel/agent/instruments/harness/bench5/Driver.ts:1596), [emitted run reader](.orkestrel/agent/instruments/harness/.build/bench5/matrix/parsers.js:17), [pair comparison](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:1299), and [emitted exposure helper](.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js:927).

The bounded correction is to the operator lookup conclusion: replace “no exploratory aggregate-copy1 CLI” with the development-manifest invocation and prerequisites documented here. No source patch is proposed. The execution-entry question is closed; runtime admission, exposure, quality, and endurance outcomes are unmeasured by this unit.
