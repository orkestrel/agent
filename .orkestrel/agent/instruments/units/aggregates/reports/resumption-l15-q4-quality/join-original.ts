import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const packetPath = 'tmp/units/aggregate-development-blind-packet-successor-a/packet.json'
const judgmentPath = 'tmp/units/aggregate-successor-quality-a-judgments.json'
const joinsPath = 'tmp/units/aggregate-development-blind-packet-successor-a/private/joins.json'
const scenarioPath = '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
const expected = new Map([[packetPath, 'UNRELEASED_PACKET_SHA256'], [judgmentPath, 'UNRELEASED_JUDGMENTS_SHA256']])

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
function resolveReference(reference: string): { readonly path: string; readonly fragment: string } {
	const marker = reference.indexOf('#')
	if (marker < 0) throw new Error(`Reference has no fragment: ${reference}`)
	const path = resolve(reference.slice(0, marker))
	if (path !== resolve(packetPath) && path !== resolve(scenarioPath)) throw new Error(`Reference outside sealed files: ${reference}`)
	return { path, fragment: reference.slice(marker + 1) }
}
function checkSeedBoundary(fragment: string, through: number): void {
	const seed = fragment.match(/^\/seed\/(0|[1-9]\d*)(?:\/|$)/)
	if (seed !== null && Number(seed[1]) > through) throw new Error(`Seed reference exceeds boundary: ${fragment}`)
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
	if (key === 'completeWork' && status !== 'served') return verdict === 'fail'
	if ((key === 'systemTool' || key === 'listedTool') && verdict === 'unattempted') return status === 'unattempted' && reply === undefined
	if (['pass', 'fail', 'ambiguous'].includes(verdict)) return true
	return key === 'semantic' && verdict === 'unattempted' && ['failed', 'unattempted'].includes(status) && (reply === undefined || reply === '')
}
function bindRaw(row: Record<string, unknown> | undefined, packetGoal: Record<string, unknown>, judgment: Record<string, unknown>, label: string): { readonly status: string; readonly automatic: boolean | undefined; readonly reply: unknown } {
	const status = row === undefined ? 'unattempted' : row.partial === true || Object.hasOwn(row, 'error') ? 'failed' : 'served'
	if (packetGoal.status !== status || judgment.status !== status) throw new Error(`Raw status mismatch ${label}: ${status}`)
	if (row === undefined) {
		if (Object.hasOwn(packetGoal, 'reply')) throw new Error(`Absent raw row has packet reply ${label}`)
		if (!Array.isArray(packetGoal.actions) || packetGoal.actions.length !== 0) throw new Error(`Absent raw row has packet actions ${label}`)
		return { status, automatic: undefined, reply: undefined }
	}
	if (typeof row.success !== 'boolean') throw new Error(`Retained row lacks boolean success ${label}`)
	if (typeof row.reply !== 'string' || typeof packetGoal.reply !== 'string' || row.reply !== packetGoal.reply) throw new Error(`Retained reply mismatch ${label}`)
	return { status, automatic: row.success, reply: packetGoal.reply }
}
function validateVerdicts(judgment: Record<string, unknown>, status: string, reply: unknown, label: string): Record<string, string> {
	const verdicts: Record<string, string> = {}
	for (const key of verdictKeys) {
		const verdict = string(judgment[key], `${key} ${label}`)
		if (!allowsVerdict(key, verdict, status, reply)) throw new Error(`Invalid sealed verdict ${verdict} at ${label}/${key}`)
		verdicts[key] = verdict
	}
	return verdicts
}
function rejectControl(label: string, action: () => void): void {
	try {
		action()
	} catch {
		return
	}
	throw new Error(`Negative control was admitted: ${label}`)
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
const relativeScenarioReference = resolveReference(`${scenarioPath}#/ledger/system`)
const absoluteScenarioReference = resolveReference(`${resolve(scenarioPath)}#/ledger/system`)
const referenceFormsAgree = relativeScenarioReference.path === absoluteScenarioReference.path && relativeScenarioReference.fragment === absoluteScenarioReference.fragment
if (!referenceFormsAgree) throw new Error('Relative and absolute sealed-file references differ')
rejectControl('wrong-file reference', () => resolveReference('tmp/units/aggregate-successor-quality-a-judgments.json#/0'))
const scenarioById = uniqueMap(scenarioGoals, 'id', 'scenario goal')
const authoredIds = scenarioGoals.map((goal, index) => string(goal.id, `scenario goal id ${index}`))
const goalsByRun = new Map<string, Set<string>>()
for (const join of joins) {
	const run = string(join.run, 'private join run')
	const goal = string(join.goal, `private join goal ${run}`)
	let goals = goalsByRun.get(run)
	if (goals === undefined) {
		goals = new Set<string>()
		goalsByRun.set(run, goals)
	}
	if (goals.has(goal)) throw new Error(`Duplicate private run goal ${run}/${goal}`)
	goals.add(goal)
}
for (const [run, goals] of goalsByRun) checkCoverage(authoredIds, goals)
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
	const goalReference = string(eligible.goal, `goal pointer ${opaque}`)
	const goalTarget = resolveReference(goalReference)
	if (goalTarget.path !== resolve(scenarioPath)) throw new Error(`Goal pointer outside scenario ${opaque}`)
	if (pointer(scenario, goalReference) !== authored) throw new Error(`Goal pointer/join mismatch ${opaque}`)
	if (packetGoal.request !== authored.request) throw new Error(`Request differs from authored goal ${opaque}`)
	const refs = object(judgment.references, `references ${opaque}`)
	for (const lane of ['packet', 'scenario']) for (const refValue of array(refs[lane], `${lane} references ${opaque}`)) {
		const ref = string(refValue, `${lane} reference ${opaque}`)
		const targetReference = resolveReference(ref)
		const expectedPath = resolve(lane === 'packet' ? packetPath : scenarioPath)
		if (targetReference.path !== expectedPath) throw new Error(`Reference outside supplied ${lane} ${opaque}: ${ref}`)
		const target = lane === 'packet' ? packet : scenario
		pointer(target, ref)
		if (lane === 'scenario') checkSeedBoundary(targetReference.fragment, through)
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
		for (const id of rows.keys()) if (!scenarioById.has(id)) throw new Error(`Unknown retained goal ${id}`)
		let omittedSuffix = false
		for (const id of authoredIds) {
			if (!rows.has(id)) omittedSuffix = true
			else if (omittedSuffix) throw new Error(`Retained rows omit a non-suffix goal ${id}`)
		}
		retained = { identity: string(runObject.identity, `recorded identity ${run}`), arm: armName, rows }
		runCache.set(run, retained)
	}
	const runRow = retained.rows.get(goalId)
	const binding = bindRaw(runRow, packetGoal, judgment, opaque)
	const status = binding.status
	const verdicts = validateVerdicts(judgment, status, binding.reply, opaque)
	let arm = armCounts.get(retained.arm)
	if (arm === undefined) { arm = {}; armCounts.set(retained.arm, arm) }
	for (const [key, verdict] of Object.entries(verdicts)) {
		let counts = arm[key]
		if (counts === undefined) { counts = { pass: 0, fail: 0, ambiguous: 0, unattempted: 0 }; arm[key] = counts }
		counts[verdict] = (counts[verdict] ?? 0) + 1
	}
	outputRows.push({ opaqueId: opaque, goal: goalId, arm: retained.arm, runIdentity: identity, retainedRunIdentity: retained.identity, status, automatic: binding.automatic, verdicts, reason: string(judgment.reason, `reason ${opaque}`), eligibleThrough: through })
}

// Inert controls remain outside the measured population so validation does not require failed or absent results.
const absentOpaque = 'synthetic-absent'
const absentGoal = { status: 'unattempted', actions: [] }
const absentJudgment = { status: 'unattempted', semantic: 'unattempted', systemTool: 'unattempted', listedTool: 'unattempted', completeWork: 'fail' }
const absentBinding = bindRaw(undefined, absentGoal, absentJudgment, absentOpaque)
const absentVerdicts = validateVerdicts(absentJudgment, absentBinding.status, absentBinding.reply, absentOpaque)
const absentAsServed = { ...absentJudgment, status: 'served' }
const absentWithReply = { ...absentGoal, reply: '' }
const absentWithActions = { ...absentGoal, actions: [{}] }
rejectControl('absent raw row marked served', () => bindRaw(undefined, absentGoal, absentAsServed, absentOpaque))
rejectControl('absent raw row supplied a reply', () => bindRaw(undefined, absentWithReply, absentJudgment, absentOpaque))
rejectControl('absent raw row supplied actions', () => bindRaw(undefined, absentWithActions, absentJudgment, absentOpaque))
const syntheticAbsentPositiveControl = absentBinding.status === 'unattempted' && absentBinding.automatic === undefined && !Object.hasOwn(absentGoal, 'reply') && Array.isArray(absentGoal.actions) && absentGoal.actions.length === 0 && absentVerdicts.semantic === 'unattempted' && absentVerdicts.systemTool === 'unattempted' && absentVerdicts.listedTool === 'unattempted' && absentVerdicts.completeWork === 'fail'
if (!syntheticAbsentPositiveControl) throw new Error('Synthetic absent-row positive control did not retain its status and verdicts')

const failedOpaque = 'synthetic-failed'
const failedRaw = { partial: true, success: false, reply: '' }
const failedGoal = { status: 'failed', reply: '', actions: [] }
const failedJudgment = { status: 'failed', semantic: 'unattempted', systemTool: 'fail', listedTool: 'fail', completeWork: 'fail' }
const failedBinding = bindRaw(failedRaw, failedGoal, failedJudgment, failedOpaque)
validateVerdicts(failedJudgment, failedBinding.status, failedBinding.reply, failedOpaque)
const servedOpaque = 'synthetic-served'
const servedRaw = { success: true, reply: 'Synthetic served reply' }
const servedGoal = { status: 'served', reply: 'Synthetic served reply', actions: [] }
const servedJudgment = { status: 'served', semantic: 'pass', systemTool: 'pass', listedTool: 'pass', completeWork: 'pass' }
const servedBinding = bindRaw(servedRaw, servedGoal, servedJudgment, servedOpaque)
validateVerdicts(servedJudgment, servedBinding.status, servedBinding.reply, servedOpaque)

const completionControls: string[] = []
for (const control of [
	{ opaque: failedOpaque, judgment: failedJudgment, binding: failedBinding },
	{ opaque: absentOpaque, judgment: absentJudgment, binding: absentBinding },
]) {
	const { opaque, judgment, binding } = control
	const status = binding.status
	for (const verdict of ['pass', 'ambiguous']) {
		const controlledJudgment = { ...judgment, completeWork: verdict }
		rejectControl(`${status} completeWork=${verdict}`, () => validateVerdicts(controlledJudgment, status, binding.reply, opaque))
		completionControls.push(`${status}:${verdict}`)
	}
}
const actionControls: string[] = []
for (const axis of ['systemTool', 'listedTool']) {
	for (const control of [
		{ opaque: servedOpaque, judgment: servedJudgment, binding: servedBinding },
		{ opaque: failedOpaque, judgment: failedJudgment, binding: failedBinding },
	]) {
		const { opaque, judgment, binding } = control
		const status = binding.status
		const controlledJudgment = { ...judgment, [axis]: 'unattempted' }
		rejectControl(`${status} ${axis}=unattempted`, () => validateVerdicts(controlledJudgment, status, binding.reply, opaque))
		actionControls.push(`${status}:${axis}`)
	}
}

const adjusted = new Map<string, Record<string, Record<string, number>>>()
for (const [armName, categories] of armCounts) {
	const copy: Record<string, Record<string, number>> = {}
	for (const [category, counts] of Object.entries(categories)) copy[category] = { ...counts }
	const excluded = outputRows.find(row => row.arm === armName && row.goal === 'g06-kenji-shipping')
	if (excluded !== undefined) { const verdicts = object(excluded.verdicts, 'excluded verdicts'); for (const category of verdictKeys) { const verdict = string(verdicts[category], 'excluded verdict'); copy[category][verdict] -= 1 } }
	adjusted.set(armName, copy)
}
const statusCounts: Record<string, number> = {}
for (const row of outputRows) statusCounts[string(row.status, 'joined status')] = (statusCounts[string(row.status, 'joined status')] ?? 0) + 1
const controls = {
	duplicateMissingIdRejected: negativeControlRejected,
	servedAnswerUnattemptedRejected: unattemptedNegativeControlRejected,
	wrongFileReferenceRejected: true,
	relativeAbsoluteReferenceAgreement: referenceFormsAgree,
	absentRowMarkedServedRejected: true,
	absentRowReplyRejected: true,
	absentRowActionsRejected: true,
	statusControlSource: 'synthetic objects outside the measured population',
	syntheticAbsentPositiveControl,
	completionControls,
	actionControls
}
const report = { validated: true, controls, hashes, population: { entries: outputRows.length, uniquePacketIds: packetById.size, uniqueJudgmentIds: judgmentsById.size, uniqueJoinIds: joinsByOpaque.size, statusCounts }, armCounts: Object.fromEntries(armCounts), adjustedArmCounts: Object.fromEntries(adjusted), rows: outputRows }
const joinedPath = 'tmp/units/aggregate-successor-quality-a-joined.json'
const joinedMarkdownPath = 'tmp/units/aggregate-successor-quality-a-joined.md'
const validationPath = 'tmp/units/aggregate-successor-quality-a-join-validation.md'
await writeFile(joinedPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
const table = ['| Arm | Goal | Status | Automatic pattern match | Semantic | System-tool | Listed-tool | Complete-work | Reason |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for (const row of outputRows) { const verdicts = object(row.verdicts, 'joined verdicts'); table.push(`| ${row.arm} | ${row.goal} | ${row.status} | ${row.automatic ?? 'unattempted'} | ${verdicts.semantic} | ${verdicts.systemTool} | ${verdicts.listedTool} | ${verdicts.completeWork} | ${string(row.reason, 'reason').replaceAll('|', '\\|')} |`) }
await writeFile(joinedMarkdownPath, `# Successor alias a sealed quality join\n\nValidated ${outputRows.length} unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.\n\n## Totals\n\n\`\`\`json\n${JSON.stringify({ armCounts: report.armCounts, adjustedArmCounts: report.adjustedArmCounts }, null, 2)}\n\`\`\`\n\n## Per-goal judgments\n\n${table.join('\n')}\n`, { flag: 'wx' })
const outputHashes = {}
for (const path of [joinedPath, joinedMarkdownPath]) outputHashes[path] = digest(await readFile(path))
const validation = `# Successor alias a quality join validation\n\nThe successor-a checker accepted ${outputRows.length} unique judgments, packet IDs, private join IDs, and all planned status rows. The missing-ID, served-answer, and wrong-file controls were rejected by their checking paths. Synthetic objects outside the measured population exercised absent-row status/reply/actions, completion, and served/failed action-axis rejection. The synthetic absent-row positive control retained all four verdicts. Relative and absolute references resolved to the same sealed files; per-goal verdicts and reasons were copied unchanged.\n\n## Evidence hashes\n\n${Object.entries(hashes).map(([path, hash]) => `- \`${path}\`: ${hash}`).join('\n')}\n\n## Output hashes\n\n${Object.entries(outputHashes).map(([path, hash]) => `- \`${path}\`: ${hash}`).join('\n')}\n\n## Totals\n\n\`\`\`json\n${JSON.stringify({ statusCounts: report.population.statusCounts, armCounts: report.armCounts, adjustedArmCounts: report.adjustedArmCounts, controls }, null, 2)}\n\`\`\`\n`
await writeFile(validationPath, validation, { flag: 'wx' })
const validationHash = digest(await readFile(validationPath))
console.log(JSON.stringify({ output: joinedPath, joinedMarkdown: joinedMarkdownPath, validation: validationPath, hashes, outputHashes: { ...outputHashes, [validationPath]: validationHash }, counts: report.armCounts, adjusted: report.adjustedArmCounts, population: report.population, controls }, null, 2))
