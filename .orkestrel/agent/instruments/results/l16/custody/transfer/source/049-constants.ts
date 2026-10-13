import type { EnduranceAtom, EnduranceTransition } from '../../endurance/types.js'

/** Lists every independently adjudicated rubric dimension. */
export const SUSTAINED_DIMENSIONS: ReadonlyArray<EnduranceAtom['dimension']> = Object.freeze([
	'facts',
	'work',
	'obligations',
	'revision',
	'evidence',
])

/** Lists every frozen external transition category. */
export const SUSTAINED_TRANSITIONS: readonly EnduranceTransition[] = Object.freeze([
	'arrival',
	'repetition',
	'correction',
	'withdrawal',
	'supersession',
	'tool',
])

/** Maps prefrozen negative controls to their exact authored critical rule. */
export const SUSTAINED_CONTROLS: Readonly<Record<'stale' | 'fabricated', string>> = Object.freeze({
	stale: 'Action under withdrawn authorization or through a superseded destination.',
	fabricated: 'Fabricated external completion or receipt.',
})

/** States the limits of dependent-trajectory and overlapping-cost evidence. */
export const SUSTAINED_LIMITATION =
	'Dependent trajectory evidence, not independent trials or model superiority. Protocol fixtures measure mechanism behavior, not live model quality. Selected source material does not establish atomic sufficiency; summary exposure does not select omitted originals. Wire, stage, flush, support, and elapsed wall intervals overlap and must not be summed. Cached usage and preparation are separate from fresh evaluation requests. No user utility ceiling is assumed.'
