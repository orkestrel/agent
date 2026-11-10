# Progressive disclosure campaign

The `@orkestrel/agent` campaign that gives a small local model progressive reach to what its principal may do. `.claude/rules/campaign.md` owns this folder's layout and content.

## File map

| Path | Holds |
| --- | --- |
| `plan.md` | the goal and exit criterion, the governing skills, the user's rulings, § State, open decisions, deferred triggers, and § Sequence |
| `ledger.md` | one row per dispatched unit and per user ruling on routing or scope |
| `designs/disclosure.md` | the final design: facts, phases 0 to 5, claims, release bars, stops, rulings on each point, the public API, the mechanism, the authorship and authority table, the deferral list, and the 4B reading |

## Read order

1. `plan.md` § State, then the governing skills it names for the first open chunk of § Sequence, then that chunk.
2. `ledger.md`, for the rulings and the units already dispatched.
3. `designs/disclosure.md`, for the phase the open chunk belongs to: its goal, units, claims, release bar, and stops, then the rulings on each point the phase builds on.

## Id law

- A ROADMAP item keeps its number in `agent/ROADMAP.md`.
- A fact of `designs/disclosure.md` is `F` and a number. A claim is its phase and a number, as `3.14`. A point is `Point` and a number. A unit is its phase and a letter, as `2C`. A probe is `K` and a number with a letter where it splits.
- An id is never renumbered. A claim or fact added later takes the next number in its phase or table.
- A cross-reference names the id and the file, as `designs/disclosure.md` claim 2.14.
