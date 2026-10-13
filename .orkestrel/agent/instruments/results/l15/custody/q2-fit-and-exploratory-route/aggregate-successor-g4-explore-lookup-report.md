# Successor G4 exploration lookup

Scope was read-only except for this report. I searched the requested `bench5/explore*` source/build filenames and the bounded `tmp/units/aggregate-*explor*` operator/brief filenames. No `explore*` command/parser/helper exists in either `harness/bench5` or `harness/.build/bench5`; no prepared operator file was found. The top-level prepared exploration briefs are only names; I did not read them, any verdict, or task answers.

The accepted direction requires exploratory AGREE from the recomputed bound diagnosis, using the highest declared grid point where supported occurrence and distinct-identity admission each reach 0.5, and allows copy-1 matrix observations separately from qualified pilot/evaluation admission ([direction](.orkestrel/agent/instruments/units/aggregates/reports/resumption-comparison-completion-direction.md:13), [direction](.orkestrel/agent/instruments/units/aggregates/reports/resumption-comparison-completion-direction.md:17)). The current complete inputs are present by filename at:

- `.orkestrel/agent/instruments/results/l6/calibration/g4/corpus/corpus.json`
- `.orkestrel/agent/instruments/results/l6/calibration/g4/generation/{manifest.json,attempts.jsonl,packet.jsonl}`
- `.orkestrel/agent/instruments/results/l6/calibration/g4/labels.json`
- frozen cells `.orkestrel/agent/instruments/results/l6/g4-think0/freeze/manifest.json` and `g4-think1/freeze/manifest.json`

The offline recomputation CLI is exactly `refit.js fit` with `--copy 1`, `--frozen`, `--corpus`, `--attempts`, `--labels`, `--model`, and a fresh `--out` directory. For the current G4 inputs:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/refit.js fit --copy 1 --frozen .orkestrel/agent/instruments/results/l6/g4-think0/freeze/manifest.json --corpus .orkestrel/agent/instruments/results/l6/calibration/g4/corpus --attempts .orkestrel/agent/instruments/results/l6/calibration/g4/generation --labels .orkestrel/agent/instruments/results/l6/calibration/g4/labels.json --model gemma4:e4b-it-q4_K_M --out <fresh-output-directory>
```

This emits `diagnosis.json` and `controls.json`; it emits `fit.json` only when the strict diagnosis is accepted. The run is offline and checks bound generation, corpus, labels, and frozen configuration ([Refit CLI](.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:129), [fit output](.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:687)). It will recompute the strict refusal at the supplied cutoff but cannot emit the requested exploratory fit. `selectMajorityCutoff(assessment)` implements the declared grid rule and refuses operational errors/inconsistent duplicate identities, but no CLI calls it to write an exploratory fit ([selector](.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:590)). I did not run this command or execute the helper.

The live per-cell resource and full-view commands are supported by the built matrix CLI. Run both commands for each `g4-think0` and `g4-think1` base, keeping output directories fresh and using the requested endpoint:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js resource --frozen .orkestrel/agent/instruments/results/l6/g4-think0/freeze/manifest.json --out <fresh-g4-think0-resource-dir> --live --url http://127.0.0.1:11435
node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js full --frozen .orkestrel/agent/instruments/results/l6/g4-think0/freeze/manifest.json --resource <g4-think0-resource-dir>/manifest.json --out <fresh-g4-think0-full-dir> --live --url http://127.0.0.1:11435
```

Substitute the `g4-think1` frozen manifest and its resource/full directories for the second cell. `resource` requires the frozen manifest and emits `<resource-dir>/manifest.json`; `full` requires that accepted resource manifest and emits `<full-dir>/manifest.json` plus `bound.json` and its `preflight` run ([matrix arguments and dispatch](.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:58), [full prerequisites and outputs](.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:263)). Both phases require `--live`; `--url` overrides the default port 11434 ([default](.orkestrel/agent/instruments/harness/bench5/constants.ts:46)).

There is no currently valid exploratory aggregate-copy-1 CLI to launch. The closest matrix command is `matrix.js pilot --frozen FILE --resource FILE --fit FILE --out DIR --live --url http://127.0.0.1:11435`; it constructs an aggregate, copy-1 development execution and writes a pilot `manifest.json` plus a development run ([pilot](.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:308)). But matrix execution validation requires a `fit.json` with `separated: true` and matching frozen matrix identity ([matrix fit gate](.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:671)); the current refused strict G4 diagnosis cannot supply that artifact. The lower-level driver also checks `fit.separated === true` for aggregate runs unless an exploratory sustained-study object is present, which is a different execution protocol ([driver preparation](.orkestrel/agent/instruments/harness/bench5/Driver.ts:890)). Therefore root must decide and provide an already supported route before aggregate copy-1 commands for either thinking mode can be stated safely. I did not infer or construct one.

