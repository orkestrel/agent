import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

for (const name of ['manifest.json', 'attempts.jsonl', 'packet.jsonl']) {
	const path = resolve('.orkestrel/agent/instruments/results/l7/calibration/q2/generation', name)
	const bytes = readFileSync(path)
	const value: unknown = name.endsWith('.jsonl') ? bytes.toString('utf8').split(/\r\n|\n/).filter(line => line.includes('fbb56761-030c-4056-bee5-e1def8cc9aba')).map(line => JSON.parse(line)) : JSON.parse(bytes.toString('utf8'))
	console.log(JSON.stringify({ name, hash: createHash('sha256').update(bytes).digest('hex'), keys: typeof value === 'object' && value !== null ? Object.keys(value) : [], value: name === 'manifest.json' && typeof value === 'object' && value !== null ? { model: Reflect.get(value, 'model'), settings: Reflect.get(value, 'settings') } : 'selected candidate present' }))
}
const labels: unknown = JSON.parse(readFileSync('.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json', 'utf8'))
console.log(JSON.stringify({ labels: typeof labels === 'object' && labels !== null ? Reflect.get(labels, 'labels').filter((value: unknown) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'fbb56761-030c-4056-bee5-e1def8cc9aba') : labels }))
const evidence: unknown = JSON.parse(readFileSync('.orkestrel/agent/instruments/results/l7/calibration/q2/generation/evidence.json', 'utf8'))
console.log(JSON.stringify({ evidence: typeof evidence === 'object' && evidence !== null ? Object.entries(evidence).map(([name, value]) => [name, Array.isArray(value) ? { length: value.length, first: value[0] } : typeof value]) : evidence }))
const vendor = resolve('.orkestrel/agent/instruments/harness/vendor/ollama/index.js')
const require = createRequire(pathToFileURL(vendor))
console.log(JSON.stringify({ runtime: require.resolve('@orkestrel/agent'), package: require.resolve('@orkestrel/agent/package.json') }))
