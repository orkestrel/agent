import type {
	AgentBuiltin,
	AgentOptions,
	AgentQueueOptions,
	AgentRegistryOptions,
	AgentRunnerOptions,
	AgentRunOptions,
	AuthorityNote,
	AuthorityOptions,
	BuiltinNote,
} from './types.js'
import type { ToolAnnotations } from '@orkestrel/tool'

/**
 * Caps an {@link AgentInterface} turn's tool iterations by default — `10` context → provider →
 * tools cycles before the loop stops, so a model that keeps requesting tools can never loop
 * forever. Overridable per agent through `AgentOptions.limit`.
 */
export const DEFAULT_AGENT_LIMIT = 10

/**
 * Opens a job tree finding that refuses a whole job, which sets it apart from a finding that names an exceeded member.
 *
 * @remarks
 * The `scanJobTree` helper writes it before the path of a job the contract refuses or a member read
 * makes unreadable, and the `AgentFanout` class reads it to open its refusal with the rule that
 * finding breaks. An
 * exceeded member's finding opens with `job`, so text later in a finding cannot pass for this
 * prefix.
 */
export const JOB_REFUSAL_PREFIX = 'refused '

/**
 * Holds the model-facing texts the loop writes after a tool name in a denial result — the
 * `denied` note for a deny with no reason, an evaluate throw, an invalid decision, or a tool
 * changed after its decision; the `refused` note for an ask the approver refused; and the
 * `unanswered` note for an ask no approver answered, frozen.
 */
export const AUTHORITY_NOTES: AuthorityNote = Object.freeze({
	denied: 'it is not allowed. Do not call it again; answer with what you have.',
	refused: 'it was refused. Do not call it again; continue without it.',
	unanswered:
		'it needs approval and none was given. Do not call it again; tell the user it needs approval.',
})

/**
 * Holds the texts the built-ins return on success — `loaded`, `unloaded`, `remembered`, and
 * `switched` — frozen.
 *
 * @remarks
 * `loaded`, `unloaded`, and `switched` are the texts the conversation's stored tool messages are
 * matched against to derive what a run shows, so each is one fixed constant. A stored message
 * counts only under a call to a built-in the run enables.
 */
export const BUILTIN_NOTES: BuiltinNote = Object.freeze({
	loaded: 'The skill is loaded. Its instructions and tools are yours from your next step.',
	unloaded: 'The skill is unloaded. Its instructions and tools leave from your next step.',
	remembered: 'The memo is saved. Continue with what you were doing.',
	switched: 'The workspace is selected. Its files are yours from your next step.',
})

/**
 * Caps each built-in argument in code points, as the built-in argument shapes count them — a `name`
 * (a skill name, a memo name, or a workspace id), a memo `description`, and a memo `content` — and
 * the `candidates` one refusal lists, frozen.
 */
export const BUILTIN_LIMITS: Readonly<{
	name: number
	description: number
	content: number
	candidates: number
}> = Object.freeze({
	name: 128,
	description: 200,
	content: 4000,
	candidates: 20,
})

/**
 * Declares each built-in tool's model-facing description and annotations, keyed by its
 * {@link AgentBuiltin} name, frozen.
 *
 * @remarks
 * `memo` is `pure` and `untrusted`, because it returns memo text a model can have written;
 * `remember` is `consequential`, so an `allow` verdict becomes an `ask`. A run's own tools and the
 * definitions `collectBuiltinDefinitions` returns both read their text and annotations here.
 */
export const BUILTIN_TOOLS: Readonly<
	Record<AgentBuiltin, Readonly<{ description: string; annotations?: ToolAnnotations }>>
> = Object.freeze({
	load: Object.freeze({
		description:
			'Loads one skill from the skills index, so its instructions join yours and its tools become callable from your next step. Example: {"skill":"refunds"}. Replies with a short acknowledgement, not the instructions; call unload when you no longer need the skill.',
	}),
	unload: Object.freeze({
		description:
			'Unloads one skill you loaded, so its instructions and tools leave from your next step. Example: {"skill":"refunds"}. Replies with a short acknowledgement.',
	}),
	memo: Object.freeze({
		description:
			'Reads one memo from the memos index and replies with its full text. Example: {"name":"tone"}. Reading changes nothing; call remember to write a memo.',
		annotations: Object.freeze({ pure: true, untrusted: true }),
	}),
	remember: Object.freeze({
		description:
			'Saves one memo under a name you are allowed to write: a one-line description for the memos index, and the content. Example: {"name":"tone","description":"Reply tone","content":"Keep replies brief, because the user asked for that."}. Replies with a short acknowledgement; call memo to read a memo back.',
		annotations: Object.freeze({ consequential: true }),
	}),
	switch: Object.freeze({
		description:
			'Selects one workspace from the workspaces index, so its files join your context from your next step. Example: {"workspace":"orders"}. Replies with a short acknowledgement.',
	}),
})

/**
 * Matches one control, format, line-separator, or paragraph-separator code point — the class
 * `renderArguments` encodes and a memo's one-line name and description may not hold, frozen.
 *
 * @remarks
 * Not global, so a `test` call keeps no state between calls; a global replace builds its own
 * global copy from `source`.
 */
export const ARGUMENT_CONTROL_PATTERN = Object.freeze(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u)

/**
 * Matches a text that is blank: empty after white space and default-ignorable code points, such
 * as U+3164, are removed, frozen.
 */
export const ARGUMENT_BLANK_PATTERN = Object.freeze(
	/^[\p{White_Space}\p{Default_Ignorable_Code_Point}]*$/u,
)

/**
 * Holds the model-facing text the loop writes after a tool name in the denial result of a call
 * outside the turn's tool ceiling, the context scope's tool allow-list intersected with the run
 * scope's, or whose name no definition advertises this turn.
 */
export const SCOPE_NOTE =
	'it is not one of the listed tools. Use a listed tool or answer with what you have.'

/**
 * Estimates the role and framing overhead added to each message by {@link estimateMessages}.
 */
export const MESSAGE_TOKEN_OVERHEAD = 4

/**
 * Names the coarse, deliberately approximate per-image token cost
 * {@link import('./helpers.js').estimateMessages} charges for each attached image — `512`, because
 * a base64 payload's length is no reliable token proxy.
 *
 * @remarks
 * A base64 image payload's length is not a reliable token proxy (a vision model's actual image
 * token cost depends on resolution / tiling, not byte size), so this is a fixed, coarse
 * per-image estimate rather than a derivation from `image.length` — a planning heuristic, not an
 * exact count.
 */
export const IMAGE_TOKEN_ESTIMATE = 512

/**
 * Lists the members `AgentOptions` declares, frozen — the keys the `Agent` constructor admits.
 *
 * @remarks
 * The constructor passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an own
 * enumerable member outside it refuses with a `ContractError` coded `'structure'`.
 */
export const AGENT_OPTION_KEYS = Object.freeze([
	'on',
	'error',
	'system',
	'tools',
	'instructions',
	'skills',
	'memos',
	'workspaces',
	'scope',
	'limit',
	'timeout',
	'budget',
	'allowance',
	'scheduler',
	'signal',
	'authority',
	'conversations',
	'window',
	'strict',
	'select',
	'builtins',
	'workspace',
] as const) satisfies ReadonlyArray<keyof AgentOptions>

/**
 * Lists the members `AgentRunOptions` declares, frozen — the keys the `stream` and `generate`
 * methods admit.
 *
 * @remarks
 * The `stream` method passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an own
 * enumerable member outside it refuses with a `ContractError` coded `'structure'`.
 */
export const AGENT_RUN_KEYS = Object.freeze([
	'think',
	'schema',
	'limit',
	'timeout',
	'budget',
	'allowance',
	'signal',
	'conversation',
	'prompt',
	'scope',
	'workspace',
] as const) satisfies ReadonlyArray<keyof AgentRunOptions>

/** Lists the members `AuthorityOptions` declares, frozen — the keys the `Authority` constructor admits. */
export const AUTHORITY_OPTION_KEYS = Object.freeze([
	'rules',
	'fallback',
	'ask',
] as const) satisfies ReadonlyArray<keyof AuthorityOptions>

/** Lists the members `AgentRegistryOptions` declares, frozen — the keys the `AgentRegistry` constructor admits. */
export const REGISTRY_OPTION_KEYS = Object.freeze([
	'providers',
	'tools',
	'authorities',
	'schedulers',
	'store',
	'skills',
	'memos',
	'workspaces',
] as const) satisfies ReadonlyArray<keyof AgentRegistryOptions>

/** Lists the members `AgentQueueOptions` declares, frozen — the keys `createAgentQueue` admits. */
export const QUEUE_OPTION_KEYS = Object.freeze([
	'registry',
	'partial',
	'concurrency',
	'retries',
	'timeout',
	'store',
] as const) satisfies ReadonlyArray<keyof AgentQueueOptions>

/** Lists the members `AgentRunnerOptions` declares, frozen — the keys `createAgentRunner` admits. */
export const RUNNER_OPTION_KEYS = Object.freeze([
	'registry',
	'partial',
	'concurrency',
	'retries',
	'timeout',
] as const) satisfies ReadonlyArray<keyof AgentRunnerOptions>
