// Reads a dry run's bodies and report: per goal, whether every agent request carries the first request's system
// message and tool list, how many judge requests matched a recorded body, and the date and handle sentences.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const [dir, reportFile] = process.argv.slice(2)
const report = readFileSync(reportFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const goals = new Map()
for (const line of report.filter((one) => one.path === '/api/chat' && one.goal !== undefined)) {
	const body = JSON.parse(readFileSync(join(dir, `${line.n}_api_chat.json`), 'utf8'))
	goals.set(line.goal, [...(goals.get(line.goal) ?? []), body])
}
const stable = [...goals].map(([goal, bodies]) => [goal, bodies.length, bodies.every((body) => JSON.stringify(body.messages[0]) === JSON.stringify(bodies[0].messages[0]) && JSON.stringify(body.tools) === JSON.stringify(bodies[0].tools))])
const judge = report.filter((one) => one.path === '/api/generate')
const first = [...goals.values()].map((bodies) => bodies[0].messages[0].content)
console.log(`goals ${goals.size}; agent calls ${[...goals.values()].flat().length}; same system and tools within the goal: ${stable.filter(([, , same]) => same).length} of ${stable.length} (${stable.map(([goal, count, same]) => `g${goal} ${count}${same ? '' : ' differ'}`).join(', ')})`)
console.log(`judge requests ${judge.length}, ${judge.filter((one) => one.exact).length} answered from an identical recorded body`)
console.log(`first-call system messages with "Today is Thursday 2026-10-08.": ${first.filter((text) => text.includes('Today is Thursday 2026-10-08.')).length} of ${first.length}; with the handle sentence: ${first.filter((text) => text.includes('Never cite a handle')).length}; with a pin sentence: ${first.filter((text) => text.includes('call pin')).length}; with "## Rules": ${first.filter((text) => text.includes('## Rules')).length}; with "## Not shown": ${first.filter((text) => text.includes('## Not shown')).length}`)
console.log(`tool lists: ${[...new Set([...goals.values()].flat().map((body) => (body.tools ?? []).map((tool) => tool.function.name).join(',')))].join(' | ')}`)
