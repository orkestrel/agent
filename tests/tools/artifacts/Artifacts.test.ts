import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Artifacts, hashBytes, readArtifact } from '../../../tools/artifacts/index.ts'

test('inspects exact bytes offline and confines native ESM execution to admitted files', async (context) => {
	const workspace = resolve(fileURLToPath(new URL('../../../', import.meta.url)))
	const fixture = mkdtempSync(join(workspace, 'tmp', 'units', 'study-artifacts-fixture-'))
	context.after(() => rmSync(fixture, { recursive: true, force: true, maxRetries: 3 }))
	const root = join(fixture, 'subject')
	const dependency = join(root, 'node_modules', 'dependency')
	const entry = join(root, 'dist', 'index.js')
	const part = join(dependency, 'dist', 'index.js')
	const hook = join(workspace, 'tools', 'artifacts', 'handlers.ts')
	const marker = join(fixture, 'executed.txt')
	mkdirSync(join(root, 'dist'), { recursive: true })
	mkdirSync(join(root, 'src'), { recursive: true })
	mkdirSync(join(dependency, 'dist'), { recursive: true })
	writeFileSync(
		join(root, 'package.json'),
		JSON.stringify({ name: 'subject', version: '1.0.0', type: 'module' }),
	)
	writeFileSync(
		join(dependency, 'package.json'),
		JSON.stringify({
			name: 'dependency',
			version: '1.0.0',
			type: 'module',
			exports: { import: './dist/index.js', require: './dist/index.cjs' },
		}),
	)
	writeFileSync(part, 'export const value = 7\n')
	writeFileSync(join(dependency, 'dist', 'index.cjs'), 'module.exports = { value: 99 }\n')
	writeFileSync(join(root, 'src', 'index.js'), 'export const value = 100\n')
	writeFileSync(join(root, 'dist', 'data.json'), '{"message":"ran"}\n')
	writeFileSync(
		entry,
		`import { writeFileSync } from 'node:fs'; import { value } from 'dependency'; import data from './data.json' with { type: 'json' }; writeFileSync(${JSON.stringify(marker)}, data.message); export { value }; export const late = () => import('./late.js')\n`,
	)
	writeFileSync(join(root, 'dist', 'late.js'), 'export const value = 11\n')
	const options = { entries: [entry], roots: [root, dependency], hook }
	const child = join(fixture, 'child.ts')
	writeFileSync(
		child,
		`import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Artifacts } from ${JSON.stringify(new URL('../../../tools/artifacts/index.ts', import.meta.url).href)}
const artifacts = new Artifacts(${JSON.stringify(options)})
const inventory = artifacts.inspect()
if (process.argv[2] === 'drift') writeFileSync(${JSON.stringify(part)}, 'export const value = 8\\n')
const namespace: unknown = await artifacts.load(${JSON.stringify(entry)})
assert.equal(typeof namespace, 'object')
if (typeof namespace !== 'object' || namespace === null || !('value' in namespace)) throw new Error('Missing namespace')
let late: unknown
if (process.argv[2] === 'late' || process.argv[2] === 'late-drift') {
 if (process.argv[2] === 'late-drift') writeFileSync(${JSON.stringify(join(root, 'dist', 'late.js'))}, 'export const value = 12\\n')
 if (!('late' in namespace) || typeof namespace.late !== 'function') throw new Error('Missing late import')
 late = await namespace.late()
}
if (process.argv[2] === 'verify') writeFileSync(${JSON.stringify(part)}, 'export const value = 8\\n')
artifacts.verify()
console.log(JSON.stringify({ inventory, value: namespace.value, late }))
`,
	)

	await context.test('hashes exact dependency bytes without import side effects', () => {
		const artifacts = new Artifacts(options)
		const inventory = artifacts.inspect()
		assert.equal(existsSync(marker), false)
		assert.ok(inventory.files.some((file) => file.path === part))
		assert.ok(inventory.files.some((file) => file.path === join(dependency, 'dist', 'index.cjs')))
		assert.equal(inventory.node, process.version)
		assert.ok(Object.isFrozen(inventory.files))
		writeFileSync(part, 'export const value = 8\n')
		assert.notEqual(new Artifacts(options).inspect().digest, inventory.digest)
		assert.throws(() => artifacts.verify(), /drifted/)
		writeFileSync(part, 'export const value = 7\n')
		artifacts.verify()
	})

	await context.test('loads the selected built export and the native import condition', () => {
		const result = spawnSync(process.execPath, ['--experimental-strip-types', child, 'late'], {
			encoding: 'utf8',
			timeout: 15000,
		})
		assert.equal(result.status, 0, result.stderr)
		assert.match(result.stdout, /"value":7,"late":\{"value":11\}/)
		assert.equal(readFileSync(marker, 'utf8'), 'ran')
		writeFileSync(part, 'export const value = 13\n')
		const changed = spawnSync(process.execPath, ['--experimental-strip-types', child], {
			encoding: 'utf8',
			timeout: 15000,
		})
		assert.equal(changed.status, 0, changed.stderr)
		assert.match(changed.stdout, /"value":13/)
		writeFileSync(part, 'export const value = 7\n')
	})

	await context.test('refuses dependency drift before loading and before sealing', () => {
		for (const mode of ['drift', 'verify', 'late-drift']) {
			const result = spawnSync(process.execPath, ['--experimental-strip-types', child, mode], {
				encoding: 'utf8',
				timeout: 15000,
			})
			assert.notEqual(result.status, 0)
			assert.match(result.stderr, /drifted/)
			writeFileSync(part, 'export const value = 7\n')
			writeFileSync(join(root, 'dist', 'late.js'), 'export const value = 11\n')
		}
	})

	await context.test(
		'refuses source entries, relative roots, duplicate packages, and population drift',
		() => {
			assert.throws(
				() => new Artifacts({ ...options, entries: [join(root, 'src', 'index.js')] }).inspect(),
				/built ESM/,
			)
			assert.throws(
				() => new Artifacts({ ...options, roots: ['relative'] }).inspect(),
				/canonical package root/,
			)
			assert.throws(
				() => new Artifacts({ ...options, roots: [root, root] }).inspect(),
				/duplicated/,
			)
			const artifacts = new Artifacts(options)
			artifacts.inspect()
			writeFileSync(join(root, 'dist', 'added.js'), 'export const added = true\n')
			assert.throws(() => artifacts.verify(), /drifted/)
		},
	)

	await context.test(
		'refuses source, CommonJS, data URLs, and loader escapes at actual import edges',
		() => {
			for (const target of [
				'../src/index.js',
				'dependency/dist/index.cjs',
				'data:text/javascript,export const value=42',
				'node:module',
			]) {
				const specifier =
					target === 'dependency/dist/index.cjs'
						? '../node_modules/dependency/dist/index.cjs'
						: target
				writeFileSync(
					entry,
					`import * as dependency from ${JSON.stringify(specifier)}; export const value = dependency.value\n`,
				)
				const result = spawnSync(process.execPath, ['--experimental-strip-types', child], {
					encoding: 'utf8',
					timeout: 15000,
				})
				assert.notEqual(result.status, 0)
				assert.match(
					result.stderr,
					/Artifact (dependency is not admitted ESM|URL is unsupported|alternate loader is unsupported)/,
				)
			}
			writeFileSync(
				entry,
				"export const value = 1; export const late = () => import('../src/index.js')\n",
			)
			const late = spawnSync(process.execPath, ['--experimental-strip-types', child, 'late'], {
				encoding: 'utf8',
				timeout: 15000,
			})
			assert.notEqual(late.status, 0)
			assert.match(late.stderr, /not admitted ESM/)
		},
	)

	await context.test('changes the entry export itself and observes the changed built bytes', () => {
		writeFileSync(entry, 'export const value = 21\n')
		const before = new Artifacts(options).inspect()
		const original = spawnSync(process.execPath, ['--experimental-strip-types', child], {
			encoding: 'utf8',
			timeout: 15000,
		})
		assert.equal(original.status, 0, original.stderr)
		assert.match(original.stdout, /"value":21/)
		writeFileSync(entry, 'export const value = 22\n')
		assert.notEqual(new Artifacts(options).inspect().digest, before.digest)
		const changed = spawnSync(process.execPath, ['--experimental-strip-types', child], {
			encoding: 'utf8',
			timeout: 15000,
		})
		assert.equal(changed.status, 0, changed.stderr)
		assert.match(changed.stdout, /"value":22/)
	})

	await context.test(
		'checks helper bytes against an independent known digest and validates file paths',
		() => {
			assert.equal(
				hashBytes('abc'),
				'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
			)
			assert.equal(
				hashBytes(new TextEncoder().encode('abc')),
				'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
			)
			const file = readArtifact(entry)
			assert.equal(Buffer.from(file.source).toString(), 'export const value = 22\n')
			assert.equal(file.size, readFileSync(entry).byteLength)
			assert.throws(() => readArtifact('relative.js'), /canonical regular file/)
			assert.throws(() => readArtifact(root), /canonical regular file/)
		},
	)
})
