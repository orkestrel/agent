import { BUILD } from '../constants.js'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const HARNESS = dirname(dirname(import.meta.dirname))
const SCRIPT = join(BUILD, 'bench5', 'copies.js')
const BASE_FILE = join(HARNESS, 'bench', 'scenario-long.json')
const LEDGER_DIR = join(HARNESS, 'bench', 'variants', 'ledger')
const LEDGER_GOALS = 10
const PREFIXES: readonly string[] = ['Quick check: ', 'Short ask: ']
const scratch = mkdtempSync(join(tmpdir(), 'copies-'))
let written = 0

interface Outcome {
	readonly status: number | null
	readonly stdout: string
	readonly stderr: string
}

type Edit = (goal: Record<string, unknown>) => void

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readGoals(file: string): ReadonlyArray<Record<string, unknown>> {
	const value: unknown = JSON.parse(readFileSync(file, 'utf8'))
	if (!isRecord(value) || !Array.isArray(value.goals)) throw new Error(`${file} holds no goals`)
	return value.goals.filter(isRecord)
}

function readRequest(goal: Record<string, unknown> | undefined): string {
	const request = goal?.request
	if (typeof request !== 'string') throw new Error('a goal holds no request')
	return request
}

function readBase(): Record<string, unknown> {
	const value: unknown = JSON.parse(readFileSync(BASE_FILE, 'utf8'))
	if (!isRecord(value)) throw new Error(`${BASE_FILE} is not an object`)
	return value
}

// Builds a conforming copy: the ledger copy's requests for g01 to g10 and a prefixed original for the rest.
function buildCopy(copy: number): Record<string, unknown> {
	const base = readBase()
	const ledger = readGoals(join(LEDGER_DIR, `v${copy}.json`))
	const prefix = PREFIXES[copy - 1] ?? ''
	const goals = readGoals(BASE_FILE).map((goal, at) => ({
		...goal,
		request: at < LEDGER_GOALS ? readRequest(ledger[at]) : `${prefix}${readRequest(goal)}`,
	}))
	return { ...base, goals }
}

function editGoal(
	copy: Record<string, unknown>,
	prefix: string,
	edit: Edit,
): Record<string, unknown> {
	const goals = Array.isArray(copy.goals) ? copy.goals.filter(isRecord) : []
	const edited = goals.map((goal) => {
		if (typeof goal.id !== 'string' || !goal.id.startsWith(prefix)) return goal
		const next = { ...goal }
		edit(next)
		return next
	})
	return { ...copy, goals: edited }
}

function appendRequest(suffix: string): Edit {
	return (goal) => {
		goal.request = `${readRequest(goal)}${suffix}`
	}
}

function replaceRequest(from: string, to: string): Edit {
	return (goal) => {
		goal.request = readRequest(goal).replace(from, to)
	}
}

function serialize(copy: Record<string, unknown>): string {
	return `${JSON.stringify(copy, null, '\t')}\n`
}

// Writes the text under a fresh folder as `name` and returns the path.
function writeCopy(name: string, text: string): string {
	written += 1
	const folder = join(scratch, `case-${written}`)
	mkdirSync(folder)
	const path = join(folder, name)
	writeFileSync(path, text)
	return path
}

function checkFiles(files: readonly string[]): Outcome {
	const outcome = spawnSync(process.execPath, [SCRIPT, ...files], {
		cwd: HARNESS,
		encoding: 'utf8',
	})
	return { status: outcome.status, stdout: outcome.stdout, stderr: outcome.stderr }
}

function refuseCopy(copy: Record<string, unknown>, reason: string): void {
	const outcome = checkFiles([writeCopy('v1.json', serialize(copy))])
	assert.equal(outcome.status, 2, outcome.stdout)
	assert.ok(outcome.stdout.includes(reason), `expected "${reason}" in:\n${outcome.stdout}`)
}

// Runs a scratch copy of the script whose source differs by one replacement, beside the base file it reads.
function checkMutated(from: string, to: string): Outcome {
	written += 1
	const root = join(scratch, `mutated-${written}`)
	mkdirSync(join(root, 'bench5'), { recursive: true })
	mkdirSync(join(root, 'bench'))
	copyFileSync(BASE_FILE, join(root, 'bench', 'scenario-long.json'))
	const source = readFileSync(SCRIPT, 'utf8')
	assert.ok(source.includes(from), `the script holds no "${from}" to replace`)
	const path = join(root, 'bench5', 'copies.ts')
	writeFileSync(path, source.replace(from, to))
	const outcome = spawnSync(process.execPath, [path], { cwd: root, encoding: 'utf8' })
	return { status: outcome.status, stdout: outcome.stdout, stderr: outcome.stderr }
}

describe('copies.ts', () => {
	after(() => {
		rmSync(scratch, { recursive: true, force: true })
	})

	it('passes conforming copies, with the startup self-tests refusing every broken edit first', () => {
		const first = writeCopy('v1.json', serialize(buildCopy(1)))
		const second = writeCopy('v2.json', serialize(buildCopy(2)))
		const outcome = checkFiles([first, second])
		assert.equal(outcome.status, 0, outcome.stdout + outcome.stderr)
		assert.match(outcome.stdout, /^self-tests \d+ refused as expected$/m)
		assert.match(outcome.stdout, /2 of 2 copy files pass/)
	})

	it('refuses a copy whose goals differ in count, order, or id', () => {
		const copy = buildCopy(1)
		const goals = Array.isArray(copy.goals) ? copy.goals : []
		refuseCopy({ ...copy, goals: goals.slice(1) }, 'goals differ in count, order, or id')
		refuseCopy({ ...copy, goals: [...goals].reverse() }, 'goals differ in count, order, or id')
	})

	it('refuses a copy that differs from the base outside goals[].request, and names the field', () => {
		refuseCopy({ ...buildCopy(1), title: 'Another desk' }, 'outside goals[].request in title')
		refuseCopy(
			editGoal(buildCopy(1), 'g11', (goal) => (goal.expected = ['marcus'])),
			'outside goals[].request in goals',
		)
	})

	it('refuses a copy that is not serialized with a tab indent and a final newline', () => {
		const copy = buildCopy(1)
		const reason = 'is not serialized as JSON.stringify(copy, null, '
		const compact = checkFiles([writeCopy('v1.json', `${JSON.stringify(copy)}\n`)])
		assert.equal(compact.status, 2)
		assert.ok(compact.stdout.includes(reason), compact.stdout)
		const bare = checkFiles([writeCopy('v1.json', JSON.stringify(copy, null, '\t'))])
		assert.equal(bare.status, 2)
		assert.ok(bare.stdout.includes(reason), bare.stdout)
	})

	it('refuses a g01 to g10 request that is not the ledger copy request, with the goal named', () => {
		const other = readRequest(readGoals(join(LEDGER_DIR, 'v2.json'))[2])
		refuseCopy(
			editGoal(buildCopy(1), 'g03', (goal) => (goal.request = other)),
			'g03-grace-escalation: the request differs from goals[2].request of ledger/v1.json',
		)
	})

	it('refuses a file that names no copy from v1.json to v8.json', () => {
		const outcome = checkFiles([writeCopy('w1.json', serialize(buildCopy(1)))])
		assert.equal(outcome.status, 2)
		assert.ok(
			outcome.stdout.includes('file name w1.json is not v1.json to v8.json'),
			outcome.stdout,
		)
	})

	it('refuses a g11 to g24 request that is the original text', () => {
		const original = readRequest(readGoals(BASE_FILE)[10])
		refuseCopy(
			editGoal(buildCopy(1), 'g11', (goal) => (goal.request = original)),
			'g11-grace-signoff-today: the request is the original text',
		)
	})

	it('refuses a g11 to g24 request that another checked copy already carries', () => {
		const first = writeCopy('v1.json', serialize(buildCopy(1)))
		const same = editGoal(
			buildCopy(2),
			'g14',
			(goal) => (goal.request = readRequest(readGoals(first)[13])),
		)
		const outcome = checkFiles([first, writeCopy('v2.json', serialize(same))])
		assert.equal(outcome.status, 2)
		assert.ok(
			outcome.stdout.includes('g14-beatriz-remedy: same request as v1.json'),
			outcome.stdout,
		)
	})

	it('refuses an empty request', () => {
		refuseCopy(
			editGoal(buildCopy(1), 'g11', (goal) => (goal.request = '  ')),
			'g11-grace-signoff-today: the request is empty',
		)
	})

	it('refuses each reworded request that breaks a request rule, with the goal and the rule named', () => {
		refuseCopy(
			editGoal(buildCopy(1), 'g16', appendRequest(' It is account LH-44870.')),
			'g16-walk-in-return: adds id LH-44870',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g16', appendRequest(' Allow 45 minutes.')),
			'g16-walk-in-return: adds number 45',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g16', appendRequest(' Ask Zoltan.')),
			'g16-walk-in-return: adds name Zoltan',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g16', appendRequest(' Is it extension 4127?')),
			'g16-walk-in-return: adds phone words (extension)',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g12', appendRequest(' Say free freight.')),
			'g12-copperline-gesture: adds scoring phrase "free freight"',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g12', appendRequest(' Offer a $50 store credit.')),
			'g12-copperline-gesture: adds forbidden pattern 1 of 1',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g14', replaceRequest('Beatriz Solano', 'Beatriz')),
			'g14-beatriz-remedy: drops name Beatriz Solano',
		)
		refuseCopy(
			editGoal(buildCopy(1), 'g08', replaceRequest('$3,000 ', '')),
			'g08-halvorsen-credit: drops number $3,000',
		)
	})

	it('refuses a sentence-initial name that the scenario names elsewhere', () => {
		refuseCopy(
			editGoal(buildCopy(1), 'g20', appendRequest(' Marcus can join.')),
			'g20-copperline-manager: adds name Marcus',
		)
	})

	it('reports an unreadable file with exit 2 and a flag with exit 64', () => {
		const missing = checkFiles([join(scratch, 'missing', 'v1.json')])
		assert.equal(missing.status, 2)
		assert.ok(missing.stdout.includes('unreadable'), missing.stdout)
		const usage = checkFiles(['--help'])
		assert.equal(usage.status, 64)
		assert.match(usage.stderr, /^usage: node bench5\/copies\.ts \[COPY_FILE \.\.\.\]$/m)
	})

	it('exits 2 at startup when a rule it must refuse stops refusing', () => {
		const pattern = checkMutated(
			'reasons.push(`adds forbidden pattern',
			'reasons.push(`adds a forbidden pattern',
		)
		assert.equal(pattern.status, 2)
		assert.ok(
			pattern.stderr.includes('does not refuse a g12 request that adds forbidden pattern'),
			pattern.stderr,
		)
		const initial = checkMutated('&& !known.has(words[0])', '&& true')
		assert.equal(initial.status, 2)
		assert.ok(
			initial.stderr.includes('does not refuse a g20 request that adds name Marcus'),
			initial.stderr,
		)
	})
})
