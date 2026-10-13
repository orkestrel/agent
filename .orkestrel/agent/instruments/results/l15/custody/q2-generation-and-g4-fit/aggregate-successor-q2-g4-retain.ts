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
const EXPECTED_HEAD = '34cacc767afd55db97b611645c3e5e7e5c4ab3a2'
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/q2-generation-and-g4-fit'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-q2-g4-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-q2-g4-retain-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.err',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.err',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl.status-before.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.err',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-g4-adjudication-read.ts',
	'tmp/units/aggregate-successor-g4-adjudication.md',
	'tmp/units/aggregate-successor-g4-fit-brief.md',
	'tmp/units/aggregate-successor-g4-fit-launch-receipt.txt',
	'tmp/units/aggregate-successor-g4-fit-read.ts',
	'tmp/units/aggregate-successor-g4-fit-reader-adaptation.diff',
	'tmp/units/aggregate-successor-g4-fit-report.md',
	'tmp/units/aggregate-successor-g4-fit-validation-launch-receipt.txt',
	'tmp/units/aggregate-successor-g4-fit-validation.err',
	'tmp/units/aggregate-successor-g4-fit-validation.json',
	'tmp/units/aggregate-successor-g4-fit-validation.stdout.jsonl',
	'tmp/units/aggregate-successor-g4-fit-validation.stdout.jsonl.pid',
	'tmp/units/aggregate-successor-g4-labels.ts',
	'tmp/units/aggregate-successor-label-b-brief.md',
	'tmp/units/aggregate-successor-label-b-check.ts',
	'tmp/units/aggregate-successor-label-b-judgments.ts',
	'tmp/units/aggregate-successor-label-b-reader.ts',
	'tmp/units/aggregate-successor-label-b-report.md',
	'tmp/units/aggregate-successor-label-b-verifier-adaptation.diff',
	'tmp/units/aggregate-successor-label-b-verifier-attempt-0-execution.json',
	'tmp/units/aggregate-successor-label-b-verifier-attempt-0-stderr.txt',
	'tmp/units/aggregate-successor-label-b-verifier-attempt-0-stdout.txt',
	'tmp/units/aggregate-successor-label-b-verifier-brief.md',
	'tmp/units/aggregate-successor-label-b-verifier-check.ts',
	'tmp/units/aggregate-successor-label-b-verifier-execution.json',
	'tmp/units/aggregate-successor-label-b-verifier-reader.ts',
	'tmp/units/aggregate-successor-label-b-verifier-report.md',
	'tmp/units/aggregate-successor-label-b-verifier-stderr.txt',
	'tmp/units/aggregate-successor-label-b-verifier-stdout.txt',
	'tmp/units/aggregate-successor-label-b.json',
	'tmp/units/aggregate-successor-label-c-brief.md',
	'tmp/units/aggregate-successor-model-g2-generation-brief.md',
	'tmp/units/aggregate-successor-model-g2-generation-read.ts',
	'tmp/units/aggregate-successor-model-q2-execution-custody-after.json',
	'tmp/units/aggregate-successor-model-q2-execution-custody-before.json',
	'tmp/units/aggregate-successor-model-q2-execution-root.err',
	'tmp/units/aggregate-successor-model-q2-execution-root.jsonl',
	'tmp/units/aggregate-successor-model-q2-execution-root.jsonl.pid',
	'tmp/units/aggregate-successor-model-q2-execution-root.jsonl.status-after.txt',
	'tmp/units/aggregate-successor-model-q2-execution-root.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-model-q2-execution-sequence.jsonl',
	'tmp/units/aggregate-successor-model-q2-generation-brief.md',
	'tmp/units/aggregate-successor-model-q2-generation-process-closure.txt',
	'tmp/units/aggregate-successor-model-q2-generation-read-execution.json',
	'tmp/units/aggregate-successor-model-q2-generation-read.stderr.txt',
	'tmp/units/aggregate-successor-model-q2-generation-read.stdout.txt',
	'tmp/units/aggregate-successor-model-q2-generation-read.ts',
	'tmp/units/aggregate-successor-model-q2-generation-report.md',
	'tmp/units/aggregate-successor-model-q2-operators.diff',
	'tmp/units/aggregate-successor-model-q2-plan.json',
	'tmp/units/aggregate-successor-model-run.ts',
	'tmp/units/aggregate-successor-q2-g4-retention-preparation-brief.md',
	'tmp/units/aggregate-successor-q2-label-release.ts',
	'tmp/units/aggregate-successor-q2-label-seal.json',
	'tmp/units/aggregate-successor-q2-g4-retention-preparation-report.md',
	'tmp/units/aggregate-successor-q2-g4-retain.diff',
	SCRIPT_PATH,
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.err', '0f1778c5e49c873e5edd472603af485c254d5bf542f72a9f53b2dadb0dae6a9b'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl.pid', '09ebd0ce5dc2dfb2728e93d69ef19cacabfcc47c697ca5c9a15a6dcd882385f7'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl.status-after.txt', 'bc8aeff4275f6698b84c44fd1f330d88ba543acdf089923b23926f31ff546d4e'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-calibration-fit.jsonl.status-before.txt', '6d8364c10ffc7ced99a9d14be1a9f31b10cfc0c7a94bd5d9fadb90931a84a7b5'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.err', '21f51c4cae3bc071d1ebfbbc549f0cfa380913bd1857e21b7c189e5f84d8ccbf'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl.pid', '086e68cc81e0829c9627b9e0d7e8cf79721f0f12e5e25cda91aeea2a1219488c'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl.status-after.txt', '27b0d8f4e22efde39cffbae2d52a647a8023c662ef664376ec016f278d973044'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-corpus.jsonl.status-before.txt', 'ef91e47b25bc2eda31fa664056fa794be137a879cf657cdc4c874550faa0606b'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.err', '4c58b54112c5201ecbe2f075a3feaf56000394534286efd1f9f26458afb4d195'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl.pid', '61918860eb044155cfc048f1d1d67881f7a6bbf89caae6808d6dfd91c6a5e3f8'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl.status-after.txt', '6d8364c10ffc7ced99a9d14be1a9f31b10cfc0c7a94bd5d9fadb90931a84a7b5'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.jsonl.status-before.txt', '27b0d8f4e22efde39cffbae2d52a647a8023c662ef664376ec016f278d973044'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.err', '83527534d0e02e53ac6a0e2fd765396963f60f357dcdab6b37685d67c2d873b6'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl.pid', '99888e5186e3c7244f85b2cc9ebb7e67729de5e0871cb69ba3af26fb883c942e'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl.status-after.txt', '50e4d94b915626ba4bd100f69e6128b4f626d230d36c8e4ecda8c2907be13708'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.err', 'dd5ecb58e2bfa647ca535ef670baa0520a7377e31a02deefd1cad99e93dc69cf'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl.pid', 'd696fe68017d293d03123ba349cc697f9b99ab36c8fc4859dd9a188f5553fcae'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl.status-after.txt', 'ef91e47b25bc2eda31fa664056fa794be137a879cf657cdc4c874550faa0606b'],
	['.orkestrel/agent/instruments/results/l15/logs/q2-think1-freeze.jsonl.status-before.txt', '50e4d94b915626ba4bd100f69e6128b4f626d230d36c8e4ecda8c2907be13708'],
	['tmp/units/aggregate-successor-g4-adjudication-read.ts', '13f6a71cf535994d4832eef702af1efb5b5aa6a14f16d3a8243010eee1f74325'],
	['tmp/units/aggregate-successor-g4-adjudication.md', '10d2d47cdc2169c3cca5f92396ee2d289b7205434b51e047ed2502f4b52fa32c'],
	['tmp/units/aggregate-successor-g4-fit-brief.md', 'ecb3d3101fb8bcb487e8acc08aea62b9da18d8999f822e67ab3366a6928175be'],
	['tmp/units/aggregate-successor-g4-fit-launch-receipt.txt', '18ce5cd73d8877a7f3e891abcf838d8d8aa45a2550c58cc73416e0375a32882e'],
	['tmp/units/aggregate-successor-g4-fit-read.ts', '889e7d984e3e791f1da1f5589df265f019603ba74098180687cd2a5e57c8aaf3'],
	['tmp/units/aggregate-successor-g4-fit-reader-adaptation.diff', '98e3bab6d6f87069bd355cd3143f80dfc5b255ce7040af22f23698b77b8c0c9c'],
	['tmp/units/aggregate-successor-g4-fit-report.md', 'c4d3423174bf051ed68aff28e2c868d7e90d70e031f128d8f8e00f8de04247bf'],
	['tmp/units/aggregate-successor-g4-fit-validation-launch-receipt.txt', 'db510b47a73e7c414e9226102708b7d0ec0d823e4ea73f3a0dd665027e192115'],
	['tmp/units/aggregate-successor-g4-fit-validation.err', '1cb6d0cab6582fdcf9c27fa84de0a8b9f1cd6f3c878538c40ef256877616d3b8'],
	['tmp/units/aggregate-successor-g4-fit-validation.json', '09a7bf293c4f4145c08b7cc8ea3352ca2b2d85b077b8b2f62b23fbd706684715'],
	['tmp/units/aggregate-successor-g4-fit-validation.stdout.jsonl', '09a7bf293c4f4145c08b7cc8ea3352ca2b2d85b077b8b2f62b23fbd706684715'],
	['tmp/units/aggregate-successor-g4-fit-validation.stdout.jsonl.pid', '8e6f933104c4855f2d4157f6e14a397924187428ea6c7b80a9090ac1e1ff9370'],
	['tmp/units/aggregate-successor-g4-labels.ts', 'e204a775bfe088e1d8be94e7c1c93fa0c2aa0fa12fc71287a16dae7febde8bc5'],
	['tmp/units/aggregate-successor-label-b-brief.md', '566db010e4ff5729f1bdc1852fd2102a8262616099cdcc849a9a48680af76a5b'],
	['tmp/units/aggregate-successor-label-b-check.ts', 'd9ac83e4a241ffd3151feb936b5d90f2929217b5964b413a7c866bd47ab7b6da'],
	['tmp/units/aggregate-successor-label-b-judgments.ts', '3a9aa89f08198e9b218c6b12371520002593b7dd58393ec9b9d85f014c8fe8af'],
	['tmp/units/aggregate-successor-label-b-reader.ts', '1d2655a228c57f4020782aec27b5db456155b5635f20cd9b84093602b0b739ce'],
	['tmp/units/aggregate-successor-label-b-report.md', '59736ce8a0d487377b8b3f0fdb86a56403d608a4ee3a1a7cf2db5183644f5635'],
	['tmp/units/aggregate-successor-label-b-verifier-adaptation.diff', 'ff8b49cf8723c323f964bb00bfb5a628a1882e3c59e9b9e589de188db772ee2e'],
	['tmp/units/aggregate-successor-label-b-verifier-attempt-0-execution.json', '488bff11b9bf5c8a6fc61ec252d3715fc5cbfbe58129febd24555bf2d9987dde'],
	['tmp/units/aggregate-successor-label-b-verifier-attempt-0-stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-label-b-verifier-attempt-0-stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-label-b-verifier-brief.md', '7adde3ea81549e69a732418e06d588e4b629e9b485e4173a5bbeb83ca0433d7c'],
	['tmp/units/aggregate-successor-label-b-verifier-check.ts', '903d10999d138769bd9c58e0e2ce06f2957ae32b8f5e1533fb958c79e2c2254d'],
	['tmp/units/aggregate-successor-label-b-verifier-execution.json', '4947471e6604a900ec48d159bb85f3ed61374fcfd5d1a9e1741001c5b8849c68'],
	['tmp/units/aggregate-successor-label-b-verifier-reader.ts', '6a6a20333a98e026bd7beb0496e0156106ff965565a59da1d928cb3d36703eaf'],
	['tmp/units/aggregate-successor-label-b-verifier-report.md', 'df1a2ac75d330e200aecbac585937207864de8557f98fe7762cc85c75aeaaac8'],
	['tmp/units/aggregate-successor-label-b-verifier-stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-label-b-verifier-stdout.txt', 'e5d9a17deee3c99b3d78d516336f9ebc84d06351902df64093c7cbcc607b3d71'],
	['tmp/units/aggregate-successor-label-b.json', '51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf'],
	['tmp/units/aggregate-successor-label-c-brief.md', '6b240ca689c50cc3d620465e8b723bc037f24d09c4e4ef4aeab105a3455c6697'],
	['tmp/units/aggregate-successor-model-g2-generation-brief.md', 'a8905db71c40671c4e222eeb69c59a4952d2279b1cfb76a512e9f11990363b09'],
	['tmp/units/aggregate-successor-model-g2-generation-read.ts', '8b08996796bce9a7401f4b23ae8914815383160eacf4c0dd5e613fe37a3012b5'],
	['tmp/units/aggregate-successor-model-q2-execution-custody-after.json', '9d6f92756d31c26aa41adca33d348d96163630b8d146bdbea2bee7fcf5e11e72'],
	['tmp/units/aggregate-successor-model-q2-execution-custody-before.json', '9d6f92756d31c26aa41adca33d348d96163630b8d146bdbea2bee7fcf5e11e72'],
	['tmp/units/aggregate-successor-model-q2-execution-root.err', 'f4f5a5d3dbd1d23bab0cd9dfb16d7ba6446c50082d3936269c43d2c7291eed61'],
	['tmp/units/aggregate-successor-model-q2-execution-root.jsonl', '0e8dd10577c3fec73b92a0c529c074b7b3e56b96f43842029b059914fa2de4ef'],
	['tmp/units/aggregate-successor-model-q2-execution-root.jsonl.pid', 'b66c713ee2e479254527f3d7e58d3a345886b1fe4a089e9515379274f8f2760b'],
	['tmp/units/aggregate-successor-model-q2-execution-root.jsonl.status-after.txt', '6d8364c10ffc7ced99a9d14be1a9f31b10cfc0c7a94bd5d9fadb90931a84a7b5'],
	['tmp/units/aggregate-successor-model-q2-execution-root.jsonl.status-before.txt', 'f92404fe0e35a222e37545ebc558f58e24f064f456a644d88f4a51d06bb412d6'],
	['tmp/units/aggregate-successor-model-q2-execution-sequence.jsonl', '9b57624bf3b9b568ce281287066babeda710dcbfe82155cea86162cbf9608082'],
	['tmp/units/aggregate-successor-model-q2-generation-brief.md', '661bfa4ca26b05baeb83dd1617f92d6f0bc9f56f5561ae5c9cae6bdaf229d67c'],
	['tmp/units/aggregate-successor-model-q2-generation-process-closure.txt', 'c6de94f41645dac78faa1b630e1992975b86649104c39bfd644774d1843421f8'],
	['tmp/units/aggregate-successor-model-q2-generation-read-execution.json', '765811c08516603ef49df279ddc58a5a4f7934fb92760ffbfbc99e6577b2bae1'],
	['tmp/units/aggregate-successor-model-q2-generation-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-model-q2-generation-read.stdout.txt', 'd180e3350751660b5fcf6602ff8c49c0a3c0e90af992595cb036ca1b367e37fc'],
	['tmp/units/aggregate-successor-model-q2-generation-read.ts', '8825310f365954f17cebe08eb588a188dcbc6649f1fe35826557a909b6a5b6a8'],
	['tmp/units/aggregate-successor-model-q2-generation-report.md', '7a21e593767ccb9664fa13a52eb1ef5ac5ebda41091d42d30e46ad5479255519'],
	['tmp/units/aggregate-successor-model-q2-operators.diff', '1902c3d15fb46e1eb3ffab68a6e2a317473a6a632a3a20b73eb8d9f758adf2a7'],
	['tmp/units/aggregate-successor-model-q2-plan.json', '5cd2cb31ae98c6643cdb83d7253c7259cd3afcf1bf3670d70adce270377ec622'],
	['tmp/units/aggregate-successor-model-run.ts', '2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb'],
	['tmp/units/aggregate-successor-q2-g4-retention-preparation-brief.md', 'a6af525530ba33d5c93fdbbf2d2315980df74afcea13fa775468b43bb32e0896'],
	['tmp/units/aggregate-successor-q2-label-release.ts', 'ebad7d9edb42bfe7f2c12849c9f96cc2cf40d8c27d5bd8a77fd65262b850258b'],
	['tmp/units/aggregate-successor-q2-label-seal.json', '072fdcc428524789bf8feffdca39980de61c11c10b2052661a0443dd87e00181'],
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
			'# l15 Q2 generation and G4 fit custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed Q2 execution custody and launcher/stage captures, generation brief/report/reader and complete validation/process closure, plan/shared runner and label release script/receipt, preexisting label-c brief, closed independent alias-b labels/report/helpers and verifier history, G4 root adjudication/materializer and fixed fit/validation captures, prepared G2 reader/brief, and retention preparation are included by basename. No filename collision occurred. All completed originals remain intact.',
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
			'No required released input was missing. The unfinished G4 exploratory-route lookup is excluded pending root closure. Raw Q2 calibration/freezes and G4 labels/fit remain in place for root staging; previously committed G4 packet/generation evidence is not duplicated. Active alias-c labels/report/helper, future G2 output, live daemon artifacts, and external bench journals are excluded. Initial alias-b wrapper failure captures remain intact. Custody changes no accepted finding. Root owns any README.',
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
