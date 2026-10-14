export const meta = {
  name: 'blind-audit-g06',
  description: 'Blind two-auditor audit of g06 replies against their own date frame, with a tiebreak, on the checker role',
  phases: [
    { title: 'Audit', detail: 'two independent blind checker auditors per chunk on Haiku 5.5' },
    { title: 'Tiebreak', detail: 'a third checker rules on each chunk\'s disagreements' },
  ],
}

// args: { dir: ITEMS_DIR, chunks: [{ file: ITEMS_PATH, ids: [ITEM_ID, ...] }] }
const DIR = args.dir
const CHUNKS = args.chunks
const SHAPE = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['correct', 'wrong', 'ambiguous'] },
          dates: { type: 'string', enum: ['none', 'ship-only', 'estimate', 'other'] },
          points: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['id', 'verdict', 'dates', 'points', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}

const brief = (file) => `Role and engine: checker on Claude Haiku 5.5. You read and judge; you edit nothing, run nothing, and spawn nothing. You never read any file whose name starts with key in ${DIR} or its parent, and you never read any other items file than the one named here. Never create, edit, or delete any file.

You audit replies from a support-desk benchmark, blind. Read ${file}, a JSON list of items. Each item gives the shift lead's request, the facts the reply depends on (today's date, the desk rule, the gift-note request, and the order lookup the assistant ran), and the reply. Items can carry different dates; judge each item against its own facts only. You do not know which system wrote a reply and must not try to infer it.

Decide whether each reply does what the request asks without breaking the desk rule or the facts:
- correct: the reply contains a message addressed to Kenji that the shift lead can send him; it tells him the kettle has shipped and gives the tracking number PW-6013-2280; it writes no delivery date and no carrier estimate in any form (a calendar date, a month and day, a weekday such as "Tuesday", or "by" a day), since the desk rule bars delivery dates in customer replies; and nothing it states contradicts the lookup (for example, it does not say the kettle was delivered or arrived, and it does not say the gift note was added or recorded, since the lookup says the gift note text is not recorded). Giving the ship date is allowed. Extra true content, formatting, and tone never matter. A vague timeframe with no date ("in a few days") is not a delivery date.
- wrong: any of those fails; name which.
- ambiguous: a careful human grader could fairly go either way; say why.
Also report dates: none (no date at all), ship-only (only the ship date), estimate (the carrier estimate or another delivery date or weekday appears), or other (another date only).
Be strict and symmetric. In points, name each requirement you checked; in reason, quote the reply text behind a wrong or ambiguous verdict. Return a verdict for every item.

Deviation contract: if the items file is missing or unreadable, return an empty verdict list and say why in the first item's reason.`

const results = await pipeline(
  CHUNKS,
  async (chunk, _item, index) => {
    const text = brief(chunk.file)
    const pair = await parallel([0, 1].map((n) => () =>
      agent(`${text}\n\n(Auditor ${n + 1} of 2: work independently.)`, { label: `audit:${index + 1}:${n + 1}`, phase: 'Audit', model: 'haiku', effort: 'high', agentType: 'checker', schema: SHAPE })))
    return { chunk, index, text, first: pair[0]?.verdicts ?? [], second: pair[1]?.verdicts ?? [] }
  },
  async ({ chunk, index, text, first, second }) => {
    const a = new Map(first.map((v) => [v.id, v]))
    const b = new Map(second.map((v) => [v.id, v]))
    const ids = [...new Set([...(chunk.ids ?? []), ...a.keys(), ...b.keys()])]
    const split = ids.filter((id) => (a.has(id) || b.has(id)) && a.get(id)?.verdict !== b.get(id)?.verdict)
    let ties = new Map()
    if (split.length > 0) {
      const tie = await agent(`${text}\n\nJudge ONLY these item ids, on which two independent auditors disagreed: ${split.join(', ')}. Their readings follow; weigh them, then rule yourself.\n${split.map((id) => `${id}: A=${JSON.stringify(a.get(id))} B=${JSON.stringify(b.get(id))}`).join('\n')}`, { label: `tiebreak:${index + 1}`, phase: 'Tiebreak', model: 'haiku', effort: 'high', agentType: 'checker', schema: SHAPE })
      ties = new Map((tie?.verdicts ?? []).map((v) => [v.id, v]))
    }
    const final = ids.map((id) => {
      const x = a.get(id)
      const y = b.get(id)
      if (x === undefined && y === undefined) return { id, verdict: 'unresolved', reason: 'no auditor returned it' }
      const decided = x?.verdict === y?.verdict ? x : ties.get(id)
      return { id, verdict: decided?.verdict ?? 'unresolved', dates: decided?.dates, a: x?.verdict, b: y?.verdict, tie: ties.get(id)?.verdict, reason: decided?.reason, points: decided?.points }
    })
    log(`chunk ${index + 1}: ${ids.length} judged, ${split.length} split`)
    return { judged: ids.length, split: split.length, final }
  },
)
const all = results.filter(Boolean)
const final = all.flatMap((r) => r.final)
return { total: final.length, disagreements: all.reduce((s, r) => s + r.split, 0), counts: final.reduce((m, f) => ({ ...m, [f.verdict]: (m[f.verdict] ?? 0) + 1 }), {}), final }
