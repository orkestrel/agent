The `tsc` gate still fails in the real tree, and I can't fix it from my two files. `bench5/types.ts` has no `Shadow*` exports and I don't own it, so I wrote nothing this round. I'm returning an exact patch for it instead.

**Files**
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/shadow.ts` is unchanged.
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/shadow.test.ts` is unchanged.

**Proofs, run from `/home/user/scaffold/.orkestrel/agent/instruments/harness`**
- The `tsc` command (`node /home/user/scaffold/node_modules/typescript/bin/tsc -p bench5/tsconfig.json`) exits 2 in the real tree. `grep -c Shadow bench5/types.ts` returns 0. The first errors are the TS2305 "has no exported member" errors on `./types.ts`, for `ShadowAggregate`, `ShadowConfig`, `ShadowConfigOutcome` and the rest. The implicit-`any` errors in the gate report follow from those missing types.
- `node --test bench5/tests/shadow.test.ts` exits 0 with `# tests 22`, `# pass 22`, `# fail 0`. This ran in the scratch copy that has the patch applied, not in the real tree. The real tree passed 22 of 22 in the gate.
- In the scratch copy the same `tsc` command exits 0. I rebuilt that copy from the current tree on 2026-10-10: copy of `bench5/` plus symlinks to the other harness directories. The only differences from the real tree are the patch and a `typeRoots` line in `tsconfig.json`, changed to the absolute `/home/user/scaffold/node_modules/@types` because the copy sits at a different depth.

**Patch for `bench5/types.ts` (needs applying by its owner)**
- The unified diff is at `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/patch/types-shadow.diff`. Its paths are `a/bench5/types.ts` and `b/bench5/types.ts`, so apply it from the harness directory with `patch -p1`.
- It does two things:
  1. It adds `LedgerRegistry,` to the vendored import list, after `LedgerQuestion,`.
  2. It appends the 21 `Shadow*` types at the end of the file. The raw append text is in `patch/shadow-types.ts` in the same scratchpad directory.

**Deviations (expected / found / evidence)**
1. Expected: a fix inside my owned files. Found: the cause is only in `types.ts`, which belongs to the type-consolidation unit. Evidence: the scratch copy goes from `tsc` exit 2 to exit 0 with the patch and no change to `shadow.ts` or its test.
2. Copy file location. Expected: `run.json` names the copy file. Found: it holds only `copy: N`, so I resolve `COPIES_DIR/vN.json` and added an optional `--copies DIR` flag. Needed: a ruling on whether to keep `--copies`.
3. Judge identity. Found: the judge cache keys use `createOllamaJudge(...).model`, a JSON string of the judge's options, not `MICA_MODEL`. `Driver.#prepareCache` does the same, and the test builds its cache rows from that identity.
4. Owner registry. Found: I rebuild it from `messages.jsonl` with `collectToolGroups`, `resolveLedgerCall` and `readLookup`. It can't see per-result success flags, so every lookup result counts as successful.
5. File layout. Found: the helpers, constants and the `Shadow` class sit in `shadow.ts` because I own only two files. The type-consolidation unit can move them.

**Ruling needed:** whether to keep `--copies`.
