import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { computeHash, readArray, readObject, readString, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { INPUT_FILES, OPERATOR_FILES, PACKET, PREPARED, ROOT, UNIT } from './constants.ts'
import { computeOperator, readFileBinding, scanInventory } from './helpers.ts'

/** Retains exact predecessor comparisons and the completed source/input identities. */
export class Inventory {
	/** Freezes the source diffs and inventories without overwriting any packet.
	 * @returns Nothing after retaining final identities
	 */
	execute(): void {
		const predecessor = resolve(ROOT, 'tmp/units/aggregate-capacity-probe')
		const before = readArray(JSON.parse(readFileSync(resolve(UNIT, 'predecessor-before.json'), 'utf8')))
		const after = readdirSync(predecessor, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => {
			const path = resolve(entry.parentPath, entry.name)
			const bytes = readFileSync(path)
			return { path: relative(predecessor, path).split(sep).join('/'), hash: computeHash(bytes), bytes: bytes.length }
		}).sort((left, right) => left.path.localeCompare(right.path))
		assert.deepEqual(after, before)
		writeArtifact(resolve(UNIT, 'predecessor-after.json'), after)
		const outcomes = OPERATOR_FILES.map(name => {
			const result = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', resolve(predecessor, name), resolve(UNIT, name)], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true })
			assert.ok(result.status === 0 || result.status === 1, result.stderr)
			return { name, exit: result.status, stdout: result.stdout, stderr: result.stderr }
		})
		writeArtifact(resolve(UNIT, 'evidence/source-diff-commands.json'), outcomes)
		writeFileSync(resolve(UNIT, 'predecessor-source.diff'), outcomes.map(result => result.stdout).join(''), { flag: 'wx' })
		const sources = readdirSync(UNIT).filter(name => name.endsWith('.ts') || name === 'tsconfig.json').sort().map(name => readFileBinding(resolve(UNIT, name)))
		writeFileSync(resolve(UNIT, 'final-additions.diff'), sources.map(binding => {
			const lines = readFileSync(resolve(ROOT, binding.path), 'utf8').replace(/\n$/, '').split(/\r\n|\n/)
			return `diff --git a/${binding.path} b/${binding.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${binding.path}\n@@ -0,0 +1,${lines.length} @@\n${lines.map(line => `+${line}`).join('\n')}\n`
		}).join(''), { flag: 'wx' })
		const status = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true })
		assert.equal(status.status, 0, status.stderr)
		writeArtifact(resolve(UNIT, 'evidence/git-status.json'), { exit: status.status, stdout: status.stdout, stderr: status.stderr })
		const packet = readObject(JSON.parse(readFileSync(PACKET, 'utf8')))
		const inputs = INPUT_FILES.map(name => readFileBinding(resolve(PREPARED, name)))
		const operator = OPERATOR_FILES.map(name => readFileBinding(resolve(UNIT, name)))
		const operatorBytes = Buffer.byteLength(JSON.stringify(operator))
		assert.equal(computeOperator(), readString(packet.operator))
		const evidence = readdirSync(resolve(UNIT, 'evidence'), { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => readFileBinding(resolve(entry.parentPath, entry.name)))
		writeArtifact(resolve(UNIT, 'final-source-inventory.json'), { packet: readFileBinding(PACKET), operator: { hash: computeOperator(), bytes: operatorBytes, encoding: 'JSON.stringify of ordered OPERATOR_FILES bindings' }, sources, inputs, bindings: packet.bindings, prepared: scanInventory(PREPARED), evidence, predecessor: { before: readFileBinding(resolve(UNIT, 'predecessor-before.json')), after: readFileBinding(resolve(UNIT, 'predecessor-after.json')), unchanged: true }, diff: readFileBinding(resolve(UNIT, 'predecessor-source.diff')), additions: readFileBinding(resolve(UNIT, 'final-additions.diff')), node: process.version, platform: process.platform })
		console.log(JSON.stringify({ inventory: readFileBinding(resolve(UNIT, 'final-source-inventory.json')), packet: readFileBinding(PACKET), operator: computeOperator(), operatorBytes, inputs, predecessor: 'unchanged', diff: readFileBinding(resolve(UNIT, 'predecessor-source.diff')), status: status.stdout }))
	}
}
