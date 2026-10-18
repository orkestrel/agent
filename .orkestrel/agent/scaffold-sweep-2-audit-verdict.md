# Scaffold sweep round 2: falsify verdict (2026-10-16)

## Subject and lanes

- **Subject.** Scaffold's uncommitted chain on `1f2eed70e`: the studies project, the Bindings rule bullets 1–9, and `let`-sweep rounds 1–2. The claims are in `tmp/units/scaffold-sweep-2-claims.md`; the backup is `tmp/units/scaffold-sweep-round2.patch` plus `scaffold-sweep-round2-untracked/`.
- **Objective lane.** Grok 4.7 xhigh (Cursor, T3 task `scaffold-sweep-2-falsify-objective-grok-1`): `tmp/units/scaffold-sweep-2-verdict-objective-1.md`. Verdict: `FAIL 1, 2, 4, 5, 6, 9; outside the claims: F1`.
- **Subjective lane.** Opus 5.5, a native agent: `tmp/units/scaffold-sweep-2-verdict-subjective-1.md`. Verdict: `FAIL 2, 3, 4, 5, 9; outside the claims: O1`.
- **Reproduction.** Five Sonnet reproducers (workflow `wf_9b130a7d-07c`). Each probe ran in scaffold `tmp/probes`, was deleted afterwards, and left the tree unchanged.

## Per-claim rulings

| Claim | Grok | Opus | Ruling |
| --- | --- | --- | --- |
| 1. Behaviour unchanged | BROKEN | UNRESOLVED | **BROKEN.** `#gather` loses an undefined item at concurrency 2 or more. The reproducer confirmed this as reported; it is unreachable, because every caller's guard refuses a hole. The `launch.ts` finding is CONFIRMED-WIDER: a cap above 4294967 s exits 1 through an unhandled rejection, with no trailer and no status-after. HEAD's clamp-to-1-ms false kill above 2147483 s is a defect that predates the round. Opus's UNRESOLVED stands on the instrument: the behaviour probe baselined round 1, not HEAD. |
| 2. Emitted output unchanged except the listed exceptions | BROKEN | BROKEN | **BROKEN on the list, not on the bytes.** The reproducer's HEAD-baselined emission instrument is CONFIRMED-WIDER. The undeclared changes are the journey proofs (browser and vue), `configs/browsers.ts`, the removed `SheetEntry` export, the `readLayerNames` signature, and 16 hunks of `tests/distribution.test.ts` beyond `DistributionSuite`. The Bindings rule binds emitted code, so these bytes are required. Two exceptions to that: HEAD's journey assertion compared a `Set` with an array, which never passes, so the array form is a fix; and `SheetEntry` has no importer in the fleet. Only the browsers `HOMEDRIVE` read order needs restoring. `vite.config` `mergeOverride` drops holes, which is bounded and documented or restored. |
| 3. The studies selector | CONFIRMED | BROKEN | **BROKEN.** A test file under `tests/studies/**/node_modules/**` or `**/.git/**` selects the project, but Vitest's default exclude collects nothing, so `test:studies` exits non-zero. The reproducer confirmed it as reported, reachable through `scaffold repair`. Grok's rows had no `node_modules` case; the two lanes answered different populations. |
| 4. The rule text | BROKEN | BROKEN | **BROKEN.** The numbering clash is real: the rulings call the exemption list the ninth bullet when it is the eighth. The text also lets disguises through. The user ruled "Close all, middleware too"; the redraft is `tmp/units/bindings-rule-3-draft.md`. |
| 5. Met in substance | BROKEN (`log.at(-1)`) | BROKEN (5a–5g) | **BROKEN.** 5a, 5b, 5c and 5d are confirmed as reported and reachable (5d ships to every fleet target). 5e (`GitQuery` intake) is BOUNDED-SMALLER: `src/bin` internal, unexported. 5f is BOUNDED-SMALLER: scaffold's own tests only. 5g is confirmed: scaffold's own tests. The `log.at(-1)` guards are BOUNDED-SMALLER: the `replaceManifestScripts` guard is dead, while the `replaceManifestRanges` guard defends non-JSON text, so it is rewritten to read the whole log. |
| 6. Surface changed only as approved | BROKEN | NOT-EVIDENCED | **BROKEN on the record.** Seven new exports were missing from the list: `computeTotal`, `scanManifestTokens`, `ManifestToken`, `STUDIES_TEST_INCLUDE`, `replaceManifestOverride`, `insertManifestSection` and `listAncestors`. `collectAncestors` and `captureValue` were never HEAD symbols. Under `architecture.md:51` every declaration is exported, so the exports are lawful. Each must have a proof, and an export the fixes leave without a caller is deleted. |
| 7. No test weakened | CONFIRMED | UNRESOLVED | **CONFIRMED,** apart from the `TestHolder` control, which 5g replaces. |
| 8. Vendored and hosted artifacts | CONFIRMED | UNRESOLVED | **CONFIRMED** for digest consistency. The fix round adds a check that the build is idempotent: a second `npm run build` leaves `git status` unchanged. |
| 9. Coherent | BROKEN | BROKEN | **BROKEN** until the fix unit lands. |
| F1. `BuildState.trusted` | BROKEN | held | **BOUNDED-SMALLER.** A plugin's state is closure-local, so no consumer can reach it. Fix: move the lookup into `BuildState` as a method, so the set is never returned. Never copy the set per hook call. |
| O1. `tests.md` `setupStudy` sentence | | BROKEN | **Adopted.** Use the lane's directive sentence. |

## Findings carried into the fix unit

Every finding below goes into the scaffold fix brief, which is written after the rule text lands.

1. **`#gather`.** Place each result at its index, so a skipped index stays a hole, as at HEAD.
2. **`launch.ts`.** Refuse `cap > 2147483` at the usage guard (exit 64) before any side effect, and document it. This also removes HEAD's false kill.
3. **Studies selector.** Skip paths with a `node_modules` or `.git` segment, and add both rows to the proof.
4. **5a.** `#readWithRetries` becomes a bounded recursion over the attempt.
5. **5b.** A per-call read-budget entity replaces the threaded `spent` list. It gets a barrel row, a guide row, an `@example` and a proof, and its name is cleared under `names.md` fleet ownership. Delete `computeTotal` if no caller remains.
6. **5c.** `resolveRealPath` gets a depth-capped recursive helper.
7. **5d.** `stepYamlState` uses the classify-then-join form.
8. **5e.** In `GitQuery`, `collect` and `refuse` become private, the interface becomes `read()`, and the pure split and limit helpers move to `src/bin/helpers.ts`.
9. **5f.** Restore HEAD's `const AUDIT_REGISTRY` with `afterAll`.
10. **5g.** `TestHolder` becomes one-shot, its `destroy` returns the held value, and the TSDoc is corrected.
11. **Manifest guards.** Delete the dead `replaceManifestScripts` guard and its comment. Rewrite the `replaceManifestRanges` guard as `log.some(…)` and correct its comment.
12. **Emission.** Restore the browsers `HOMEDRIVE` read order. Decide `mergeOverride` holes. Record every emitted change by path in the successor claims.
13. **F1.** Add the `BuildState` lookup method.
14. **O1.** Replace the `tests.md` sentence.
15. **Claim 6.** Every new export has a proof; an orphaned export is deleted.
16. **Instruments.** Re-baseline the behaviour probe on HEAD for every function the chain rewrote, keep the emission instrument with a HEAD baseline, and add the build-idempotency check.
17. **The census.** Every site `tmp/units/bindings-rule-3-census-scaffold.md` lists under the landed text.

## What is not broken

- `Upstream#gather`'s shared iterator, its first-reason abort and the `Object.freeze({ error })` wrapper.
- `mergeOverride`'s rank pick, and the revision orderings of the browser resolvers.
- `GitQuery`'s messages and codes.
- `DistributionSuite`'s single start.
- `CLI.#targetQuestions`, whose branch lists are lawful under ruling A.
- `readGates` and `listCollected`: the R4 traversal and the R5 memo.
- `window.ts` `publishAll`.
- `scriptToInvocations`, which is an R1 fold.
- `collectScriptChain`, which keeps HEAD's O(V+E).
- The studies selector's case and extension near-misses, its chain placement, and its one-pass repair.

Over-correcting would break two things. Restoring HEAD's emitted bytes would bring back the `let`s the Bindings rule bans in emitted code. Copying `BuildState`'s set per hook would cost a copy on every `resolveId`.

## Engines

Grok was right about the `#gather` hole, the incomplete surface list, the numbering, and the incomplete emitted-change list. Opus was right about the `node_modules` selector, the rule disguises, and the syntax-only sites 5a–5g. Grok's F1 was bounded smaller, and Opus's view of it as a type-level readonly view was the safer reading.
