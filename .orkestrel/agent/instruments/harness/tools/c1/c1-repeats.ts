// Counts, per run, the lookup calls that repeat an earlier call of the same goal with the same tool and
// arguments, which the trial's own `repeats` counter reads only from the ledger's refusal note and so
// never sees in a plain arm. Usage: node tmp/units/c1-repeats.ts RUN_DIR...
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface Receipt {
	readonly goal: string
	readonly tool: string
	readonly arguments: Readonly<Record<string, unknown>>
}

function isReceipt(value: unknown): value is Receipt {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'goal') === 'string' &&
		typeof Reflect.get(value, 'tool') === 'string' &&
		typeof Reflect.get(value, 'arguments') === 'object'
	)
}

for (const dir of process.argv.slice(2)) {
	const receipts = readFileSync(join(dir, 'receipts.jsonl'), 'utf8')
		.split('\n')
		.filter((line) => line.length > 0)
		.map((line): unknown => JSON.parse(line))
		.filter(isReceipt)
	const seen = new Map<string, number>()
	const goals = new Map<string, number>()
	let repeats = 0
	for (const receipt of receipts) {
		if (receipt.tool === 'recall') continue
		const key = `${receipt.goal}\u0000${receipt.tool}\u0000${JSON.stringify(receipt.arguments)}`
		const count = seen.get(key) ?? 0
		seen.set(key, count + 1)
		if (count > 0) {
			repeats += 1
			goals.set(receipt.goal, (goals.get(receipt.goal) ?? 0) + 1)
		}
	}
	const worst = [...goals.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5)
	console.log(
		`${dir}: lookups ${receipts.filter((receipt) => receipt.tool !== 'recall').length}, repeated ${repeats} across ${goals.size} goals; worst ${worst.map(([goal, count]) => `${goal}=${count}`).join(', ') || 'none'}`,
	)
}
