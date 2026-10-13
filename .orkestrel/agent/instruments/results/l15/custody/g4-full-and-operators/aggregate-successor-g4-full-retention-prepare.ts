// Prepares accepted retention mechanics with closed-data substitutions; invokes no retainer runtime.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const DIRECTORY = 'C:/Users/mikes/WebstormProjects/scaffold'
const PREFIX = 'tmp/units/aggregate-successor-g4-full-retention'
const SOURCE = 'tmp/units/aggregate-successor-g2-fit-retain.ts'
const SCRIPT = `${PREFIX}-retain.ts`
const DIFF = `${PREFIX}.diff`
const CAPTURE = `${PREFIX}-capture.json`
const REPORT = `${PREFIX}-report.md`
const EXECUTION = `${PREFIX}-execution-report.md`
const ARCHIVE = '.orkestrel/agent/instruments/results/l15/custody/g4-full-and-operators'
const CUSTODY = '.orkestrel/agent/instruments/results/l15/custody'
const HEAD = 'b33dc98e13f589b0196b9f1aad9bd100306926f5'
if (resolve(process.cwd()) !== resolve(DIRECTORY)) throw new Error('Explicit scaffold cwd required')
for (const path of [SCRIPT, DIFF, CAPTURE, REPORT, EXECUTION, ARCHIVE]) if (existsSync(path)) throw new Error(`Owned destination occupied: ${path}`)
const sourceBytes = readFileSync(SOURCE)
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex')
if (sourceHash !== 'a7a9250461b037e451342261aeb03a0791adef1d132e3e041fb9f2c05272f656') throw new Error('Accepted retainer source seal differs')
const exact = [
	'aggregate-successor-g4-exploratory-prepare.ts', 'aggregate-successor-q2-exploratory-prepare.ts',
	'aggregate-successor-g4-exploratory-prepare-2.ts', 'aggregate-successor-q2-exploratory-prepare-2.ts',
	'aggregate-successor-g4-think0-aggregate-read-2.ts',
	'aggregate-successor-g4-exploratory-preparation-failure.md',
	'aggregate-successor-g4-exploratory-preparation-brief.md',
	'aggregate-successor-g4-exploratory-preparation-report.md',
	'aggregate-successor-continuous-commands-report.md',
]
const entries = readdirSync('tmp/units', { withFileTypes: true }).filter(entry =>
	/^aggregate-successor-(?:g4-think0-full-|g2-cell-preparation-|explore-cells-preparation-|exploratory-paths-)/u.test(entry.name) ||
	/^aggregate-successor-(?:g2-think[01]-(?:resource|full|pilot)-read\.ts|g4-think1-(?:stages-brief\.md|(?:resource|full|aggregate)-read\.ts)|q2-think[01]-(?:stages-brief\.md|(?:resource|full|aggregate)-read\.ts))$/u.test(entry.name) ||
	exact.includes(entry.name) || /^aggregate-successor-g4-exploratory-preparation-2\./u.test(entry.name),
)
for (const entry of entries) if (!entry.isFile()) throw new Error(`Closed candidate is not a regular file: ${entry.name}`)
const logs = readdirSync('.orkestrel/agent/instruments/results/l15/logs', { withFileTypes: true }).filter(entry => entry.name.startsWith('g4-think0-full'))
for (const entry of logs) if (!entry.isFile()) throw new Error(`Closed log is not a regular file: ${entry.name}`)
const candidates = [...entries.map(entry => `tmp/units/${entry.name}`), ...logs.map(entry => `.orkestrel/agent/instruments/results/l15/logs/${entry.name}`), 'tmp/cursor/aggregate-successor-continuous-commands-brief.md'].sort()
const required = [
	...exact.map(name => `tmp/units/${name}`),
	...['brief.md', 'read.ts', 'report.md', 'read.stdout.txt', 'read.stderr.txt'].map(suffix => `tmp/units/aggregate-successor-g4-think0-full-${suffix}`),
	'tmp/units/aggregate-successor-g2-cell-preparation-brief.md', 'tmp/units/aggregate-successor-g2-cell-preparation-report.md',
	...['brief.md', 'report.md', 'readers.diff', 'briefs.diff', 'capture.json', 'capture.ts'].map(suffix => `tmp/units/aggregate-successor-explore-cells-preparation-${suffix}`),
	'tmp/units/aggregate-successor-exploratory-paths-brief.md', 'tmp/units/aggregate-successor-exploratory-paths-report.md',
	...['g4-think1', 'q2-think0', 'q2-think1'].flatMap(cell => [`tmp/units/aggregate-successor-${cell}-stages-brief.md`, ...['resource', 'full', 'aggregate'].map(stage => `tmp/units/aggregate-successor-${cell}-${stage}-read.ts`)]),
	...['g2-think0', 'g2-think1'].flatMap(cell => ['resource', 'full', 'pilot'].map(stage => `tmp/units/aggregate-successor-${cell}-${stage}-read.ts`)),
	...['.err', '.jsonl', '.jsonl.pid', '.jsonl.status-before.txt', '.jsonl.status-after.txt'].map(suffix => `.orkestrel/agent/instruments/results/l15/logs/g4-think0-full${suffix}`),
	...['.err', '.jsonl', '.jsonl.pid', '.jsonl.status-before.txt', '.jsonl.status-after.txt'].map(suffix => `tmp/units/aggregate-successor-g4-exploratory-preparation-2${suffix}`),
	'tmp/cursor/aggregate-successor-continuous-commands-brief.md',
]
for (const path of required) if (!candidates.includes(path) || !existsSync(path)) throw new Error(`Required closed original absent: ${path}`)
for (const path of ['.orkestrel/agent/instruments/results/l15/logs/g4-think0-full.err', 'tmp/units/aggregate-successor-g4-exploratory-preparation-2.err']) {
	if (!/exit=0 signal=none capped=false duration_ms=\d+/u.test(readFileSync(path, 'utf8'))) throw new Error(`Closed terminal capture differs: ${path}`)
}
const archives = readdirSync(CUSTODY, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `${CUSTODY}/${entry.name}`)
const readings = candidates.map(path => {
	if (!lstatSync(path).isFile()) throw new Error(`Input is not a regular file: ${path}`)
	const bytes = readFileSync(path)
	return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
})
const duplicates: { readonly path: string; readonly retained: string; readonly bytes: number; readonly sha256: string }[] = []
const originals = readings.filter(reading => {
	for (const archive of archives) {
		const path = `${archive}/${basename(reading.path)}`
		if (!existsSync(path) || !lstatSync(path).isFile()) continue
		const bytes = readFileSync(path)
		if (bytes.length === reading.bytes && createHash('sha256').update(bytes).digest('hex') === reading.sha256) {
			duplicates.push({ ...reading, retained: path })
			return false
		}
	}
	return true
})
const preparation = [PREFIX + '-prepare.ts', SCRIPT, DIFF, CAPTURE, REPORT]
const paths = [...originals.map(original => original.path), ...preparation]
const names = new Set<string>()
for (const path of paths) {
	if (names.has(basename(path))) throw new Error(`Archive basename collision: ${path}`)
	names.add(basename(path))
}
const source = sourceBytes.toString('utf8')
const newline = source.includes('\r\n') ? '\r\n' : '\n'
let prepared = source.replaceAll('tmp/units/aggregate-successor-g2-fit-retain.ts', SCRIPT)
	.replace("const EXPECTED_HEAD = '4acb51125833e96aa771574ce248f49cc9ebddc0'", `const EXPECTED_HEAD = '${HEAD}'`)
	.replace("const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/g2-fit-and-g4-resource'", `const ARCHIVE_PATH = '${ARCHIVE}'`)
	.replace("const REPORT_PATH = 'tmp/units/aggregate-successor-g2-fit-retention-report.md'", `const REPORT_PATH = '${EXECUTION}'`)
	.replace(/const BASENAME_PATHS: readonly string\[\] = Object\.freeze\(\[.*?\]\)/su, `const BASENAME_PATHS: readonly string[] = Object.freeze([${newline}${paths.map(path => `\t'${path}',`).join(newline)}${newline}])`)
	.replace(/const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map\(\[.*?\]\)/su, `const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([${newline}${originals.map(reading => `\t['${reading.path}', '${reading.sha256}'],`).join(newline)}${newline}])`)
	.replace('# l15 G2 calibration and G4 resource custody retention', '# l15 G4 full-view and closed operator custody retention')
	.replace('Closed independent alias-d labels, original audit, fragment addendum, serializer/check helpers and verifier captures, G2 root adjudication/materializer, fit brief/preparation/readers/diff/report/launch and validation captures, accepted Q2 exploratory preparation and its failed predecessor, G4 resource brief/reader/report/captures, both closed stage log families, and this retention preparation are included by basename. No filename collision occurred. All completed originals remain intact.', 'Closed G4 full-view brief/reader/report/captures and stage logs, G2 cell preparation and copied resource/full/pilot readers, remaining exploratory-cell preparation and prospective briefs/readers, corrected exploratory operators and predicate evidence, failed preparation note and closed successor materialization captures, continuous-command Grok report/brief as reading evidence, and this retention preparation are included by basename unless identical bytes already have a retained custody reference. No filename collision occurred. All completed originals remain intact.')
	.replace('No required closed input was missing. Canonical G2 labels/review-labels, G2 fit outputs, and G4 resource outputs remain at their existing locations for root staging. The duplicate alias-d packet remains referenced at .orkestrel/agent/instruments/results/l15/calibration/g2/generation/packet.jsonl and is not copied. The active retention brief, live G4 full-stage evidence, daemon artifacts, unrelated history, and external bench journals are excluded. The failed exploratory preparation predecessor remains intact. Self/script/diff/preparation-report seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.', 'No required closed input was missing. Raw G4 full outputs, failed and corrected policy/execution/cache/run trees remain at their existing locations for root staging. Identical prior custody files and original G4/Q2 materializers use the retained references recorded in the preparation evidence; differing closed originals are retained here. The active retention brief, all live G4 aggregate evidence, active Opus evidence, Grok journal, daemon artifacts, and unrelated history are excluded. Failed preparation evidence remains intact. Self-dependent preparation artifact seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.')
if (prepared === source) throw new Error('Retainer data did not change')
for (const reading of readings) if (createHash('sha256').update(readFileSync(reading.path)).digest('hex') !== reading.sha256) throw new Error(`Closed input changed: ${reading.path}`)
if (!readFileSync(SOURCE).equals(sourceBytes)) throw new Error('Accepted template changed')
writeFileSync(SCRIPT, prepared, { flag: 'wx' })
const syntax = spawnSync(process.execPath, ['--check', SCRIPT], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true })
if (syntax.error !== undefined || syntax.status !== 0) throw new Error(`Syntax check failed: ${syntax.stdout}${syntax.stderr}`)
const diff = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', SOURCE, SCRIPT], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
if (diff.error !== undefined || diff.status !== 1) throw new Error(`Actual diff failed: ${diff.stdout}${diff.stderr}`)
writeFileSync(DIFF, diff.stdout, { flag: 'wx' })
if (existsSync(ARCHIVE) || existsSync(EXECUTION)) throw new Error('Archive or execution report appeared')
const scriptBytes = readFileSync(SCRIPT)
const scriptHash = createHash('sha256').update(scriptBytes).digest('hex')
const diffHash = createHash('sha256').update(readFileSync(DIFF)).digest('hex')
const bytes = originals.reduce((sum, original) => sum + original.bytes, 0)
const capture = { source: { path: SOURCE, bytes: sourceBytes.length, sha256: sourceHash }, script: { path: SCRIPT, bytes: scriptBytes.length, sha256: scriptHash }, diff: { path: DIFF, bytes: Buffer.byteLength(diff.stdout), sha256: diffHash, command: `git diff --no-index --no-ext-diff -- ${SOURCE} ${SCRIPT}`, exit: diff.status, stderr: diff.stderr }, syntax: { command: `node --check ${SCRIPT}`, exit: syntax.status, stdout: syntax.stdout, stderr: syntax.stderr }, originals, duplicates, preparation, totals: { candidates: readings.length, retained: originals.length, bytes, duplicates: duplicates.length, mapped: paths.length }, absent: [ARCHIVE, EXECUTION], expectedHead: HEAD }
writeFileSync(CAPTURE, `${JSON.stringify(capture, null, 2)}\n`, { flag: 'wx' })
const report = [
	'# G4 full-view and closed operator retention preparation', '',
	`Prepared the accepted retainer with ${originals.length} closed originals (${bytes} bytes), each pinned by directly measured SHA-256. The bounded population contains ${readings.length} candidates; ${duplicates.length} byte-identical originals use existing custody references. The map includes ${preparation.length} preparation artifacts whose self-dependent seals are measured by restoration at execution. Retention was not executed.`, '',
	`Accepted source: \`${SOURCE}\`, ${sourceBytes.length} bytes, SHA-256 \`${sourceHash}\`. Prepared retainer: \`${SCRIPT}\`, ${scriptBytes.length} bytes, SHA-256 \`${scriptHash}\`. Full actual diff: \`${DIFF}\`, ${Buffer.byteLength(diff.stdout)} bytes, SHA-256 \`${diffHash}\`.`, '',
	`The complete candidate inventory, original paths/bytes/seals, retained prior references, and bare syntax/diff results are recorded in \`${CAPTURE}:1\`. The fixed retainer arrays own the copy mappings. Identical previously archived evidence is omitted; originals that differ from prior copies remain in this inventory. The original G4/Q2 materializers use existing retained references where their bytes match.`, '',
	'Closed groups are G4 think0 full brief/reader/report/captures and full logs; G2 cell preparation/no-live captures and copied resource/full/pilot readers; remaining explore-cells preparation brief/report/diffs/capture/writer and prospective G4 think1/Q2 briefs/readers; exploratory-paths correction brief/report/reader/diffs/captures and successor G4/Q2 materializers; failed G4 preparation note and closed successor materialization captures; continuous-command Grok report and brief as reading evidence only.', '',
	`Changes are confined to header/usage, expected HEAD \`${HEAD}\`, archive/script/report literals, basename inventory, fixed seals, and generated report prose. Executable copy guards, restoration generation, create-only writes, attributes, byte/hash equality, Git custody implementation, archive census, and verify mode remain the accepted mechanism. See \`${SOURCE}:166\` and \`${SCRIPT}:1\`; root reviews the full literal diff.`, '',
	`From explicit scaffold cwd on Windows, \`node --check ${SCRIPT}\` exited 0 with empty stdout/stderr. The actual no-index diff exited 1 because the intended data differs, with empty stderr. Source template and every candidate remained equal on repeat reads before script generation.`, '',
	`Archive \`${ARCHIVE}\` and distinct execution report \`${EXECUTION}\` remain absent. The archive destination was not created. Root supplies execution acceptance on the brief's expected HEAD; this preparation performs no HEAD/index/status operation.`, '',
	'Excluded all live G4 aggregate reports/logs/captures and active Opus evidence; the continuous-command Grok journal; raw full and policy/execution/cache/run trees; the active retention brief; unrelated history and daemon material. Original full/exploration artifacts remain at their existing locations. No model/service operation, Git mutation, source/build/index/HEAD change, cleanup, or retainer runtime occurred. No required closed input was missing and no basename collision occurred. Root owns README, runtime, prose, and acceptance.', '',
	'Citation and complete diff inspection are recorded after preparation.', '',
].join('\n')
writeFileSync(REPORT, report, { flag: 'wx' })
process.stdout.write(`${JSON.stringify({ ...capture.totals, script: scriptHash, diff: diffHash, syntax: syntax.status, archive: existsSync(ARCHIVE), report: REPORT }, null, 2)}\n`)
