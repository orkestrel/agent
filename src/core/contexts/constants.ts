/**
 * Names the section header the `build()` method of {@link import('./AgentContext.js').AgentContext}
 * renders the active workspace's text files under — `'## Workspace'`, the leading line of the user
 * context message that follows the system message.
 *
 * @remarks
 * `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the contexts module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block through
 * {@link import('./helpers.js').renderFencedFile}, and the section is the whole content of the
 * context message, never part of the system message. The workspace's image files render no
 * section: their `base64` payload attaches to the last user message.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'

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
