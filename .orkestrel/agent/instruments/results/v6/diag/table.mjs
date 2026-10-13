import { readFileSync, existsSync } from 'node:fs'
const base = '/home/user/agent/tmp/bench/results/'
const load = (p) => readFileSync(base + p, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const arms = process.argv.slice(2)
const md = (t) => ({ table: /^\s*\|.*\|\s*$/m.test(t), heading: /^#{1,6}\s|^\*\*[^*]+\*\*\s*$/m.test(t), bold: /\*\*/.test(t), bullets: /^\s*[-*]\s/m.test(t) })
for (const arm of arms) {
  const rows = load(arm)
  console.log(`\n=== ${arm}`)
  for (const r of rows) {
    const f = md(r.reply ?? '')
    const toolsS = (r.tools ?? []).map((t) => `${t.name}(${Object.values(t.arguments ?? {}).join(',')})${t.success ? '' : '!'}`).join(' ')
    const prompts = r.calls.filter((c) => c.label === 'agent').map((c) => `${c.run}:${c.prompt ?? 'x'}/${c.completion ?? 'x'}${c.overflow ? 'OVF' : ''}`).join(' ')
    console.log(`${r.goal.slice(0, 3)} ok=${r.success} via=${r.replyVia ?? '-'} turns=${r.turns} runs=${r.runs ?? 1} len=${(r.reply ?? '').length} contentLen=${(r.content ?? '').length} table=${f.table} head=${f.heading} bold=${f.bold} bul=${f.bullets} miss=${JSON.stringify(r.missing)} viol=${JSON.stringify([...(r.violations ?? []), ...(r.patternViolations ?? [])]).slice(0, 80)}`)
    console.log(`    tools: ${toolsS}`)
    console.log(`    calls run:prompt/completion: ${prompts}`)
    if (r.error) console.log('    error', r.error.slice(0, 200))
  }
}
