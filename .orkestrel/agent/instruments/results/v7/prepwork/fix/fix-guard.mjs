// Restricts the guard's grounded messages to user messages and lookup results, and reads a merge's facts from its sources.
import { swap } from './swap.mjs'

swap('/home/user/agent/tmp/bench/bench.mjs', [
	[
		`// A user or tool message states what the desk said or a tool returned; an assistant message holds the
// model's own words, which can be wrong, so the guard never restores from one.
function grounded(message) {
	return message.role === 'user' || message.role === 'tool'
}

// For each lost identifier, the last user or tool sentence of \`sources\` that holds it, verbatim; a
// sentence that holds several lost identifiers appears once, and the sentences keep their source
// order. An identifier that no user or tool sentence holds is not restored.
function restoringSentences(sources, lost) {
	const wanted = new Set(lost.map((token) => token.toLowerCase()))
	const sentences = sources.filter(grounded).flatMap(inputSentences)`,
		`// The tools whose result states a record. A \`search_history\` result writes each hit as its role and
// content, so it quotes the model's own earlier replies, and a \`send_reply\` result states nothing.
const RECORD_TOOLS = new Set(['lookup_order', 'lookup_customer'])

// The messages of \`messages\` that state what the desk said or a record holds: user messages and lookup
// results. An assistant message holds the model's own words, which can be wrong, and so can a search
// result, so the guard never restores from either. A result's tool name comes from a call among
// \`messages\`, else from \`callNames\`.
function groundedMessages(messages) {
	const names = new Map(messages.flatMap((message) => (message.calls ?? []).map((call) => [call.id, call.name])))
	const record = (message) => RECORD_TOOLS.has(names.get(message.call) ?? callNames.get(message.call))
	return messages.filter((message) => message.role === 'user' || (message.role === 'tool' && record(message)))
}

// For each lost identifier, the last sentence of a grounded message of \`sources\` that holds it,
// verbatim; a sentence that holds several lost identifiers appears once, and the sentences keep their
// source order. An identifier that no such sentence holds is not restored.
function restoringSentences(sources, lost) {
	const wanted = new Set(lost.map((token) => token.toLowerCase()))
	const sentences = groundedMessages(sources).flatMap(inputSentences)`,
	],
	[
		` * identifiers named; an empty summary or \`No facts.\` over an input that holds an identifier or a user
 * or tool message is a failure too, and its retry also states that the messages hold facts. The guard
 * keeps the retry when it lacks fewer identifiers, or as many when the first summary was empty and
 * the retry is not. Each identifier still missing is restored by appending, verbatim, the last user or
 * tool sentence of \`sources\` that holds it (see \`restoringSentences\`), and those sentences replace an
 * empty summary.`,
		` * identifiers named; an empty summary or \`No facts.\` over an input that holds an identifier, or over
 * \`sources\` that hold a user message or a lookup result (see \`groundedMessages\`), is a failure too, and
 * its retry also states that the messages hold facts. The guard keeps the retry when it lacks fewer
 * identifiers, or as many when the first summary was empty and the retry is not. Each identifier still
 * missing is restored by appending, verbatim, the last sentence of such a message of \`sources\` that
 * holds it (see \`restoringSentences\`), and those sentences replace an empty summary.`,
	],
	['\tconst facts = messages.some(grounded)\n', '\tconst facts = groundedMessages(sources).length > 0\n'],
	[
		`// The per-goal guard deltas: retries, calls that dropped sentences, calls whose first summary was empty
// or \`No facts.\` over identifiers or a user or tool message, and calls that lost identifiers.`,
		`// The per-goal guard deltas: retries, calls that dropped sentences, calls whose first summary was empty
// or \`No facts.\` over identifiers or a user message or lookup result, and calls that lost identifiers.`,
	],
	[
		`	agent.emitter.on('tool', (call, result) => {
		if (call.name === 'search_history') state.searches.add(call.id)`,
		`	agent.emitter.on('tool', (call, result) => {
		// A fold can take a result before any request carries its call, and the guard reads the tool name.
		callNames.set(call.id, call.name)
		if (call.name === 'search_history') state.searches.add(call.id)`,
	],
	[
		`// Runs \`guardSummary\` over nine fixtures with a stubbed summarizer and asks no model. Returns false
// when a final summary carries an identifier that neither its input nor a user or tool message of its
// sources states, lacks an identifier of its input that such a message states, holds an \`Identifiers:\`
// line, or appends a sentence that is not a user or tool sentence verbatim, or when a fixture's own
// check fails.`,
		`// Runs \`guardSummary\` over eleven fixtures with a stubbed summarizer and asks no model. Returns false
// when a final summary carries an identifier that neither its input nor a user message or lookup result
// of its sources states, lacks an identifier of its input that such a message states, holds an
// \`Identifiers:\` line, or appends a sentence that is not a user or lookup sentence verbatim, or when a
// fixture's own check fails.`,
	],
	[
		`			...(invented.length > 0 || absent.length > 0 ? ['an invented identifier or an absent one that a user or tool message states'] : []),`,
		`			...(invented.length > 0 || absent.length > 0 ? ['an invented identifier or an absent one that a user message or lookup result states'] : []),`,
	],
	[
		`			...(entry.restored.some((sentence) => !sentences.has(sentence)) ? ['a restored sentence that is not a user or tool sentence'] : []),`,
		`			...(entry.restored.some((sentence) => !sentences.has(sentence)) ? ['a restored sentence that is not a user or lookup sentence'] : []),`,
	],
])
