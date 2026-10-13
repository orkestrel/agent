/**
 * Usage: node tmp/units/aggregate-successor-contact-retain.ts [--verify]
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
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/contact-and-preparation'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-contact-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-contact-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'tmp/units/aggregate-successor-contact-trace-aggregate-aggregates.json',
	'tmp/units/aggregate-successor-contact-trace-aggregate-body-263.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-body-264.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-body-265.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-body-266.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-calls.json',
	'tmp/units/aggregate-successor-contact-trace-aggregate-messages.json',
	'tmp/units/aggregate-successor-contact-trace-aggregate-readable-263.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-readable-264.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-readable-265.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-readable-266.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-request-263.jsonl',
	'tmp/units/aggregate-successor-contact-trace-aggregate-request-264.jsonl',
	'tmp/units/aggregate-successor-contact-trace-aggregate-request-265.jsonl',
	'tmp/units/aggregate-successor-contact-trace-aggregate-request-266.jsonl',
	'tmp/units/aggregate-successor-contact-trace-aggregate-requests.json',
	'tmp/units/aggregate-successor-contact-trace-aggregate-response-263.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-response-264.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-response-265.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-response-266.txt',
	'tmp/units/aggregate-successor-contact-trace-aggregate-rows.json',
	'tmp/units/aggregate-successor-contact-trace-aggregate-selections.json',
	'tmp/units/aggregate-successor-contact-trace-aggregate-turns.json',
	'tmp/units/aggregate-successor-contact-trace-brief.md',
	'tmp/units/aggregate-successor-contact-trace-comparison.json',
	'tmp/units/aggregate-successor-contact-trace-hashes.json',
	'tmp/units/aggregate-successor-contact-trace-judgments.json',
	'tmp/units/aggregate-successor-contact-trace-maintained.json',
	'tmp/units/aggregate-successor-contact-trace-reader.ts',
	'tmp/units/aggregate-successor-contact-trace-records-body-53.txt',
	'tmp/units/aggregate-successor-contact-trace-records-body-54.txt',
	'tmp/units/aggregate-successor-contact-trace-records-body-55.txt',
	'tmp/units/aggregate-successor-contact-trace-records-calls.json',
	'tmp/units/aggregate-successor-contact-trace-records-messages.json',
	'tmp/units/aggregate-successor-contact-trace-records-readable-53.txt',
	'tmp/units/aggregate-successor-contact-trace-records-readable-54.txt',
	'tmp/units/aggregate-successor-contact-trace-records-readable-55.txt',
	'tmp/units/aggregate-successor-contact-trace-records-request-53.jsonl',
	'tmp/units/aggregate-successor-contact-trace-records-request-54.jsonl',
	'tmp/units/aggregate-successor-contact-trace-records-request-55.jsonl',
	'tmp/units/aggregate-successor-contact-trace-records-requests.json',
	'tmp/units/aggregate-successor-contact-trace-records-response-53.txt',
	'tmp/units/aggregate-successor-contact-trace-records-response-54.txt',
	'tmp/units/aggregate-successor-contact-trace-records-response-55.txt',
	'tmp/units/aggregate-successor-contact-trace-records-rows.json',
	'tmp/units/aggregate-successor-contact-trace-records-selections.json',
	'tmp/units/aggregate-successor-contact-trace-records-turns.json',
	'tmp/units/aggregate-successor-contact-trace-report.md',
	'tmp/units/aggregate-successor-contact-trace-source.json',
	'tmp/units/aggregate-successor-model-g2-generation-brief.md',
	'tmp/units/aggregate-successor-model-q2-generation-brief.md',
	'tmp/units/aggregate-successor-quality-b-boundary.ts',
	'tmp/units/aggregate-successor-quality-b-brief.md',
	'tmp/units/aggregate-successor-quality-b-join.ts',
	'tmp/units/aggregate-successor-quality-b-preparation-brief.md',
	'tmp/units/aggregate-successor-quality-b-preparation-report.md',
	'tmp/units/aggregate-successor-quality-b-preparation.diff',
	'tmp/units/aggregate-successor-remaining-generation-briefs-brief.md',
	'tmp/units/aggregate-successor-remaining-generation-briefs-report.md',
	'tmp/units/aggregate-successor-remaining-generation-briefs.diff',
	'tmp/units/aggregate-successor-contact-retention-brief.md',
	'tmp/units/aggregate-successor-contact-retention-preparation.md',
	'tmp/units/aggregate-successor-contact-retain.diff',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['tmp/units/aggregate-successor-contact-trace-aggregate-aggregates.json', 'c16bc1db60563ac8b2f5490e175f5f743b5b3985295218f6559790f1b26516cc'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-body-263.txt', '3298ca264c83f0c99a977b284b1b506aa9cd6cab9217eb8fcd46848e70a9a3a3'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-body-264.txt', '06dbc13923e6337c5e3639c649e31a87b2f64b01ba75c65a814f62b4750c9f83'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-body-265.txt', '65cb4b693f95bb28e3a1177b4861f1cce8badc98cd82533fbd6759e6b208bb04'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-body-266.txt', '5939a1c43ecc2babd3fa226697d7ba1020fb290eb0da25908c9de06a76018804'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-calls.json', '13236057e60498e95037997ad31d849e65f2d01da913121a16e7a52600abaa85'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-messages.json', '881f2dbd96d8fe6aef3b6bfcd36b155f73f28a09ad296295e43f64cd9c145508'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-readable-263.txt', '085dbfac34526333c37a835bb1941a2fbff99730a1d9c83bc3d69eafcabb6e42'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-readable-264.txt', '5973e9d39f3baac9ee6c260e71bc8d31efe4a7b011ca0586a19950f926eb028e'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-readable-265.txt', 'dcd1f95824598311a569bcd1889e84f2e5c11f6633681ef65798cda98a1769aa'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-readable-266.txt', 'e43f3335bbca26210bd7e2fd0f8d29e248093f988bf7723f07511de230d7c995'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-request-263.jsonl', '8245253936a522b08aa16441ad6babd2001d824bd6762c5311d74c5511eec33f'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-request-264.jsonl', '09ad63a362b21d2332990ba97ea52b3c068b16a49c7c0291424c1a3586649b60'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-request-265.jsonl', '447ef0f9c85058c7432d16d009bcbea2884700cf70e0479319c274d0be9c6960'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-request-266.jsonl', 'df0682e094ceb5fbd4a011a5c0120db78b45c07bbd6cba47006673d3939776cf'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-requests.json', '28f6c5b9c8a1f7209b3ca5b209fad88fc8975f476de1e93899e60a752a6329a9'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-response-263.txt', 'b92d6bd69274fc9bef521a8dbf84a0d708eb4889965a4c33b4bf6238bb2ad2e3'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-response-264.txt', 'b92d6bd69274fc9bef521a8dbf84a0d708eb4889965a4c33b4bf6238bb2ad2e3'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-response-265.txt', 'a83dd0ccbffe39d071cc317ddf6e97f5c6b1c87af91919271f9fa140b0508c6c'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-response-266.txt', 'b368eba0bcbde025214478756aad15633df9a15fd6cfd4c1677cd331325677f4'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-rows.json', '19ae482be72209d4550850372d3b3014594994965a778ca6cc2459f0a916bf6d'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-selections.json', 'a24ffb4b2e365c876c13014a041c235392d24031bc51c2c21db2622ada5f82ef'],
	['tmp/units/aggregate-successor-contact-trace-aggregate-turns.json', '7d0c9f073640a745bf9ff1bf7c76681de84c598814e416a6fcc962a3d2fbb3d2'],
	['tmp/units/aggregate-successor-contact-trace-brief.md', 'c02b61386e2545ce7f9034e4e0821f85fb68aa6343d3d8ad93739b11ca4e4967'],
	['tmp/units/aggregate-successor-contact-trace-comparison.json', '56475becb081c1186de834f7effe0f6675e1f6d01c2d586409f9acc6deb143fe'],
	['tmp/units/aggregate-successor-contact-trace-hashes.json', 'b70bde004a0ccbe1a802738ec4a8efd9d317de88123ce7172949359026450dbd'],
	['tmp/units/aggregate-successor-contact-trace-judgments.json', '56aa6e51c8e9c6e3e7df52963e9da3ac9736a86e733b978a87979f854e39b46c'],
	['tmp/units/aggregate-successor-contact-trace-maintained.json', '51294ef0b47cdd68d9e8b00cb17f85f4cffa998015479e0ca8cde030605d277d'],
	['tmp/units/aggregate-successor-contact-trace-reader.ts', '7a63864d5fe062b42a32c432acca3ede98f4c880ad7f0d18f4199b6a758713d3'],
	['tmp/units/aggregate-successor-contact-trace-records-body-53.txt', '65cb4b693f95bb28e3a1177b4861f1cce8badc98cd82533fbd6759e6b208bb04'],
	['tmp/units/aggregate-successor-contact-trace-records-body-54.txt', '28b504844b5dc72ffadedd777b93139d2b0b70869f10ae938113c802d33b0f54'],
	['tmp/units/aggregate-successor-contact-trace-records-body-55.txt', 'aa0f836db46f57c03430812f0b38b540231bf2c011ea4882c2af1768faf6211a'],
	['tmp/units/aggregate-successor-contact-trace-records-calls.json', 'f3f8c5984b63098804398718e4725f26c65c652bb86a72b9c4fe78e99d6225e3'],
	['tmp/units/aggregate-successor-contact-trace-records-messages.json', '683b45c5e6b1045af167d18ad90ee0e1291e34d62c6fdb9b1f179f24feebef49'],
	['tmp/units/aggregate-successor-contact-trace-records-readable-53.txt', 'dcd1f95824598311a569bcd1889e84f2e5c11f6633681ef65798cda98a1769aa'],
	['tmp/units/aggregate-successor-contact-trace-records-readable-54.txt', 'ed2231630c808998b7c8f80f8e5fa3839feedeb784ed88427a32426850904a7e'],
	['tmp/units/aggregate-successor-contact-trace-records-readable-55.txt', 'e1c411a31513c0f2a7967192e47048741f9b5a62dbec2348440419e9ef6010dd'],
	['tmp/units/aggregate-successor-contact-trace-records-request-53.jsonl', '9d2bf5d8da9211b2425a0cbec999d018acda4e82345286636266a5f2931f31dc'],
	['tmp/units/aggregate-successor-contact-trace-records-request-54.jsonl', '822662a1bc92b87de73b86ba6c41931c0b1aeea7d6a7b77d0290234a9f090333'],
	['tmp/units/aggregate-successor-contact-trace-records-request-55.jsonl', '8d3a68fff6ba7ec748364cc0781b69eab4af0e813a58cbc14df51b5c3686db88'],
	['tmp/units/aggregate-successor-contact-trace-records-requests.json', '7a29b4bb8a71bd998a1a5a704b720aa8f9a150b73934d9e53213b4b5bab9b69c'],
	['tmp/units/aggregate-successor-contact-trace-records-response-53.txt', 'a83dd0ccbffe39d071cc317ddf6e97f5c6b1c87af91919271f9fa140b0508c6c'],
	['tmp/units/aggregate-successor-contact-trace-records-response-54.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-contact-trace-records-response-55.txt', '8b2eb019040dd5eb9c2c923cff213816fdcb3835cf7aa4cb283eaa467c66b9e1'],
	['tmp/units/aggregate-successor-contact-trace-records-rows.json', 'feba64d575917c277a316516324f0e036431e84d50c83c4a60037084d04e9805'],
	['tmp/units/aggregate-successor-contact-trace-records-selections.json', '3811665ba8fda59f0bbcff7e6e1ecfc79b2bc9c803816e4ea1766a3e6d9cbb7c'],
	['tmp/units/aggregate-successor-contact-trace-records-turns.json', '657eab58da2ed49e769c2e92a0324cd5a45131f507c76a8a304bbba4ded6a241'],
	['tmp/units/aggregate-successor-contact-trace-report.md', '8a3f99ee1a6ff124971fcf36c9d88f4e7539e4c12dc663426a6e64c318569f6b'],
	['tmp/units/aggregate-successor-contact-trace-source.json', '13625e1866d50355916ad72ec7bd88ae49280943a7f3666b0b4edc30c35818a6'],
	['tmp/units/aggregate-successor-model-g2-generation-brief.md', 'a8905db71c40671c4e222eeb69c59a4952d2279b1cfb76a512e9f11990363b09'],
	['tmp/units/aggregate-successor-model-q2-generation-brief.md', '661bfa4ca26b05baeb83dd1617f92d6f0bc9f56f5561ae5c9cae6bdaf229d67c'],
	['tmp/units/aggregate-successor-quality-b-boundary.ts', '98ef967bada3beab4c2376cd32fb2ef31818750df4317160cc140cea613b4c54'],
	['tmp/units/aggregate-successor-quality-b-brief.md', '1ffe42923b9357c3686f227fba96a3dcd75663e06828249abce46e451f01a13a'],
	['tmp/units/aggregate-successor-quality-b-join.ts', 'bd5b8103c7af57475e4dfbe8531bc99e9edfbb3edfa3fbb9a89e0c8faebca19f'],
	['tmp/units/aggregate-successor-quality-b-preparation-brief.md', 'b0195bc3b4ca9ae1afd7d2f5de1a5e52fff30b45808a9e2ba36909fc5f1b612f'],
	['tmp/units/aggregate-successor-quality-b-preparation-report.md', '51966425813cc8e2cea392d59c1e9ac6a26f82bc3231704865cc658910eed6c7'],
	['tmp/units/aggregate-successor-quality-b-preparation.diff', '2981ad9a07cca4bca7859c35988c66082341999ac7c8b8eef06f9a0b93413a33'],
	['tmp/units/aggregate-successor-remaining-generation-briefs-brief.md', '1824b968355b7afffa5ceb6d2b1b31b5b4294e1eddcd83a949ad9322138dad12'],
	['tmp/units/aggregate-successor-remaining-generation-briefs-report.md', '670ee015788f22c237fb463d793cd666e018e05414d09cca6ff5a9e0a7ba8b6f'],
	['tmp/units/aggregate-successor-remaining-generation-briefs.diff', '5d6bc9b0e8c82d239f406a9162c7fa12ed1390fe715f679689c37f0730c9d08a'],
	['tmp/units/aggregate-successor-contact-retention-brief.md', 'cb6901bcd1a5d5bef922c69da238817726e676bbac6303698088102a8f64a643'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-contact-retain.ts [--verify]')
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
			'# l15 contact trace and offline preparation custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'All completed contact-trace files, alias-b preparation evidence and unsealed readers/clean audit brief, remaining-generation preparation evidence and q2/g2 generation briefs, and retention preparation evidence are included by basename. No filename collision occurred. The completed originals remain intact.',
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
			'No required completed original was missing during preparation. The live chain, future quality-b packet/judgments/results, model run artifacts, and daemon/bench journals are excluded. Retention preserves the accepted findings without changing them. Generated manifest and attributes are separately measured; root authors and accepts the README.',
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
