import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { UNIT } from './constants.ts'
import { computeOperator, readBinding, writeArtifact } from './helpers.ts'

const output = resolve(UNIT, 'precursor-repair')
mkdirSync(output)
const files = readdirSync(UNIT, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name !== 'retain-repair.ts').map(entry => entry.name)
for (const name of files) writeFileSync(resolve(output, name), readFileSync(resolve(UNIT, name)), { flag: 'wx' })
const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
if (status.status !== 0) throw new Error(status.stderr)
writeArtifact(resolve(output, 'custody.json'), { operator: computeOperator(), files: files.map(name => readBinding(resolve(UNIT, name))), status: status.stdout, at: new Date().toISOString() })
console.log(JSON.stringify({ output, operator: computeOperator(), files: files.length }))
