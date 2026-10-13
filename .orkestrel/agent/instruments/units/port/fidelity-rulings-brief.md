# Unit fidelity-rulings — Rule on every way the ported ledger departs from the measured records arm

## Role and engine

Two blind lanes take this brief: `planner` on Claude Opus 5.5, and `analyst` on GPT-6 Astra through a read-only `codex exec`. Each lane works alone and returns its rulings; the Orchestrator reconciles them. Both lanes are read-only. Executor: the lane named in the dispatch.

## Objective

The offline replay (unit U8, 2026-10-09) found that the ported `Ledger` sends agent requests that differ from the requests the measured records harness sent, in ways the port plan never listed. For each departure, rule one of the following:

- **Port fix.** The port reproduces the measured behavior. Give the exact change: the file, the function, the behavior, and the test that pins it.
- **Listed departure.** The port keeps its behavior. Give the normalization the replay applies to the recorded body to admit it, the reason, and what the live series U9 must measure.

Rule by this principle: the package publishes the measured method. A departure is admissible only when a plan ruling requires it (T1, handles removed from model-facing text; or an entry under "Defects fixed by the port"), or when the measured behavior is a harness defect whose removal changes nothing the model read in any measured goal, shown from the recorded wires. Every other departure is a port fix.

## Context

- **Evidence.**
  - `tmp/units/u8-report.md`: the replay's causes C1 to C5, with wire file names and diffs.
  - `tmp/units/u8-review.md`: the probe review. Its claim 2 is departure C6 and its claim 3a is departure C7.
  - The probe: `/home/user/agent-port-gauge/tmp/probes/ledger-replay*.ts`.
- **Plan.** `tmp/units/records-port-plan.md` (the rulings T1 to T12 and the defect list) and `tmp/units/records-port-planner.md` (sections 4 and 5).
- **Measured harness.** `/home/user/agent/tmp/bench3/bench.mjs` and `records.mjs`, read-only. The relevant code includes:
  - the `recall` tool and `onTopic`, near lines 2490 to 2590;
  - pin lines, near lines 2560 to 2580;
  - the digest and `#noteLine`, near lines 1919 to 1941;
  - held judgments through `ledger.fail`, near lines 3039 to 3041;
  - the answer pass, near line 3414.
- **Recorded runs.** `/home/user/agent/tmp/bench/results/v9/a5-records-v1` to `v8` and their `-wire` directories (2B, thinking off), plus `/home/user/agent/tmp/bench/results/v10/t2a-records-v1` to `v4` and `f4-records-v1` to `v4`. Every `-wire` directory holds each request and response.
- **Port.** `/home/user/agent-port`, branch `port`, commit `1117e23`: `src/core/ledgers/` (`Ledger.ts`, `helpers.ts`, `Classifier.ts`, `Gauge.ts`, `types.ts`) and `tests/src/core/ledgers/`.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.

## Departures to rule

1. **C1. Seed assistant statements.** The measured `recall` and answer note list call-free, non-quiet seed assistant text, for example `Updated: the Halvorsen escalation is ESC-2219.` The port's `collectLive` (`helpers.ts` near line 633) and `#recall` do not. Rule on the three symptoms the report attributes to C1 as well: line order, the cut line, and the order of recalled lines.
2. **C2. Pin lines.** The measured recall prints ended pins, such as `p6 (m4) ended: superseded by m44`. The port has no pin store and no handles.
3. **C3. Repeated reading.** The measured recall lists every reading of a lookup, including identical repeats; the port lists the last reading per call identity.
4. **C4. Call text in the answer note.** The measured digest strips the `rN NAME ARGS: ` lead; the port's `#buildDigest` renders `NAME ARGS: ` through `#renderSource`, and `Ledger.test.ts` pins that lead near lines 562 and 1756.
5. **C5. The earlier answer note in a recall.** The measured recall lists the earlier pass's loop-written note, a user message; the port treats notes as annotations and never lists them.
6. **C6. Stale removal off the briefing route.** The port drops stale sentences on the recall and digest routes. The plan's R2a covers the briefing render.
7. **C7. Held judgments.** The measured harness held calibration failures with `ledger.fail` and never asked again. The port has no seam to import a held failure (`Classifier.ts`, private `#failed`) and asks again. Rule whether the port gains an import seam, which is a public API change, or the replay lists the second ask; state what live use implies.

## Required for each departure

- the evidence, as `file:line` in `bench.mjs` and the port, and one wire file;
- the ruling;
- the exact change or the normalization;
- the test to add;
- the risk to each measured goal, g01 to g10;
- whether U9 must measure it.

Then rule whether the measured results (`a5-records`, `t2a-records`, `f4-records`) transfer to the port after the rulings, and name what U9 must show.

## Output

- one table row per departure, with the required fields;
- the implementation units for the port fixes: owned files, engine, and order;
- the normalizations for the listed departures, worded for the probe.

No process diary. If a file named here is missing or unreadable, say so in the first table row and rule on the rest.

## Acceptance criteria

1. Every departure C1 to C7 has a ruling and a reason that cites a file and line.
2. Every port fix names a test that fails on the commit `1117e23` and passes after the fix.
3. Every listed departure names the plan ruling or the wire evidence that admits it.
