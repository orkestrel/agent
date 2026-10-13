// Compares two dry renders of one wire: every request body byte for byte, the fetch report, each `ledger.jsonl` row,
// `seed.json`, the `ledger.md` table, and each stdout line, with the wall-clock fields alone left out (`wall`,
// `calls[].ms`, `seconds`, and each `N s` or `N.N s` figure). Usage: node compare-dry.mjs DRY_A DRY_B; exits 1 on a difference.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [left, right] = process.argv.slice(2)
const read = (dir, ...path) => readFileSync(join(dir, ...path), 'utf8')
const names = (dir) => readdirSync(join(dir, 'bodies')).sort()
const failures = []
const [a, b] = [names(left), names(right)]
if (JSON.stringify(a) !== JSON.stringify(b)) failures.push(`body lists differ: ${a.length} and ${b.length}`)
let same = 0
for (const name of a) if (b.includes(name) && read(left, 'bodies', name) === read(right, 'bodies', name)) same += 1
	else failures.push(`body ${name} differs`)
const kinds = (list) => ({ chat: list.filter((name) => name.includes('_api_chat')).length, generate: list.filter((name) => name.includes('_api_generate')).length })
if (read(left, 'report.jsonl') !== read(right, 'report.jsonl')) failures.push('report.jsonl differs')
const clock = (value) => {
	if (Array.isArray(value)) return value.map(clock)
	if (value === null || typeof value !== 'object') return value
	return Object.fromEntries(Object.entries(value).filter(([key]) => !['wall', 'ms', 'seconds'].includes(key)).map(([key, item]) => [key, clock(item)]))
}
const rows = (dir) => read(dir, 'out', 'ledger.jsonl').trim().split('\n').map((line) => JSON.stringify(clock(JSON.parse(line))))
const [rowsA, rowsB] = [rows(left), rows(right)]
const sameRows = rowsA.filter((row, at) => row === rowsB[at]).length
if (rowsA.length !== rowsB.length || sameRows !== rowsA.length) failures.push(`rows: ${sameRows} of ${rowsA.length} identical`)
if (JSON.stringify(clock(JSON.parse(read(left, 'out', 'seed.json')))) !== JSON.stringify(clock(JSON.parse(read(right, 'out', 'seed.json'))))) failures.push('seed.json differs')
// The wall column of the md table is its 15th cell; every other `N s` figure is a duration.
const text = (body) => body.split('\n').map((line) => (line.startsWith('| g') ? line.split(' | ').map((cell, at) => (at === 14 ? 'T' : cell)).join(' | ') : line).replace(/\b\d+(?:\.\d+)? s\b/g, 'T s'))
const [outA, outB] = [text(read(left, 'run.txt')), text(read(right, 'run.txt'))]
const sameLines = outA.filter((line, at) => line === outB[at]).length
if (outA.length !== outB.length || sameLines !== outA.length) failures.push(`stdout: ${sameLines} of ${outA.length} lines identical`)
if (JSON.stringify(text(read(left, 'out', 'ledger.md'))) !== JSON.stringify(text(read(right, 'out', 'ledger.md')))) failures.push('ledger.md differs')
const settings = (lines) => lines.find((line) => line.startsWith('settings: '))
const k = kinds(a)
console.log(`bodies ${same} of ${a.length} identical (chat ${k.chat}, judge ${k.generate}); rows ${sameRows} of ${rowsA.length}; stdout lines ${sameLines} of ${outA.length}; settings line ${settings(outA) === settings(outB) ? 'identical' : 'differs'}; ${failures.length === 0 ? 'no difference' : failures.slice(0, 5).join('; ')}`)
process.exit(failures.length === 0 ? 0 : 1)
