// Checks a ledger.jsonl against its wire-replay report: per-call hash equals the recorded body hash in order,
// every agent call carries replyHash, load_duration, prompt_eval_duration, and cached, and under --report full
// usage.prompt equals the summed agent calls plus the judge usage.
import { readFileSync } from 'node:fs'
const rows = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const wire = readFileSync(process.argv[3], 'utf8').trim().split('\n').map((line) => JSON.parse(line)).filter((line) => line.path === '/api/chat').slice(2)
const calls = rows.flatMap((row) => row.calls.filter((call) => call.label === 'agent'))
const hashes = calls.filter((call, at) => call.hash === wire[at]?.recordedHash).length
const fields = calls.filter((call) => typeof call.replyHash === 'string' && typeof call.load_duration === 'number' && typeof call.prompt_eval_duration === 'number' && typeof call.cached === 'number').length
const usage = rows.map((row) => {
	const agent = row.calls.filter((call) => call.label === 'agent').reduce((sum, call) => sum + (call.prompt ?? 0), 0)
	return { goal: row.goal.slice(0, 3), prompt: row.usage?.prompt, agent, judge: row.usageJudge?.prompt ?? 0, ok: row.usage?.prompt === agent + (row.usageJudge?.prompt ?? 0) }
})
const satisfied = rows.map((row) => `${row.goal.slice(0, 3)} ${row.toolsOk ? 'yes' : 'no'} [${row.toolsSatisfied ?? ''}]`)
console.log(`${calls.length} agent calls; ${hashes} hashes equal the recorded body hashes in order; ${fields} carry replyHash, load_duration, prompt_eval_duration, cached`)
console.log(`usage sums: ${usage.filter((one) => one.ok).length} of ${usage.length} rows; ${usage.map((one) => `${one.goal} ${one.prompt}=${one.agent}+${one.judge}`).join(', ')}`)
console.log(`tools ok: ${satisfied.join(', ')}`)
