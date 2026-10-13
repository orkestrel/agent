import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { readExecution } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = resolve(import.meta.dirname, '..', '..')
const output = join(root, '.orkestrel', 'agent', 'instruments', 'results', 'l15', 'q4-think0', 'pilot')
const execution = readExecution(join(output, 'development', 'execution.json')).execution
let lastLine = ''

for await (const line of createInterface({
	input: createReadStream(join(output, 'development', 'l6-q4-think0-aggregate-v1', 'requests.jsonl'), { encoding: 'utf8' }),
	crlfDelay: Infinity,
})) {
	if (line.length > 0) lastLine = line
}

if (lastLine.length === 0) throw new Error('pilot request log has no event')
const value: unknown = JSON.parse(lastLine)
if (!isRecord(value)) throw new Error('last pilot request event is not an object')
const started = typeof value.started === 'number' ? value.started : undefined
const finished = typeof value.finished === 'number' ? value.finished : undefined
const failures = Array.isArray(value.failures)
	? value.failures.filter((failure): failure is string => typeof failure === 'string')
	: []

const metadata = {
	phase: execution.phase,
	sequence: typeof value.sequence === 'number' ? value.sequence : undefined,
	role: typeof value.role === 'string' ? value.role : undefined,
	sent: typeof value.sent === 'boolean' ? value.sent : undefined,
	status: typeof value.status === 'number' ? value.status : undefined,
	started,
	finished,
	duration: started !== undefined && finished !== undefined ? finished - started : undefined,
	failureCategories: failures,
	error: typeof value.error === 'string' ? value.error : undefined,
}

process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
