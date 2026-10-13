// Checks the strict scorer policy: the 18 scenario and variant files carry identical scoring fields, the stale-value
// and credit-check counterexamples from the frozen-harness audit fail, and a marked stale value still passes.
// Usage: node scorer-check.ts
// Exit codes: 0 when every case passes; 1 when any case fails.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clean, compileRules, scoreText } from '/home/user/agent/tmp/bench/rescore.mjs'

interface Goal {
	readonly id: string
	readonly expected?: readonly string[]
	readonly expectedAny?: readonly string[]
	readonly forbidden?: readonly string[]
	readonly forbiddenPatterns?: readonly string[]
}

interface Outcome {
	readonly label: string
	readonly ok: boolean
}

const BENCH = join(import.meta.dirname, '..', '..', '..')
const MAIN = join(BENCH, 'scenario.json')
const COPIES = [
	join(BENCH, '..', 'bench3', 'scenario.json'),
	...['', 'ledger'].flatMap((folder) => Array.from({ length: 8 }, (_, at) => join(BENCH, 'variants', folder, `v${at + 1}.json`))),
]
const CONTACT = 'Account manager Ines Albrecht is their contact.'
// Each input fails because a stale value or a denied credit check survives the scorer.
const FAILING: readonly (readonly [string, string])[] = [
	['g04-halvorsen-ticket', 'ESC-2219 is the corrected ticket, but use the incorrect ticket ESC-2291 for Halvorsen.'],
	['g05-luis-approval-note', 'Refund $289.00. Marcus approves. Copy Priya Raman. MX-4486 is the corrected code, but use the incorrect approval code MX-4471.'],
	['g01-luis-refund-amount', 'The price is $289.00, but pay the incorrect refund amount of $245.65.'],
	['g01-luis-refund-amount', 'The price is $289.00, but pay the incorrect refund amount of $43.35.'],
	['g08-halvorsen-credit', 'Albrecht: The $3,000 order can still be rejected because it will never fit.'],
	['g08-halvorsen-credit', 'Albrecht: There is no room for the $3,000 order.'],
	['g08-halvorsen-credit', 'Halvorsen Interiors has no credit room for the $3,000 reorder; Ines Albrecht manages the account.'],
	['g08-halvorsen-credit', `They have no room for another $3,000 order. ${CONTACT}`],
]

function goalsOf(file: string): readonly Goal[] {
	return JSON.parse(readFileSync(file, 'utf8')).goals
}

function scoringFields(goals: readonly Goal[]): string {
	return JSON.stringify(goals.map((goal) => [goal.id, goal.expected ?? [], goal.expectedAny ?? [], goal.forbidden ?? [], goal.forbiddenPatterns ?? []]))
}

function sameFields(): readonly Outcome[] {
	const main = scoringFields(goalsOf(MAIN))
	return COPIES.map((file) => ({ label: `${file} carries the scoring fields of ${MAIN}`, ok: scoringFields(goalsOf(file)) === main }))
}

function failingCases(goals: readonly Goal[]): readonly Outcome[] {
	return FAILING.map(([id, text]) => {
		const goal = goals.find((one) => one.id === id)
		const scored = goal === undefined ? undefined : scoreText(compileRules(goal), text)
		return { label: `${id} fails "${text}"`, ok: scored !== undefined && !clean(scored) }
	})
}

function passingCase(goals: readonly Goal[]): readonly Outcome[] {
	const goal = goals.find((one) => one.id === 'g04-halvorsen-ticket')
	if (goal === undefined) return [{ label: 'g04-halvorsen-ticket exists', ok: false }]
	const text = 'ESC-2219 (not ESC-2291)'
	return [{ label: `g04-halvorsen-ticket passes "${text}"`, ok: clean(scoreText(compileRules(goal), text)) }]
}

function main(): void {
	const goals = goalsOf(MAIN)
	const outcomes = [...sameFields(), ...failingCases(goals), ...passingCase(goals)]
	const failed = outcomes.filter((outcome) => !outcome.ok)
	process.stdout.write(`${outcomes.length - failed.length} of ${outcomes.length} cases pass\n${failed.map((outcome) => `FAIL ${outcome.label}\n`).join('')}`)
	process.exit(failed.length === 0 ? 0 : 1)
}

main()
