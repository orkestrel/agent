import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let brief = readFileSync('tmp/units/aggregate-successor-g4-fit-brief.md', 'utf8')
for (const [before, after] of [
	['Gemma4', 'Gemma2'], ['g4', 'g2'],
	['gemma4:e4b-it-q4_K_M', 'gemma4:e2b-it-q4_K_M'],
	['root accepted the clean audit unchanged after source review', 'root accepted the independent audit with the original analyst\'s sealed fragment addendum after complete source review'],
	['09d8e5171e2d65dd1a65fd85cc571a13984d03705b4370fc7e63c8c4ae95d819', 'd4c33651a0db676d2b1498224e93613ece7b11b654814f6922c75c3ccd88fa10'],
	['179 labels: 136 supported, 15 contradicted, 28 ambiguous', '174 labels: 132 supported, 20 contradicted, 22 ambiguous'],
	['51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf', '5f2c0c2a781a9e3888b07e17ee9a3fd484984be9a0916c37d6514fcb7ce7a923'],
	['34cacc767afd55db97b611645c3e5e7e5c4ab3a2', '4acb51125833e96aa771574ce248f49cc9ebddc0'],
	['9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36', '470d01c30a1a91e87f6bfd022508487bce1574fb7f31e44229298cbbcc8ec9b9'],
	['Qwen2 generation owns', 'Gemma4 records resource owns'],
]) {
	assert.ok(brief.includes(before), before)
	brief = brief.replaceAll(before, after)
}
brief += '\nUse the checkout TypeScript dispatcher at .agents/skills/orkestrel-dispatch/scripts/launch.ts; do not substitute an installed or dist path in this scaffold checkout. Copy tmp/units/aggregate-successor-g4-fit-read.ts to the owned aggregate-successor-g2-fit-read.ts with only literal g4-to-g2 paths and output identities changed. Preserve every predicate, including the conditional fit-file presence check for accepted versus refused outcomes. Return its exact diff and complete validation captures. The exact model tag gemma4:e2b-it-q4_K_M was read from the accepted model-g2-plan.json fifth entry; do not substitute an alias. Root resolved the fragment cases and sealed the wrapper before fitting.\n'
writeFileSync('tmp/units/aggregate-successor-g2-fit-brief.md', brief)
