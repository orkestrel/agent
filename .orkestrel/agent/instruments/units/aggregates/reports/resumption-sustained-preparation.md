# Preparation assertion compares different cost contracts

The report retains the calibration expenditure. The failing assertion compares the matrix row's trajectory-only `wire` array with the sustained reader's complete `wire` array. Repair the assertion in `bench5/sustained/tests/preparation.test.ts`; retain both production contracts and their generation alias deduplication.

## Evidence

The retained verifier command was `node --test --test-concurrency=1 .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/preparation.test.js`. Its exit was 1 with 1 failing test in 57,237 ms. The complete assertion is retained in `tmp/units/aggregate-development-flush-verifier-6-logs/preparation.stdout.log`; emitted line 307 corresponds to source `.orkestrel/agent/instruments/harness/bench5/sustained/tests/preparation.test.ts:391`.

The actual report is `tmp/units/aggregate-preparation-fixtures/proof-sE7g4b/q4/alias-matrix-costs-0.json:6`. Its preparation identity is `066a15e8affe0384b15be56b90a08a140f3b17b09f8b5c0c5443ceb681b81612`. It contains trajectory summarizer expenditure of 8 requests, 208.77819999999974 ms, 3686 prompt tokens, 80 completion tokens, and no missing usage; trajectory judge expenditure of 16 requests, 388.55279999999857 ms, 800 prompt tokens, 16 completion tokens, and no missing usage. Its separate `controls` array at line 35 contains judge expenditure of 25 requests, 390.3833000000004 ms, 1250 prompt tokens, 25 completion tokens, and no missing usage. Its replay count is 52. These measurements are from verifier run 6's local protocol fixture, not model-quality evidence.

The expected array printed by the assertion has exactly those trajectory records followed by that control record with `phase: 'calibration'`. No request is absent from the report. Total incurred requests represented by either complete contract in this retained run are 49.

The generation manifest binds `generated/controls.jsonl` at `tmp/units/aggregate-preparation-fixtures/proof-sE7g4b/q4/generated/manifest.json:2`, and binds the attempts hash at line 389. Read-only projections of the generated attempts show fresh summaries interspersed with cache replays. A read-only numerical projection of the generated control components with `lexical === true` and `sent === true` measured 25 components, 390.3833 ms, 1250 prompt tokens, and 25 completion tokens. No private oracle was opened. The diagnosis binds the same generation identity and attempts at `tmp/units/aggregate-preparation-fixtures/proof-sE7g4b/q4/fitted/diagnosis.json:375`; it adds refusal reasons rather than issuing additional preparation calls. The reached generation/diagnosis equality at source line 365 already passed before the failing alias assertion.

The authoritative contract `.orkestrel/agent/instruments/harness/bench5/refit/types.ts:213` explicitly separates `controls` from `wire`, whose phase is only `trajectory`. The deciding helper at `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:602` charges fresh sent attempts to `wire` and fresh sent control components to `controls`, preserving cache replay separately. `readRefitCosts` at line 670 verifies the generation-bound controls file before invoking that helper. `hashFile` and `verifyFiles` at lines 63 and 70 are native SHA-256 byte custody operations. The installed `@orkestrel/contract` declarations expose `arrayOf` as an element guard and `isRecord` as a plain record guard; neither changes cost ownership.

The matrix implementation at `.orkestrel/agent/instruments/harness/bench5/matrix/Comparison.ts:313` deduplicates by generation-manifest hash, then spreads the entire `readRefitCosts` result at line 319. The emitted implementation has the same spread. The sustained contract accepts both cost phases at `.orkestrel/agent/instruments/harness/bench5/matrix/types.ts:196`; its reader deliberately combines the partitions at `.orkestrel/agent/instruments/harness/bench5/sustained/parsers.ts:397`. Diagnosis aliases recurse to the same generation at line 411. Sustained audit preparation uses that reader at `.orkestrel/agent/instruments/harness/bench5/sustained/audit/Audit.ts:236` and deduplicates identities in `.orkestrel/agent/instruments/harness/bench5/sustained/audit/helpers.ts:349`.

## Exact bounded prescription

Change only `.orkestrel/agent/instruments/harness/bench5/sustained/tests/preparation.test.ts`. Replace the deep equality at line 391 with the following assertions, leaving the existing report count, identity assertion, and both alias orderings intact:

```ts
assert.deepEqual(
	calibration.wire,
	generationCosts.costs.wire.filter((cost) => cost.phase === 'trajectory'),
)
assert.ok(Array.isArray(calibration.controls))
assert.deepEqual(
	calibration.controls.map((cost: unknown) => {
		assert.ok(isRecord(cost))
		return { ...cost, phase: 'calibration' }
	}),
	generationCosts.costs.wire.filter((cost) => cost.phase === 'calibration'),
)
```

This preserves exact equality for every cost field in both partitions, including wall time and missing usage. It fails on omitted, duplicated, or altered control expenditure. Keep the earlier total-request assertion against the independent peer recorder at line 315, the generation/diagnosis cost equality, and the distinct unsent-generation identity case. Add no helper or public type. Do not flatten `RefitCosts.wire`, remove controls from the sustained reader, or add the controls a second time in the matrix report.

## Proof and control

Use the retained report before regenerating fixtures. A bounded offline assertion exercise can apply the prescribed comparisons to its preparation row and the expected array already printed in the retained failure; the old assertion must fail and the partitioned assertions must pass. This exercise requires neither a model call nor a generation run. Pair it with an in-memory control that replaces the row's nonempty `controls` with `[]`; the calibration comparison must fail. A duplicated control record must also fail. These are data mutations of the comparison input, not writes to retained evidence or production source.

After the test edit, let the verifier emit the changed test through the authorized build workflow and run the same preparation command once. Preserve the frozen build's custody rules; never rewrite a retained build manifest to make old artifacts appear fresh. The full test must reach both alias orders, candidate selection, and inconclusive reporting that verifier run 6 never reached. If a later assertion fails, report that reached failure separately rather than expanding this repair. Products and sustained runtime have already passed and need no rerun for this test-only correction.

No test, model operation, or build ran in this analysis unit. The prescribed proof/control remains for the implementation and verifier units.

## Affected population and bounds

The writable population is the preparation test and its generated emitted copy during authorized emission. The direct production readers are `bench5/matrix/Comparison.ts` and `bench5/sustained/parsers.ts`; both remain unchanged. Their shared measurement implementation and contract are `bench5/refit/helpers.ts` and `bench5/refit/types.ts`, also unchanged. Existing direct measurement tests are `bench5/tests/refit.test.ts` and `bench5/tests/aggregates.test.ts`; the latter explicitly checks separate control expenditure at lines 1952 and 1971. They require no rerun for this assertion-only change.

The defect affects the cross-contract assertion. It does not evidence a defect in l11 raw costs, matrix report costs, or sustained report costs. Matrix and sustained outputs represent the same incurred generation/control work using different shapes. The final sustained report in this fixture remains unexecuted because the test stopped at the matrix alias comparison; its implementation retains the complete measured cost projection, but this unit does not claim that later end-to-end assertion passed.

The inspected source cost files and preparation test had no diff. Existing dirty files belong to other units. This unit writes only this report and has no ownership overlap with the Driver retry repair.
