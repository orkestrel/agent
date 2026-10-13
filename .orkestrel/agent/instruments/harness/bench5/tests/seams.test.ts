import { BUILD } from '../constants.js'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const HARNESS = dirname(dirname(import.meta.dirname))
const PROBE = join(BUILD, 'bench5', 'tools', 'artifacts', 'seams.js')
const VENDORED = join(HARNESS, 'vendor', 'agent-0.0.30-trimmed', 'index.js')
const VENDORED_URL = pathToFileURL(VENDORED).href
const README = join(HARNESS, 'README.md')
const scratch = mkdtempSync(join(tmpdir(), 'seams-'))
let written = 0

interface Outcome {
	readonly status: number | null
	readonly stdout: string
	readonly stderr: string
}

function probeBuild(args: readonly string[]): Outcome {
	const outcome = spawnSync(process.execPath, [PROBE, ...args], { cwd: HARNESS, encoding: 'utf8' })
	return { status: outcome.status, stdout: outcome.stdout, stderr: outcome.stderr }
}

async function listExports(): Promise<readonly string[]> {
	const build: unknown = await import('../../vendor/agent-0.0.30-trimmed/index.js')
	return typeof build === 'object' && build !== null ? Object.keys(build) : []
}

// Writes a module that re-exports the vendored build except `omit`, followed by `extra` source lines.
async function writeScratch(omit: string, extra: string): Promise<string> {
	const names = (await listExports()).filter((name) => name !== omit)
	written += 1
	const path = join(scratch, `build-${written}.js`)
	writeFileSync(path, `export { ${names.join(', ')} } from '${VENDORED_URL}'\n${extra}\n`)
	return path
}

function listFailures(stdout: string): readonly string[] {
	return stdout.split('\n').filter((line) => line.startsWith('FAIL '))
}

describe('seams.ts', () => {
	after(() => {
		rmSync(scratch, { recursive: true, force: true })
	})

	it('passes on the vendored build with no fetch call and the digest the README records', () => {
		const outcome = probeBuild(['--build', VENDORED])
		assert.equal(outcome.status, 0, outcome.stdout)
		assert.deepEqual(listFailures(outcome.stdout), [])
		assert.match(outcome.stdout, /^fetch calls 0$/m)
		const digest = createHash('sha256').update(readFileSync(VENDORED)).digest('hex')
		assert.match(outcome.stdout, new RegExp(`^sha256 ${digest}$`, 'm'))
		const readme = readFileSync(README, 'utf8')
		const row = readme
			.split('\n')
			.find((line) => line.startsWith('| `vendor/agent-0.0.30-trimmed/index.js`'))
		assert.ok(row !== undefined && row.includes(digest), 'README row for the vendored 0.0.30 build')
	})

	it('resolves a relative build path against the working directory', () => {
		const outcome = probeBuild(['--build', 'vendor/agent-0.0.30-trimmed/index.js'])
		assert.equal(outcome.status, 0, outcome.stdout)
	})

	it('prints parseable JSON with --json', () => {
		const outcome = probeBuild(['--build', VENDORED, '--json'])
		assert.equal(outcome.status, 0)
		const report: unknown = JSON.parse(outcome.stdout)
		assert.ok(typeof report === 'object' && report !== null)
		assert.equal(Reflect.get(report, 'fetchCalls'), 0)
		const seams = Reflect.get(report, 'seams')
		assert.ok(Array.isArray(seams) && seams.length > 0)
		assert.ok(seams.every((seam) => Reflect.get(seam, 'ok') === true))
	})

	it('loads an arbitrary artifact with a transitive top-level await', () => {
		const dependency = join(scratch, 'async-dependency.js')
		const path = join(scratch, 'async-build.js')
		writeFileSync(dependency, 'await Promise.resolve()\nexport const ready = true\n')
		writeFileSync(
			path,
			`import { ready } from './async-dependency.js'\nif (!ready) throw new Error('async dependency did not finish')\nexport * from '${VENDORED_URL}'\n`,
		)
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 0, outcome.stdout + outcome.stderr)
		assert.deepEqual(listFailures(outcome.stdout), [])
		assert.match(outcome.stdout, /^fetch calls 0$/m)
		const digest = createHash('sha256').update(readFileSync(path)).digest('hex')
		assert.match(outcome.stdout, new RegExp(`^sha256 ${digest}$`, 'm'))
	})

	it('blocks import-time fetch after transitive asynchronous evaluation', () => {
		const dependency = join(scratch, 'fetch-dependency.js')
		const path = join(scratch, 'fetch-build.js')
		writeFileSync(
			dependency,
			"await Promise.resolve()\nawait fetch('https://invalid.example/blocked-before-network')\n",
		)
		writeFileSync(path, `import './fetch-dependency.js'\nexport * from '${VENDORED_URL}'\n`)
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 1)
		assert.ok(
			listFailures(outcome.stdout).some(
				(line) => line.includes('import build') && line.includes('fetch is blocked'),
			),
		)
		assert.match(outcome.stdout, /^fetch calls 1$/m)
	})

	it('exits 1 with a line naming buildRecords on a build that omits it', async () => {
		const path = await writeScratch('buildRecords', '')
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 1)
		const failures = listFailures(outcome.stdout)
		assert.equal(failures.length, 1, outcome.stdout)
		assert.match(failures[0] ?? '', /buildRecords/)
		assert.match(outcome.stdout, /^fetch calls 0$/m)
	})

	it('exits 1 naming LEDGER_CATEGORIES on a build that omits it', async () => {
		const path = await writeScratch('LEDGER_CATEGORIES', '')
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 1)
		assert.ok(listFailures(outcome.stdout).some((line) => line.includes('LEDGER_CATEGORIES')))
	})

	it('exits 1 naming the note members on a build whose LEDGER_NOTES lacks one', async () => {
		const path = await writeScratch(
			'LEDGER_NOTES',
			'export const LEDGER_NOTES = Object.freeze({ cue: "c", results: "r", repeat: "p" })',
		)
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 1)
		assert.ok(listFailures(outcome.stdout).some((line) => line.includes('LEDGER_NOTES members')))
	})

	it('exits 1 on a build whose scope handler is not read at call time', async () => {
		const path = await writeScratch(
			'createScope',
			`import { createScope as create } from '${VENDORED_URL}'\nexport function createScope(input) { return create({ name: input.name }) }`,
		)
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 1)
		assert.ok(
			listFailures(outcome.stdout).some((line) =>
				line.includes('select reads the scope at call time'),
			),
		)
	})

	it('exits 1 on a build that fails to import', () => {
		const path = join(scratch, 'broken.js')
		writeFileSync(path, 'throw new Error("broken build")\n')
		const outcome = probeBuild(['--build', path])
		assert.equal(outcome.status, 1)
		assert.ok(
			listFailures(outcome.stdout).some(
				(line) => line.includes('import build') && line.includes('broken build'),
			),
		)
	})

	it('exits 64 with the usage line when --build is missing, valueless, or an unknown flag is given', () => {
		for (const args of [
			[],
			['--json'],
			['--build'],
			['--build', '--json'],
			['--build', VENDORED, '--other'],
		]) {
			const outcome = probeBuild(args)
			assert.equal(outcome.status, 64, args.join(' '))
			assert.match(
				outcome.stderr,
				/usage: node \.build\/bench5\/tools\/artifacts\/seams\.js --build PATH \[--json\]/,
			)
		}
	})
})
