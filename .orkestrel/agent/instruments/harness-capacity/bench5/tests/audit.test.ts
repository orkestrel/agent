import { BUILD } from '../constants.js'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const HARNESS = dirname(dirname(import.meta.dirname))
const ITEMS = join(BUILD, 'audit', 'items.js')
const TALLY = join(BUILD, 'audit', 'tally.js')
const SHORT = join(HARNESS, 'bench', 'variants', 'v1.json')
const LONG = join(HARNESS, 'bench', 'scenario-long.json')
const LONG_FLAGS = ['--count', '24', '--variants', 'long', '--seed', 'scenario-long.json']
const scratch = mkdtempSync(join(tmpdir(), 'audit-'))
let built = 0

// Recorded from the tools before the edit, run on the 10-row fixture that `buildSuite` writes with the legacy layout.
// Each digest covers a written file with every id replaced, so the recorded bytes hold across the random salt.
const BASELINE = {
	passes: {
		stdout: 'items 22',
		items: '5c3545b95b79bd4b72372c3cf7a4f6b4be23867cc861eaac1cc5d614ad3e69b5',
		keys: '06f1d2af58c3d6e3bb18f568a5a8cd842506128957d26ca1d58f97c6b5d1133d',
	},
	failures: {
		stdout: 'items 18',
		items: '8b84c06926505cbc01c9b5533ef8518d1b7ee17c1e9892e519116e89498f2705',
		keys: 'ba7f5fb53a9689b1246f04700996cd8e570e6c8bb25d4e864baaf7b665c0b355',
	},
	tally: [
		'run scorer false-pass ambiguous+ misread ambiguous- | low high',
		'd-aggregate-v1 7 1 0 0 0 | 6 6',
		'd-aggregate-v2 6 0 1 0 0 | 5 6',
		'd-control-v1 5 0 0 1 0 | 6 6',
		'd-control-v2 4 0 0 0 1 | 4 5',
		'',
		'd-aggregate against d-control, copies 1-2',
		'  low: d 0, 1; mean 0.50; lower bound -0.50; does not clear',
		'  high: d 0, 1; mean 0.50; lower bound -0.50; does not clear',
		'  across: d 0, 0; mean 0.00; lower bound 0.00; does not clear',
		'',
	].join('\n'),
}

// The tally of the 24-row fixture, worked by hand from the pass counts and verdicts that `buildSuite` writes.
const LONG_TALLY = [
	'run scorer false-pass ambiguous+ misread ambiguous- | low high',
	'l-aggregate-v1 18 1 0 0 0 | 17 17',
	'l-aggregate-v2 16 0 1 0 0 | 15 16',
	'l-control-v1 12 0 0 1 0 | 13 13',
	'l-control-v2 12 0 0 0 1 | 12 13',
	'',
	'l-aggregate against l-control, copies 1-2',
	'  low: d 4, 3; mean 3.50; lower bound 2.50; clears',
	'  high: d 4, 3; mean 3.50; lower bound 2.50; clears',
	'  across: d 4, 2; mean 3.00; lower bound 1.00; clears',
	'',
].join('\n')

interface Outcome {
	readonly status: number | null
	readonly stdout: string
	readonly stderr: string
}

interface Suite {
	readonly cwd: string
	readonly results: string
	readonly audit: string
	readonly keys: string
	readonly runs: readonly string[]
}

interface Scenario {
	readonly seed: ReadonlyArray<{ readonly content: string }>
	readonly goals: ReadonlyArray<{
		readonly id: string
		readonly request: string
		readonly facts?: readonly number[]
	}>
}

function runTool(tool: string, args: readonly string[], cwd: string): Outcome {
	const outcome = spawnSync(process.execPath, [tool, ...args], { cwd, encoding: 'utf8' })
	return { status: outcome.status, stdout: outcome.stdout, stderr: outcome.stderr }
}

function readScenario(file: string): Scenario {
	return JSON.parse(readFileSync(file, 'utf8'))
}

function createDirectory(label: string): string {
	built += 1
	const path = join(scratch, `${label}-${built}`)
	mkdirSync(path, { recursive: true })
	return path
}

// The first `passes` goals pass; the rest fail with a missing phrase.
function renderRows(goals: readonly string[], passes: number, tag: string): string {
	const lines = goals.map((goal, at) => {
		const success = at < passes
		return JSON.stringify({
			goal,
			success,
			missing: success ? [] : ['289'],
			violations: [],
			patternViolations: [],
			replyVia: 'send_reply',
			reply: `${tag} ${goal}`,
		})
	})
	return `${lines.join('\n')}\n`
}

// Items of one goal tie on the sort, and the salted id breaks the tie, so the digest sorts the items without their ids.
function digestItems(text: string): string {
	const list: Array<Record<string, unknown>> = JSON.parse(text)
	const lines = list.map(({ id, ...rest }) => JSON.stringify(rest)).sort()
	return createHash('sha256').update(lines.join('\n')).digest('hex')
}

function digestKeys(text: string): string {
	return createHash('sha256')
		.update(text.replace(/"id": "[0-9a-f]{8}"/g, '"id": "ID"'))
		.digest('hex')
}

// An aggregate run's first goal takes a false pass in copy 1 and an ambiguous in copy 2; a control run's first failing
// goal takes a misread in copy 1 and an ambiguous in copy 2; every other row is correct.
function decideVerdict(
	run: string,
	passes: Readonly<Record<string, number>>,
	goals: readonly string[],
	goal: string,
): string {
	const at = goals.indexOf(goal)
	const copy1 = run.endsWith('-v1')
	if (run.includes('aggregate') && at === 0) return copy1 ? 'false-pass' : 'ambiguous'
	if (run.includes('control') && at === passes[run]) return copy1 ? 'misread' : 'ambiguous'
	return 'correct'
}

// Writes the runs under results/, extracts passes and failures with `items.ts`, and writes one verdict file over every
// key. The legacy layout holds one row file and a memory file; the bench5 layout holds the six files of a bench5 run, of
// which only rows.jsonl holds the rows.
function buildSuite(
	layout: 'legacy' | 'bench5',
	goals: readonly string[],
	passes: Readonly<Record<string, number>>,
	flags: readonly string[],
): Suite {
	const cwd = createDirectory(layout)
	const results = join(cwd, 'results')
	const audit = join(cwd, 'audit')
	const keys = join(cwd, 'keys')
	const runs = Object.keys(passes)
	mkdirSync(audit)
	mkdirSync(join(cwd, 'items'))
	mkdirSync(join(cwd, 'long'))
	const long = readFileSync(LONG, 'utf8')
	writeFileSync(join(cwd, 'scenario-long.json'), long)
	for (const copy of [1, 2]) writeFileSync(join(cwd, 'long', `v${copy}.json`), long)
	for (const run of runs) {
		const base = join(results, run)
		mkdirSync(base, { recursive: true })
		const rows = renderRows(goals, passes[run] ?? 0, 'rows')
		if (layout === 'legacy') {
			writeFileSync(join(base, 'bench.jsonl'), rows)
			writeFileSync(join(base, 'memory.jsonl'), renderRows(goals.slice(0, 3), 3, 'memory'))
			continue
		}
		writeFileSync(join(base, 'aggregates.jsonl'), renderRows(goals, goals.length, 'aggregates'))
		writeFileSync(join(base, 'calls.jsonl'), renderRows(goals.slice(0, 7), 7, 'calls').repeat(3))
		writeFileSync(join(base, 'judgments.jsonl'), '{"question":"q","answer":"yes"}\n')
		writeFileSync(join(base, 'messages.jsonl'), '{"seed":0,"role":"user","content":"hello"}\n')
		writeFileSync(join(base, 'rows.jsonl'), rows)
		writeFileSync(join(base, 'selections.jsonl'), '{"topic":"t"}\n')
	}
	const verdicts: Array<{ id: string; verdict: string }> = []
	for (const which of ['passes', 'failures']) {
		const outcome = runTool(
			ITEMS,
			[
				'--dir',
				results,
				'--rows',
				which,
				'--items',
				join(cwd, 'items', `items-${which}.json`),
				'--keys',
				keys,
				...flags,
				...runs,
			],
			cwd,
		)
		assert.equal(outcome.status, 0, outcome.stderr)
		const list: Array<{ id: string; run: string; goal: string }> = JSON.parse(
			readFileSync(join(keys, `key-items-${which}.json`), 'utf8'),
		)
		for (const key of list)
			verdicts.push({ id: key.id, verdict: decideVerdict(key.run, passes, goals, key.goal) })
	}
	writeFileSync(join(audit, 'verdicts-all.json'), `${JSON.stringify(verdicts, null, 1)}\n`)
	return { cwd, results, audit, keys, runs }
}

after(() => {
	rmSync(scratch, { recursive: true, force: true })
})

describe('items.ts and tally.ts with defaults', () => {
	const goals = readScenario(SHORT).goals.map((goal) => goal.id)
	const passes = { 'd-aggregate-v1': 7, 'd-control-v1': 5, 'd-aggregate-v2': 6, 'd-control-v2': 4 }

	it('writes the recorded items, keys, and counts on 10-row runs', () => {
		const suite = buildSuite('legacy', goals, passes, [])
		for (const which of ['passes', 'failures'] as const) {
			const items = readFileSync(join(suite.cwd, 'items', `items-${which}.json`), 'utf8')
			const keys = readFileSync(join(suite.keys, `key-items-${which}.json`), 'utf8')
			const written: unknown[] = JSON.parse(items)
			assert.equal(`items ${written.length}`, BASELINE[which].stdout)
			assert.match(items, /^\[\n \{\n {2}"id": "[0-9a-f]{8}",\n/)
			assert.ok(items.endsWith('\n }\n]\n'))
			assert.equal(digestItems(items), BASELINE[which].items)
			assert.equal(digestKeys(keys), BASELINE[which].keys)
		}
	})

	it('prints the item count and the ids in item order', () => {
		const suite = buildSuite('legacy', goals, passes, [])
		const out = join(suite.cwd, 'order.json')
		const outcome = runTool(
			ITEMS,
			[
				'--dir',
				suite.results,
				'--rows',
				'passes',
				'--items',
				out,
				'--key',
				join(suite.cwd, 'order-key.json'),
				...suite.runs,
			],
			suite.cwd,
		)
		assert.equal(outcome.status, 0, outcome.stderr)
		const [head, list] = outcome.stdout.split('\n')
		const written: Array<{ id: string }> = JSON.parse(readFileSync(out, 'utf8'))
		assert.equal(head, BASELINE.passes.stdout)
		assert.deepEqual(
			JSON.parse(list ?? ''),
			written.map((item) => item.id),
		)
	})

	it('prints the recorded tally on 10-row runs', () => {
		const suite = buildSuite('legacy', goals, passes, [])
		const outcome = runTool(
			TALLY,
			['--audit', suite.audit, '--keys', suite.keys, '--pair', 'd-aggregate,d-control,1-2'],
			suite.cwd,
		)
		assert.equal(outcome.status, 0, outcome.stderr)
		assert.equal(outcome.stdout, BASELINE.tally)
	})

	it('refuses a 24-row run when the count stays at the default', () => {
		const cwd = createDirectory('refuse')
		const base = join(cwd, 'results', 'r-aggregate-v1')
		mkdirSync(base, { recursive: true })
		writeFileSync(
			join(base, 'rows.jsonl'),
			renderRows(
				readScenario(LONG).goals.map((goal) => goal.id),
				20,
				'rows',
			),
		)
		const outcome = runTool(
			ITEMS,
			[
				'--dir',
				join(cwd, 'results'),
				'--rows',
				'passes',
				'--items',
				join(cwd, 'items.json'),
				'--key',
				join(cwd, 'key.json'),
				'r-aggregate-v1',
			],
			cwd,
		)
		assert.equal(outcome.status, 1)
		assert.equal(outcome.stderr, 'r-aggregate-v1: no 10-row file\n')
	})

	it('exits 64 on a malformed --count', () => {
		const items = runTool(
			ITEMS,
			[
				'--dir',
				scratch,
				'--rows',
				'passes',
				'--items',
				join(scratch, 'x.json'),
				'--key',
				join(scratch, 'y.json'),
				'--count',
				'0',
				'a-v1',
			],
			scratch,
		)
		assert.equal(items.status, 64)
		assert.match(items.stderr, /--count takes a positive integer, not 0/)
		const tally = runTool(TALLY, ['--audit', scratch, '--count', 'many'], scratch)
		assert.equal(tally.status, 64)
		assert.match(tally.stderr, /--count takes a positive integer, not many/)
	})
})

describe('items.ts and tally.ts on 24-row runs', () => {
	const long = readScenario(LONG)
	const goals = long.goals.map((goal) => goal.id)
	const passes = {
		'l-aggregate-v1': 18,
		'l-control-v1': 12,
		'l-aggregate-v2': 16,
		'l-control-v2': 12,
	}

	it('reads rows.jsonl among six files and the long copy that --variants names', () => {
		const suite = buildSuite('bench5', goals, passes, LONG_FLAGS)
		const items: Array<{ goal: string; reply: string; request: string }> = JSON.parse(
			readFileSync(join(suite.cwd, 'items', 'items-passes.json'), 'utf8'),
		)
		assert.equal(items.length, 18 + 12 + 16 + 12)
		assert.ok(items.every((item) => item.reply.startsWith('rows ')))
		const target = long.goals.find((goal) => goal.id === 'g11-grace-signoff-today')
		assert.notEqual(target, undefined)
		assert.ok(items.some((item) => item.goal === target?.id && item.request === target.request))
	})

	it('reads the facts of a long goal from the seed that --seed names', () => {
		const suite = buildSuite('bench5', goals, passes, LONG_FLAGS)
		const items: Array<{ goal: string; facts: string[] }> = JSON.parse(
			readFileSync(join(suite.cwd, 'items', 'items-failures.json'), 'utf8'),
		)
		const target = long.goals.find((goal) => goal.id === 'g24-halvorsen-claim')
		const indices = target?.facts ?? []
		assert.ok(indices.some((index) => index >= readScenario(SHORT).seed.length))
		const item = items.find((entry) => entry.goal === target?.id)
		assert.deepEqual(
			item?.facts,
			indices.map((index) => long.seed[index]?.content),
		)
	})

	it('tallies two 24-row copies with --count 24 and refuses them at the default', () => {
		const suite = buildSuite('bench5', goals, passes, LONG_FLAGS)
		const accepted = runTool(
			TALLY,
			[
				'--audit',
				suite.audit,
				'--keys',
				suite.keys,
				'--count',
				'24',
				'--pair',
				'l-aggregate,l-control,1-2',
			],
			suite.cwd,
		)
		assert.equal(accepted.status, 0, accepted.stderr)
		assert.equal(accepted.stdout, LONG_TALLY)
		const refused = runTool(
			TALLY,
			['--audit', suite.audit, '--keys', suite.keys, '--pair', 'l-aggregate,l-control,1-2'],
			suite.cwd,
		)
		assert.equal(refused.status, 1)
		assert.equal(refused.stderr, 'l-aggregate-v1: 24 audited rows where 10 are required\n')
	})
})
