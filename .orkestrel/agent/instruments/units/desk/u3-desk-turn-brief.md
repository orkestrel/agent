# Unit u3-desk-turn — The turn serves every thread

## Role and engine

`builder` on Sonnet 5.5. Implement this unit yourself; spawn nothing.

## Objective

Wire the thread families into the desk's turn, as `/home/user/agent-port/tmp/units/desk-design.md` § Units, U3 `desk-turn`, specifies: `Desk.publish` serves every thread of the request after the policy, the request parser reads and refuses threads, and the agent speech leaves the server path.

## Context

- **Design.** `/home/user/agent-port/tmp/units/desk-design.md`: § Design, Server, and § Units, U3. Its § Constraints and § Refusals bind.
- **Rulings.** `/home/user/desk/tmp/units/desk-rulings.md`; ruling 6 (threads first, one after another, then the two contrasts) and the standing conditions bear on this unit.
- **Built so far.** U1 landed the core contract in `/home/user/desk/app/core/`; U2 landed `RecordsThread`, `AgentThread`, the factories, `resolveCall`, and the server types and constants in `/home/user/desk/app/server/`. Use them; change none.
- **Tests.** A recording `fetch` that answers in the Ollama wire format, as `/home/user/desk/tests/app/server/Desk.test.ts` does.
- **Law.** `/home/user/desk/AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`, and the rules it names.

## Scope

- **Owned.** `/home/user/desk/app/server/Desk.ts`, `handlers.ts`, `parsers.ts`, `errors.ts`, and `/home/user/desk/tests/app/server/Desk.test.ts`, `parsers.test.ts`, `index.test.ts`.
- **Off-limits.** Every other file. When a change here breaks a page file, change nothing there and report the file, the line, and the error; U4 owns the page.

## Execution

Never delete a file you did not create; never commit; never run `npm install`, `npm ci`, or `npm update`. Run every npm command as `PATH=/home/user/desk-npm11/bin:$PATH npm ...` from `/home/user/desk`. Write each new test before its code, run it against the unchanged source, and report that it fails.

## Output

Return one line per contract item with its `path:line`, each new test's name with its failing run, every page error, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. The design's U3 acceptance holds, each item a passing test, with ruling 6's order: the threads write their replies in request order before either contrast.
2. `PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:server` and `npm run test:app:core` exit 0.
3. `PATH=/home/user/desk-npm11/bin:$PATH npm run check` exits 0, or fails only on page files, each reported.
