# Unit u4-desk-page — Thread controls and one lane per thread

## Role and engine

`builder` on Sonnet 5.5, under the `enterprise-bootstrap` skill for Bootstrap craft. Implement this unit yourself; spawn nothing.

## Objective

Give the page its thread controls and show each thread's answer end to end, as `/home/user/agent-port/tmp/units/desk-design.md` § Design, Page, and § Units, U4 `desk-page`, specify. A visitor picks strategy, model, and thinking per thread, sends one ticket, and sees every thread's reply side by side with what it read and how it got there.

## Context

- **Design.** `/home/user/agent-port/tmp/units/desk-design.md`: § Design, Page, for the controls, the lane cards, and what stays the same; § Units, U4 for the files and acceptance; § Measurements for the cited readings.
- **Rulings.** `/home/user/desk/tmp/units/desk-rulings.md`; ruling 2 (the Briefing disclosure states the T10 boundary), ruling 8 (`'view'` labeled "Full view"), ruling 9 (the default pair), and ruling 10 (`TURN_LIMIT` times the thread count) bear on this unit.
- **Measured readings.** `MEASURED_READINGS` carries, per combination, the audited passes per 10 requests over the reworded Larkspur shift, each with its source and date (2026-10-09):
  - Records against the full view, 2B, thinking off: 6.50–6.75 against 4.38–5.13, 8 copies.
  - 2B, thinking on: 6.75–7.00 against 4.50–5.25, 4 copies; the gap clears at every end.
  - 4B, thinking off: 7.63–8.00 against 6.13–7.63, 8 copies; clears at the strict end only.
  - 4B, thinking on: 8.00–8.25 against 7.50–8.50, 4 copies; no gap shown.
  - Compaction: no audited reading.
- **Built so far.** U1 (core contract), U2 (thread families), U3 (the turn). Use them; change no server or core file except the removals the design names in `/home/user/desk/app/core/constants.ts`.
- **Skill.** Load the `enterprise-bootstrap` skill (`/home/user/scaffold/.agents/skills/enterprise-bootstrap/SKILL.md` and the references it names) before writing markup. Keep the page's visual language as the design's "What stays the same" lists it.
- **Law.** `/home/user/desk/AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`, and the rules it names, `writing.md` for every visible string.

## Scope

- **Owned.** `/home/user/desk/app/vue/*`, `/home/user/desk/tests/app/vue/*`, `/home/user/desk/tests/app/fixtures.ts`, and the removal of `AGENT_TITLE` and `findSlot` from `/home/user/desk/app/core/constants.ts` and `helpers.ts` with their tests.
- **Off-limits.** Every other file.

## Execution

Never delete a file you did not create, except the removals the design names; never commit; never run `npm install`, `npm ci`, or `npm update`. Run every npm command as `PATH=/home/user/desk-npm11/bin:$PATH npm ...` from `/home/user/desk`. Write each new test before its code, run it against the unchanged source, and report that it fails. The journey tests drive a real browser; Chromium sits at `/opt/pw-browsers`.

## Output

Return one line per contract item with its `path:line`, each new test's name with its failing run, each gate's exit code, the widths and themes the journey proof covered, and `git status --porcelain`.

## Acceptance criteria

1. The design's U4 acceptance holds, each item a passing test.
2. `PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:vue` and `npm run test:journey:vue` exit 0.
3. `PATH=/home/user/desk-npm11/bin:$PATH npm run check` exits 0.
