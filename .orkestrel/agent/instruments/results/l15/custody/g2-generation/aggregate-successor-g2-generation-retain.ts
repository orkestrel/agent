/**
 * Usage: node tmp/units/aggregate-successor-q2-g4-retain.ts [--verify]
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
const EXPECTED_HEAD = '1491e6b2b8913f814d308c3d45ff002e1506abe4'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/g2-generation'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-g2-generation-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-g2-generation-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.err',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.err',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-g2-generation-retention-brief.md',
	'tmp/units/aggregate-successor-g2-label-prep.ts',
	'tmp/units/aggregate-successor-g2-label-release.ts',
	'tmp/units/aggregate-successor-g2-label-seal.json',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-brief.md',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-report.md',
	'tmp/units/aggregate-successor-g4-exploratory-prepare.ts',
	'tmp/units/aggregate-successor-label-d-brief.md',
	'tmp/units/aggregate-successor-model-g2-execution-custody-after.json',
	'tmp/units/aggregate-successor-model-g2-execution-custody-before.json',
	'tmp/units/aggregate-successor-model-g2-execution-root.err',
	'tmp/units/aggregate-successor-model-g2-execution-root.jsonl',
	'tmp/units/aggregate-successor-model-g2-execution-root.jsonl.pid',
	'tmp/units/aggregate-successor-model-g2-execution-root.jsonl.status-after.txt',
	'tmp/units/aggregate-successor-model-g2-execution-root.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-model-g2-execution-sequence.jsonl',
	'tmp/units/aggregate-successor-model-g2-generation-brief.md',
	'tmp/units/aggregate-successor-model-g2-generation-process-closure.txt',
	'tmp/units/aggregate-successor-model-g2-generation-read-execution.json',
	'tmp/units/aggregate-successor-model-g2-generation-read.stderr.txt',
	'tmp/units/aggregate-successor-model-g2-generation-read.stdout.txt',
	'tmp/units/aggregate-successor-model-g2-generation-read.ts',
	'tmp/units/aggregate-successor-model-g2-generation-report.md',
	'tmp/units/aggregate-successor-model-g2-plan.json',
	'tmp/units/aggregate-successor-model-run.ts',
	'tmp/units/aggregate-successor-g2-generation-retain.diff',
	'tmp/units/aggregate-successor-g2-generation-retention-report.md',
	'tmp/units/aggregate-successor-g2-generation-retain.ts',
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.err', 'b12ec9c8a7c93937f67f518d6709936e09ae98d57f35549fa8b67860738bdaad'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl.pid', '69c609a9b74632a284ed7319cc316cc7d750133815f8663c94a599c897383b70'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl.status-after.txt', '2b4cffc51c4a6ddfc515d5023d4b33ed857987901c82d3df0852871c273f622c'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-corpus.jsonl.status-before.txt', 'a535ba166cf305bfc0a585bfdb56c116e75e0308bca11c4c25d659da7a002862'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.err', '04f47859e7b34d3d5e8167b36e07e9afdb75590bba60546c85441f54c9939135'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl.pid', 'af2f811a6e182563e07923a63f39daa34e966342f024829218c1d13cdf2b2eab'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl.status-after.txt', '946777ac2dfeb4002b155b4dcaaa8b6f22913fd06d584ea27d777705da942857'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.jsonl.status-before.txt', '2b4cffc51c4a6ddfc515d5023d4b33ed857987901c82d3df0852871c273f622c'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.err', 'b31a652791413ea9a03b08d0d5c6a6065dead4187acf527bdbb8743bdef65a79'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl.pid', '0b9e1a161da5e15acfc41b1a3c5f4fc97dd1652ad39edd6f5a6080b63eeaf2f4'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl.status-after.txt', 'ac99d20dcba257956f0dd9b34bdd71fbe0cc0fab043ac5cbb3e77a23d6b730fa'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.err', '549ab53cc9696573d62053f19fd623d0689168eb77bd42219b7e74d1535c152a'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl.pid', '01cb03d9462cf1a24101fa3fbc68a2991d92eeaeaa19368049202eb804e1eea8'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl.status-after.txt', 'a535ba166cf305bfc0a585bfdb56c116e75e0308bca11c4c25d659da7a002862'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-think1-freeze.jsonl.status-before.txt', 'ac99d20dcba257956f0dd9b34bdd71fbe0cc0fab043ac5cbb3e77a23d6b730fa'],
	['tmp/units/aggregate-successor-g2-generation-retention-brief.md', 'dfede2fed1e5f4bf01b474f325f39059a6ad8a6a24c451d35c6f5f002140a566'],
	['tmp/units/aggregate-successor-g2-label-prep.ts', 'f2b8c965b919d267432c62b8c23831b2e052fd9c16e634e25ea575c8c95b151e'],
	['tmp/units/aggregate-successor-g2-label-release.ts', 'ffecec6b23cccb1e5a227da9f253861a390c720c44165690f7de9b777985ede8'],
	['tmp/units/aggregate-successor-g2-label-seal.json', 'afde828e3412975c3131e7485d564c250efbdbd1dd2f08cba44929dc17cf215d'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-brief.md', '4fa7f42ed6a4c80d5deea56b2a16db7991440be1f725a86dfa1690b8182672f8'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-report.md', '9eee38f23eb6181575d1fadd43616afb3cdb28150315f45eb4d542861e3f3e04'],
	['tmp/units/aggregate-successor-g4-exploratory-prepare.ts', 'a5ee0d1e2e382f7002919cc10a268432b50d887023c27175fdd9c2fdc9a75e73'],
	['tmp/units/aggregate-successor-label-d-brief.md', '78ea1b4b1ef7e2264d663b2e760717fe0b77718415cbac4bcd751bfe549a7135'],
	['tmp/units/aggregate-successor-model-g2-execution-custody-after.json', 'bbacc67ccef82ccf2605a149c9929a0d16a209facfc2392ebc8566553620cb17'],
	['tmp/units/aggregate-successor-model-g2-execution-custody-before.json', 'bbacc67ccef82ccf2605a149c9929a0d16a209facfc2392ebc8566553620cb17'],
	['tmp/units/aggregate-successor-model-g2-execution-root.err', 'c733018437ff009c4958e63a25d3f648e2590b0c851c0cf6679cc0c28447c034'],
	['tmp/units/aggregate-successor-model-g2-execution-root.jsonl', '00fb0204c962a70d1c5b9ae42820b2b774b7940335f44cd8a09471abd30bb36c'],
	['tmp/units/aggregate-successor-model-g2-execution-root.jsonl.pid', '83951fe9fc3970460f28f6c8dd7a8a2bdfdb742b26ffcac908af12625e1514db'],
	['tmp/units/aggregate-successor-model-g2-execution-root.jsonl.status-after.txt', '946777ac2dfeb4002b155b4dcaaa8b6f22913fd06d584ea27d777705da942857'],
	['tmp/units/aggregate-successor-model-g2-execution-root.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['tmp/units/aggregate-successor-model-g2-execution-sequence.jsonl', 'f21e85ef0a139f02585e45e3bc4b5d4c18dcf1a82f6ef21709ac3807c6646d86'],
	['tmp/units/aggregate-successor-model-g2-generation-brief.md', 'a8905db71c40671c4e222eeb69c59a4952d2279b1cfb76a512e9f11990363b09'],
	['tmp/units/aggregate-successor-model-g2-generation-process-closure.txt', '344a85893f814d630b14386944a6757f4aa79d716f9a6eea3cde48dac281a1e4'],
	['tmp/units/aggregate-successor-model-g2-generation-read-execution.json', 'b82711a7cd5fa4cb6a9a6291ae5418d2bbdfe1b40bd535dc98eefc803047a45c'],
	['tmp/units/aggregate-successor-model-g2-generation-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-model-g2-generation-read.stdout.txt', 'ecd8bcaa575ddac5daf54ee803e4a83d3450909d0f4817b99ba07b9a014b97da'],
	['tmp/units/aggregate-successor-model-g2-generation-read.ts', '8b08996796bce9a7401f4b23ae8914815383160eacf4c0dd5e613fe37a3012b5'],
	['tmp/units/aggregate-successor-model-g2-generation-report.md', 'e83c89167bd46abc08026f825aed1bec6cab195589ac3d1b69bfbd0c47050b70'],
	['tmp/units/aggregate-successor-model-g2-plan.json', '4f875648d30934971697bd0959cc148ac32b5ddbb7b431dc3f672177a82c2619'],
	['tmp/units/aggregate-successor-model-run.ts', '2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-q2-g4-retain.ts [--verify]')
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
			'# l15 G2 generation custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed G2 generation brief/plan/shared runner/reader/stdout/stderr/validation receipt/report/process closure, root execution journal/error/PID/status/sequence/before-and-after custody, both freeze stage and calibration corpus/generate log families, root label preparation/release/seal, immutable launched label-d brief, closed G4 exploratory preparation brief/script/report, and this retention preparation are included by basename. No filename collision occurred. All completed originals remain intact.',
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
			'No required released input was missing. Canonical G2 corpus/generation/cache and freeze directories remain in place for root staging; no duplicate raw packet is copied. Active label-d reader/labels/report/helpers, unrelated artifacts and archives, live daemon material, and external bench journals are excluded. The immutable launched label-d brief is included. Script/diff/preparation-report circular seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.',
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
