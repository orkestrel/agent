import type {
	AgentContextOptions,
	ContextBuildOptions,
	InstructionManagerOptions,
	MemoManagerOptions,
	ScopeFilter,
	ScopeInput,
	ScopeManagerOptions,
	SkillManagerOptions,
} from './types.js'

/**
 * Names the section header the `build()` method of {@link import('./AgentContext.js').AgentContext}
 * renders the active workspace's text files under — `'## Workspace'`, the line that opens the
 * workspace section of the user context message that follows the system message.
 *
 * @remarks
 * `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the contexts module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block through
 * {@link import('./helpers.js').renderFencedFile}, and the section follows any memos index in the
 * context message, and is never part of the system message. The workspace's image files render no
 * section: their `base64` payload attaches to the last user message.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'

/**
 * Names the section header the loaded skills' bodies render under at the end of the system
 * message — `'## Loaded skills'`.
 */
export const LOADED_SECTION_HEADER = '## Loaded skills'

/**
 * Names the section header the admitted workspace ids render under in the user context message —
 * `'## Workspaces'`, rendered only while a run can select a workspace.
 */
export const WORKSPACE_INDEX_HEADER = '## Workspaces'

/**
 * Names the built-in section header a {@link import('./types.js').MemoManagerInterface} renders
 * its index under — `'## Memos'`, the `open` value when no `format.open` overrides it.
 *
 * @remarks
 * Each memo renders beneath it as one `- name: description` line through
 * {@link import('./helpers.js').renderIndexEntry}.
 */
export const MEMO_SECTION_HEADER = '## Memos'

/**
 * Names the built-in section header a {@link import('./types.js').SkillManagerInterface} renders
 * its index under — `'## Skills'`, the `open` value when no `format.open` overrides it.
 *
 * @remarks
 * Each skill renders beneath it as one `- name: description` line through
 * {@link import('./helpers.js').renderIndexEntry}.
 */
export const SKILL_SECTION_HEADER = '## Skills'

/**
 * Lists the members `ScopeInput` declares, frozen — the keys a `Scope` is built from.
 *
 * @remarks
 * The `Scope` constructor passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an
 * own enumerable member outside it, a misspelled list included, refuses with a `ContractError`
 * coded `'structure'` instead of building a scope with no constraint.
 */
export const SCOPE_KEYS = Object.freeze([
	'name',
	'select',
	'instructions',
	'skills',
	'memos',
	'tools',
	'files',
	'workspaces',
] as const) satisfies ReadonlyArray<keyof ScopeInput>

/**
 * Lists the members `ScopeFilter` declares, frozen — the keys the `narrow` method of a scope admits.
 *
 * @remarks
 * The `narrow` method passes the list to `refuseOptionKeys` of `@orkestrel/contract`, so an own
 * enumerable member outside it refuses with a `ContractError` coded `'structure'`.
 */
export const SCOPE_FILTER_KEYS = Object.freeze([
	'instructions',
	'skills',
	'memos',
	'tools',
	'files',
	'workspaces',
] as const) satisfies ReadonlyArray<keyof ScopeFilter>

/** Lists the members `AgentContextOptions` declares, frozen — the keys the `AgentContext` constructor admits. */
export const CONTEXT_OPTION_KEYS = Object.freeze([
	'system',
	'tools',
	'instructions',
	'skills',
	'memos',
	'workspaces',
	'scope',
	'conversations',
	'select',
] as const) satisfies ReadonlyArray<keyof AgentContextOptions>

/** Lists the members `ContextBuildOptions` declares, frozen — the keys the `build` method of an `AgentContext` admits. */
export const BUILD_OPTION_KEYS = Object.freeze([
	'selection',
	'scope',
	'disclosure',
	'switchable',
] as const) satisfies ReadonlyArray<keyof ContextBuildOptions>

/** Lists the members `InstructionManagerOptions` declares, frozen — the keys the `InstructionManager` constructor admits. */
export const INSTRUCTION_MANAGER_KEYS = Object.freeze([
	'on',
	'error',
	'format',
] as const) satisfies ReadonlyArray<keyof InstructionManagerOptions>

/** Lists the members `MemoManagerOptions` declares, frozen — the keys the `MemoManager` constructor admits. */
export const MEMO_MANAGER_KEYS = Object.freeze([
	'id',
	'on',
	'error',
	'format',
	'snapshot',
] as const) satisfies ReadonlyArray<keyof MemoManagerOptions>

/** Lists the members `ScopeManagerOptions` declares, frozen — the keys the `ScopeManager` constructor admits. */
export const SCOPE_MANAGER_KEYS = Object.freeze(['on', 'error'] as const) satisfies ReadonlyArray<
	keyof ScopeManagerOptions
>

/** Lists the members `SkillManagerOptions` declares, frozen — the keys the `SkillManager` constructor admits. */
export const SKILL_MANAGER_KEYS = Object.freeze([
	'on',
	'error',
	'format',
] as const) satisfies ReadonlyArray<keyof SkillManagerOptions>
