I'll read the brief and follow it exactly, then return the document it specifies.The brief is a read-only command map. I’ll locate the accepted direction and the bench5 sustained entries, then trace flags and admission only.The direction and the sustained entries are located. Next I’ll trace command parsing and the admission checks that can refuse each step.# Continuous comparison command map

Unexecuted. No operator, inference, service probe, or write ran. Every measured bench5 command below is the emitted twin under `.orkestrel/agent/instruments/harness/.build/bench5/`. `readBuild` refuses a source entrypoint and a stale manifest (`.orkestrel/agent/instruments/harness/bench5/build/helpers.ts:45-49`). The on-disk manifest’s single resource is `.orkestrel/agent/instruments/units/aggregates/endurance/manifest.json` (`.orkestrel/agent/instruments/harness/.build/build-manifest.json:2796-2800`). Outputs are create-only. Exit 3 is a retained feasibility refusal. A thrown error is an operational or custody fault and is not that refusal.

Placeholders in capitals are values root supplies. Paths below are from `C:/Users/mikes/WebstormProjects/scaffold`.

## Records baseline

Both arms call `createLedger` from `vendor/agent-0.0.30-trimmed/index.js` (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:64-79`). The constant is `VENDOR_AGENT` (`.orkestrel/agent/instruments/harness/bench5/constants.ts:4`). Every freeze hashes that file (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:288-301`). The endurance manifest hashes the same file and records it as the `estimateTokens` estimator (`.orkestrel/agent/instruments/units/aggregates/endurance/manifest.json:2-34`). The harness table names that file as a byte copy of published `@orkestrel/agent` 0.0.30 from `C:/Users/mikes/WebstormProjects/agent/dist/src/core/index.js` at `ee734c30151c7d431e480aff7a0d54306d387f13`, SHA-256 `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d` (`.orkestrel/agent/instruments/harness/README.md:71-73`). `vendor/agent/index.js` and `vendor/agent-0.0.30/index.js` are other builds (`.orkestrel/agent/instruments/harness/README.md:68-73`).

## Shared order and worlds

Rank is `q4`, `g4`, `q2`, `g2`, thinking false (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:48`, `:572-579`; `.orkestrel/agent/instruments/harness/bench5/sustained/Sustained.ts:185-186`). Tags: `q4` = `qwen3.5:4b-q4_K_M`, `g4` = `gemma4:e4b-it-q4_K_M`, `q2` = `qwen3.5:2b-q4_K_M`, `g2` = `gemma4:e2b-it-q4_K_M` (`.orkestrel/agent/instruments/harness/bench5/constants.ts:12-16`). Judge tag is `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` (`.orkestrel/agent/instruments/harness/bench5/constants.ts:20`). Default `--url` is `http://127.0.0.1:11434` (`.orkestrel/agent/instruments/harness/bench5/constants.ts:47`).

Authored worlds, already bound by the workload manifest:

| Role | Path | Manifest SHA-256 |
| --- | --- | --- |
| Development runtime | `.orkestrel/agent/instruments/units/aggregates/endurance/runtime/development.json` | `361b92cf427cd1edcd4f54fa4e349f174fc5ea896c4a68c86de50913fc00ca49` |
| Evaluation runtime | `.orkestrel/agent/instruments/units/aggregates/endurance/runtime/evaluation.json` | `e8b4143efbbc9251166852c2d993f6b1f0b3f44eaa181f0973c27878109a47f5` |
| Evaluation oracle | `.orkestrel/agent/instruments/units/aggregates/endurance/private/evaluation.json` | `249a307bcdf31664676626b45090f1ce58aff10de39a31dcf447cec821650e6b` |

Manifest measurements are development 128 goals / 32 shifts and evaluation 96 goals / 24 shifts (`.orkestrel/agent/instruments/units/aggregates/endurance/manifest.json:38-41`, `:186-189`). Limit math uses `runtime.goals.length` from those files (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:175-190`). Selection refuses equal development and evaluation identities (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:570-571`). Execution does not open the oracle (`.orkestrel/agent/instruments/harness/bench5/build/helpers.ts:116-151`).

Qualified selection is frozen before matrix answer-quality. The continuous pair runs after matrix stages (`.orkestrel/agent/instruments/units/aggregates/endurance-commands.md:15-17`; `.orkestrel/agent/instruments/units/aggregates/matrix-commands.md:108`; `.orkestrel/agent/instruments/units/aggregates/reports/resumption-comparison-completion-direction.md:23-39`). There is no command that switches routes. Exploratory work starts only from a complete refused qualified selection.

## Qualified route

### 1. Per-candidate freeze, resource, strict calibration, pilot

Built entry: `.build/bench5/matrix.js`. Parser: `.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:54-105`. Earliest refusal: `readBuild`, then missing phase/`--out`, then a model phase without `--live` (`:81-82`).

```text
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js freeze --out FREEZE_DIR --live --key KEY --think false --seed SEED_CACHE --settings SETTINGS --deployment DEPLOYMENT [--url URL]
```

Freeze refuses a missing key, think, seed, settings, or deployment (`:117-128`). It writes `manifest.json`, `tags.json`, and `transitions.json` (`:134-176`). Sustained later refuses `think: true`.

```text
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js resource --frozen FREEZE_DIR/manifest.json --out RESOURCE_DIR --live [--url URL]
```

Earliest phase refusal: missing `--frozen` (`:96-97`), then an unaccepted reserve ladder. Reserves are 512, 1024, 2048, 4096, 8192; window is `2560 + reserve` (`.orkestrel/agent/instruments/harness/bench5/matrix/constants.ts:2-5`; `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:257-264`). Exit 0 writes an accepted `manifest.json`. Exit 3 leaves it refused (`Matrix.ts:229-258`).

Strict matrix generation and fit use the same `refit.js` contract as endurance, without `--runtime` / `--classification`. A refused strict diagnosis whose generation has `sustained` absent can stand in for this candidate’s qualified failure (`verifyMatrixRefusal`, `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:398-422`). An accepted matrix fit does not establish sustained qualification (direction lines 23-25; development still requires its own endurance fit).

```text
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js full --frozen FREEZE --resource RESOURCE --out FULL_DIR --live [--url URL]
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js pilot --frozen FREEZE --resource RESOURCE --fit MATRIX_FIT --out PILOT_DIR --live [--url URL]
```

Full refuses an unaccepted resource (`:267-268`). Pilot refuses an unaccepted reserve (`:319-320`) and a fit that is not separating and cell-exact (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:671-687`). Pilot exit 0 requires paired records evidence and majority nonempty body exposure (`Matrix.ts:335-362`).

### 2. Classification ancestry

Built entry: `.build/bench5/sustained.js` `filing`. Parser: `.orkestrel/agent/instruments/harness/bench5/sustained/Sustained.ts:89-120`, `:179-186`, `:255-281`, `:387-435`.

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js filing --frozen FREEZE --resource RESOURCE --runtime DEVELOPMENT_RUNTIME --out FILING_DIR --live [--url URL]
```

Earliest refusals, in order: `readBuild`; phase/`--out` usage; existing output; thinking or a key outside the rank; missing freeze or resource; missing `--live`, `--runtime`, or an unaccepted resource. Internally the Driver is `--seed --live --study EXECUTION --out RUN --cache CACHE` (`:395-406`). Driver refuses any flag that disagrees with that execution (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:448-458`). Outputs: `execution.json`, `run/`, `cache/judge.jsonl`, `cache/lineage.json`, `classification.json`. Exit 0 is an accepted classification. Exit 3 is a measured boundary refusal. A missing cache or an operational boundary error throws (`Sustained.ts:412-434`). `readClassification` later requires protocol `e1`, status `complete`, judge-only requests, and an empty boundary (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:286-320`).

### 3. Fixed generation

Built entry: `.build/bench5/refit.js`. Parser: `.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:108-170`. `--copy` must stay `1`. `--live` is legal only on `generate` (`:139-140`). Runtime mode requires `--runtime`, `--classification`, and `--frozen` together (`:141-145`). `--cache` is required for freeze and generate (`:146-147`). The parser’s default `--model` is `qwen3.5:2b-q4_K_M` (`:124`); a tag other than the frozen summarizer becomes exit 3 `diagnosis.json` inside `execute` (`:197-203`, `:208-211`).

```text
node .orkestrel/agent/instruments/harness/.build/bench5/refit.js freeze --frozen FREEZE --runtime DEVELOPMENT_RUNTIME --classification FILING_DIR/classification.json --cache FILING_DIR/cache --model MODEL --out CORPUS_DIR
node .orkestrel/agent/instruments/harness/.build/bench5/refit.js generate --frozen FREEZE --runtime DEVELOPMENT_RUNTIME --classification FILING_DIR/classification.json --corpus CORPUS_DIR --cache GENERATION_CACHE --model MODEL --out GENERATION_DIR --live [--url URL]
```

Freeze is offline. It refuses a cache whose `judge.jsonl` hash is not the classification cache (`:266-275`) and writes `corpus.json` and `manifest.json` (`:399-407`). Generate writes `attempts.jsonl`, `packet.jsonl`, `evidence.json`, `controls.jsonl`, and `manifest.json` (`:597-675`). Exit 0 means `complete: true`. Exit 3 means retained generation errors. A live digest mismatch throws into that diagnosis (`:184-192`).

### 4. Opaque packet and root labels

`packet.jsonl` is the blinded support packet (`buildRefitItem`, `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:185-202`; written at `Refit.ts:631-641`). No second export command exists. Root writes `LABELS` with `authority` exactly `root-adjudicated`, SHA-256 strings `corpus`, `attempts`, `packet`, and `manifest`, and one label per packet item (`.orkestrel/agent/instruments/harness/bench5/refit/types.ts:134-141`; `.orkestrel/agent/instruments/harness/bench5/refit/validators.ts:221-249`). `verifyLabels` refuses incomplete coverage, a bad item digest, a supported label with a non-supported proposition, or a quotation absent from the item (`.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:209-229`).

### 5. Fit or refusal

```text
node .orkestrel/agent/instruments/harness/.build/bench5/refit.js fit --frozen FREEZE --runtime DEVELOPMENT_RUNTIME --classification FILING_DIR/classification.json --corpus CORPUS_DIR --attempts GENERATION_DIR --labels LABELS --model MODEL --out FIT_DIR
```

Earliest refusal: `readBuild`, then missing `--attempts` or `--labels` (`Refit.ts:149-150`), then custody mismatch (`:687-700`). Always writes `diagnosis.json` and `controls.json`. Writes `fit.json` only when `diagnosis.accepted` (`:717-728`). Exit 3 leaves no `fit.json`.

Strict cutoff is the lowest grid point from 0.51 through 1.00 in steps of 0.01 that rejects every scored negative and ambiguity, with end-to-end admission at least 0.5 and CHANGE fixed at 0.56 (`.orkestrel/agent/instruments/harness/bench5/refit/constants.ts:4-8`; `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:259-296`; `fit.json` CHANGE at `Refit.ts:725`). The exploratory cutoff is not stored in `fit.json`.

A validated matrix strict refusal, with no endurance generation, is:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js candidate --frozen FREEZE --resource RESOURCE --refusal MATRIX_DIAGNOSIS --out CANDIDATE --live
```

`--live` is still required (`Sustained.ts:255-261`). This writes a refused candidate and returns 3 with failure `matrix strict calibration refused` (`:214-253`). It does not run endurance generation.

### 6. Development pair

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js development --frozen FREEZE --resource RESOURCE --pilot PILOT --runtime DEVELOPMENT_RUNTIME --classification FILING_DIR/classification.json --fit FIT_DIR/fit.json --out DEVELOPMENT_DIR --live [--url URL]
```

Earliest refusal after the shared gates: missing `--pilot`, `--classification`, or `--fit` (`Sustained.ts:282-289`), then a pilot that is not accepted for this freeze and resource (`:291-295`, `readPilotFeasibility` at `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:784-832`). Arms run records, then aggregate (`Sustained.ts:300-308`). Each arm is Driver `--run --live --study`. A majority failure is `exposed <= served / 2` (`:310-312`). Writes `candidate.json`. Exit 0 when `accepted`. Exit 3 when measured failures remain and raw evidence is operationally clean. An operational trajectory fault throws (`:383-384`) and later selection refuses to rank it (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:611-612`).

Other retained qualified refusals, still exit 3, use `candidate` with `--pilot` when the pilot is infeasible, or `--preparation FAILED_ARTIFACT --runtime DEVELOPMENT_RUNTIME` for a failed filing classification or an unseparated completed fit (`Sustained.ts:214-253`; `readPreparationFailure` at `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:201-277`). A resource-feasible cell with no refusal, no failed preparation, and a feasible or absent pilot throws instead of writing a candidate (`Sustained.ts:224-232`).

### 7. Ranked selection and frozen evaluation limits

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js select --development DEVELOPMENT_RUNTIME --evaluation EVALUATION_RUNTIME --seed SEED --candidate CANDIDATE [--candidate NEXT ...] --out SELECTION
```

Parser requires those four flags (`Sustained.ts:141-158`). `SEED` must be a nonnegative safe integer (`:445-446`). Candidates must follow the rank with no skip (`helpers.ts:572-574`). An accepted selection may stop at the first accepted candidate; a later accepted candidate is refused (`:671-672`). A refused selection must contain all four candidates, none accepted (`:675-686`). Exit 0 writes `accepted: true`, `chosen`, and `limits`. Exit 3 writes `accepted: false`, no `chosen`, no `limits`, and failure `no feasible ranked configuration` (`Sustained.ts:464-480`). The file is written before `readSustainedSelection`; a rank or custody fault then throws on that existing file (`:478-479`).

Arm order is `records`, `aggregate` when `SEED` is even, and `aggregate`, `records` when odd (`Sustained.ts:473`; `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:564-569`). The command document’s example seed 17 is odd.

Evaluation limits, only for an accepted last candidate, are `max(1, ceil(2 × max complete development expenditure × evaluationGoals / developmentGoals))` for calls, tokens, and whole-run wall. Retries stay the frozen retry count. Wall is whole-run elapsed (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:169-194`). Filing and development use a separate fixed preparation ceiling (`Sustained.ts:61-80`), not these evaluation limits.

### 8. Continuous pair

After matrix stages A, B, and C (`.orkestrel/agent/instruments/harness/bench5/matrix/constants.ts:8-17`) and their blind report:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js filing --selection SELECTION --out EVALUATION_FILING --live [--url URL]
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js evaluate --selection SELECTION --classification EVALUATION_FILING/classification.json --out EVALUATION_DIR --live [--url URL]
```

Selection filing refuses an unaccepted selection and refuses `--frozen`, `--resource`, or `--runtime` overrides (`Sustained.ts:168-177`). It binds the last candidate’s freeze and resource and the selection’s evaluation runtime. Evaluate refuses a missing `--live`, `--selection`, or `--classification` (`:160-163`), then an unaccepted choice, missing limits, or a qualified candidate without `fit` (`:492-498`). Arms follow `selection.order` (`:506-528`). Writes `evaluation.json`. Exit 0 when both attempts are accepted; otherwise 3.

### 9. Blind export and report

Built entry: `.build/bench5/sustained-audit.js`. Parser: `.orkestrel/agent/instruments/harness/bench5/sustained/audit/Audit.ts:26-123`.

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained-audit.js blind --selection SELECTION --records EVALUATION_DIR/records/run --aggregate EVALUATION_DIR/aggregate/run --oracle EVALUATION_ORACLE --seed AUDIT_SEED --keys PRIVATE_DIR/keys.json --out PUBLIC_DIR/packet.json
node .orkestrel/agent/instruments/harness/.build/bench5/sustained-audit.js report --selection SELECTION --records EVALUATION_DIR/records/run --aggregate EVALUATION_DIR/aggregate/run --oracle EVALUATION_ORACLE --packet PUBLIC_DIR/packet.json --keys PRIVATE_DIR/keys.json --labels AUDIT_LABELS --out REPORT [--preparation EXTRA ...]
```

Accepted blind requires `--records`, `--aggregate`, `--oracle`, `--keys`, and an integer `--seed`. It refuses `--packet`, `--labels`, and `--preparation` (`:95-106`). Packet and key directories must differ (`:248-254`). Report refuses `--seed`; the seed is the one inside `--keys` (`:110-113`). Oracle bytes must match the workload manifest (`:133-136`). Labels require `authority` `root-adjudicated` and exact packet and key hashes (`.orkestrel/agent/instruments/harness/bench5/sustained/audit/validators.ts:75-85`).

An all-infeasible selection is report-only:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained-audit.js report --selection SELECTION --out INCONCLUSIVE [--preparation EXTRA ...]
```

Any run, oracle, key, packet, label, or seed argument on that path throws (`Audit.ts:56-69`).

Qualified `recommendation` stays `inconclusive` unless the pair is valid and every interval has majority exposure. It becomes `conditional` only when the quality reasons are empty, and `negative` when an aggregate-only critical violation exists or a conservative gain bound is not positive (`.orkestrel/agent/instruments/harness/bench5/sustained/audit/Comparison.ts:114-142`). A `policy` field forces the reason `Exploratory provenance does not qualify support or permit an adoption recommendation.` and leaves `recommendation` at `inconclusive` (`:129-138`).

## Exploratory route

Open it only after the qualified `select` exits 3 with a complete refused selection and no `policy` (`readSustainedPolicy`, `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:378-391`). An accepted, short, or policy-bearing selection throws.

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js policy --selection QUALIFIED_SELECTION --out POLICY [--withhold]
```

Writes `{ qualified, withhold }` and nothing else (`.orkestrel/agent/instruments/harness/bench5/sustained/validators.ts:23-29`; `Sustained.ts:124-133`). `--withhold` defaults false (`Sustained.ts:110`). The capped-summary exception runs only when that boolean is true, the execution carries the policy, and the phase is not filing (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:968-977`).

Per ranked candidate, reuse the qualified freeze and accepted resource. Supply `EXPLORATION` as `{ "matrix": { "pilot": REFIT_FILE } }` or `{ "matrix": { "records": RUN_JSON, "aggregate": RUN_JSON }, "diagnosis": DIAGNOSIS }`. Each file value is `{ "path", "hash" }` with a 64-hex hash (`.orkestrel/agent/instruments/harness/bench5/refit/validators.ts:42-50`; `.orkestrel/agent/instruments/harness/bench5/sustained/validators.ts:33-44`). No command emits this object.

The pair form must be copy 1, phase `development`, same freeze, resource budget, and development policy, with raw `run.json` paths and majority aggregate body exposure (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:491-539`). `matrix.js` has no `development` phase (`Matrix.ts:75-77`). That pair is Driver `--run --live --copy 1 --manifest EXECUTION` after root supplies a policy file whose `agree` equals `selectMajorityCutoff` of its own matrix diagnosis, whose `change` is 0.56, and whose `selection` is `highest-grid-majority-occurrences-and-identities` (`.orkestrel/agent/instruments/harness/bench5/matrix/validators.ts:125-149`; `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:525-575`). README states that Driver shape (`.orkestrel/agent/instruments/harness/README.md:119`).

Endurance generation is a fresh `filing` plus `refit.js freeze|generate` on `DEVELOPMENT_RUNTIME`, then root labels, then `refit.js fit`. The cutoff used later is the strict `assessment.cutoff` when the diagnosis is accepted, otherwise the highest grid point at which both supported-occurrence and distinct-identity admission are at least 0.5 (`selectMajorityCutoff`, `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:594-613`; applied at `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:473-481`). Empty grid admission becomes failure `endurance support admits no exploratory majority cutoff`. The endurance generation’s `sustained.runtime` must be the qualified selection’s development runtime (`:453-455`). A matrix generation, which has `sustained` absent, fails that check. Passing a matrix `fit.json` as `--fit` also fails `verifySustainedFit` (`:328-346`).

```text
node .orkestrel/agent/instruments/harness/.build/bench5/sustained.js development --policy POLICY --exploration EXPLORATION --frozen FREEZE --resource RESOURCE --runtime DEVELOPMENT_RUNTIME --classification FILING_DIR/classification.json --out DEVELOPMENT_DIR --live [--url URL]
```

`--pilot` and `--fit` are not required when `--policy` is set (`Sustained.ts:282-289`). The thrown text still says `development requires --pilot --classification --fit`. A refused exploratory shortcut is `candidate --policy POLICY --exploration EXPLORATION --frozen FREEZE --resource RESOURCE`; it returns 3 only when resource is unaccepted or the exploration admission already has failures. A feasible exploratory cell without a development pair throws (`:187-212`).

`select` repeats the same `--development`, `--evaluation`, and `--seed` as the refused qualified selection and adds `--policy POLICY`. Changing horizon, seed, or arm order throws (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:554-561`). Every candidate’s `policy` must equal the selection policy (`:575-576`). Acceptance requires the derived endurance fit and empty exploration failures (`:597-602`). `selection.accepted` remains feasibility (`Sustained.ts:464-476`). Filing and evaluate then match the qualified commands. Evaluate allows a missing `candidate.fit` when `selection.policy` is set (`:492-497`). The aggregate constructor recomputes the diagnosis cutoff and refuses a mismatch (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:79-91`). The report cannot emit `conditional` or `negative` from this route (`Comparison.ts:129-138`).

## Judge shadow

Separate from `sustained-audit.js`. Built entry: `.build/bench5/shadow.js`. Parser: `.orkestrel/agent/instruments/harness/bench5/shadow.ts:68-157`. Usage exit 64. Missing-input exit 1.

```text
node .orkestrel/agent/instruments/harness/.build/bench5/shadow.js --run RUN_DIR --cache CACHE_DIR --out SHADOW.json [--live] [--url URL] [--copies COPIES_DIR]
```

Required flags are `--run` and `--out` (`:140-145`). For protocol `l6`, the earliest input refusal is `l6 shadow requires a valid maintained aggregate run`: `parseMatrixRun` must succeed, `failures` must be empty, and `arm` must be `aggregate` (`:706-712`). It then refuses missing `messages.jsonl`, `judgments.jsonl`, `aggregates.jsonl`, or the copy file (`:719-727`). Offline mode also refuses a missing `CACHE_DIR/judge.jsonl`. With a frozen execution and `--live`, it refuses a judge digest other than the freeze (`:652-659`) and a cache lineage that differs (`:668-671`). The matrix command document further limits invocation to plan names matching `-aggregate-v[2-8]$` (`.orkestrel/agent/instruments/units/aggregates/matrix-commands.md:135-144`). The plan parser itself admits only `v2` through `v8` evaluation names (`.orkestrel/agent/instruments/harness/bench5/matrix/Comparison.ts:64-70`). `compare.js report` accepts repeated `--shadow` and refuses a shadow whose execution or freeze differs from an answer run (`:346-359`). Sustained audit has no shadow flag (`Audit.ts:30-41`).

## Document and parser mismatches

`endurance-commands.md` omits `policy`, `--exploration`, `--refusal`, and `--withhold`. Its blind line omits `--keys` and its report line passes `--seed` (`:52-58`). The parser requires `--keys` on accepted blind and report, and refuses `--seed` on report (`Audit.ts:80-113`). Its sustained usage string lists `filing|development|candidate|select|evaluate` and omits `policy` (`Sustained.ts:119`) even though `policy` is implemented (`:124-133`). The harness README’s sustained phase list also omits `policy` (`.orkestrel/agent/instruments/harness/README.md:120-121`). That README says a copy-1 development policy fixes AGREE 0.67 (`.orkestrel/agent/instruments/harness/README.md:119`). The validator accepts any `agree` above 0.5 through 1.00 and `readDevelopment` requires it to equal `selectMajorityCutoff` (`matrix/validators.ts:142-146`; `matrix/helpers.ts:572-573`). The literal 0.67 appears in a test fixture (`.orkestrel/agent/instruments/harness/bench5/matrix/tests/capacity.test.ts:40`). Example seeds 17, 29, and 741 are document examples. The code accepts any nonnegative safe integer and derives arm order from parity.

## Inputs that still block a command

Root still has to name, per ranked key, the existing freeze, resource, and either an accepted strict matrix fit plus pilot or a `verifyMatrixRefusal` diagnosis. Root still has to write both label files. Root still has to assemble `EXPLORATION` and, when the pilot form is infeasible, the copy-1 development policy and its two `run.json` identities. `--url`, `--withhold`, the selection seed, and the audit seed are root choices inside the parser bounds above. This map did not re-hash the emitted tree against current source. `readBuild` remains the live check. No candidate outcome is decided here.