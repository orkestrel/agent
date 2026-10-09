import type { LedgerCategory, LedgerNote, LedgerQuestion, LedgerShare } from './types.js'

/**
 * Lists the categories the ledger files a message under, in the order the category question
 * names them — the one list the {@link LedgerCategory} union derives from.
 */
export const LEDGER_CATEGORIES = Object.freeze([
	'fact',
	'rule',
	'correction',
	'request',
	'opinion',
	'chatter',
	'distractor',
] as const)

/** Lists the categories whose messages the projection leaves out as quiet. */
export const QUIET_CATEGORIES: readonly LedgerCategory[] = Object.freeze(['chatter', 'distractor'])

/** Lists the categories whose messages state what the desk acts on, which the briefing renders. */
export const DECISIVE_CATEGORIES: readonly LedgerCategory[] = Object.freeze([
	'fact',
	'rule',
	'correction',
])

/** Lists the categories that place a message no owner claims on the rules record. */
export const PLACED_CATEGORIES: readonly LedgerCategory[] = Object.freeze(['rule', 'correction'])

/**
 * Supplies the measured wording of every question the ledger asks its judge.
 *
 * @remarks
 * The thresholds of the measured records series were fitted on exactly this wording, through the
 * Mica judge, so a cutoff fitted there holds only when the ledger asks these bytes. The wording
 * names a support desk; pass it unchanged to reuse those cutoffs, and fit your own cutoffs for
 * any other wording.
 */
export const LEDGER_QUESTIONS: LedgerQuestion = Object.freeze({
	category: Object.freeze({
		form: 'choice',
		instructions: 'Which category best describes what this support-desk message states?',
		criteria: Object.freeze({
			fact: 'States a fact about a customer, an order, an account, the desk, or the day',
			rule: 'States a standing rule, policy, or instruction the desk must follow',
			correction: 'Corrects, replaces, or withdraws a value or rule stated earlier',
			request: 'Asks the assistant to do a task or to answer a question',
			opinion: 'States a personal view or judgment rather than a fact',
			chatter: 'Talk with the agent that states nothing the desk acts on',
			distractor: "A statement about something outside the desk's work",
		}),
	}),
	topic: 'Does this support-desk message concern the named desk topic?',
	amends: Object.freeze({
		form: 'noul',
		instructions:
			'Does the later message replace or withdraw any value or rule the earlier message states?',
		criteria: Object.freeze({
			true: 'The later message replaces or withdraws at least one value or rule the earlier message states',
			false:
				'Every value and rule the earlier message states stays in force after the later message',
		}),
	}),
	supersedes: Object.freeze({
		form: 'noul',
		instructions:
			'Does the later message replace or withdraw everything the earlier message states?',
		criteria: Object.freeze({
			true: 'The later message replaces or withdraws everything the earlier message states',
			false: 'Some value or rule the earlier message states stays in force after the later message',
		}),
	}),
})

/**
 * Supplies the measured text of each ledger note, worded for a model that answers in its final
 * message.
 */
export const LEDGER_NOTES: LedgerNote = Object.freeze({
	cue: '[Desk] Give your complete answer now as your final message, from what you already have.',
	results: '[Desk] What your lookups and recalls returned in this request:',
	repeat:
		'You already have this result earlier in this request; give your complete answer now as your final message.',
	closed:
		'recall is closed for the rest of this request; give your final answer from what you have',
})

/**
 * Supplies the measured prompt and tail shares.
 *
 * @remarks
 * The `a5-records` series ran with a prompt share of 0.7 and a tail share of 0.35
 * (`tmp/bench/results/v9/a5-records-v1.log`, 2026-10-09).
 */
export const DEFAULT_LEDGER_SHARE: LedgerShare = Object.freeze({ prompt: 0.7, tail: 0.35 })

/**
 * Caps the tool-iteration turns of a ledger's agent at the measured limit of 8.
 *
 * @remarks
 * The measured harness set the agent's turn limit to 8 (`tmp/bench3/bench.mjs:3330`) in every
 * records run of 2026-10-09.
 */
export const DEFAULT_LEDGER_LIMIT = 8

/**
 * Caps the `recall` calls of one request at the measured limit of 2.
 *
 * @remarks
 * The `a5-records` series ran with `recall-budget 2` (`tmp/bench/results/v9/a5-records-v1.log`,
 * 2026-10-09).
 */
export const DEFAULT_RECALL_LIMIT = 2

/**
 * Holds back the share of the prompt budget the scale can rise by between calibration and a
 * request's first call.
 *
 * @remarks
 * Across the records of `results/v3/ledger-deny` and `results/v3/ledger-admit` (2026-10-08), a
 * request's first-call tokens per estimate unit rose at most from 1.150 at the seed to 1.212, 5.4
 * percent; the ledger divides its prompt budget by 1.06.
 */
export const LEDGER_SCALE_DRIFT = 0.06
