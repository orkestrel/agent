// Applies the review fixes to a scenario.json's goal rules and prints the changed patterns.
import { readFileSync, writeFileSync } from 'node:fs'

const path = process.argv[2]
const scenario = JSON.parse(readFileSync(path, 'utf8'))
const goal = (prefix) => scenario.goals.find((one) => one.id.startsWith(prefix))
let changed = 0
const replaceIn = (one, old, replacement, expected) => {
	let count = 0
	one.forbiddenPatterns = one.forbiddenPatterns.map((source) => {
		if (!source.includes(old)) return source
		count += 1
		return source.replace(old, () => replacement)
	})
	if (count !== expected) throw new Error(`${one.id}: ${count} patterns hold ${old.slice(0, 60)}, expected ${expected}`)
	changed += count
}

// A parenthesis after the stale id exempts it only when it retires that id: "replaced by" or "superseded by",
// or a retirement word that no other code follows within 2 words, as in "(retired)" but not "(previous code MX-4486)".
const parenOld = "(?!\\s*\\(\\s*(?:now\\s+)?(?:replaced|superseded|dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|no longer)\\b)"
const parenNew =
	"(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))"
replaceIn(goal('g05'), parenOld, parenNew, 1)
replaceIn(goal('g03'), parenOld, parenNew, 2)

// g08: every negator before "sufficient", contracted ones included.
const sufficientOld = "\\b(?:not|never|no longer|hardly|isn't|aren't|wasn't|won't be|wouldn't be)\\s+(?:\\w+\\s+)?sufficient\\b|\\binsufficient\\b"
const sufficientNew =
	"\\b(?:not|never|no longer|hardly|no|nor|without|lacks?|lacking|lack of|short of|falls? short(?: of)?|\\w+n't(?:\\s+be)?)\\s+(?:\\w+\\s+)?sufficient\\b|\\binsufficient\\b"
replaceIn(goal('g08'), sufficientOld, sufficientNew, 1)

// g07: the day-off chain before "tomorrow (Friday" holds only day-off words, so "out today so release tomorrow" is no day-off phrase.
const chainOld = "(?:\\s+(?!(?:by|before|until|no|due|deadline)\\b)[\\w'-]+){1,3}\\s+tomorrow"
const chainNew = "(?:\\s+(?:work|sick|of|the|office|from|on|leave|for|all|day|duty)){0,3}\\s+tomorrow"
replaceIn(goal('g07'), chainOld, chainNew, 1)

// g07: a reply whose every "today" states a day off gives no deadline, unless it gives the date.
const dayOffToday =
	"^(?=[\\s\\S]*\\btoday\\b)(?![\\s\\S]*(?<!\\b(?:unavailable|absent|(?:is|are|was|be|been|being|\\w+'s)\\s+(?:\\w+\\s+)?(?:off|out|away)(?:\\s+(?:work|sick|of\\s+(?:the\\s+)?office))?|on\\s+leave)\\s+)\\btoday\\b)(?![\\s\\S]*2026-10-08)"
if (goal('g07').forbiddenPatterns.includes(dayOffToday)) throw new Error('g07 already holds the day-off pattern')
goal('g07').forbiddenPatterns.push(dayOffToday)
changed += 1

for (const one of scenario.goals) for (const source of one.forbiddenPatterns ?? []) new RegExp(source, 'i')
writeFileSync(path, `${JSON.stringify(scenario)}\n`)
process.stdout.write(`${path}: ${changed} patterns changed or added\n`)
