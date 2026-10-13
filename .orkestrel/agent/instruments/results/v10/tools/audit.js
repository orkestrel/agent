export const meta = {
  name: 'blind-audit-v10',
  description: 'Blind two-sided double audit of v10 scorer rows (passes for false passes, failures for misreads), with a tiebreak, on the checker role',
  phases: [
    { title: 'Audit', detail: 'two independent blind checker auditors per chunk on Haiku 5.5' },
    { title: 'Tiebreak', detail: 'a third checker rules on each chunk\'s disagreements' },
  ],
}

// args: { dir: AUDIT_DIR, chunks: [{ file: ITEMS_PATH, rows: 'passes' | 'failures', ids?: [ITEM_ID, ...] }] }
// `ids` lists the item ids in the chunk's file (items.ts prints them); an id that neither auditor returns is ruled unresolved.
const DIR = args.dir
const CHUNKS = args.chunks
const schema = (verdicts) => ({
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: verdicts },
          points: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['id', 'verdict', 'points', 'reason'],
      },
    },
  },
  required: ['verdicts'],
})
const PASS = schema(['correct', 'false-pass', 'ambiguous'])
const FAIL = schema(['misread', 'real', 'ambiguous'])

const FACTS = `The scenario's full seed is in /home/user/agent/tmp/bench/scenario.json; today in it is Thursday 2026-10-08. The desk rules and facts include: copy Priya Raman on every escalation; never promise a customer a delivery date in writing; any refund over $200 needs the manager approval code, which rotated from MX-4471 to MX-4486, signed off by Marcus Oyelaran; the escalation ticket for Halvorsen is ESC-2219, corrected from ESC-2291; Tomasz Brennan issues depot releases and is off Friday 2026-10-09, so requests must reach him today; Sigrid Halvorsen takes calls after 2 pm on her direct line at extension 4127, and 555-0142 is the account manager Ines Albrecht's line; the 15 percent restocking fee was scrapped, so opened returns get a full refund ($289.00 for Luis Ferreira's mixer); Halvorsen's credit limit is $5,000.00 with $1,240.00 outstanding, so exactly $3,760.00 is available and a $3,000 reorder fits.`

const HEAD = (file) => `Role and engine: checker on Claude Haiku 5.5. You read and judge; you edit nothing, run nothing, and spawn nothing. You never read any file whose name starts with key in ${DIR}, and you never read any other items file than the one named here. Never create, edit, or delete any file.`

const passBrief = (file) => `${HEAD(file)}

You audit an automatic scorer, blind. Read ${file}, a JSON list of replies from a support-desk benchmark that the scorer PASSED, and judge every item. You do not know which system wrote each reply and must not try to infer it; judge the reply text alone.

Each item gives the shift lead's request, the seed facts the request depends on, the scorer's fields (expected strings that must all appear, expectedAny phrases of which one must appear, forbidden strings, forbiddenPatterns regexes, required tools), and the reply. ${FACTS}

For each item decide whether the pass stands. Read every element the request asks for and every value the reply states:
- correct: the reply answers the request it was given, every element the request asks for is present and right, and nothing it states contradicts a fact, a correction, or a rule. Extra content that is true, harmless, or plainly hedged does not change this; formatting and tone never matter.
- false-pass: on at least one point the reply is wrong in a way the shift lead could act on: a wrong or miscalculated value (for example an available credit other than $3,760), a superseded value given as current, a delivery date promised to a customer in writing, a wrong person, number, or extension, a required element omitted, a rule denied or broken, or an answer to a different request.
- ambiguous: a careful human grader could fairly go either way; say why.
Be strict and symmetric: never call a point wrong because the reply is long or styled differently, and never let an otherwise good reply excuse a wrong value. In points, name each point you checked; in reason, quote the reply text behind a false-pass or ambiguous verdict. Return a verdict for every item.

Deviation contract: if the items file is missing or unreadable, return an empty verdict list and say why in the first item's reason.`

const failBrief = (file) => `${HEAD(file)}

You audit an automatic scorer, blind. Read ${file}, a JSON list of failed replies from a support-desk benchmark, and judge every item. You do not know which system wrote each reply and must not try to infer it; judge the reply text alone.

Each item gives the shift lead's request, the seed facts the request depends on, the scorer's fields (expected strings that must all appear, expectedAny phrases of which one must appear, forbidden strings, forbiddenPatterns regexes, required tools), the scorer's failure details, and the reply. ${FACTS}

For each item, take every point the scorer failed it on (each missing string, each forbidden hit, each pattern hit, an empty reply) and judge that point:
- misread: on this point the reply is correct and complete for what the request asks, and the scorer's rule fails it anyway; for example a dead value mentioned only as replaced, a fit verdict in words the phrase list lacks, or a ship date given without promising a delivery date.
- real: on this point the reply is wrong, incomplete, contradicts a fact or rule, omits what the request asks for, or answers another request. An empty reply is real.
- ambiguous: a careful human grader could fairly go either way; say why.
Then judge the reply as a whole by the pass standard: read every element the request asks for and every value the reply states, and decide whether the reply is correct, meaning it answers the request it was given, every element the request asks for is present and right, and nothing it states contradicts a fact, a correction, or a rule. A wrong or miscalculated value, a superseded value given as current, a delivery date promised to a customer in writing, a wrong person, number, or extension, a required element omitted, a rule denied or broken, or an answer to a different request makes the reply a false pass, even when the scorer did not flag that point.
The item's verdict is misread only when every failed point is a misread AND the reply as a whole is correct by that standard. It is real whenever the reply would be a false pass by that standard, on a flagged point or on any other. It is ambiguous otherwise. Be strict and symmetric: never call a point a misread because the reply is otherwise good, and never let an unflagged error pass. In points, name each point you checked; in reason, quote the reply text behind a real or ambiguous verdict. Return a verdict for every item.

Deviation contract: if the items file is missing or unreadable, return an empty verdict list and say why in the first item's reason.`

const results = await pipeline(
  CHUNKS,
  async (chunk, _item, index) => {
    const brief = chunk.rows === 'passes' ? passBrief(chunk.file) : failBrief(chunk.file)
    const shape = chunk.rows === 'passes' ? PASS : FAIL
    const pair = await parallel([0, 1].map((n) => () =>
      agent(`${brief}\n\n(Auditor ${n + 1} of 2: work independently.)`, { label: `audit:${index + 1}:${n + 1}`, phase: 'Audit', model: 'haiku', effort: 'high', agentType: 'checker', schema: shape })))
    return { chunk, index, brief, shape, first: pair[0]?.verdicts ?? [], second: pair[1]?.verdicts ?? [] }
  },
  async ({ chunk, index, brief, shape, first, second }) => {
    const a = new Map(first.map((v) => [v.id, v]))
    const b = new Map(second.map((v) => [v.id, v]))
    const ids = [...new Set([...(chunk.ids ?? []), ...a.keys(), ...b.keys()])]
    const split = ids.filter((id) => (a.has(id) || b.has(id)) && a.get(id)?.verdict !== b.get(id)?.verdict)
    let ties = new Map()
    if (split.length > 0) {
      const tie = await agent(`${brief}\n\nJudge ONLY these item ids, on which two independent auditors disagreed: ${split.join(', ')}. Their readings follow; weigh them, then rule yourself.\n${split.map((id) => `${id}: A=${JSON.stringify(a.get(id))} B=${JSON.stringify(b.get(id))}`).join('\n')}`, { label: `tiebreak:${index + 1}`, phase: 'Tiebreak', model: 'haiku', effort: 'high', agentType: 'checker', schema: shape })
      ties = new Map((tie?.verdicts ?? []).map((v) => [v.id, v]))
    }
    const final = ids.map((id) => {
      const x = a.get(id)
      const y = b.get(id)
      if (x === undefined && y === undefined) return { id, rows: chunk.rows, verdict: 'unresolved', reason: 'no auditor returned it' }
      const decided = x?.verdict === y?.verdict ? x : ties.get(id)
      return { id, rows: chunk.rows, verdict: decided?.verdict ?? 'unresolved', a: x?.verdict, b: y?.verdict, tie: ties.get(id)?.verdict, reason: decided?.reason, points: decided?.points }
    })
    log(`chunk ${index + 1} (${chunk.rows}): ${ids.length} judged, ${split.length} split`)
    return { file: chunk.file, rows: chunk.rows, judged: ids.length, split: split.length, final }
  },
)
const all = results.filter(Boolean)
const final = all.flatMap((r) => r.final)
return { chunks: all.length, total: final.length, disagreements: all.reduce((s, r) => s + r.split, 0), counts: final.reduce((m, f) => ({ ...m, [`${f.rows}:${f.verdict}`]: (m[`${f.rows}:${f.verdict}`] ?? 0) + 1 }), {}), final }
