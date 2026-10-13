import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const source = resolve(root, 'tmp/units/aggregate-capacity-probe/daemon.err')
const dir = resolve(root, 'tmp/units/aggregate-capacity-runner-observation')
const raw = readFileSync(source)
const text = raw.toString('utf8')
const lines = text.split(/(?<=\n)/u)
let offset = 0
let begin = -1
let boundary = -1
let beginLine = -1
let boundaryLine = -1
let executable: string | undefined
for (let index = 0; index < lines.length; index++) {
  const line = lines[index]
  if (line === undefined) throw new Error('line gap')
  if (begin < 0 && line.includes('time=2026-10-11T07:03:50.733-04:00 level=INFO source=sched.go:1166')) {
    begin = offset
    beginLine = index + 1
  }
  if (boundary < 0 && line.includes('time=2026-10-11T07:14:46.195-04:00 level=INFO source=sched.go:1166')) {
    boundary = offset
    boundaryLine = index + 1
  }
  if (executable === undefined && line.includes('msg="starting llama-server" cmd=')) {
    const match = line.match(/cmd="([^ ]+llama-server\.exe) --model/u)
    if (match?.[1] === undefined) throw new Error('Runner executable is not parsable')
    executable = match[1]
  }
  offset += Buffer.byteLength(line)
}
if (begin < 0 || boundary < 0 || beginLine < 1 || boundaryLine <= beginLine || executable === undefined) throw new Error('Exact interval boundaries or runner executable are missing')
const end = boundary
const selected = raw.subarray(begin, end)
const intervalPath = resolve(dir, 'daemon.err.capacity-prefix.bin')
writeFileSync(intervalPath, selected, { flag: 'wx' })
const executableBytes = readFileSync(executable)
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const custody = {
  source: 'tmp/units/aggregate-capacity-probe/daemon.err',
  sourceBytes: raw.byteLength,
  sourceHash: sha(raw),
  startOffset: begin,
  endOffsetExclusive: end,
  intervalBytes: selected.byteLength,
  startLine: beginLine,
  endLine: boundaryLine - 1,
  excludedBoundaryLine: boundaryLine,
  extractedHash: sha(selected),
  sourcePrefixHashThroughEnd: sha(raw.subarray(0, end)),
  extractedPath: 'tmp/units/aggregate-capacity-runner-observation/daemon.err.capacity-prefix.bin',
  extractedAt: new Date().toISOString(),
  runnerExecutable: executable,
  runnerExecutableBytes: executableBytes.byteLength,
  runnerExecutableHash: sha(executableBytes),
}
writeFileSync(resolve(dir, 'custody.json'), `${JSON.stringify(custody, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(custody))