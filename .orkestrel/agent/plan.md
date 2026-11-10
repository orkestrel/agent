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
11. A lookup or write call its tool refuses for its arguments is never admitted to the repeat stop. When the tool's `execute` throws, or returns a promise that rejects with, an error `isToolError` admits whose code is `'ARGUMENTS'`, from the tool's own door or its handler, the request releases the call before the error propagates, so the identical retry runs again and the model can repair the call. An identical twin in the same batch that starts while a promise's refusal is still pending reads as a repeat. Every other failure of a call that reached its tool still counts as a run: another thrown or rejected error, a `ToolError` of another code, an unbranded look-alike, a host confirm declined or unanswered inside the handler, and an argument refusal a host registry's `execute` answered as a plain failure. The agent's `limit` bounds a model that sends the same refused call forever. With no argument refusal, every request is byte-identical to `dd93e2a7`'s. Trigger: taverna's surface design, 2026-11-10, which read an identical retry of a refused generic `change` repeat-stop the pass where a typed write's door refusal did not.
12. In one request, the identical retry of a lookup or write call the authority's `evaluate` method denied, or whose ask was declined or left unanswered, stops as `repeat` without asking or evaluating again. The identity is the repeat stop's own: tool name and canonical arguments. The request records each such call the agent's `deny` event reports with a decision, the ledger's `evaluate` method denies its identical retry with the `repeat` note as the reason before the host's `evaluate` method reads it, and the ledger aborts the pass. In one batch, every call is evaluated before the first ask, so the identical twin of a call whose ask was declined or left unanswered reaches the ledger's composed `ask`, which answers `false` for a call its request recorded as denied without entering the host's approver. The agent reports the twin's `ask` event, then a `deny` event that carries its decision, the twin reads the `refused` note, and its pass goes on. The twin of a call the `evaluate` method denied stops as a repeat. The agent module is unchanged from `e2739e75`. A call with other arguments is evaluated and asked as before, and the person can approve it; a later request asks again. With no identical retry of a denied call, every request is byte-identical to `e2739e75`'s. Claim 11's argument release, claim 7's write admission, and claim 8's stray stop are unchanged, and an approved call's identical retry still asks and then stops as `repeat`. The user, 2026-11-10: this ships in 0.0.40 as claim 12, before the publish. Trigger: claim 11's build, whose probe read the identical retry of a declined, a denied, and an unanswered write asked or denied again, and its review, which confirmed it.

## State

| Item | State |
| --- | --- |
| Design | read-only consult, 2026-11-09 |
| Build | committed with this record; independent review PASS on claims 1 to 6, F1 fixed as claim 7 |
| Claims 8 and 9 | committed at `b159b229` after one independent review and `verifier` |
| Claim 10 | committed at `dd93e2a7` after one independent review and `verifier` |
| Claim 11 | committed at `e2739e75` after one independent review and `verifier` |
| Claim 12 | built on `e2739e75`, uncommitted; it closes claim 11's open decision, on the user's ruling of 2026-11-10; independent review PASS with four notes. The lookup and write TSDoc for the batch twin, the guide sentence about a changed tool, and the lookup batch-twin test are repaired. The note on the twin's `ask` event went to one design pass: an `AuthorityInterface` member that withheld the event was built, then removed on the Orchestrator's ruling, so the agent module stays at `e2739e75` and the twin's `ask` event is documented with the host's approver not entered |
| Next | one independent re-audit of claim 12's batch-twin seam, then `verifier` on the gates; release 0.0.40 on the user's code after them; taverna takes the build through a local pin meanwhile |

## Sequence

1. Build: types, the ledger, helpers, tests, the guide, and TSDoc, tests first.
2. One independent review on the claims.
3. `verifier` on the gates; replay byte identity without `writes`.
4. Release 0.0.40 on the user's code. Taverna consumes the build through a local pin until then.

## Deferred

- Item 1's `replaced` state, when the user rules it, reads "not live, neither failed nor empty", which covers write supersession too. Owner: the user.
- Renaming `LedgerLookupFinding` and its family, item 62. Trigger: the next ledger API audit.
