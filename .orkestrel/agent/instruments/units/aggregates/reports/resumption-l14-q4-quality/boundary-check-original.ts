import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const packetPath = 'tmp/units/aggregate-development-blind-packet-l14-b/packet.json'
const judgmentPath = 'tmp/units/aggregate-final-blind-b-judgments.json'
const scenarioPath = '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
const packetHash = '14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7'
const judgmentHash = '237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7'

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function object(value: unknown, label: string): Record<string, unknown> {
	if (!isObject(value)) throw new Error(`Expected object: ${label}`)
	return value
}

function array(value: unknown, label: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`Expected array: ${label}`)
	return value
}

function string(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(`Expected string: ${label}`)
	return value
}

function number(value: unknown, label: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`Expected nonnegative integer: ${label}`)
	return value
}

function digest(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex')
}

function checkSeedBoundary(fragment: string, through: number): void {
	const seed = fragment.match(/^\/seed\/(0|[1-9]\d*)(?:\/|$)/)
	if (seed !== null && Number(seed[1]) > through) throw new Error(`Seed reference exceeds boundary: ${fragment}`)
}

function allowsVerdict(key: string, verdict: string, status: string, reply: unknown): boolean {
	if (['pass', 'fail', 'ambiguous'].includes(verdict)) return true
	return key === 'semantic' && verdict === 'unattempted' && ['failed', 'unattempted'].includes(status) && (reply === undefined || reply === '')
}

const packetBytes = await readFile(packetPath)
const judgmentBytes = await readFile(judgmentPath)
const scenarioBytes = await readFile(scenarioPath)
const hashes = {
	[packetPath]: digest(packetBytes),
	[judgmentPath]: digest(judgmentBytes),
	[scenarioPath]: digest(scenarioBytes),
}
if (hashes[packetPath] !== packetHash) throw new Error(`Sealed packet hash mismatch: ${hashes[packetPath]}`)
if (hashes[judgmentPath] !== judgmentHash) throw new Error(`Sealed judgment hash mismatch: ${hashes[judgmentPath]}`)

const packet = object(JSON.parse(packetBytes.toString('utf8')), packetPath)
const judgments = array(JSON.parse(judgmentBytes.toString('utf8')), judgmentPath).map((value, index) => object(value, `judgment ${index}`))
const packetGoals = array(packet.goals, 'packet goals')
if (packetGoals.length !== 72 || judgments.length !== 72) throw new Error(`Population count mismatch: packet ${packetGoals.length}, judgments ${judgments.length}`)

let scenarioReferences = 0
let seedReferences = 0
let nestedSeedReferences = 0
for (const [index, judgment] of judgments.entries()) {
	const eligible = object(judgment.eligibleSource, `eligible source ${index}`)
	const through = number(eligible.through, `eligible boundary ${index}`)
	const references = object(judgment.references, `references ${index}`)
	for (const value of array(references.scenario, `scenario references ${index}`)) {
		const reference = string(value, `scenario reference ${index}`)
		if (!reference.startsWith(`${scenarioPath}#`)) throw new Error(`Scenario reference outside source: ${reference}`)
		scenarioReferences += 1
		const fragment = reference.slice(scenarioPath.length + 1)
		const seed = fragment.match(/^\/seed\/(0|[1-9]\d*)(?:\/|$)/)
		if (seed !== null) {
			seedReferences += 1
			if (fragment.startsWith(`/seed/${seed[1]}/`)) nestedSeedReferences += 1
		}
		checkSeedBoundary(fragment, through)
	}
}
let nestedBoundaryControlRejected = false
try {
	checkSeedBoundary('/seed/1/content', 0)
} catch {
	nestedBoundaryControlRejected = true
}
if (!nestedBoundaryControlRejected) throw new Error('Nested seed-boundary negative control was not rejected')

const servedAnswerControlRejected = !allowsVerdict('semantic', 'unattempted', 'served', 'A nonempty served reply')
if (!servedAnswerControlRejected) throw new Error('Served-answer semantic-unattempted control was not rejected')

const result = {
	validated: true,
	population: { packet: packetGoals.length, judgments: judgments.length },
	scenarioReferences,
	seedReferences,
	nestedSeedReferences,
	controls: { nestedBoundaryControlRejected, servedAnswerControlRejected },
	hashes,
}
const addendumPath = 'tmp/units/aggregate-l14-b-quality-boundary-addendum.md'
const addendum = `# L14 alias b quality-boundary validation addendum\n\nThe read-only boundary check covered ${scenarioReferences} scenario references across ${judgments.length} sealed judgments, including ${nestedSeedReferences} nested seed-content pointers. It rejected the nested seed path /seed/1/content at inclusive boundary 0 and rejected semantic unattempted with status served and a nonempty reply.\n\n## Sealed input hashes\n\n${Object.entries(hashes).map(([path, hash]) => `- \`${path}\`: ${hash}`).join('\n')}\n\n## Check result\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`
await writeFile(addendumPath, addendum)
console.log(JSON.stringify({ ...result, addendum: addendumPath }, null, 2))
