import type { NoulQuestion } from '@orkestrel/agent'
import type { StudySentenceTarget } from './types.js'

/** Holds the accepted question bytes from proposal SHA-256 0dd585607980d35dd8417be06a8ecb5a7015856086486065adb835c632841cc2. */
export const STUDY_SENTENCE_QUESTION: NoulQuestion = Object.freeze({
	form: 'noul',
	instructions:
		'Does the later message replace or withdraw anything that the sentence of the earlier message states? A shared name, identifier, number or date alone is not a change.',
	criteria: Object.freeze({
		true: 'The later message replaces or withdraws a value, instruction or permission that the sentence states, with or without giving a replacement',
		false:
			'Everything that the sentence states stays true or in force after the later message, including any past event it records',
	}),
})

/** Holds the unchanged public correction boundaries. */
export const STUDY_SENTENCE_CORRECTIONS = Object.freeze([
	'ev-side-5',
	'ev-side-7',
	'ev-side-8',
	'ev-side-9',
	'ev-source-13-2',
	'ev-source-13-3',
	'ev-source-14-2',
	'ev-source-15-1',
	'ev-source-15-3',
	'ev-source-15-4',
	'ev-source-16-1',
	'ev-source-16-2',
	'ev-source-16-3',
	'ev-source-17-1',
	'ev-source-17-2',
	'ev-source-17-4',
	'ev-source-18-3',
	'ev-source-19-4',
	'ev-source-20-1',
	'ev-source-20-3',
	'ev-source-21-2',
	'ev-source-22-1',
	'ev-source-22-3',
	'ev-source-23-3',
])

/** Holds the partition policy fixed before labels. */
export const STUDY_SENTENCE_VALIDATION = Object.freeze([
	'BC-7302',
	'BC-7303',
	'BC-7308',
	'BC-7310',
	'BC-7311',
])

/** Holds the required R source/version identities; the lookup is the recorded released reading. */
export const STUDY_SENTENCE_REQUIRED: readonly StudySentenceTarget[] = Object.freeze([
	Object.freeze({ earlier: Object.freeze({ id: 'ev-source-2-1', version: 4 }), later: Object.freeze({ id: 'ev-source-14-2', version: 52 }), sentence: 0 }),
	Object.freeze({ earlier: Object.freeze({ id: 'ev-source-2-2', version: 4 }), later: Object.freeze({ id: 'ev-source-14-2', version: 52 }), sentence: 0 }),
	Object.freeze({ earlier: Object.freeze({ id: 'ev-source-2-4', version: 4 }), later: Object.freeze({ id: 'ev-source-14-2', version: 52 }), sentence: 0 }),
	Object.freeze({ earlier: Object.freeze({ id: 'ev-source-14-1', version: 52 }), later: Object.freeze({ id: 'ev-source-14-2', version: 52 }), sentence: 0 }),
	Object.freeze({ earlier: Object.freeze({ id: 'order:BC-7302', version: 4 }), later: Object.freeze({ id: 'ev-source-14-2', version: 52 }), sentence: 0 }),
])

/** Holds the unconditional cost policy with U29's 13.5-minute pre-call admission limit in seconds. */
export const STUDY_SENTENCE_BUDGET = Object.freeze({
	repeats: 8,
	seconds: 2.858 * 1.25,
	limit: 13.5 * 60,
})
