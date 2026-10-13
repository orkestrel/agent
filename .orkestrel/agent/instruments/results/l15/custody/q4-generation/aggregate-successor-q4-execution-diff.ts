import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('C:/Users/mikes/WebstormProjects/scaffold')
const before = 'tmp/units/aggregate-final-calibration-run.ts'
const after = 'tmp/units/aggregate-successor-q4-execution-run.ts'
const original = readFileSync(resolve(root, before), 'utf8').split(/\r\n|\n/)
const successor = readFileSync(resolve(root, after), 'utf8').split(/\r\n|\n/)
if (original.at(-1) === '') original.pop()
if (successor.at(-1) === '') successor.pop()
const patch = [
	`--- a/${before}`,
	`+++ b/${after}`,
	`@@ -1,${original.length} +1,${successor.length} @@`,
	...original.map((line) => `-${line}`),
	...successor.map((line) => `+${line}`),
	'',
].join('\n')
writeFileSync(resolve(root, 'tmp/units/aggregate-successor-q4-execution-adaptation-2.patch'), patch, { flag: 'wx' })
