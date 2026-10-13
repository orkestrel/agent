/**
 * Usage: node tmp/units/aggregate-final-q4-quality-retain.ts [--verify]
 * Exit 0: custody matches every original and seal; exit 1: custody refused.
 * Keeps the custody operation self-contained so its retained copy needs no siblings.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

interface Mapping {
	readonly original: string
	readonly archive: string
}

interface Reading extends Mapping {
	readonly bytes: number
	readonly sha256: string
}

interface Command {
	readonly command: string
	readonly exit: number
	readonly output: string
}

const CHECKOUT_PATH = 'C:/Users/mikes/WebstormProjects/scaffold'
const EXPECTED_HEAD = '17938ac917554f7cf4b82f5c12cfa107febed131'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-quality'
const SCRIPT_PATH = 'tmp/units/aggregate-final-q4-quality-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-final-q4-quality-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([
	{ original: 'tmp/units/aggregate-development-blind-packet-l14-b/packet.json', archive: 'packet.json' },
	{ original: 'tmp/units/aggregate-development-blind-packet-l14-b/private/joins.json', archive: 'joins.json' },
	{ original: 'tmp/units/aggregate-final-blind-b-judgments.json', archive: 'judgments.json' },
	{ original: 'tmp/units/aggregate-final-blind-b-report.md', archive: 'audit.md' },
	{ original: 'tmp/units/aggregate-l14-b-quality-joined-3.json', archive: 'joined.json' },
	{ original: 'tmp/units/aggregate-l14-b-quality-report-3.md', archive: 'joined.md' },
	{ original: 'tmp/units/aggregate-l14-b-quality-join-validation-3.md', archive: 'validation.md' },
	{ original: 'tmp/units/aggregate-l14-b-quality-boundary-addendum-2.md', archive: 'boundaries.md' },
	{ original: 'tmp/units/aggregate-l14-b-quality-boundary-check-2.ts', archive: 'boundary-check-2.ts' },
	{ original: 'tmp/units/aggregate-l14-b-quality-join-3.ts', archive: 'join-3.ts' },
	{ original: 'tmp/units/aggregate-l14-b-quality-boundary-check.ts', archive: 'boundary-check-original.ts' },
	{ original: 'tmp/units/aggregate-l14-b-quality-join-2.ts', archive: 'join-2.ts' },
	{ original: 'tmp/units/aggregate-l14-b-quality-join.ts', archive: 'join-original.ts' },
	{ original: 'tmp/units/aggregate-final-blind-b-check-report.md', archive: 'checker-original.md' },
	{ original: 'tmp/units/aggregate-final-blind-b-check-report-2.md', archive: 'checker-2.md' },
	{ original: 'tmp/units/aggregate-final-blind-b-check-report-3.md', archive: 'checker-3.md' },
	{ original: 'tmp/units/aggregate-final-blind-b-check-full-diff-3.patch', archive: 'full-helper-diff.patch' },
	{ original: 'tmp/units/aggregate-final-blind-b-check-incremental-diff-2-to-3.patch', archive: 'incremental-helper-diff-2-to-3.patch' },
])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'tmp/units/aggregate-final-blind-b-check-boundary.stdout.log',
	'tmp/units/aggregate-final-blind-b-check-boundary.stderr.log',
	'tmp/units/aggregate-final-blind-b-check-boundary.meta.json',
	'tmp/units/aggregate-final-blind-b-check-2-boundary.stdout.log',
	'tmp/units/aggregate-final-blind-b-check-2-boundary.stderr.log',
	'tmp/units/aggregate-final-blind-b-check-2-boundary.meta.json',
	'tmp/units/aggregate-final-blind-b-check-2-join.stdout.log',
	'tmp/units/aggregate-final-blind-b-check-2-join.stderr.log',
	'tmp/units/aggregate-final-blind-b-check-2-join.meta.json',
	'tmp/units/aggregate-final-blind-b-check-3-join.stdout.log',
	'tmp/units/aggregate-final-blind-b-check-3-join.stderr.log',
	'tmp/units/aggregate-final-blind-b-check-3-join.meta.json',
	'tmp/units/aggregate-final-blind-b-reader.ts',
	'tmp/units/aggregate-final-blind-b-brief.md',
	'tmp/units/aggregate-final-blind-b-check-brief.md',
	'tmp/units/aggregate-final-blind-b-check-brief-2.md',
	'tmp/units/aggregate-final-blind-b-check-brief-3.md',
	'tmp/units/aggregate-final-blind-b-check-run.ts',
	'tmp/units/aggregate-final-blind-b-check-run-2.ts',
	'tmp/units/aggregate-final-blind-b-check-run-3.ts',
	'tmp/units/aggregate-final-q4-quality-retain-brief.md',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['tmp/units/aggregate-development-blind-packet-l14-b/packet.json', '14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7'],
	['tmp/units/aggregate-final-blind-b-judgments.json', '237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7'],
	['tmp/units/aggregate-development-blind-packet-l14-b/private/joins.json', 'cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d'],
	['tmp/units/aggregate-l14-b-quality-joined-3.json', 'b2ac484bd438daf884eb37f8de6a9b164cf6c096e1fccb0ee3f15f45d6fecd29'],
])

function readCommand(arguments_: readonly string[]): Command {
	const result = spawnSync('git', [...arguments_], {
		cwd: CHECKOUT_PATH,
		encoding: 'utf8',
		shell: false,
		windowsHide: true,
		maxBuffer: 16 * 1024 * 1024,
	})
	if (result.error !== undefined || result.status !== 0) {
		throw new Error(`Git reading failed: git ${arguments_.join(' ')}; ${result.error?.message ?? result.stderr}`)
	}
	return { command: `git ${arguments_.join(' ')}`, exit: result.status, output: result.stdout }
}

function readFile(path: string): Buffer {
	const absolute = resolve(CHECKOUT_PATH, path)
	if (!existsSync(absolute)) throw new Error(`Missing input: ${path}`)
	if (!lstatSync(absolute).isFile()) throw new Error(`Input is not a regular file: ${path}`)
	return readFileSync(absolute)
}

function computeHash(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex')
}

function checkDestination(path: string, expected: Buffer, verify: boolean): void {
	const absolute = resolve(CHECKOUT_PATH, ARCHIVE_PATH, path)
	if (!existsSync(absolute)) {
		if (verify) throw new Error(`Missing destination: ${absolute}`)
		return
	}
	if (!lstatSync(absolute).isFile() || !readFileSync(absolute).equals(expected)) {
		throw new Error(`Conflicting destination bytes: ${absolute}`)
	}
}

function writeGenerated(path: string, bytes: Buffer): void {
	const absolute = resolve(CHECKOUT_PATH, ARCHIVE_PATH, path)
	if (!existsSync(absolute)) writeFileSync(absolute, bytes, { flag: 'wx' })
	if (!readFileSync(absolute).equals(bytes)) throw new Error(`Generated bytes differ: ${absolute}`)
}

function main(): void {
	const started = Date.now()
	const arguments_ = process.argv.slice(2)
	if (arguments_.length > 1 || (arguments_.length === 1 && arguments_[0] !== '--verify')) {
		throw new Error('Usage: node tmp/units/aggregate-final-q4-quality-retain.ts [--verify]')
	}
	if (resolve(process.cwd()) !== resolve(CHECKOUT_PATH)) throw new Error(`Wrong cwd: ${process.cwd()}`)
	const verify = arguments_[0] === '--verify'
	const head = readCommand(['rev-parse', 'HEAD'])
	if (head.output.trim() !== EXPECTED_HEAD) throw new Error(`Wrong HEAD: ${head.output.trim()}`)
	const status = readCommand(['status', '--porcelain=v1', '--untracked-files=all'])
	const changes = readCommand(['diff', '--name-only'])
	const staged = readCommand(['diff', '--cached', '--name-only'])
	const mappings = [...FIXED_MAPPINGS, ...BASENAME_PATHS.map((original) => ({ original, archive: basename(original) }))]
	const names = new Set<string>()
	const readings: Reading[] = []
	const contents = new Map<string, Buffer>()
	for (const mapping of mappings) {
		if (names.has(mapping.archive)) throw new Error(`Custody basename collision: ${mapping.archive}`)
		names.add(mapping.archive)
		const bytes = readFile(mapping.original)
		const sha256 = computeHash(bytes)
		const expected = EXPECTED_SEALS.get(mapping.original)
		if (expected !== undefined && sha256 !== expected) throw new Error(`Wrong seal: ${mapping.original}; expected ${expected}; found ${sha256}`)
		contents.set(mapping.original, bytes)
		readings.push({ ...mapping, bytes: bytes.length, sha256 })
		checkDestination(mapping.archive, bytes, verify)
	}
	const restoration = Buffer.from(`${JSON.stringify({ head: EXPECTED_HEAD, archive: ARCHIVE_PATH, files: readings }, null, 2)}\n`)
	const attributes = Buffer.from(ATTRIBUTES_TEXT)
	checkDestination('restoration.json', restoration, verify)
	checkDestination('.gitattributes', attributes, verify)
	if (!verify && existsSync(resolve(CHECKOUT_PATH, REPORT_PATH))) throw new Error(`Create-only report already exists: ${REPORT_PATH}`)
	if (!verify) {
		mkdirSync(resolve(CHECKOUT_PATH, ARCHIVE_PATH), { recursive: true })
		for (const mapping of mappings) {
			const target = resolve(CHECKOUT_PATH, ARCHIVE_PATH, mapping.archive)
			if (!existsSync(target)) copyFileSync(resolve(CHECKOUT_PATH, mapping.original), target, constants.COPYFILE_EXCL)
		}
		writeGenerated('.gitattributes', attributes)
		writeGenerated('restoration.json', restoration)
	}
	for (const reading of readings) {
		const original = readFile(reading.original)
		const archived = readFileSync(resolve(CHECKOUT_PATH, ARCHIVE_PATH, reading.archive))
		const prior = contents.get(reading.original)
		if (prior === undefined || !original.equals(prior) || !archived.equals(original) || computeHash(archived) !== reading.sha256) {
			throw new Error(`Byte/hash equality failed: ${reading.original}`)
		}
	}
	checkDestination('restoration.json', restoration, true)
	checkDestination('.gitattributes', attributes, true)
	const census = readdirSync(resolve(CHECKOUT_PATH, ARCHIVE_PATH), { withFileTypes: true })
	for (const entry of census) {
		if (!entry.isFile() || (!names.has(entry.name) && !['.gitattributes', 'restoration.json', 'README.md'].includes(entry.name))) {
			throw new Error(`Unexpected archive member: ${entry.name}`)
		}
	}
	const finish = readCommand(['rev-parse', 'HEAD'])
	const finishStatus = readCommand(['status', '--porcelain=v1', '--untracked-files=all'])
	const finishChanges = readCommand(['diff', '--name-only'])
	const finishStaged = readCommand(['diff', '--cached', '--name-only'])
	if (finish.output !== head.output) throw new Error(`HEAD changed: ${finish.output.trim()}`)
	if (finishChanges.output !== changes.output || finishStaged.output !== staged.output) throw new Error('Tracked working or staged paths changed during custody')
	const bytes = readings.reduce((total, reading) => total + reading.bytes, 0)
	const owned = readings.length + 2
	const total = bytes + restoration.length + attributes.length
	const restorationHash = computeHash(restoration)
	const durationMs = Date.now() - started
	if (!verify) {
		const commandRows = [head, status, changes, staged, finish, finishStatus, finishChanges, finishStaged]
		const lines = [
			'# Qwen4 blind quality custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'All fixed mappings are covered. Supplemental files preserve their basenames; no filename collision occurred. The retained blind-B reader and join-3 binder preserve their mapping logic. The sealed audit brief, all three checker briefs, and this retention brief are included. The original and successor failure evidence remains intact.',
			'',
			'## Record mappings',
			'',
			'The following measurements were read from the originals and verified against the custody copies during this run.',
			'',
			'| Original path | Archive-relative path | Bytes | SHA-256 | Equality |',
			'| --- | --- | ---: | --- | --- |',
			...readings.map((reading) => `| \`${reading.original}\` | \`${reading.archive}\` | ${reading.bytes} | \`${reading.sha256}\` | exact |`),
			'',
			'## Record execution',
			'',
			`All commands ran from \`${CHECKOUT_PATH}\` on Windows. \`node ${SCRIPT_PATH}\` exited 0 after all equality and preservation checks; it invoked the following read-only Git commands without a shell.`,
			'',
			'| Command | Exit |',
			'| --- | ---: |',
			...commandRows.map((command) => `| \`${command.command}\` | ${command.exit} |`),
			'',
			'Before custody, Git status was:',
			'',
			'```text',
			status.output.trimEnd(),
			'```',
			'',
			'After custody, Git status was:',
			'',
			'```text',
			finishStatus.output.trimEnd(),
			'```',
			'',
			'Tracked working paths remained:',
			'',
			'```text',
			changes.output.trimEnd() || '(none)',
			'```',
			'',
			'Staged paths remained:',
			'',
			'```text',
			staged.output.trimEnd() || '(none)',
			'```',
			'',
			'## Record deviations',
			'',
			'No separate blind-B binder file exists; the retained join-3 helper owns raw-to-packet binding. All required audit, reader, and checker brief files present in the checkout are retained. No other deviation occurred. Generated manifest and attributes are separately measured; root authors and accepts the README.',
			'',
		]
		writeFileSync(resolve(CHECKOUT_PATH, REPORT_PATH), lines.join('\n'), { flag: 'wx' })
	}
	process.stdout.write(`${JSON.stringify({ operation: verify ? 'verify' : 'retain', files: readings.length, bytes, owned, total, durationMs, restoration: { bytes: restoration.length, sha256: restorationHash }, head: finish.output.trim(), report: REPORT_PATH }, null, 2)}\n`)
}

try {
	main()
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
}
