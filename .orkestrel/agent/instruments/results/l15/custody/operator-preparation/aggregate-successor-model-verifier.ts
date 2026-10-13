import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const root = 'C:\\Users\\mikes\\WebstormProjects\\scaffold'
const unit = join(root, 'tmp', 'units')
const reportPath = join(unit, 'aggregate-successor-model-preparation-report.md')
const predecessorPath = join(unit, 'aggregate-final-calibration-command-plan-2.json')
const report = readFileSync(reportPath, 'utf8')
const prior = readJson(predecessorPath)
const expectedHashes = new Map<string, string>([
  ['aggregate-successor-model-plan.ts', '2e3466afcdbc4dd25c1b9f8c6e9c8722cd47a54afa0e0859c3a10a5598d747ba'],
  ['aggregate-successor-model-run.ts', '2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb'],
  ['aggregate-successor-model-g4-plan.json', '0e091e45ed2d7ead59ee486565b1c702d96b7338190487a980fda3cd1de3bb22'],
  ['aggregate-successor-model-q2-plan.json', '5cd2cb31ae98c6643cdb83d7253c7259cd3afcf1bf3670d70adce270377ec622'],
  ['aggregate-successor-model-g2-plan.json', '4f875648d30934971697bd0959cc148ac32b5ddbb7b431dc3f672177a82c2619']
])
const keys = ['g4', 'q2', 'g2']
const checks: string[] = []
const hashes: string[] = []

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(file: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'))
  assert(isRecord(value), `Expected JSON object: ${file}`)
  return value
}

function records(value: unknown, label: string): Record<string, unknown>[] {
  assert(Array.isArray(value), `Expected array: ${label}`)
  const result: Record<string, unknown>[] = []
  for (const item of value) {
    assert(isRecord(item), `Expected object in ${label}`)
    result.push(item)
  }
  return result
}

function strings(value: unknown, label: string): string[] {
  assert(Array.isArray(value), `Expected array: ${label}`)
  const result: string[] = []
  for (const item of value) {
    assert(typeof item === 'string', `Expected string in ${label}`)
    result.push(item)
  }
  return result
}

function stringField(value: Record<string, unknown>, field: string, label: string): string {
  const result = value[field]
  assert(typeof result === 'string', `Expected ${field} string in ${label}`)
  return result
}

function numberField(value: Record<string, unknown>, field: string, label: string): number {
  const result = value[field]
  assert(typeof result === 'number', `Expected ${field} number in ${label}`)
  return result
}

function readExpectedHash(file: string): string {
  const line = report.split(/\r\n|\n/).find((entry) => entry.includes(`| ${file} |`))
  assert(line !== undefined, `Preparation report has no hash row for ${file}`)
  const match = /\|\s*([a-f0-9]{64})\s*\|\s*$/.exec(line)
  assert(match !== null, `Preparation report hash row is malformed for ${file}`)
  const value = match[1]
  assert(value !== undefined, `Preparation report hash absent for ${file}`)
  return value
}

function hash(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function hasPathFlag(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag)
  return index < 0 ? undefined : argv[index + 1]
}

function normalizeActual(command: Record<string, unknown>, priorCommand: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...command }
  normalized.sequence = priorCommand.sequence
  const argv = strings(command.argv, 'operator argv').map((part) => {
    let changed = part.replaceAll(`${sep}l15${sep}`, `${sep}l14${sep}`)
    changed = changed.replaceAll('aggregate-successor-daemon-deployment.json', 'aggregate-final-daemon-deployment.json')
    return changed
  })
  assert(argv.at(-2) === '--url' && argv.at(-1) === 'http://127.0.0.1:11435', 'Operator lacks exact trailing endpoint suffix')
  argv.splice(argv.length - 2, 2)
  normalized.argv = argv
  normalized.expected = strings(command.expected, 'operator expected').map((part) => part.replaceAll(`${sep}l15${sep}`, `${sep}l14${sep}`))
  return normalized
}

function assertAbsent(file: string, key: string): void {
  assert(!existsSync(file), `${key} destination already exists: ${file}`)
}

assert(isRecord(prior), 'Predecessor plan is not an object')
const priorCommands = records(prior.commands, 'predecessor commands')
const priorLabels = records(prior.labels, 'predecessor labels')
const rootPath = resolve(root)
const expectedStages = (key: string): string[] => [
  `${key}-think0-freeze`,
  `${key}-think1-freeze`,
  `${key}-calibration-corpus`,
  `${key}-calibration-generate`,
  `${key}-calibration-fit`
]

for (const file of expectedHashes.keys()) {
  const fullPath = join(unit, file)
  const actual = hash(fullPath)
  const reported = readExpectedHash(file)
  assert(actual === reported, `Report seal mismatch for ${file}: expected ${reported}, found ${actual}`)
  assert(actual === expectedHashes.get(file), `Fixed seal mismatch for ${file}`)
  hashes.push(`${file} ${actual}`)
}

for (const key of keys) {
  const file = `aggregate-successor-model-${key}-plan.json`
  const plan = readJson(join(unit, file))
  const commands = records(plan.commands, `${key} commands`)
  const ids = commands.map((command) => stringField(command, 'id', `${key} command`))
  const stages = expectedStages(key)
  assert(isDeepStrictEqual(ids, stages), `${key} operator order or membership differs: ${JSON.stringify(ids)}`)
  assert(stringField(plan, 'root', `${key} plan`) === rootPath, `${key} root binding changed`)
  assert(stringField(plan, 'results', `${key} plan`) === join(rootPath, '.orkestrel', 'agent', 'instruments', 'results', 'l15'), `${key} results binding changed`)
  assert(stringField(plan, 'deployment', `${key} plan`) === join(unit, 'aggregate-successor-daemon-deployment.json'), `${key} deployment binding changed`)
  assert(stringField(plan, 'seed', `${key} plan`) === stringField(prior, 'seed', 'predecessor'), `${key} seed binding changed`)
  assert(stringField(plan, 'settings', `${key} plan`) === stringField(prior, 'settings', 'predecessor'), `${key} settings binding changed`)

  const labels = records(plan.labels, `${key} labels`)
  assert(labels.length === 1, `${key} must contain exactly one held-label binding`)
  const label = labels[0]
  assert(label !== undefined, `${key} label binding is absent`)
  assert(stringField(label, 'key', `${key} label`) === key, `${key} label key changed`)
  const priorLabel = priorLabels.find((candidate) => candidate.key === key)
  assert(priorLabel !== undefined, `${key} predecessor label binding is absent`)
  const wantedLabel: Record<string, unknown> = {}
  for (const field of ['key', 'packet', 'labels', 'fit']) {
    const value = priorLabel[field]
    assert(typeof value === 'string', `${key} predecessor label ${field} is malformed`)
    wantedLabel[field] = value.replaceAll(`${sep}l14${sep}`, `${sep}l15${sep}`)
  }
  assert(isDeepStrictEqual(label, wantedLabel), `${key} held-label binding differs from predecessor mapping`)

  for (const command of commands) {
    const id = stringField(command, 'id', `${key} command`)
    const predecessor = priorCommands.find((candidate) => candidate.id === id)
    assert(predecessor !== undefined, `${key} has no predecessor operator for ${id}`)
    const sequence = numberField(command, 'sequence', `${key} command`)
    assert(sequence === commands.indexOf(command) + 1, `${key} local sequence is not contiguous at ${id}`)
    const cap = numberField(command, 'capSeconds', `${key} command`)
    const expectedCap = id.endsWith('-generate') ? 1800 : 240
    assert(cap === expectedCap, `${key} cap differs at ${id}: ${cap}`)
    const argv = strings(command.argv, `${key} ${id} argv`)
    assert(argv.filter((part) => part === '--url').length === 1 && argv.at(-1) === 'http://127.0.0.1:11435', `${key} endpoint is not explicit in ${id}`)
    const normalized = normalizeActual(command, predecessor)
    assert(isDeepStrictEqual(normalized, predecessor), `${key} operator differs from the permitted predecessor transform at ${id}`)

    const changed: Record<string, unknown> = JSON.parse(JSON.stringify(command))
    changed.capSeconds = cap + 1
    assert(!isDeepStrictEqual(normalizeActual(changed, predecessor), predecessor), `${key} changed-operator control was accepted at ${id}`)

    const expected = strings(command.expected, `${key} ${id} expected`)
    for (const destination of expected) assertAbsent(destination, key)
    const out = hasPathFlag(argv, '--out')
    assert(out !== undefined, `${key} ${id} has no output path`)
    assertAbsent(out, key)
    const journal = hasPathFlag(argv, '--journal')
    const errors = hasPathFlag(argv, '--errors')
    assert(journal !== undefined && errors !== undefined, `${key} ${id} lacks log paths`)
    assertAbsent(journal, key)
    assertAbsent(errors, key)
    assertAbsent(`${journal}.pid`, key)
    assertAbsent(`${journal}.status-before.txt`, key)
    assertAbsent(`${journal}.status-after.txt`, key)
  }

  const cache = join(rootPath, '.orkestrel', 'agent', 'instruments', 'results', 'l15', 'calibration', key, 'cache')
  assertAbsent(cache, key)
  for (const suffix of ['execution-sequence.jsonl', 'custody-before.json', 'custody-after.json']) {
    assertAbsent(join(unit, `aggregate-successor-model-${key}-${suffix}`), key)
  }
  checks.push(`${key}: ${stages.join(' -> ')}; bindings/caps/endpoint/operators/destination absence/control passed`)
}

const output = [
  'aggregate successor model plan conformance',
  `predecessor ${hash(predecessorPath)}`,
  ...hashes,
  ...checks,
  'changed-operator control: changed cap rejected for every planned operator',
  'planned command, runner, preparer, service, and model execution: none'
].join('\n') + '\n'
process.stdout.write(output)

