import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const prefix = resolve(root, 'tmp/units/aggregate-successor-contact-trace')
const aggregate = '.orkestrel/agent/instruments/results/l15/q4-think0/pilot/development/l6-q4-think0-aggregate-v1'
const records = '.orkestrel/agent/instruments/results/l15/q4-think0/resource/reserve-512/l6-q4-think0-records-v1'

function object(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object')
	return Object.fromEntries(Object.entries(value))
}

function rows(path: string): readonly { readonly line: number; readonly raw: string; readonly value: Record<string, unknown> }[] {
	return readFileSync(resolve(root, path), 'utf8').split(/\r\n|\n/).flatMap((raw, index) => raw ? [{ line: index + 1, raw, value: object(JSON.parse(raw)) }] : [])
}

function save(label: string, value: unknown): void {
	writeFileSync(`${prefix}-${label}.json`, JSON.stringify(value, undefined, 2) + '\n')
}

const source = object(JSON.parse(readFileSync(resolve(root, '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'), 'utf8')))
if (!Array.isArray(source.seed) || !Array.isArray(source.goals)) throw new Error('Source arrays missing')
save('source', { system: source.system, seed: source.seed.flatMap((value, index) => [65, 68, 92, 93, 134, 135, 136, 137].includes(index) ? [{ index, value }] : []), goal: source.goals.filter(value => object(value).id === 'g20-copperline-manager') })
for (const [arm, directory, first, last] of [['aggregate', aggregate, 263, 266], ['records', records, 53, 55]] as const) {
	for (const filename of ['rows', 'turns', 'selections', 'calls', 'requests', 'messages', ...(arm === 'aggregate' ? ['aggregates'] : [])]) {
		const path = `${directory}/${filename}.jsonl`
		const matches = rows(path).filter(({ value }) => filename === 'requests' ? typeof value.sequence === 'number' && value.sequence >= first && value.sequence <= last : value.goal === 'g20-copperline-manager' && (filename !== 'aggregates' || value.topic === 'contacts' || value.topic === 'owner:LH-71592' || value.topic === undefined))
		save(`${arm}-${filename}`, matches)
		if (filename === 'aggregates') save('maintained', matches.map(({ line, value }) => ({ line, topic: value.topic, version: value.version, event: value.event, status: value.status, prose: value.prose, trigger: value.trigger, failures: value.failures, answers: value.answers })))
		if (filename === 'requests') for (const { line, raw, value } of matches) {
			writeFileSync(`${prefix}-${arm}-request-${value.sequence}.jsonl`, raw + '\n')
			const request = object(value.request)
			if (!Array.isArray(request.messages) || typeof value.response !== 'string') throw new Error('Missing messages or response')
			writeFileSync(`${prefix}-${arm}-body-${value.sequence}.txt`, request.messages.map((item, index) => JSON.stringify({ index, ...object(item) }, undefined, 2)).join('\n') + '\n')
			writeFileSync(`${prefix}-${arm}-readable-${value.sequence}.txt`, request.messages.map((item, index) => { const message = object(item); return `MESSAGE ${index} ROLE ${message.role}\n${message.content}\n${message.tool_calls === undefined ? '' : JSON.stringify(message.tool_calls)}` }).join('\n\n') + '\n')
			const response = value.response.split(/\r\n|\n/).filter(Boolean).map(item => object(JSON.parse(item)))
			writeFileSync(`${prefix}-${arm}-response-${value.sequence}.txt`, response.map(item => object(item.message).content).join(''))
			console.log('request identity', arm, line, value.sequence, createHash('sha256').update(raw).digest('hex'))
		}
	}
}
const joined = object(JSON.parse(readFileSync(resolve(root, '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l15-q4-quality/joined.json'), 'utf8')))
if (!Array.isArray(joined.rows)) throw new Error('Missing joined rows')
save('judgments', joined.rows.filter(value => object(value).goal === 'g20-copperline-manager' && ['aggregate', 'records'].includes(String(object(value).arm))))
save('hashes', ['.orkestrel/agent/instruments/harness/bench/variants/long/v1.json', '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l15-q4-quality/joined.json', ...[aggregate, records].flatMap(directory => ['rows', 'selections', 'calls', 'requests', 'messages'].map(filename => `${directory}/${filename}.jsonl`)), `${aggregate}/aggregates.jsonl`].map(path => ({ path, sha256: createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex') })))
const aggregateRequest = rows(`${aggregate}/requests.jsonl`).find(({ value }) => value.sequence === 266)
const recordsRequest = rows(`${records}/requests.jsonl`).find(({ value }) => value.sequence === 54)
if (!aggregateRequest || !recordsRequest) throw new Error('Missing decision')
const aggregateMessages = object(aggregateRequest.value.request).messages
const recordsMessages = object(recordsRequest.value.request).messages
if (!Array.isArray(aggregateMessages) || !Array.isArray(recordsMessages)) throw new Error('Missing message arrays')
save('comparison', { sameSystemMessage: JSON.stringify(aggregateMessages[0]) === JSON.stringify(recordsMessages[0]), aggregateMessages: aggregateMessages.length, recordsMessages: recordsMessages.length })
