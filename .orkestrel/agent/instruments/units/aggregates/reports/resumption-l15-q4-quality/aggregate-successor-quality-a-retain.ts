/**
 * Usage: node tmp/units/aggregate-successor-quality-a-retain.ts [--verify]
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
const EXPECTED_HEAD = 'bfafe543ca73595233b0733289589d78d46d121c'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l15-q4-quality'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-quality-a-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-quality-a-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([
	{ original: 'tmp/units/aggregate-development-blind-packet-successor-a/packet.json', archive: 'packet.json' },
	{ original: 'tmp/units/aggregate-development-blind-packet-successor-a/private/joins.json', archive: 'joins.json' },
	{ original: 'tmp/units/aggregate-successor-quality-a-judgments.json', archive: 'judgments.json' },
	{ original: 'tmp/units/aggregate-successor-quality-a-report.md', archive: 'audit.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-brief.md', archive: 'audit-brief.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-joined.json', archive: 'joined.json' },
	{ original: 'tmp/units/aggregate-successor-quality-a-joined.md', archive: 'joined.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-join-validation.md', archive: 'validation.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-boundary-addendum.md', archive: 'boundaries.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-join.ts', archive: 'join-original.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-a-join-sealed.ts', archive: 'join-sealed.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-a-boundary.ts', archive: 'boundary-original.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-a-boundary-sealed.ts', archive: 'boundary-sealed.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-join-preparation-report.md', archive: 'join-preparation.md' },
	{ original: 'tmp/units/aggregate-successor-quality-join-preparation-brief.md', archive: 'join-preparation-brief.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-join.diff', archive: 'join-preparation.diff' },
	{ original: 'tmp/units/aggregate-successor-quality-a-seal.ts', archive: 'seal.ts' },
	{ original: 'tmp/units/aggregate-development-blind-packet-export.ts', archive: 'packet-export.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-a-validation-report.md', archive: 'verifier.md' },
	{ original: 'tmp/units/aggregate-successor-quality-a-validation-brief.md', archive: 'verifier-brief.md' },
])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'tmp/units/aggregate-successor-quality-a-validation-join.stdout.txt',
	'tmp/units/aggregate-successor-quality-a-validation-join.stderr.txt',
	'tmp/units/aggregate-successor-quality-a-validation-join.meta.json',
	'tmp/units/aggregate-successor-quality-a-validation-boundary.stdout.txt',
	'tmp/units/aggregate-successor-quality-a-validation-boundary.stderr.txt',
	'tmp/units/aggregate-successor-quality-a-validation-boundary.meta.json',
	'tmp/units/aggregate-successor-quality-retention-preparation.md',
	'tmp/units/aggregate-successor-quality-a-retain.diff',
	'tmp/units/aggregate-successor-quality-retention-brief.md',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['tmp/units/aggregate-development-blind-packet-successor-a/packet.json', '6d10d40bc303dc09c4db2d643fbc913cafe647899e070703a7856db9a7641745'],
	['tmp/units/aggregate-successor-quality-a-judgments.json', '83c4dea97eaffd9a9dac1a5b9377f516f543f03f7b1abef54453270ddc79eeb2'],
	['tmp/units/aggregate-development-blind-packet-successor-a/private/joins.json', '9254b82a2417bd56b46bac38851d3c9af36dd5a69a0d27b638f81f369fcd4be3'],
	['tmp/units/aggregate-successor-quality-a-joined.json', '91105db2eb3278df282f103350d0f4c27d23eaf4d2d05aa18c8dabd3bf337f1b'],
	['tmp/units/aggregate-successor-quality-a-joined.md', 'c998e9e38dc4f3619f91d8f105e25c4168ef44e9ea59a18352217939a460891d'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-quality-a-retain.ts [--verify]')
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
			'# l15 Qwen4 blind quality custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'All fixed mappings are covered. Supplemental files preserve their basenames; no filename collision occurred. The original and sealed join/boundary readers, join preparation evidence, seal script, unchanged packet exporter, analyst report/brief, verifier report/brief and complete captures, and retention preparation evidence are included. The sealed originals remain intact.',
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
			'No separate clean analyst reader or boundary-specific preparation artifact was found for this packet. The retained sealed join owns raw-to-packet binding. The immutable verifier report retains its disclosed full completeWork transcription error; the complete raw join capture is retained as authoritative evidence, and root records the correction separately. Generated manifest and attributes are separately measured; root authors and accepts the README.',
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
