// Adds the failing-first cases to bench3/bench.mjs: the main harness's added synthetic cases and the fabricated cases.
import { readFileSync } from 'node:fs'
import { swap } from './swap.mjs'

const file = '/home/user/agent/tmp/bench3/bench.mjs'
const main = readFileSync('/home/user/agent/tmp/bench/bench.mjs', 'utf8')
const start = main.indexOf("\t\t{ goal: 'g05', text: 'Refund $289.00, approval code MX-4471 (previous code MX-4486 is no longer valid).'")
const end = main.indexOf('\t]\n\tconst byPrefix', start)
if (start < 0 || end < 0) throw new Error('the main harness lacks the added cases')
const added = main.slice(start, end)
const last =
	"\t\t{ goal: 'g07', text: 'Tomasz Brennan is off work tomorrow (Friday, October 9th), so release it by Friday. Ask him today. Pro number FL-660412.', outcome: 'pattern' },\n\t]\n\tconst byPrefix"
swap(file, [
	[last, last.replace('\t]\n', `${added}\t]\n`)],
	[
		"\tconst stated = 'Order LH-79215 for account LH-44870 (Luis Ferreira): stand mixer, 5 quart, total $289.00. Account LH-31055: credit limit $5,000.00 with $1,240.00 outstanding.'",
		"\tconst stated =\n\t\t'Order LH-79215 for account LH-44870 (Luis Ferreira): stand mixer, 5 quart, total $289.00. Account LH-31055: credit limit $5,000.00 with $1,240.00 outstanding. Pickup on October 9 at bay\\n12.'",
	],
	[
		"\t\t{ text: 'Refund $245.65 after the 15 percent fee on $289.00.', invented: ['245.65', '15'] },\n\t]",
		"\t\t{ text: 'Refund $245.65 after the 15 percent fee on $289.00.', invented: ['245.65', '15'] },\n\t\t{ text: 'Refund $280.00 on the $289.00 mixer, noted October 9.', invented: ['280'] },\n\t\t{ text: 'Load it at BAY-12.', invented: ['BAY-12'] },\n\t]",
	],
])
