# Unit audit-fix — Make the blind audit symmetric, arm-blind, and complete

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

Fix the audit machinery defects that the attack round confirmed, so that the next audits judge passes and failures by one standard, see no arm-specific field, and lose no item. The findings are in `/home/user/agent/tmp/bench/results/v10/audit/attack.json`, `confirmed`, lane `machinery`, ids F2, F3, F5, F6, and F7.

## Context

- **The tools.** Every file is under `/home/user/agent/tmp/bench/results/v10/tools/`:
  - `items.ts` writes the blind items and their key;
  - `audit.js` is a Workflow script: two blind `checker` auditors per chunk and a tiebreak. It has no filesystem access, so it learns what it needs from `args`;
  - `tally.ts` adjudicates and reads the band;
  - `inspect.ts` checks every recorded call.
- **The defects.**
  - **F2.** `items.ts:79` puts `toolsOk` in every failure item, and the failure brief tells auditors to judge "a tool failure". The harnesses compute `toolsOk` differently by arm, and the scorer's success ignores it.
  - **F3.** The pass brief makes any actionable error anywhere a false pass. The failure brief rules only the points the scorer flagged, so a reply with an unflagged error can be ruled a misread and count as a pass.
  - **F5.** `inspect.ts` classifies a summarizer only under a thinking condition, and treats the calibration calls (`num_predict` 1) as agent calls.
  - **F6.** `audit.js` builds its id set from the auditors' answers alone, so an id both auditors omit vanishes. `tally.ts` never checks counts.
  - **F7.** The ids are an unsalted hash of the run and goal, and the key files sit in the directory the auditors are pointed at.
- **Law.**
  - `AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`. Write TypeScript run by Node, except `audit.js`, which stays a Workflow script in plain JavaScript.
  - `/home/user/scaffold/.claude/rules/writing.md` for the brief text and comments.

## Scope

- **Owned.** `items.ts`, `audit.js`, `tally.ts`, and `inspect.ts` in that folder.
- **Off-limits.** Every other file. Never edit or delete the existing `audit/` files.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **`items.ts`.**
   - Drop `toolsOk` from the failure object.
   - Mint each id as 8 hex characters from a random 16-byte salt the run draws, hashed with the run and the goal. Keep the order by goal, then id.
   - Its usage line gains `--keys KEY_DIR`: the key file is written there, and the tool refuses a key directory equal to, or inside, the items file's directory (exit 64).
   - It also prints the item ids, one line per chunk-ready file, as a JSON array on the last line, so the Orchestrator can pass them to `audit.js`.
   - Keep `--key KEY_OUT` working as before for the earlier batches. When both are given, `--keys` wins.
2. **`audit.js`.**
   - Each chunk in `args.chunks` may carry `ids`, the array of item ids in its file. An id in `ids` that neither auditor returns gets the verdict `unresolved`, with the reason "no auditor returned it".
   - Remove "a tool failure" from the failure brief.
   - The failure brief rules `misread` only when every failed point is a misread AND the reply as a whole meets the pass brief's `correct` test, reading every element the request asks for and every value the reply states. It rules `real` whenever the reply would be a false pass under the pass brief. It rules `ambiguous` otherwise.
   - The pass brief is unchanged.
3. **`tally.ts`.**
   - Exit 1 with a message on any of the following: a verdict id with no key, an id that appears twice across the verdict files, or a paired run whose audited row count is not 10.
   - Add `--keys KEY_DIR`, which is read in addition to `--audit` for `key-*.json`.
4. **`inspect.ts`.**
   - Classify a call as calibration when `options.num_predict === 1`, and as a summarizer from the shape of its request (no tools and the summarizer's system text; read the main harness `/home/user/agent/tmp/bench/bench.mjs` for that text), whatever the condition.
   - Exclude both from the think, predict, empty, and count checks, and report them in their own counts.
   - Agent calls must equal the harness log's count exactly; otherwise it is a `count` finding.

## Output

Return:

- each contract's `file:line`;
- the result of each acceptance check.

No process diary.

## Acceptance criteria

Run from `/home/user/agent/tmp/bench/results/v10`. Write scratch outputs under `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/`.

1. `node --no-warnings tools/tally.ts --audit audit --pair f4-records,f4-control,1-4 --pair t2a-records,t2w-control,1-4` prints the same per-run low and high values as `audit/tally.json`, and exits 0.
2. `node --no-warnings tools/inspect.ts --dir . --out SCRATCH/inspect.json` reports 0 `think`, `predict`, and `count` findings for the f4 and t2a records runs, and classifies the compaction summarizer calls of `f4-compaction-v1`, `t2-compaction-v1`, and `t2w-compaction-v1`.
3. `node --no-warnings tools/items.ts --dir . --rows failures --items SCRATCH/i.json --keys SCRATCH/keys f4-records-v1` writes items with no `toolsOk`, and a key under `SCRATCH/keys`.
4. Run with `--keys` pointing inside the items' directory, it exits 64.
5. `node --check` passes for `audit.js`, run through a `.mjs` copy that is deleted after.
