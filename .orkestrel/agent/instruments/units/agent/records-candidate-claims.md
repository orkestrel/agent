# Unit records-candidate — claims for the objective audit of the per-topic records candidate

## Subject

The per-topic records candidate in the agent checkout: `tmp/bench/results/v9/recordsrender/bench.mjs` (the frozen briefing harness `tmp/bench3/bench.mjs`, sha256 `3d75138e241ae8a9…`, plus `--records off|on`) and `tmp/bench/results/v9/recordsrender/records.mjs` (the pure module). The plan is `tmp/bench/results/v9/RECORDS-PLAN.md` with the Orchestrator's rulings: records replace their topics' raw sources in `## Pinned` and `## Rules`; records scope by account; the Rules record holds every live desk rule and applies to every request; account records render with `###` headings under one `## Pinned` heading; every tail stub reads as refined writes it; the comparison line stays off. The chain:

| Round | Change | Written by | Reviewed by |
| --- | --- | --- | --- |
| module | `records.mjs`, `records-check.mjs`, `records-fixtures.json` | Claude Opus 5.5 | Claude Opus 5.5 |
| wiring | `--records off\|on` in the candidate `bench.mjs` | Claude Opus 5.5 | Claude Opus 5.5 |
| rulings | the Rules record for every request; one `## Pinned` heading | Claude Opus 5.5 | Claude Opus 5.5 |
| final | `###` account headings (`renderPinned`); refined's tail stub; an unscoped stale fixture | Claude Sonnet 5.5 | none |

No part was written by GPT-6 Astra. This round also holds the objective design lane the records plan never had: claims 9 and 10 ask whether the design itself holds, not only the code.

## What the round decides

This decides whether the candidate is installed for a live series of the records arm over the 8 reworded copies, compared against the frozen refined series on the same copies.

## Already established

The Orchestrator verified each item itself from `tmp/bench/results/v9/recordsrender/proof/final2.txt`: `node --check` exits 0; candidate `--check-ledger` exits 0 under `--profile refined` (225 checks) and `--profile roundA` (211); `records-check.mjs` passes 253 of 253; the 5 roundA wire replays are identical; `--records off` produces request bodies identical to the frozen harness on `a3-refined-v1`–`v3` and `a4-refined-v1`–`v8`.

## Review evidence

- `tmp/units/records-candidate.diff`: `tmp/bench3/bench.mjs` against the candidate `bench.mjs`.
- `tmp/units/records-module.diff`: `tmp/bench3/records.mjs` against the candidate `records.mjs`.
- The candidate files under `tmp/bench/results/v9/recordsrender/`: `bench.mjs`, `records.mjs`, `records-check.mjs`, `records-fixtures.json`, `README.md`, `records-report.mjs`, `records-totals.mjs`.
- The dry renders under `tmp/bench/results/v9/recordsrender/proof/final2/dry/` (`on-RUN/bodies/NNNNN_api_chat.json` against `frozen-RUN/bodies/`), rendered from the recorded wires `tmp/bench/results/v9/a4-refined-v1-wire` to `-v8-wire`.
- The seed and scoring in `tmp/bench3/scenario.json`; the imported judge filing `tmp/bench/results/v3/cal-categories.jsonl`.

## Numbered falsifiable claims

1. Under `--records off`, every request body, judge body, row, and settings line equals what the frozen harness produces for the same recorded replies; no records code reaches an off run.
2. Under `--records on`, no system message holds a sentence carrying a value a decided correction replaced (MX-4471, ESC-2291, the withdrawn 15 percent fee) outside the correcting message itself.
3. Under `--records on`, every fact a goal's scorer requires that the refined briefing shows at goal entry is also shown at entry, and `over` is set whenever a request-account line or a Rules line on the request's desk topics is cut.
4. Under `--records on`, a request's system message holds the records of the accounts the request names and of no other account; a request that names no registered account keeps refined's `## Pinned` units and reads the Rules record.
5. Every record line is a verbatim sentence of a live source, or that sentence after a `PERSON: ` prefix whose person the preceding sentence of the same source names; no line comes from an assistant message, a quiet, superseded, or excluded source, or a lookup result a later identical call replaced.
6. Under `--records on`, the tail of every request is byte-identical to the frozen harness's tail for the same history.
7. Under `--records on`, every judge request is byte-identical to the frozen harness's; the records add no judge question.
8. `records.mjs` imports only `node:crypto`, keeps no state between calls, returns the same build for any key order of its input, and holds no id, name, amount, or phrase from the scenario.
9. The account scope cannot drop a fact a request needs: a fact about the request's own account that sits in a message naming another account, or in a message naming no account, still reaches the request through a record, the Rules record, or a loose unit.
10. No membership, stale, or prefix rule depends on a Larkspur phrase or on the wording the 8 reworded copies vary; the records for a reworded request differ from the original's only through the accounts the request names.

## Unknowns

- Whether the dry renders cover a path a live run takes and they do not. The lane reasons from the code and says so per claim.
- Whether the lane's read-only sandbox lets `node` run the candidate's offline checks; if not, it reasons from code and the recorded proof outputs.

## The threshold

A finding is worth more than a clean pass: the alternative is a live series that measures a defect instead of the design.
