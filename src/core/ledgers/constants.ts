import type {
	ClassifierOptions,
	GaugeOptions,
	LedgerAgentOptions,
	LedgerCategory,
	LedgerNote,
	LedgerOptions,
	LedgerQuestion,
	LedgerShare,
} from './types.js'

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

/** Lists the categories whose messages state what the desk acts on, which the records render. */
export const DECISIVE_CATEGORIES: readonly LedgerCategory[] = Object.freeze([
	'fact',
	'rule',
	'correction',
])

/** Lists the categories that place a message no owner claims on the rules record. */
export const PLACED_CATEGORIES: readonly LedgerCategory[] = Object.freeze(['rule', 'correction'])

/** Names the key of the record that holds the rules no owner claims. */
export const LEDGER_RULES_KEY = 'rules'

/** Prefixes the key of an owner's record, which the owner's id follows. */
export const LEDGER_OWNER_PREFIX = 'owner:'

/** Labels recalled conversation text by its origin. */
export const LEDGER_RECALL_LABELS = Object.freeze({
	request: 'Earlier request:',
	reply: 'Earlier reply:',
})

/**
 * Supplies the wording of every question the ledger asks its judge.
 *
 * @remarks
 * The wording names a support desk. Fit the cutoffs for the wording and judge you use.
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
 * Supplies the text of each ledger note, worded for a model that answers in its final
 * message.
 *
 * @remarks
 * `overflow` names `unload` because a skill the thread shows is the room a model can give back: a
 * successful `unload` reopens every call the room denied in that request.
 */
export const LEDGER_NOTES: LedgerNote = Object.freeze({
	cue: 'Give your complete answer to the request now, from what you already have.',
	results: 'Your lookups and recalls in this request returned:',
	repeat:
		'You already have this result earlier in this request; give your complete answer now as your final message.',
	closure:
		'recall is closed for the rest of this request; give your final answer from what you have',
	overflow:
		'there is no room left for it in this request. Unload a skill you no longer need before you call it again, or answer with what you have.',
})

/**
 * Supplies the default prompt, tail, and skills shares.
 */
export const DEFAULT_LEDGER_SHARE: LedgerShare = Object.freeze({
	prompt: 0.7,
	tail: 0.35,
	skills: 0.5,
})

/**
 * Caps the tool-iteration turns of a ledger's agent at 8 turns.
 */
export const DEFAULT_LEDGER_LIMIT = 8

/**
 * Caps the `recall` calls of one request at 2 calls.
 */
export const DEFAULT_RECALL_LIMIT = 2

/**
 * Sets the 5 milliseconds a paced classifier files between host turns.
 *
 * @remarks
 * Time, not a count of steps, so a slice on a slow device is the same 5 milliseconds.
 */
export const LEDGER_SLICE = 5

/**
 * Holds back the share of the prompt budget the scale can rise by between calibration and a
 * request's first call.
 *
 * @remarks
 * Across the `ledger-deny` and `ledger-admit` series of 2026-10-08, a
 * request's first-call tokens per estimate unit rose at most from 1.150 at the seed to 1.212, 5.4
 * percent; the ledger divides its prompt budget by 1.06.
 */
export const LEDGER_SCALE_DRIFT = 0.06

/**
 * Matches a run of letters and digits, which the ledger reads as one word.
 *
 * @remarks
 * `String.prototype.match` resets the pattern's `lastIndex`, so this shared instance keeps no
 * position between reads.
 */
export const LEDGER_WORD = /[\p{L}\p{N}]+/gu

/** Matches the logprob decoding failure `invalid or duplicate top logprob token`, which the ledger holds for the ledger's life. */
export const DETERMINISTIC_JUDGE_ERROR = /invalid or duplicate top logprob token/

/**
 * Lists the members `LedgerOptions` declares, frozen — the keys the `Ledger` constructor admits.
 *
 * @remarks
 * The constructor passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an own
 * enumerable member outside it refuses with a `ContractError` coded `'structure'`.
 */
export const LEDGER_OPTION_KEYS = Object.freeze([
	'judge',
	'system',
	'topics',
	'questions',
	'thresholds',
	'capacity',
	'predict',
	'think',
	'gauge',
	'lookups',
	'writes',
	'share',
	'recall',
	'correction',
	'agent',
	'snapshot',
] as const) satisfies ReadonlyArray<keyof LedgerOptions>

/**
 * Lists the members the `LedgerAgentOptions` pick declares, frozen — the keys a ledger's `agent`
 * option admits.
 *
 * @remarks
 * The `Ledger` constructor passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an
 * own enumerable member outside it, an `AgentOptions` member the pick leaves out included, refuses
 * with a `ContractError` coded `'structure'`.
 */
export const LEDGER_AGENT_KEYS = Object.freeze([
	'limit',
	'timeout',
	'on',
	'scheduler',
	'instructions',
	'skills',
	'memos',
	'workspaces',
	'strict',
	'authority',
	'builtins',
	'workspace',
] as const) satisfies ReadonlyArray<keyof LedgerAgentOptions>

/** Lists the members `ClassifierOptions` declares, frozen — the keys the `Classifier` constructor admits. */
export const CLASSIFIER_OPTION_KEYS = Object.freeze([
	'strict',
	'conversation',
	'judge',
	'questions',
	'topics',
	'thresholds',
	'assign',
	'entities',
	'correction',
	'scheduler',
] as const) satisfies ReadonlyArray<keyof ClassifierOptions>

/** Lists the members `GaugeOptions` declares, frozen — the keys the `Gauge` constructor admits. */
export const GAUGE_OPTION_KEYS = Object.freeze([
	'scale',
	'overhead',
	'capacity',
	'predict',
	'replay',
] as const) satisfies ReadonlyArray<keyof GaugeOptions>

/**
 * Sets the 3 UTF-8 bytes one UTF-16 code unit encodes to at most, the divisor that sizes the
 * workspace text a calibration's third call carries.
 *
 * @remarks
 * A tokenizer that falls back to bytes charges at most one token a byte, so workspace text cut to the
 * capacity the call without definitions left, divided by this figure, in characters, reports at most
 * `capacity` apart from a template's few tokens for an added message.
 */
export const LEDGER_SAMPLE_BYTES = 3
