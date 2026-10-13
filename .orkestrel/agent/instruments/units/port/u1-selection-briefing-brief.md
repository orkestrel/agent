# Unit u1-selection-briefing — Add Selection.briefing, folded last into the system message by AgentContext.build

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. Executor: NATIVE_SUBAGENT.

## Objective

Add an optional `briefing` member to the `Selection` contract so that a selection handler can supply system text for one prompt. `AgentContext.build(selection)` appends it as the last part of the system message, and the `select` event carries it unchanged.

## Context

- **Evidence.**
  - `Selection` is declared at `src/core/contexts/types.ts:239`, and its contract states that the system block stays unchanged under a selection (`src/core/contexts/types.ts:635`).
  - `build` assembles the system parts at `src/core/contexts/AgentContext.ts:174` to `src/core/contexts/AgentContext.ts:240`, in order: the system prompt, the scoped instructions section, then the `## Workspace` section, joined by a blank line (`'\n\n'`).
  - The view-change fault is built in `#check` (`src/core/contexts/AgentContext.ts:247`).
  - The loop emits `select` with the selection at `src/core/agents/Agent.ts:726`.
  - The guide describes `Selection` at `guides/agent.md:359`, `guides/agent.md:361`, and in the surface row at `guides/agent.md:951`.
  - This member carries the briefing of the records ledger that the plan `tmp/units/records-port-plan.md` ports into the package.
- **Law.**
  - `AGENTS.md` (it resolves to `../scaffold/AGENTS.md`).
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/tests.md`, `../scaffold/.claude/rules/documentation.md`, and `../scaffold/.claude/rules/writing.md`.
- **Installed primitives.** None beyond the files named here.
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`. Its `node_modules` is a symlink to `/home/user/agent/node_modules`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build`, `npm run clean`, or any command that writes a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Unknowns

None.

## Scope

- **Owned.**
  - `src/core/contexts/types.ts`: the `Selection` member and its TSDoc, plus the `build` contract text that says the system block is unchanged under a selection.
  - `src/core/contexts/AgentContext.ts`: the build rule and the `#check` fault.
  - `tests/src/core/contexts/AgentContext.test.ts` and `tests/src/core/agents/Agent.test.ts`.
  - `guides/agent.md`: only the `Selection` paragraphs near lines 359 and 361, the `Selection` surface row near line 951, and the `build` description wherever the guide states that a selection leaves the system block unchanged.
- **Shared (report-only).** None.
- **Off-limits.** Every other file.
- **Made false by this change.** Every sentence in the owned files that says a selection leaves the system block unchanged. Find them with `rg -n "system block" src guides`.
- **Tools and limits.** Read, Edit, Write, and Bash for the scoped gates only. No tree-wide mutating command, no install, and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Behavior to land

1. `Selection` gains `readonly briefing?: string`, documented in one line: the text `build` appends as the last part of the system message.
2. `build(selection)` appends `selection.briefing` as the last system part when the selection has no `fault` and the briefing is a non-empty string. It comes after the system prompt, the instructions section, and the workspace section, joined by the same `'\n\n'`. A briefing alone, with no other part, yields one system message holding exactly the briefing.
3. A selection with `fault` set contributes no briefing: its messages are `view()`, and the plan the briefing rested on is void. The view-change fault built in `#check` carries no `briefing`.
4. The scope's `instructions` allow-list filters instructions only; it never drops the briefing.
5. `build()` with no selection, and `build(selection)` with `briefing` undefined, return exactly what they return before this change.
6. The `select` event carries the selection object as the handler returned it, `briefing` included.

## Output

Return the diff summary per file, each gate's exit code with its failure excerpt if any, and `git status --porcelain`. No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a behavior in the preceding list conflicts with an existing test or contract outside the owned files. Settle wording yourself and record each choice.

## Acceptance criteria

1. `npm run check:src:core` exits 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/contexts/AgentContext.test.ts tests/src/core/agents/Agent.test.ts` exits 0, with new cases for behaviors 2 to 6, including a scripted provider that receives a system message ending in the briefing.
3. `npm run test:guides` exits 0.
4. `git status --porcelain` lists only the owned files and `tmp/` paths.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The actual diff and `git status --porcelain`.
