// Preserve the accepted retention mechanics and fix this unit's exact closed evidence scope.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let brief = readFileSync('tmp/units/aggregate-successor-q2-g4-retention-preparation-brief.md', 'utf8')
for (const [before, after] of [
	['aggregate-successor-q2-g4-retention-preparation', 'aggregate-successor-q2-fit-retention'],
	['aggregate-successor-q2-g4-retain', 'aggregate-successor-q2-fit-retain'],
	['aggregate-successor-g4-retain.ts', 'aggregate-successor-q2-g4-retain.ts'],
	['q2-generation-and-g4-fit', 'q2-fit-and-exploratory-route'],
	['34cacc767afd55db97b611645c3e5e7e5c4ab3a2', '1491e6b2b8913f814d308c3d45ff002e1506abe4'],
]) {
	assert.ok(brief.includes(before), before)
	brief = brief.replaceAll(before, after)
}
const blocks: readonly [string, string][] = [
	['Prepare the existing exact-copy custody operation for closed Q2 generation and G4 independent support labels, root adjudication, fixed offline fit and validation.', 'Prepare the existing exact-copy custody operation for closed Qwen2 independent support labels, root adjudication, failed caller fit, corrected fit-2, and accepted exploratory route analysis.'],
	["- **Evidence.** Root will identify both closed execution reports and packet release after their final validation. G4 independent labels and mechanical checks are already closed; root adjudication is `tmp/units/aggregate-successor-g4-adjudication.md`. Current HEAD is 1491e6b2b8913f814d308c3d45ff002e1506abe4, verified by git rev-parse HEAD. Do not read unfinished reports.", "- **Evidence.** Root accepted closed alias-c labels/report/mechanical verifier, q2-adjudication ruling, caller-failed q2-fit report, corrected q2-fit-2 report and compact validation, and matrix-explore-seam report/addendum/root acceptance. All are under tmp/units with aggregate-successor prefixes. HEAD1491e6b2b8913f814d308c3d45ff002e1506abe4 is fixed during live G2 generation. Do not read unfinished reports."],
	['The closed Q2 generation and G4 fit artifacts will be identified by root. Prepare known mappings first and wait for those exact paths before sealing the operation; do not inspect unfinished output.', 'All required inputs are closed and explicitly released in Execution. Live Gemma2 output and pending builder exploration-preparation script/report remain excluded.'],
	['Exclude future G2 output and active alias-c analyst work.', 'Exclude live G2 output and active builder exploration-preparation output.'],
	['Wait for root\'s final artifact list before finalizing.', 'Finalize against the released list; report a missing required input.'],
]
for (const [before, after] of blocks) {
	assert.ok(brief.includes(before), before)
	brief = brief.replace(before, after)
}
const start = brief.indexOf('Perform the assignment yourself and spawn nothing.')
const end = brief.indexOf('\n## Output', start)
assert.ok(start >= 0 && end > start)
brief = brief.slice(0, start) + 'Perform the assignment yourself and spawn nothing. Include closed alias-c brief, labels, report, reader, decisions, serializer/check helpers, and independent c-verifier brief, reader/checker, full adaptation diff, captures/receipt/report. Include q2-adjudication reader/ruling, q2-review-prep, q2-label-prep and materializer. Include both q2-fit and q2-fit-2 briefs, brief preparers, readers, diffs, closure reports, all validation/launch captures and metadata, and both stage log families under l15/logs. Include closed g4-explore-lookup report/addendum, matrix-explore-seam brief/report/addendum and root matrix-explore-acceptance ruling. Include the prepared g4-think0-resource brief and g4-resource-brief-prep. Include this brief/preparer and your script/diff/report. Original G4 and Q2 generation evidence is already committed; no duplicate raw packet needed. Canonical q2 labels/review-labels and fit/fit-2 directories remain in place for root staging. Exclude active G2 evidence, active g4-exploratory-prepare script/report, daemon/external bench journals, and unrelated files. Preserve exact basenames and hashes; do not analyze answers or labels. Fail on missing required artifacts or collisions.\n' + brief.slice(end)
writeFileSync('tmp/units/aggregate-successor-q2-fit-retention-brief.md', brief)
