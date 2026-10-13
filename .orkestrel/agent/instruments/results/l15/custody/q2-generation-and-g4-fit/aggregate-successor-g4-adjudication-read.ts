// Read sealed support evidence for root adjudication. No output file or source mutation.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { arrayOf, isRecord } from '@orkestrel/contract'
import { isRefitItem } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'

const packet = readFileSync('tmp/units/aggregate-successor-label-b-packet.jsonl')
assert.equal(createHash('sha256').update(packet).digest('hex'), '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5')
const items = packet.toString('utf8').trim().split(/\r?\n/u).map(line => {
	const item: unknown = JSON.parse(line)
	assert.ok(isRefitItem(item))
	return item
})
const labelBytes = readFileSync('tmp/units/aggregate-successor-label-b.json')
assert.equal(createHash('sha256').update(labelBytes).digest('hex'), '51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf')
const labels: unknown = JSON.parse(labelBytes.toString('utf8'))
assert.ok(arrayOf(isRecord)(labels))
const groups = [...Map.groupBy(items, item => JSON.stringify({ candidate: item.candidate, question: item.question, state: item.state, sources: item.sources })).values()]
const entries = [...new Map(items.flatMap(item => item.sources).map(source => [JSON.stringify(source), source])).values()]
const mode = process.argv[2]
const start = Number(process.argv[3] ?? 0)
const end = Number(process.argv[4] ?? Number.MAX_SAFE_INTEGER)
if (mode === 'question') console.log(JSON.stringify({ question: items[0]?.question, items: items.length, groups: groups.length, sources: entries.length }, null, 2))
else if (mode === 'sources') {
	for (const [index, entry] of entries.entries()) if (index >= start && index < end) console.log(JSON.stringify({ index, ...entry }))
} else if (mode === 'groups') {
	for (const [index, group] of groups.entries()) {
		if (index < start || index >= end) continue
		const item = group[0]
		assert.ok(item)
		console.log(JSON.stringify({ group: index, count: group.length, candidate: item.candidate, sources: item.sources.map(source => entries.findIndex(entry => JSON.stringify(entry) === JSON.stringify(source))), verdict: labels.find(label => label.id === item.id)?.verdict }))
	}
} else throw new Error('Use question, sources [start end], or groups [start end]')
