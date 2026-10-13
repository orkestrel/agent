// Scores the review finding inputs with the scorer and scenario in place, offline.
import { readFileSync } from 'node:fs'
import { clean, compileRules, plainText, scoreText } from '../../../rescore.mjs'

const file = process.argv[2] ?? new URL('../../../scenario.json', import.meta.url).pathname
const scenario = JSON.parse(readFileSync(file, 'utf8'))
const goal = (prefix) => scenario.goals.find((one) => one.id.startsWith(prefix))
const inputs = [
	['A g04 table', 'g04', '| Current ticket | Superseded |\n| --- | --- |\n| ESC-2291 | ESC-2219 |', 'fail'],
	['B g10 table', 'g10', '| Line | Detail |\n| --- | --- |\n| Do not use | extension 4127 |\n| Dial | 555-0142 |\n| Hours | after 2 pm |', 'fail'],
	['g08 no room', 'g08', 'Halvorsen Interiors has no room for the $3,000 reorder on credit. Their account manager is Ines Albrecht.', 'fail'],
	['g08 doesn’t fit', 'g08', 'The $3,000 reorder doesn’t fit within their available credit; account manager Ines Albrecht.', 'fail'],
	['g08 cannot add', 'g08', 'Halvorsen cannot add another $3,000 on credit; Ines Albrecht manages the account.', 'fail'],
	['g03 comma', 'g03', 'Escalation note: the manager must sign off, and Priya Raman and Marcus Oyelaran are copied. Tracking PW-5521-9930.', 'fail'],
	['g07 tomorrow', 'g07', 'Ask Tomasz Brennan tomorrow; he is out today. Give Freightline pro number FL-660412.', 'fail'],
]
for (const [name, prefix, text, want] of inputs) {
	const scored = scoreText(compileRules(goal(prefix)), text)
	const got = clean(scored) ? 'pass' : 'fail'
	console.log(`${got === want ? 'ok  ' : 'BAD '} ${name}: ${got} (want ${want}) ${JSON.stringify(plainText(text))} missing=${scored.missing.length} patterns=${scored.patterns.map((source) => (goal(prefix).forbiddenPatterns ?? []).indexOf(source) + 1).join(',')}`)
}
