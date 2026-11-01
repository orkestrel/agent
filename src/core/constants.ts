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
