import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { LEDGER_QUESTIONS } from '../../dist/src/core/index.js'

export function readJSON(path) {
	return JSON.parse(readFileSync(path, 'utf8'))
}

export function readRows(path) {
	return readFileSync(path, 'utf8').split(/\r\n|\n/).filter((line) => line.trim() !== '').map((line) => JSON.parse(line))
}

export function computeDigest(value) {
	return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
}

export function describeError(error) {
	const messages = []
	const seen = new Set()
	while (error !== undefined && !seen.has(error)) {
		seen.add(error)
		messages.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
		error = error instanceof Error ? error.cause : undefined
	}
	return messages.join(' <- ')
}

export function buildSystem(scenario) {
	let text = scenario.ledger.system
		.replace('You must finish every request by calling send_reply with the complete answer; only the send_reply text counts as your answer.', 'Finish every request with your complete answer as your final message; that message is what the shift lead receives.')
		.replace('the exact value you will use, before send_reply.', 'the exact value you will use, before your final answer.')
		.replace(/ After a lookup, you must call pin\b[^.]*\./, '')
	const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${scenario.ledger.clock}T00:00:00Z`))
	const date = `Today is ${weekday} ${scenario.ledger.clock}.`
	const end = text.indexOf('. ')
	text = end < 0 ? `${text} ${date}` : `${text.slice(0, end + 2)}${date} ${text.slice(end + 2)}`
	return `${text} Never cite a handle such as m12 or r5 in your answer.`
}

export function buildJudgment(row, messages, topics, model) {
	const message = messages[row.index]
	let question, sources, state, key
	if (row.question === 'category' && message !== undefined) {
		if (!['forward', 'reverse'].includes(row.order)) return undefined
		question = row.order === 'reverse'
			? { ...LEDGER_QUESTIONS.category, criteria: Object.fromEntries(Object.entries(LEDGER_QUESTIONS.category.criteria).reverse()) }
			: LEDGER_QUESTIONS.category
		key = row.order === 'reverse' ? ['category', message.id, 'reverse'] : ['category', message.id]
		sources = [message.id]
		state = `${message.role}: ${message.content}`
	} else if (row.question === 'topic' && message !== undefined) {
		const topic = topics.find((topic) => topic.name === row.topic)
		if (topic === undefined) return undefined
		question = { form: 'noul', instructions: LEDGER_QUESTIONS.topic, criteria: { true: `The message concerns ${topic.name}: ${topic.criterion}`, false: `The message does not concern ${topic.name}` } }
		key = ['topic', message.id, topic.name]
		sources = [message.id]
		state = `${message.role}: ${message.content}`
	} else if (['amends', 'supersedes'].includes(row.question)) {
		const earlier = messages[row.earlier], later = messages[row.later]
		if (earlier === undefined || later === undefined) return undefined
		question = LEDGER_QUESTIONS[row.question]
		key = [row.question, earlier.id, later.id]
		sources = [earlier.id, later.id]
		state = `Earlier message: ${earlier.role}: ${earlier.content}\nLater message: ${later.role}: ${later.content}`
	} else return undefined
	if (row.asked !== undefined && row.asked !== JSON.stringify(question)) return undefined
	return { id: JSON.stringify(key), question, sources, state, model }
}

export function readLookup(args, text) {
	if (/^no record\b/i.test(text)) return undefined
	const ids = new Set()
	const argument = String(args.id ?? args.account ?? '').trim().toUpperCase()
	if (argument !== '') ids.add(argument)
	for (const [, id] of text.matchAll(/\b(?:order|account|ticket)\s+([A-Z]{2,}-\d+)/gi)) ids.add(id.toUpperCase())
	const owners = new Map()
	for (const pattern of [/\baccount\s+([A-Z]{2,}-\d+)\s*\(([^)]+)\)/gi, /\baccount\s+([A-Z]{2,}-\d+):\s*([^,.;]+)/gi]) {
		for (const [, id, name] of text.matchAll(pattern)) {
			if (!/\p{L}/u.test(name)) continue
			const names = owners.get(id.toUpperCase()) ?? []
			if (!names.includes(name.trim())) names.push(name.trim())
			owners.set(id.toUpperCase(), names)
		}
	}
	return { ids: [...ids], owners: [...owners].map(([id, names]) => ({ id, names })) }
}
