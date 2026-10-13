import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { arrayOf, isRecord, isString } from '@orkestrel/contract'

const packet = readFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-b-packet.jsonl')
const input = createHash('sha256').update(packet).digest('hex')
if (input !== '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5' || packet.length !== 3263411) throw new Error('Input seal mismatch')
const entries = packet.toString('utf8').split('\n').filter(line => line.length > 0).map(line => {
	const parsed: unknown = JSON.parse(line)
	if (!isRecord(parsed) || !isString(parsed.id)) throw new Error('Packet shape')
	return parsed
})
if (entries.length !== 179 || new Set(entries.map(entry => entry.id)).size !== 179) throw new Error('Input census or identity')
const output = readFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-b.json')
const labels: unknown = JSON.parse(output.toString('utf8'))
if (!arrayOf(isRecord)(labels)) throw new Error('Output shape')
const first = labels[0]
if (!first || !arrayOf(isRecord)(first.propositions)) throw new Error('Control setup')
const proposition = first.propositions[0]
if (!proposition) throw new Error('Control proposition setup')
const scenarios = [
	{ name: 'valid', labels },
	{ name: 'missing occurrence', labels: labels.slice(1) },
	{ name: 'foreign identity', labels: [{ ...first, id: 'negative-control-foreign-id' }, ...labels.slice(1)] },
	{ name: 'wrong item hash', labels: [{ ...first, item: 'negative-control-wrong-hash' }, ...labels.slice(1)] },
	{ name: 'invented quotation', labels: [{ ...first, propositions: [{ ...proposition, evidence: ['NEGATIVE CONTROL: no such source quotation.'] }, ...first.propositions.slice(1)] }, ...labels.slice(1)] },
]
const readings: { readonly name: string, readonly accepted: boolean, readonly reason: string }[] = []
let propositions = 0
let quotations = 0
for (const scenario of scenarios) {
	let accepted = false
	let reason = ''
	try {
		if (scenario.labels.length !== entries.length || new Set(scenario.labels.map(label => label.id)).size !== entries.length) throw new Error('Coverage mismatch')
		for (const label of scenario.labels) {
			if (Object.keys(label).sort().join(',') !== 'id,item,propositions,verdict') throw new Error('Output field mismatch')
			if (!isString(label.id) || !isString(label.item) || !isString(label.verdict) || !['supported', 'unsupported', 'contradicted', 'ambiguous'].includes(label.verdict) || !arrayOf(isRecord)(label.propositions) || label.propositions.length === 0) throw new Error('Output record mismatch')
			const entry = entries.find(value => value.id === label.id)
			if (!entry || !arrayOf(isRecord)(entry.sources)) throw new Error('Unknown occurrence')
			if (label.item !== createHash('sha256').update(JSON.stringify(entry)).digest('hex')) throw new Error('Item digest mismatch')
			const sources = entry.sources.map(source => source.text)
			if (!arrayOf(isString)(sources)) throw new Error('Source text mismatch')
			for (const claim of label.propositions) {
				if (Object.keys(claim).sort().join(',') !== 'evidence,text,verdict') throw new Error('Proposition field mismatch')
				if (!isString(claim.text) || claim.text.length === 0 || !isString(claim.verdict) || !['supported', 'unsupported', 'contradicted', 'ambiguous'].includes(claim.verdict) || !arrayOf(isString)(claim.evidence) || claim.evidence.length === 0) throw new Error('Proposition shape mismatch')
				for (const quote of claim.evidence) {
					if (quote.length === 0 || !sources.some(source => source.includes(quote))) throw new Error('Quotation mismatch')
					if (scenario.name === 'valid') quotations += 1
				}
				if (scenario.name === 'valid') propositions += 1
			}
			if (label.verdict === 'supported' && label.propositions.some(claim => claim.verdict !== 'supported')) throw new Error('Positive verdict consistency mismatch')
			if (!label.propositions.some(claim => claim.verdict === label.verdict)) throw new Error('Verdict proposition missing')
		}
		accepted = true
		reason = 'ID/hash bijection, schema, verdict consistency, and literal quotations passed'
	} catch (error) {
		reason = error instanceof Error ? error.message : String(error)
	}
	if (accepted !== (scenario.name === 'valid')) throw new Error(`Unexpected validation result: ${scenario.name}: ${reason}`)
	readings.push({ name: scenario.name, accepted, reason })
}
const groups: { readonly key: string, readonly ids: unknown[], readonly verdict: unknown }[] = []
for (const entry of entries) {
	const key = JSON.stringify({ candidate: entry.candidate, question: entry.question, state: entry.state, sources: entry.sources })
	const label = labels.find(value => value.id === entry.id)
	if (!label) throw new Error('Missing label')
	const group = groups.find(value => value.key === key)
	if (group) {
		if (group.verdict !== label.verdict) throw new Error('Duplicate verdict drift')
		group.ids.push(entry.id)
	} else groups.push({ key, ids: [entry.id], verdict: label.verdict })
}
const digest = createHash('sha256').update(output).digest('hex')
const census = ['supported', 'unsupported', 'contradicted', 'ambiguous'].map(verdict => ({ verdict, occurrences: labels.filter(label => label.verdict === verdict).length, groups: groups.filter(group => group.verdict === verdict).length }))
const report = [
	'# Independent support labeling: alias b',
	'',
	'All 179 packet occurrences have proposition judgments. Root owns adjudication and acceptance. The judgments use only the released alias packet; no model identity, scores, earlier grades, private mappings, other packets, or campaign artifacts were read.',
	'',
	'## Seals and census',
	'',
	'Run: `node tmp/units/aggregate-successor-label-b-reader.ts write`, followed by `node tmp/units/aggregate-successor-label-b-check.ts` from `C:/Users/mikes/WebstormProjects/scaffold`.',
	'',
	`- Input: \`tmp/units/aggregate-successor-label-b-packet.jsonl\`; SHA256 \`${input}\`; ${packet.length} bytes; ${entries.length} records and unique occurrence IDs.`,
	`- Output: \`tmp/units/aggregate-successor-label-b.json\`; SHA256 \`${digest}\`; ${output.length} bytes; ${labels.length} labels; ${propositions} propositions; ${quotations} checked literal source quotations.`,
	`- Exact semantic groups: ${groups.length}. Every item digest is SHA256(JSON.stringify(originalParsedItem)) in the original parsed property order. This binds each occurrence to its unchanged revision and components as well as its semantic fields. No original item was modified.`,
	'',
	'Verdict census from the check run:',
	'',
	'| Verdict | Occurrences | Exact groups |',
	'| --- | ---: | ---: |',
	...census.map(row => `| ${row.verdict} | ${row.occurrences} | ${row.groups} |`),
	'',
	'## Method and checks',
	'',
	'The reader checked the released byte count and SHA256 before parsing. It checked each record structure, then parsed state and required exact equality between state.candidate and candidate, and between state.evidence and the ordered source strings rendered with their day and role. The question in every displayed group was either fully displayed or compared exactly with the fully read question from group 0.',
	'',
	'Grouping used exact string equality of JSON.stringify({candidate, question, state, sources}), with those original field values and source order retained. Hash equality, text similarity, shared names, and common candidate text alone were never used to group. Every complete distinct candidate and its complete evidence were read. Groups with the same candidate but different sources were reviewed separately. Judgments were authored manually in the owned judgments TypeScript file; source indexes only select exact quotations during serialization. No regex or program inferred semantic verdicts.',
	'',
	'The checker independently re-read the packet and emitted labels. It checked every ID, the original item digest, exact schema, nonempty propositions, permitted verdicts, verdict consistency, and contiguous literal source quotations. The valid output passed. In-memory negative controls exercised the same checks without modifying either file:',
	'',
	...readings.map(reading => `- ${reading.name}: ${reading.accepted ? 'accepted' : 'rejected'}; ${reading.reason}.`),
	'',
	'## Semantic decisions and ambiguities',
	'',
	'- Groups 6, 11, and 19 are ambiguous because candidate endings truncate material identifier or deadline values to `FL-66`, `202`, and `2`. The sources contain complete values, but the candidate cannot establish them. A reading that treats the identifier fragment as a complete, different identifier would instead be contradicted. These are not presumed harmless omissions.',
	'- Group 14 is ambiguous because its undated paragraph anchors Tomasz tomorrow/today to October 9/October 8, then uses day-end language from the October 9 Grace message without preserving that source frame. The other substantive assertions are supported.',
	'- Groups 7 and 20 retain Marcus as the required signer while later evidence delegates normally-Marcus approvals to Ruth through the summit period. The source-date prefix does not identify the old rule as inactive. Groups 22, 27, and 31 occur after the expressly bounded delegation has expired, so the standing Marcus rule is again supported.',
	'- Groups 18, 33, and 40 retain an unresolved late-order status after supplied evidence reports delivery, without stating that the delay ended. Each receives contradicted with the supported identity, order, and condition propositions preserved.',
	'- Groups 35 and 42 end with bare `Copperline` or `lookup_` fragments. Those fragments add no material predicate or value; the completed factual assertions are supported by those groups own sources, which contain no delivery completion. The bare `tool:` ending in group 33 likewise adds no assertion; that group is contradicted for its retained late status.',
	'- Pronouns and source headings were resolved only from their supplied adjacent sources. In groups 8, 30, and 44, the rug-exchange pronoun refers to Beatriz; the candidate does not expressly give Luis that rug request. The Owen Pritchard heading in groups 5 and 31 is present in the source and does not assert that Owen remains buyer.',
	'- Group 37 explicitly corrects house number 19 to 91, so it marks the old value inactive. Group 36 incorporates the October 10 wrong-parcel discovery: it restores the replacement need after the intervening collection and closure report. Requests, conditions, and ongoing dispatch wording were not promoted to completed actions.',
	'',
	'## Occurrence coverage by exact group',
	'',
	'Group numbers are zero-based reader indexes. Every listed ID has its own output row and original item digest.',
	'',
	'| Group | Verdict | Occurrences | IDs |',
	'| ---: | --- | ---: | --- |',
	...groups.map((group, index) => `| ${index} | ${group.verdict} | ${group.ids.length} | ${group.ids.join(', ')} |`),
	'',
	'No source, build, service, Git, installation, cleanup, or model operations ran. Optional files are confined to the assigned alias-b reader, judgment serialization, and checker paths. No implementation gates were requested or run.',
	'',
].join('\n')
writeFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-b-report.md', report)
console.log(JSON.stringify({ input, output: digest, report: createHash('sha256').update(report).digest('hex'), count: labels.length, groups: groups.length, propositions, quotations, census, controls: readings }))
