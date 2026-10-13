export const meta = {
  name: 'blind-score-audit-3',
  description: 'Blind double audit of the not-yet-audited scorer failures, with a tiebreak, on the checker role',
  phases: [
    { title: 'Audit', detail: 'two independent blind checker auditors on Haiku 5.5' },
    { title: 'Tiebreak', detail: 'a third checker rules on disagreements' },
  ],
}

const ITEMS = '/home/user/agent/tmp/bench/results/v9/audit/items3.json'
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
        },
        required: ['id', 'verdict', 'points', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}

const BRIEF = `Role and engine: checker on Claude Haiku 5.5. You read and judge; you edit nothing, run nothing, and spawn nothing. You never read /home/user/agent/tmp/bench/results/v9/audit/key.json, key2.json, key3.json, or key-all.json.

You audit an automatic scorer, blind. Read ${ITEMS}, a JSON list of failed replies from a support-desk benchmark, and judge every item. You do not know which system wrote each reply and must not try to infer it; judge the reply text alone.

Each item gives the shift lead's request, the seed facts the request depends on, the scorer's fields (expected strings that must all appear, expectedAny phrases of which one must appear, forbidden strings, forbiddenPatterns regexes, required tools), the scorer's failure details, and the reply. The scenario's full seed is in /home/user/agent/tmp/bench/scenario.json; today in it is Thursday 2026-10-08. The desk rules include: copy Priya Raman on every escalation; never promise a customer a delivery date in writing; any refund over $200 needs the manager approval code, which rotated from MX-4471 to MX-4486; the escalation ticket for Halvorsen is ESC-2219, corrected from ESC-2291; Tomasz Brennan issues depot releases and is off Friday 2026-10-09, so requests must reach him today; Sigrid Halvorsen takes calls after 2 pm on her direct line at extension 4127, and 555-0142 is the account manager Ines Albrecht's line; the 15 percent restocking fee was scrapped, so opened returns get a full refund; Halvorsen's credit limit is $5,000.00 with $1,240.00 outstanding, so $3,760.00 is available and a $3,000 reorder fits.

For each item, take every point the scorer failed it on (each missing string, each forbidden hit, each pattern hit, a tool failure, an empty reply) and judge that point:
- misread: on this point the reply is correct and complete for what the request asks, and the scorer's rule fails it anyway; for example a dead value mentioned only as replaced, a fit verdict in words the phrase list lacks, or a ship date given without promising a delivery date.
- real: on this point the reply is wrong, incomplete, contradicts a fact or rule, omits what the request asks for, or answers another request.
- ambiguous: a careful human grader could fairly go either way; say why.
The item's verdict is real when any point is real; misread only when every failed point is a misread; ambiguous otherwise. Be strict and symmetric: never call a point a misread because the reply is otherwise good. Return a verdict for every item.

Deviation contract: if the items file is missing or unreadable, return an empty verdict list and say why in the first item's reason.`

phase('Audit')
const rounds = await parallel([0, 1].map((n) => () =>
  agent(`${BRIEF}\n\n(Auditor ${n + 1} of 2: work independently.)`, { label: `audit:${n + 1}`, phase: 'Audit', model: 'haiku', effort: 'high', agentType: 'checker', schema: VERDICTS })
    .then((result) => ({ n, verdicts: result?.verdicts ?? [] }))))
const first = new Map()
const second = new Map()
for (const round of rounds.filter(Boolean)) for (const v of round.verdicts) (round.n === 0 ? first : second).set(v.id, v)
const ids = [...new Set([...first.keys(), ...second.keys()])]
const split = ids.filter((id) => first.get(id)?.verdict !== second.get(id)?.verdict)
log(`${ids.length} items judged twice; ${split.length} disagreements`)

phase('Tiebreak')
let ties = []
if (split.length > 0) {
  const tie = await agent(`${BRIEF}\n\nJudge ONLY these item ids, on which two independent auditors disagreed: ${split.join(', ')}. Their readings follow; weigh them, then rule yourself.\n${split.map((id) => `${id}: A=${JSON.stringify(first.get(id))} B=${JSON.stringify(second.get(id))}`).join('\n')}`, { label: 'tiebreak', phase: 'Tiebreak', model: 'haiku', effort: 'high', agentType: 'checker', schema: VERDICTS })
  ties = tie?.verdicts ?? []
}
const tieMap = new Map(ties.map((v) => [v.id, v]))
const final = ids.map((id) => {
  const a = first.get(id)
  const b = second.get(id)
  const decided = a?.verdict === b?.verdict ? a : tieMap.get(id)
  return { id, verdict: decided?.verdict ?? 'unresolved', a: a?.verdict, b: b?.verdict, tie: tieMap.get(id)?.verdict, reason: decided?.reason, points: decided?.points }
})
return { total: ids.length, disagreements: split.length, final }
