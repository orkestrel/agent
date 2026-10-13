// Applies the Round B scorer changes to a scenario.json and prints them as an RFC 6902 patch list.
import { readFileSync, writeFileSync } from 'node:fs'

const path = process.argv[2]
const scenario = JSON.parse(readFileSync(path, 'utf8'))
const index = (prefix) => scenario.goals.findIndex((goal) => goal.id.startsWith(prefix))
const patch = []

// A stale id given as current: skipped after a retirement word (optionally with an article and "approval code"),
// before a retirement phrase, or before a parenthesis that opens with one; "replaced" or "superseded" after the
// id counts only with an auxiliary or "by", because "MX-4471 replaced MX-4486" states MX-4471 as current.
const stale = (id) =>
	`(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|old|previous|prior|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\b${id}\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:replaced|superseded|dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|no longer)\\b)`

// g05: the MX-4471 pattern is the first forbidden pattern.
const g05 = index('g05')
const mxOld = scenario.goals[g05].forbiddenPatterns[0]
if (!mxOld.includes('mx-4471')) throw new Error('g05 pattern 1 is not the MX-4471 pattern')
scenario.goals[g05].forbiddenPatterns[0] = stale('mx-4471')
patch.push({ op: 'test', path: `/goals/${g05}/forbiddenPatterns/0`, value: mxOld }, { op: 'replace', path: `/goals/${g05}/forbiddenPatterns/0`, value: stale('mx-4471') })

// g03: fail a reply that gives the superseded ticket or the dead code as current.
const g03 = index('g03')
for (const id of ['esc-2291', 'mx-4471']) {
	scenario.goals[g03].forbiddenPatterns.push(stale(id))
	patch.push({ op: 'add', path: `/goals/${g03}/forbiddenPatterns/-`, value: stale(id) })
}

// g08: two more yes verdicts, and their negations as forbidden patterns.
const g08 = index('g08')
for (const verdict of ['sufficient', 'would be approved']) {
	scenario.goals[g08].expectedAny.push(verdict)
	patch.push({ op: 'add', path: `/goals/${g08}/expectedAny/-`, value: verdict })
}
for (const negation of [
	"\\b(?:not|never|no longer|hardly|isn't|aren't|wasn't|won't be|wouldn't be)\\s+(?:\\w+\\s+)?sufficient\\b|\\binsufficient\\b",
	"\\b(?:(?:would|will|could|should)\\s*(?:not|n't)|won't|never)\\s+be\\s+approved\\b",
]) {
	scenario.goals[g08].forbiddenPatterns.push(negation)
	patch.push({ op: 'add', path: `/goals/${g08}/forbiddenPatterns/-`, value: negation })
}

// g07: the bare "Friday, October 9" alternative skips a day-off phrase with up to 3 words between the
// absence word and "tomorrow (", as in "off work tomorrow (Friday, October 9th)".
const g07 = index('g07')
const fridayOld = scenario.goals[g07].forbiddenPatterns[0]
const anchor = "\\(?)\\bfriday,?\\s+(?:oct(?:ober|\\.)?\\s+9(?:th)?|2026-10-09)\\b"
if (fridayOld.split(anchor).length !== 2) throw new Error('g07 pattern 1 has no single bare-Friday alternative')
const dayOff = "(?<!\\b(?:off|out|away|unavailable|absent|leave)(?:\\s+(?!(?:by|before|until|no|due|deadline)\\b)[\\w'-]+){1,3}\\s+tomorrow,?\\s*\\(?)"
const fridayNew = fridayOld.replace(anchor, `\\(?)${dayOff}\\bfriday,?\\s+(?:oct(?:ober|\\.)?\\s+9(?:th)?|2026-10-09)\\b`)
scenario.goals[g07].forbiddenPatterns[0] = fridayNew
patch.push({ op: 'test', path: `/goals/${g07}/forbiddenPatterns/0`, value: fridayOld }, { op: 'replace', path: `/goals/${g07}/forbiddenPatterns/0`, value: fridayNew })

for (const goal of scenario.goals) for (const source of goal.forbiddenPatterns ?? []) new RegExp(source, 'i')
writeFileSync(path, `${JSON.stringify(scenario)}\n`)
process.stdout.write(`${JSON.stringify(patch, null, 1)}\n`)
