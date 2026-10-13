export const meta = {
  name: 'blind-score-audit',
  description: 'Blind double audit of every scorer failure from both designs, with a tiebreak, to find misreads symmetrically',
  phases: [
    { title: 'Audit', detail: 'two independent blind auditors per request batch' },
    { title: 'Tiebreak', detail: 'a third auditor rules on disagreements' },
  ],
}

const ITEMS = '/home/user/agent/tmp/bench/results/v9/audit/items.json'
const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['misread', 'real', 'ambiguous'] },
          points: { type: 'string' },
          reason: { type: 'string' },
          rule: { type: 'string' },
        },
        required: ['id', 'verdict', 'points', 'reason', 'rule'],
      },
    },
  },
  required: ['verdicts'],
}

const BRIEF = (goals) => `You audit an automatic scorer, blind. Read ${ITEMS}, a JSON list of failed replies from a support-desk benchmark, and judge every item whose goal starts with one of: ${goals.join(', ')}. You do not know which system wrote each reply, and you must not try to infer it; judge the reply text alone.

Each item gives the shift lead's request, the seed facts the request depends on, the scorer's fields (expected strings that must all appear, expectedAny phrases of which one must appear, forbidden strings, forbiddenPatterns regexes, required tools), the scorer's failure details, and the reply. The scenario's full seed is in /home/user/agent/tmp/bench/scenario.json if you need more context; today in the scenario is Thursday 2026-10-08, and the desk rules include: copy Priya Raman on every escalation; never promise a customer a delivery date in writing; any refund over $200 needs the manager approval code, which rotated from MX-4471 to MX-4486; the escalation ticket for Halvorsen is ESC-2219, corrected from ESC-2291; Tomasz Brennan issues depot releases and is off Friday 2026-10-09, so requests must reach him today; Sigrid Halvorsen takes calls after 2 pm on her direct line at extension 4127, and 555-0142 is the account manager Ines Albrecht's line; the 15 percent restocking fee was scrapped, so opened returns get a full refund.

For each item, take every point the scorer failed it on (each missing string, each forbidden hit, each pattern hit, a tool failure, an empty reply) and judge that point:
- misread: on this point the reply is correct and complete for what the request asks, and the scorer's rule fails it anyway. A reply that mentions a dead value only to say it was replaced, or states a fit verdict in words the phrase list lacks, or mentions a ship date without promising a delivery date, can be a misread.
- real: on this point the reply is wrong, incomplete, contradicts a fact or rule, or answers another request.
- ambiguous: a careful human grader could fairly go either way; say why.
The item's verdict is real when any of its points is real; misread only when every failed point is a misread; ambiguous otherwise. In rule, for a misread, give the narrowest scorer rule change that passes this reply without passing a wrong reply (or "none" for real). Be strict and symmetric: never call a point a misread because the reply is otherwise good. Return a verdict for every item of your goals.`

phase('Audit')
const batches = [['g03', 'g04', 'g05', 'g09'], ['g06'], ['g07', 'g08'], ['g10']]
const rounds = await parallel(batches.flatMap((goals) => [0, 1].map((n) => () =>
  agent(`${BRIEF(goals)}\n\n(Auditor ${n + 1} of 2: work independently.)`, { label: `audit:${goals.join('+')}:${n + 1}`, phase: 'Audit', model: 'haiku', schema: VERDICTS })
    .then((result) => ({ goals, n, verdicts: result?.verdicts ?? [] })))))
const first = new Map()
const second = new Map()
for (const round of rounds.filter(Boolean)) for (const v of round.verdicts) (round.n === 0 ? first : second).set(v.id, v)
const ids = [...new Set([...first.keys(), ...second.keys()])]
const split = ids.filter((id) => first.get(id)?.verdict !== second.get(id)?.verdict)
log(`${ids.length} items judged twice; ${split.length} disagreements`)

phase('Tiebreak')
let ties = []
if (split.length > 0) {
  const tie = await agent(`${BRIEF(['g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'g07', 'g08', 'g09', 'g10'])}\n\nJudge ONLY these item ids, on which two independent auditors disagreed: ${split.join(', ')}. Their readings follow; weigh them, then rule yourself.\n${split.map((id) => `${id}: A=${JSON.stringify(first.get(id))} B=${JSON.stringify(second.get(id))}`).join('\n')}`, { label: 'tiebreak', phase: 'Tiebreak', model: 'haiku', schema: VERDICTS })
  ties = tie?.verdicts ?? []
}
const tieMap = new Map(ties.map((v) => [v.id, v]))
const final = ids.map((id) => {
  const a = first.get(id)
  const b = second.get(id)
  const decided = a?.verdict === b?.verdict ? a : tieMap.get(id)
  return { id, verdict: decided?.verdict ?? 'unresolved', a: a?.verdict, b: b?.verdict, tie: tieMap.get(id)?.verdict, reason: decided?.reason, rule: decided?.rule, points: decided?.points }
})
return { total: ids.length, disagreements: split.length, final }
