import { constants, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIELDS = ['expected', 'expectedAny', 'forbidden', 'forbiddenPatterns', 'tools']

// JSON spans let the writer replace field values without reformatting adjacent bytes.
export class Source {
 constructor(text) { this.text = text; this.cursor = 0 }
 space() { while (/\s/.test(this.text[this.cursor] ?? '') && this.cursor < this.text.length) this.cursor += 1 }
 value() {
  this.space()
  const start = this.cursor
  const head = this.text[this.cursor++]
  const members = []
  const elements = []
  if (head === '{' || head === '[') {
   this.space()
   const close = head === '{' ? '}' : ']'
   while (this.text[this.cursor] !== close) {
    if (head === '{') {
     const key = this.value()
     this.space()
     if (this.text[this.cursor++] !== ':') throw new Error('Expected JSON colon')
     members.push({ key: JSON.parse(this.text.slice(key.start, key.end)), value: this.value() })
    } else elements.push(this.value())
    this.space()
    if (this.text[this.cursor] !== ',') break
    this.cursor += 1
   }
   if (this.text[this.cursor++] !== close) throw new Error('Expected JSON closing delimiter')
  } else if (head === '"') {
   while (this.cursor < this.text.length) {
    const character = this.text[this.cursor++]
    if (character === '\\') this.cursor += 1
    else if (character === '"') break
   }
  } else {
   while (this.cursor < this.text.length && !/[\s,}\]]/.test(this.text[this.cursor])) this.cursor += 1
  }
  return { start, end: this.cursor, members, elements }
 }
}

export function replaceRules(text, rules) {
 const parsed = JSON.parse(text)
 const expected = structuredClone(parsed)
 const tree = new Source(text).value()
 const goals = tree.members.find(member => member.key === 'goals')?.value.elements
 if (!goals) throw new Error('Scenario has no goals array')
 const edits = []
 for (const goal of goals) {
  const id = goal.members.find(member => member.key === 'id')?.value
  if (!id) throw new Error('Scenario goal has no id')
  const name = JSON.parse(text.slice(id.start, id.end))
  if (!Object.hasOwn(rules, name)) continue
  for (const [field, replacement] of Object.entries(rules[name])) {
   const member = goal.members.find(member => member.key === field)
   if (member) edits.push({ start: member.value.start, end: member.value.end, text: JSON.stringify(replacement) })
   else edits.push({ start: goal.end - 1, end: goal.end - 1, text: `,${JSON.stringify(field)}:${JSON.stringify(replacement)}` })
  }
  Object.assign(expected.goals.find(goal => goal.id === name), rules[name])
 }
 let output = text
 for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
 if (!isDeepStrictEqual(JSON.parse(output), expected)) throw new Error('Replacement changed an unrelated field')
 return output
}

export class Application {
 constructor(root, stage = HERE) { this.root = root; this.stage = stage }
 prepare() {
  const rules = JSON.parse(readFileSync(join(this.stage, 'rules.json'), 'utf8'))
  const names = ['scenario.json', ...Array.from({ length: 8 }, (_, index) => `variants/v${index + 1}.json`), ...Array.from({ length: 8 }, (_, index) => `variants/ledger/v${index + 1}.json`)]
  const snapshots = names.map(name => ({ name, path: join(this.root, name), text: readFileSync(join(this.root, name), 'utf8') }))
  const baseline = JSON.parse(snapshots[0].text)
  const errors = []
  const changes = []
  const files = []
  for (const snapshot of snapshots) {
   const scenario = JSON.parse(snapshot.text)
   for (const [id, fields] of Object.entries(rules)) {
    const goal = scenario.goals.find(goal => goal.id === id)
    const canonical = baseline.goals.find(goal => goal.id === id)
    if (!goal || !canonical) { errors.push(`${snapshot.name}: ${id}: missing goal`); continue }
    for (const field of new Set([...FIELDS, ...Object.keys(fields)])) {
     if (!isDeepStrictEqual(goal[field] ?? null, canonical[field] ?? null)) errors.push(`${snapshot.name}: ${id}.${field} differs from scenario.json`)
    }
    for (const [field, value] of Object.entries(fields)) {
     if (!isDeepStrictEqual(goal[field], value)) changes.push(`${snapshot.name}: ${id}.${field}`)
    }
   }
   files.push({ ...snapshot, output: replaceRules(snapshot.text, rules) })
  }
  const scorer = join(this.stage, 'rescore.mjs')
  if (existsSync(scorer)) {
   const path = join(this.root, 'rescore.mjs')
   files.push({ name: 'rescore.mjs', path, text: readFileSync(path, 'utf8'), output: readFileSync(scorer, 'utf8') })
   changes.push('rescore.mjs: staged scorer')
  }
  return { errors, changes, files }
 }
 write(prepared) {
  if (prepared.errors.length) throw new Error(prepared.errors.join('\n'))
  for (const file of prepared.files) {
   if (existsSync(`${file.path}.pre-u2`)) throw new Error(`${file.name}.pre-u2 exists; refusing to write`)
   if (readFileSync(file.path, 'utf8') !== file.text) throw new Error(`${file.name} changed after the preflight`)
  }
  // All backups precede live writes; exclusive creation also refuses a racing backup.
  for (const file of prepared.files) copyFileSync(file.path, `${file.path}.pre-u2`, constants.COPYFILE_EXCL)
  for (const file of prepared.files) writeFileSync(file.path, file.output)
 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 if (process.argv.length !== 3 || !['--check', '--write'].includes(process.argv[2])) {
  console.error('usage: node tmp/bench/u2/apply.mjs --check|--write')
  process.exitCode = 64
 } else {
  try {
   const application = new Application(dirname(HERE))
   const prepared = application.prepare()
   if (prepared.errors.length) {
    console.error(prepared.errors.join('\n'))
    process.exitCode = 1
   } else {
    for (const file of prepared.files) {
     const fields = prepared.changes.filter(change => change.startsWith(`${file.name}: `)).map(change => change.slice(file.name.length + 2).replace(/^(g\d+)-[^.]+/, '$1'))
     if (fields.length) console.log(`${file.name}: ${fields.join(', ')}`)
    }
    if (process.argv[2] === '--write') application.write(prepared)
    console.log(`${process.argv[2] === '--write' ? 'Wrote' : 'Checked'} ${prepared.files.length} files; ${prepared.changes.length} field changes.`)
   }
  } catch (error) { console.error(error.message); process.exitCode = 1 }
 }
}
