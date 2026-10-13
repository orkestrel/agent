import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isRecord, isString, arrayOf } from '@orkestrel/contract'
import { judgments } from './aggregate-successor-label-b-judgments.ts'

const packet = readFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-b-packet.jsonl')
const digest = createHash('sha256').update(packet).digest('hex')
if (digest !== '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5' || packet.length !== 3263411) throw new Error('Packet seal mismatch')
const entries = packet.toString('utf8').split('\n').filter(line => line.length > 0).map(line => {
	const parsed: unknown = JSON.parse(line)
	if (!isRecord(parsed)) throw new Error('Invalid record')
	return parsed
})
if (entries.length !== 179) throw new Error('Census mismatch')
const groups: { readonly semantic: string, readonly records: Record<string, unknown>[] }[] = []
for (const entry of entries) {
	if (!isString(entry.id) || !isString(entry.revision) || !isString(entry.candidate) || !isString(entry.state) || !arrayOf(isRecord)(entry.sources) || !Array.isArray(entry.components) || !isRecord(entry.question)) throw new Error('Invalid fields')
	const state: unknown = JSON.parse(entry.state)
	if (!isRecord(state) || state.candidate !== entry.candidate || !arrayOf(isString)(state.evidence)) throw new Error('Contradictory state')
	const rendered = entry.sources.map(source => `(${source.day}) ${source.role}: ${source.text}`)
	if (JSON.stringify(rendered) !== JSON.stringify(state.evidence)) throw new Error('Contradictory evidence')
	const semantic = JSON.stringify({ candidate: entry.candidate, question: entry.question, state: entry.state, sources: entry.sources })
	const group = groups.find(value => value.semantic === semantic)
	if (group) group.records.push(entry)
	else groups.push({ semantic, records: [entry] })
}
const selected = process.argv[2]
if (selected === undefined) console.log(JSON.stringify({ digest, bytes: packet.length, count: entries.length, groups: groups.map((group, index) => ({ index, count: group.records.length, length: group.semantic.length })) }))
else if (selected !== 'write') {
	const group = groups[Number(selected)]
	if (!group) throw new Error('Missing group')
	const semantic: unknown = JSON.parse(group.semantic)
	if (!isRecord(semantic) || !arrayOf(isRecord)(semantic.sources)) throw new Error('Invalid semantic group')
	console.log(JSON.stringify({ index: Number(selected), count: group.records.length, candidate: semantic.candidate, evidence: semantic.sources.map(source => ({ day: source.day, role: source.role, text: source.text })), question: JSON.stringify(semantic.question) === JSON.stringify(entries[0]?.question) ? 'Exact question equality with group 0 verified' : semantic.question, state: 'Exact candidate and evidence equality verified' }, undefined, 2))
}
if (selected === 'write') {
	if (judgments.length !== groups.length || new Set(judgments.map(judgment => judgment[0])).size !== groups.length) throw new Error('Judgment coverage mismatch')
	const labels = entries.map(entry => {
		const index = groups.findIndex(group => group.records.includes(entry))
		const judgment = judgments.find(value => value[0] === index)
		if (!judgment || !arrayOf(isRecord)(entry.sources)) throw new Error('Missing judgment or sources')
		const sources = entry.sources
		return {
			id: entry.id,
			item: createHash('sha256').update(JSON.stringify(entry)).digest('hex'),
			verdict: judgment[1],
			propositions: judgment[2].map(proposition => ({
				text: proposition[0],
				verdict: proposition[1],
				evidence: proposition[2].map(position => {
					const source = sources[position]
					if (!source || !isString(source.text)) throw new Error('Missing quotation')
					return source.text
				}),
			})),
		}
	})
	const serialized = `${JSON.stringify(labels, undefined, 2)}\n`
	writeFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-b.json', serialized)
	console.log(JSON.stringify({ file: 'aggregate-successor-label-b.json', count: labels.length, groups: groups.length, bytes: Buffer.byteLength(serialized), digest: createHash('sha256').update(serialized).digest('hex'), verdicts: ['supported', 'unsupported', 'contradicted', 'ambiguous'].map(verdict => ({ verdict, count: labels.filter(label => label.verdict === verdict).length })), groupVerdicts: judgments.map(judgment => ({ group: judgment[0], verdict: judgment[1], count: groups[judgment[0]]?.records.length })) }))
}
