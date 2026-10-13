# Final check: records, full view, and compaction under 2B thinking and the 4B model

This check asks whether the per-topic records keep or widen their lead when the agent thinks before it answers or is the 4B model. It runs the arms over the reworded copies of the Larkspur shift, one cold run at a time through `tools/series.ts` and `tools/run-one.ts` (in `results/v7/tools/`), with every wire recorded.

## Arms

The arms run on the following harnesses and windows.

| Arm | Harness | Think-off window and budget |
| --- | --- | --- |
| Records | `tmp/bench3/bench.mjs --mode ledger --profile refined --records on` | `--ctx 3072`, prompt budget 0.7 of the window |
| Full view (control) | `tmp/bench/bench.mjs --mode none` | `--ctx 6144` |
| Compaction | `tmp/bench/bench.mjs --mode compaction --summary tuned --window 1600 --keep 6 --sections 3` | `--ctx 3072` |

`results/v7/tools/plan.ts` writes every run's arguments; the `plan-*.json` files hold the plans that produced the reported runs. On the user's instruction of 2026-10-09, compaction left the series after copy 1; `t2-compaction-v1`, `t2w-compaction-v1`, and `f4-compaction-v1` stay as pilots.

## Conditions

Each condition names the model, the thinking setting, and the window growth.

- `f4`: the 4B agent `qwen3.5:4b-q4_K_M` with thinking off, at the think-off windows. Compaction's summarizer is the same 4B model (`--summary-model`).
- `t2`: the 2B agent `qwen3.5:2b-q4_K_M` with thinking on and the harness's thinking cap of 1,024 tokens (`THINK_PREDICT`). Every arm's window grows by the cap: records 4,096 with budget share 0.525, so its prompt budget stays 2,150 tokens; full view 7,168; compaction 4,096. Compaction's summarizer is the 2B model with thinking off. Copy 1 is the pilot.
- `t2w`: as `t2`, with `--think-predict 2048` and each window grown by 2,048: records 5,120 at budget share 0.42, full view 8,192, compaction 5,120.
- `t2a`: as `t2w`, with the tool-free answer pass sending `think: false` in both harnesses. The thinking read uses this condition.
- `t4`: the 4B with thinking on. Its cap comes from the sizing probe (`probes/think-4b-on.jsonl`); it runs after stage 2.

## Tuning evidence

`probes/think-probe.ts` replayed 10 recorded agent calls (5 from `v9/a5-records-v1`, 5 from `v9/a1-control-v1`) on the 2B with thinking on, `num_predict` 4,096 and `num_ctx` 8,192, on 2026-10-09 (`v9/probes/think-2b-on.jsonl`). Every call stopped on its own; thinking plus reply took 69 to 666 tokens, so the 1,024 cap cuts none of them. Generation ran at 12.9 to 14.6 tokens per second.

The 10-call probe understated the tail. In `t2-records-v1`, the first think-on run, 2 of its 22 agent calls spent the whole 1,024-token cap thinking and returned no content, which left g01 and g10 with no reply (`t2-records-v1.log:16`), and another call stopped at 1,010 tokens. A cap that binds on about one call in ten measures the cap, not thinking, so the series moved to `t2w`. The `--think-predict` flag was installed between runs on 2026-10-09 at 13:08 UTC, after `f4-control-v2` and before `t2w-records-v1`, with no run active. The main harness changed sha256 `bc96df33…` to `ee053b85…`, and the records harness `59609d38…` to `8b67f3df…`; with the flag absent, request bodies are byte-identical.

Raising the cap did not change the two records cuts. In `t2w-records-v1`, g01 and g10 again had no reply: their tool-free answer pass (prompts of 1,287 and 1,268 tokens, after first passes that ended without final text) thought to the 2,048 cap with no content. The 2B ends a turn inside an unclosed think block, so a first pass can end with no final text, and the answer pass that follows it can think without end. The `t2a` condition turns thinking off on that pass; both harnesses and the package do so under `--think` with no flag.

## Leftover window and generation room

The window growth gives every arm the cap as generation room at the start of the shift and keeps each prompt budget. Two effects are not symmetric.

- **Records.** The records harness reads the leftover window, the room the previous call left, in three places: the size of a `recall` result, the closure of the arm tools (`tmp/bench3/bench.mjs:1341`), and the deny gate's price for an unpinned reply (`:1351`). The reply reserve counts thinking tokens, so under thinking the recall room grows by the cap less the thinking spent, and the arm tools can close sooner. No records request in `t2-records-v1`, `t2w-records-v1`, `t2a-records` v1 to v4, or `f4-records` v1 to v4 carries the closure or narrowing text (`is closed for the rest`, `narrower topic`, `older items not shown`), so no closure fired.
- **Full view.** The full view's prompt grows across the shift while `num_ctx` stays fixed, so its generation room shrinks. The largest prompt per `t2a-control` copy was 4,155, 5,696, 5,131, and 4,884 tokens, which left 2,496 to 4,037 tokens against the 2,048 cap; a `t2w-control-v2` g10 call reached 6,729 and left 1,463. No full-view call came within 64 tokens of `num_ctx` (`tools/inspect.ts`).

## In-sample fit

The records arm's thresholds (`LEDGER_FIT`, `tmp/bench3/bench.mjs:829`) and its refined profile were fitted on the seed that every copy shares; the reworded copies vary the requests only. Every records reading in this file is in-sample, and the full view has no fitted parameter. An out-of-sample read refits on another seed or runs a held-out scenario; `ideas.md` carries it as "Thresholds fitted on a held-out goal set".

## Audit

Every row of every paired run is audited blind on both sides by `tools/audit.js` on the Haiku `checker` role: two independent auditors per chunk and a tiebreak on their disagreements. `tools/tally.ts` counts a scorer pass unless the audit rules it a false pass, and a scorer fail when the audit rules it a misread. An ambiguous row is a fail at the low end and a pass at the high end. With d the per-copy difference, a pair clears at an end when mean(d) − 2·sd(d)/√n > 0; the across end reads records' low against the full view's high.

The attack round of 2026-10-09 found the first failure brief asymmetric: it gave auditors a tool-use field, and it let a misread stand on the flagged points alone. The fixed brief drops the field and rules a misread only when every flagged point is a misread and the whole reply meets the pass standard. All 70 audited failures were re-audited under it (`audit/verdicts-r1.json`: 64 real, 4 ambiguous, 2 misread, 0 unresolved); the first readings sit in `audit/superseded/`. Item ids are salted, their keys sit in `audit-keys/` outside the directory the auditors read, and an id no auditor returns is ruled unresolved.

## Thinking read: the 2B with the answer pass thinking off

On the user's instruction of 2026-10-09, the 2B thinking-on condition came first (`plan-thinking.json`). The pair is `t2a-records` against `t2a-control`, copies 1 to 4.

- **Harnesses.** `t2a-records` v1 to v4 ran on records harness sha `4d07e56a…` under the flag `--answer-think off`; from sha `5342e209…` the harness does this under `--think` with the flag removed. `t2a-control` v1 to v4 ran on main harness sha `b5c49ee4…`.
- **Replies.** All 80 goals have a reply. Records cut 0 of 78 agent calls. The full view cut 1 of 64: a `t2a-control-v2` first pass thought to the 2,048 cap, and its answer pass replied.

The adjudicated passes per copy read as follows, low to high.

| Copy | Records | Full view |
| --- | --- | --- |
| 1 | 7 | 4 |
| 2 | 8 | 5–6 |
| 3 | 6 | 5–6 |
| 4 | 6–7 | 4–5 |
| Mean | 6.75–7.00 | 4.50–5.25 |

- **Band.** The pair clears at every end (`audit/tally.json`).
  - Low end: d is 3, 3, 1, 2, and the lower bound is 1.29.
  - High end: d is 3, 2, 0, 2, and the lower bound is 0.49.
  - Across: d is 3, 2, 0, 1, and the lower bound is 0.21.
- **Superseded pair.** This file's earlier table paired records with `t2w-control`, the full view whose answer pass still thought, under the first audit, and read a low-end bound of 2.18. It is superseded.
- **Against the think-off 2B.** The 2B with thinking off (`v9`, 8 copies) read 6.50–6.75 for records and 4.38–5.13 for the full view (`records-series-verdict.md`, Correction). With the answer pass fixed, thinking raises records by about a quarter of a pass per copy and the full view by about an eighth, so the gap stays near 2 passes per copy. The `v9` audit read failures alone, under the first brief, so this comparison reads direction only.

## The 4B read

The pair is `f4-records` against `f4-control`, copies 1 to 8, read under the same audit. Copies 5 to 8 ran in stage 2 (`plan-stage2.json`, and `plan-stage2b.json` for copy 8 after the series stopped on its time budget); copy 8's start line carries the records harness sha `df0c0595…`, the sha copies 1 to 7 ran on.

| Copy | Records | Full view |
| --- | --- | --- |
| 1 | 8 | 5–7 |
| 2 | 6–8 | 7–8 |
| 3 | 8 | 5–7 |
| 4 | 8 | 5–7 |
| 5 | 7 | 7–8 |
| 6 | 8 | 9 |
| 7 | 8–9 | 5–7 |
| 8 | 8 | 6–8 |
| Mean | 7.63–8.00 | 6.13–7.63 |

- **Band.** The low end clears: d is 3, −1, 3, 3, 0, −1, 3, 2, and the lower bound is 0.19. The high end does not: d is 1, 0, 1, 1, −1, −1, 2, 0, and the lower bound is −0.37. Across, the lower bound is −0.85.
- **Reading.** On the 4B with thinking off, records leads by 1.50 passes per copy when an ambiguous reply counts as a fail and by 0.38 when it counts as a pass. The full view's spread rests on replies the auditors could not rule, so the 4B lead is real at the strict end and unproven at the lenient end.
- **Cause.** The 4B lifts the full view more than records. Records reaches 61 of 80 cells at the low end; the full view's who-is-who errors on g03 and g07 mostly go away, and g05, g06, and g08 fail in both arms (`INVESTIGATE-4B.md`, `METHOD-DEEP-DIVE.md`).

## The 4B with thinking

The pair is `t4-records` against `t4-control`, copies 1 to 4, at the 4B cap of 1,024 (`cap.md`), read under the same audit (`audit/verdicts-e1.json` to `-e3.json`). `tools/inspect.ts --cap 1024` read every call of the 8 runs: 121 calls, 0 findings, and no call reached the cap.

| Copy | Records | Full view |
| --- | --- | --- |
| 1 | 8 | 8–9 |
| 2 | 8 | 9 |
| 3 | 8–9 | 7–9 |
| 4 | 8 | 6–7 |
| Mean | 8.00–8.25 | 7.50–8.50 |

- **Band.** Neither end clears: the low end's lower bound is −0.79, the high end's −1.21.
- **Against thinking off.** Thinking lifts the full view: `t4-control` against `f4-control` clears at both ends (lower bounds 1.18 and 0.29). It does not lift records: `t4-records` against `f4-records` clears at neither (−0.50 and −0.25).
- **Reading.** With the 4B thinking, the full view reaches the records level, and records keeps no lead. The full view's gains are g05 (0–2 of 4 to 3 of 4) and g08 (1–2 of 4 to 4 of 4); records holds 2–3 of 4 on g08 because its replies leave out the fit verdict (I-295).
- **New failure.** The full view's copy 4 passes the scorer on 10 of 10, and the audit rules 3 of those passes false: an escalation the account does not have, a gift note "added" that the lookup says is not recorded, and a warehouse pickup the record does not offer.

## The live port

`/home/user/agent-port/tmp/bench4/driver.mjs` ran the ported ledger (`createLedger` at `8f5098b`) live over copies 1 to 8 with the `a5-records` settings on 2026-10-09 and 2026-10-10 (`p1-ledger`). Every row of `p1-ledger`, `a5-records`, and `a1-control` (the 2B full view with thinking off) was rescored under the corrected rules and audited blind on both sides under one brief (`bench4/audit/verdicts-u9.json`, `verdicts-a1.json`; 0 unresolved).

| Arm | Passes per copy, low to high |
| --- | --- |
| Live port (`p1-ledger`) | 5.75–6.50 |
| Measured records (`a5-records`) | 5.50–6.38 |
| Full view (`a1-control`) | 3.50–4.13 |

- **Against the full view.** The live port clears at every end (lower bounds 1.43, 1.13, and 0.70), as the measured records do (1.07, 0.80, and 0.13).
- **Against the measured records.** The port's lower bounds are −0.57 at the low end and −0.91 at the high end, inside the trim tolerance of −1. The scorer alone read the port below the measured runs (lower bound −1.73); the audit rules out 12 false passes in `a5-records` against 6 in the port, and 15 of the full view's 47 scorer passes.
- **Flips.** Between the port and the measured runs, 13 of 80 goal outcomes differ, at the same rate whether the goal's first prompt matches after normalizing handles and whitespace (9 of 56) or not (4 of 24). The port's prompts differ by the listed departures: blank lines, handle tags, and a tail cut one exchange earlier.
- **The two-sided audit.** The `v9` reading of 6.50–6.75 against 4.38–5.13 audited failures only; this reading replaces it for the 2B with thinking off.

## g06

g06 fails in every arm and condition: 0 of 38 `v10` runs, 0 of 32 g06-only records runs before and after anchoring every scenario date to the run day, and 1 correct of 48 live runs with the plain rule in both arms (`results/g06/REPORT.md`). The rule reaches every prompt in both arms, and records and the full view fail alike, so g06 measures the model and the goal, not the context strategy:

- "Never promise" lets the 4B with thinking relay a hedged carrier estimate; the plain rule "never put a delivery date, a carrier estimate included, in a customer reply" stops it in 7 of 8 live replies, in both arms.
- The 2B and the 4B without thinking relay the estimate even when the request itself forbids it (3 of 4 replays each); the 2B with thinking withholds it only when the request says so.
- With the date withheld, the 4B with thinking claims the gift note the lookup reports as not recorded in 7 of 8 live replies; with the gift note removed, it writes 3 correct replies of 4.

Read no arm comparison from g06.

## Plan

Stage 1 ran copies 1 to 4 of each condition. A condition whose pair clears at the low end stops at 4 copies; any other condition runs copies 5 to 8. `t2a` clears and stops. `f4` ran copies 5 to 8 and takes the band over copies 1 to 8. `t4` runs copies 1 to 4 of records and the full view after its sizing probe, and reads two bands: the `t4` pair, and each arm against its `f4` copy.

The 152-message scenario stays out of this check: it has no ledger section, no reworded copies, and no audited scoring fields. Within each run the conversation grows across the 10 requests, so the per-request results read the lead against conversation length.
