# Study `let` sweep (rounds 1–2 and fix 3): falsify verdict (2026-10-16)

## Subject and lanes

- **Subject.** Study's uncommitted tree on `ca81174`: 76 paths, with new files staged or marked intent-to-add. Claims: `tmp/units/let-sweep-study-2-claims.md`. Backup: `tmp/units/let-sweep-study-round2.patch`, whose SHA-256 the current tree still matches after reproduction.
- **Objective lane.** Grok 4.7 xhigh, T3 task `let-sweep-study-2-falsify-objective-grok-1`, verdict `tmp/units/let-sweep-study-2-verdict-objective-1.md`: `FAIL 4, 8; outside the claims: none`.
- **Subjective lane.** Opus 5.5, verdict `tmp/units/let-sweep-study-2-verdict-subjective-1.md`: `FAIL 1, 5, 8; outside the claims: O1`.
- **Reproduction.** One Sonnet reproducer in workflow `wf_3d43915c-935`. Its probe was deleted. The `clean: false` it returned comes from a leftover `tmp/probes/cleanup-attribution` directory dated 2026-10-15, created by an earlier unit. That directory was not touched, and should be swept with the campaign's tmp files.

## Per-claim rulings

| Claim | Grok | Opus | Ruling |
| --- | --- | --- | --- |
| 1. Behaviour equals HEAD | CONFIRMED | BROKEN | **BROKEN, confirmed as reported.** The timing extractor runs on every streamed row: the probe counted 4 calls where HEAD made 1. This breaks the terminal-only contract at `src/server/ollama/helpers.ts:426` and `types.ts:141-142`. The recorded timing is unchanged, which is the question Grok answered. No test catches the change, and no series result moves, because Agent's extractor is pure. |
| 2. No leaks | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 3. No weakened test | CONFIRMED | CONFIRMED | **CONFIRMED**, apart from O1. |
| 4. Bindings in substance | BROKEN (`#slots`, `StudyCommand#prepare`) | CONFIRMED | **`#slots` is ruled by the landed rule text.** HEAD has the same shape. It is a per-role latest-dispatch `Map` kept across goals, the keyed twin of the lawful `#previous`. The default lawful form is a copy-on-write `#` field holding a `ReadonlyMap` that `#number` replaces (`typescript.md` § Immutability, "copy-on-write for internal state"), unless the landed text says otherwise. **`StudyCommand#prepare` was BOUNDED-SMALLER.** It is byte-identical to HEAD and lawful under the awaited-log bullet. It is still unified into one `{ scenario, fixture }` list, with both lists derived by `map`; this costs nothing and changes no behaviour. |
| 5. Surface and placement | CONFIRMED | BROKEN | **BROKEN.** `StudyProcessGoal` has no lawful intern ground. The user ruled "Barrel it per the law". |
| 6. Guide parity | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 7. Agent compatibility | CONFIRMED | CONFIRMED | **CONFIRMED.** The only restage edits are the two `clear()` calls. |
| 8. Coherent | BROKEN | BROKEN | **BROKEN** until the fix unit lands. |
| O1. The D4 proof is vacuous | | BROKEN | **Confirmed as reported.** With the per-child abort listener deleted, only the Vitest 5 s timeout fails; with a 30 s timeout the mutant passes 6/6. The mid-launch case has the same weakness. |

## Findings carried into the Study fix unit

The fix unit runs after the rule text lands.

1. **Timing extractor.** At `StudyOllamaTransport.ts:273` and `:295`, read the terminal row first and extract only when it is defined. Add a case with a recording `timing` that asserts exactly one call. The fix was verified in a scratch copy: one call, and 144 of 144 Ollama tests pass.
2. **`#slots`.** Rewrite it in the landed text's lawful form.
3. **`StudyCommand#prepare`.** Use one step list, with both lists derived.
4. **`StudyProcessGoal`.** Add it to the server barrel with a `guides/study.md` row and a runnable `@example`. Remove it from `INTERNAL`.
5. **O1.** Keep the child references. After the abort, add `waitForCondition('every interrupted child exited', …, { budget: 3000 })` from `@orkestrel/test`, with the budget below the 10 s deadline, in both the D4 case and the mid-launch case. Keep `[130, 130]`. This was verified red on the mutant as an assertion failure and green on the real code.
6. **Census.** Every site listed in `tmp/units/bindings-rule-3-census-study.md` under the landed text.

## What is not broken

- The `#goals` registries, the `#serving` and `#flushes` registries, and the per-call entities.
- `#previous`.
- `terminateStudyChild`'s R4 traversal.
- `StudyMeter#usage`, which is copy-on-write.
- `scanStudyTree`'s R1 fold.
- `isStudyCustodyAttempt`.
- The placeholder-digest size check.
- The race test, which is red under HEAD's transport-wide flag.
- Agent's restage, which needs exactly the two `clear()` calls.

## Engines

- Grok's attack on behaviour was the more thorough, but it missed the callback contract. Opus caught it by reading the documented `@param`.
- Grok was right that `#slots` is a latest-value shape, but it is pre-existing. Opus held it under R2 by mistake: `#slots` is not a registry.
- Opus alone found O1 and the barrel ground for `StudyProcessGoal`.
