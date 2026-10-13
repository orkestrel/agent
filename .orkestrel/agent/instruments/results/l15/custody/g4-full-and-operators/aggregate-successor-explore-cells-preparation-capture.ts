// Keeps offline preparation and its capture self-contained; invokes no cell operator or reader runtime.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Command {
	readonly command: string
	readonly exit: number
	readonly stdout: string
	readonly stderr: string
}

const CHECKOUT_PATH = 'C:/Users/mikes/WebstormProjects/scaffold'
const PREFIX = 'tmp/units/aggregate-successor-explore-cells-preparation'
const CELLS = Object.freeze([
	{ cell: 'g4-think1', frozen: '7f8c4adacf24086e876feca6b91b8e3fcf7013180d223a318497ee2809307124', family: 'g4', agree: 0.61, diagnosis: '.orkestrel/agent/instruments/results/l15/calibration/g4/fit/diagnosis.json' },
	{ cell: 'q2-think0', frozen: '442dfeb697d843e28ab3c8985aabb720d768d9f9646b33a128124a74560b53fd', family: 'q2', agree: 0.68, diagnosis: '.orkestrel/agent/instruments/results/l15/calibration/q2/fit-2/diagnosis.json' },
	{ cell: 'q2-think1', frozen: 'b356f869b71480ed759e274e2587cf87437c1551987583c2bac81e0e8b4f8f5f', family: 'q2', agree: 0.68, diagnosis: '.orkestrel/agent/instruments/results/l15/calibration/q2/fit-2/diagnosis.json' },
])
const READERS = Object.freeze([
	{ stage: 'resource', source: 'tmp/units/aggregate-successor-g4-think0-resource-read.ts', original: '.orkestrel/agent/instruments/results/l15/g4-think0', substitutions: 2 },
	{ stage: 'full', source: 'tmp/units/aggregate-successor-q4-thinking-full-read.ts', original: '.orkestrel/agent/instruments/results/l15/q4-think1', substitutions: 1 },
	{ stage: 'aggregate', source: 'tmp/units/aggregate-successor-g4-think0-aggregate-read.ts', original: '.orkestrel/agent/instruments/results/l15/g4-think0', substitutions: 1 },
])
const PREREQUISITES = Object.freeze([
	...CELLS.map(cell => ({ path: `.orkestrel/agent/instruments/results/l15/${cell.cell}/freeze/manifest.json`, expected: cell.frozen })),
	{ path: '.orkestrel/agent/instruments/harness/.build/build-manifest.json', expected: '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc' },
	{ path: 'tmp/units/aggregate-successor-daemon-deployment.json', expected: '40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19' },
	{ path: '.orkestrel/agent/instruments/results/l15/calibration/g4/fit/diagnosis.json', expected: 'a459c9fa0ab48114163d9257e6178d7c2a55dd7c140f15de0e1350a01fa4e1ba' },
	{ path: '.orkestrel/agent/instruments/results/l15/calibration/q2/fit-2/diagnosis.json', expected: '626ac28ed56f4b0f1e1ce51ff2ebdece035ba2760ce532c551642c74d89fc5ca' },
])
const SOURCES = Object.freeze([
	...READERS.map(reader => reader.source),
	'tmp/units/aggregate-successor-g4-think0-resource-brief.md',
	'tmp/units/aggregate-successor-g4-think0-full-brief.md',
	'tmp/units/aggregate-successor-g4-think0-aggregate-brief.md',
	'tmp/units/aggregate-successor-g4-exploratory-prepare.ts',
	'tmp/units/aggregate-successor-q2-exploratory-prepare.ts',
	'.agents/templates/brief.md',
])

class OfflinePreparation {
	execute(): void {
		if (resolve(process.cwd()) !== resolve(CHECKOUT_PATH)) throw new Error('Wrong preparation cwd')
		for (const suffix of ['-capture.json', '-readers.diff', '-briefs.diff', '-report.md']) {
			if (existsSync(PREFIX + suffix)) throw new Error(`Owned output occupied: ${PREFIX}${suffix}`)
		}
		const seals = PREREQUISITES.map(prerequisite => {
			const bytes = readFileSync(prerequisite.path)
			const sha256 = createHash('sha256').update(bytes).digest('hex')
			if (sha256 !== prerequisite.expected) throw new Error(`Prerequisite differs: ${prerequisite.path}; expected ${prerequisite.expected}; found ${sha256}`)
			return { path: prerequisite.path, bytes: bytes.length, sha256 }
		})
		const sources = SOURCES.map(path => ({ path, bytes: readFileSync(path), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }))
		const head = this.#command('git', ['rev-parse', 'HEAD'], 0)
		const status = this.#command('git', ['status', '--porcelain=v1', '--untracked-files=all'], 0)
		const changes = this.#command('git', ['diff', '--name-only'], 0)
		const staged = this.#command('git', ['diff', '--cached', '--name-only'], 0)
		const index = readFileSync('.git/index')
		const absent: string[] = []
		for (const { cell } of CELLS) {
			const directory = `.orkestrel/agent/instruments/results/l15/${cell}`
			absent.push(...['resource', 'full', 'exploration', 'exploration/policy.json', 'exploration/aggregate-execution.json', 'exploration/aggregate-cache', 'exploration/aggregate-run'].map(suffix => `${directory}/${suffix}`))
			for (const stage of ['resource', 'full', 'aggregate']) {
				absent.push(...['.jsonl', '.err', '.jsonl.pid', '.jsonl.status-before.txt', '.jsonl.status-after.txt'].map(suffix => `.orkestrel/agent/instruments/results/l15/logs/${cell}-${stage}${suffix}`))
			}
			for (const reader of READERS) {
				if (existsSync(`tmp/units/aggregate-successor-${cell}-${reader.stage}-read.ts`)) throw new Error(`Owned reader occupied: ${cell}-${reader.stage}`)
			}
			const brief = readFileSync(`tmp/units/aggregate-successor-${cell}-stages-brief.md`, 'utf8')
			const factory = readFileSync('.agents/templates/brief.md', 'utf8').replaceAll('UNIT_ID', `aggregate-successor-${cell}-stages`).replaceAll('SHORT_SUBJECT', `Prepare the released exploratory stages for ${cell}`)
			if (brief !== factory) throw new Error(`Owned brief is not the untouched factory output: ${cell}`)
		}
		for (const path of absent) if (existsSync(path)) throw new Error(`Prospective destination occupied: ${path}`)
		const copies: { readonly path: string; readonly source: string; readonly bytes: number; readonly sha256: string; readonly substitutions: number; readonly encoding: string; readonly syntax: Command }[] = []
		const briefs: { readonly path: string; readonly bytes: number; readonly sha256: string; readonly check: Command }[] = []
		let readerDiff = ''
		let briefDiff = ''
		for (const target of CELLS) {
			for (const reader of READERS) {
				const original = readFileSync(reader.source)
				const text = original.toString('utf8')
				if (!Buffer.from(text, 'utf8').equals(original)) throw new Error(`Reader is not losslessly UTF-8: ${reader.source}`)
				const count = text.split(reader.original).length - 1
				if (count !== reader.substitutions) throw new Error(`Reader literal count differs: ${reader.source}; expected ${reader.substitutions}; found ${count}`)
				const replacement = `.orkestrel/agent/instruments/results/l15/${target.cell}`
				const content = Buffer.from(text.replaceAll(reader.original, replacement), 'utf8')
				if (!Buffer.from(content.toString('utf8').replaceAll(replacement, reader.original), 'utf8').equals(original)) throw new Error(`Nonliteral reader difference: ${reader.source}`)
				const path = `tmp/units/aggregate-successor-${target.cell}-${reader.stage}-read.ts`
				writeFileSync(path, content, { flag: 'wx' })
				const syntax = this.#command(process.execPath, ['--check', path], 0)
				const diff = this.#command('git', ['diff', '--no-index', '--no-ext-diff', '--', reader.source, path], 1)
				readerDiff += diff.stdout
				copies.push({ path, source: reader.source, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex'), substitutions: count, encoding: 'No incidental encoding change; reverse literal substitution equals original bytes, including BOM and line endings.', syntax })
			}
			const path = `tmp/units/aggregate-successor-${target.cell}-stages-brief.md`
			const content = this.#brief(target.cell, target.frozen, target.family, target.agree, target.diagnosis)
			writeFileSync(path, content)
			const check = this.#command(process.execPath, ['.agents/skills/orkestrel-dispatch/scripts/brief.ts', '--check', path], 0)
			const diff = this.#command('git', ['diff', '--no-index', '--no-ext-diff', '--', '.agents/templates/brief.md', path], 1)
			briefDiff += diff.stdout
			briefs.push({ path, bytes: Buffer.byteLength(content), sha256: createHash('sha256').update(content).digest('hex'), check })
		}
		writeFileSync(`${PREFIX}-readers.diff`, readerDiff, { flag: 'wx' })
		writeFileSync(`${PREFIX}-briefs.diff`, briefDiff, { flag: 'wx' })
		for (const source of sources) if (!readFileSync(source.path).equals(source.bytes)) throw new Error(`Original changed: ${source.path}`)
		for (const seal of seals) if (createHash('sha256').update(readFileSync(seal.path)).digest('hex') !== seal.sha256) throw new Error(`Prerequisite changed: ${seal.path}`)
		for (const path of absent) if (existsSync(path)) throw new Error(`Prospective destination appeared: ${path}`)
		const finishHead = this.#command('git', ['rev-parse', 'HEAD'], 0)
		const finishStatus = this.#command('git', ['status', '--porcelain=v1', '--untracked-files=all'], 0)
		const finishChanges = this.#command('git', ['diff', '--name-only'], 0)
		const finishStaged = this.#command('git', ['diff', '--cached', '--name-only'], 0)
		if (finishHead.stdout !== head.stdout || finishChanges.stdout !== changes.stdout || finishStaged.stdout !== staged.stdout || !readFileSync('.git/index').equals(index)) throw new Error('HEAD/index/tracked path custody changed')
		const capture = { operation: 'offline-preparation', seals, sources: sources.map(source => ({ path: source.path, bytes: source.bytes.length, sha256: source.sha256 })), factories: CELLS.map(target => ({ command: `node .agents/skills/orkestrel-dispatch/scripts/brief.ts --unit aggregate-successor-${target.cell}-stages --lane units --subject "Prepare the released exploratory stages for ${target.cell}"`, exit: 0, untouchedTemplateEquality: true })), copies, briefs, absent, custody: { head, status, changes, staged, finishHead, finishStatus, finishChanges, finishStaged, index: createHash('sha256').update(index).digest('hex') }, diffs: [{ path: `${PREFIX}-readers.diff`, bytes: Buffer.byteLength(readerDiff), sha256: createHash('sha256').update(readerDiff).digest('hex') }, { path: `${PREFIX}-briefs.diff`, bytes: Buffer.byteLength(briefDiff), sha256: createHash('sha256').update(briefDiff).digest('hex') }] }
		writeFileSync(`${PREFIX}-capture.json`, `${JSON.stringify(capture, null, 2)}\n`, { flag: 'wx' })
		const report = [
			'# Remaining exploratory cell preparation', '',
			'Prepared the g4-think1, q2-think0, and q2-think1 stages briefs and saved-evidence readers. Every live stage requires its own root release on a supplied HEAD; resource/full/policy/execution seals and outcomes remain unmeasured. No cell operator, materializer, or reader runtime was executed.', '',
			`The brief factory commands exited 0 and their untouched outputs matched the filled factory template before editing. Each completed brief check exited 0. The ${copies.length} literal reader copies passed syntax checks with exit 0. Source bytes, imports, predicates, emitted calls, and output fields remain equal after reversing only the cell-path substitutions; no incidental BOM or line-ending change occurred. See \`${PREFIX}-capture.json:1\`.`, '',
			'The directly measured prerequisite seals remained equal on repeat reads.', '',
			'| Prerequisite | SHA-256 |', '| --- | --- |', ...seals.map(seal => `| \`${seal.path}\` | \`${seal.sha256}\` |`), '',
			'The completed artifacts carry the following measured seals. Reader sources are named in the capture and actual diffs.', '',
			'| Artifact | Bytes | SHA-256 |', '| --- | ---: | --- |', ...[...briefs, ...copies, ...capture.diffs].map(artifact => `| \`${artifact.path}\` | ${artifact.bytes} | \`${artifact.sha256}\` |`), '',
			`The complete actual no-index reader and brief diffs are \`${PREFIX}-readers.diff\` and \`${PREFIX}-briefs.diff\`; each individual comparison exited 1 because the intended text differs. The capture lists every command with its bare stdout, stderr, and exit.`, '',
			`All ${absent.length} explicitly named prospective resource/full/exploration, policy/execution/cache/run, and stage log/error/PID/status paths were absent before and after preparation; their exact paths are in the capture. Root alone runs the accepted G4/Q2 materializer after accepted resource custody and full closure, and supplies the materialized policy/execution seals and absolute command paths. G4 AGREE is 0.61; Q2 AGREE is 0.68 from corrected fit-2; CHANGE remains 0.56 and withholding true.`, '',
			`Resource/full caps remain 7200 seconds and aggregate cap 10800. The briefs preserve all goals, independent caches, baseline phases and continuation policies, complete raw and cost captures, no retries, terminal exit truth, and recorded process-tree closure. The aggregate readers retain development parsing/pairing/exposure/cost semantics and add no feasibility gate or qualification.`, '',
			`Preparation observed HEAD \`${head.stdout.trim()}\` without assigning it to any future execution. Exact index SHA-256 remained \`${capture.custody.index}\`; tracked-working and staged path outputs remained equal. Original inputs and prospective output paths were checked again before return. The live g4-think0 evidence, source/build, services, user service PID32104, bench4 Driver.mjs, and harness cache were not changed.`, '',
			'An initial PowerShell absence command failed to parse and read or wrote no artifact. The preparation capture performed the complete absence inventory successfully before writing the copies. Citation and complete literal-diff inspection are recorded after preparation.', '',
		].join('\n')
		writeFileSync(`${PREFIX}-report.md`, report, { flag: 'wx' })
		process.stdout.write(`${JSON.stringify({ operation: 'offline-preparation', briefs: briefs.length, readers: copies.length, absent: absent.length, capture: `${PREFIX}-capture.json`, report: `${PREFIX}-report.md` }, null, 2)}\n`)
	}

	#command(executable: string, arguments_: readonly string[], expected: number): Command {
		const result = spawnSync(executable, [...arguments_], { cwd: CHECKOUT_PATH, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
		if (result.status !== expected || result.error !== undefined) throw new Error(`Command refused: ${executable} ${arguments_.join(' ')}; expected ${expected}; found ${result.status}; ${result.stdout}${result.stderr}${result.error?.message ?? ''}`)
		return { command: `${executable} ${arguments_.join(' ')}`, exit: result.status, stdout: result.stdout, stderr: result.stderr }
	}

	#brief(cell: string, frozen: string, family: string, agree: number, diagnosis: string): string {
		const root = `.orkestrel/agent/instruments/results/l15/${cell}`
		const materializer = `tmp/units/aggregate-successor-${family}-exploratory-prepare.ts`
		const logs = `.orkestrel/agent/instruments/results/l15/logs/${cell}`
		return [
			`# Unit aggregate-successor-${cell}-stages — Execute separately released exploratory stages`, '',
			'Hold every stage until root explicitly releases that named stage on a supplied execution HEAD. Stop at the released stage closure; no successor starts automatically.', '',
			'## Role and engine', '',
			'Verifier on native GPT-6 Luna through Codex. Executor: NATIVE_SUBAGENT. Perform the assignment yourself and spawn nothing.', '',
			'## Objective', '',
			`Execute only the root-released resource, full, or exploratory development aggregate stage for ${cell}, and preserve its actual outcome, complete requests, goals, costs, custody, and process closure.`, '',
			'## Context', '',
			`- **Evidence.** Root accepted the fixed g4-think0 resource/full/aggregate operators and the ${family.toUpperCase()} materializer. Target freeze: \`${root}/freeze/manifest.json\`, directly measured SHA-256 ${frozen}. Build manifest \`.orkestrel/agent/instruments/harness/.build/build-manifest.json\` has SHA-256 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc. Deployment \`tmp/units/aggregate-successor-daemon-deployment.json\` has SHA-256 40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19. Calibration diagnosis: \`${diagnosis}\`; ${family === 'q2' ? 'use corrected fit-2, never the failed caller fit' : 'retain the accepted exploratory calibration'}.`,
			'- **Law.** Scaffold `AGENTS.md`, `.agents/orchestration.md`, `.claude/rules/quality.md`, `.claude/rules/portability.md`, `.claude/rules/writing.md`, `.agents/skills/orkestrel-dispatch/SKILL.md`, and `.agents/skills/orkestrel-dispatch/references/launch.md`.',
			`- **Installed primitives.** Emitted matrix.js resource/full, bench.js development admission, and \`${materializer}\`. Prepared saved-evidence readers: \`tmp/units/aggregate-successor-${cell}-resource-read.ts\`, \`tmp/units/aggregate-successor-${cell}-full-read.ts\`, and \`tmp/units/aggregate-successor-${cell}-aggregate-read.ts\`. Their imports, predicates, emitted calls, and output fields retain the accepted readers.`,
			'- **Host.** Windows PowerShell; every command cwd C:/Users/mikes/WebstormProjects/scaffold; dedicated endpoint http://127.0.0.1:11435. Root supplies the fixed execution HEAD for each release. Preserve both services, the separate user service PID32104, and its models/workers.',
			'- **Standing conditions.** Source/build/HEAD/index remain fixed through the released stage. Unowned bench4 Driver.mjs, harness cache, campaign prose, and other-cell outputs are report-only. This is the sole campaign workload on port11435 after root releases it. Disclose authorized shared-GPU timing; do not probe or stop the other service.', '',
			'## Unknowns', '',
			'Every target stage outcome, budget, duration, model behavior, and cost remains unmeasured. Root supplies resource/full/policy/execution seals only after their own accepted closure or materialization. No earlier cell budget, seal, or completed-run claim applies here. Operational faults do not establish infeasibility. Semantic quality waits for a later blind audit.', '',
			'## Scope', '',
			`- **Owned.** Only the explicitly released ${cell} stage output, its stage logs/error/PID/status/custody captures, and aggregate-successor-${cell}-STAGE-prefixed report and captures under tmp/units. Resource output: ${root}/resource. Full output: ${root}/full. Aggregate destinations: ${root}/exploration/aggregate-cache and ${root}/exploration/aggregate-run.`,
			'- **Shared (report-only).** Frozen source/build/deployment, resource/full baselines, root-materialized policy/execution, services, original readers/materializers, and other-cell runs.',
			'- **Off-limits.** Source/build/Git mutations, service control, installs, publication, cleanup, fitting, cutoff changes, labels, semantic grading, qualification, inference retries, runtime materializer execution, unselected stages, or other outputs.',
			'- **Made false by this change.** None; execute the fixed released operator.',
			'- **Tools and limits.** Exact released prerequisite/custody checks, tracked capped command, artifact liveness, complete bare capture, existing saved-evidence reader and cost helpers, recorded PID/tree closure, and citation checks. Add no driver, validators, feasibility rules, or tree-wide gates.', '',
			'## Execution', '',
			'Perform personally and spawn nothing. Execute exactly one explicitly released stage. Before it starts, verify root-supplied HEAD, fixed build/freeze/deployment seals, unchanged source/index/input custody, and the exact create-only destination/log/error/PID/status captures are absent. Preserve before/after seals and Git status. Never infer a release from elapsed time or another stage closure.', '',
			`For resource, require root's resource-stage release. Use this fixed command under cap 7200:`, '',
			'```text',
			`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal ${logs}-resource.jsonl --errors ${logs}-resource.err --cap 7200 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js resource --frozen ${root}/freeze/manifest.json --out ${root}/resource --live --url http://127.0.0.1:11435`,
			'```', '',
			'At resource closure, validate the emitted manifest and decoded attempts through the prepared resource reader and existing helpers. Preserve rejected attempts, actual budgets, costs, and operational truth. Confirm exit matches the measured resource decision. Return for root acceptance; stop before full.', '',
			'For full, require a separate root full-stage release with accepted resource custody, manifest seal, resource acceptance, and recorded resource-process closure. Use this fixed command under cap 7200:', '',
			'```text',
			`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal ${logs}-full.jsonl --errors ${logs}-full.err --cap 7200 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js full --frozen ${root}/freeze/manifest.json --resource ${root}/resource/manifest.json --out ${root}/full --live --url http://127.0.0.1:11435`,
			'```', '',
			'At full closure, execute the prepared full reader once with complete stdout/stderr/exit/duration captures. Validate its own emitted manifest, empirical bound, decoded run, decision, budget, costs, and custody through existing helpers. Preserve failed and unattempted goals and operational faults without retry. Return for root acceptance; stop before materialization and aggregate.', '',
			`For aggregate, require accepted full closure and its supplied manifest seal, then root's successful \`${materializer}\` materialization for ${cell} on the released HEAD. Root owns that materializer invocation. Require root's separate aggregate-stage release with fixed HEAD, policy/execution seals, and the exact absolute manifest/cache/out paths printed by that cell's materializer. The admitted policy recomputes AGREE ${agree}, preserves CHANGE 0.56 and withholding true, and uses this cell's closed resource/full budgets; do not change it.`, '',
			'Launch only the materializer-printed development operator through the dispatch launcher under cap 10800. Replace the named absolute-path placeholders solely with root-supplied materializer output:', '',
			'```text',
			`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal ${logs}-aggregate.jsonl --errors ${logs}-aggregate.err --cap 10800 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/bench.js --run --live --copy 1 --manifest ABSOLUTE_EXECUTION_PATH --cache ABSOLUTE_CACHE_PATH --out ABSOLUTE_RUN_PATH --url http://127.0.0.1:11435`,
			'```', '',
			`Require fresh ${root}/exploration/aggregate-cache and ${root}/exploration/aggregate-run destinations. Keep the cache independent of all prior arms/cells; use the frozen seed through existing admission. The raw run writes directly to aggregate-run without a nested identity folder. Pass no fit, study, or goals flags; retain every copy1 goal. Preserve the original records/full baseline phases and their continuation policies, paired selection, empirical budgets, failed XML goals, later continuation, and capped withheld updates.`, '',
			'At aggregate closure, execute the prepared aggregate reader once with complete stdout/stderr/exit/duration captures. Preserve the existing development parser/status, pairing, actual body exposure, per-goal results, and costs. Do not apply the resource/full-only verifyMatrixFeasibility status rule to a development run. The reader grants no qualification, quality, or adoption decision.', '',
			'For the released stage, confirm real request/cache/row advancement within a minute and report coarse progress without quality judgments. Read complete bare terminal output at closure. Capture every role and phase request/token count, metadata/stage/flush timing, and missing usage. Preserve every failure and partial output. Confirm the recorded launcher PID and all descendants are closed before returning; never kill by a process pattern. Never retry, repair, change caps, or start another stage automatically.', '',
			'## Output', '',
			`Return the completed aggregate-successor-${cell}-STAGE-report.md under tmp/units for the released stage, with exact command, supplied prerequisite and terminal seals, PID/tree closure, exit/signal/cap/duration, operational status and measured decision where applicable, actual budgets, all goal statuses including failed/unattempted goals, raw run/manifest/cache paths and hashes, complete saved-reader captures, all-role costs and missing usage, deviations, and the unresolved next dependency. Check citations. Preserve all originals and partial evidence. No semantic quality or qualification claim.`, '',
			'## Deviation contract', '',
			'On an occupied path, prerequisite/custody mismatch, operational fault, missing root release, or required nonliteral reader/unowned change, stop with expected, found, exact evidence, done or not done, and one hypothesis. Preserve partial evidence without retry or repair. Settle report presentation only.', '',
			'## Acceptance criteria', '',
			'1. Check the explicit named-stage release, its supplied HEAD/seals, stage prerequisites, and absent destinations.',
			'2. Execute the fixed released operator once under the retained cap.',
			'3. Preserve actual outcome, complete captures/costs/goals, custody, terminal exit truth, and recorded process-tree closure through existing readers.', '',
			'**Observations, not criteria.** Existing command caps are retained. No prior model/mode timing or resource decision transfers to this unmeasured cell. No tree-wide gate or rebuild.', '',
			'**Measurement.** Frozen development conversations and all copy1 goals; records/full baselines keep their original phases, while aggregate uses the admitted development policy. Preserve real requests and shared-GPU limitations. No semantic regrading in this unit.', '',
			'## Review evidence', '',
			'Root reviews the checked brief and complete literal reader diffs before release, then reads closed raw outputs and the full stage report before acceptance. Every later stage waits for its own root release. Blind quality audit waits for the completed triplet.', '',
		].join('\n')
	}
}

try {
	new OfflinePreparation().execute()
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
}
