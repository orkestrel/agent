import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'

const paths = [
	'tmp/units/aggregate-successor-q4-fault-read-reader.ts',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl',
	'tmp/units/aggregate-successor-q4-fault-read-stderr.txt',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-before.txt',
	'tmp/units/aggregate-successor-q4-fault-read-stdout.jsonl.status-after.txt',
]
process.stdout.write(`${JSON.stringify(paths.map((path) => hashFile(path)))}\n`)
