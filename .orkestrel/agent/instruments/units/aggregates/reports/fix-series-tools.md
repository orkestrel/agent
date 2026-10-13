No file I own changed this round. The `tsc` failure comes from `bench5/types.ts` and the shadow unit's files, so it needs a patch to `types.ts` and a ruling on the arm name.

**Files written**
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/tools/run-one.ts`: unchanged from my earlier report.
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/plan.ts`: unchanged.
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/plan.test.ts`: unchanged.

**Proof commands** (from the harness directory)
- `node --test bench5/tests/plan.test.ts` exits 0, with `# tests 12`, `# pass 12`, `# fail 0`.
- `node /home/user/scaffold/node_modules/typescript/bin/tsc -p bench5/tsconfig.json` exits 2. All 35 errors are in `bench5/shadow.ts` (31) and `bench5/tests/shadow.test.ts` (4). None are in `plan.ts`, `plan.test.ts`, or `run-one.ts`.

**Deviations**
1. `tsc` exits 2, not 0.
   - Expected: exit 0.
   - Found: `bench5/types.ts` has no `Shadow*` exports. `shadow.ts` imports `ShadowAggregate`, `ShadowConfig`, `ShadowConfigOutcome`, `ShadowCounts`, `ShadowEntities`, `ShadowEntry` and about 15 more. The 31 and 4 errors are those missing imports plus the implicit-any and index errors they cause. `grep Shadow bench5/types.ts` returns nothing.
   - Evidence: the `tsc` output. I don't own `types.ts` or `shadow.ts`, so I did not edit them. The type-consolidation unit must add the `Shadow*` types to `types.ts`, or the shadow unit must hand over a patch for it. My exit 0 in the earlier report came from before `shadow.ts` landed.
2. The run-one hash and the `rows.jsonl` summary path have no test, as reported earlier. Both sit after the cold start, which needs the daemon.

**Ruling still needed**
- `rulings.md` does not address the arm-name question from lens 2. Copy 1's aggregate run fills the cache. `series.ts:96` prices later aggregate copies at 1.3 × the longest finished run of arm `l5-q2-aggregate`. Stage A would therefore stop before copy 3's aggregate run.
- `plan.ts` keeps the brief's `l5-SHORT-ARM-vN` name until you rule. The options are:
  - Give copy 1 a distinct arm token, for example `l5-q2-aggregatefill-v1`. `plan.ts` and its test change, and `report.ts --pair` must read the token.
  - Change `series.ts`.
- The cache-fill token is the cleaner fix because it touches only files this series already owns. Say which option you want and I will update `plan.ts` and its test.
