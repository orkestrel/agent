/**
 * Usage: node tmp/units/aggregate-successor-q4-route-retention-retain.ts [--verify]
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
const EXPECTED_HEAD = 'b33dc98e13f589b0196b9f1aad9bd100306926f5'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/q4-fault-route'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-q4-route-retention-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-q4-route-retention-execution-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'tmp/claude/aggregate-successor-sustained-fault-direction-brief-2.md',
	'tmp/claude/aggregate-successor-sustained-fault-direction-brief.md',
	'tmp/units/aggregate-successor-g4-think1-aggregate-read-2.ts',
	'tmp/units/aggregate-successor-q4-fault-read-brief.md',
	'tmp/units/aggregate-successor-q4-fault-read-capture-hashes.ts',
	'tmp/units/aggregate-successor-q4-fault-read-reader.ts',
	'tmp/units/aggregate-successor-q4-fault-read-report.md',
	'tmp/units/aggregate-successor-q4-fault-read-stderr.txt',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.pid',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-after.txt',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-q4-pilot-2-command.txt',
	'tmp/units/aggregate-successor-q4-pilot-2-preparation-brief.md',
	'tmp/units/aggregate-successor-q4-pilot-2-preparation-capture.json',
	'tmp/units/aggregate-successor-q4-pilot-2-preparation-capture.ts',
	'tmp/units/aggregate-successor-q4-pilot-2-preparation-report.md',
	'tmp/units/aggregate-successor-q4-pilot-2-read.ts',
	'tmp/units/aggregate-successor-q4-pilot-2-reader.diff',
	'tmp/units/aggregate-successor-q4-pilot-2-verifier-brief.md',
	'tmp/units/aggregate-successor-sustained-fault-direction-report.md',
	'tmp/units/aggregate-successor-q4-route-retention-prepare.ts',
	'tmp/units/aggregate-successor-q4-route-retention-retain.ts',
	'tmp/units/aggregate-successor-q4-route-retention.diff',
	'tmp/units/aggregate-successor-q4-route-retention-capture.json',
	'tmp/units/aggregate-successor-q4-route-retention-report.md',
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['tmp/claude/aggregate-successor-sustained-fault-direction-brief-2.md', 'd1d8bbea6d442b5b18fd76f6b2208375ce73d4c565b6bfe322998b55bc42a258'],
	['tmp/claude/aggregate-successor-sustained-fault-direction-brief.md', 'd1d8bbea6d442b5b18fd76f6b2208375ce73d4c565b6bfe322998b55bc42a258'],
	['tmp/units/aggregate-successor-g4-think1-aggregate-read-2.ts', 'aa47b833c7e0e55fe57ce3cad4366cfbc13a052bddc824e0751b67c8caacdefc'],
	['tmp/units/aggregate-successor-q4-fault-read-brief.md', '6fb0d01705bfe7ee74b996662c98255d6da501cbccd7afbcdfa1751e3755d1f7'],
	['tmp/units/aggregate-successor-q4-fault-read-capture-hashes.ts', '927be0f667f776a685b1a3d020e1246a01b1794ec4aed1d21b8a4cf77b71c17b'],
	['tmp/units/aggregate-successor-q4-fault-read-reader.ts', 'f22973171dfcfdf48230fe8d984b4b59d4fe392d0c66c1e8294c9384df0f633e'],
	['tmp/units/aggregate-successor-q4-fault-read-report.md', '035179b1dcd9ae3ef38b3830b57ea683c89c9f9ef12cd406c55522e3a5edb5ff'],
	['tmp/units/aggregate-successor-q4-fault-read-stderr.txt', 'd80d13ade353cd69a603742fc186fb52f1f0b8bcd87f459ddf3906e82f261cb8'],
	['tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl', '0e6b65aa28f64f4ca72ba52ca17fd6199dbc34b1b6e80cf43a486abfed832aea'],
	['tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.pid', '3fe1e709c4843bfc18586ab0dddff4aab6f647f2bc408e54a4d976d2de33897b'],
	['tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-after.txt', 'cfa8619ccc3a2e2885ecaab9cef80b7cfc13e89b9efb9f0cde74c250718ac82f'],
	['tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-before.txt', 'cfa8619ccc3a2e2885ecaab9cef80b7cfc13e89b9efb9f0cde74c250718ac82f'],
	['tmp/units/aggregate-successor-q4-pilot-2-command.txt', 'e1edc83acd286275d0f8e57511a0e72aca9f4fbd0ee37cf6d29cf1796e6d1bed'],
	['tmp/units/aggregate-successor-q4-pilot-2-preparation-brief.md', '081e6cfe4f794460a8af2f49e42c9ab7a5cbdeb0393dd59f3f50b96cb7999671'],
	['tmp/units/aggregate-successor-q4-pilot-2-preparation-capture.json', '68bd8b748fd053ca0cd1a1e0c68baabbe9345e3ac392464d857a93bcbf73021c'],
	['tmp/units/aggregate-successor-q4-pilot-2-preparation-capture.ts', '4f44031d9ddd0e0f39fc8a3c2b2adb7f63313c9395a26a4c5d5eef5bc595c5ce'],
	['tmp/units/aggregate-successor-q4-pilot-2-preparation-report.md', '45758465c2568fcb9e0047ec4f0197ee707c90e8c07dba56192d0873e1981b8b'],
	['tmp/units/aggregate-successor-q4-pilot-2-read.ts', '76677ad6f51671115fdfe326221d3e03b14da72b2eb5c043aa910a7843552724'],
	['tmp/units/aggregate-successor-q4-pilot-2-reader.diff', 'c24ffef5a4c220438d9fcf0e53b6c78ea3bb2a8ba8b6a347c10f8657820de7e4'],
	['tmp/units/aggregate-successor-q4-pilot-2-verifier-brief.md', '1b5f55249f11016d51a3cb0daee50e6130c1b8ffee5910f7270886cd1291a3ec'],
	['tmp/units/aggregate-successor-sustained-fault-direction-report.md', 'd86ee358f9960ea172b9513be3af70bb933c48a56d5d79f1f382653861914c6c'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-q4-route-retention-retain.ts [--verify]')
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
			'# l15 Closed Q4 fault-route custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed Q4 native fault probe brief/reader/report/complete captures, pilot-2 preparation command/brief/reader/diff/report/capture/writer, completed Opus proposal and both closed briefs as reading evidence, the late G4 think1 reader, and this retention preparation are included by basename unless identical bytes already have a retained custody reference. No filename collision occurred. All completed originals remain intact.',
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
			'No required closed input was missing. Original Q4 pilot and blind quality artifacts remain at their existing locations. The bounded root ruling remains at its canonical tracked report path. Identical prior custody files use the retained references recorded in the preparation evidence; differing closed originals are retained here. The active retention brief, prospective pilot-2 execution reports/logs, all live Gemma evidence, external bench journals/error streams, authentication artifacts, and unrelated history are excluded. Opus proposal and brief bytes are preserved as reading evidence only; the root ruling owns policy and source acceptance. Self-dependent preparation artifact seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.',
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
