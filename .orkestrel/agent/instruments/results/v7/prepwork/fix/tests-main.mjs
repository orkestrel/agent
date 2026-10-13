// Adds the failing-first cases to bench.mjs: the review's synthetic scorer cases, the g07 hand-read verdict, and the guard fixtures.
import { swap } from './swap.mjs'

const file = '/home/user/agent/tmp/bench/bench.mjs'
const lastSynthetic =
	"\t\t{ goal: 'g07', text: 'Tomasz Brennan is off work tomorrow (Friday, October 9th), so release it by Friday. Ask him today. Pro number FL-660412.', outcome: 'pattern' },\n\t]\n\tconst byPrefix"
const added = [
	"{ goal: 'g05', text: 'Refund $289.00, approval code MX-4471 (previous code MX-4486 is no longer valid).', outcome: 'pattern' }",
	"{ goal: 'g05', text: 'Refund $289.00, approval code MX-4471 (replaced MX-4486).', outcome: 'pattern' }",
	"{ goal: 'g05', text: 'Refund $289.00 under approval code MX-4486; do not use MX-4471 (retired).', outcome: 'pass' }",
	"{ goal: 'g03', text: 'Sign-off: Marcus Oyelaran; copy Priya Raman; tracking PW-5521-9930; approval code MX-4471 (previous code MX-4486 is no longer valid).', outcome: 'pattern' }",
	"{ goal: 'g03', text: 'Sign-off: Marcus Oyelaran; copy Priya Raman; tracking PW-5521-9930; approval code MX-4471 (replaced MX-4486).', outcome: 'pattern' }",
	"{ goal: 'g03', text: 'Sign-off: Marcus Oyelaran; copy Priya Raman; tracking PW-5521-9930; ticket ESC-2291 (replaced ESC-2219).', outcome: 'pattern' }",
	"{ goal: 'g08', text: 'Halvorsen lacks sufficient available credit for the $3,000 reorder; account manager Ines Albrecht.', outcome: 'pattern' }",
	"{ goal: 'g08', text: 'Without sufficient credit, the $3,000 reorder is held. Account manager Ines Albrecht.', outcome: 'pattern' }",
	"{ goal: 'g08', text: 'Halvorsen doesn’t have sufficient credit for the $3,000 reorder; account manager Ines Albrecht.', outcome: 'pattern' }",
	"{ goal: 'g07', text: 'Ask Tomasz Brennan for the release; he is unavailable today. Pro number FL-660412.', outcome: 'pattern' }",
	"{ goal: 'g07', text: 'Ask Tomasz Brennan today. Pro number FL-660412.', outcome: 'pass' }",
	"{ goal: 'g07', text: 'Reach out today to Tomasz Brennan for the release. Pro number FL-660412.', outcome: 'pass' }",
	"{ goal: 'g07', text: 'Tomasz Brennan is out today so release tomorrow (Friday, October 9th). Ask him today. Pro number FL-660412.', outcome: 'pattern' }",
]
export const SYNTHETIC_ADDED = added

swap(file, [
	[lastSynthetic, lastSynthetic.replace('\n\t]\n', `\n${added.map((line) => `\t\t${line},`).join('\n')}\n\t]\n`)],
	[
		`		goal: 'g07-depot-release',
		pass: true,
		reading:
			'false fail: "off work tomorrow (Friday, October 9th)" states the day off, not a deadline; the rubric fails the reply for its missing deadline, but "today" matches inside "unavailable today", so no scenario rule fails it',`,
		`		goal: 'g07-depot-release',
		pass: false,
		reading:
			'strict fail: "off work tomorrow (Friday, October 9th)" states the day off, not a deadline, and "today" sits only in "unavailable today", so the reply gives no deadline, which the rubric fails',`,
	],
	[
		`		{
			label: 'merge of sections with no identifier and no user or tool message whose summary is No facts.',
			kind: 'merge',
			messages: [`,
		`		{
			// A merge's input is its sections' summaries, all assistant messages, so the merged sections'
			// messages decide whether the input states facts.
			label: 'merge of id-free sections whose sources hold the fee withdrawal and whose first summary is No facts.',
			kind: 'merge',
			sources: seedFold(44, 45),
			messages: [
				{ id: 'section-5', role: 'assistant', content: 'The director scrapped the restocking fee; opened-item returns get a full refund.' },
				{ id: 'section-6', role: 'assistant', content: 'Dana asked about the label printer.' },
			],
			reply: (extra) => (extra === '' ? NO_FACTS : withdrawal),
			check: (entry, summary) =>
				entry.retried.join() !== 'empty'
					? \`retried \${list(entry.retried)}, expected empty\`
					: entry.kept !== 'retry'
						? \`kept \${entry.kept}, expected retry\`
						: summary === withdrawal
							? undefined
							: 'the summary is not the retry',
		},
		{
			// A send_reply result states no fact, so these sources hold no user message and no lookup result.
			label: 'merge of id-free sections whose sources hold no user message and no lookup result, and whose summary is No facts.',
			kind: 'merge',
			sources: [
				{ id: 'chatter-1', role: 'assistant', content: 'Happy to help with the label printer.', calls: [{ id: 'call_6', name: 'send_reply', arguments: { text: 'The printer is back online.' } }] },
				{ id: 'chatter-2', role: 'tool', call: 'call_6', content: 'sent' },
			],
			messages: [`,
	],
	[
		`				return kept.length > 0 ? \`the summary holds \${list(kept)}, which only the assistant reply states\` : undefined
			},
		},
	]`,
		`				return kept.length > 0 ? \`the summary holds \${list(kept)}, which only the assistant reply states\` : undefined
			},
		},
		{
			// A search_history result writes each hit as its role and content, so it quotes the model's own
			// earlier reply verbatim, as the Round A MX-4471 answer was.
			label: 'goal fold whose summary drops an identifier that only a search_history result quoting an assistant reply states',
			kind: 'fold',
			messages: [
				{ id: 'guard-11', role: 'user', content: "Which approval code goes on the escalation note for Luis Ferreira's mixer refund?" },
				{ id: 'guard-12', role: 'assistant', content: '', calls: [{ id: 'call_4', name: 'search_history', arguments: { query: 'MX-4471' } }] },
				{ id: 'guard-13', role: 'tool', call: 'call_4', content: 'user: Which approval code does a refund over $200 need?\\nassistant: Manager approval code MX-4471 is required.' },
				{ id: 'guard-14', role: 'assistant', content: '', calls: [{ id: 'call_5', name: 'lookup_order', arguments: { id: 'LH-79215' } }] },
				{ id: 'guard-15', role: 'tool', call: 'call_5', content: scenario.tools.lookup_order['LH-79215'] },
			],
			reply: () => 'On Thursday 2026-10-08 Dana asked which approval code goes on the escalation note for the mixer refund.',
			check: (entry, summary) => {
				const quoted = entry.restored.filter((sentence) => idTokens(sentence).has('mx-4471'))
				if (quoted.length > 0) return \`restored \${list(quoted.map((sentence) => JSON.stringify(sentence)))}, which only the search result states\`
				if (idTokens(summary).has('mx-4471')) return 'the summary holds MX-4471, which only the search result states'
				return idTokens(summary).has('lh-79215') ? undefined : 'the summary lacks LH-79215, which the lookup result states'
			},
		},
	]`,
	],
	[
		`	// Restores quote only user and tool messages, of the input or, for a merge, of the merged sections.
	const grounded = (fixture) => (fixture.sources ?? fixture.messages).filter((message) => message.role === 'user' || message.role === 'tool')`,
		`	// Restores quote only user messages and lookup results, of the input or, for a merge, of the merged
	// sections; a search result quotes earlier messages, the model's replies among them.
	const grounded = (fixture) => {
		const messages = fixture.sources ?? fixture.messages
		const names = new Map(messages.flatMap((message) => (message.calls ?? []).map((call) => [call.id, call.name])))
		const record = (message) => ['lookup_order', 'lookup_customer'].includes(names.get(message.call) ?? callNames.get(message.call))
		return messages.filter((message) => message.role === 'user' || (message.role === 'tool' && record(message)))
	}`,
	],
])
