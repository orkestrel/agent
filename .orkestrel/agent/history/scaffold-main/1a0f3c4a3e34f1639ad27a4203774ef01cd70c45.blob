import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { BENCH_ENTRY, FETCH_OBSERVER, OUTPUT } from './constants.ts'
import { containsPath } from './helpers.ts'
import { buildReferenceFixture } from './setup.ts'

test('refuses offline fetch before creating run output and preserves CLI exclusions', () => {
	mkdirSync(OUTPUT, { recursive: true })
	const directory = mkdtempSync(join(OUTPUT, 'owned-guard-'))
	try {
		const observer = join(directory, 'observe.ts')
		writeFileSync(observer, FETCH_OBSERVER)
		const out = join(directory, 'refused')
		const refusal = spawnSync(
			process.execPath,
			['--import', pathToFileURL(observer).href, BENCH_ENTRY, '--copy', '1', '--out', out],
			{ encoding: 'utf8', timeout: 10000 },
		)
		assert.equal(refusal.status, 1, refusal.stderr)
		assert.match(refusal.stderr, /Fetch guard: request 1 \(agent\) refused; --live is required/)
		assert.match(refusal.stdout, /Actual fetch requests=0/)
		assert.equal(existsSync(out), false)
		for (const args of [
			['--copy', '1'],
			['--copy', '1', '--dry', '--out', out],
			['--references', out, '--copy', '1'],
		]) {
			const rejected = spawnSync(process.execPath, [BENCH_ENTRY, ...args], {
				encoding: 'utf8',
				timeout: 10000,
			})
			assert.equal(rejected.status, 1)
			assert.equal(existsSync(out), false)
		}
		const escaped = spawnSync(
			process.execPath,
			[BENCH_ENTRY, '--copy', '1', '--out', dirname(OUTPUT)],
			{ encoding: 'utf8', timeout: 10000 },
		)
		assert.equal(escaped.status, 1)
		assert.match(escaped.stderr, /Output must stay under harness\/tmp\/bench4/)
	} finally {
		assert.ok(containsPath(OUTPUT, directory))
		rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 })
	}
})

test('preserves the real archive reference-source refusal without writing', () => {
	mkdirSync(OUTPUT, { recursive: true })
	const directory = mkdtempSync(join(OUTPUT, 'owned-archive-refusal-'))
	try {
		const out = join(directory, 'references')
		const result = spawnSync(process.execPath, [BENCH_ENTRY, '--references', out], {
			encoding: 'utf8',
			timeout: 10000,
		})
		assert.equal(result.status, 1)
		assert.match(result.stderr, /Missing reference run: a4-refined-v1/)
		assert.equal(existsSync(out), false)
	} finally {
		assert.ok(containsPath(OUTPUT, directory))
		rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 })
	}
})

test('copies inert reference rows through the real driver and refuses overwrites before writing', () => {
	mkdirSync(OUTPUT, { recursive: true })
	const directory = mkdtempSync(join(OUTPUT, 'owned-references-'))
	try {
		const fixture = buildReferenceFixture(directory)
		const out = fixture.out
		const result = spawnSync(process.execPath, [fixture.entry, '--references', out], {
			encoding: 'utf8',
			timeout: 10000,
		})
		assert.equal(result.status, 0, result.stderr)
		assert.match(result.stdout, /Copied \d+ reference files read-only/)
		for (const arm of ['a4-refined', 'a5-records']) {
			for (let copy = 1; copy <= 8; copy += 1) {
				const run = `${arm}-v${copy}`
				const names = readdirSync(join(out, run))
				assert.ok(names.length > 0)
				for (const name of names)
					assert.equal(readFileSync(join(out, run, name), 'utf8'), fixture.text)
			}
		}
		const repeated = spawnSync(process.execPath, [fixture.entry, '--references', out], {
			encoding: 'utf8',
			timeout: 10000,
		})
		assert.equal(repeated.status, 1)
		assert.match(repeated.stderr, /Reference output already exists/)
	} finally {
		for (const run of readdirSync(directory, { recursive: true, withFileTypes: true }))
			if (run.isFile()) chmodSync(join(run.parentPath, run.name), 0o666)
		assert.ok(containsPath(OUTPUT, directory))
		rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 })
	}
})

test('refuses a reference output child that links to another directory', (context) => {
	mkdirSync(OUTPUT, { recursive: true })
	const directory = mkdtempSync(join(OUTPUT, 'owned-reference-link-'))
	try {
		const fixture = buildReferenceFixture(directory)
		const out = fixture.out
		const target = join(directory, 'target')
		mkdirSync(out, { recursive: true })
		mkdirSync(target)
		try {
			symlinkSync(target, join(out, 'a4-refined-v1'), 'junction')
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!('code' in error) ||
				!['EPERM', 'ENOTSUP', 'EACCES'].includes(String(error.code))
			)
				throw error
			context.diagnostic(`Symlink proof unavailable: ${error.message}`)
			return
		}
		const refusal = spawnSync(process.execPath, [fixture.entry, '--references', out], {
			encoding: 'utf8',
			timeout: 10000,
		})
		assert.equal(refusal.status, 1)
		assert.match(refusal.stderr, /Symbolic-link output is refused/)
		assert.deepEqual(readdirSync(target), [])
	} finally {
		assert.ok(containsPath(OUTPUT, directory))
		rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 })
	}
})
