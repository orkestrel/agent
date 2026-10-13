import { createHash, randomBytes } from 'node:crypto'
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

interface GoalTruth {
	readonly id: string
	readonly request: string
	readonly after: number
	readonly facts: readonly number[]
	readonly stale: readonly number[]
	readonly expected: readonly string[]
	readonly expectedAny: readonly string[]
	readonly forbidden: readonly string[]
	readonly forbiddenPatterns: readonly string[]
}

interface PublicGoal {
	readonly id: string
	readonly request: string
	readonly eligibleSource: { readonly seedPrefixThrough: number }
	readonly truth: Omit<GoalTruth, 'id' | 'request'>
	readonly status: 'served' | 'failed' | 'unattempted'
	readonly reply: string | undefined
	readonly actions: readonly { readonly call: unknown; readonly result: string | undefined }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
	if (!isRecord(value)) throw new Error(`${label} must be an object`)
	return value
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(`${label} must be a string`)
	return value
}

function requireNumber(value: unknown, label: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`${label} must be an integer`)
	return value
}

function requireArray(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
	return value
}

function readJson(path: string): unknown {
	const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
	return value
}

function readLines(path: string): readonly unknown[] {
	return readFileSync(path, 'utf8')
		.split(/\r\n|\n/)
		.filter((line) => line.length > 0)
		.map((line) => {
			const value: unknown = JSON.parse(line)
			return value
		})
}

function readStrings(record: Record<string, unknown>, key: string): readonly string[] {
	if (record[key] === undefined) return []
	return requireArray(record[key], `goal.${key}`).map((entry) => requireString(entry, `goal.${key}[]`))
}

function readNumbers(record: Record<string, unknown>, key: string): readonly number[] {
	if (record[key] === undefined) return []
	return requireArray(record[key], `goal.${key}`).map((entry) => requireNumber(entry, `goal.${key}[]`))
}

function readOptions(args: readonly string[]): ReadonlyMap<string, readonly string[]> {
	const options = new Map<string, string[]>()
	for (let index = 0; index < args.length; index += 1) {
		const key = args[index]
		if (key === undefined || !key.startsWith('--')) throw new Error(`Unexpected argument: ${key ?? ''}`)
		const value = args[index + 1]
		if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`)
		const values = options.get(key) ?? []
		values.push(value)
		options.set(key, values)
		index += 1
	}
	return options
}

function readOne(options: ReadonlyMap<string, readonly string[]>, key: string): string {
	const values = options.get(key)
	if (values === undefined || values.length !== 1) throw new Error(`Expected exactly one ${key}`)
	const value = values[0]
	if (value === undefined) throw new Error(`Missing ${key}`)
	return value
}

function readMany(options: ReadonlyMap<string, readonly string[]>, key: string): readonly string[] {
	const values = options.get(key)
	if (values === undefined || values.length === 0) throw new Error(`Expected at least one ${key}`)
	return values
}

function readGoal(value: unknown): GoalTruth {
	const goal = requireRecord(value, 'scenario goal')
	return {
		id: requireString(goal.id, 'goal.id'),
		request: requireString(goal.request, 'goal.request'),
		after: requireNumber(goal.after, 'goal.after'),
		facts: readNumbers(goal, 'facts'),
		stale: readNumbers(goal, 'stale'),
		expected: readStrings(goal, 'expected'),
		expectedAny: readStrings(goal, 'expectedAny'),
		forbidden: readStrings(goal, 'forbidden'),
		forbiddenPatterns: readStrings(goal, 'forbiddenPatterns'),
	}
}

function hashFile(path: string): Promise<string> {
	return new Promise((resolveHash, rejectHash) => {
		const hash = createHash('sha256')
		const stream = createReadStream(path)
		stream.on('error', rejectHash)
		stream.on('data', (chunk: Buffer) => hash.update(chunk))
		stream.on('end', () => resolveHash(hash.digest('hex')))
	})
}

function writeNew(path: string, content: string): void {
	writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' })
}

function makeRecord(runPath: string, scenario: Record<string, unknown>, salt: Buffer): {
	readonly publicRows: readonly PublicGoal[]
	readonly privateRows: readonly Record<string, string>[]
} {
	const resolvedRun = resolve(runPath)
	const runIdentity = createHash('sha256').update(resolvedRun).digest('hex')
	const goals = requireArray(scenario.goals, 'scenario.goals').map(readGoal)
	const goalById = new Map(goals.map((goal) => [goal.id, goal]))
	if (goalById.size !== goals.length) throw new Error('Scenario contains duplicate goal ids')
	const run = requireRecord(readJson(join(runPath, 'run.json')), 'run.json')
	if (run.copy !== 1) throw new Error(`Only copy1 runs are accepted; got copy ${String(run.copy)}`)
	const rows = readLines(join(runPath, 'rows.jsonl')).map((value) => requireRecord(value, 'row'))
	const rowByGoal = new Map<string, Record<string, unknown>>()
	for (const row of rows) {
		const id = requireString(row.goal, 'row.goal')
		if (!goalById.has(id)) throw new Error(`Row names unknown goal ${id}`)
		if (rowByGoal.has(id)) throw new Error(`Duplicate row for goal ${id}`)
		rowByGoal.set(id, row)
	}
	const tagged = new Map<string, Record<string, unknown>[]>()
	const assistantCalls = new Map<string, unknown>()
	for (const raw of readLines(join(runPath, 'messages.jsonl'))) {
		const message = requireRecord(raw, 'message')
		if (typeof message.goal !== 'string') continue
		const goal = message.goal
		if (!goalById.has(goal)) throw new Error(`Message names unknown goal ${goal}`)
		const messages = tagged.get(goal) ?? []
		messages.push(message)
		tagged.set(goal, messages)
		if (message.role === 'assistant' && message.calls !== undefined) {
			for (const rawCall of requireArray(message.calls, 'message.calls')) {
				const call = requireRecord(rawCall, 'tool call')
				const id = requireString(call.id, 'tool call.id')
				if (assistantCalls.has(id)) throw new Error(`Duplicate tool call id ${id}`)
				assistantCalls.set(id, call)
			}
		}
	}
	const publicGoals: PublicGoal[] = []
	const privateGoals: Record<string, string>[] = []
	for (const goal of goals) {
		const row = rowByGoal.get(goal.id)
		const messages = tagged.get(goal.id) ?? []
		const status = row === undefined ? 'unattempted' : row.partial === true || row.error !== undefined ? 'failed' : 'served'
		if (row === undefined && messages.length !== 0) throw new Error(`Goal ${goal.id} has message evidence but no row`)
		const calls = new Map<string, unknown>()
		const results = new Map<string, string>()
		for (const message of messages) {
			if (message.role === 'assistant' && message.calls !== undefined) {
				for (const rawCall of requireArray(message.calls, 'message.calls')) {
					const call = requireRecord(rawCall, 'tool call')
					calls.set(requireString(call.id, 'tool call.id'), call)
				}
			}
			if (message.role === 'tool') {
				const callId = requireString(message.call, 'tool result.call')
				if (results.has(callId)) throw new Error(`Duplicate tool result for ${callId}`)
				results.set(callId, requireString(message.content, 'tool result.content'))
			}
		}
		for (const callId of results.keys()) if (!calls.has(callId)) throw new Error(`Tool result ${callId} has no goal-local assistant call`)
		const actions = [...calls.entries()].map(([id, call]) => ({ call, result: results.get(id) }))
		const opaque = createHash('sha256').update(salt).update('\0').update(runIdentity).update('\0').update(goal.id).digest('hex').slice(0, 32)
		publicGoals.push({
			id: opaque,
			request: goal.request,
			eligibleSource: { seedPrefixThrough: goal.after },
		truth: {
			after: goal.after,
			facts: goal.facts,
			stale: goal.stale,
			expected: goal.expected,
			expectedAny: goal.expectedAny,
			forbidden: goal.forbidden,
			forbiddenPatterns: goal.forbiddenPatterns,
		},
			status,
			reply: row === undefined ? undefined : requireString(row.reply, `row(${goal.id}).reply`),
			actions,
		})
		privateGoals.push({ opaque, goal: goal.id, runIdentity, run: resolvedRun })
	}
	const publicPacket = publicGoals.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
	return {
		publicRows: publicPacket,
		privateRows: privateGoals,
	}
}

async function execute(args: readonly string[]): Promise<void> {
	const options = readOptions(args)
	const copyPath = resolve(readOne(options, '--copy'))
	const requestedOutput = readOne(options, '--out')
	if (!isAbsolute(requestedOutput)) throw new Error('Output path must be absolute')
	const outputPath = resolve(requestedOutput)
	const ownedRoot = resolve('tmp/units')
	const outputRelative = relative(ownedRoot, outputPath)
	const outputParts = outputRelative.split(sep)
	if (outputRelative === '' || outputRelative.startsWith(`..${sep}`) || outputRelative === '..' || isAbsolute(outputRelative) || !outputParts[0]?.startsWith('aggregate-development-blind-packet')) {
		throw new Error('Output path must remain under this unit\'s tmp/units prefix')
	}
	const runPaths = readMany(options, '--run').map((path) => resolve(path))
	if (new Set(runPaths).size !== runPaths.length) throw new Error('Duplicate run inputs are not allowed')
	const scenario = requireRecord(readJson(copyPath), 'copy1 scenario')
	const seed = requireArray(scenario.seed, 'scenario.seed')
	const toolData = requireRecord(scenario.tools, 'scenario.tools')
	const ledger = requireRecord(scenario.ledger, 'scenario.ledger')
	const salt = randomBytes(32)
	const truth = requireArray(scenario.goals, 'scenario.goals').map(readGoal)
	const reference = {
		system: requireString(ledger.system, 'scenario.ledger.system'),
		topics: ledger.topics,
		seed,
		tools: toolData,
		lookups: scenario.lookups,
		days: scenario.days,
		goals: truth.map((goal) => ({ ...goal, eligibleSeedPrefixThrough: goal.after })),
	}
	const exports = []
	for (const runPath of runPaths) exports.push(makeRecord(runPath, scenario, salt))
	const publicRows = exports.flatMap((entry) => entry.publicRows).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
	const privateRows = exports.flatMap((entry) => entry.privateRows)
	const uniqueIds = new Set(publicRows.map((entry) => entry.id))
	if (uniqueIds.size !== publicRows.length) throw new Error('Opaque goal ids must be globally unique')
	const files = [copyPath, ...runPaths.flatMap((path) => ['run.json', 'rows.jsonl', 'messages.jsonl'].map((name) => join(path, name)))]
	const hashes: Record<string, string> = {}
	for (const path of files) hashes[path] = await hashFile(path)
	const publicPayload = JSON.stringify({ reference, goals: publicRows }, null, '\t') + '\n'
	const privatePayload = JSON.stringify({ salt: salt.toString('hex'), joins: privateRows, hashes }, null, '\t') + '\n'
	mkdirSync(outputPath, { recursive: false })
	const privatePath = join(outputPath, 'private')
	mkdirSync(privatePath, { recursive: false })
	writeNew(join(outputPath, 'packet.json'), publicPayload)
	writeNew(join(privatePath, 'joins.json'), privatePayload)
	process.stdout.write(JSON.stringify({ output: outputPath, trajectories: exports.length, plannedPerTrajectory: truth.length, publicRows: publicRows.length, sha256: createHash('sha256').update(publicPayload).digest('hex') }) + '\n')
}

void execute(process.argv.slice(2)).catch((error: unknown) => {
	process.stderr.write(`${error instanceof Error ? error.message : 'Exporter failed'}\n`)
	process.exitCode = 1
})
