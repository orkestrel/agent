import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const packetPath = 'tmp/units/aggregate-development-blind-packet-successor-d/packet.json'
const judgmentPath = 'tmp/units/aggregate-successor-quality-d-judgments.json'
const scenarioPath = '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
const packetHash = 'UNRELEASED_PACKET_SHA256'
const judgmentHash = 'UNRELEASED_JUDGMENTS_SHA256'

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

function resolveReference(reference: string): { readonly path: string; readonly fragment: string } {
	const marker = reference.indexOf('#')
	if (marker < 0) throw new Error(`Reference has no fragment: ${reference}`)
	const path = resolve(reference.slice(0, marker))
	if (path !== resolve(packetPath) && path !== resolve(scenarioPath)) throw new Error(`Reference outside sealed files: ${reference}`)
	return { path, fragment: reference.slice(marker + 1) }
}

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
const scenarioValue: unknown = JSON.parse(scenarioBytes.toString('utf8'))
const packetGoals = array(packet.goals, 'packet goals')
if (packetGoals.length !== 72 || judgments.length !== 72) throw new Error(`Population count mismatch: packet ${packetGoals.length}, judgments ${judgments.length}`)

let scenarioReferences = 0
let packetReferences = 0
let seedReferences = 0
let nestedSeedReferences = 0
for (const [index, judgment] of judgments.entries()) {
	const eligible = object(judgment.eligibleSource, `eligible source ${index}`)
	const through = number(eligible.through, `eligible boundary ${index}`)
	const goalReference = string(eligible.goal, `eligible goal reference ${index}`)
	const goalTarget = resolveReference(goalReference)
	if (goalTarget.path !== resolve(scenarioPath)) throw new Error(`Eligible goal reference outside scenario: ${goalReference}`)
	pointer(scenarioValue, goalReference)
	const references = object(judgment.references, `references ${index}`)
	for (const lane of ['packet', 'scenario']) {
		for (const value of array(references[lane], `${lane} references ${index}`)) {
			const reference = string(value, `${lane} reference ${index}`)
			const target = resolveReference(reference)
			const expectedPath = resolve(lane === 'packet' ? packetPath : scenarioPath)
			if (target.path !== expectedPath) throw new Error(`Reference outside ${lane} source: ${reference}`)
			pointer(lane === 'packet' ? packet : scenarioValue, reference)
			if (lane === 'packet') packetReferences += 1
			else {
				scenarioReferences += 1
				const fragment = target.fragment
				const seed = fragment.match(/^\/seed\/(0|[1-9]\d*)(?:\/|$)/)
				if (seed !== null) {
					seedReferences += 1
					if (fragment.startsWith(`/seed/${seed[1]}/`)) nestedSeedReferences += 1
				}
				checkSeedBoundary(fragment, through)
			}
		}
	}
}
let nestedBoundaryControlRejected = false
try {
	checkSeedBoundary('/seed/1/content', 0)
} catch {
	nestedBoundaryControlRejected = true
}
if (!nestedBoundaryControlRejected) throw new Error('Nested seed-boundary negative control was not rejected')

const relativeReference = resolveReference(`${scenarioPath}#/ledger/system`)
const absoluteReference = resolveReference(`${resolve(scenarioPath)}#/ledger/system`)
const referenceFormsAgree = relativeReference.path === absoluteReference.path && relativeReference.fragment === absoluteReference.fragment
if (!referenceFormsAgree) throw new Error('Relative and absolute sealed-file references differ')
let wrongFileControlRejected = false
try {
	resolveReference('tmp/units/aggregate-successor-quality-d-judgments.json#/0')
} catch {
	wrongFileControlRejected = true
}
if (!wrongFileControlRejected) throw new Error('Wrong-file reference control was not rejected')

const servedAnswerControlRejected = !allowsVerdict('semantic', 'unattempted', 'served', 'A nonempty served reply')
if (!servedAnswerControlRejected) throw new Error('Served-answer semantic-unattempted control was not rejected')

const result = {
	validated: true,
	population: { packet: packetGoals.length, judgments: judgments.length },
	scenarioReferences,
	packetReferences,
	seedReferences,
	nestedSeedReferences,
	controls: { nestedBoundaryControlRejected, servedAnswerControlRejected, wrongFileControlRejected, referenceFormsAgree },
	hashes,
}
const addendumPath = 'tmp/units/aggregate-successor-quality-d-boundary-addendum.md'
const addendum = `# L14 alias b quality-boundary validation addendum\n\nThe read-only boundary check resolved ${packetReferences} packet references and ${scenarioReferences} scenario references across ${judgments.length} sealed judgments, including ${nestedSeedReferences} nested seed-content pointers. It rejected the nested seed path /seed/1/content at inclusive boundary 0, a wrong-file reference, and semantic unattempted with status served and a nonempty reply. Relative and absolute references to the sealed scenario resolved to the same file and fragment.\n\n## Sealed input hashes\n\n${Object.entries(hashes).map(([path, hash]) => `- \`${path}\`: ${hash}`).join('\n')}\n\n## Check result\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`
await writeFile(addendumPath, addendum.replace('# L14 alias b quality-boundary validation addendum', '# Successor alias d quality-boundary validation addendum'), { flag: 'wx' })
console.log(JSON.stringify({ ...result, addendum: addendumPath }, null, 2))
