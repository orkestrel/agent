/**
 * Names the section header {@link import('./AgentContext.js').AgentContext}'s `build()` renders the
 * active workspace's text files under — `'## Workspace'`, the leading line of the dedicated
 * workspace block in the system message and the carrier-split counterpart to the documents and
 * images section headers.
 *
 * @remarks
 * `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the agents module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block — the same framing
 * the documents section uses — placed immediately after the documents section in the system block.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'
