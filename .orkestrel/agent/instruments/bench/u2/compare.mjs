import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileRules, scoreText, clean } from '../rescore.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BENCH = dirname(HERE)
const GOALS = JSON.parse(readFileSync(join(BENCH, 'scenario.json'), 'utf8')).goals
const RULES = JSON.parse(readFileSync(join(HERE, 'rules.json'), 'utf8'))
const STAGED = existsSync(join(HERE, 'rescore.mjs')) ? await import('./rescore.mjs') : { compileRules, scoreText, clean }

function readJSON(file) {
 return JSON.parse(readFileSync(file, 'utf8'))
}

function getAnswer(row) {
 const reply = row.reply ?? ''
 const replied = row.replied ?? reply !== ''
 const content = row.content ?? ''
 const via = row.answerVia ?? (replied ? 'reply' : content.trim() !== '' ? 'content' : 'none')
 return { text: row.answer ?? (via === 'reply' ? reply : via === 'content' ? content : ''), via }
}

function getAudits(version) {
 const keys = new Map()
 const audits = new Map()
 const root = join(BENCH, 'results', version)
 for (const directory of ['audit', 'audit-keys']) {
  if (!existsSync(join(root, directory))) continue
  for (const file of readdirSync(join(root, directory)).filter(name => /^key.*\.json$/.test(name)).sort()) {
   for (const key of readJSON(join(root, directory, file))) {
    const previous = keys.get(key.id)
    if (previous && (previous.run !== key.run || previous.goal !== key.goal)) throw new Error(`Conflicting audit key ${key.id}`)
    keys.set(key.id, key)
   }
  }
 }
 // Retain distinct judgments, including earlier judgments that the checked verdict revises.
 for (const file of readdirSync(join(root, 'audit')).filter(name => /^verdicts.*\.json$/.test(name)).sort()) {
  const document = readJSON(join(root, 'audit', file))
  const verdicts = Array.isArray(document) ? document : document.final ?? document.verdicts
  if (!Array.isArray(verdicts)) throw new Error(`Unknown verdict shape: ${file}`)
  for (const verdict of verdicts) {
   const key = keys.get(verdict.id)
   if (!key) continue
   const name = `${key.run}/${key.goal}`
   const rows = audits.get(name) ?? []
   const normalized = ['false-pass', 'real'].includes(verdict.verdict) ? 'wrong' : ['false-fail', 'misread'].includes(verdict.verdict) ? 'correct' : verdict.verdict
   rows.push({ ...verdict, original: verdict.verdict, verdict: normalized, source: `${version}/audit/${file}` })
   audits.set(name, rows)
  }
 }
 return audits
}

function getExcerpt(text, before, after) {
 const sources = [...after.patterns, ...before.patterns]
 for (const source of sources) {
  const match = new RegExp(source, 'i').exec(text.replaceAll('*', ''))
  if (match?.[0]) {
   const start = Math.max(0, text.lastIndexOf('\n', match.index) + 1)
   const end = text.indexOf('\n', match.index + match[0].length)
   return text.slice(start, end === -1 ? undefined : end)
  }
 }
 return text
}

function getRuling(change, audit) {
 if (audit.verdict === (change.new ? 'correct' : 'wrong')) return undefined
 if (change.goal === 'g06-kenji-shipping' && change.run.endsWith('/a5-records-v6')) return 'FAIL. The reply says “when you reply to him” and gives only a third-person note to the shift lead. Contract 3 explicitly requires text addressed to Kenji, resolving the audit ambiguity against this reply.'
 if (change.goal === 'g08-halvorsen-credit' && !change.new && /4,240/.test(change.text)) return 'FAIL. The reply explicitly places the $4,240 resulting balance “within their available credit”. Available credit is $3,760, so that comparison is false. The audit substitutes the $5,000 credit limit for the named available credit. A comparison with the $5,000 limit passes the paired fixture; this comparison does not. The correct fit conclusion does not repair its stated reason.'
 return undefined
}

function collectDirectories(root, prefix = '') {
 const directories = []
 for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
  if (!entry.isDirectory() || /^(?:aborted|probes|superseded)$|(?:-wire)$/.test(entry.name)) continue
  const name = join(prefix, entry.name)
  directories.push(name, ...collectDirectories(root, name))
 }
 return directories.sort()
}

if (process.argv.length > 3 || (process.argv[2] !== undefined && process.argv[2] !== '--fixtures')) {
 console.error('usage: node tmp/bench/u2/compare.mjs [--fixtures]')
 process.exit(64)
}
if (process.argv[2] === '--fixtures') {
 const fixtures = readJSON(join(HERE, 'fixtures.json'))
 const results = []
 for (const fixture of fixtures) {
  const goal = GOALS.find(goal => goal.id.startsWith(`${fixture.goal}-`))
  if (!goal) throw new Error(`Unknown fixture goal ${fixture.goal}`)
  const before = clean(scoreText(compileRules(goal), fixture.text))
  const scored = STAGED.scoreText(STAGED.compileRules({ ...goal, ...RULES[goal.id] }), fixture.text)
  const after = STAGED.clean(scored)
  results.push({ ...fixture, live: before, staged: after, scored })
  if (after !== fixture.pass) console.error(`${fixture.id}: expected ${fixture.pass ? 'PASS' : 'FAIL'}, got ${after ? 'PASS' : 'FAIL'}: ${JSON.stringify(scored)}`)
 }
 writeFileSync(join(HERE, 'fixtures-results.json'), `${JSON.stringify(results, null, 2)}\n`)
 const failed = results.filter(result => result.staged !== result.pass)
 console.log(`Fixtures: ${results.length - failed.length}/${results.length} passed; ${results.filter(result => result.live !== result.pass).length} mismatched the live rules.`)
 process.exitCode = failed.length ? 1 : 0
} else {
 const rows = []
 const skipped = []
 const snapshots = []
 for (const version of ['v9', 'v10']) {
  const root = join(BENCH, 'results', version)
  const audits = getAudits(version)
  for (const name of collectDirectories(root)) {
   const entry = { name }
   const files = readdirSync(join(root, entry.name)).filter(name => name.endsWith('.jsonl')).sort()
   if (!files.length) continue
   // Read the log before the row file so an in-flight row cannot enter this snapshot.
   const live = version === 'v10' && /^t4-.*-v[34]$/.test(entry.name)
   const log = join(root, `${entry.name}.log`)
   const reported = live && existsSync(log) ? [...readFileSync(log, 'utf8').matchAll(/^(g\d+-[\w-]+): (?:PASS|FAIL)\b/gm)].map(match => match[1]) : []
   if (live) snapshots.push({ run: `${version}/${entry.name}`, reported })
   for (const file of files) {
    const lines = readFileSync(join(root, entry.name, file), 'utf8').split('\n')
    for (let index = 0; index < lines.length; index += 1) {
     if (!lines[index].trim()) continue
     let row
     try { row = JSON.parse(lines[index]) } catch (error) {
      if (live && index === lines.length - 1) { skipped.push({ run: `${version}/${entry.name}`, file, line: index + 1, reason: 'incomplete final line' }); continue }
      throw error
     }
     if (!Object.hasOwn(RULES, row.goal) || !Object.hasOwn(row, 'success')) continue
     if (row.calibration || row.goal === 'calibration') continue
     if (live && !reported.includes(row.goal)) { skipped.push({ run: `${version}/${entry.name}`, goal: row.goal, reason: 'not reported in log snapshot' }); continue }
     const goal = GOALS.find(goal => goal.id === row.goal)
     const answer = getAnswer(row)
     const before = scoreText(compileRules(goal), answer.text)
     const after = STAGED.scoreText(STAGED.compileRules({ ...goal, ...RULES[goal.id] }), answer.text)
     const eligible = row.error === undefined && answer.via !== 'none'
     const previous = eligible && clean(before)
     const next = eligible && STAGED.clean(after)
     const result = { run: `${version}/${entry.name}`, file, line: index + 1, goal: row.goal, answerVia: answer.via, old: previous, new: next, recorded: row.success, before, after, text: answer.text, audits: audits.get(`${entry.name.startsWith('rescored/') ? basename(entry.name) : entry.name}/${row.goal}`) ?? [] }
     if (previous !== next) {
      result.excerpt = getExcerpt(answer.text, before, after)
      result.disagreements = result.audits.filter(audit => audit.verdict !== (next ? 'correct' : 'wrong')).map(audit => ({ ...audit, ruling: getRuling(result, audit) }))
     }
     rows.push(result)
    }
   }
  }
 }
 const changed = rows.filter(row => row.old !== row.new)
 const counts = Object.keys(RULES).map(goal => ({ goal, rows: rows.filter(row => row.goal === goal).length, failToPass: changed.filter(row => row.goal === goal && row.new).length, passToFail: changed.filter(row => row.goal === goal && !row.new).length }))
 const unresolved = changed.flatMap(row => row.disagreements.filter(audit => !audit.ruling).map(audit => ({ run: row.run, goal: row.goal, ...audit })))
 const primary = rows.filter(row => row.run.split('/').length === 2)
 const primaryCounts = Object.keys(RULES).map(goal => ({ goal, rows: primary.filter(row => row.goal === goal).length, failToPass: primary.filter(row => row.goal === goal && !row.old && row.new).length, passToFail: primary.filter(row => row.goal === goal && row.old && !row.new).length }))
 const report = { primaryCounts, timestamp: new Date().toISOString(), measure: 'Scored answer chosen exactly as rescore.mjs; row errors and answerVia none remain failures. Every nested JSONL with a goal and success field is included, including archived rescored copies; primaryCounts separately counts the top-level runs. Aborted, probes, superseded, wire directories, and calibration rows are excluded. Audit labels real/false-pass normalize to wrong; misread/false-fail normalize to correct. Every distinct audit judgment is retained.', snapshots, skipped, counts, changed, unresolved, rows }
 writeFileSync(join(HERE, 'compare.json'), `${JSON.stringify(report, null, 2)}\n`)
 const markdown = ['# Scorer comparison', '', report.measure, '', `Scored ${rows.length} rows; changed ${changed.length}. The gift-action contract also covers g09 because a recorded g09 reply claims that action.`, '', '| Goal | Rows | Fail → pass | Pass → fail |', '| --- | ---: | ---: | ---: |', ...counts.map(row => `| ${row.goal} | ${row.rows} | ${row.failToPass} | ${row.passToFail} |`), '', '## Changed verdicts', '']
 markdown.push('Top-level runs exclude nested replays and archived rescored copies:', '', '| Goal | Rows | Fail → pass | Pass → fail |', '| --- | ---: | ---: | ---: |', ...primaryCounts.map(row => `| ${row.goal} | ${row.rows} | ${row.failToPass} | ${row.passToFail} |`), '')
 for (const row of changed) {
  markdown.push(`### ${row.run} / ${row.goal}`, '', `${row.file}:${row.line}: ${row.old ? 'PASS' : 'FAIL'} → ${row.new ? 'PASS' : 'FAIL'}.`, '', ...row.text.split('\n').map(line => `> ${line}`), '', `Deciding excerpt: ${row.excerpt}`, '', `Audit: ${row.audits.length ? row.audits.map(audit => `${audit.verdict} (${audit.source}, ${audit.id}): ${audit.reason}`).join('; ') : 'No verdict found.'}`, '')
  for (const audit of row.disagreements) markdown.push(`Ruling against ${audit.verdict} (${audit.source}, ${audit.id}): ${audit.ruling ?? 'UNRESOLVED'}`, '')
 }
 markdown.push('## Live-run snapshots', '', ...snapshots.map(snapshot => `${snapshot.run}: ${snapshot.reported.join(', ') || 'no rows reported'}.`), '', `Skipped in-flight rows: ${skipped.length}.`, '')
 writeFileSync(join(HERE, 'compare.md'), `${markdown.join('\n')}\n`)
 console.log(JSON.stringify({ rows: rows.length, counts, changed: changed.length, unresolved: unresolved.length, skipped: skipped.length }, null, 2))
 process.exitCode = unresolved.length ? 1 : 0
}
