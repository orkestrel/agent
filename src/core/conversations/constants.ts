import type {
	ConversationInput,
	ConversationManagerOptions,
	ConversationOptions,
	ConversationReferenceOptions,
} from './types.js'

/** Lists the members `ConversationOptions` declares, frozen — the keys the `Conversation` constructor admits. */
export const CONVERSATION_OPTION_KEYS = Object.freeze([
	'id',
	'on',
	'error',
	'snapshot',
] as const) satisfies ReadonlyArray<keyof ConversationOptions>

/** Lists the members `ConversationManagerOptions` declares, frozen — the keys the `ConversationManager` constructor admits. */
export const CONVERSATION_MANAGER_KEYS = Object.freeze(['store'] as const) satisfies ReadonlyArray<
	keyof ConversationManagerOptions
>

/** Lists the members `ConversationInput` declares, frozen — the keys the `add` method of a `ConversationManager` admits. */
export const CONVERSATION_INPUT_KEYS = Object.freeze([
	'id',
	'on',
	'error',
	'snapshot',
] as const) satisfies ReadonlyArray<keyof ConversationInput>

/**
 * Matches a character a reference label refuses: a double quote, which would close the quoted name
 * in a marker early, or a line break (line feed, vertical tab, form feed, carriage return, next line,
 * line separator, or paragraph separator), which would start a line a marker or an excerpt could
 * claim. Frozen, and neither global nor sticky, so `test` keeps no position.
 */
export const REFERENCE_LABEL_PATTERN = Object.freeze(/["\n\v\f\r\u0085\p{Zl}\p{Zp}]/u)

/**
 * Matches one line break in an excerpt a reference block renders: a carriage return before a line
 * feed as one break, or any one of line feed, vertical tab, form feed, carriage return, next line,
 * line separator, and paragraph separator. Frozen and not global, so `split` reads it without
 * writing its position.
 */
export const REFERENCE_BREAK_PATTERN = Object.freeze(/\r\n|[\n\v\f\r\u0085\p{Zl}\p{Zp}]/u)

/** Lists the members `ConversationReferenceOptions` declares, frozen — the keys the `reference` method of a `Conversation` admits. */
export const REFERENCE_OPTION_KEYS = Object.freeze([
	'label',
	'messages',
] as const) satisfies ReadonlyArray<keyof ConversationReferenceOptions>
