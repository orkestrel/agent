/**
 * Lists the roles a conversation message can play, in the order the wire contract names them —
 * the one list the {@link import('./types.js').MessageRole} union derives from, the message
 * guard tests membership against, and the message shape passes to its literal contract.
 */
export const MESSAGE_ROLES = ['system', 'user', 'assistant', 'tool'] as const
