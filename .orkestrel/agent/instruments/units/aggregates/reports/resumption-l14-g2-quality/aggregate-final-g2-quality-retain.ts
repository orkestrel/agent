/**
 * Usage: node tmp/units/aggregate-final-g2-quality-retain.ts [--verify]
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
const EXPECTED_HEAD = '648943d43d538436a0a125bdc9f27b315e4de2c3'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-g2-quality'
const SCRIPT_PATH = 'tmp/units/aggregate-final-g2-quality-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-final-g2-quality-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([
	{ original: 'tmp/units/aggregate-development-blind-packet-l14-a/packet.json', archive: 'packet.json' },
	{ original: 'tmp/units/aggregate-development-blind-packet-l14-a/private/joins.json', archive: 'joins.json' },
	{ original: 'tmp/units/aggregate-final-blind-a-judgments.json', archive: 'judgments.json' },
	{ original: 'tmp/units/aggregate-final-blind-a-report.md', archive: 'audit.md' },
	{ original: 'tmp/units/aggregate-l14-a-quality-joined.json', archive: 'joined.json' },
	{ original: 'tmp/units/aggregate-l14-a-quality-report.md', archive: 'joined.md' },
	{ original: 'tmp/units/aggregate-l14-a-quality-join-validation.md', archive: 'validation.md' },
	{ original: 'tmp/units/aggregate-l14-a-quality-boundary-addendum.md', archive: 'boundaries.md' },
	{ original: 'tmp/units/aggregate-l14-a-quality-join.ts', archive: 'join.ts' },
	{ original: 'tmp/units/aggregate-l14-a-quality-boundary-check.ts', archive: 'boundaries.ts' },
	{ original: 'tmp/units/aggregate-final-blind-a-check-report.md', archive: 'checker.md' },
	{ original: 'tmp/units/aggregate-final-g2-stale-reading-report.md', archive: 'stale-reading.md' },
	{ original: 'tmp/units/aggregate-final-g2-stale-reading-evidence.json', archive: 'stale-evidence.json' },
	{ original: 'tmp/units/aggregate-final-g2-stale-reading-reader.ts', archive: 'stale-reader.ts' },
])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'tmp/units/aggregate-final-blind-a-check-boundary.stdout.bin',
	'tmp/units/aggregate-final-blind-a-check-boundary.stderr.bin',
	'tmp/units/aggregate-final-blind-a-check-join.stdout.bin',
	'tmp/units/aggregate-final-blind-a-check-join.stderr.bin',
	'tmp/units/aggregate-final-blind-a-check-run.ts',
	'tmp/units/aggregate-final-blind-a-reader.ts',
	'tmp/units/aggregate-final-blind-a-bind.ts',
	'tmp/units/aggregate-final-blind-a-brief.md',
	'tmp/units/aggregate-final-g2-stale-reading-brief.md',
	'tmp/units/aggregate-final-g2-quality-retain-brief.md',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['tmp/units/aggregate-development-blind-packet-l14-a/packet.json', 'c07aa6696eba4d7ff551c0c66f27057e8491704a85095e244ee7be9c0d7ba190'],
	['tmp/units/aggregate-final-blind-a-judgments.json', 'df1a3315a1ff8bf5fae6a793b0ca63427cef494528fd1f2604297953ce5cdf32'],
	['tmp/units/aggregate-l14-a-quality-boundary-check.ts', '4211536b489635fb4615fdabc6e269db9bef54c70c9a9204342346a3f55ec68c'],
	['tmp/units/aggregate-l14-a-quality-join.ts', '3eeee62d361259e00fa140b04138b2aac1615a1cdab25a0cb819b0e879ce157e'],
	['tmp/units/aggregate-l14-a-quality-boundary-addendum.md', 'fc5fce8db48cbe1955d69abbb9b32ca78db7a3a64fdc2081f08dbc8d5133b211'],
	['tmp/units/aggregate-l14-a-quality-joined.json', 'ccd26887ca3c8b4123b1346332e3a53c1bcb67823729a3d1f85e01821d83ad17'],
	['tmp/units/aggregate-l14-a-quality-report.md', '9ce5c2acd8493e91b5b91cd39b9c73b11b4011742627d5e7353ab9dc6d73f503'],
	['tmp/units/aggregate-l14-a-quality-join-validation.md', 'c3cada137bee6e9101f4f8c79227541433f985c379c485120409f1f248086c4c'],
	['tmp/units/aggregate-final-blind-a-check-boundary.stdout.bin', '57ace6dd89947c692a71f28570d013bc5b3f429e69b628302a93a8eca6e50fd9'],
	['tmp/units/aggregate-final-blind-a-check-boundary.stderr.bin', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-final-blind-a-check-join.stdout.bin', '17814e117adfcf83f1afdd7b398ef1ee1692cbe4533090c5bd559c8eddcb968e'],
	['tmp/units/aggregate-final-blind-a-check-join.stderr.bin', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-final-g2-stale-reading-reader.ts', '905b9087b1abe4685db27ea54eee78ed461dbc8f25346688a46ad84ea0047cae'],
	['tmp/units/aggregate-final-g2-stale-reading-evidence.json', '14a71b9bcd8a8082b38ffb29401b85aa4bbbafbb7fb8c5892a7f46a4bfe15764'],
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
	const arguments_ = process.argv.slice(2)
	if (arguments_.length > 1 || (arguments_.length === 1 && arguments_[0] !== '--verify')) {
		throw new Error('Usage: node tmp/units/aggregate-final-g2-quality-retain.ts [--verify]')
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
	if (!verify) {
		const commandRows = [head, status, changes, staged, finish, finishStatus, finishChanges, finishStaged]
		const lines = [
			'# Gemma quality custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. It did not inspect or collect live Q4 contents.`,
			'',
			'All fixed mappings are covered. Supplemental files preserve their basenames; no filename collision occurred. The retained auditor reader includes its serializer. The retained bind script records checker binding. No bench journal or secret is included.',
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
			'Root confirmed that the checker was a small native unit dispatched by message and has no brief file. The auditor, stale-reading, and retention briefs are retained under their original basenames. No other deviation occurred. Generated manifest and attributes are separately measured; root authors and accepts the README.',
			'',
		]
		writeFileSync(resolve(CHECKOUT_PATH, REPORT_PATH), lines.join('\n'), { flag: 'wx' })
	}
	process.stdout.write(`${JSON.stringify({ operation: verify ? 'verify' : 'retain', files: readings.length, bytes, owned, total, restoration: { bytes: restoration.length, sha256: restorationHash }, head: finish.output.trim(), report: REPORT_PATH }, null, 2)}\n`)
}

try {
	main()
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
}
