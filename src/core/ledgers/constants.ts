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

/**
 * Names the key of the record that holds the rules no owner claims, which is also the recall key
 * that lists that record's lines.
 */
export const LEDGER_RULES_KEY = 'rules'

/**
 * Names the recall key that lists the last exchange before the current request that has a reply:
 * the request and its reply.
 *
 * @remarks
 * It is the first exchange key; `previous-N` names the exchange N back, with `previous` as depth 1.
 */
export const LEDGER_PREVIOUS_KEY = 'previous'

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
	closure: 'recall is closed for the rest of this request; continue without it',
	overflow:
		'there is no room left for it in this request. Unload a skill you no longer need before you call it again, or answer with what you have.',
})

/**
 * Supplies the default prompt and skills shares.
 *
 * @remarks
 * The prompt share is the one the chat and memory study sessions pass.
 */
export const DEFAULT_LEDGER_SHARE: LedgerShare = Object.freeze({
	prompt: 1,
	skills: 0.5,
})

/**
 * Lists the members `LedgerShare` declares, frozen — the keys a ledger's `share` option admits.
 *
 * @remarks
 * The `Ledger` constructor passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an
 * own enumerable member outside it refuses with a `ContractError` coded `'structure'`.
 */
export const LEDGER_SHARE_KEYS = Object.freeze([
	'prompt',
	'skills',
] as const) satisfies ReadonlyArray<keyof LedgerShare>

/**
 * Caps the tool-iteration turns of a ledger's agent at 8 turns.
 */
export const DEFAULT_LEDGER_LIMIT = 8

/**
 * Caps the `recall` calls of one request at 4 calls.
 */
export const LEDGER_RECALL_LIMIT = 4

/** Caps at 8 the recall keys a `recall` call that lists nothing names back. */
export const LEDGER_MISS_LIMIT = 8

/** Caps at 20 the id keys the Earlier index of a request copy lists. */
export const LEDGER_KEY_LIMIT = 20

/**
 * Caps at 8 the exchange keys the Earlier index of a request copy lists, for the exchanges the recent window leaves out.
 *
 * @remarks
 * The cap is apart from `LEDGER_KEY_LIMIT`, so an exchange key never takes an id key's place. A
 * deeper `previous-N` still resolves when that exchange exists.
 */
export const LEDGER_EXCHANGE_LIMIT = 8

/**
 * Caps at 8 the exchanges of a request's subject window, the newest counted as one, each a request, its call turns and results, and its reply.
 *
 * @remarks
 * The subject window holds the newest exchange that has a reply, then the newest exchanges on the
 * request's subject, newest first, so the cap counts members after that filter and never sets a
 * depth. The newest shows whole, less its all-`recall` call groups, or as its request and reply
 * alone, as its share allows, else its request shows as a copy. Each later member whose depth runs
 * unbroken back from the newest shows whole or less its all-`recall` groups, and each member past
 * the first gap shows its request and reply alone; the window stops at the first that
 * `LEDGER_RECENT_SHARE` leaves no room for. A shown exchange gets no row in the Earlier index.
 */
export const LEDGER_RECENT_LIMIT = 8

/**
 * Caps the subject window past its newest exchange at 0.3 of the plan's `total`, the prompt budget net of the head's overhead, the skill holdback, and the scale drift.
 *
 * @remarks
 * The window's messages are priced as the opening sends them, through the gauge's scale. The newest
 * exchange takes at most 0.45 of `total`, the sum of this share and `LEDGER_RELEVANT_SHARE`, and so
 * does the whole window; the members past the newest stop at the first that would take them past
 * this share or the window past that sum.
 */
export const LEDGER_RECENT_SHARE = 0.3

/**
 * Lists the bases a retrieved match rests on, strongest first: an id the request names, an id it inherits from the last answered request, a desk topic, shared words, then a request of the subject window's contiguous run that its shares cut — the one list the {@link LedgerMatchBasis} union derives from.
 *
 * @remarks
 * A match on an inherited id ranks below one on the request's own ids, and shared words fill only
 * the places the stronger bases leave. An inherited, topic, or word match holds only on the
 * request's subject, and never for an older recurrence member with no known id. A `recent` match is
 * exempt from the stale test, the subject scope, and `LEDGER_RELEVANT_LIMIT`, and comes after the
 * other matches.
 */
export const LEDGER_MATCH_BASES = Object.freeze([
	'entity',
	'inherited',
	'topic',
	'word',
	'recent',
] as const)

/**
 * Caps at 8 the earlier user messages a request's opening retrieves by relevance, each with its amenders.
 *
 * @remarks
 * `LEDGER_RELEVANT_SHARE` binds first on most budgets, so the count is a ceiling.
 */
export const LEDGER_RELEVANT_LIMIT = 8

/**
 * Caps the recurrence and, apart, the brief at 0.15 of the plan's `total`, the prompt budget net of the head's overhead, the skill holdback, and the scale drift, and with `LEDGER_RECENT_SHARE` caps the retrieved messages.
 *
 * @remarks
 * The retrieved matches are taken in rank order, priced as the opening sends them, up to the first
 * that would take them past 0.45 of `total`, the sum of this share and `LEDGER_RECENT_SHARE`, less
 * the recurrence and the shown window, and never below 0. The brief's members are taken in
 * conversation order up to the first that would take them past this share; the brief is charged to
 * `total` and never to the retrieved matches' room, and the members past the share stay retrieval
 * candidates.
 */
export const LEDGER_RELEVANT_SHARE = 0.15

/**
 * Caps at 3 the registry ids an exchange row's tags name.
 *
 * @remarks
 * Each id carries its owner's first name once per row, so two ids of one owner name it once.
 */
export const LEDGER_TAG_LIMIT = 3

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
	'authority',
	'builtins',
	'workspace',
] as const) satisfies ReadonlyArray<keyof LedgerAgentOptions>

/** Lists the members `ClassifierOptions` declares, frozen — the keys the `Classifier` constructor admits. */
export const CLASSIFIER_OPTION_KEYS = Object.freeze([
	'conversation',
	'judge',
	'questions',
	'topics',
	'thresholds',
	'assign',
	'entities',
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
