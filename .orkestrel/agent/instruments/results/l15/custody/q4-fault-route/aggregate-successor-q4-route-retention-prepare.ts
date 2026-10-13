// Prepares closed-route retention data only; invokes no retainer, model, materializer, or reader runtime.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const DIRECTORY = 'C:/Users/mikes/WebstormProjects/scaffold'
const PREFIX = 'tmp/units/aggregate-successor-q4-route-retention'
const SOURCE = 'tmp/units/aggregate-successor-g4-full-retention-retain.ts'
const SCRIPT = `${PREFIX}-retain.ts`
const DIFF = `${PREFIX}.diff`
const CAPTURE = `${PREFIX}-capture.json`
const REPORT = `${PREFIX}-report.md`
const EXECUTION = `${PREFIX}-execution-report.md`
const CUSTODY = '.orkestrel/agent/instruments/results/l15/custody'
const ARCHIVE = `${CUSTODY}/q4-fault-route`
const HEAD = 'b33dc98e13f589b0196b9f1aad9bd100306926f5'
const FIXED = Object.freeze([
	{ path: 'tmp/units/aggregate-successor-q4-fault-read-reader.ts', sha256: 'f22973171dfcfdf48230fe8d984b4b59d4fe392d0c66c1e8294c9384df0f633e' },
	{ path: 'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl', sha256: '0e6b65aa28f64f4ca72ba52ca17fd6199dbc34b1b6e80cf43a486abfed832aea' },
	{ path: 'tmp/units/aggregate-successor-q4-fault-read-stderr.txt', sha256: 'd80d13ade353cd69a603742fc186fb52f1f0b8bcd87f459ddf3906e82f261cb8' },
	{ path: 'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-before.txt', sha256: 'cfa8619ccc3a2e2885ecaab9cef80b7cfc13e89b9efb9f0cde74c250718ac82f' },
	{ path: 'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-after.txt', sha256: 'cfa8619ccc3a2e2885ecaab9cef80b7cfc13e89b9efb9f0cde74c250718ac82f' },
	{ path: 'tmp/units/aggregate-successor-q4-pilot-2-read.ts', sha256: '76677ad6f51671115fdfe326221d3e03b14da72b2eb5c043aa910a7843552724' },
	{ path: 'tmp/units/aggregate-successor-g4-think1-aggregate-read-2.ts', sha256: 'aa47b833c7e0e55fe57ce3cad4366cfbc13a052bddc824e0751b67c8caacdefc' },
])
if (resolve(process.cwd()) !== resolve(DIRECTORY)) throw new Error('Explicit scaffold cwd required')
for (const path of [SCRIPT, DIFF, CAPTURE, REPORT, EXECUTION, ARCHIVE]) if (existsSync(path)) throw new Error(`Owned destination occupied: ${path}`)
const sourceBytes = readFileSync(SOURCE)
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex')
if (sourceHash !== '173d80046c681fa2fa6266c4191d97dff6e45bf53386b54b9405b339b1e8a0bf') throw new Error('Accepted template changed')
const units = readdirSync('tmp/units', { withFileTypes: true }).filter(entry =>
	entry.name.startsWith('aggregate-successor-q4-fault-read') ||
	/^aggregate-successor-q4-pilot-2-(?:preparation-.*|command\.txt|read\.ts|reader\.diff|verifier-brief\.md)$/u.test(entry.name) ||
	entry.name === 'aggregate-successor-sustained-fault-direction-report.md' || entry.name === 'aggregate-successor-g4-think1-aggregate-read-2.ts',
)
const briefs = readdirSync('tmp/claude', { withFileTypes: true }).filter(entry => /^aggregate-successor-sustained-fault-direction-brief.*\.md$/u.test(entry.name))
for (const entry of [...units, ...briefs]) if (!entry.isFile()) throw new Error(`Closed candidate is not a regular file: ${entry.name}`)
const candidates = [...units.map(entry => `tmp/units/${entry.name}`), ...briefs.map(entry => `tmp/claude/${entry.name}`)].sort()
const required = [
	...FIXED.map(file => file.path),
	'tmp/units/aggregate-successor-q4-fault-read-brief.md', 'tmp/units/aggregate-successor-q4-fault-read-report.md',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.pid',
	...['preparation-brief.md', 'preparation-capture.json', 'preparation-capture.ts', 'preparation-report.md', 'command.txt', 'reader.diff', 'verifier-brief.md'].map(suffix => `tmp/units/aggregate-successor-q4-pilot-2-${suffix}`),
	'tmp/units/aggregate-successor-sustained-fault-direction-report.md',
	'tmp/claude/aggregate-successor-sustained-fault-direction-brief.md', 'tmp/claude/aggregate-successor-sustained-fault-direction-brief-2.md',
]
for (const path of required) if (!candidates.includes(path) || !existsSync(path)) throw new Error(`Required closed original missing: ${path}`)
const readings = candidates.map(path => {
	if (!lstatSync(path).isFile()) throw new Error(`Closed original is not a regular file: ${path}`)
	const bytes = readFileSync(path)
	return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
})
for (const expected of FIXED) {
	const reading = readings.find(reading => reading.path === expected.path)
	if (reading?.sha256 !== expected.sha256) throw new Error(`Fixed original changed: ${expected.path}; expected ${expected.sha256}; found ${reading?.sha256}`)
}
const archives = readdirSync(CUSTODY, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `${CUSTODY}/${entry.name}`)
const duplicates: { readonly path: string; readonly retained: string; readonly bytes: number; readonly sha256: string }[] = []
const originals = readings.filter(reading => {
	for (const archive of archives) {
		const retained = `${archive}/${basename(reading.path)}`
		if (!existsSync(retained) || !lstatSync(retained).isFile()) continue
		const bytes = readFileSync(retained)
		if (bytes.length === reading.bytes && createHash('sha256').update(bytes).digest('hex') === reading.sha256 && bytes.equals(readFileSync(reading.path))) {
			duplicates.push({ ...reading, retained })
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
const prepared = source.replaceAll('tmp/units/aggregate-successor-g4-full-retention-retain.ts', SCRIPT)
	.replace("const ARCHIVE_PATH = '.orkestrel/agent/instruments/results/l15/custody/g4-full-and-operators'", `const ARCHIVE_PATH = '${ARCHIVE}'`)
	.replace("const REPORT_PATH = 'tmp/units/aggregate-successor-g4-full-retention-execution-report.md'", `const REPORT_PATH = '${EXECUTION}'`)
	.replace(/const BASENAME_PATHS: readonly string\[\] = Object\.freeze\(\[.*?\]\)/su, `const BASENAME_PATHS: readonly string[] = Object.freeze([${newline}${paths.map(path => `\t'${path}',`).join(newline)}${newline}])`)
	.replace(/const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map\(\[.*?\]\)/su, `const EXPECTED_SEALS: ReadonlyMap<string, string> = new Map([${newline}${originals.map(reading => `\t['${reading.path}', '${reading.sha256}'],`).join(newline)}${newline}])`)
	.replace('# l15 G4 full-view and closed operator custody retention', '# l15 Closed Q4 fault-route custody retention')
	.replace('Closed G4 full-view brief/reader/report/captures and stage logs, G2 cell preparation and copied resource/full/pilot readers, remaining exploratory-cell preparation and prospective briefs/readers, corrected exploratory operators and predicate evidence, failed preparation note and closed successor materialization captures, continuous-command Grok report/brief as reading evidence, and this retention preparation are included by basename unless identical bytes already have a retained custody reference. No filename collision occurred. All completed originals remain intact.', 'Closed Q4 native fault probe brief/reader/report/complete captures, pilot-2 preparation command/brief/reader/diff/report/capture/writer, completed Opus proposal and both closed briefs as reading evidence, the late G4 think1 reader, and this retention preparation are included by basename unless identical bytes already have a retained custody reference. No filename collision occurred. All completed originals remain intact.')
	.replace('No required closed input was missing. Raw G4 full outputs, failed and corrected policy/execution/cache/run trees remain at their existing locations for root staging. Identical prior custody files and original G4/Q2 materializers use the retained references recorded in the preparation evidence; differing closed originals are retained here. The active retention brief, all live G4 aggregate evidence, active Opus evidence, Grok journal, daemon artifacts, and unrelated history are excluded. Failed preparation evidence remains intact. Self-dependent preparation artifact seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.', 'No required closed input was missing. Original Q4 pilot and blind quality artifacts remain at their existing locations. The bounded root ruling remains at its canonical tracked report path. Identical prior custody files use the retained references recorded in the preparation evidence; differing closed originals are retained here. The active retention brief, prospective pilot-2 execution reports/logs, all live Gemma evidence, external bench journals/error streams, authentication artifacts, and unrelated history are excluded. Opus proposal and brief bytes are preserved as reading evidence only; the root ruling owns policy and source acceptance. Self-dependent preparation artifact seals are bound in restoration at execution. Custody changes no accepted finding. Root owns any README.')
if (prepared === source || !prepared.includes(`const EXPECTED_HEAD = '${HEAD}'`)) throw new Error('Data substitution or fixed runtime HEAD differs')
for (const reading of readings) if (createHash('sha256').update(readFileSync(reading.path)).digest('hex') !== reading.sha256) throw new Error(`Closed original changed during preparation: ${reading.path}`)
if (!readFileSync(SOURCE).equals(sourceBytes)) throw new Error('Accepted template changed during preparation')
writeFileSync(SCRIPT, prepared, { flag: 'wx' })
const syntax = spawnSync(process.execPath, ['--check', SCRIPT], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true })
if (syntax.status !== 0 || syntax.error !== undefined) throw new Error(`Syntax failed: ${syntax.stdout}${syntax.stderr}`)
const difference = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', SOURCE, SCRIPT], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
if (difference.status !== 1 || difference.error !== undefined) throw new Error(`Actual diff failed: ${difference.stdout}${difference.stderr}`)
writeFileSync(DIFF, difference.stdout, { flag: 'wx' })
if (existsSync(ARCHIVE) || existsSync(EXECUTION)) throw new Error('Prospective custody destination appeared')
const scriptBytes = readFileSync(SCRIPT)
const scriptHash = createHash('sha256').update(scriptBytes).digest('hex')
const diffHash = createHash('sha256').update(readFileSync(DIFF)).digest('hex')
const bytes = originals.reduce((sum, original) => sum + original.bytes, 0)
const capture = { source: { path: SOURCE, bytes: sourceBytes.length, sha256: sourceHash }, script: { path: SCRIPT, bytes: scriptBytes.length, sha256: scriptHash }, diff: { path: DIFF, bytes: Buffer.byteLength(difference.stdout), sha256: diffHash, command: `git diff --no-index --no-ext-diff -- ${SOURCE} ${SCRIPT}`, exit: difference.status, stderr: difference.stderr }, syntax: { command: `node --check ${SCRIPT}`, exit: syntax.status, stdout: syntax.stdout, stderr: syntax.stderr }, fixed: FIXED, originals, duplicates, preparation, totals: { candidates: readings.length, retained: originals.length, bytes, duplicates: duplicates.length, mapped: paths.length }, absent: [ARCHIVE, EXECUTION], expectedHead: HEAD, exclusions: ['Launched route-retention brief', 'Prospective pilot-2 execution report and stage logs', 'Live Gemma evidence', 'External bench journal/error/authentication material', 'Canonical root ruling and original raw Q4 evidence', 'Unrelated temporary history'] }
writeFileSync(CAPTURE, `${JSON.stringify(capture, null, 2)}\n`, { flag: 'wx' })
const report = [
	'# Closed Q4 fault-route retention preparation', '',
	`Prepared the accepted retainer with ${originals.length} directly measured closed originals (${bytes} bytes), each pinned in its fixed SHA-256 map. The bounded inventory measured ${readings.length} candidates and found ${duplicates.length} byte-identical prior references. Its mappings also include ${preparation.length} preparation artifacts whose self-dependent seals are measured by restoration at execution. Retention and verification mode were not executed.`, '',
	`Accepted template: \`${SOURCE}\`, ${sourceBytes.length} bytes, SHA-256 \`${sourceHash}\`. Prepared script: \`${SCRIPT}\`, ${scriptBytes.length} bytes, SHA-256 \`${scriptHash}\`. Complete actual diff: \`${DIFF}\`, ${Buffer.byteLength(difference.stdout)} bytes, SHA-256 \`${diffHash}\`.`, '',
	`The exact inventory, bytes/hashes, fixed report-derived seals, prior-reference comparisons, and bare syntax/diff receipts are recorded in \`${CAPTURE}:1\`. The retainer/restoration mechanism owns original-path and archive-basename mappings, preserving the original relative imports and citations without rewriting evidence.`, '',
	'Closed evidence contains the native Q4 fault read brief/reader/report/helper and complete stdout/stderr/PID/status captures; pilot-2 preparation brief, checked verifier brief, command, literal reader/diff, report, capture, and writer; the completed Opus fault-direction proposal and both closed briefs as reading evidence; and the late G4 think1 aggregate reader. The completed reports were read to identify exact native capture/reader paths. No bench journal, error stream, or authentication material enters the inventory.', '',
	`Changes are confined to header/usage, data/seal arrays, archive/script/report literals, and generated report prose. Expected runtime HEAD stays \`${HEAD}\`. Copy guards, attributes, restoration, create-only writes, byte/hash equality, custody implementation, archive census, and verify mode preserve the accepted mechanism. See \`${SOURCE}:1\` and \`${SCRIPT}:1\`; root reviews the full actual diff.`, '',
	`From explicit scaffold cwd on Windows, \`node --check ${SCRIPT}\` exited 0 with empty stdout/stderr. Actual no-index comparison exited 1 for the intended data difference with empty stderr. Every closed candidate and the template remained sealed on repeat reads. No source/build/HEAD/index/status or service operation was performed.`, '',
	`Prospective archive \`${ARCHIVE}\` and distinct execution report \`${EXECUTION}\` remain absent. Preparation did not create the archive. The active model stage and both services, including PID32104, remain untouched.`, '',
	'Excluded the launched route-retention brief, every prospective pilot-2 execution report/log, all live Gemma artifacts, external Opus journals/error streams/authentication artifacts, raw original Q4 evidence, the canonical tracked root ruling, and unrelated temporary files. Original artifacts remain intact. No required original was missing or mismatched, no basename collision occurred, and no nonliteral mechanism edit was needed. Root owns README, runtime, policy, Git, and acceptance.', '',
	'Complete diff inspection and citation results are recorded after preparation.', '',
].join('\n')
writeFileSync(REPORT, report, { flag: 'wx' })
process.stdout.write(`${JSON.stringify({ ...capture.totals, script: scriptHash, diff: diffHash, syntax: syntax.status, archive: existsSync(ARCHIVE), report: REPORT }, null, 2)}\n`)
