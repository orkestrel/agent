The `calibrate` tsc proof still exits 2, and I can't fix it from my two files. The cause is a missing `bench5/types.ts` patch, which you must apply.

`bench5/types.ts` (656 lines, unmodified in git) declares no `Calibrate*` type. `bench5/calibrate.ts` and `bench5/tests/calibrate.test.ts` import 15 of those names. The code law puts types in `bench5/types.ts`, so declaring them locally would break it, and I don't own that file.

## Files written
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/calibrate.ts` (unchanged this round)
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/calibrate.test.ts` (unchanged this round)

## Proof commands
- `node --test bench5/tests/calibrate.test.ts` exits 0. The last lines are `# tests 36`, `# pass 36`, `# fail 0`.
- `tsc -p bench5/tsconfig.json` against the real tree exits 2. The 15 `TS2305` errors name the missing `Calibrate*` exports, and the rest in my files are `TS7006` errors that follow from them. About 35 more errors are in `bench5/shadow.ts` and `bench5/tests/shadow.test.ts`, which the shadow unit owns and which lack `Shadow*` types.
- With the patch appended, I copied the harness (minus `node_modules`, which I symlinked) to the scratchpad and ran tsc against that copy. It reported no errors in `calibrate.ts`, `calibrate.test.ts` or `types.ts`. The only remaining errors were the 35 shadow ones. The real tree is untouched.

## Deviation
- **Expected:** the `Calibrate*` types in `bench5/types.ts`.
- **Found:** none of them exist.
- **Evidence:** `grep -n Calibrate bench5/types.ts` prints nothing, and the tsc output shows `TS2305` for all 15 names.

## Patch for `bench5/types.ts`
Append the contents of `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/types/calibrate-types.txt` to the end of the file. The patch declares 16 exports. `CalibrateOutcome` is the sixteenth. It is used inside the patch (by `CalibrateAsked`), and the two `Calibrate*` files don't import it. It relies on `MessageRole`, `JudgeQuestion`, `TopicSpec`, `ScenarioDay`, `AggregateSource` and `Fit`, which `types.ts` already imports or declares. The exports, in order:
- `CalibrateHead`
- `CalibrateVariant`
- `CalibrateOutcome`
- `CalibrateConfig`
- `CalibrateConfigOutcome`
- `CalibrateMessage`
- `CalibrateScenario`
- `CalibrateSelection`
- `CalibrateSummary`
- `CalibrateSwap`
- `CalibrateItem`
- `CalibrateAsked`
- `CalibrateCutoff`
- `CalibrateTally`
- `CalibrateCounts`
- `CalibrateFit`

## Ruling needed
Either the type-consolidation unit or the orchestrator applies the patch to `types.ts`. After that, `tsc` should leave only the shadow errors until the shadow unit lands its own types.
