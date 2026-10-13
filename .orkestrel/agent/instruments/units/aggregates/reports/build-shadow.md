Files written:
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/shadow.ts`: the `Shadow` class, `parseFlags`, and the pure helpers. The helpers are exported for the test.
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/shadow.test.ts`: 22 tests.

**Proofs, run from the harness directory:**
- `node --test bench5/tests/shadow.test.ts` exited 0. The last lines read `# tests 22`, `# pass 22`, `# fail 0`.
- `node /home/user/scaffold/node_modules/typescript/bin/tsc -p bench5/tsconfig.json` exits 2 in the real tree. The 35 errors are all the missing `Shadow*` exports in `bench5/types.ts` and the implicit-`any` errors that follow from them. The same command exited 0 in a scratch copy of the harness (in the session scratchpad) with the patch below appended to `bench5/types.ts`. The scratch copy holds the final `shadow.ts` and test.
- The proof is offline. The tests replace `fetch` with a thrower and assert that nothing was fetched. The CLI children run with a preload that blocks `:11434`. The judge cache file is byte-identical after an offline run.
- The live test points `--url` at a local stub server and sees one prompt, one appended `live` row, and the flip counts it predicts. It never contacts `:11434`.
- I mutated `shadow.ts` seven times to check the tests bite: snapshot boundary, quiet cutoff, first-read-point guard on truth pairs and on items, withhold handling, unscreened-pair recall, and stale builds. Each mutation fails at least one test.

**Patch for `bench5/types.ts` (not owned, so not applied):**
- Add `LedgerRegistry` to the `import type { … } from '../vendor/agent-0.0.30/index.js'` list, after `LedgerProjectionInput`.
- Append the 21 `Shadow*` types.
- The full append text is in the session scratchpad at `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/patch/shadow-types.ts`. I can paste it inline if you want it in the reply.

The appended names:
- `ShadowHead`
- `ShadowOutcome`
- `ShadowConfig`
- `ShadowConfigOutcome`
- `ShadowRun`
- `ShadowMessage`
- `ShadowJudgment`
- `ShadowAggregate`
- `ShadowEntry`
- `ShadowSnapshot`
- `ShadowEntities`
- `ShadowTruth`
- `ShadowInputs`
- `ShadowItem`
- `ShadowVerdict`
- `ShadowRate`
- `ShadowPairs`
- `ShadowRates`
- `ShadowFlips`
- `ShadowCounts`
- `ShadowReport`

**Deviations (expected / found / evidence):**
1. **Copy file location.**
   - Expected: `run.json` names the copy file.
   - Found: `run.json` holds only `copy: N`. `Driver.ts` writes no path.
   - What I did: I resolve `COPIES_DIR/vN.json` and added an optional `--copies DIR` flag so the proof can use a fixture copy.
   - Needed: a ruling on whether to keep `--copies`. The usage line otherwise matches the brief.
2. **File layout.**
   - Expected: the architecture rule puts helpers and constants in their kind files.
   - Found: I own only two files.
   - What I did: the helpers, constants, and `Shadow` class live in `shadow.ts`. The types go through the patch above. The only unit that can fix the layout is the consolidation unit, which can move them.
3. **Judge identity in cache keys.**
   - Found: the keys use `createOllamaJudge(...).model`, a JSON string of the judge's options. They do not use `MICA_MODEL`. `Driver.#prepareCache` does the same.
   - What I did: the test builds its cache rows from the same identity.
4. **Owner registry.**
   - Found: the shadow rebuilds the registry from `messages.jsonl` with `collectToolGroups`, `resolveLedgerCall`, and `readLookup`. This mirrors `Mirror.readings` for the two lookup tools.
   - Limit: it cannot see per-result success flags, so it treats every lookup result as successful.

**Decisions inside the brief:**
- The first read point is the least `goal.after` of the copy (47 for the long copy). A judgment is shadowed only when its later message has a seed index above that.
- **Aggregates:** the aggregates current for a message are the rows with `lastSeed` below its seed index. A `current` build replaces a topic and a `withhold` removes it. `stale`, `agree`, and `change` rows change nothing.
- **State format:** `Topic summaries:`, one `TITLE: PROSE` line per topic, a blank line, then the plain state. A category question gets the `Message: ` label. A pair state does not.
- **Topic order:** earlier message, later message, then the request that follows. Within each message, owners come before desk topics.
- **Plain state:** if no named topic has a current aggregate, the state stays plain and the item is counted as `plain`. It is not re-asked. `counts.absent` counts the (item, topic) pairs that had no aggregate.
- **Rates:** `keep`, `drop`, pair `recall`, and pair `falsedrop` are reported as hits over total, for the plain and the shadow side, plus flips per head.
  - They use only items where both sides decided.
  - A truth pair the ledger never screened counts as not read on both sides.
  - A truth `supersedes` pair also counts in the `amends` truth, because the ledger screens with `amends` first.
- **Not simulated:**
  - The ledger's token-overlap check on `amends` pairs.
  - A shadow `amends` flip that would trigger a `supersedes` question the plain run never asked.
- **Exit codes:** a missing `run.json`, `messages.jsonl`, `judgments.jsonl`, or `aggregates.jsonl`, a missing copy file, or an absent cache file offline all exit 1. The control arm writes no `aggregates.jsonl`, so a control run exits 1.

**Rulings needed:** the `--copies` flag in deviation 1, and whether the consolidation unit should move the helpers out of `shadow.ts`.
