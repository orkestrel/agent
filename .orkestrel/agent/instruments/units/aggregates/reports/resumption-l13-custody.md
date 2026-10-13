# Read-run command and custody scope addendum

This note adds command and verifier scope evidence to reports 3 and 4. It does not modify canonical source, build files, or the prior reports.

## Exact existing read command used for aggregate exposure

From the scaffold checkout, the read-only Node invocation was:

```powershell
node --input-type=module -e "import {parseMatrixRun} from './.orkestrel/agent/instruments/harness/.build/bench5/matrix/parsers.js'; import {matchesMatrixExposure} from './.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'; const run=parseMatrixRun('.orkestrel/agent/instruments/results/l13/q2-think0/aggregate/run'); if(!run) throw new Error('closed aggregate parser returned no run'); const goals=run.rows.map(row=>({goal:row.goal,exposed:matchesMatrixExposure(run,row.goal)})); console.log(JSON.stringify({runValid:true,sourceVersionBindings:'validated-by-read-run-parser',exposed:goals.filter(x=>x.exposed).length,goals}));"
```

The same parser/cost reader was applied to records and full with `parseMatrixRun('<arm run path>')`, filtering `run.requests` by `sent`, then calling `readWireReading({body:r.request},{text:r.response})`. The printed projection contained request counts, HTTP statuses, usage totals, per-role/per-goal metadata, and automated row booleans only; it did not print request or response bodies.

## What the existing parser checks

The invoked existing built files are:

- `.orkestrel/agent/instruments/harness/.build/bench5/matrix/parsers.js`: `parseMatrixRun` starts at line 17. It calls `readFrozen(execution.frozen)` and validates the run’s frozen configuration, model inventory digests, request/row schemas, stored usage against raw wire readings, and run structure.
- `.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js`: `readFrozen` starts at line 215; it verifies the freeze reference and all hash-bound frozen files, then compares the frozen file population with `readMatrixFiles()`.
- `.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js`: `readMatrixFiles` starts at line 181; it invokes `readBuild()`, hashes the current matrix source population and build manifest, and compares that population against the freeze.
- `.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js`: `readBuild` starts at line 35 and verifies the build-manifest source and emitted-output hashes against current bytes.
- `.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js`: `matchesMatrixExposure` starts at line 888 and checks per-goal exposure using actual sent request records and their wire readings.
- `.orkestrel/agent/instruments/harness/.build/bench5/helpers.js`: `readWireReading` starts at line 45 and extracts terminal usage/flags from recorded wire responses.

Therefore the `parseMatrixRun` read does verify both frozen source files and emitted build-output bytes through the existing `readFrozen` → `readMatrixFiles` → `readBuild` path; the freeze’s hash-bound files are also individually checked. This is stronger than the separate post-run `git rev-parse HEAD` assertion or a hash of only `build-manifest.json`. It validates their recorded byte identities, not semantic correctness of those files.

No model/service call, build, canonical write, or source mutation was performed for this addendum.

The recorded inline Node command violated the required TypeScript-file invocation rule. Root retains that procedural deviation and the observed parser output. Successor metadata readers use TypeScript files; this observation is not repeated solely to change its command form.
