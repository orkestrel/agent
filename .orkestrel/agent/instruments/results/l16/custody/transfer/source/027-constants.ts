/** Holds the accepted reserve ladder in its required order. */
export const MATRIX_RESERVES: readonly number[] = Object.freeze([512, 1024, 2048, 4096, 8192])

/** Holds the paired initial admission ceiling independently of physical context. */
export const MATRIX_ADMISSION = 2560

/** Holds the complete evaluation stage order. */
export const MATRIX_STAGES = Object.freeze({
	A: Object.freeze({ keys: Object.freeze(['q2']), copies: Object.freeze([2, 3, 4, 5]) }),
	B: Object.freeze({
		keys: Object.freeze(['g2', 'g4', 'q4']),
		copies: Object.freeze([2, 3, 4, 5]),
	}),
	C: Object.freeze({
		keys: Object.freeze(['q2', 'g2', 'g4', 'q4']),
		copies: Object.freeze([6, 7, 8]),
	}),
})

/** Names the raw evidence every complete run retains. */
export const MATRIX_FILES: readonly string[] = Object.freeze([
	'run.json',
	'rows.jsonl',
	'selections.jsonl',
	'requests.jsonl',
	'turns.jsonl',
	'calls.jsonl',
	'messages.jsonl',
	'judgments.jsonl',
	'model-inventory.json',
])

/** Names capacity refusals reported by the external daemon. */
export const MATRIX_CAPACITY =
	/context|too long|exceed|out of memory|cannot allocate|requires more|insufficient memory/i
