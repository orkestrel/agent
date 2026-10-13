import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { PACKET, PREPARED, ROOT, UNIT } from './constants.ts'
import { computeOperator, readFileBinding, scanInventory } from './helpers.ts'

writeFileSync(resolve(UNIT, 'final-additions.diff'), scanInventory(UNIT).filter(binding => binding.path.endsWith('.ts') || binding.path.endsWith('/tsconfig.json')).map(binding => `diff --git a/${binding.path} b/${binding.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${binding.path}\n@@ -0,0 +1,${readFileSync(resolve(ROOT, binding.path), 'utf8').replace(/\n$/, '').split(/\r\n|\n/).length} @@\n${readFileSync(resolve(ROOT, binding.path), 'utf8').replace(/\n$/, '').split(/\r\n|\n/).map(line => `+${line}`).join('\n')}\n`).join(''), { flag: 'wx' })
writeArtifact(resolve(UNIT, 'final-source-inventory.json'), { operator: computeOperator(), packet: readFileBinding(PACKET), prepared: readFileBinding(resolve(PREPARED, 'inventory.json')), sources: scanInventory(UNIT), checks: scanInventory(resolve(UNIT, 'checks')) })
console.log(JSON.stringify(readFileBinding(resolve(UNIT, 'final-source-inventory.json'))))
