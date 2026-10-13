I held the objective lane: whether each fix matches the measured method, and whether the contracts and tests hold. I could not run anything, so the gate exit codes and the `git status --porcelain` output come only from the writer's report (/home/user/agent-port/tmp/units/u6-fix2-last.md:19-41) and are UNRESOLVED. I judged each test by reading its assertions and naming the mutation it has to catch.

**Verdicts**

1. **CONFIRMED.** Recall order (/home/user/agent-port/src/core/ledgers/Ledger.ts:1029-1042) matches bench.mjs:2538-2549 and :2577.
   - The code walks `matched` newest first, checks only `done`, and the `amended` pre-pass is gone.
   - Test: /home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:1040-1045. With topic `Mira`, the source matches first and its item is "S\nC". With `Mira and AA-11`, the correction matches on its own and comes first, so the item is "C\nS".
   - Putting the pre-pass back makes :1045 come out "S\nC" and fail. Iterating oldest first fails it the same way.

2. **BROKEN (the rule-unit half has no test).** The code at Ledger.ts:712-714 and :739-741 matches bench.mjs:2271, :2117, and :2152. The non-rule half is pinned: reverting to all members fails Ledger.test.ts:1039.
   - The assertions meant for a rule unit (Ledger.test.ts:1047-1059) cannot fail on the mutation they are there for:
     - After the `rule:1` judgment, `placeMember` puts the source on the Rules record (/home/user/agent-port/src/core/ledgers/helpers.ts:653-654).
     - Ledger.ts:573-577 then puts the source in `held`, so it is never a unit and never reaches the rule branch. The Rules record renders it as a bare line, and C stays out because it is group 4.
   - Mutation that survives: replace `unit.category === 'rule' ? new Set(...) : held` with `held` at both sites.
   - What right looks like: a fixture where a decisive `rule` user message is a unit. For example, it names the seed owner, no message sits on the Rules record, and the request names no owner, so `records` is empty and `held` is empty. A live member of the owner record amends it. Assert that the briefing leaves out the amendment.

3. **CONFIRMED.** `#render` (Ledger.ts:787-819) renders owner and Rules record lines bare through `renderLedgerPinned` and `renderLedgerRecord`.
   - Loose and pinned units, recall items, and digest lines still go through `#renderSource`, so they keep the lead.
   - Ledger.test.ts:94-95 fails if the `views` mapping comes back. Ledger.test.ts:198, :736, and :1321 still pin the lead outside a record.

4. **CONFIRMED.** Ledger.ts:882 skips an exchange that does not open on a user message.
   - Only exchange 0 can open that way (:877), so this matches the shift at bench.mjs:2001.
   - Ledger.test.ts:455-461 (the welcome message) and :1127 (a reply left behind after a superseded user turn) fail on revert.

5. **BROKEN (deleting the filter added a departure).** Removing the assistant filter at Ledger.ts:850-857 also stopped dropping an empty seed call message whose calls were all dropped.
   - Input: seed `[{user:'Order LH-12345 is late.'}, {assistant:'', calls:[{id:'dropped', name:'unregistered', arguments:{}}]}, {tool, call:'dropped', content:'Unregistered result.'}]`, then `respond('Check LH-12345.')`.
   - Port: Ledger.ts:872 sends `{id, role:'assistant', content:''}`, so the provider receives [user, empty assistant, request].
   - Measured: bench.mjs:1976 pushes this message only when `message.content.trim() !== ''`, so it sends [user, request]. Commit 265a905 dropped it as well, so this is a regression.
   - The parts that were ruled hold. An empty assistant with no calls is kept (bench.mjs:1970), and the message carries no `calls` member. Ledger.test.ts:456-462 pins both.
   - Smallest fix: at Ledger.ts:853-856 add `(message.role !== 'assistant' || !calls.has(message.id) || (calls.get(message.id)?.length ?? 0) > 0 || message.content.trim() !== '')`. Add a test with this input that asserts the message is absent.

6. **CONFIRMED.** The filter at Ledger.ts:854-855 already removed every user message the deleted superseded branch covered, so the branch was unreachable.
   - No test can tell dead code apart from no code, so none is needed. The cited test, Ledger.test.ts:1108, pins finding 4.

7. **CONFIRMED.** Ledger.ts:964-965 returns `recall needs a topic: ` followed by the guidance, after the counter increments at :963. Ledger.test.ts:673-676 fails on revert.

8. **CONFIRMED.** The guidance is "an owner name, an id, or one of" followed by the desk topics. The empty-topic and no-match texts share it (Ledger.ts:964, :1044), and it uses the generic wording of Ledger.ts:174.
   - Ledger.test.ts:566, :1105, :1156, and :1238-1239 fail on revert.
   - This is a recorded departure from bench.mjs:2481, as ruled.

9. **CONFIRMED (TSDoc).** The `GAUGE` sentence and `@throws {LedgerError}` are at /home/user/agent-port/src/core/ledgers/types.ts:296-297 and :303, and at Ledger.ts:295 and :300. Ledger.test.ts:399 pins the behavior.

10. **CONFIRMED (TSDoc).** "reports no prompt usage, or a prompt usage of 0 or less" appears at types.ts:298 (in the diff), types.ts:615, and Ledger.ts:248. It matches the check at Ledger.ts:274-280.

11. **CONFIRMED (TSDoc).** `calibrate` carries `@throws {AgentError}` at Ledger.ts:249 and types.ts:299. The constructor carries `@throws {LedgerError}` at Ledger.ts:102.
    - The constructor's list matches its throws at :108-129. `Gauge` raises `LedgerError` `GAUGE` and `CAPACITY` (/home/user/agent-port/src/core/ledgers/Gauge.ts:39-45).
    - Ledger.test.ts:325 exercises the constructor throw.

12. **BROKEN (the new failure behavior is false).** Two new texts claim that any throw returns a result with `fault`: the `@returns` at types.ts:316 (in the diff) and at /home/user/agent-port/src/core/ledgers/Classifier.ts:50.
    - Input: a judge whose `ask` rejects while the caller's signal is live.
    - Actual: Classifier.ts:358-359 contains the rejection and returns `{ judgments: [] }`, so `classify` returns no `fault`. /home/user/agent-port/tests/src/core/ledgers/Classifier.test.ts:520-522 pins exactly that.
    - typescript.md:87-88 requires the failure behavior to be stated correctly. The ruling's own wording ("any throw") has the same overclaim, and the writer copied it.
    - Right: "a throw from the `assign` or `entities` handler, or a caller abort, returns the partial result with `fault`; a judge rejection under a live signal leaves that question undecided". The `fault` comment at types.ts:307 ("interrupts") is accurate as written.

13. **CONFIRMED.** Ledger.ts:335 returns a selection that carries `fault` unchanged.
    - Ledger.test.ts:539-541 fails on revert: the seed call and tool messages leave `messages`, so `toEqual(views[1])` breaks.
    - The `system` getter fault is preserved because Ledger.ts:133 keeps the options object itself.

14. **CONFIRMED.** Classifier.ts:347-355 pushes the partial's usage, plus the key when the partial answered or refused it, before the rethrow at :358. This matches /home/user/agent-port/src/core/contexts/factories.ts:137-145.
    - Classifier.test.ts:399-405 covers both the answer case and the refusal case. Removing the push leaves the usage at 5 and the judgments at 1 key. Removing the refusal check fails the `refused` iteration.

15. **CONFIRMED.** Ledger.ts:252-258 sets `#active` synchronously before the first await and clears it in `finally`.
    - Ledger.test.ts:491-501 fails on revert: `respond` would proceed. It also fails without the `finally` reset: the later `respond` would reject in both the success and the failure iteration.
    - `respond` calibrates through `#measureGauge` (:311), so it never trips its own flag.

**Findings outside the claims**

- **N1 (new departure).** The empty call-message regression in verdict 5 departs from the measured method (bench.mjs:1976). It is not recorded in /home/user/agent-port/tmp/units/records-port-plan.md.
- **Gates.** All seven exit codes are UNRESOLVED; only the writer's report carries them. The writer also reports an audit that failed with `spawnSync EPERM` (u6-fix2-last.md:31).

**Attacked and held**

- **Recall chain through a node already listed.** The port walks through a `done` node and filters its lines; the measured `add` stops at a listed node (bench.mjs:2543). Whenever a node is listed, its live chain is already listed, so the output is the same.
- **Earlier CONFIRMED claims.** No regression found:
  - contract verdict 1: `#select` never throws (Ledger.ts:527-550);
  - contract verdict 3: `calibrate` still refuses a call during `respond`;
  - contract verdict 7: the concurrency check still runs before the first await (:303);
  - parity fixes 6 and 7: Ledger.test.ts:87-90 and :1126;
  - the digest and recall leads: :198, :736, and :1321.
- **Exchange skip versus measured shift.** `continue` on exchange 0 behaves like the measured shift, because exchange 0 is the oldest and the last one visited.

VERDICT: FAIL 2 5 12