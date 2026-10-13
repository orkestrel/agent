/**
 * Usage: node tmp/units/aggregate-successor-q4-thinking-retain.ts [--verify]
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
const EXPECTED_HEAD = 'bd31e6573562045fc5ea190edc839960fe4fac92'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/q4-thinking'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-q4-thinking-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-q4-thinking-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([
	{ original: '.orkestrel/agent/instruments/harness/.build/build-manifest.json', archive: 'build-manifest.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/calibration/q4/fit/fit.json', archive: 'fit.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/q4-think1/freeze/manifest.json', archive: 'freeze-manifest.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/q4-think1/resource/manifest.json', archive: 'resource-manifest.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-512/execution.json', archive: 'resource-reserve-512-execution.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-1024/execution.json', archive: 'resource-reserve-1024-execution.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/q4-think1/full/manifest.json', archive: 'full-manifest.json' },
	{ original: '.orkestrel/agent/instruments/results/l15/q4-think1/pilot/manifest.json', archive: 'pilot-manifest.json' },
])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.err',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.err',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.err',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl.status-before.txt',
	'tmp/units/aggregate-competing-service-owner-report.md',
	'tmp/units/aggregate-successor-cell-q4-think1-live.err',
	'tmp/units/aggregate-successor-cell-q4-think1-live.jsonl',
	'tmp/units/aggregate-successor-cell-q4-think1-live.jsonl.pid',
	'tmp/units/aggregate-successor-cell-q4-think1-live.jsonl.status-after.txt',
	'tmp/units/aggregate-successor-cell-q4-think1-live.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-cell-q4-think1-sequence.jsonl',
	'tmp/units/aggregate-successor-cell-run.ts',
	'tmp/units/aggregate-successor-daemon-deployment.json',
	'tmp/units/aggregate-successor-q4-thinking-full-read.stderr.txt',
	'tmp/units/aggregate-successor-q4-thinking-full-read.stdout.txt',
	'tmp/units/aggregate-successor-q4-thinking-full-read.ts',
	'tmp/units/aggregate-successor-q4-thinking-live-brief.md',
	'tmp/units/aggregate-successor-q4-thinking-live-report.md',
	'tmp/units/aggregate-successor-q4-thinking-pilot-read.stderr.txt',
	'tmp/units/aggregate-successor-q4-thinking-pilot-read.stdout.txt',
	'tmp/units/aggregate-successor-q4-thinking-pilot-read.ts',
	'tmp/units/aggregate-successor-q4-thinking-resource-read.meta.json',
	'tmp/units/aggregate-successor-q4-thinking-resource-read.stderr.txt',
	'tmp/units/aggregate-successor-q4-thinking-resource-read.stdout.txt',
	'tmp/units/aggregate-successor-q4-thinking-resource-read.ts',
	'tmp/units/aggregate-successor-q4-thinking-resource-request-audit.meta.json',
	'tmp/units/aggregate-successor-q4-thinking-resource-request-audit.stderr.txt',
	'tmp/units/aggregate-successor-q4-thinking-resource-request-audit.stdout.txt',
	'tmp/units/aggregate-successor-q4-thinking-resource-request-audit.ts',
	'tmp/units/aggregate-successor-q4-thinking-retention-brief.md',
	'tmp/units/aggregate-successor-q4-thinking-retain.diff',
	'tmp/units/aggregate-successor-q4-thinking-retention-report.md',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/harness/.build/build-manifest.json', '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc'],
	['.orkestrel/agent/instruments/results/l15/calibration/q4/fit/fit.json', '46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8'],
	['.orkestrel/agent/instruments/results/l15/q4-think1/freeze/manifest.json', '8c9f816203eb24a8ab3c9d87e94e3da5d841200d1737691fbb91c3596bac0b07'],
	['.orkestrel/agent/instruments/results/l15/q4-think1/resource/manifest.json', '84d129dc5c67090c2c18462f89d7a15e9a893c3808aa793a1396fe5f88083efd'],
	['.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-512/execution.json', 'a6db8588fe3db834c1736854a3717ccea8f6c413e4025772bbcf7ddf11650001'],
	['.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-1024/execution.json', 'eeda6213b5b6d0f538d7af2e90978cd785361deb35bf970d7ffee043b292a63b'],
	['.orkestrel/agent/instruments/results/l15/q4-think1/full/manifest.json', '1e637279b30427a69054eb3d787c01e311cb4d5f18f6de32c0a380c7fcd41571'],
	['.orkestrel/agent/instruments/results/l15/q4-think1/pilot/manifest.json', '1081edab1718b8808789b8ba7b761fec38affb354348ca50e61e77bd90df252b'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.err', '6e4771cd6db82b99658c324e68eadfbdb8f33f6eb06b285951d38a3618b5478f'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl.pid', 'f687d5fe7cbe431d6097ca418f13a558ccdf1429723e60a52c777e577a0e2096'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl.status-after.txt', '59e9886ab1384032d26c6117a5752ff578680f405fdac886b2863d6ccdb8f80d'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-freeze.jsonl.status-before.txt', '59e9886ab1384032d26c6117a5752ff578680f405fdac886b2863d6ccdb8f80d'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.err', 'fa4b34ea939b89c4c51e90ed576eee09aba78e32052643c42df19d6c938804eb'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl', '6c2ba816c5936e4213c5c905e64e033f79b6a3a21b861fd75e6d4272888cd754'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl.pid', 'a94ffb626f5d188ded56c43b632935d91d7b61530fba88767f06d3a33211c9f8'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl.status-after.txt', '4230faa94ce26bcacece790e57c5899967435a5a4a6530f8cd853019ecf5b760'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-full.jsonl.status-before.txt', '9feb585832533870f8db9066e1949002e38a5aa74d8b6cefaee87bdc771d59f6'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.err', '86729711f0f16a3557bf9442074437aaad13a05521da48722409d2b600aa4ee6'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl', '5b4fc0c41d8b5ddedb9d0201bef653d3327cc1fb7bec0662b16c99b002f5b6c5'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl.pid', 'c5150ede8c2c9cef059c6c28b966f272bd9ae160b2872f3e8d6adb60a810e968'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl.status-after.txt', '3435dd894d2fc66a67a613e70637b5985cf242eac5718c45bee9ddfe1cbfb174'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-pilot.jsonl.status-before.txt', '4230faa94ce26bcacece790e57c5899967435a5a4a6530f8cd853019ecf5b760'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.err', '4b1c232bb638492d9a9ca78199cc0f2e43f0c46bb5be97cfcdb9713fab97cae0'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl', '6b0f0a306aeb447e37cbc986e3555a6880c22c97be469e058a13e0329395a964'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl.pid', 'ea09ab3cec4b6afd8fd3c1865577979e78541bba90f5f0f9ed89d57fa59f0cda'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl.status-after.txt', '9feb585832533870f8db9066e1949002e38a5aa74d8b6cefaee87bdc771d59f6'],
	['.orkestrel/agent/instruments/results/l15/logs/q4-think1-resource.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['tmp/units/aggregate-competing-service-owner-report.md', 'a673b0a237916093ebd5e630cecb40be927e175cc589b84757f35057756bc44b'],
	['tmp/units/aggregate-successor-cell-q4-think1-live.err', '54ef2bb33e2cea3afbeeb8d498d9b9f8f457017e3be1254df696016b14a34e74'],
	['tmp/units/aggregate-successor-cell-q4-think1-live.jsonl', 'de98f5cc37b7fc5eb29ccbe59f49c078b20036db9829da417daf25420256acf7'],
	['tmp/units/aggregate-successor-cell-q4-think1-live.jsonl.pid', 'a3f8f829cc171d1828073fb834bd6beebf8fbb1ecbddabb2470d1096b1cf5124'],
	['tmp/units/aggregate-successor-cell-q4-think1-live.jsonl.status-after.txt', '3435dd894d2fc66a67a613e70637b5985cf242eac5718c45bee9ddfe1cbfb174'],
	['tmp/units/aggregate-successor-cell-q4-think1-live.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['tmp/units/aggregate-successor-cell-q4-think1-sequence.jsonl', '2bdf49d239631accfc738c58d12e73e268f13da567aa2d6ac49b196a523967ee'],
	['tmp/units/aggregate-successor-cell-run.ts', '3095b52463bbeacd1f1788ac8096be28f5282cbd431af6ce5b266e22803124ae'],
	['tmp/units/aggregate-successor-daemon-deployment.json', '40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19'],
	['tmp/units/aggregate-successor-q4-thinking-full-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-q4-thinking-full-read.stdout.txt', 'b7bdc27b8bf3e8c0a6516287d50c979d604d0a3d2c6f62f9d5c0268d8c0496ea'],
	['tmp/units/aggregate-successor-q4-thinking-full-read.ts', 'c25771a6224d19a606b4acb46813239813b4966666f4c854b8bf7c20156075f6'],
	['tmp/units/aggregate-successor-q4-thinking-live-brief.md', 'ef20203ea34c0543894a836cac62f6f56fcfa207395b0724e863cebffd3859b0'],
	['tmp/units/aggregate-successor-q4-thinking-live-report.md', '9c17de9fe3de39b5a6eefc9aa3eb7697bb86aeae4df904750da134a404a8461a'],
	['tmp/units/aggregate-successor-q4-thinking-pilot-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-q4-thinking-pilot-read.stdout.txt', '3bd85d64348e570f48c62804c2568b09f50a7e3d5257e2bc01e6571626035218'],
	['tmp/units/aggregate-successor-q4-thinking-pilot-read.ts', '63615175cb4e1ed439f33dff2fe5009928d4f6e73502afaaa2e62e15f462debf'],
	['tmp/units/aggregate-successor-q4-thinking-resource-read.meta.json', 'f550ed638e05dc3d1150868f84029b8bbdff3883a91216b12d00fb985dce2b90'],
	['tmp/units/aggregate-successor-q4-thinking-resource-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-q4-thinking-resource-read.stdout.txt', 'b49066db5960f97c98c3f636f78384eb1c130eb53ef0b365905db04b032a1389'],
	['tmp/units/aggregate-successor-q4-thinking-resource-read.ts', '42aa1e3d5e7b14887e090883e1bcac81546df70dcc77a839cd31cd5a33fe2bdd'],
	['tmp/units/aggregate-successor-q4-thinking-resource-request-audit.meta.json', 'acc350f119a7c53ac3e193694cf3fa70ce846ced03b65d9c1e94fd8c034f0519'],
	['tmp/units/aggregate-successor-q4-thinking-resource-request-audit.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-q4-thinking-resource-request-audit.stdout.txt', 'cf9a66de94ef07b8df2961766f7bd4cb5f9c62a461dd067a4338997091c2c732'],
	['tmp/units/aggregate-successor-q4-thinking-resource-request-audit.ts', '3b7ff69c179444083b087df4c9f22d31f1358caf9ee1cc425274f7d2740d9d82'],
	['tmp/units/aggregate-successor-q4-thinking-retention-brief.md', '9d730fa154d8f999b21edeb408a87f32e9e217f3213409037595009f04c5de94'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-q4-thinking-retain.ts [--verify]')
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
			'# l15 Q4 thinking execution custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'The closed Q4 thinking live brief/report, fixed cell driver, deployment snapshot, outer/stage launch captures, resource/full/pilot helpers and available captures/metadata, resource request audit, ownership lookup report, fixed custody manifests, both resource execution records, and retention preparation evidence are included. Supplemental files preserve their basenames; no filename collision occurred.',
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
			'The full-helper wrapper exit receipt and full/pilot standalone metadata were unavailable and are not fabricated. Raw output directories, including both resource attempts, remain in place for root to stage directly. Live daemon logs, environment/credentials, bench journals, dry-plan preparation files, and unfinished quality evidence are excluded. Ownership lookup retention claims no citation coverage. Root owns any README.',
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
