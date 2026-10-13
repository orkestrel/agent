# Admission screen conformance successor

The prescribed ranking syntax correction is prepared under `tmp/units/aggregate-admission-screen-r2`. Initial source, preparation artifacts, verification record, and report match their pre-unit SHA-256 readings. The successor reuses the existing proofs unchanged. Live execution remains unmeasured; independent verification and review remain pending.

## Bind the successor

See the [successor packet](aggregate-admission-screen-r2/packet-final.json), [successor preparation plan](aggregate-admission-screen-r2/plan-final.json), and [captured command outcomes and initial hash readings](aggregate-admission-screen-r2/verification.json).

| Subject | SHA-256 |
| --- | --- |
| Successor packet | `5bcb670e5304dce5fd688500f1a8e62e1edbc01f14124513441ead0a51bb6470` |
| Successor operator | `75d4de27ef8f82e76ce80ae04b7f1281d217934bfa1359ff0e1ca652baa6b159` |
| Initial packet, unchanged | `8b179eb3a5599f70d7fb725488a83d9589db1cc31e34897e223e8d729117c79f` |
| Initial report, unchanged | `24bc028d8f6d31971c9b767c9c4f403b77671aec0d52553f1f735f46e7035452` |

The source delta is the following replacement in `helpers.ts` at the ranking loop. Every other copied source/config file is byte-identical to its initial counterpart. The source/config inventory is `types.ts`, `constants.ts`, `helpers.ts`, `Operator.ts`, `main.ts`, `prepare.ts`, `offline.config.ts`, `proof.test.ts`, `negative.test.ts`, and `tsconfig.json`.

```diff
-	for (const [offset, pass] of [[0, 'forward'], [4, 'reverse']] as const) {
+	for (const offset of [0, 4]) {
+		const pass = offset === 0 ? 'forward' : 'reverse'
```

Path mapping changes the owned directory prefix from `tmp/units/aggregate-admission-screen/` to `tmp/units/aggregate-admission-screen-r2/`. The unchanged `UNIT` calculation resolves the successor location. The fixed specification, accepted diagnostic packet, source/build, reused recorder/completion imports, and external byte bindings retain their initial paths. Create-only artifacts were generated in the successor directory, including the identical proof preparation under `proof-preparation-31564/` and the occupied-output fixture under `proof-occupied-31564/`.

## Read the scoped checks

Scoped types, authored TypeScript syntax, preparation, and default entry checks exited 0. Positive proofs reported `pass 5`, `fail 0`, `skipped 0`, and `todo 0`, duration 346.1153 ms on Windows with Node `v24.21.0`. The existing negative controls reported `pass 0`, `fail 7`, `skipped 0`, and `todo 0`, exit 1 as required, duration 211.1889 ms. Root's resource lane was active during the scoped run; no performance inference is made. Both preparation and the default entry recorded global-fetch attempts 0 and native dispatches 0.

The initial file hash readings were repeated after the scoped checks and matched. The verification artifact records the exact initial paths and hashes with the comparison result. No initial file was overwritten or removed. No model call, installation, git mutation, or cleanup ran.

The observed final git status named the pre-existing tracked Driver edit and root's independent resource output. This unit authored only the successor tmp inventory and report.

```text
 M .orkestrel/agent/instruments/bench4/Driver.mjs
?? .orkestrel/agent/instruments/results/l7/g4-think0/resource/
```

## Run the independent offline commands

Run these commands from `C:/Users/mikes/WebstormProjects/scaffold`. The negative suite must exit 1 with every named control collected. The other commands must exit 0. The preparation verification destination must be vacant.

```text
node node_modules/typescript/bin/tsc --noEmit -p tmp/units/aggregate-admission-screen-r2/tsconfig.json
node --check tmp/units/aggregate-admission-screen-r2/types.ts
node --check tmp/units/aggregate-admission-screen-r2/constants.ts
node --check tmp/units/aggregate-admission-screen-r2/helpers.ts
node --check tmp/units/aggregate-admission-screen-r2/Operator.ts
node --check tmp/units/aggregate-admission-screen-r2/main.ts
node --check tmp/units/aggregate-admission-screen-r2/prepare.ts
node --check tmp/units/aggregate-admission-screen-r2/offline.config.ts
node --check tmp/units/aggregate-admission-screen-r2/proof.test.ts
node --check tmp/units/aggregate-admission-screen-r2/negative.test.ts
node --test tmp/units/aggregate-admission-screen-r2/proof.test.ts
node --test tmp/units/aggregate-admission-screen-r2/negative.test.ts
node tmp/units/aggregate-admission-screen-r2/offline.config.ts
node tmp/units/aggregate-admission-screen-r2/prepare.ts --output C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-admission-screen-r2/verification-preparation
```

## Reserve the live command

The intended later command is the following; it has not run. Its destination must be vacant.

```text
node tmp/units/aggregate-admission-screen-r2/main.ts --execute --packet 5bcb670e5304dce5fd688500f1a8e62e1edbc01f14124513441ead0a51bb6470 --build 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf --operator 75d4de27ef8f82e76ce80ae04b7f1281d217934bfa1359ff0e1ca652baa6b159 --output C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-admission-screen-r2/live-forward-reverse
```

No scope conflict remains. This report carries builder evidence only, with no independent gate acceptance or live ordering claim.
