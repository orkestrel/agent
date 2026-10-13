import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const packetPath = 'tmp/units/aggregate-development-blind-packet-l13-combined/packet.json'
const judgmentPath = 'tmp/units/aggregate-l13-blind-quality-judgments.json'
const joinsPath = 'tmp/units/aggregate-development-blind-packet-l13-combined/private/joins.json'
const scenarioPath = '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
const expected = new Map([[packetPath, '01f28cdafe52cb531a7fa9aa063e7dded9f2155c8756bfe40ef7de5384fb6b2e'], [judgmentPath, '92313a8faf324e4b263bce2fcef7d0bfedda00848e3628e4edc7242dfe570fef']])

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function object(value: unknown, label: string): Record<string, unknown> { if (!isObject(value)) throw new Error(`Expected object: ${label}`); return value }
function array(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) throw new Error(`Expected array: ${label}`); return value }
function string(value: unknown, label: string): string { if (typeof value !== 'string') throw new Error(`Expected string: ${label}`); return value }
function pointer(document: unknown, reference: string): unknown {
	const marker = reference.indexOf('#')
	if (marker < 0) throw new Error(`Reference has no fragment: ${reference}`)
	const fragment = reference.slice(marker + 1)
	if (fragment === '') return document
	if (!fragment.startsWith('/')) throw new Error(`Invalid JSON pointer: ${reference}`)
	let value = document
	for (const raw of fragment.slice(1).split('/')) {
		if (/~(?![01])/.test(raw)) throw new Error(`Invalid pointer escape: ${reference}`)
		const key = raw.replace(/~1/g, '/').replace(/~0/g, '~')
		if (Array.isArray(value) && /^(0|[1-9]\d*)$/.test(key)) value = value[Number(key)]
		else if (isObject(value)) value = value[key]
		else throw new Error(`Unsupported pointer target: ${reference}`)
		if (value === undefined) throw new Error(`Missing pointer target: ${reference}`)
	}
	return value
}
async function read(path: string): Promise<{ readonly bytes: Buffer; readonly value: unknown }> {
	const bytes = await readFile(path)
	const value: unknown = JSON.parse(bytes.toString('utf8'))
	return { bytes, value }
}
function digest(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex') }

const files = new Map<string, { readonly bytes: Buffer; readonly value: unknown }>()
for (const path of [packetPath, judgmentPath, joinsPath, scenarioPath]) files.set(path, await read(path))
const hashes: Record<string, string> = {}
for (const [path, file] of files) hashes[path] = digest(file.bytes)
for (const [path, hash] of expected) if (hashes[path] !== hash) throw new Error(`Sealed hash mismatch: ${path} expected ${hash}, found ${hashes[path]}`)

const packet = object(files.get(packetPath)?.value, packetPath)
const judgments = array(files.get(judgmentPath)?.value, judgmentPath).map((value, index) => object(value, `judgment ${index}`))
const privateData = object(files.get(joinsPath)?.value, joinsPath)
const joins = array(privateData.joins, 'private joins').map((value, index) => object(value, `join ${index}`))
const scenario = object(files.get(scenarioPath)?.value, scenarioPath)
const packetGoals = array(packet.goals, 'packet goals').map((value, index) => object(value, `packet goal ${index}`))
const scenarioGoals = array(scenario.goals, 'scenario goals').map((value, index) => object(value, `scenario goal ${index}`))
if (packetGoals.length !== 72 || judgments.length !== packetGoals.length || joins.length !== packetGoals.length) throw new Error(`Population count mismatch: packet ${packetGoals.length}, judgments ${judgments.length}, joins ${joins.length}`)

function uniqueMap(rows: Record<string, unknown>[], key: string, label: string): Map<string, Record<string, unknown>> {
	const map = new Map<string, Record<string, unknown>>()
	for (const row of rows) { const id = string(row[key], `${label} key`); if (map.has(id)) throw new Error(`Duplicate ${label} ${id}`); map.set(id, row) }
	return map
}
function checkCoverage(expectedIds: Iterable<string>, actualIds: Iterable<string>): void {
	const expectedList = [...expectedIds]
	const actualList = [...actualIds]
	const expectedSet = new Set(expectedList)
	const actualSet = new Set(actualList)
	if (actualSet.size !== actualList.length) throw new Error('Duplicate IDs')
	if (expectedSet.size !== actualSet.size || [...expectedSet].some(id => !actualSet.has(id))) throw new Error('Missing or unexpected IDs')
}
function allowsVerdict(key: string, verdict: string, status: string, reply: unknown): boolean {
	if (['pass', 'fail', 'ambiguous'].includes(verdict)) return true
	return key === 'semantic' && verdict === 'unattempted' && ['failed', 'unattempted'].includes(status) && (reply === undefined || reply === '')
}
const packetById = uniqueMap(packetGoals, 'id', 'packet id')
const judgmentsById = uniqueMap(judgments, 'id', 'judgment id')
const joinsByOpaque = uniqueMap(joins, 'opaque', 'private join id')
for (const id of packetById.keys()) if (!judgmentsById.has(id)) throw new Error(`Judgment missing packet id ${id}`)
for (const id of judgmentsById.keys()) if (!packetById.has(id) || !joinsByOpaque.has(id)) throw new Error(`Missing packet/private join for judgment ${id}`)
for (const id of joinsByOpaque.keys()) if (!judgmentsById.has(id)) throw new Error(`Unexpected private join id ${id}`)
checkCoverage(packetById.keys(), judgmentsById.keys())
let negativeControlRejected = false
try { checkCoverage(['sealed-a', 'sealed-b'], ['sealed-a', 'duplicate', 'duplicate']) } catch { negativeControlRejected = true }
if (!negativeControlRejected) throw new Error('Duplicate/missing-ID negative control was not rejected')
let unattemptedNegativeControlRejected = false
try {
	if (allowsVerdict('semantic', 'unattempted', 'failed', 'A served reply')) throw new Error('Served answer admitted')
	else throw new Error('Semantic unattempted refused for a served answer')
} catch (error) {
	unattemptedNegativeControlRejected = error instanceof Error && error.message === 'Semantic unattempted refused for a served answer'
}
if (!unattemptedNegativeControlRejected) throw new Error('Semantic unattempted served-answer negative control was not rejected')
const scenarioById = uniqueMap(scenarioGoals, 'id', 'scenario goal')
const expectedArtifacts = object(privateData.hashes, 'retained artifact hashes')
for (const [path, expectedHash] of Object.entries(expectedArtifacts)) {
	const bytes = await readFile(path)
	const actualHash = digest(bytes)
	if (actualHash !== expectedHash) throw new Error(`Retained artifact hash mismatch ${path}: expected ${String(expectedHash)}, found ${actualHash}`)
	hashes[path] = actualHash
}
const runCache = new Map<string, { readonly identity: string; readonly arm: string; readonly rows: Map<string, Record<string, unknown>> }>()
const joinIdentities = new Map<string, string>()
const outputRows: Record<string, unknown>[] = []
const armCounts = new Map<string, Record<string, Record<string, number>>>()
const verdictKeys = ['semantic', 'systemTool', 'listedTool', 'completeWork']

for (const [opaque, judgment] of judgmentsById) {
	const join = joinsByOpaque.get(opaque)
	const packetGoal = packetById.get(opaque)
	if (join === undefined || packetGoal === undefined) throw new Error(`Incomplete join ${opaque}`)
	const goalId = string(join.goal, `join goal ${opaque}`)
	const authored = scenarioById.get(goalId)
	if (authored === undefined) throw new Error(`Unsupported authored goal ${goalId}`)
	if (string(packetGoal.status, `packet status ${opaque}`) !== string(judgment.status, `judgment status ${opaque}`)) throw new Error(`Retained status mismatch ${opaque}`)
	const eligible = object(judgment.eligibleSource, `eligible source ${opaque}`)
	const through = eligible.through
	const packetEligible = object(packetGoal.eligibleSource, `packet eligibility ${opaque}`)
	if (typeof through !== 'number' || packetEligible.seedPrefixThrough !== through) throw new Error(`Eligibility boundary mismatch ${opaque}`)
	if (pointer(scenario, string(eligible.goal, `goal pointer ${opaque}`)) !== authored) throw new Error(`Goal pointer/join mismatch ${opaque}`)
	if (packetGoal.request !== authored.request) throw new Error(`Request differs from authored goal ${opaque}`)
	const refs = object(judgment.references, `references ${opaque}`)
	for (const lane of ['packet', 'scenario']) for (const refValue of array(refs[lane], `${lane} references ${opaque}`)) {
		const ref = string(refValue, `${lane} reference ${opaque}`)
		const target = ref.startsWith(`${packetPath}#`) ? packet : ref.startsWith(`${scenarioPath}#`) ? scenario : undefined
		if (target === undefined) throw new Error(`Reference outside supplied packet/scenario ${opaque}: ${ref}`)
		pointer(target, ref)
		if (lane === 'scenario') { const seed = ref.match(/#\/seed\/(\d+)$/); if (seed !== null && Number(seed[1]) > through) throw new Error(`Seed reference exceeds boundary ${opaque}: ${ref}`) }
	}
	const run = string(join.run, `run path ${opaque}`)
	const identity = string(join.runIdentity, `run identity ${opaque}`)
	const priorIdentity = joinIdentities.get(run)
	if (priorIdentity !== undefined && priorIdentity !== identity) throw new Error(`Contradictory private run identities for ${run}`)
	joinIdentities.set(run, identity)
	let retained = runCache.get(run)
	if (retained === undefined) {
		const runRaw = await readFile(resolve(run, 'run.json'))
		const runValue: unknown = JSON.parse(runRaw.toString('utf8'))
		const runObject = object(runValue, `run ${run}`)
		const execution = object(runObject.execution, `execution ${run}`)
		const armName = string(execution.arm, `arm ${run}`)
		const lines = (await readFile(resolve(run, 'rows.jsonl'), 'utf8')).split(/\r\n|\n/).filter(Boolean)
		const rows = new Map<string, Record<string, unknown>>()
		for (const [index, line] of lines.entries()) { const rowValue: unknown = JSON.parse(line); const row = object(rowValue, `run row ${index}`); const id = string(row.goal, `run goal ${index}`); if (rows.has(id)) throw new Error(`Duplicate retained goal ${id}`); rows.set(id, row) }
		checkCoverage(scenarioById.keys(), rows.keys())
		retained = { identity: string(runObject.identity, `recorded identity ${run}`), arm: armName, rows }
		runCache.set(run, retained)
	}
	const runRow = retained.rows.get(goalId)
	if (runRow === undefined || typeof runRow.success !== 'boolean') throw new Error(`Retained row/status missing ${goalId}`)
	const status = string(judgment.status, `judgment status ${opaque}`)
	const verdicts: Record<string, string> = {}
	let arm = armCounts.get(retained.arm)
	if (arm === undefined) { arm = {}; armCounts.set(retained.arm, arm) }
	for (const key of verdictKeys) {
		const verdict = string(judgment[key], `${key} ${opaque}`)
		if (!allowsVerdict(key, verdict, status, runRow.reply)) throw new Error(`Invalid sealed verdict ${verdict} at ${opaque}/${key}`)
		verdicts[key] = verdict
		let counts = arm[key]
		if (counts === undefined) { counts = { pass: 0, fail: 0, ambiguous: 0, unattempted: 0 }; arm[key] = counts }
		counts[verdict] = (counts[verdict] ?? 0) + 1
	}
	outputRows.push({ opaqueId: opaque, goal: goalId, arm: retained.arm, runIdentity: identity, retainedRunIdentity: retained.identity, status, automatic: runRow.success, verdicts, reason: string(judgment.reason, `reason ${opaque}`), eligibleThrough: through })
}

const adjusted = new Map<string, Record<string, Record<string, number>>>()
for (const [armName, categories] of armCounts) {
	const copy: Record<string, Record<string, number>> = {}
	for (const [category, counts] of Object.entries(categories)) copy[category] = { ...counts }
	const excluded = outputRows.find(row => row.arm === armName && row.goal === 'g06-kenji-shipping')
	if (excluded !== undefined) { const verdicts = object(excluded.verdicts, 'excluded verdicts'); for (const category of verdictKeys) { const verdict = string(verdicts[category], 'excluded verdict'); copy[category][verdict] -= 1 } }
	adjusted.set(armName, copy)
}
const report = { validated: true, negativeControlRejected, unattemptedNegativeControlRejected, hashes, population: { entries: outputRows.length, uniquePacketIds: packetById.size, uniqueJudgmentIds: judgmentsById.size, uniqueJoinIds: joinsByOpaque.size }, armCounts: Object.fromEntries(armCounts), adjustedArmCounts: Object.fromEntries(adjusted), rows: outputRows }
const joinedPath = 'tmp/units/aggregate-l13-quality-joined.json'
const joinedMarkdownPath = 'tmp/units/aggregate-l13-quality-report.md'
const validationPath = 'tmp/units/aggregate-l13-quality-join-validation.md'
await writeFile(joinedPath, `${JSON.stringify(report, null, 2)}\n`)
const table = ['| Arm | Goal | Status | Automatic pattern match | Semantic | System-tool | Listed-tool | Complete-work | Reason |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for (const row of outputRows) { const verdicts = object(row.verdicts, 'joined verdicts'); table.push(`| ${row.arm} | ${row.goal} | ${row.status} | ${row.automatic} | ${verdicts.semantic} | ${verdicts.systemTool} | ${verdicts.listedTool} | ${verdicts.completeWork} | ${string(row.reason, 'reason').replaceAll('|', '\\|')} |`) }
await writeFile(joinedMarkdownPath, `# L13 sealed quality join\n\nValidated ${outputRows.length} unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.\n\n## Totals\n\n\`\`\`json\n${JSON.stringify({ armCounts: report.armCounts, adjustedArmCounts: report.adjustedArmCounts }, null, 2)}\n\`\`\`\n\n## Per-goal judgments\n\n${table.join('\n')}\n`)
const outputHashes = {}
for (const path of [joinedPath, joinedMarkdownPath]) outputHashes[path] = digest(await readFile(path))
const validation = `# L13 quality join validation\n\nThe l13 checker accepted ${outputRows.length} unique judgments, packet IDs, and private join IDs. The duplicate/missing-ID control and the served-answer semantic-unattempted control were both rejected. Sealed judgment and packet hashes matched; per-goal verdicts and reasons were copied unchanged.\n\n## Evidence hashes\n\n${Object.entries(hashes).map(([path, hash]) => `- \`${path}\`: ${hash}`).join('\n')}\n\n## Output hashes\n\n${Object.entries(outputHashes).map(([path, hash]) => `- \`${path}\`: ${hash}`).join('\n')}\n\n## Totals\n\n\`\`\`json\n${JSON.stringify({ armCounts: report.armCounts, adjustedArmCounts: report.adjustedArmCounts }, null, 2)}\n\`\`\`\n`
await writeFile(validationPath, validation)
const validationHash = digest(await readFile(validationPath))
console.log(JSON.stringify({ output: joinedPath, joinedMarkdown: joinedMarkdownPath, validation: validationPath, hashes, outputHashes: { ...outputHashes, [validationPath]: validationHash }, counts: report.armCounts, adjusted: report.adjustedArmCounts, population: report.population, negativeControlRejected, unattemptedNegativeControlRejected }, null, 2))
