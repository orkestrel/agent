// Checks the reconstructed bodies of the first v7 run (none-6144-notice) against its recorded call hashes,
// then measures the messages and bytes its no-tools g07 call shares with the v7 rerun's request 14.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const HERE = new URL('.', import.meta.url).pathname
const BENCH = join(HERE, '..', '..', '..')
const sha = (text) => createHash('sha256').update(text).digest('hex')
const rows = readFileSync(join(BENCH, 'results/v7/none-6144-notice/none.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const calls = rows.flatMap((row) => row.calls)
const dir = join(HERE, 'notice-pre', 'bodies')
const names = readdirSync(dir).filter((name) => /^\d{3}\.json$/.test(name)).sort()
const same = names.filter((name, index) => sha(readFileSync(join(dir, name), 'utf8')) === calls[index]?.hash).length
process.stdout.write(`notice reconstruction: ${same} of ${calls.length} bodies hash to the recorded call hash (${names.length} bodies)\n`)
const index = calls.findIndex((call) => call.tools === 0)
const earlier = JSON.parse(readFileSync(join(dir, names[index]), 'utf8'))
const fourteen = JSON.parse(readFileSync(join(HERE, 'v7out-pre', 'bodies', '014.json'), 'utf8'))
let shared = 0
while (shared < fourteen.messages.length && JSON.stringify(earlier.messages[shared]) === JSON.stringify(fourteen.messages[shared])) shared += 1
const chars = (messages) => messages.reduce((sum, message) => sum + message.content.length, 0)
process.stdout.write(`notice request ${index + 1} (tools ${earlier.tools?.length ?? 0}, prompt ${calls[index].prompt}) shares its first ${shared} of ${fourteen.messages.length} messages with request 14 (tools ${fourteen.tools?.length ?? 0}); shared content ${chars(fourteen.messages.slice(0, shared))} of ${chars(fourteen.messages)} characters; first unshared message ${shared}: ${JSON.stringify(fourteen.messages[shared]).slice(0, 160)}\n`)
for (const key of Object.keys(fourteen)) if (key !== 'messages' && JSON.stringify(fourteen[key]) !== JSON.stringify(earlier[key])) process.stdout.write(`top-level field differs: ${key}\n`)
