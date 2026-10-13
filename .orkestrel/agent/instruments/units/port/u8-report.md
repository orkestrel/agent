# U8 replay probe report (builder, 2026-10-09)

**Cause:** the failures come from the port, not the probe. I changed no file. The probe asserts that no body is unlisted, so the 8 per-copy failures are the correct result, and I left it asserting that.

The setup, judge, first-request, call-count, and control tests all pass (38 of 46). Each of the 8 copies fails only the final assertion at `ledger-replay.test.ts:174`.

## Gates

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` | 1 | 8 failed, 38 passed (46). The control tests pass. |
| `git status --porcelain` | 0 | Empty, because `.gitignore:11` ignores `tmp`. `git status --porcelain --ignored` prints `!! tmp/`. Acceptance 3 cannot list `tmp/` paths without `--ignored`. |

## Per-copy report

Every copy compares 10 goals and 56 judge bodies: 51 against the recorded bodies and 5 against held failures of `cal-categories.jsonl`. Every copy has 15 bodies equal after N1 to N7 and 0 equal only after residuals. The 2 calibration bodies are not replayed, because the gauge comes from `seed.json`.

| Copy | Agent bodies | Unlisted | Unlisted goals and calls |
| --- | --- | --- | --- |
| v1 | 24 | 9 | g03 c1; g04 c1-3; g05 c1-3; g07 c1; g10 c1 |
| v2 | 19 | 4 | g03 c1; g04 c1-2; g07 c1 |
| v3 | 22 | 7 | g03 c1; g04 c1-3; g05 c1-3 |
| v4 | 17 | 2 | g03 c1; g04 c1 |
| v5 | 22 | 7 | g03 c1; g04 c1-2; g05 c1-3; g10 c1 |
| v6 | 20 | 5 | g03 c1; g04 c1-3; g05 c1 |
| v7 | 23 | 8 | g01 c2; g03 c1; g04 c1-3; g07 c1-3 |
| v8 | 23 | 8 | g03 c1; g04 c1-3; g05 c1-3; g07 c1 |

The listed residuals F4a and R2a account for every stale sentence and every answer-pass tool message. Each residual sits in a body that is also unlisted for one of the following causes. The full per-copy text, with normalization counts and residuals, is as the verifier printed it.

## Bodies the port fails outside N1 to N7, F4a, and R2a

Each cause has its exact diff and one hypothesis. I did not widen any normalization.

**1. Seed assistant statements are missing from recall results and the answer note.** This is the cause in the most bodies.
- Where: v1 g03 call 1 (`00027_api_chat-request.json`) `messages[18]`, `recall {"topic":"Grace Okafor"}`.
- Recorded only: `m19: Locker trace opened, and Grace's replacement waits on Marcus's sign-off.`
- Recorded only: `m17: LH-77302 was marked delivered on 2026-10-03 to a parcel locker, Parcelway tracking PW-5521-9930. Grace is Gold tier ...`
- The same lines appear in g04 and g05 recalls and in the answer note, for example `Updated: the Halvorsen escalation is ESC-2219.` (assistant, `m28`).
- Hypothesis: `collectLive` (`src/core/ledgers/helpers.ts`, around line 633) keeps only user messages and current tool messages, and `Ledger.#recall` skips every other message.
- The measured `recall` (`bench.mjs:2490` to `2590`, `onTopic`) lists every call-free, non-quiet message before the run, seed assistant text included.
- Three symptoms follow from cause 1:
  - **User line.** `m29: Marcus just messaged ...` (v1 g05 call 2 `messages[20]`) appears only after its amended assistant `m3`.
  - **Cut line.** `1 older item not shown; name a narrower topic ...` (v1 g04 call 2 `messages[20]`) appears because the extra assistant items fill the room. In v7 g07 call 2 the port also lists `Third rule: copy Priya Raman ...` that the recording cut.
  - **Order.** In v2 g07 call 1 (`00059`), the recording has `m23` (assistant), `m27`, `m22`. The port has `m22`, `m27`.
- I inferred these three from the line patterns. I could not rerun the harness to confirm them.

**2. Pin lines are missing.**
- Where: v1 g05 call 1 (`00045`) `messages[18]`.
- Recorded only: `p6 (m4) ended: superseded by m44`. In v5 and v7 the line is `p4 (r4) ended: superseded by r5`.
- Hypothesis: the port has no pin store and no handles, while the measured `recall` prints `pinLine` for ended pins (`bench.mjs:2560` to `2575`, `2580`).

**3. An earlier reading of the same lookup is missing.**
- Where: v5 g05 call 1 (`00044`) `messages[18]` and v7 g01 call 2 (`00012`) `messages[20]`.
- Recorded only: a second `lookup_order {"id":"LH-79215"}: Order LH-79215 ... return window open until 2026-10-21.` with the same text. The recording carries both `r5` and `r4`. The port lists it once.
- Hypothesis: `collectLive` keeps only the last reading per call identity, while the measured `recall` lists every reading.

**4. The answer note keeps the call text on a lookup line.**
- Where: v1 g04 call 3 (`00037`) `messages[13]`, a user message.
- Recorded: `Order LH-80941 for account LH-31055 (Halvorsen Interiors): 8 brass pendant lights, ...`
- Port: `lookup_order {"id":"LH-80941"}: Order LH-80941 for account LH-31055 ...`
- In v5 g05 call 3 (`00046`), the port prefixes `lookup_customer {"account":"LH-44870"}: ` and `lookup_order {"id":"LH-79215"}: ` on lines the recording gives bare. This affects 6 bodies in total.
- Hypothesis: the measured `digest` and `#noteLine` (`bench.mjs:1919` to `1941`) strip the whole `rN NAME ARGS: ` lead, so the tool-free pass reads no call.
- The port's `buildDigest` (`Ledger.ts`, around line 1103) renders through `#renderSource`, which writes `NAME ARGS: `. The port's own tests pin that lead (`Ledger.test.ts:562` and `1756`).

**5. The earlier answer note is missing from a recall (v7 g07 calls 1 to 3).**
- Where: `00061`, `00062`, and `00063` (`00063` `messages[13]`).
- Recorded only: `[Desk] What your lookups and recalls returned in this request:` followed by its lines, with `Order LH-80941 ...` bare.
- Hypothesis: the measured `recall` lists the earlier pass's loop-written note, a user message, because `onTopic` does not exclude it. The port treats notes as annotations and never lists them.

**Decision for you:** each cause is either a port departure to add to the plan's list with a disposition, or a port fix. Which one it is for each cause is a design call and belongs to `astra` or `opus`.

## Files

- Unchanged: `/home/user/agent-port-gauge/tmp/probes/ledger-replay.test.ts`, `ledger-replay-compare.ts`, `ledger-replay-support.ts`. All three exist in the same directory.
- I wrote and deleted the scratch probe `zz-scratch-dump.test.ts` and three scratchpad dump files.
