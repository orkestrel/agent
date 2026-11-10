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
8. Any ledger pass whose scope advertises no tools makes at most one model generation, whatever the agent's `limit`, the first pass and the answer pass alike. A call the model makes in a turn that advertises no tools runs nothing, loops nothing, and ends its pass. When every call of that turn failed, the ledger stores the reply without its calls and their refusals, so the call files no finding, retires nothing, and leaves the records, the window, the snapshot, and `recall` as a call-free turn leaves them, through a hydrate too. A reply with text beside the call ends the pass with that text and `partial: false`; a reply with no text ends it partial with empty content. A pass that advertises any tool keeps its `limit`, its repeat stop, and the write admission of claim 7, an answer pass a host's scope widens to a tool included, and with no stray call every request is byte-identical to `90e852a0`'s. Trigger: taverna's ledger cutover, 2026-11-10, which read 24 tool frames under `limit: 12`, 12 of them refused in the answer pass; the first pass joined on 2026-11-10, when the build's census found a ledger with no lookup and no write running its first pass with no tools, and the user asked for the gap fixed.
9. The user, 2026-11-10, on items 1 and 57: superseded findings leave the `recall` offer. A finding a write's `targets` superseded, or a later finding of the same lookup identity replaced, neither opens the `recall` offer nor appears in its listing. A live hidden finding still opens the offer and stays recallable, and a snapshot and hydrate keep the same offer. One write, then ten follow-ups naming the written record, reads `recall` offered on 0 of 10, as the read-only control does. With `writes` absent and no lookup replacement, every request is byte-identical to `90e852a0`'s. Trigger: the offer-rate reading of the build, 10 of 10 follow-ups offered `recall` after one write against 0 of 10 without it.
10. A hydrate never reuses a gauge priced on other tool definitions. A snapshot's gauge carries a required `digest` of the definitions its calibration request carried, the `LedgerGaugeSnapshot` member `digestLedgerTools` computes, and nothing that can drift. A ledger hydrated with definitions of another digest, after an added, removed, or edited lookup, write, or `recall` definition, drops the stored gauge and calibrates before its first pass, so a hydrate never plans with the stale overhead; the comparison reads the definitions at construction, so a tool a host adds afterward is not compared; with the same definitions it reuses the gauge with no calibration call. `isLedgerSnapshot` and the snapshot contract refuse a gauge with no `digest`, so construction refuses that snapshot with `'SNAPSHOT'`, with no compatibility path. `calibrate` on demand stores the new digest. A `gauge` option is the host's own price and is never compared. With `writes` absent and the definitions unchanged, every request is byte-identical to `b159b229`'s. Trigger: taverna's CRM premise probes, 2026-11-10, item 4, which read one added write under-pricing every request by 454 estimated tokens and one added lookup by 248, with the same set erring by 0.

## State

| Item | State |
| --- | --- |
| Design | read-only consult, 2026-11-09 |
| Build | committed with this record; independent review PASS on claims 1 to 6, F1 fixed as claim 7 |
| Claims 8 and 9 | committed at `b159b229` after one independent review and `verifier` |
| Claim 10 | built on `b159b229`, uncommitted; the writer's gates read green; awaiting one independent review and `verifier` |
| Next | one independent review on claim 10, then `verifier` on the gates; release 0.0.40 on the user's code after them; taverna takes the build through a local pin meanwhile |

## Sequence

1. Build: types, the ledger, helpers, tests, the guide, and TSDoc, tests first.
2. One independent review on the claims.
3. `verifier` on the gates; replay byte identity without `writes`.
4. Release 0.0.40 on the user's code. Taverna consumes the build through a local pin until then.

## Deferred

- Item 1's `replaced` state, when the user rules it, reads "not live, neither failed nor empty", which covers write supersession too. Owner: the user.
- Renaming `LedgerLookupFinding` and its family, item 62. Trigger: the next ledger API audit.
