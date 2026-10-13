// Applies the review fixes for g03, g07, g08, and the shared Friday pattern to one scenario file, in place,
// keeping its one-line form.
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
const text = readFileSync(file, 'utf8')
const scenario = JSON.parse(text)
const goal = (prefix) => scenario.goals.find((one) => one.id.startsWith(prefix))
const replaceOne = (list, from, to) => {
	const at = list.indexOf(from)
	if (at < 0) throw new Error(`${file}: pattern not found: ${from.slice(0, 60)}`)
	list[at] = to
}

const oldTie = String.raw`^(?![\s\S]*(?:\bmarcus\b[^.\n]*\b(?:sign|approv)|\b(?:sign|approv)[^.\n]*\bmarcus\b))`
const subject = String.raw`\bmarcus\b(?:\s+oyelaran\b)?(?:'s)?(?:\s*\([^()\n]*\))?(?:,\s*[^,.;\n]{1,40},)?(?:\s*[-–—])?\s+(?:(?:must|will|needs?\s+to|has\s+to|is\s+to|to|shall|should)\s+)?(?:sign|approv)`
const label = String.raw`\b(?:sign(?:s|ed|ing)?(?:[-\s]?offs?)?|approv\w*|signature)(?:\s+(?:is\s+)?required)?\s*(?:[:¦]|\bby\b|\bfrom\b)\s*(?:(?!(?:and|or)\b)[\w'-]+\s+){0,2}marcus\b`
replaceOne(goal('g03').forbiddenPatterns, oldTie, String.raw`^(?![\s\S]*(?:${subject}|${label}))`)

const oldDeadline = String.raw`\bdeadline\s*(?::|is)?\s*(?:this\s+)?friday\b`
const newDeadline = String.raw`\bdeadline\s*(?:[:¦]|is)?\s*(?:this\s+)?friday\b`
for (const prefix of ['g07', 'g10']) {
	const patterns = goal(prefix).forbiddenPatterns
	const at = patterns.findIndex((source) => source.includes(oldDeadline))
	if (at < 0) throw new Error(`${file}: ${prefix} has no Friday deadline pattern`)
	patterns[at] = patterns[at].replace(oldDeadline, newDeadline)
}
goal('g07').forbiddenPatterns.push(
	String.raw`\b(?:ask|asking|reach|contact|call|message|email|ping|tell|notify)\s+(?:(?!today\b)[\w'-]+\s+){0,3}(?<!\b(?:off|out|away|unavailable|absent|not|before|than)\s+)tomorrow\b|(?<!\b(?:off|out|away|unavailable|absent|leave)\s+)\b(?:by|until|no later than|due)\s+(?:the\s+end\s+of\s+(?:the\s+day\s+)?)?tomorrow\b|\bdeadline\s*(?:[:¦]|is)?\s*tomorrow\b`,
)

const g08 = goal('g08')
const negative = ['does not fit', "doesn't fit", 'exceeds', 'no', 'cannot', "can't"]
for (const entry of negative) if (!g08.expectedAny.includes(entry)) throw new Error(`${file}: g08 lacks ${entry}`)
g08.expectedAny = g08.expectedAny.filter((entry) => !negative.includes(entry))
replaceOne(g08.forbiddenPatterns, String.raw`(?:^|[\n:?])\s*no\b(?=\s*(?:[,.;:!—–-]|$))`, String.raw`(?:^|[\n:?¦])\s*no\b(?=\s*(?:[,.;:!—–¦-]|$))`)

writeFileSync(file, `${JSON.stringify(scenario)}\n`)
