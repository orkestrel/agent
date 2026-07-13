import type { WorkspaceOperation } from './types.js'

/**
 * The default cap on an {@link AgentInterface} turn's tool iterations — the maximum
 * number of context → provider → tools cycles before the loop stops, so a model that
 * keeps requesting tools can never loop forever. Overridable per agent via
 * `AgentOptions.limit`.
 */
export const DEFAULT_AGENT_LIMIT = 10

/**
 * The zone an {@link AuthorityInterface}'s default fallback {@link AuthorityDecision}
 * carries — the classification for a tool call that matched no rule. Paired with the
 * default `allowed: true` fallback, an unmatched call is allowed under this zone, so a
 * rules list of denials acts as a denylist; a caller wanting deny-by-default supplies
 * an `allowed: false` `fallback` of their own (see `AuthorityOptions`).
 */
export const DEFAULT_AUTHORITY_ZONE = 'default'

/**
 * The default number of recent live messages a {@link ConversationInterface}'s `compact()`
 * RETAINS verbatim — `0`, so a manual `compact()` folds ALL of the current live messages
 * into one summarized section (no tail kept). A caller retains a recent tail by passing
 * `keep` (on {@link ConversationOptions}, {@link ConversationManagerOptions}, or per-fold
 * via {@link CompactOptions}), folding only the older `count - keep` messages and leaving
 * the most recent `keep` live for the next turn. Overridable everywhere `keep` is accepted.
 */
export const DEFAULT_CONVERSATION_KEEP = 0

/**
 * The framing label a {@link ConversationInterface}'s `view()` prefixes onto each compacted
 * section's summary so a small model reads it as a CONDENSED RECAP of earlier turns — not a
 * literal assistant turn to echo or treat as the live answer.
 *
 * @remarks
 * Deliberately a FIXED, lean handful of tokens (a short bracketed marker) so the framing adds a
 * bounded `prefix × sections` overhead and NEVER an open-ended blow-up — the
 * {@link ConversationInterface} no-bloat test guard pins exactly that. Kept here (beside
 * {@link DEFAULT_CONVERSATION_KEEP}) as the conversation layer's one tunable framing constant, so
 * the wording has a single source of truth as it is optimized against real small-model behavior
 * (the `view()` recap framing is distinct from `reference()`'s cross-conversation provenance
 * marker, which is rendered inline since it interpolates the per-call provenance `label`).
 */
export const CONVERSATION_RECAP_PREFIX = '[Summary of earlier messages] '

/**
 * The opening tag a {@link import('./ThinkSplitter.js').ThinkSplitter} recognizes as the start of
 * an in-content reasoning span — the de-facto wire convention thinking models (qwen3, DeepSeek-R1
 * family) emit their chain-of-thought under when a daemon renders it inline instead of on a
 * separate wire field. Paired with {@link THINK_CLOSE}.
 */
export const THINK_OPEN = '<think>'

/**
 * The closing tag that ends a {@link THINK_OPEN} reasoning span. A span the stream never closes
 * (the model was cut off mid-reasoning) is treated as thinking to its end —
 * {@link import('./types.js').ThinkSplitterInterface.flush} settles it.
 */
export const THINK_CLOSE = '</think>'

/**
 * The section header {@link import('./AgentContext.js').AgentContext}'s `build()` renders the
 * ACTIVE workspace's TEXT files under — the leading line of the dedicated workspace block in the
 * system message, the carrier-split counterpart to the documents / images section headers.
 *
 * @remarks
 * `build()` OWNS the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `description` / `framing` getters), so this header lives here as the agents module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block — the SAME framing
 * the documents section uses — placed just after the documents section in the system block.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'

/**
 * The extension→language table {@link import('./helpers.js').inferLanguage} reads to
 * map a file path's extension to a fenced-code language tag. Covers the common source /
 * markup / data extensions; an unlisted extension falls back to `'text'`.
 */
export const EXTENSION_TO_LANGUAGE: Readonly<Record<string, string>> = Object.freeze({
	ts: 'typescript',
	tsx: 'typescript',
	js: 'javascript',
	jsx: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	json: 'json',
	md: 'markdown',
	html: 'html',
	htm: 'html',
	css: 'css',
	scss: 'scss',
	sass: 'sass',
	less: 'less',
	vue: 'vue',
	svelte: 'svelte',
	py: 'python',
	rb: 'ruby',
	rs: 'rust',
	go: 'go',
	java: 'java',
	kt: 'kotlin',
	swift: 'swift',
	c: 'c',
	cpp: 'cpp',
	h: 'c',
	hpp: 'cpp',
	cs: 'csharp',
	php: 'php',
	sql: 'sql',
	sh: 'bash',
	bash: 'bash',
	zsh: 'bash',
	ps1: 'powershell',
	yaml: 'yaml',
	yml: 'yaml',
	toml: 'toml',
	xml: 'xml',
	svg: 'xml',
	txt: 'text',
})

// Workspace-tool constants — the model-facing surface `createWorkspaceTool` (factories.ts)
// advertises. UPPER_SNAKE, `Object.freeze`d, every member exported (AGENTS §5). The
// description teaches a small model the `operation`-discriminated union (mirroring
// `WORKFLOW_TOOL_DESCRIPTION`'s teaching style): it names the discriminant, enumerates the
// 13 ops with their FLAT fields (the 11 edit / read ops over the ACTIVE workspace plus the
// `workspaces` / `switch` registry ops), and embeds a verbatim worked example pinned by a test.

/**
 * The name {@link import('./factories.js').createWorkspaceTool} advertises by default — the key a
 * model calls and the {@link import('./types.js').ToolManagerInterface} registers under.
 */
export const WORKSPACE_TOOL_NAME = 'workspace'

/**
 * A valid {@link WorkspaceOperation} object — the canonical example embedded VERBATIM in
 * {@link WORKSPACE_TOOL_DESCRIPTION} and pinned by a parity test (it must satisfy the compiled
 * contract's `is`), so the doc example can never drift from a real, contract-valid operation.
 *
 * @remarks
 * A `'write'` op (the most common authoring action): create or overwrite `notes.txt` with
 * `hello`. Frozen so it cannot be mutated in place.
 */
export const WORKSPACE_TOOL_EXAMPLE: WorkspaceOperation = Object.freeze({
	operation: 'write',
	path: 'notes.txt',
	content: 'hello',
})

/**
 * The DESCRIPTION {@link import('./factories.js').createWorkspaceTool} advertises — a multi-line
 * guide that teaches a small model how to drive a workspace through the single `operation`-keyed
 * tool.
 *
 * @remarks
 * Mirrors {@link import('../workflows/constants.js').WORKFLOW_TOOL_DESCRIPTION}'s teaching style:
 * names the `operation` discriminant field, enumerates all 13 operations with their FLAT fields,
 * gives a worked example for the common ones (read / write / search / replace / splice), and embeds
 * {@link WORKSPACE_TOOL_EXAMPLE} verbatim (pinned by a parity test). The range edit is the FLAT
 * `'splice'` op — four positive-integer caret components, NOT a nested range — the ergonomic lever
 * a 2B model can fill. The edit / read ops target the ACTIVE workspace (one is auto-created on the
 * first edit when none is active); the `workspaces` / `switch` ops let the model move between
 * workspaces.
 */
export const WORKSPACE_TOOL_DESCRIPTION = [
	'Read and edit files in a workspace. Every call is ONE operation, chosen by the "operation" field.',
	'All file operations act on the ACTIVE workspace; use "workspaces" then "switch" to move between workspaces.',
	'',
	'Operations (each takes the fields listed):',
	'- read     { "operation": "read", "path": "<file>" } — return the file\'s text.',
	'- list     { "operation": "list" } — list every file in the active workspace (path, state, size, lines, kind).',
	'- has      { "operation": "has", "path": "<file>" } — whether the file exists.',
	'- search   { "operation": "search", "query": "<text>", "regex"?: bool, "exact"?: bool, "limit"?: int } — find lines matching the query across all files.',
	'- replace  { "operation": "replace", "query": "<text>", "replacement": "<text>", "regex"?: bool, "exact"?: bool, "limit"?: int } — replace matches across all files.',
	'- write    { "operation": "write", "path": "<file>", "content": "<text>" } — create or overwrite the whole file.',
	'- splice   { "operation": "splice", "path": "<file>", "content": "<text>", "fromLine": int, "fromColumn": int, "toLine": int, "toColumn": int } — replace a 1-based range (from inclusive, to exclusive) with content.',
	'- prepend  { "operation": "prepend", "path": "<file>", "content": "<text>" } — add content to the start of the file.',
	'- append   { "operation": "append", "path": "<file>", "content": "<text>" } — add content to the end of the file.',
	'- move     { "operation": "move", "from": "<file>", "to": "<file>" } — rename / move a file.',
	'- remove   { "operation": "remove", "path": "<file>" } — delete a file.',
	'- workspaces { "operation": "workspaces" } — list the workspaces you can switch between (each id, file count, active).',
	'- switch   { "operation": "switch", "id": "<id>" } — make the workspace with that id active (ids come from "workspaces").',
	'',
	'Notes: lines and columns are 1-based (column 1 is the first character). "regex" defaults to false (a literal substring), "exact" defaults to true (case-sensitive). "search"/"replace"/"splice" act only on text files. Editing with no active workspace auto-creates one.',
	'',
	'Example — write a file:',
	JSON.stringify(WORKSPACE_TOOL_EXAMPLE),
].join('\n')
