import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dir = resolve(root, 'tmp/units/aggregate-capacity-runner-observation')
const unit = resolve(root, 'tmp/units/aggregate-capacity-probe')
const custody = JSON.parse(readFileSync(resolve(dir, 'custody.json'), 'utf8')) as Record<string, unknown>
const raw = readFileSync(resolve(root, 'tmp/units/aggregate-capacity-probe/daemon.err'))
const extracted = readFileSync(resolve(dir, 'daemon.err.capacity-prefix.bin'))
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const start = custody.startOffset
const end = custody.endOffsetExclusive
if (typeof start !== 'number' || typeof end !== 'number') throw new Error('Bad custody offsets')
if (sha(extracted) !== custody.extractedHash || sha(raw.subarray(start, end)) !== custody.extractedHash || sha(raw.subarray(0, end)) !== custody.sourcePrefixHashThroughEnd) throw new Error('Extracted interval no longer matches source')
const lines = extracted.toString('utf8').split(/\r?\n/u)
const sourceStartLine = typeof custody.startLine === 'number' ? custody.startLine : 1
interface Task { id: number; promptTokens: number; promptTime?: number; promptTimeTokens?: number; evalTime?: number; evalTokens?: number; totalTime?: number; totalTokens?: number; releasedTokens?: number; truncated?: number; error?: string; lines: Record<string, number> }
interface Runner { startLine: number; blob?: string; command?: string; context?: number; parallel?: number; slots?: number; slotContext?: number; startupSec?: number; tasks: Task[] }
const runners: Runner[] = []
let runner: Runner | undefined
let task: Task | undefined
for (let index = 0; index < lines.length; index++) {
  const line = lines[index]
  if (line === undefined) continue
  const sourceLine = sourceStartLine + index
  if (line.includes('msg="using llama-server for model"')) {
    const blob = line.match(/sha256-([0-9a-f]{64})/u)?.[1]
    runner = { startLine: sourceLine, ...(blob === undefined ? {} : { blob }), tasks: [] }
    runners.push(runner)
    task = undefined
    continue
  }
  if (runner === undefined) continue
  if (line.includes('msg="starting llama-server" cmd=')) {
    runner.command = line.match(/cmd="(.+)"$/u)?.[1]
    runner.context = Number(line.match(/\s-c\s+(\d+)/u)?.[1])
    runner.parallel = Number(line.match(/\s-np\s+(\d+)/u)?.[1])
  }
  const slots = line.match(/initializing, n_slots = (\d+), n_ctx_slot = (\d+)/u)
  if (slots !== null) { runner.slots = Number(slots[1]); runner.slotContext = Number(slots[2]) }
  const started = line.match(/llama-server started in ([\d.]+) seconds/u)
  if (started !== null) runner.startupSec = Number(started[1])
  const prompt = line.match(/task (\d+) \| new prompt, n_ctx_slot = (\d+), n_keep = (\d+), task\.n_tokens = (\d+)/u)
  if (prompt !== null) {
    task = { id: Number(prompt[1]), promptTokens: Number(prompt[4]), lines: { prompt: sourceLine } }
    runner.tasks.push(task)
    continue
  }
  if (task === undefined) continue
  const taskNo = line.match(/\| task (\d+) \|/u)?.[1] ?? line.match(/send_error: task id = (\d+)/u)?.[1]
  if (taskNo !== String(task.id)) continue
  if (line.includes('send_error:')) { task.error = line.slice(line.indexOf('error: ') + 7); task.lines.error = sourceLine }
  const promptTiming = line.match(/prompt eval time =\s*([\d.]+) ms \/\s*(\d+) tokens/u)
  if (promptTiming !== null) { task.promptTime = Number(promptTiming[1]); task.promptTimeTokens = Number(promptTiming[2]); task.lines.promptTiming = sourceLine }
  if (!line.includes('prompt eval time')) {
    const evalTiming = line.match(/eval time =\s*([\d.]+) ms \/\s*(\d+) tokens/u)
    if (evalTiming !== null) { task.evalTime = Number(evalTiming[1]); task.evalTokens = Number(evalTiming[2]); task.lines.evalTiming = sourceLine }
  }
  const total = line.match(/total time =\s*([\d.]+) ms \/\s*(\d+) tokens/u)
  if (total !== null) { task.totalTime = Number(total[1]); task.totalTokens = Number(total[2]); task.lines.total = sourceLine }
  const release = line.match(/stop processing: n_tokens = (\d+), truncated = (\d+)/u)
  if (release !== null) { task.releasedTokens = Number(release[1]); task.truncated = Number(release[2]); task.lines.release = sourceLine; task = undefined }
}
const packet = JSON.parse(readFileSync(resolve(unit, 'prepared/packet.json'), 'utf8')) as { vectors: Array<{ id: string; model: string }>; models: Array<{ key: string; tag: string }> }
const analysis = JSON.parse(readFileSync(resolve(root, 'tmp/units/aggregate-capacity-probe-live-reading/analysis-verified.json'), 'utf8')) as { snapshots: Array<{ after: string; models: Array<{ name: string; context_length: number; digest: string }> }> }
const tasks = runners.flatMap((run, runIndex) => run.tasks.map(row => ({ run, runIndex, row })))
if (runners.length !== 18 || tasks.length !== packet.vectors.length) throw new Error(`Unexpected runner/task counts: ${runners.length}/${tasks.length}`)
const rows = tasks.map(({ run, runIndex, row }, index) => {
  const vector = packet.vectors[index]
  if (vector === undefined) throw new Error('Vector index gap')
  const expectedModel = packet.models.find(item => item.key === vector.model)?.tag
  const snapshot = analysis.snapshots.find(item => item.after === vector.id)
  const model = snapshot?.models[0]
  if (model === undefined) throw new Error(`No immediate snapshot for ${vector.id}`)
  return {
    vector: vector.id,
    model: expectedModel,
    runner: runIndex + 1,
    runnerStartLine: run.startLine,
    modelBlobSha256: run.blob,
    contextArg: run.context,
    parallelArg: run.parallel,
    slots: run.slots,
    slotContext: run.slotContext,
    snapshotModel: model.name,
    snapshotDigest: model.digest,
    snapshotContext: model.context_length,
    taskId: row.id,
    promptTokens: row.promptTokens,
    promptEvalMs: row.promptTime,
    evalTokens: row.evalTokens,
    evalMs: row.evalTime,
    totalTokens: row.totalTokens,
    totalMs: row.totalTime,
    releaseTokens: row.releasedTokens,
    truncated: row.truncated,
    error: row.error,
    lines: row.lines,
  }
})
for (const row of rows) {
  if (row.snapshotModel !== row.model || row.contextArg !== row.snapshotContext || row.slotContext !== row.snapshotContext || row.parallelArg !== 1 || row.slots !== 1) throw new Error(`Runner/snapshot mismatch ${row.vector}: ${JSON.stringify({ expectedModel: row.model, snapshotModel: row.snapshotModel, contextArg: row.contextArg, slotContext: row.slotContext, snapshotContext: row.snapshotContext, parallelArg: row.parallelArg, slots: row.slots })}`)
  if (row.error === undefined && (row.releaseTokens === undefined || row.truncated === undefined)) throw new Error(`Missing release ${row.vector}`)
}
const out = { interval: custody, runners: runners.map((run, index) => ({ index: index + 1, startLine: run.startLine, modelBlobSha256: run.blob, contextArg: run.context, parallelArg: run.parallel, slots: run.slots, slotContext: run.slotContext, startupSec: run.startupSec, taskIds: run.tasks.map(row => row.id) })), rows }
writeFileSync(resolve(dir, 'runner-observations-verified.json'), `${JSON.stringify(out, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ pass: true, runners: runners.length, requests: rows.length, allRunnerSnapshotBindings: true, errorRows: rows.filter(row => row.error !== undefined).map(row => row.vector), generationRows: rows.filter(row => row.vector.endsWith('-generation')) }))
