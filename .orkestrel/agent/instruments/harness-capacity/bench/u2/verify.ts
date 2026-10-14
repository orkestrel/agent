import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Application, Source, replaceRules } from './apply.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const RULES = JSON.parse(readFileSync(join(HERE, 'rules.json'), 'utf8'))
const application = new Application(ROOT)
const prepared = application.prepare()
assert.deepEqual(prepared.errors, [])
assert.equal(prepared.files.length, 17)
assert.equal(prepared.changes.length, 102)

for (const file of prepared.files) {
 const original = new Source(file.text).value()
 const staged = new Source(file.output).value()
 const before = original.members.find(member => member.key === 'goals').value.elements
 const after = staged.members.find(member => member.key === 'goals').value.elements
 const unmodifiedBefore = []
 const unmodifiedAfter = []
 for (let index = 0; index < before.length; index += 1) {
  const name = JSON.parse(file.text.slice(before[index].start, before[index].end)).id
  for (const member of before[index].members) {
   if (Object.hasOwn(RULES[name] ?? {}, member.key)) continue
   unmodifiedBefore.push(file.text.slice(member.value.start, member.value.end))
  }
  for (const member of after[index].members) {
   if (Object.hasOwn(RULES[name] ?? {}, member.key)) continue
   unmodifiedAfter.push(file.output.slice(member.value.start, member.value.end))
  }
 }
 assert.deepEqual(unmodifiedAfter, unmodifiedBefore, `${file.name}: unrelated goal values must stay byte-identical`)
 for (const member of original.members.filter(member => member.key !== 'goals')) {
  const target = staged.members.find(target => target.key === member.key)
  assert.equal(file.output.slice(target.value.start, target.value.end), file.text.slice(member.value.start, member.value.end))
 }
}
assert.equal(replaceRules('{ "goals" : [{"id":"fixture", "expected":["a"]}] }\n', { fixture: { forbiddenPatterns: ['b'], forbidden: ['c'] } }), '{ "goals" : [{"id":"fixture", "expected":["a"],"forbidden":["c"],"forbiddenPatterns":["b"]}] }\n')

const sandbox = mkdtempSync(join(HERE, 'apply-test-'))
mkdirSync(join(sandbox, 'u2'))
mkdirSync(join(sandbox, 'variants', 'ledger'), { recursive: true })
copyFileSync(join(HERE, 'apply.mjs'), join(sandbox, 'u2', 'apply.mjs'))
copyFileSync(join(HERE, 'rules.json'), join(sandbox, 'u2', 'rules.json'))
for (const file of prepared.files) writeFileSync(join(sandbox, file.name), file.text)
const copy = new Application(sandbox, join(sandbox, 'u2'))
assert.deepEqual(copy.prepare().errors, [])
const corrupted = JSON.parse(readFileSync(join(sandbox, 'variants', 'v4.json'), 'utf8'))
corrupted.goals.find(goal => goal.id === 'g06-kenji-shipping').expected = ['mismatched tracking']
writeFileSync(join(sandbox, 'variants', 'v4.json'), JSON.stringify(corrupted))
const refused = copy.prepare()
assert.deepEqual(refused.errors, ['variants/v4.json: g06-kenji-shipping.expected differs from scenario.json'])
assert.throws(() => copy.write(refused), /differs from scenario.json/)
writeFileSync(join(sandbox, 'variants', 'v4.json'), prepared.files.find(file => file.name === 'variants/v4.json').text)
copy.write(copy.prepare())
for (const file of prepared.files) {
 assert.equal(readFileSync(join(sandbox, file.name), 'utf8'), file.output)
 assert.equal(readFileSync(join(sandbox, `${file.name}.pre-u2`), 'utf8'), file.text)
}
assert.throws(() => copy.write(copy.prepare()), /pre-u2 exists; refusing to write/)
for (const file of prepared.files) assert.equal(readFileSync(join(sandbox, file.name), 'utf8'), file.output)
const report = { files: prepared.files.length, changes: prepared.changes.length, sandbox, check: 'passed', mismatch: refused.errors, write: 'passed', repeat: 'refused existing backup', unrelatedBytes: 'equal', backups: 'exact originals' }
writeFileSync(join(HERE, 'apply-tests.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
