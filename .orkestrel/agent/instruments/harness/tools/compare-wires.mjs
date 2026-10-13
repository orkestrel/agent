// Compares two wire recordings of the same planned run call by call, to prove that a harness move, a re-vendored
// build, or a daemon upgrade sends the same requests and gets the same answers:
//   node compare-wires.mjs WIRE_A WIRE_B
// Each WIRE directory holds the NNNNN_<path>-request.json and -response.json pairs record-fetch.mjs writes. Requests
// must match on url, method, and body. Responses must match on what the model produced: content, thinking, tool
// calls, the generate response text, the log-probabilities, the done reason, and the token counts; timings and
// timestamps are ignored, because they vary between identical runs. A call sampled above temperature 0 that returns
// log-probabilities (the judge's one-token calls) matches on the log-probabilities alone, because the judge reads
// its answer from them and the sampled token varies between identical runs.
// Exit: 0 when every call matches; 1 when a call differs or one recording has calls the other lacks; 64 on usage.
import { isDeepStrictEqual } from 'node:util'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const [left, right] = process.argv.slice(2)
if (left === undefined || right === undefined) {
	process.stderr.write('usage: node compare-wires.mjs WIRE_A WIRE_B\n')
	process.exit(64)
}

function listCalls(dir) {
	return readdirSync(dir)
		.filter((name) => name.endsWith('-request.json'))
		.sort()
		.map((name) => ({ name, request: JSON.parse(readFileSync(join(dir, name), 'utf8')), response: readResponse(join(dir, name.replace('-request.json', '-response.json'))) }))
}

function readResponse(file) {
	let record
	try {
		record = JSON.parse(readFileSync(file, 'utf8'))
	} catch {
		return { missing: true }
	}
	if (record.error !== undefined) return { status: record.status, error: record.error }
	const output = { status: record.status, content: '', thinking: '', calls: [], response: '', logprobs: [], doneReason: undefined, prompt: undefined, generated: undefined }
	for (const line of String(record.text ?? '').split('\n')) {
		if (line.trim() === '') continue
		let chunk
		try {
			chunk = JSON.parse(line)
		} catch {
			output.content += line
			continue
		}
		output.content += chunk.message?.content ?? ''
		output.thinking += chunk.message?.thinking ?? ''
		output.calls.push(...(chunk.message?.tool_calls ?? []).map((call) => call.function))
		output.response += chunk.response ?? ''
		// Each entry also names the sampled token, which varies; the judge reads only the ranked alternatives.
		output.logprobs.push(...(chunk.logprobs ?? []).map((entry) => entry.top_logprobs ?? entry))
		if (chunk.done) {
			output.doneReason = chunk.done_reason
			output.prompt = chunk.prompt_eval_count
			output.generated = chunk.eval_count
		}
	}
	return output
}

const a = listCalls(left)
const b = listCalls(right)
let differences = 0
for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
	const x = a[index]
	const y = b[index]
	if (x === undefined || y === undefined) {
		differences += 1
		process.stdout.write(`call ${index + 1}: only in ${x === undefined ? right : left} (${(x ?? y).name})\n`)
		continue
	}
	const request = ['url', 'method', 'body'].filter((key) => !isDeepStrictEqual(x.request[key], y.request[key]))
	const sampled = (x.request.body?.options?.temperature ?? 0) > 0 && x.response.logprobs?.length > 0
	const response = Object.keys({ ...x.response, ...y.response })
		.filter((key) => !(sampled && key === 'response'))
		.filter((key) => !isDeepStrictEqual(x.response[key], y.response[key]))
	if (request.length === 0 && response.length === 0) continue
	differences += 1
	if (differences <= 10) process.stdout.write(`call ${index + 1} (${x.name} / ${y.name}): request differs in ${request.join(', ') || 'nothing'}; response differs in ${response.join(', ') || 'nothing'}\n`)
}
process.stdout.write(`${a.length} and ${b.length} calls; ${differences} differ\n`)
process.exit(differences === 0 ? 0 : 1)
