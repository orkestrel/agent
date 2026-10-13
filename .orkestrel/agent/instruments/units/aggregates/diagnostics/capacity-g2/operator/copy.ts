import { strict as assert } from 'node:assert'
import { copyFileSync, constants, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeHash } from '../aggregate-judge-counterfactual/helpers.ts'

// This offline setup retains the predecessor baseline before copying its runtime.
const destination = fileURLToPath(new URL('.', import.meta.url))
const predecessor = resolve(destination, '../aggregate-capacity-probe')
const entries = readdirSync(predecessor, { recursive: true, withFileTypes: true })
const bindings = entries.filter(entry => entry.isFile()).map(entry => {
	const path = resolve(entry.parentPath, entry.name)
	const bytes = readFileSync(path)
	return { path: relative(predecessor, path).split(sep).join('/'), hash: computeHash(bytes), bytes: bytes.length }
}).sort((left, right) => left.path.localeCompare(right.path))
assert.ok(bindings.some(binding => binding.path === 'Driver.ts'))
assert.ok(bindings.some(binding => binding.path === 'live1/g2-generation.request.bin'))
writeFileSync(resolve(destination, 'predecessor-before.json'), `${JSON.stringify(bindings, null, 2)}\n`, { flag: 'wx' })
for (const name of ['types.ts', 'constants.ts', 'helpers.ts', 'Driver.ts', 'Daemon.ts', 'main.ts', 'prepare.ts', 'execute.ts', 'start.ts', 'index.ts', 'tsconfig.json']) {
	copyFileSync(resolve(predecessor, name), resolve(destination, name), constants.COPYFILE_EXCL)
}
mkdirSync(resolve(destination, 'evidence'))
console.log(JSON.stringify({ copied: true, predecessor: bindings.length, network: false }))
