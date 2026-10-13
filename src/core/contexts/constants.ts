/**
 * Names the section header the `build()` method of {@link import('./AgentContext.js').AgentContext}
 * renders the active workspace's text files under — `'## Workspace'`, the leading line of the dedicated
 * workspace block in the system message.
 *
 * @remarks
 * `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the contexts module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block through
 * {@link import('./helpers.js').renderFencedFile}, and the block is placed immediately after the
 * instructions section in the system block. The workspace's image files render no section: their
 * `base64` payload attaches to the last user message.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'
