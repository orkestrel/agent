import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { executeSync } from '@orkestrel/process/server'
import { BUILD, ROOT } from '../aggregate-judge-counterfactual/constants.ts'
import { readBinding, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { FOCUSED, LABELS, PACKET, POPULATION, PREDECESSOR, SPECIFICATION, UNIT } from './constants.ts'
import { computeOperator } from './helpers.ts'

/** Retains scoped offline evidence in an optional verifier-owned destination. */
export class Verifier {
	/** Executes the real bound sources without copying or relocating runtime code.
	 * @param output - An optional vacant descendant of this checkout's temporary directory
	 * @returns Nothing after printing bare outputs and optionally retaining exact evidence
	 * @example new Verifier().execute('tmp/units/independent-boundary-evidence')
	 */
	execute(output?: string): void {
		if (output !== undefined) {
			const temporary = realpathSync(resolve(ROOT, 'tmp'))
			const descendant = relative(temporary, resolve(output))
			if (descendant === '' || descendant === '..' || descendant.startsWith(`..${sep}`) || isAbsolute(descendant) || existsSync(output)) throw new Error('Check output must be a vacant temporary descendant')
			let cursor = temporary
			for (const segment of descendant.split(sep)) {
				cursor = resolve(cursor, segment)
				if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error('Check output crosses a symbolic link')
			}
			mkdirSync(resolve(output))
		}
		const authored = readdirSync(UNIT).filter(name => name.endsWith('.ts') || name === 'tsconfig.json').toSorted()
		const commands = [
			['node_modules/typescript/bin/tsc', '-p', relative(ROOT, resolve(UNIT, 'tsconfig.json'))],
			...authored.filter(name => name.endsWith('.ts')).map(name => ['--check', relative(ROOT, resolve(UNIT, name))]),
			['--test', relative(ROOT, resolve(UNIT, 'proof.test.ts'))],
			['--test', relative(ROOT, resolve(UNIT, 'negative.test.ts'))],
			[relative(ROOT, resolve(UNIT, 'offline.config.ts'))],
		]
		const results = commands.map((args, index) => {
			const result = executeSync({ file: process.execPath, arguments: args }, { workspace: ROOT, strict: false })
			const expected = args.includes(relative(ROOT, resolve(UNIT, 'negative.test.ts'))) && args[0] === '--test' ? 1 : 0
			console.log(JSON.stringify({ args, expected, exit: result.code }))
			process.stdout.write(result.stdout)
			process.stderr.write(result.stderr)
			if (output !== undefined) {
				writeFileSync(resolve(output, `gate-${index}.stdout.txt`), result.stdout, { flag: 'wx' })
				writeFileSync(resolve(output, `gate-${index}.stderr.txt`), result.stderr, { flag: 'wx' })
			}
			if (result.code !== expected || result.truncated) throw new Error(`Scoped gate failed: ${JSON.stringify(args)}`)
			return { args, expected, ...result }
		})
		const status = executeSync({ file: 'git', arguments: ['status', '--porcelain'] }, { workspace: ROOT })
		const diff = executeSync({ file: 'git', arguments: ['diff', '--stat'] }, { workspace: ROOT })
		const inventory = authored.map(name => ({ ...readBinding(resolve(UNIT, name)), text: readFileSync(resolve(UNIT, name), 'utf8') }))
		const additions = inventory.map(entry => `diff --git a/${entry.path} b/${entry.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${entry.path}\n@@ -0,0 +1,${entry.text.split(/\r\n|\n/).length - (entry.text.endsWith('\n') ? 1 : 0)} @@\n${entry.text.replace(/\r\n/g, '\n').split('\n').filter((line, index, lines) => index !== lines.length - 1 || line !== '').map(line => `+${line}`).join('\n')}\n`).join('')
		const inputs = [BUILD, FOCUSED, PREDECESSOR, POPULATION, LABELS, SPECIFICATION, PACKET].map(path => readBinding(path))
		if (output !== undefined) {
			writeFileSync(resolve(output, 'additions.diff'), additions, { flag: 'wx' })
			writeArtifact(resolve(output, 'verification.json'), { results, status, diff, operator: computeOperator(), inventory, inputs, interpretation: 'Offline scoped observations only; no inference or independent acceptance.' })
		}
		console.log(JSON.stringify({ gates: results.length, authored: inventory.length, operator: computeOperator(), inputs, status: status.stdout, diff: diff.stdout, output }))
	}
}
