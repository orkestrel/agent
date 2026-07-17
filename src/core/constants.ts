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
