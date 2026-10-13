/**
 * Usage: node tmp/units/aggregate-successor-g4-full-retention-retain.ts [--verify]
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
const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/g4-full-and-operators'
const SCRIPT_PATH = 'tmp/units/aggregate-successor-g4-full-retention-retain.ts'
const REPORT_PATH = 'tmp/units/aggregate-successor-g4-full-retention-execution-report.md'
const ATTRIBUTES_TEXT = '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n'
const FIXED_MAPPINGS: readonly Mapping[] = Object.freeze([])
const BASENAME_PATHS: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.err',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl.pid',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl.status-after.txt',
	'.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl.status-before.txt',
	'tmp/cursor/aggregate-successor-continuous-commands-brief.md',
	'tmp/units/aggregate-successor-continuous-commands-report.md',
	'tmp/units/aggregate-successor-exploratory-paths-aggregate-reader.diff',
	'tmp/units/aggregate-successor-exploratory-paths-brief.md',
	'tmp/units/aggregate-successor-exploratory-paths-capture.json',
	'tmp/units/aggregate-successor-exploratory-paths-diff.ts',
	'tmp/units/aggregate-successor-exploratory-paths-g4.diff',
	'tmp/units/aggregate-successor-exploratory-paths-q2.diff',
	'tmp/units/aggregate-successor-exploratory-paths-read.stderr.txt',
	'tmp/units/aggregate-successor-exploratory-paths-read.stdout.jsonl',
	'tmp/units/aggregate-successor-exploratory-paths-read.stdout.jsonl.pid',
	'tmp/units/aggregate-successor-exploratory-paths-read.ts',
	'tmp/units/aggregate-successor-exploratory-paths-report.md',
	'tmp/units/aggregate-successor-exploratory-paths-syntax.json',
	'tmp/units/aggregate-successor-explore-cells-preparation-brief.md',
	'tmp/units/aggregate-successor-explore-cells-preparation-briefs.diff',
	'tmp/units/aggregate-successor-explore-cells-preparation-capture.json',
	'tmp/units/aggregate-successor-explore-cells-preparation-capture.ts',
	'tmp/units/aggregate-successor-explore-cells-preparation-readers.diff',
	'tmp/units/aggregate-successor-explore-cells-preparation-report.md',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-full-read-check.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-full-read-check.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-full-read-check.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-pilot-read-check.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-pilot-read-check.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-pilot-read-check.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-resource-read-check.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-resource-read-check.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-resource-read-check.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-full-read-check.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-full-read-check.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-full-read-check.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-pilot-read-check.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-pilot-read-check.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-pilot-read-check.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-resource-read-check.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-resource-read-check.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-resource-read-check.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-brief.md',
	'tmp/units/aggregate-successor-g2-cell-preparation-cite.duration-ms.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-cite.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-cite.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-cite.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.duration-ms.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.duration-ms.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.exit.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.stderr.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.stdout.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-literal-diff.txt',
	'tmp/units/aggregate-successor-g2-cell-preparation-report.md',
	'tmp/units/aggregate-successor-g2-think0-full-read.ts',
	'tmp/units/aggregate-successor-g2-think0-pilot-read.ts',
	'tmp/units/aggregate-successor-g2-think0-resource-read.ts',
	'tmp/units/aggregate-successor-g2-think1-full-read.ts',
	'tmp/units/aggregate-successor-g2-think1-pilot-read.ts',
	'tmp/units/aggregate-successor-g2-think1-resource-read.ts',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-2.err',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl.pid',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl.status-after.txt',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-g4-exploratory-preparation-failure.md',
	'tmp/units/aggregate-successor-g4-exploratory-prepare-2.ts',
	'tmp/units/aggregate-successor-g4-think0-aggregate-read-2.ts',
	'tmp/units/aggregate-successor-g4-think0-full-brief.md',
	'tmp/units/aggregate-successor-g4-think0-full-read.stderr.txt',
	'tmp/units/aggregate-successor-g4-think0-full-read.stdout.txt',
	'tmp/units/aggregate-successor-g4-think0-full-read.ts',
	'tmp/units/aggregate-successor-g4-think0-full-report.md',
	'tmp/units/aggregate-successor-g4-think1-aggregate-read.ts',
	'tmp/units/aggregate-successor-g4-think1-full-read.ts',
	'tmp/units/aggregate-successor-g4-think1-resource-read.ts',
	'tmp/units/aggregate-successor-g4-think1-stages-brief.md',
	'tmp/units/aggregate-successor-q2-exploratory-prepare-2.ts',
	'tmp/units/aggregate-successor-q2-think0-aggregate-read.ts',
	'tmp/units/aggregate-successor-q2-think0-full-read.ts',
	'tmp/units/aggregate-successor-q2-think0-resource-read.ts',
	'tmp/units/aggregate-successor-q2-think0-stages-brief.md',
	'tmp/units/aggregate-successor-q2-think1-aggregate-read.ts',
	'tmp/units/aggregate-successor-q2-think1-full-read.ts',
	'tmp/units/aggregate-successor-q2-think1-resource-read.ts',
	'tmp/units/aggregate-successor-q2-think1-stages-brief.md',
	'tmp/units/aggregate-successor-g4-full-retention-prepare.ts',
	'tmp/units/aggregate-successor-g4-full-retention-retain.ts',
	'tmp/units/aggregate-successor-g4-full-retention.diff',
	'tmp/units/aggregate-successor-g4-full-retention-capture.json',
	'tmp/units/aggregate-successor-g4-full-retention-report.md',
])
const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.err', 'aabdd8c31bda65a9662e206a706aedff0e87bbddc1e61837273f5d47e12a3e0f'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl', 'b9f07a172cde1a6885fe4a1f99e6c2b5b988dcdb704477a9c390ae7063555db6'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl.pid', '90949c30ad431aa219d28b4a00be09b4a612027a6734476c9c4bf6f03db6581f'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl.status-after.txt', 'b2ee1a67a3a21f81a60ba6f23a0f7c2b74f9dd111046b9b955076951d1dde2ea'],
	['.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.jsonl.status-before.txt', '204e74dde3b81615cc3ab8072366a61698977db16078b5bbc371e65e1620bc2f'],
	['tmp/cursor/aggregate-successor-continuous-commands-brief.md', '4477ccb249e26e402c2eb41790721cba3a3ca0ddf78b1f5c2b291ec1a4d8f6d9'],
	['tmp/units/aggregate-successor-continuous-commands-report.md', 'b722ba93b0e4f173bab27cbaa52cde927c39e34897334590fa95e034ea411701'],
	['tmp/units/aggregate-successor-exploratory-paths-aggregate-reader.diff', 'f5e32e8484da5a24f85ba486aa7e7465ff07fc97e57ec4e866e92be42371475e'],
	['tmp/units/aggregate-successor-exploratory-paths-brief.md', 'cf8c133da045b68c66c49c337090404bf8cbc94db6bd32763c0f39a291ed6f5d'],
	['tmp/units/aggregate-successor-exploratory-paths-capture.json', '765368ba2eac94c1c61f5d7dba91d61184bc1a1d1a669c895f00680add5d48f7'],
	['tmp/units/aggregate-successor-exploratory-paths-diff.ts', '9803ee02a40bcf016f4c0d7b993243ba9ce975402d876d34489f63c7dd704550'],
	['tmp/units/aggregate-successor-exploratory-paths-g4.diff', 'ee5b91d15ed12ae79f20780cd4e59947efbd36be137b1aa95da7b251607d5e73'],
	['tmp/units/aggregate-successor-exploratory-paths-q2.diff', '5c34dae99baa53f684c71b81071a611ad004ee888bed431ef693e69b637dffd5'],
	['tmp/units/aggregate-successor-exploratory-paths-read.stderr.txt', 'feb0ec57964abec836fdecc0dce06648f23458e5505c5e61261e528aa8699288'],
	['tmp/units/aggregate-successor-exploratory-paths-read.stdout.jsonl', '4172aa645659e26f2e2f43df97d41fa8a15b39a28b335265a7f4d72b5d4bd5d9'],
	['tmp/units/aggregate-successor-exploratory-paths-read.stdout.jsonl.pid', '70b7571ff928a89b1e7ee4726c96799951e3340394361f590c938e9ebce120d6'],
	['tmp/units/aggregate-successor-exploratory-paths-read.ts', '69b4fd97b94a21f83914150389377c4b95818deba1c4cecc595d5dc560943150'],
	['tmp/units/aggregate-successor-exploratory-paths-report.md', '68890475cf88cd1b64c5a6319fb5e29638cae09d9af2fe876e413e354ffa5cf9'],
	['tmp/units/aggregate-successor-exploratory-paths-syntax.json', 'bfb4e08cac19de4a44062f3864c6d84eaf68c6fbe4d6264fda9f51556388fddc'],
	['tmp/units/aggregate-successor-explore-cells-preparation-brief.md', '4497b6da4a85c02c47cf611521fadcda5dbfe78e2f316dc38447f8175a63c35f'],
	['tmp/units/aggregate-successor-explore-cells-preparation-briefs.diff', '4b0eff4ee680d49be79af47ea9295702779c6e63f3ec17f343c405d5a0f189de'],
	['tmp/units/aggregate-successor-explore-cells-preparation-capture.json', '7382f2a3de1da9fe14ca1f7a735ca37acc80d8e1b75f2890efeb4b10e28e40a6'],
	['tmp/units/aggregate-successor-explore-cells-preparation-capture.ts', 'aa60f89bf2d33cc65b2f35bbb59f63f7ea75e5c1a598330e4a872a01df9ff255'],
	['tmp/units/aggregate-successor-explore-cells-preparation-readers.diff', '66cc33d7b6f6fff5d1af8569bae9c7c0871ad7ac183b3d84acff7ca00c5c438d'],
	['tmp/units/aggregate-successor-explore-cells-preparation-report.md', '9f33d6d8cc374dad7ce287e1f3b92380f0d5272a126dde1a1922a80eed243a3f'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-full-read-check.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-full-read-check.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-full-read-check.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-pilot-read-check.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-pilot-read-check.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-pilot-read-check.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-resource-read-check.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-resource-read-check.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think0-resource-read-check.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-full-read-check.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-full-read-check.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-full-read-check.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-pilot-read-check.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-pilot-read-check.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-pilot-read-check.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-resource-read-check.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-resource-read-check.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-aggregate-successor-g2-think1-resource-read-check.stdout.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-brief.md', '63d1c9abc2e822b5be502f3005950c22c0cc6e76aaec0ae6e629ce7b0aa43a2d'],
	['tmp/units/aggregate-successor-g2-cell-preparation-cite.duration-ms.txt', '89e56b272669de11431602f3c77e560ecf6c61512fa8db5ac0006606e88d5282'],
	['tmp/units/aggregate-successor-g2-cell-preparation-cite.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-cite.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-cite.stdout.txt', 'b06d881c643d1928006aeebabac309e66b4b98ca8bee92e7174de8a45e1ce72b'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.duration-ms.txt', 'afd03f6a4095ef50d155cbc4e12b0f02152e0f76597903900ba89dba557ad488'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think0.stdout.txt', '7b06a1ac90f806ca312f30c0ce1821a3ae7b715546ce9a32d7997983cced7e87'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.duration-ms.txt', 'd26d4fe0060b8fd9c2312c80ee01b8271038645e0339b082ec24bbb9390c5c6a'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.exit.txt', '9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g2-cell-preparation-g2-think1.stdout.txt', '2a3fe7678751e037902fb588c77c08f54671499cc5839c42485032feaab0b075'],
	['tmp/units/aggregate-successor-g2-cell-preparation-literal-diff.txt', 'f96c19b793011fed89bd2f1ef7d0c3db2c09679ef764fad71d75ce63697fe1d9'],
	['tmp/units/aggregate-successor-g2-cell-preparation-report.md', 'fe10cb63752ebaa9cce97d8073f305ecddec33b6c1d790e4500e10ed53f564e5'],
	['tmp/units/aggregate-successor-g2-think0-full-read.ts', 'df6302078eba40e788308f8c458ec2610db3e85eb0c4c550d21fd97f1843049a'],
	['tmp/units/aggregate-successor-g2-think0-pilot-read.ts', 'f3240c1ef8159a520e8242cff75e26236c359d3f6508d2f57c9cd26a4ecba511'],
	['tmp/units/aggregate-successor-g2-think0-resource-read.ts', '565ea9bdfc8381eba837ab2391e5ebb20ddfb95c9ab78eb3cb0a93d89370508a'],
	['tmp/units/aggregate-successor-g2-think1-full-read.ts', 'b8ef582a96fd24e0e7411cf66c5784e6353e843994ffbc3bee403efa55c4e735'],
	['tmp/units/aggregate-successor-g2-think1-pilot-read.ts', '405c97e14ec6ef777c529c1169c2d0c9edc4d845ff88425ad3a3d87b803de0e5'],
	['tmp/units/aggregate-successor-g2-think1-resource-read.ts', 'b4b9231ba99a18766d162eb573c36c7309c06a52f570e0b9b04cb7ac6852e21b'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-2.err', 'bdc045a537cf39109711d9f7e5ae9a0417727053ae1e4e04a626441645896a40'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl', '8d5e6ba95294e9059886dc9075fb61f092629397bb4e1a9f3a329c1e08adafd2'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl.pid', '8ec41b05adcfbd7a15c15a28e3c2da4d31830938f8299883aa75c9c74ba32dc3'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl.status-after.txt', '94764bae2c044efdf53dce538d03fba213c0006e9f6c8513ac475277794d1672'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-2.jsonl.status-before.txt', 'a2f540903d8c2cdce1d0a5478ad562c2a7504452fa79650edfb858df3bbecc30'],
	['tmp/units/aggregate-successor-g4-exploratory-preparation-failure.md', 'c080c9b47a930a770f3a569f2e1992614073afef4bd6a244a295cfdd548785ca'],
	['tmp/units/aggregate-successor-g4-exploratory-prepare-2.ts', '4df8f2ca81aad37209c327b7dfa05576bbf65dff3d80025d9f759781a9d7e4e2'],
	['tmp/units/aggregate-successor-g4-think0-aggregate-read-2.ts', 'd9c6cd3e564a81f97e6a92777af3b39fa22cdb15b49080aba4b99f011d03cff7'],
	['tmp/units/aggregate-successor-g4-think0-full-brief.md', '23e71b8631b93d91983972adb3301c9f96052397b6041e0b9ed0164c1db061f6'],
	['tmp/units/aggregate-successor-g4-think0-full-read.stderr.txt', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
	['tmp/units/aggregate-successor-g4-think0-full-read.stdout.txt', '081d2c3f61be65d6cf3f7e4b063d54db7c54138e70ac878f894a4cd297af2c89'],
	['tmp/units/aggregate-successor-g4-think0-full-read.ts', '8bdbd43cc29232e64e179843bc8f0b6999e7dbacfc6f5e3c2be77208fb4ee909'],
	['tmp/units/aggregate-successor-g4-think0-full-report.md', '646fbf691f654579b97f8a32ca865e66a14edd2f27d20f3361971fa77c3b88d5'],
	['tmp/units/aggregate-successor-g4-think1-aggregate-read.ts', '78d842e83a953b90e53a276d1440b7ab0544727c7484b1322e56b9cd08db845c'],
	['tmp/units/aggregate-successor-g4-think1-full-read.ts', '32428508fdc4d4618b270fef661449ae31cf0565aae82684008f8f81632d1a0f'],
	['tmp/units/aggregate-successor-g4-think1-resource-read.ts', 'cca90072b9aa4b5506cd52f53417a5e2b6c33c59ab610df3188dd8bf02464840'],
	['tmp/units/aggregate-successor-g4-think1-stages-brief.md', '26b1901b75d1ee4c4b4cef9c70a70a2f3cbd9fa84ca12de786a10af587365ca3'],
	['tmp/units/aggregate-successor-q2-exploratory-prepare-2.ts', '96bba9c75fb37eb2017bdfb0334e26a328c7050b15f7c0dbe5d25db6af1056d6'],
	['tmp/units/aggregate-successor-q2-think0-aggregate-read.ts', 'ed0627364976fab186de26bd08202a67f2640ad37ff6a3ea2590d8000de93354'],
	['tmp/units/aggregate-successor-q2-think0-full-read.ts', '7ef65d4ee3237553ed6245267dc71895995c2a5633f3ad977d242c08467cf0af'],
	['tmp/units/aggregate-successor-q2-think0-resource-read.ts', '43476171cd751d97483f1dd22123d4f7860813df665b198fb33b445fd36cf349'],
	['tmp/units/aggregate-successor-q2-think0-stages-brief.md', 'a3d2df5fb7965788d6da8efcabda42e071c13b59dc0d5ad47c4846fbf214ab94'],
	['tmp/units/aggregate-successor-q2-think1-aggregate-read.ts', 'c985b26ab3bd15dc7afedb648b21518e1dd9544a029fb413f146af2b63c26c52'],
	['tmp/units/aggregate-successor-q2-think1-full-read.ts', 'b3468bdd13aae071061fe148faedb933d92e076c7bcf3cdf06cb1ab3ff1edee4'],
	['tmp/units/aggregate-successor-q2-think1-resource-read.ts', '9242f2735232d8a3a42d13afa9ab08c5605b19b9b863cb0efa698d0d969ee732'],
	['tmp/units/aggregate-successor-q2-think1-stages-brief.md', 'd8f0941a4412fee92404c165cd65764bf39d34721378886dca689aa98b93975f'],
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
		throw new Error('Usage: node tmp/units/aggregate-successor-g4-full-retention-retain.ts [--verify]')
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
			'# l15 G4 full-view and closed operator custody retention',
			'',
			`The custody run retained ${readings.length} original files (${bytes} bytes) with complete byte and SHA-256 equality. All ${EXPECTED_SEALS.size} expected seals matched before copying and remained equal afterward.`,
			'',
			`The archive owns ${owned} files (${total} bytes), including the generated attributes and restoration manifest. Archive directory: \`${ARCHIVE_PATH}\`. Root owns any README.`,
			'',
			`Restoration SHA-256: \`${restorationHash}\`; manifest size: ${restoration.length} bytes. The manifest records original path, archive-relative path, bytes, and SHA-256 for every copy, including this custody script.`,
			'',
			`HEAD before and after: \`${EXPECTED_HEAD}\`. Tracked working paths and staged paths were unchanged. The create operation took ${durationMs} ms. This unit wrote only the archive files and its temporary script/report. It performed no source, build, model, Git mutation, cleanup, judgment, or qualification operation. No external bench journal, daemon material, or secrets were collected.`,
			'',
			'Closed G4 full-view brief/reader/report/captures and stage logs, G2 cell preparation and copied resource/full/pilot readers, remaining exploratory-cell preparation and prospective briefs/readers, corrected exploratory operators and predicate evidence, failed preparation note and closed successor materialization captures, continuous-command Grok report/brief as reading evidence, and this retention preparation are included by basename unless identical bytes already have a retained custody reference. No filename collision occurred. All completed originals remain intact.',
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
			'No required closed input was missing. Raw G4 full outputs, failed and corrected policy/execution/cache/run trees remain at their existing locations for root staging. Identical prior custody files and original G4/Q2 materializers use the retained references recorded in the preparation evidence; differing closed originals are retained here. The active retention brief, all live G4 aggregate evidence, active Opus evidence, Grok journal, daemon artifacts, and unrelated history are excluded. Failed preparation evidence remains intact. Self-dependent preparation artifact seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.',
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
