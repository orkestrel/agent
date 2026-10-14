import type { Guard } from '@orkestrel/contract'
import type {
	JudgmentInput,
	LedgerLookupResult,
	LedgerTopic,
	Message,
} from '../vendor/agent-0.0.30-trimmed/index.js'
import type { CalibrationRow, Scenario } from './types.ts'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { LEDGER_QUESTIONS } from '../vendor/agent-0.0.30-trimmed/index.js'
import { parseJSONAs } from '@orkestrel/contract'
import { OUTPUT, ROOT } from './constants.ts'

/** Checks containment through host path components without changing their case.
 * @param root - The permitted directory
 * @param path - The candidate path
 * @returns True if the candidate stays under the directory; false otherwise
 */
export function containsPath(root: string, path: string): boolean {
	const displacement = relative(resolve(root), resolve(path))
	return !isAbsolute(displacement) && displacement !== '..' && !displacement.startsWith(`..${sep}`)
}

/** Resolves an output beneath the real harness directory and refuses symbolic links.
 * @param given - The output path; omission selects the contained default
 * @returns The resolved output path
 * @throws Error Thrown when a path escapes, contains a symbolic link, or uses a nonportable segment
 */
export function resolveDestination(given: string = OUTPUT): string {
	const path = resolve(given)
	const root = realpathSync(ROOT)
	const permitted = join(root, 'tmp', 'bench4')
	if (!containsPath(permitted, path))
		throw new Error(`Output must stay under harness/tmp/bench4: ${path}`)
	let ancestor = parse(path).root
	for (const segment of relative(ancestor, path).split(sep)) {
		if (
			/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(segment) ||
			/[<>:"|?*]/.test(segment) ||
			[...segment].some((character) => character.charCodeAt(0) < 32) ||
			/[. ]$/.test(segment)
		)
			throw new Error(`Nonportable output segment: ${segment}`)
		ancestor = join(ancestor, segment)
		try {
			const entry = lstatSync(ancestor)
			if (entry.isSymbolicLink()) throw new Error(`Symbolic-link output is refused: ${ancestor}`)
			if (!entry.isDirectory()) throw new Error(`Output ancestor is not a directory: ${ancestor}`)
		} catch (error) {
			if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
		}
	}
	return path
}

/** Reads a preserved JSON value through its consumed-field guard.
 * @param path - The preserved file
 * @param guard - The consumed-field contract
 * @returns The validated value
 * @throws Error Thrown when the file fails its contract
 */
export function readJSON<T>(path: string, guard: Guard<T>): T {
	const value = parseJSONAs(readFileSync(path, 'utf8'), guard)
	if (value === undefined) throw new Error(`Invalid preserved input: ${path}`)
	return value
}

/** Reads preserved NDJSON rows through their consumed-field guard.
 * @param path - The preserved file
 * @param guard - The consumed-field contract
 * @returns The validated rows
 * @throws Error Thrown when a row fails its contract
 */
export function readRows<T>(path: string, guard: Guard<T>): readonly T[] {
	return readFileSync(path, 'utf8')
		.split(/\r\n|\n/)
		.filter((line) => line.trim() !== '')
		.map((line) => {
			const value = parseJSONAs(line, guard)
			if (value === undefined) throw new Error(`Invalid preserved row: ${path}`)
			return value
		})
}

/** Hashes text or its historical JSON projection.
 * @param value - The text or serializable value
 * @returns Its SHA-256 digest
 */
export function computeDigest(value: unknown): string {
	return createHash('sha256')
		.update(typeof value === 'string' ? value : JSON.stringify(value))
		.digest('hex')
}

/** Describes an error and its causes without repeating cycles.
 * @param error - The failure to describe
 * @returns The historical cause-chain text
 */
export function describeError(error: unknown): string {
	const messages: string[] = []
	const seen = new Set<unknown>()
	while (error !== undefined && !seen.has(error)) {
		seen.add(error)
		messages.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
		error = error instanceof Error ? error.cause : undefined
	}
	return messages.join(' <- ')
}

/** Builds the historical terminal-reply system with the scenario date.
 * @param scenario - The preserved scenario
 * @returns The measured system text
 */
export function buildSystem(scenario: Scenario): string {
	let text = scenario.ledger.system
		.replace(
			'You must finish every request by calling send_reply with the complete answer; only the send_reply text counts as your answer.',
			'Finish every request with your complete answer as your final message; that message is what the shift lead receives.',
		)
		.replace(
			'the exact value you will use, before send_reply.',
			'the exact value you will use, before your final answer.',
		)
		.replace(/ After a lookup, you must call pin\b[^.]*\./, '')
	const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
		new Date(`${scenario.ledger.clock}T00:00:00Z`),
	)
	const date = `Today is ${weekday} ${scenario.ledger.clock}.`
	const end = text.indexOf('. ')
	text = end < 0 ? `${text} ${date}` : `${text.slice(0, end + 2)}${date} ${text.slice(end + 2)}`
	return `${text} Never cite a handle such as m12 or r5 in your answer.`
}

/** Reconstructs an archived question only when its measured wording matches.
 * @param row - The preserved calibration row
 * @param messages - The replayed seed messages
 * @param topics - The measured desk topics
 * @param model - The configured judge identity
 * @returns The reusable judgment input, or undefined for an unmatched row
 */
export function buildJudgment(
	row: CalibrationRow,
	messages: readonly Message[],
	topics: readonly LedgerTopic[],
	model: string,
): JudgmentInput | undefined {
	const message = row.index === undefined ? undefined : messages[row.index]
	let question: JudgmentInput['question'],
		sources: readonly string[],
		state: string,
		key: readonly string[]
	if (row.question === 'category' && message !== undefined) {
		if (row.order !== 'forward' && row.order !== 'reverse') return undefined
		question =
			row.order === 'reverse'
				? {
						...LEDGER_QUESTIONS.category,
						criteria: Object.fromEntries(
							Object.entries(LEDGER_QUESTIONS.category.criteria).reverse(),
						),
					}
				: LEDGER_QUESTIONS.category
		key = row.order === 'reverse' ? ['category', message.id, 'reverse'] : ['category', message.id]
		sources = [message.id]
		state = `${message.role}: ${message.content}`
	} else if (row.question === 'topic' && message !== undefined) {
		const topic = topics.find((candidate) => candidate.name === row.topic)
		if (topic === undefined) return undefined
		question = {
			form: 'noul',
			instructions: LEDGER_QUESTIONS.topic,
			criteria: {
				true: `The message concerns ${topic.name}: ${topic.criterion}`,
				false: `The message does not concern ${topic.name}`,
			},
		}
		key = ['topic', message.id, topic.name]
		sources = [message.id]
		state = `${message.role}: ${message.content}`
	} else if (row.question === 'amends' || row.question === 'supersedes') {
		const earlier = row.earlier === undefined ? undefined : messages[row.earlier],
			later = row.later === undefined ? undefined : messages[row.later]
		if (earlier === undefined || later === undefined) return undefined
		question = LEDGER_QUESTIONS[row.question]
		key = [row.question, earlier.id, later.id]
		sources = [earlier.id, later.id]
		state = `Earlier message: ${earlier.role}: ${earlier.content}\nLater message: ${later.role}: ${later.content}`
	} else return undefined
	if (row.asked !== undefined && row.asked !== JSON.stringify(question)) return undefined
	return { id: JSON.stringify(key), question, sources, state, model }
}

/** Reads ids and owners from the historical lookup text.
 * @param args - The lookup arguments
 * @param text - The recorded lookup reply
 * @returns The historical reading, or undefined for a missing record
 */
export function readLookup(
	args: Readonly<Record<string, unknown>>,
	text: string,
): LedgerLookupResult | undefined {
	if (/^no record\b/i.test(text)) return undefined
	const ids = new Set<string>()
	const argument = String(args.id ?? args.account ?? '')
		.trim()
		.toUpperCase()
	if (argument !== '') ids.add(argument)
	for (const [, id] of text.matchAll(/\b(?:order|account|ticket)\s+([A-Z]{2,}-\d+)/gi))
		if (id !== undefined) ids.add(id.toUpperCase())
	const owners = new Map<string, string[]>()
	for (const pattern of [
		/\baccount\s+([A-Z]{2,}-\d+)\s*\(([^)]+)\)/gi,
		/\baccount\s+([A-Z]{2,}-\d+):\s*([^,.;]+)/gi,
	]) {
		for (const [, id, name] of text.matchAll(pattern)) {
			if (id === undefined || name === undefined || !/\p{L}/u.test(name)) continue
			const names = owners.get(id.toUpperCase()) ?? []
			if (!names.includes(name.trim())) names.push(name.trim())
			owners.set(id.toUpperCase(), names)
		}
	}
	return { ids: [...ids], owners: [...owners].map(([id, names]) => ({ id, names })) }
}
