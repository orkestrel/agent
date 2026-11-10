# Ledger writes

## Goal and exit criterion

A `Ledger` admits tools with a consequence the host gates, and a write's result retires the earlier reads it made stale.

- The user, 2026-11-09: taverna's assistant uses Agent's records strategy instead of compaction. Taverna's assistant creates, updates, links, and archives records, and a 0.0.39 ledger registers only its lookups and `recall`. `ROADMAP.md` item 24 names this trigger.
- Exit:
  - `LedgerOptions.writes` and `LedgerAgentOptions.authority` ship with their tests, guide passages, and TSDoc
  - one independent review closes on numbered claims
  - `verifier` reads the gates on the touched projects
  - every measured reading in `studies/README.md` reads the same with `writes` absent
  - item 24 leaves `ROADMAP.md`
  - the user publishes 0.0.40

## Repositories

| Repository | URL |
| --- | --- |
| agent | https://github.com/orkestrel/agent |

## Governing skills

- `orkestrel-harden` governs the build.
- `orkestrel-falsify` governs the review.
- `orkestrel-publish` governs the release.

## Claims

1. A write runs through the agent's scope, the host's authority, the `consequential` floor, and the host's approver, like any tool. An unregistered name is still denied.
2. Construction refuses with `LedgerError` `'WRITE'` in four cases: a write without `consequential`, a non-empty `writes` list without `agent.authority`, a write named `recall`, and a name already taken by a lookup or a write.
3. A successful write is filed as a finding. Its `targets` supersede every earlier finding that names one of them, and every finding without `targets` in its own tool group that names one; of two writes to one record in one batch, the later stands. The next request's copy holds the new state and not the old read.
4. A refused, declined, thrown, unanswered, or aborted write files nothing and retires nothing.
5. The retired state comes back from the conversation alone after a snapshot and hydrate. The snapshot shape is unchanged.
6. With `writes` absent, every request is byte-identical to 0.0.39's.
7. In one request, a lookup the write retired can be read again in a later turn and holds the new state; a read in the same batch as the write stays refused. Any other repeated identical lookup still stops as `repeat`. This is the review's F1, and it was ruled a fix on 2026-11-09.

## State

| Item | State |
| --- | --- |
| Design | read-only consult, 2026-11-09 |
| Build | committed with this record; independent review PASS on claims 1 to 6, F1 fixed as claim 7 |
| Next | release 0.0.40 on the user's code; taverna takes the build through a local pin meanwhile |

## Sequence

1. Build: types, the ledger, helpers, tests, the guide, and TSDoc, tests first.
2. One independent review on the claims.
3. `verifier` on the gates; replay byte identity without `writes`.
4. Release 0.0.40 on the user's code. Taverna consumes the build through a local pin until then.

## Deferred

- Item 1's `replaced` state, when the user rules it, reads "not live, neither failed nor empty", which covers write supersession too. Owner: the user.
- Excluding superseded findings from the `recall` offer, items 1 and 57. Trigger: the offer-rate probe reads the offer opening on most requests after a write. Owner: the user.
- Renaming `LedgerLookupFinding` and its family, item 62. Trigger: the next ledger API audit.
