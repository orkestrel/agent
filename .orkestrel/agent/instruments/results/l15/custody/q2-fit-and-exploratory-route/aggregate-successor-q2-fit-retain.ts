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
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/q2-fit-and-exploratory-route'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-q2-fit-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-q2-fit-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.err',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.err',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-g4-explore-lookup-addendum.md',
	'tmp/units/aggregate-successor-g4-explore-lookup-report.md',
	'tmp/units/aggregate-successor-g4-resource-brief-prep.ts',
	'tmp/units/aggregate-successor-g4-think0-resource-brief.md',
	'tmp/units/aggregate-successor-label-c-brief.md',
	'tmp/units/aggregate-successor-label-c-decisions.ts',
	'tmp/units/aggregate-successor-label-c-reader.ts',
	'tmp/units/aggregate-successor-label-c-report.md',
	'tmp/units/aggregate-successor-label-c-serialize.ts',
	'tmp/units/aggregate-successor-label-c-verifier-adaptation.diff',
	'tmp/units/aggregate-successor-label-c-verifier-brief.md',
	'tmp/units/aggregate-successor-label-c-verifier-check.ts',
	'tmp/units/aggregate-successor-label-c-verifier-execution.json',
	'tmp/units/aggregate-successor-label-c-verifier-reader.ts',
	'tmp/units/aggregate-successor-label-c-verifier-report.md',
	'tmp/units/aggregate-successor-label-c-verifier-stderr.txt',
	'tmp/units/aggregate-successor-label-c-verifier-stdout.jsonl',
	'tmp/units/aggregate-successor-label-c-verifier-stdout.jsonl.pid',
	'tmp/units/aggregate-successor-label-c.json',
	'tmp/units/aggregate-successor-matrix-explore-acceptance.md',
	'tmp/units/aggregate-successor-matrix-explore-seam-addendum.md',
	'tmp/units/aggregate-successor-matrix-explore-seam-brief.md',
	'tmp/units/aggregate-successor-matrix-explore-seam-report.md',
	'tmp/units/aggregate-successor-q2-adjudication-read.ts',
	'tmp/units/aggregate-successor-q2-adjudication.md',
	'tmp/units/aggregate-successor-q2-fit-2-brief-prep.ts',
	'tmp/units/aggregate-successor-q2-fit-2-launch-receipt.txt',
	'tmp/units/aggregate-successor-q2-fit-2-read.ts',
	'tmp/units/aggregate-successor-q2-fit-2-reader-adaptation.diff',
	'tmp/units/aggregate-successor-q2-fit-2-report.md',
	'tmp/units/aggregate-successor-q2-fit-2-validation.err',
	'tmp/units/aggregate-successor-q2-fit-2-validation.json',
	'tmp/units/aggregate-successor-q2-fit-2-validation.stdout.jsonl',
	'tmp/units/aggregate-successor-q2-fit-2-validation.stdout.jsonl.pid',
	'tmp/units/aggregate-successor-q2-fit-brief-2.md',
	'tmp/units/aggregate-successor-q2-fit-brief-prep.ts',
	'tmp/units/aggregate-successor-q2-fit-brief.md',
	'tmp/units/aggregate-successor-q2-fit-launch-receipt.txt',
	'tmp/units/aggregate-successor-q2-fit-read.ts',
	'tmp/units/aggregate-successor-q2-fit-reader-adaptation.diff',
	'tmp/units/aggregate-successor-q2-fit-report.md',
	'tmp/units/aggregate-successor-q2-fit-retention-brief-prep.ts',
	'tmp/units/aggregate-successor-q2-fit-retention-brief.md',
	'tmp/units/aggregate-successor-q2-fit-validation.err',
	'tmp/units/aggregate-successor-q2-fit-validation.stdout.jsonl',
	'tmp/units/aggregate-successor-q2-fit-validation.stdout.jsonl.pid',
	'tmp/units/aggregate-successor-q2-label-prep.ts',
	'tmp/units/aggregate-successor-q2-labels.ts',
	'tmp/units/aggregate-successor-q2-review-prep.ts',
	'tmp/units/aggregate-successor-q2-fit-retain.diff',
	'tmp/units/aggregate-successor-q2-fit-retention-report.md',
	'tmp/units/aggregate-successor-q2-fit-retain.ts',
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.err', '241a5e287b1e85f22279904d792b9259d11f83435d23b0aa13f63aee561ff38f'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl.pid', 'ac20f02bf1eaea5fb2706e83097762d046e88e8450305c6385270deb472070bb'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl.status-after.txt', '449e6906df7223da6cda930db4fc1e3e9350ea2ab88af5e4fcbc0e002cb7fd69'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit-2.jsonl.status-before.txt', '4ae90614c28140defe8be50823538b556395bdfaf074774a6ff283bbfce090a1'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.err', 'c41f14e27c7bf1276347be04f67b30bdeba03e5229cc7af8b8260d123da666a8'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl.pid', '603ad4a4c852a19cc73acb98b12402c7e37235634841b08c56d836021a9d5b5d'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl.status-after.txt', 'ac3ebe302a86e86f6a54c6b08ce5586b6a26fe211da495838b7d5db8deb69c14'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-fit.jsonl.status-before.txt', 'e83dcbb230e4f21e4ea5a95302770a4e39d9df5d63345dc2cad7ac4d941f2e93'],
	['tmp/units/aggregate-successor-g4-explore-lookup-addendum.md', 'a34ef585d8c6d6b21ba59f51f6c5977ca15bae1dc5caa34f6aa6b99550552dad'],
	['tmp/units/aggregate-successor-g4-explore-lookup-report.md', '245ca99559c74006c085480851bfab435840993960fe5c4948eb448ce9ebf11d'],
	['tmp/units/aggregate-successor-g4-resource-brief-prep.ts', '5707d35f45b602b8147d154fc6c6b574dc7a9bdfbf54fd0d282cb31d49a917dc'],
	['tmp/units/aggregate-successor-g4-think0-resource-brief.md', 'b65f7def4e0139270f51ad82a4985d9055e7ebb7ecb299e84fabe878b640ff77'],
	['tmp/units/aggregate-successor-label-c-brief.md', '6b240ca689c50cc3d620465e8b723bc037f24d09c4e4ef4aeab105a3455c6697'],
	['tmp/units/aggregate-successor-label-c-decisions.ts', 'f4ead74abc9394afcf6cd39eb47486f39498e95bb0b1292d8a7785e84fe8bba3'],
	['tmp/units/aggregate-successor-label-c-reader.ts', '3ea61da4d984058b2aaf07b6bd57d1d17eec222bdfeff6b0b70bf9731c3b9098'],
	['tmp/units/aggregate-successor-label-c-report.md', '67195a66780cf92488fc2159efa141aecee59932263ed900e2769243c9732168'],
	['tmp/units/aggregate-successor-label-c-serialize.ts', 'b3b3ef8f52d37aa3787802d61108b2c7ece94124022d9b8926bace055b66b2ce'],
	['tmp/units/aggregate-successor-label-c-verifier-adaptation.diff', 'fe98494dce215751a634b89398a62fdd8d0e81471281c1415774e0f460ed7b77'],
	['tmp/units/aggregate-successor-label-c-verifier-brief.md', 'c48eb566213860db0e901429c5a9de8d8fd05d315f03c09242ad7cc8872d647f'],
	['tmp/units/aggregate-successor-label-c-verifier-check.ts', 'bef2b3e414fc48d8b1329bf50b28660c338d5a8cde5e4c47d93017a10c61885d'],
	['tmp/units/aggregate-successor-label-c-verifier-execution.json', '38f9b6cc8e178f72f6020b4a2c0668fcb8983ae0ba3162731387cb7bbe432bc6'],
	['tmp/units/aggregate-successor-label-c-verifier-reader.ts', '40e52e9377241739355c87dafe4af28ece83b170465fb734c005a416ff1b316d'],
	['tmp/units/aggregate-successor-label-c-verifier-report.md', '354066fcee5145b056291d5ef5fe8c0d06ab61117a8bb3ec555d15bdd4e4e88f'],
	['tmp/units/aggregate-successor-label-c-verifier-stderr.txt', 'ab6a473b219c39edf86cdfcaf061ab65e53d75b9ff51b0b014d734cf967de1b7'],
	['tmp/units/aggregate-successor-label-c-verifier-stdout.jsonl', '40906cea00e6bf7aab086bdc26c7048d5785fe9912d8db4f5889c218a6798912'],
	['tmp/units/aggregate-successor-label-c-verifier-stdout.jsonl.pid', '7e7b17bb272ba679635541561f9bae2999ffe6b149d1d40e49eabadf8313e782'],
	['tmp/units/aggregate-successor-label-c.json', '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394'],
	['tmp/units/aggregate-successor-matrix-explore-acceptance.md', '9a9a5ee38338120e4a45a19217c4046705bf819dd2ef7a0b5ef59011b0236d33'],
	['tmp/units/aggregate-successor-matrix-explore-seam-addendum.md', 'dc638d03708a27674380372acb28d7ded8a14e42ec851c0eb36dca5ed9cd0240'],
	['tmp/units/aggregate-successor-matrix-explore-seam-brief.md', 'c8fc95d713179542ada1b8cabfa7887fb6f91cfb47beb1eb6ff6b4264a4e4d3f'],
	['tmp/units/aggregate-successor-matrix-explore-seam-report.md', '8c557556cf8de5f380d4fa6eb76c3329f64a08141a9d5dd1f64d5518e7fe4cd5'],
	['tmp/units/aggregate-successor-q2-adjudication-read.ts', '7ca55f85ad8c17b56e8b2e391be005f8525669768ab73612fa3df41d351c4b84'],
	['tmp/units/aggregate-successor-q2-adjudication.md', '06a7ae2e1ec3ee2a66a26654551ccdec7fe88cfc6d29ee6f0c0b363ac7deb3ba'],
	['tmp/units/aggregate-successor-q2-fit-2-brief-prep.ts', '364712c672f54f9d547c42f7b0d0ae6bd8fd26944c25e303783a2976f3f0ce69'],
	['tmp/units/aggregate-successor-q2-fit-2-launch-receipt.txt', '2c0bc633262a036de5667fa3dfc290e91da06e1d6c1c74d52a13d6af6e2fa9c1'],
	['tmp/units/aggregate-successor-q2-fit-2-read.ts', 'e1b1ba555bfc36e88e7037e045b30ffa6b50c5efe5d2baa93ffcea445dfff28e'],
	['tmp/units/aggregate-successor-q2-fit-2-reader-adaptation.diff', '4a5351a71b73ef300d28575f2d02343be59695f6eff3cea0f455fb945871ea65'],
	['tmp/units/aggregate-successor-q2-fit-2-report.md', 'f469c9577291e2c21f91b736e9ca57f412d34b35a1065435b21b85171a4cd528'],
	['tmp/units/aggregate-successor-q2-fit-2-validation.err', '8a1f1cd70e8991de0336b49c5aa15a1c8a7d3c28c5cf3d7a5b0ac9c8292390fd'],
	['tmp/units/aggregate-successor-q2-fit-2-validation.json', '1cc28792283c9be4ce3aaf56dbe39b908d70b6fab05b8900dd0a6177f94452a2'],
	['tmp/units/aggregate-successor-q2-fit-2-validation.stdout.jsonl', '1cc28792283c9be4ce3aaf56dbe39b908d70b6fab05b8900dd0a6177f94452a2'],
	['tmp/units/aggregate-successor-q2-fit-2-validation.stdout.jsonl.pid', 'dc56f4c0eefb3567d3adbb21561c76abef5260f532e836be0001464e9b43053b'],
	['tmp/units/aggregate-successor-q2-fit-brief-2.md', '8b253d27abc9399a75b6f1f8faa27554613fd3d25075748deeb8c0f84dfe0a42'],
	['tmp/units/aggregate-successor-q2-fit-brief-prep.ts', '56f0c4f0b6181ae1169821db069da8e915691cfb45b020b92634ee1341344aad'],
	['tmp/units/aggregate-successor-q2-fit-brief.md', 'c5607a885d4fb6dbc059aa9e043fc67742c8ee797b644027229d536c72360801'],
	['tmp/units/aggregate-successor-q2-fit-launch-receipt.txt', '3b204ef7fb606f33a9d9bdd675991244eef509211360fe8df487716a5f9975d5'],
	['tmp/units/aggregate-successor-q2-fit-read.ts', '1446b96b015621ce63a77565e02c6001903e3633a1d2787ed0a29d83056a791d'],
	['tmp/units/aggregate-successor-q2-fit-reader-adaptation.diff', '2735158ad791c94ef7704d87602da637e81859705290d1e4d4fd3c378ecb6b89'],
	['tmp/units/aggregate-successor-q2-fit-report.md', '556bcc8e4b3eda0e50e787ccc8e56fdaa1be57f1c24b299833d56323112cfbce'],
	['tmp/units/aggregate-successor-q2-fit-retention-brief-prep.ts', '61af7f26a496e9e14d5923850a5c1bf2c12994522b757a82b8deaae3ba772cdb'],
	['tmp/units/aggregate-successor-q2-fit-retention-brief.md', 'fa2e272321ee38dd07775f44dfecc70f337e3c6ed2a01802ac379883b3e09784'],
	['tmp/units/aggregate-successor-q2-fit-validation.err', 'eb9282a9d451faacce223196d5513a190ed2fb0840da284e76d2bab6233cff88'],
	['tmp/units/aggregate-successor-q2-fit-validation.stdout.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-q2-fit-validation.stdout.jsonl.pid', 'e4fda97ac60d8858c2673b319c8fdd58b02440392acf45dfc6087649cc402526'],
	['tmp/units/aggregate-successor-q2-label-prep.ts', 'b6be4426abd80071f4764ed73fe2b746457cb705250cc5c15820f97aa3d6cfb7'],
	['tmp/units/aggregate-successor-q2-labels.ts', 'baf0cdc66ca4bc344f84315a3b7d392f95965ec05db3602b16ba0d2041a50adb'],
	['tmp/units/aggregate-successor-q2-review-prep.ts', 'b8e6f194e5287db56b34fea2cc924d34aa0a96563776e6727cbf46116fe7d67a'],
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
			'# l15 Q2 fit and exploratory route custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed independent alias-c labels, serializer/check helpers and verifier captures, Q2 root adjudication/materializer and preparation helpers, failed caller fit and corrected fit-2 briefs/readers/diffs/reports/launch and validation captures, both fit stage log families, accepted G4 lookup/matrix route reports/addenda/root ruling, prepared G4 resource brief/preparer, and this retention preparation are included by basename. No filename collision occurred. All completed originals remain intact.',
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
			'No required released input was missing. Canonical Q2 labels/review-labels and fit/fit-2 directories remain in place for root staging. Previously committed G4/Q2 packet/generation evidence and the duplicate alias-c packet are not copied. Active G2 evidence, active G4 exploratory preparation, live daemon artifacts, unrelated files, and external bench journals are excluded. The failed caller fit captures remain intact. Self/script/diff/preparation-report seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.',
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
