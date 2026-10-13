/**
 * Usage: node tmp/units/aggregate-successor-quality-b-retain.ts [--verify]
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
const EXPECTED_HEAD = '26549dc37437fd38448d60f9648f903edc2c8bfb'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l15-q4-thinking-quality'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-quality-b-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-quality-b-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([
	{ original: 'tmp/units/aggregate-development-blind-packet-successor-b/packet.json', archive: 'packet.json' },
	{ original: 'tmp/units/aggregate-development-blind-packet-successor-b/private/joins.json', archive: 'joins.json' },
	{ original: 'tmp/units/aggregate-successor-quality-b-judgments.json', archive: 'judgments.json' },
	{ original: 'tmp/units/aggregate-successor-quality-b-report.md', archive: 'audit.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-brief.md', archive: 'audit-brief.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-reader.ts', archive: 'audit-reader.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-b-joined.json', archive: 'joined.json' },
	{ original: 'tmp/units/aggregate-successor-quality-b-joined.md', archive: 'joined.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-join-validation.md', archive: 'validation.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-boundary-addendum.md', archive: 'boundaries.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-join.ts', archive: 'join-original.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-b-join-sealed.ts', archive: 'join-sealed.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-b-boundary.ts', archive: 'boundary-original.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-b-boundary-sealed.ts', archive: 'boundary-sealed.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-b-preparation-report.md', archive: 'preparation.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-preparation-brief.md', archive: 'preparation-brief.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-preparation.diff', archive: 'preparation.diff' },
	{ original: 'tmp/units/aggregate-successor-quality-b-seal.ts', archive: 'seal.ts' },
	{ original: 'tmp/units/aggregate-development-blind-packet-export.ts', archive: 'packet-export.ts' },
	{ original: 'tmp/units/aggregate-successor-quality-b-validation-report.md', archive: 'verifier.md' },
	{ original: 'tmp/units/aggregate-successor-quality-b-validation-brief.md', archive: 'verifier-brief.md' },
	{ original: '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json', archive: 'scenario.json' },
])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'tmp/units/aggregate-successor-quality-b-join.stdout.txt',
	'tmp/units/aggregate-successor-quality-b-join.stderr.txt',
	'tmp/units/aggregate-successor-quality-b-join-execution.json',
	'tmp/units/aggregate-successor-quality-b-boundary.stdout.txt',
	'tmp/units/aggregate-successor-quality-b-boundary.stderr.txt',
	'tmp/units/aggregate-successor-quality-b-boundary-execution.json',
	'tmp/units/aggregate-successor-quality-b-retention-brief.md',
	'tmp/units/aggregate-successor-quality-b-retention-report.md',
	'tmp/units/aggregate-successor-quality-b-retain.diff',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['tmp/units/aggregate-development-blind-packet-successor-b/packet.json', 'a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4'],
	['tmp/units/aggregate-development-blind-packet-successor-b/private/joins.json', 'c23252eb5256708ee698fcb1c7915953f244c401009b6a0ac4aafbe1ab28c468'],
	['tmp/units/aggregate-successor-quality-b-judgments.json', '9405d9bd6ae081c59d69e8de8936456004e10372bf93d0563faf090723b15fcd'],
	['tmp/units/aggregate-successor-quality-b-report.md', 'dfc77641f713a231243927ae551f252c93666008093739a73a23469ca6b8e4dd'],
	['tmp/units/aggregate-successor-quality-b-brief.md', '1ffe42923b9357c3686f227fba96a3dcd75663e06828249abce46e451f01a13a'],
	['tmp/units/aggregate-successor-quality-b-reader.ts', 'daa1a6a587604a0d7920b4e3d114ef1ae1886cd0115398aa09cc71f21cc1c261'],
	['tmp/units/aggregate-successor-quality-b-joined.json', 'e975e2c539cc3d9379bd56c279d3cf42d07957afa63d2d57ac5a430d5f61062f'],
	['tmp/units/aggregate-successor-quality-b-joined.md', 'ec7095873258912212f1c05575df4a9e48a8841386c121d0ff0abf5be33204f6'],
	['tmp/units/aggregate-successor-quality-b-join-validation.md', 'b6457560c904fa3cbb3634d30ca3167012787d7f3d29836390a6089d700c162c'],
	['tmp/units/aggregate-successor-quality-b-boundary-addendum.md', '7142a2886f464fd45a3a25f65e524327af4998d08d94023760564ff076c9a176'],
	['tmp/units/aggregate-successor-quality-b-join.ts', 'bd5b8103c7af57475e4dfbe8531bc99e9edfbb3edfa3fbb9a89e0c8faebca19f'],
	['tmp/units/aggregate-successor-quality-b-join-sealed.ts', 'b61ec050fff029262f4ed3d611626d5768ab50782056576d242aa9c292739152'],
	['tmp/units/aggregate-successor-quality-b-boundary.ts', '98ef967bada3beab4c2376cd32fb2ef31818750df4317160cc140cea613b4c54'],
	['tmp/units/aggregate-successor-quality-b-boundary-sealed.ts', '3aa7639d537650f98a0f59b6d589497d105aca42a3e074b481bf8db0ea58f8f6'],
	['tmp/units/aggregate-successor-quality-b-preparation-report.md', '51966425813cc8e2cea392d59c1e9ac6a26f82bc3231704865cc658910eed6c7'],
	['tmp/units/aggregate-successor-quality-b-preparation-brief.md', 'b0195bc3b4ca9ae1afd7d2f5de1a5e52fff30b45808a9e2ba36909fc5f1b612f'],
	['tmp/units/aggregate-successor-quality-b-preparation.diff', '2981ad9a07cca4bca7859c35988c66082341999ac7c8b8eef06f9a0b93413a33'],
	['tmp/units/aggregate-successor-quality-b-seal.ts', 'bc1ef4b1e1da56552b164611d857da60d32abd8221591e393fb787439b5a3573'],
	['tmp/units/aggregate-development-blind-packet-export.ts', 'c6f1e212ef8bca0035862b78556fbafc564123ad1590d9f3e27211585b385fb9'],
	['tmp/units/aggregate-successor-quality-b-validation-report.md', '7020fd0e90a1872a01886ea01876adb173a2632663c2b6a2f36d63b6f6d4021c'],
	['tmp/units/aggregate-successor-quality-b-validation-brief.md', '36d42b40c00d0a52852ac8ac9495ed57a562700936bd64c7f37b440498dc3c99'],
	['.orkestrel/agent/instruments/harness/bench/variants/long/v1.json', '24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b'],
	['tmp/units/aggregate-successor-quality-b-join.stdout.txt', '620d25965f3677596141fb43f81cfb4b530b439f60e6f0ad0b069279007c15e2'],
	['tmp/units/aggregate-successor-quality-b-join.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-quality-b-join-execution.json', '2669c95ff0645dbfdd4d120e025e96dd5cad73ec6bb1e9d003594901d2dce245'],
	['tmp/units/aggregate-successor-quality-b-boundary.stdout.txt', '894dec072b0ac401f8f4add0283b351c40e25a7712a115e43009f03af406d33d'],
	['tmp/units/aggregate-successor-quality-b-boundary.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-quality-b-boundary-execution.json', '0d90f93e46b1fb88bea985e24cddb8e29af612d582918fc78338ce26aeb7ca4a'],
	['tmp/units/aggregate-successor-quality-b-retention-brief.md', '795fe53ecd2d860dbcb7026741020c093ab836691c8b77871c5781d8e0667f92'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-quality-b-retain.ts [--verify]')
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
			'# l15 Qwen4 thinking blind quality custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'All fixed mappings are covered. Supplemental files preserve their basenames; no filename collision occurred. The packet/private joins, clean analyst brief/reader/judgments/report, prepared and sealed join/boundary readers, root seal script, preparation evidence, outputs and complete validation captures/metadata/report/brief, unchanged exporter, authored scenario, and retention preparation evidence are included. All sealed originals remain intact.',
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
			'No required completed artifact was missing during preparation. The clean analyst reader is retained. Raw Q4 thinking runs remain in place; live generation/daemon artifacts and bench journals are excluded. Custody changes no grade or accepted finding. Generated manifest and attributes are separately measured; root authors and accepts the README.',
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
