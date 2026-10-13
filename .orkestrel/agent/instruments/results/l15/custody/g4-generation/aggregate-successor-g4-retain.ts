/**
 * Usage: node tmp/units/aggregate-successor-g4-retain.ts [--verify]
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
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/g4-generation'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-g4-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-g4-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-g4-label-release.ts',
	'tmp/units/aggregate-successor-g4-label-seal.json',
	'tmp/units/aggregate-successor-g4-reader-diagnosis-report.md',
	'tmp/units/aggregate-successor-g4-retention-preparation-brief.md',
	'tmp/units/aggregate-successor-label-b-brief.md',
	'tmp/units/aggregate-successor-label-b-packet.jsonl',
	'tmp/units/aggregate-successor-model-g4-execution-custody-after.json',
	'tmp/units/aggregate-successor-model-g4-execution-custody-before.json',
	'tmp/units/aggregate-successor-model-g4-execution-root.err',
	'tmp/units/aggregate-successor-model-g4-execution-root.jsonl',
	'tmp/units/aggregate-successor-model-g4-execution-root.jsonl.pid',
	'tmp/units/aggregate-successor-model-g4-execution-root.jsonl.status-after.txt',
	'tmp/units/aggregate-successor-model-g4-execution-root.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl',
	'tmp/units/aggregate-successor-model-g4-generation-brief.md',
	'tmp/units/aggregate-successor-model-g4-generation-read-2.exit.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-2.stderr.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-2.stdout.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-3.diff.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-3.duration-ms.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-3.exit.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-3.stderr.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-3.stdout.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-3.ts',
	'tmp/units/aggregate-successor-model-g4-generation-read-4.duration-ms.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-4.exit.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-4.stderr.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-4.stdout.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read-4.ts',
	'tmp/units/aggregate-successor-model-g4-generation-read.stderr.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read.stdout.txt',
	'tmp/units/aggregate-successor-model-g4-generation-read.ts',
	'tmp/units/aggregate-successor-model-g4-generation-reader-3-addendum.md',
	'tmp/units/aggregate-successor-model-g4-generation-reader-4-addendum.md',
	'tmp/units/aggregate-successor-model-g4-generation-report.md',
	'tmp/units/aggregate-successor-model-g4-operators.diff',
	'tmp/units/aggregate-successor-model-g4-plan.json',
	'tmp/units/aggregate-successor-model-run.ts',
	'tmp/units/aggregate-successor-quality-c-boundary.ts',
	'tmp/units/aggregate-successor-quality-c-brief.md',
	'tmp/units/aggregate-successor-quality-c-join.ts',
	'tmp/units/aggregate-successor-quality-cd-preparation-brief.md',
	'tmp/units/aggregate-successor-quality-cd-preparation-report.md',
	'tmp/units/aggregate-successor-quality-cd-preparation.diff',
	'tmp/units/aggregate-successor-quality-d-boundary.ts',
	'tmp/units/aggregate-successor-quality-d-brief.md',
	'tmp/units/aggregate-successor-quality-d-join.ts',
	'tmp/units/aggregate-successor-g4-retention-preparation-report.md',
	'tmp/units/aggregate-successor-g4-retain.diff',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.err', '96c591ccf6ee015504e88f87798ba57c52da241880fd42512b265436946140e6'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl.pid', '9f1779209332e0464b13424ed62536747a87e8d3c29ef1be672293c5954115e5'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl.status-after.txt', '16225790772b37a0db0d86ea94d7dd5033934d027c5034d669adbe6e67885250'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-corpus.jsonl.status-before.txt', '1e120e1234981e549a410f6943c693b5baa1aee60d76037f34d6d752b2e23892'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.err', '958da49e1d62c450c0f0471a9eee88b3917ed24b71ef32ab5e612dbcef5e690d'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl.pid', '13f522f82c3e4c8633cf5135de3c2ce5d2eecf4d6e2002ba85ad6274e209d78f'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl.status-after.txt', '56b86ab76b8b72494d111baddba3f59a98a166d3e00d81b7d5fb3599d0b48257'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.jsonl.status-before.txt', '16225790772b37a0db0d86ea94d7dd5033934d027c5034d669adbe6e67885250'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.err', 'ad03e004b5b5c2924bc5afcbf57446ab622526a30ebd142b01ead69de7f3d8be'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl.pid', 'ff7a763849245342dcfaa9032b2c9dd7a4050682513bf91a01b5bbb0f28dd48b'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl.status-after.txt', '3e86f3dfccdfb8fed730e4cd7ba514de9ba42fb06bcae526c6e2ad8d68691ef2'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-freeze.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.err', 'dd5ecb58e2bfa647ca535ef670baa0520a7377e31a02deefd1cad99e93dc69cf'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl.pid', 'c91af7f2a6d83a621850134942f29230bb159a835af5864323cde60d41eaf466'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl.status-after.txt', '1e120e1234981e549a410f6943c693b5baa1aee60d76037f34d6d752b2e23892'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think1-freeze.jsonl.status-before.txt', '3e86f3dfccdfb8fed730e4cd7ba514de9ba42fb06bcae526c6e2ad8d68691ef2'],
	['tmp/units/aggregate-successor-g4-label-release.ts', '41a824643542a607994ff8da6a03d3fccd89a420f48cbb3d39fd7acb88c0db0f'],
	['tmp/units/aggregate-successor-g4-label-seal.json', '1f41311e5a28d086606f6d9ac52b84311907c59aef4596dfa15367926c7e123f'],
	['tmp/units/aggregate-successor-g4-reader-diagnosis-report.md', 'e4ee4962dccc15e4fd899e65e59469de940c4ec73dc580f5bfcc7cc9bcdda56e'],
	['tmp/units/aggregate-successor-g4-retention-preparation-brief.md', '29992c9db9225686e71f7f7d3cc08a1ab29dafacb781d1fef855d952ed7eb747'],
	['tmp/units/aggregate-successor-label-b-brief.md', '566db010e4ff5729f1bdc1852fd2102a8262616099cdcc849a9a48680af76a5b'],
	['tmp/units/aggregate-successor-label-b-packet.jsonl', '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5'],
	['tmp/units/aggregate-successor-model-g4-execution-custody-after.json', '3950af540d2c3c67e024d652131515ef3f17baeaa67af592a530dc52223c033a'],
	['tmp/units/aggregate-successor-model-g4-execution-custody-before.json', '3950af540d2c3c67e024d652131515ef3f17baeaa67af592a530dc52223c033a'],
	['tmp/units/aggregate-successor-model-g4-execution-root.err', '2d8d25cfd0430187f65bce458c7dac781dfe7e0b04c784245d3daf8d767d58d1'],
	['tmp/units/aggregate-successor-model-g4-execution-root.jsonl', 'ef4960511b7015cb72d5f6e85548742362d2069dc55f61ee966d20a64fea8795'],
	['tmp/units/aggregate-successor-model-g4-execution-root.jsonl.pid', '43e3eb2d55a5b7009193907902702f4dba6381f71028edb068c0109b947641e5'],
	['tmp/units/aggregate-successor-model-g4-execution-root.jsonl.status-after.txt', '56b86ab76b8b72494d111baddba3f59a98a166d3e00d81b7d5fb3599d0b48257'],
	['tmp/units/aggregate-successor-model-g4-execution-root.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl', '6bc7586c506edf2e8c028fa24f3dc12cff2cbcaebbaa1a18572c8c23fe31ac58'],
	['tmp/units/aggregate-successor-model-g4-generation-brief.md', '5e9638c5b5ef1baf0b8eaa22ee885d9268679f67c6fb2cdfe7e036ab6984e801'],
	['tmp/units/aggregate-successor-model-g4-generation-read-2.exit.txt', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'],
	['tmp/units/aggregate-successor-model-g4-generation-read-2.stderr.txt', 'd268b2ffa7901d1e75530853d9fd1ec2a632186e3a8b69f0f690682548cfe2ce'],
	['tmp/units/aggregate-successor-model-g4-generation-read-2.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-model-g4-generation-read-3.diff.txt', '08c26d34202d127eae16619f14c1b6e5d60e17f59174614a134fa2447249acc9'],
	['tmp/units/aggregate-successor-model-g4-generation-read-3.duration-ms.txt', '7a18726f68d7abd89e3ed17d6a4b532f32a3c4e7f99854e9bc5a793efca6d1ea'],
	['tmp/units/aggregate-successor-model-g4-generation-read-3.exit.txt', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'],
	['tmp/units/aggregate-successor-model-g4-generation-read-3.stderr.txt', '3d81491fd376bf1a5821adad28c3807adede0e134cd8902b224d3746dbab0c08'],
	['tmp/units/aggregate-successor-model-g4-generation-read-3.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-model-g4-generation-read-3.ts', '855fab4b2eb31d2a741a8cf4b85cef8ce444fd5366abc3fcea8377ca34bceb7c'],
	['tmp/units/aggregate-successor-model-g4-generation-read-4.duration-ms.txt', '822a95a50d2f50f0774a4990836958972451a1a388ec8896df95a26dad586a38'],
	['tmp/units/aggregate-successor-model-g4-generation-read-4.exit.txt', '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9'],
	['tmp/units/aggregate-successor-model-g4-generation-read-4.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-model-g4-generation-read-4.stdout.txt', '173c220c002ec10f887207533027406e7ab2ee3e51e841a674a2c7deda845cac'],
	['tmp/units/aggregate-successor-model-g4-generation-read-4.ts', 'dcc4c7692a0936add936eb015ca0f2d31a493734cfec565f974045acb4e5fdb3'],
	['tmp/units/aggregate-successor-model-g4-generation-read.stderr.txt', '7f69fd73567ed2c2fdaf4529eda6265ae3ae1e739cbeea8eda380885136e367f'],
	['tmp/units/aggregate-successor-model-g4-generation-read.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-model-g4-generation-read.ts', 'ecbfa5ae3fd489a18ea9f1fb951674d8a20905810ddb7633fc764617b9ca8e7e'],
	['tmp/units/aggregate-successor-model-g4-generation-reader-3-addendum.md', '051cef950e8f7137c0ca86ccfe1898152de0c4fc8b192633da8fb6a527102821'],
	['tmp/units/aggregate-successor-model-g4-generation-reader-4-addendum.md', '6e89949612fab931f06bd183220befd417e0462ae63dc8668589631e743b098d'],
	['tmp/units/aggregate-successor-model-g4-generation-report.md', '5b634d3ad80f90c26fc27bdeb97b0711fa1ce0db59a87281ed0b24ef5de97465'],
	['tmp/units/aggregate-successor-model-g4-operators.diff', '53a8eab1f59d4f5f1e9c101e2cab0cf3f719e828981602b2b27bd89516417c06'],
	['tmp/units/aggregate-successor-model-g4-plan.json', '0e091e45ed2d7ead59ee486565b1c702d96b7338190487a980fda3cd1de3bb22'],
	['tmp/units/aggregate-successor-model-run.ts', '2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb'],
	['tmp/units/aggregate-successor-quality-c-boundary.ts', '862283af3daa6bc9bbe53ad4e82babd4b91fd658a55d527dd15fab4e9b4c3e6e'],
	['tmp/units/aggregate-successor-quality-c-brief.md', 'fe3cbc75e6087fb7e58adf01a607a67f9b0e9b856b0525c72d764199e7e5bcf2'],
	['tmp/units/aggregate-successor-quality-c-join.ts', 'ce007761d3c8245648ec7571ccdcfac5d7757027062de0133314b6f03c5e887b'],
	['tmp/units/aggregate-successor-quality-cd-preparation-brief.md', '4dc6e17877fce14cd258926214303c33df49f48a35a268f15ee491098832ec05'],
	['tmp/units/aggregate-successor-quality-cd-preparation-report.md', '1ec23f7cd2a8ee9fc609824d08b193c2ea396ed1ce1619e5868544103b41a2c4'],
	['tmp/units/aggregate-successor-quality-cd-preparation.diff', 'd212d88a49513b6c44fa2446880bfadcf31d84376d5da92f4b73eea83fe43224'],
	['tmp/units/aggregate-successor-quality-d-boundary.ts', '86e0a6aee3d2244d0e3a6bf228db6ef74a47afb9102c12d92d5d1fcdd657806a'],
	['tmp/units/aggregate-successor-quality-d-brief.md', '3fdbc7a019002f233ed9f6dc763037af47dbf538b7e47913c855d4e78450b2b8'],
	['tmp/units/aggregate-successor-quality-d-join.ts', '74c5f376d5070fa40dd81c05b3ea0c9ffa2283460fc0c25563d825774805d461'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-g4-retain.ts [--verify]')
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
			'# l15 G4 generation and offline preparation custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed G4 execution custody and launcher/stage captures, generation brief/report, failed and corrected reader history, diagnosis, fixed plan/runner, label release script/receipt/opaque packet, preexisting label-b brief, c/d preparation files/evidence, and retention preparation are included by basename. No filename collision occurred. All completed originals remain intact.',
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
			'Reader-4 had no standalone diff file; the preparation report retains the complete actual reader-3 to reader-4 literal diff. No required released input was missing. Raw calibration and freezes remain in place for root staging. Active label-b labels/report/helper, future Q2/G2 output, live daemon artifacts, and external bench journals are excluded. Custody changes no accepted finding. Root owns any README.',
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
