import type { ReferenceFixture } from './types.ts'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ROOT } from './constants.ts'

/** Builds owned inert reference files around byte copies of the real relocated driver.
 * @param directory - The owned temporary fixture directory
 * @returns The actual driver entry and contained output destination
 */
export function buildReferenceFixture(directory: string): ReferenceFixture {
	const harness = join(directory, 'instruments', 'harness')
	const driver = join(harness, 'bench4')
	mkdirSync(driver, { recursive: true })
	for (const name of [
		'Driver.ts',
		'bench.ts',
		'types.ts',
		'constants.ts',
		'helpers.ts',
		'validators.ts',
	])
		copyFileSync(join(ROOT, 'bench4', name), join(driver, name))
	for (const vendor of ['agent-0.0.30-trimmed', 'ollama']) {
		const destination = join(harness, 'vendor', vendor)
		mkdirSync(destination, { recursive: true })
		copyFileSync(join(ROOT, 'vendor', vendor, 'index.js'), join(destination, 'index.js'))
	}
	mkdirSync(join(harness, 'bench'), { recursive: true })
	copyFileSync(join(ROOT, 'bench', 'rescore.mjs'), join(harness, 'bench', 'rescore.mjs'))
	const rows =
		Array.from({ length: 10 }, (_, index) =>
			JSON.stringify({ goal: `fixture-goal-${index}`, success: true }),
		).join('\n') + '\n'
	const sources: string[] = []
	for (const arm of ['a4-refined', 'a5-records']) {
		for (let copy = 1; copy <= 8; copy += 1) {
			const source = join(
				directory,
				'instruments',
				'results',
				'v9',
				`${arm}-v${copy}`,
				'ledger.jsonl',
			)
			mkdirSync(dirname(source), { recursive: true })
			writeFileSync(source, rows)
			sources.push(source)
		}
	}
	return {
		entry: join(driver, 'bench.ts'),
		out: join(harness, 'tmp', 'bench4', 'references'),
		sources,
		text: rows,
	}
}
