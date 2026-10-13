// Splits each goal's additions to the full-view prompt into request, tool turns, and the reply,
// from the replayed request bodies (byte-identical to the live run by hash) and the recorded prompt counts.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [bodiesDir, jsonl] = process.argv.slice(2)
const files = readdirSync(bodiesDir).sort()
const bodies = files.map((file) => ({ goal: file.slice(4, 7), body: JSON.parse(readFileSync(join(bodiesDir, file), 'utf8')) }))
const rows = readFileSync(jsonl, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const prompts = rows.flatMap((row) => row.calls.filter((call) => call.label === 'agent').map((call) => call.prompt))
const goals = [...new Set(bodies.map((one) => one.goal))]
const firstIndex = (goal) => bodies.findIndex((one) => one.goal === goal)
const size = (message) => message.content.length + (message.tool_calls ? JSON.stringify(message.tool_calls.map((call) => call.function)).length : 0)
const totals = { request: 0, toolTurns: 0, reply: 0 }
console.log('goal | first prompt tok | next-first delta tok | request ch | tool-turn ch (assistant calls + results + cue) | reply ch | final completion tok')
for (const [index, goal] of goals.entries()) {
  const start = firstIndex(goal)
  const next = goals[index + 1] === undefined ? undefined : firstIndex(goals[index + 1])
  const before = bodies[start].body.messages.length - 1 // the request is the last message of the first call
  const after = next === undefined ? bodies.at(-1).body.messages : bodies[next].body.messages.slice(0, -1)
  const added = after.slice(before)
  const request = added[0]
  const rest = added.slice(1)
  // Under --reply tool the reply is the assistant message that calls send_reply and its result; otherwise the last message.
  const sendAt = rest.findIndex((message) => message.tool_calls?.some((call) => call.function.name === 'send_reply'))
  const replyMessages = next === undefined ? [] : sendAt >= 0 ? rest.slice(sendAt) : rest.slice(-1)
  const turns = next === undefined ? rest : sendAt >= 0 ? rest.slice(0, sendAt) : rest.slice(0, -1)
  const ch = { request: size(request), toolTurns: turns.reduce((sum, message) => sum + size(message), 0), reply: replyMessages.reduce((sum, message) => sum + size(message), 0) }
  if (next !== undefined) for (const key of Object.keys(totals)) totals[key] += ch[key]
  const row = rows[index]
  const agentCalls = row.calls.filter((call) => call.label === 'agent')
  const finalCompletion = agentCalls.filter((call) => !call.overflow).at(-1)?.completion
  const delta = next === undefined ? '-' : prompts[next] - prompts[start]
  console.log(`${goal} | ${prompts[start]} | ${delta} | ${ch.request} | ${ch.toolTurns} | ${ch.reply} | ${finalCompletion}`)
}
console.log('totals g01..g09 chars', JSON.stringify(totals))
