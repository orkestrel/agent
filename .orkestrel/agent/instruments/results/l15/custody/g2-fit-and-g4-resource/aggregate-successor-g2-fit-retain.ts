/**
 * Usage: node tmp/units/aggregate-successor-g2-fit-retain.ts [--verify]
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
const EXPECTED_HEAD = '4acb51125833e96aa771574ce248f49cc9ebddc0'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/g2-fit-and-g4-resource'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-g2-fit-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-g2-fit-retention-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.err',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-g2-adjudication-read.ts',
	'tmp/units/aggregate-successor-g2-adjudication.md',
	'tmp/units/aggregate-successor-g2-fit-brief-prep.ts',
	'tmp/units/aggregate-successor-g2-fit-brief.md',
	'tmp/units/aggregate-successor-g2-fit-citation-check.txt',
	'tmp/units/aggregate-successor-g2-fit-command.txt',
	'tmp/units/aggregate-successor-g2-fit-custody.txt',
	'tmp/units/aggregate-successor-g2-fit-execution.txt',
	'tmp/units/aggregate-successor-g2-fit-launch.stdout.txt',
	'tmp/units/aggregate-successor-g2-fit-launcher-stderr.txt',
	'tmp/units/aggregate-successor-g2-fit-preflight.txt',
	'tmp/units/aggregate-successor-g2-fit-process-closure.txt',
	'tmp/units/aggregate-successor-g2-fit-read.ts',
	'tmp/units/aggregate-successor-g2-fit-reader-adaptation.diff',
	'tmp/units/aggregate-successor-g2-fit-report.md',
	'tmp/units/aggregate-successor-g2-fit-status-delta.txt',
	'tmp/units/aggregate-successor-g2-fit-validation-execution.txt',
	'tmp/units/aggregate-successor-g2-fit-validation.json',
	'tmp/units/aggregate-successor-g2-fit-validation.stderr.txt',
	'tmp/units/aggregate-successor-g2-fit-validation.stdout.jsonl',
	'tmp/units/aggregate-successor-g2-labels.ts',
	'tmp/units/aggregate-successor-g4-think0-resource-brief.md',
	'tmp/units/aggregate-successor-g4-think0-resource-read.stderr.txt',
	'tmp/units/aggregate-successor-g4-think0-resource-read.stdout.txt',
	'tmp/units/aggregate-successor-g4-think0-resource-read.ts',
	'tmp/units/aggregate-successor-g4-think0-resource-report.md',
	'tmp/units/aggregate-successor-label-d-brief.md',
	'tmp/units/aggregate-successor-label-d-fragments-brief.md',
	'tmp/units/aggregate-successor-label-d-fragments-report.md',
	'tmp/units/aggregate-successor-label-d-judgments.ts',
	'tmp/units/aggregate-successor-label-d-reader.ts',
	'tmp/units/aggregate-successor-label-d-report.md',
	'tmp/units/aggregate-successor-label-d-serialize.ts',
	'tmp/units/aggregate-successor-label-d-types.ts',
	'tmp/units/aggregate-successor-label-d-verifier-adaptation.diff',
	'tmp/units/aggregate-successor-label-d-verifier-brief.md',
	'tmp/units/aggregate-successor-label-d-verifier-check.ts',
	'tmp/units/aggregate-successor-label-d-verifier-comparison.txt',
	'tmp/units/aggregate-successor-label-d-verifier-execution.txt',
	'tmp/units/aggregate-successor-label-d-verifier-launcher-stderr.txt',
	'tmp/units/aggregate-successor-label-d-verifier-reader.ts',
	'tmp/units/aggregate-successor-label-d-verifier-report.md',
	'tmp/units/aggregate-successor-label-d-verifier-stderr.txt',
	'tmp/units/aggregate-successor-label-d-verifier-stdout.jsonl',
	'tmp/units/aggregate-successor-label-d-verifier-stdout.jsonl.pid',
	'tmp/units/aggregate-successor-label-d.json',
	'tmp/units/aggregate-successor-next-briefs-prep-2.ts',
	'tmp/units/aggregate-successor-next-briefs-prep.ts',
	'tmp/units/aggregate-successor-q2-exploratory-preparation-brief.md',
	'tmp/units/aggregate-successor-q2-exploratory-preparation-report.md',
	'tmp/units/aggregate-successor-q2-exploratory-prepare.diff',
	'tmp/units/aggregate-successor-q2-exploratory-prepare.ts',
	'tmp/units/aggregate-successor-g2-fit-retain.diff',
	'tmp/units/aggregate-successor-g2-fit-retain-report.md',
	'tmp/units/aggregate-successor-g2-fit-retain.ts',
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.err', '96c591ccf6ee015504e88f87798ba57c52da241880fd42512b265436946140e6'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl.pid', 'aba793715d2161021f816999b9ae5816e1aa4a921fc1515a12499df048878262'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl.status-after.txt', '204e74dde3b81615cc3ab8072366a61698977db16078b5bbc371e65e1620bc2f'],
	['.orkestrel/agent/instruments/results/l15/logs/g2-calibration-fit.jsonl.status-before.txt', '4cb2b074b110d0e303b4ab4a940ca0eb0c71b11a79cc0e2d34c20e8feda96712'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.err', 'f7b576d4360004722f11a816a1344897468c909a665df4c064d10f5624a403a0'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl', '3db46a980759486895c4a2b8bc6785183dd3da63b790f87bcf2943f7618842e0'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl.pid', 'c820c251a253d2714a34704c5b8b6271f5b07bcedfa8b0d79f389bb142080a9e'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl.status-after.txt', '4cb2b074b110d0e303b4ab4a940ca0eb0c71b11a79cc0e2d34c20e8feda96712'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-resource.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['tmp/units/aggregate-successor-g2-adjudication-read.ts', 'b06f49ef83030c988f94d38b004782c6f8b2f6c1b359b953b35ea443a73613bc'],
	['tmp/units/aggregate-successor-g2-adjudication.md', '01b0325547e717f3c83be65fedb9ebce948c60d469594f35b06a41c7b43d154d'],
	['tmp/units/aggregate-successor-g2-fit-brief-prep.ts', '4433207103c9f8a2c58e9e90d92d3dacf96d5b2ca47eaf49bdf3c40a246f5120'],
	['tmp/units/aggregate-successor-g2-fit-brief.md', 'b5107ee711cf4f4bafa1f2a1424166957478c293270ca74f79624445322f11f6'],
	['tmp/units/aggregate-successor-g2-fit-citation-check.txt', '9c1834bcc0727c04029dacf822001b537a7afbf1b80cb577517ec1ae02cd9f27'],
	['tmp/units/aggregate-successor-g2-fit-command.txt', '34d9356a53614cfc4941c6b25a11ec70c47456a13ffeed381a7f0397ee43581b'],
	['tmp/units/aggregate-successor-g2-fit-custody.txt', 'e21755c7041855a0539e1a49dbe883070bd01b10fe728e0a7679887e9361be42'],
	['tmp/units/aggregate-successor-g2-fit-execution.txt', '086d0c6784898061464004a82c884ca8143c6be9744932b91cccfcae995f2e42'],
	['tmp/units/aggregate-successor-g2-fit-launch.stdout.txt', '67dd2111bbfefb4db7ff6c0140a9e2d8ac4061f7d6e0049724019a71d42e589f'],
	['tmp/units/aggregate-successor-g2-fit-launcher-stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-fit-preflight.txt', 'd7c996bdbd14e584a5d05a5ee26221d5fa3c2d85490a6bf6313c5246dc773ba1'],
	['tmp/units/aggregate-successor-g2-fit-process-closure.txt', '2d62708e147d9d834df5331b773cd3275ead8e1f971aff8f9ab64d28c0a24eae'],
	['tmp/units/aggregate-successor-g2-fit-read.ts', '2b887cdcc108ff2488b4dc5081b9530d3a9c2f0dc88cd608332b4f643c432f0e'],
	['tmp/units/aggregate-successor-g2-fit-reader-adaptation.diff', '4ab3e25f934407927907197b3cfc43a01ab39b82dc0be9810c1034b19ef0f881'],
	['tmp/units/aggregate-successor-g2-fit-report.md', '867d33e830206459edbdde1fcce8b433eea6792664fac6349aab7f42ac261485'],
	['tmp/units/aggregate-successor-g2-fit-status-delta.txt', '288a9b7fa1c0d1eb308923dc4e3877988fa6e48ee9a27833a1c00541a5e5d116'],
	['tmp/units/aggregate-successor-g2-fit-validation-execution.txt', 'c13906b182825f1c37adb11649556d0f618b2ee0820de3e38eefc28308bc35d3'],
	['tmp/units/aggregate-successor-g2-fit-validation.json', 'fc43bb75e3b72c85b86893ac7554c96a16eba3e44b50deb0206f95a0c95ac917'],
	['tmp/units/aggregate-successor-g2-fit-validation.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-fit-validation.stdout.jsonl', 'fc43bb75e3b72c85b86893ac7554c96a16eba3e44b50deb0206f95a0c95ac917'],
	['tmp/units/aggregate-successor-g2-labels.ts', 'f6c54e8392891938cc69060f5a62a0627b60762eb30973e2583077431e5283f8'],
	['tmp/units/aggregate-successor-g4-think0-resource-brief.md', 'b65f7def4e0139270f51ad82a4985d9055e7ebb7ecb299e84fabe878b640ff77'],
	['tmp/units/aggregate-successor-g4-think0-resource-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g4-think0-resource-read.stdout.txt', '064e5ef1fd3ec923e9363bd7436ce40c2980fb4e03e10309a2456f4757ba9257'],
	['tmp/units/aggregate-successor-g4-think0-resource-read.ts', 'ad014cb203e97cac840bbbf1e9f2c1e6014b7ffa62ff14b9085cfc2e513e7f5a'],
	['tmp/units/aggregate-successor-g4-think0-resource-report.md', '821e1be1bb3117cb266ca7b55ee72f849be61fef691333c36a148baf02ba2721'],
	['tmp/units/aggregate-successor-label-d-brief.md', '78ea1b4b1ef7e2264d663b2e760717fe0b77718415cbac4bcd751bfe549a7135'],
	['tmp/units/aggregate-successor-label-d-fragments-brief.md', 'c8468bc565de2cda778c416bab3f4e705b506c6b9dbb6c5579c64416fdb7f673'],
	['tmp/units/aggregate-successor-label-d-fragments-report.md', '775cbcea54d659018bc7867698774b632fb70a43269321c870a192dd226c7862'],
	['tmp/units/aggregate-successor-label-d-judgments.ts', 'fa339186b1c92ab3bb86324864542a3c8ad8aec8cc96ac6058fa59531f0be265'],
	['tmp/units/aggregate-successor-label-d-reader.ts', 'f94ae1a7fa2edb48bfb78cd8983912136b1dacf49d4bcdc69bd2bb875ac70255'],
	['tmp/units/aggregate-successor-label-d-report.md', '6507a0d6d7399e38fe94d6c8dd79f280188c279cc11a7e7dc62f6bc3078b4029'],
	['tmp/units/aggregate-successor-label-d-serialize.ts', 'f383100546e1069702bf074d7fb67c231b41e0f63405bd4b36ecc22f26b349cb'],
	['tmp/units/aggregate-successor-label-d-types.ts', '0d125f7588c31e1f4dacbf78ea1b2fb43c208807ce69bed5ece1e40b6ae66a4e'],
	['tmp/units/aggregate-successor-label-d-verifier-adaptation.diff', '4c5c0df701a4e6a79e18270dc7306a092bc2bce868917a03a80ecf55c55d8aea'],
	['tmp/units/aggregate-successor-label-d-verifier-brief.md', 'dabae3c354168dbf8bbdd40657c158ca6b53a5099be93aaa6e8fdc95fbdd4e00'],
	['tmp/units/aggregate-successor-label-d-verifier-check.ts', 'e99b3df765715179bcdee83a1acd47e9aed1301ac8d95e8452481531e7cd67e8'],
	['tmp/units/aggregate-successor-label-d-verifier-comparison.txt', 'e4d9d1d542eb3cd67627511b366941ec8f9941506a1227f80f568938d78dd3aa'],
	['tmp/units/aggregate-successor-label-d-verifier-execution.txt', '491124b738e17e899435906bf920aed7d8add19d68cd665aec94ef32e2a301ca'],
	['tmp/units/aggregate-successor-label-d-verifier-launcher-stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-label-d-verifier-reader.ts', 'eb3207b6d46bcb16bb159f55b04ce8045981c9bbd3569eaaeb7b740f69194341'],
	['tmp/units/aggregate-successor-label-d-verifier-report.md', 'fcc3c2375fdc29ffc442e08da5d46cb5272654d7ce92cc91774881ff98925228'],
	['tmp/units/aggregate-successor-label-d-verifier-stderr.txt', '997efe6ec0e01cce68ea737bb426a8d0f555dfc272d56a7eb9660726a77b88af'],
	['tmp/units/aggregate-successor-label-d-verifier-stdout.jsonl', 'c0cdb5a1cace31c2b87f40019a193501ed207c284796d0a7f51b9d93c36ae0c0'],
	['tmp/units/aggregate-successor-label-d-verifier-stdout.jsonl.pid', 'd5f01bfa566e5a01c387206680f9cef74e402ecc756bf2b28c2720bf53e74d7d'],
	['tmp/units/aggregate-successor-label-d.json', '5f2c0c2a781a9e3888b07e17ee9a3fd484984be9a0916c37d6514fcb7ce7a923'],
	['tmp/units/aggregate-successor-next-briefs-prep-2.ts', '0f7808bc92dfc85b64195561b245b5fdce868a4ae1a6f86036b28707d7f4f30d'],
	['tmp/units/aggregate-successor-next-briefs-prep.ts', 'a16dac9bb9c8dfd6bb02377ee9833d5359f015a2f1af02f136b2683a4d470bc9'],
	['tmp/units/aggregate-successor-q2-exploratory-preparation-brief.md', 'f87c3324cfede9abe3081f060b1c4233085def484cf45455d0914ed4d9908ed5'],
	['tmp/units/aggregate-successor-q2-exploratory-preparation-report.md', 'ee9f96401b77ec090a1e2c937eaa2326e1bed15533f65058d44d04309137c51b'],
	['tmp/units/aggregate-successor-q2-exploratory-prepare.diff', '5c24c798e9471b4f944b340718f4370d5176390a605a89948aa27fd4bab969be'],
	['tmp/units/aggregate-successor-q2-exploratory-prepare.ts', 'b33662c6020f67feb528b8e73269435a88474ae8e20456e296ef4a04d69999c9'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-g2-fit-retain.ts [--verify]')
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
			'# l15 G2 calibration and G4 resource custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed independent alias-d labels, original audit, fragment addendum, serializer/check helpers and verifier captures, G2 root adjudication/materializer, fit brief/preparation/readers/diff/report/launch and validation captures, accepted Q2 exploratory preparation and its failed predecessor, G4 resource brief/reader/report/captures, both closed stage log families, and this retention preparation are included by basename. No filename collision occurred. All completed originals remain intact.',
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
			'No required closed input was missing. Canonical G2 labels/review-labels, G2 fit outputs, and G4 resource outputs remain at their existing locations for root staging. The duplicate alias-d packet remains referenced at .orkestrel/agent/instruments/results/l15/calibration/g2/generation/packet.jsonl and is not copied. The active retention brief, live G4 full-stage evidence, daemon artifacts, unrelated history, and external bench journals are excluded. The failed exploratory preparation predecessor remains intact. Self/script/diff/preparation-report seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.',
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
