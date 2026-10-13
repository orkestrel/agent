// Builds the scenario.json scoring changes as an RFC 6902 patch list; `--apply` writes them to scenario.json.
import { readFileSync, writeFileSync } from 'node:fs'
const PATH = process.env.SCENARIO ?? '/home/user/agent/tmp/bench/scenario.json'
const scenario = JSON.parse(readFileSync(PATH, 'utf8'))
const at = (prefix) => scenario.goals.findIndex((goal) => goal.id.startsWith(prefix))
const g = (prefix) => scenario.goals[at(prefix)]
// g03: fails when no sentence ties Marcus to the sign-off (a sign or approve word in the sentence that names him).
const MARCUS_SIGNS = '^(?![\\s\\S]*(?:\\bmarcus\\b[^.\\n]*\\b(?:sign|approv)|\\b(?:sign|approv)[^.\\n]*\\bmarcus\\b))'
// g10: 555-0142 as a number to dial, unless a negation sits up to 4 words before it.
const SWITCHBOARD = "(?<!\\b(?:not|never|instead of|rather than|avoid|skip|don't|do not)\\s+(?:[\\w'’-]+\\s+){0,4}[(\"'“]?)\\b555-0142\\b"
// g10: the 2 pm time stated as a deadline rather than the start of her hours.
const BEFORE_TWO = '\\b(?:before|by|until|no later than)\\s+2(?::00)?\\s*(?:pm|p\\.m\\.)'
// g08: the negative verdict forms the widened expectedAny admits.
const NOT_FIT = "\\b(?:does|do|will|would)\\s*(?:not|n't)\\s+fit\\b"
const CANNOT = "\\b(?:cannot|can't|can not)\\s+(?:be\\s+)?(?:approved?|afford|fit|cover|accommodate|proceed|go|put|place|take)\\b"
const NO_VERDICT = '(?:^|[\\n:?])\\s*no\\b(?=\\s*(?:[,.;:!—–-]|$))'
const TIME = ['2 pm', '2pm', '2:00 pm', '2:00pm', '2 p.m.', '2:00 p.m.', '14:00']
const VERDICT = [
	...g('g08').expectedAny,
	'does fit', 'yes',
	'can afford', 'can proceed', 'can go', 'can put', 'can be put', 'can place', 'can be placed', 'can take', 'can cover', 'can accommodate', 'can approve', 'can be approved',
	'does not fit', "doesn't fit", 'exceeds', 'no', 'cannot', "can't",
]
const patch = [
	{ op: 'replace', path: `/goals/${at('g01')}/tools`, value: ['lookup_order', 'send_reply'] },
	{ op: 'replace', path: `/goals/${at('g03')}/tools`, value: ['lookup_order', 'send_reply'] },
	{ op: 'add', path: `/goals/${at('g03')}/forbiddenPatterns/-`, value: MARCUS_SIGNS },
	{ op: 'replace', path: `/goals/${at('g05')}/tools`, value: ['lookup_order', 'send_reply'] },
	{ op: 'add', path: `/goals/${at('g07')}/expectedAny`, value: ['today', '2026-10-08'] },
	{ op: 'replace', path: `/goals/${at('g07')}/tools`, value: ['lookup_order', 'send_reply'] },
	{ op: 'replace', path: `/goals/${at('g08')}/expectedAny`, value: VERDICT },
	{ op: 'add', path: `/goals/${at('g08')}/forbiddenPatterns/-`, value: NOT_FIT },
	{ op: 'add', path: `/goals/${at('g08')}/forbiddenPatterns/-`, value: CANNOT },
	{ op: 'add', path: `/goals/${at('g08')}/forbiddenPatterns/-`, value: NO_VERDICT },
	{ op: 'replace', path: `/goals/${at('g09')}/tools`, value: ['lookup_order', 'search_history', 'send_reply'] },
	{ op: 'add', path: `/goals/${at('g10')}/expectedAny`, value: TIME },
	{ op: 'add', path: `/goals/${at('g10')}/forbiddenPatterns/-`, value: SWITCHBOARD },
	{ op: 'add', path: `/goals/${at('g10')}/forbiddenPatterns/-`, value: BEFORE_TWO },
]
// Applies the patch; a new member lands after `expected`, the place g08 gives `expectedAny`.
function apply(doc, ops) {
	for (const { op, path, value } of ops) {
		const parts = path.split('/').slice(1)
		const key = parts.pop()
		const parent = parts.reduce((node, part) => node[part], doc)
		if (Array.isArray(parent)) {
			if (op !== 'add' || key !== '-') throw new Error(`unsupported ${op} ${path}`)
			parent.push(value)
			continue
		}
		if (op === 'replace' && !Object.hasOwn(parent, key)) throw new Error(`replace of a missing member ${path}`)
		if (op === 'add' && Object.hasOwn(parent, key)) throw new Error(`add over an existing member ${path}`)
		if (op === 'replace') { parent[key] = value; continue }
		const entries = Object.entries(parent)
		const after = entries.findIndex(([name]) => name === 'expected')
		entries.splice(after + 1, 0, [key, value])
		for (const name of Object.keys(parent)) delete parent[name]
		Object.assign(parent, Object.fromEntries(entries))
	}
	return doc
}
for (const { value } of patch) if (typeof value === 'string') new RegExp(value, 'i')
if (process.argv.includes('--apply')) {
	writeFileSync(PATH, `${JSON.stringify(apply(scenario, patch))}\n`)
	process.stdout.write(`applied ${patch.length} operations to ${PATH}\n`)
} else process.stdout.write(`${JSON.stringify(patch, null, 1)}\n`)
