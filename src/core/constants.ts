/**
 * Lists the roles any message can play, the built `system` head included, in the order the wire
 * contract names them — the one list the {@link import('./types.js').MessageRole} union derives
 * from, the message guard tests membership against, and the message shape passes to its literal
 * contract.
 */
export const MESSAGE_ROLES = Object.freeze(['system', 'user', 'assistant', 'tool'] as const)

/**
 * Lists the roles a stored conversation message can play: every `MESSAGE_ROLES` member except
 * `system`, in wire order — the one list the {@link import('./types.js').ConversationRole} union
 * derives from and a conversation checks each stored or selected role against.
 */
export const CONVERSATION_ROLES = Object.freeze(['user', 'assistant', 'tool'] as const)

/**
 * Matches a token of letters and digits joined by hyphens, which `extractLiterals` reads as an id
 * when it holds a digit.
 *
 * @remarks
 * `String.prototype.match` and `String.prototype.replace` reset the pattern's `lastIndex`, so this
 * shared instance keeps no position between reads.
 */
export const LITERAL_ID = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/g

/**
 * Matches a run of digits with grouping commas and a decimal part that no letter, digit,
 * underscore, or point precedes, which `extractLiterals` reads as a number outside the id tokens.
 *
 * @remarks
 * `String.prototype.match` and `String.prototype.replace` reset the pattern's `lastIndex`, so this
 * shared instance keeps no position between reads.
 */
export const LITERAL_NUMBER = /(?<![\w.])\d[\d,]*(?:\.\d+)?/g
