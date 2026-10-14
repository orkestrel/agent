import { it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { BUILD, HARNESS } from '../constants.js'
import { readBuild } from '../build/helpers.js'
import { hashFile } from '../refit/helpers.js'

it('refuses missing and stale built bytes in every measured CLI before restoring exact isolated artifacts', () => {
	const parent = resolve('tmp/units/aggregate-runtime-build-fixtures')
	mkdirSync(parent, { recursive: true })
	const root = mkdtempSync(join(parent, 'proof-'))
	const frozen = readBuild()
	for (const file of frozen.sources) {
		const target = join(root, file.path)
		mkdirSync(dirname(target), { recursive: true })
		cpSync(join(HARNESS, file.path), target)
	}
	cpSync(join(HARNESS, 'node_modules'), join(root, 'node_modules'), { recursive: true })
	const build = join(root, '.build')
	for (const file of frozen.outputs) {
		const target = join(build, file.path)
		mkdirSync(dirname(target), { recursive: true })
		cpSync(join(BUILD, file.path), target)
	}
	const manifest = join(build, 'build-manifest.json')
	cpSync(join(BUILD, 'build-manifest.json'), manifest)
	const emitted = join(build, 'bench5/sustained.js')
	const original = readFileSync(manifest)
	const module = readFileSync(emitted)
	const outcomes: unknown[] = []
	try {
		for (const condition of ['missing', 'stale']) {
			if (condition === 'missing') unlinkSync(manifest)
			else {
				writeFileSync(manifest, original)
				writeFileSync(
					emitted,
					Buffer.concat([module, Buffer.from('\n// Deliberate stale emitted-byte control.\n')]),
				)
			}
			for (const entry of ['matrix', 'refit', 'bench', 'sustained']) {
				const args =
					entry === 'bench'
						? ['--dry', '--copy', '1']
						: entry === 'refit'
							? [
									'freeze',
									'--cache',
									join(root, 'never-read-cache'),
									'--out',
									join(root, 'never-created-corpus'),
								]
							: []
				const result = spawnSync(
					process.execPath,
					[join(build, 'bench5', entry + '.js'), ...args],
					{ encoding: 'utf8' },
				)
				assert.notEqual(result.status, 0)
				assert.match(
					result.stdout + result.stderr,
					condition === 'missing'
						? /missing canonical build manifest/
						: /missing or stale build input: bench5\/sustained.js/,
				)
				outcomes.push({
					condition,
					entry,
					args,
					exit: result.status,
					stdout: result.stdout,
					stderr: result.stderr,
				})
			}
		}
	} finally {
		writeFileSync(manifest, original)
		writeFileSync(emitted, module)
	}
	assert.deepEqual(readFileSync(manifest), original)
	assert.deepEqual(readFileSync(emitted), module)
	const restored = spawnSync(process.execPath, [emitted], { encoding: 'utf8' })
	assert.match(restored.stderr, /usage: sustained.js/)
	assert.doesNotMatch(restored.stderr, /missing or stale|missing canonical/)
	writeFileSync(
		join(root, 'proof.json'),
		JSON.stringify(
			{
				manifest: hashFile(manifest).hash,
				emitted: hashFile(emitted).hash,
				restored: true,
				outcomes,
			},
			null,
			2,
		),
	)
	console.log('BUILD_FIXTURE ' + root)
})
