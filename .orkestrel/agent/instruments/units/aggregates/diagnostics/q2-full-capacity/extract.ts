import { closeSync, openSync, readSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = process.cwd()
const targetStart = 220297
const targetEnd = 238601
const selected = new Map<string, readonly number[]>([
	['tmp/units/aggregate-ollama-daemon-resume.log', [991, 992, 993, 1010, 1011, 1012, 1055, 1056, 1057]],
	[
		'tmp/units/aggregate-ollama-daemon-resume.err',
		[220299, 220300, 220536, 220537, 220637, 238190, 238191, 238427, 238428, 238528, 238529, 238530, 238597, 238598, 238599, 238600, 238601, 238602],
	],
])

function snapshot(path: string): {
	readonly text: string
	readonly size: number
	readonly hash: string
	readonly before: ReturnType<typeof statSync>
	readonly after: ReturnType<typeof statSync>
} {
	const before = statSync(path)
	const descriptor = openSync(path, 'r')
	const bytes = Buffer.alloc(before.size)
	let offset = 0
	try {
		while (offset < bytes.length) {
			const read = readSync(descriptor, bytes, offset, Math.min(1024 * 1024, bytes.length - offset), offset)
			if (read === 0) throw new Error(`short snapshot read at ${offset} of ${bytes.length}`)
			offset += read
		}
	} finally {
		closeSync(descriptor)
	}
	const after = statSync(path)
	return {
		text: bytes.toString('utf8'),
		size: bytes.length,
		hash: createHash('sha256').update(bytes).digest('hex'),
		before,
		after,
	}
}

function lines(text: string): readonly string[] {
	return text.split(/\r?\n/u)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function excerpt(path: string, numbers: readonly number[], text: string): string {
	const source = lines(text)
	return [
		`## ${path}`,
		...numbers.map((number) => `${number}: ${source[number - 1] ?? '<line absent in captured prefix>'}`),
	].join('\n')
}

const captureTime = new Date().toISOString()
const snapshots = new Map<string, ReturnType<typeof snapshot>>()
for (const path of selected.keys()) snapshots.set(path, snapshot(path))

const err = snapshots.get('tmp/units/aggregate-ollama-daemon-resume.err')
if (err === undefined) throw new Error('daemon stderr snapshot missing')
const errLines = lines(err.text)
const runSpan = errLines.slice(targetStart - 1, targetEnd)
const truncationLines = runSpan.filter((line) => /truncated\s*=/u.test(line))
const nonzeroTruncationLines = truncationLines.filter((line) => /truncated\s*=\s*[1-9]/u.test(line))
const warningLines = runSpan.filter((line) => /requested context size too large.*num_ctx=1068663/u.test(line))
const fullContextStarts = runSpan.filter((line) => /starting llama-server.*-c 262144/u.test(line))
const fullContextAllocations = runSpan.filter((line) => /llama_context: n_ctx\s*= 262144/u.test(line))
const fullSequenceAllocations = runSpan.filter((line) => /llama_context: n_ctx_seq\s*= 262144/u.test(line))
const smallContextStarts = runSpan.filter((line) => /starting llama-server.*-c 3072/u.test(line))
const log = snapshots.get('tmp/units/aggregate-ollama-daemon-resume.log')
if (log === undefined) throw new Error('daemon stdout snapshot missing')
const logLines = lines(log.text)
const apiPosts = logLines.slice(991, 1057).filter((line) => /POST\s+"\/api\/chat"/u.test(line))

const requestsPath = '.orkestrel/agent/instruments/results/l7/q2-think0/full/preflight/l6-q2-think0-full-v1/requests.jsonl'
const requests = snapshot(requestsPath)
const requestLines = lines(requests.text)
const requestRows = requestLines.filter((line) => line.trim() !== '').map((line) => {
	const entry: unknown = JSON.parse(line)
	if (!isRecord(entry) || !isRecord(entry.request) || !isRecord(entry.request.options))
		throw new Error('invalid request record')
	return { model: entry.request.model, numCtx: entry.request.options.num_ctx }
})
const requestModelContexts = new Map<string, number>()
for (const row of requestRows) {
	const key = `${String(row.model)} / ${String(row.numCtx)}`
	requestModelContexts.set(key, (requestModelContexts.get(key) ?? 0) + 1)
}
const requestSummary = [1, 20, 66].map((sequence) => {
	const line = requestLines[sequence - 1]
	if (line === undefined) throw new Error(`missing request sequence ${sequence}`)
	const entry: unknown = JSON.parse(line)
	if (!isRecord(entry) || !isRecord(entry.request) || !isRecord(entry.request.options))
		throw new Error(`invalid request sequence ${sequence}`)
	const record = entry
	return {
		sequence: record.sequence,
		sent: record.sent,
		status: record.status,
		prompt: record.prompt,
		completion: record.completion,
		failures: record.failures,
		model: entry.request.model,
		num_ctx: entry.request.options.num_ctx,
		truncate: entry.request.truncate,
	}
})

const metadata = (path: string, record: ReturnType<typeof snapshot>): string[] => [
	`- source: \`${path}\``,
	`- captured bytes: ${record.size}; SHA-256: \`${record.hash}\``,
	`- snapshot started: ${record.before.mtime.toISOString()}; snapshot ended: ${record.after.mtime.toISOString()}`,
	`- file size before/after read: ${record.before.size}/${record.after.size}`,
]

const parts = [
	'# Bounded full-view capacity evidence',
	'',
	`Capture time: ${captureTime}`,
	'',
	'## Source byte identities',
	'',
	...Array.from(snapshots, ([path, record]) => metadata(path, record).join('\n')),
	...metadata(requestsPath, requests),
	'',
	'## Exact request-record projection (prompt bodies omitted)',
	'',
	'```json',
	JSON.stringify(requestSummary, null, 2),
	'```',
	'',
	`## Runner-span truncation markers: ${truncationLines.length} total, ${nonzeroTruncationLines.length} nonzero`,
	'',
	`The bounded runner span has ${warningLines.length} oversized-context warnings, ${fullContextStarts.length} launches with -c 262144, ${fullContextAllocations.length} n_ctx allocations at 262144, ${fullSequenceAllocations.length} n_ctx_seq allocations at 262144, and ${smallContextStarts.length} launches with -c 3072. The selected daemon API interval has ${apiPosts.length} POST /api/chat rows; request artifact rows: ${requestRows.length}; request model/context groups: ${JSON.stringify(Array.from(requestModelContexts))}.`,
	'',
	'## Original daemon excerpts',
	'',
	...Array.from(selected, ([path, numbers]) => excerpt(path, numbers, snapshots.get(path)?.text ?? '<missing>')),
	'',
]

writeFileSync('tmp/units/aggregate-full-capacity/excerpts.md', parts.join('\n'))
console.log(`capture=${captureTime} requests=${requestSummary.length} truncation_markers=${truncationLines.length} nonzero=${nonzeroTruncationLines.length}`)
