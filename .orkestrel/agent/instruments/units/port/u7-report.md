All six gates pass, and parity needed no change to source files. One open item for you: the guide copies four doc comments that read badly or overstate, and I'm returning them as patches rather than applying them. They are listed under "TSDoc patches" below.

**Owned files**
- `/home/user/agent-port/guides/agent.md`: adds the Ledgers module tables, the Classifier and Gauge example, the three method tables, the ledger method section, the ledger pattern and the ledger test entries, and fixes the sentences the briefing made incomplete.
- `/home/user/agent-port/tests/guides.test.ts`: adds two cases under `flagship fences` that run the new code blocks and check every value their comments state, plus the imports they need.
- Diffstat: `guides/agent.md | 326 ++++++-` and `tests/guides.test.ts | 199 +++`, for 2 files changed, 518 insertions and 7 deletions.
- The diff is at `/home/user/agent-port/tmp/units/u7-ledger-guide.diff` (660 lines).

**Sections added, with line ranges in `guides/agent.md`**
- 512–541, `### Serving a conversation through a ledger`, placed after The stock selection. It covers, in order:
  - what the method is;
  - the filing (Mica is the injected judge), the records, the plan inside a token budget, the `recall` tool, the repeat stop and the answer pass;
  - what the application supplies: the judge, the `LEDGER_QUESTIONS` wording with its own cutoffs, the topics, the lookups with their reading handlers, and the capacity;
  - the five documented limits;
  - one sentence with the measured reading: 6.50–6.75 against 4.38–5.13 passes per copy, on the Larkspur benchmark with the 2B Qwen, citing the scaffold repository's `records-series-verdict.md` (audit of 2026-10-09).
- 1166–1314, `### Ledgers module`, after the Agents module:
  - tables with one row per export: Types (36), Constants (13), Errors (2), Factories (1, with signature), Classes (3) and Helpers (19, with signature);
  - 1275–1313: a code block exercising the `Classifier` and `Gauge` methods.
- 1596–1630, method tables for `LedgerInterface`, `ClassifierInterface` and `GaugeInterface`. The Methods introduction at line 1319 now lists them and their classes.
- 2351–2442, `### Serving requests through a ledger` under `## Patterns`. Its code block imports from `@orkestrel/agent` only and builds a ledger from:
  - a scripted provider;
  - a scripted judge standing in for Mica;
  - one lookup, `lookup_order`;
  - `LEDGER_QUESTIONS`, with declared `thresholds`.

  It then calibrates, sends two requests and reads `content` and both briefings.
- 2572–2576: `## Tests` entries for the five ledger test files. The `tests/guides.test.ts` entry at line 2533 now names the ledger cases.
- Fixed sentences:
  - Line 9: the overview paragraph now mentions the `Ledger`.
  - Line 21: the Surface introduction now names the ledger.
  - Line 200 and Contract clause 8 at line 1642: the assembly order now includes the selection's `briefing`.
  - Contract clause 48 at line 1682: now says what `build(selection)` does with the `briefing`.
  - Lines 359 and 361 were already true and are unchanged.

**TSDoc patches (shared files, not applied)**

If you apply one, the matching Summary cell in the guide has to change in the same commit; `npm run test:guides -- --to guide` will sync it.

```diff
--- src/core/ledgers/constants.ts
-/** Matches the judge error the measured harness holds as deterministic (`tmp/bench3/bench.mjs:867`). */
+/**
+ * Matches the judge error the classifier holds as deterministic, so it does not ask the failed
+ * question again while the question and its state are unchanged.
+ */
--- src/core/ledgers/factories.ts
- * Creates a conversation ledger after checking its thresholds, allocation, and tool names.
+ * Creates a conversation ledger after checking its thresholds, shares, capacity, limits, topic
+ * names, lookup names, and supplied gauge.
--- src/core/ledgers/Ledger.ts
- * Serves one conversation through classified records, a bounded briefing, and a final answer pass.
+ * Serves one conversation through filed records, a briefing that fits its capacity, and an answer
+ * pass when the first pass ends partial or without final text.
```

`src/core/contexts/types.ts` is outside this unit's scope, but its `@returns` line for `build` leaves out the briefing. This is not a parity cell:
```diff
-	 *   of (the prompt, the scoped instructions, the active workspace's text files) is non-empty
+	 *   of (the prompt, the scoped instructions, the active workspace's text files, an unfaulted
+	 *   selection's briefing) is non-empty
```

**Gates**
- Before the change, `npm run test:guides` exited 1 with 2 failed and 88 passed. The failing cases were `documents every barrel export` and `keeps behavioral interfaces and implementing classes in parity`.
- After:

| Command | Exit | Result |
| --- | --- | --- |
| `npm run test:guides` | 0 | 92 passed |
| `npm run test:policy` | 0 | 119 passed, 1 skipped |
| `npm run lint:check` | 0 | — |
| `npm run format:check` | 0 | 172 files, all formatted |
| `npx tsc --noEmit --project tsconfig.json` | 0 | — |

**Proof**
- No `prove` claim was made. Each claim in the code-block comments is checked by an executed case in `tests/guides.test.ts`:
  - `serves two requests and pins the looked-up owner as the ledger pattern fence claims` checks the result, the two briefings, and that the second prompt is the system text with its briefing, the seed tail and the request only.
  - `files one rule and prices one request as the classifier and gauge fence claims` checks each reading and gauge value.
- The probe output was turned into those assertions and removed; my scratch files are deleted.

**Deviation state:** none. Parity did not require a source change.

**`git status --porcelain`**
```
 M guides/agent.md
 M tests/guides.test.ts
```