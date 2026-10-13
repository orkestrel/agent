// Compares reconstructed request bodies: each set against the sha256 its replayed run recorded per call,
// the current harness's reconstruction of v8 against the recorded v8 wire bodies, and the v7 harness
// against the current harness on the same v7 model outputs, body by body and top-level field by field.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const HERE = new URL('.', import.meta.url).pathname
const BENCH = join(HERE, '..', '..', '..')
const sha = (text) => createHash('sha256').update(text).digest('hex')
const recorded = (file) => readFileSync(file, 'utf8').trim().split('\n').flatMap((line) => JSON.parse(line).calls.map((call) => call.hash))
const bodies = (dir, count) => Array.from({ length: count }, (_, index) => readFileSync(join(HERE, dir, 'bodies', `${String(index + 1).padStart(3, '0')}.json`), 'utf8'))
const v7hash = recorded(join(BENCH, 'results/v7/none-6144/none.jsonl'))
const v8hash = recorded(join(BENCH, 'results/v8/none-6144/none.jsonl'))
const sets = { v7out_pre: [bodies('v7out-pre', 20), v7hash], v7out_cur: [bodies('v7out-cur', 20), v7hash], v8out_cur: [bodies('v8out-cur', 20), v8hash] }
const line = (text) => process.stdout.write(`${text}\n`)
line(`recorded v7 vs v8 call hashes, calls 1-14 equal: ${v7hash.slice(0, 14).filter((hash, index) => hash === v8hash[index]).length} of 14; calls 15-20 equal: ${v7hash.slice(14).filter((hash, index) => hash === v8hash[index + 14]).length} of 6`)
for (const [name, [set, hashes]] of Object.entries(sets)) {
	const match = set.map((body, index) => sha(body) === hashes[index])
	line(`${name}: ${match.filter(Boolean).length} of ${set.length} bodies hash to the recorded call hash; differ at ${match.flatMap((ok, index) => (ok ? [] : [index + 1])).join(',') || 'none'}`)
}
const wire = Array.from({ length: 20 }, (_, index) => JSON.stringify(JSON.parse(readFileSync(join(BENCH, 'results/v8/none-6144-wire', `${String(index + 1).padStart(5, '0')}_api_chat-request.json`), 'utf8')).body))
const wireSame = sets.v8out_cur[0].filter((body, index) => body === wire[index]).length
line(`v8out_cur vs v8 wire bodies: ${wireSame} of 20 byte-identical`)
const [pre, cur] = [sets.v7out_pre[0], sets.v7out_cur[0]]
for (let index = 0; index < 20; index += 1) {
	const [a, b] = [JSON.parse(pre[index]), JSON.parse(cur[index])]
	const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])]
	const differ = fields.filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
	const order = Object.keys(a).join(',') === Object.keys(b).join(',')
	line(`request ${index + 1}: ${pre[index] === cur[index] ? 'byte-identical' : 'DIFFERS'} (${pre[index].length} bytes); fields differing: ${differ.join(',') || 'none'}; key order ${order ? 'same' : 'differs'}; messages ${a.messages.length}`)
}
const fourteen = JSON.parse(pre[13])
line(`request 14 top-level: ${JSON.stringify({ ...fourteen, messages: `[${fourteen.messages.length}]` })}`)
