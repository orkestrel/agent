// Summarizes every c1 run under the harness tmp root: status, rows, costs by role, truncations, and lookups.
// Usage: node tmp/units/c1-summary.ts [BASE]
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface RoleTally {
	count: number
	length: number
	prompt: number
	completion: number
	wall: number
	failed: number
}

const base =
	process.argv[2] ??
	'C:/Users/mikes/WebstormProjects/agent/.orkestrel/agent/instruments/harness/tmp/c1'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readLines(path: string): Record<string, unknown>[] {
	if (!existsSync(path)) return []
	return readFileSync(path, 'utf8')
		.split('\n')
		.filter((line) => line.length > 0)
		.map((line): unknown => JSON.parse(line))
		.filter(isRecord)
}

function readNumber(value: unknown): number {
	return typeof value === 'number' ? value : 0
}

function readCount(row: Record<string, unknown>, member: string, inner: string): number {
	const group = row[member]
	return isRecord(group) ? readNumber(group[inner]) : 0
}

for (const key of ['q4', 'q2']) {
	for (const arm of ['records', 'compaction', 'full']) {
		const dir = join(base, key, arm)
		if (!existsSync(join(dir, 'run.json'))) continue
		const run: unknown = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'))
		if (!isRecord(run)) continue
		const rows = readLines(join(dir, 'rows.jsonl'))
		const requests = readLines(join(dir, 'requests.jsonl'))
		const byRole = new Map<string, RoleTally>()
		for (const request of requests) {
			const role = typeof request.role === 'string' ? request.role : 'unknown'
			const entry = byRole.get(role) ?? {
				count: 0,
				length: 0,
				prompt: 0,
				completion: 0,
				wall: 0,
				failed: 0,
			}
			entry.count += 1
			if (request.reason === 'length') entry.length += 1
			entry.prompt += readNumber(request.prompt)
			entry.completion += readNumber(request.completion)
			entry.wall += readNumber(request.wall)
			const failures = Array.isArray(request.failures) ? request.failures.length : 0
			if (readNumber(request.status) >= 400 || failures > 0) entry.failed += 1
			byRole.set(role, entry)
		}
		const prompts = rows.map((row) => readNumber(row.prompt))
		const replies = rows
			.filter((row) => row.success === true)
			.map((row) => (typeof row.reply === 'string' ? row.reply.length : 0))
		const sum = (values: readonly number[]): number => values.reduce((total, one) => total + one, 0)
		console.log(
			JSON.stringify({
				key,
				arm,
				status: run.status,
				rows: rows.length,
				ok: rows.filter((row) => row.success === true).length,
				partial: rows.filter((row) => row.partial === true).length,
				unserved: run.unserved,
				wallMin: Math.round(readNumber(run.wall) / 60000),
				tokens: run.tokens,
				requests: run.requests,
				turns: run.turns,
				walls: run.walls,
				faults: Array.isArray(run.faults) ? run.faults.length : 0,
				lookups: sum(rows.map((row) => readCount(row, 'lookups', 'calls'))),
				repeats: sum(rows.map((row) => readCount(row, 'lookups', 'repeats'))),
				maxLookups: Math.max(0, ...rows.map((row) => readCount(row, 'lookups', 'calls'))),
				recalls: sum(rows.map((row) => readCount(row, 'recalls', 'calls'))),
				passes: sum(rows.map((row) => readNumber(row.passes))),
				sections: readNumber(rows.at(-1)?.sections),
				folds: sum(rows.map((row) => readNumber(row.folds))),
				merges: sum(rows.map((row) => readNumber(row.merges))),
				promptMax: Math.max(0, ...prompts),
				promptMean: prompts.length === 0 ? 0 : Math.round(sum(prompts) / prompts.length),
				meanReplyChars: replies.length === 0 ? 0 : Math.round(sum(replies) / replies.length),
				byRole: Object.fromEntries(byRole),
			}),
		)
	}
}
