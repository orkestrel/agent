# Studies cleanup falsify round: verdict

- **Round.** One round, 2026-10-16, on the Agent/Study studies cleanup chain: Agent `c0a23f8`, `74604c6`, `a96fe45`, `8641370`, `c7973ae`; Study `a2ae4c7`, `7508dff`, `a1dea1a`.
- **Claims.** Ten claims (`tmp/units/studies-cleanup-claims.md`).
- **Decision.** Whether the cleanup closes.

## Lanes

| Lane | Engine | Verdict | Report |
| --- | --- | --- | --- |
| Objective | Grok 4.7 Extra High via Cursor, the user's Astra/Sol alternative | `FAIL 1, 6, 9, 10` | `tmp/units/studies-cleanup-falsify-objective-1.md` |
| Subjective | Claude Opus (read-only; it did not mutate) | `FAIL 1, 6, 8, 10; outside the claims: O1, O2` | `tmp/units/studies-cleanup-falsify-subjective-1.md` |

The Opus engine family wrote parts of the audited work: U1, and the first U3 attempt on Cursor Claude Opus. The subjective lane was told so.

## Rulings

| Claim | Ruling | Basis |
| --- | --- | --- |
| 1. Removed claims proven elsewhere | **Broken.** | Four Study mechanisms the cleanup treated as proven stay green under their mutation: reported prompt and decode durations in `buildStudyOllamaTiming`; the summary role on the reserved-room refusal; and `collectStudyEvidence`'s digest, completeness and invalid-row checks. Both lanes found the evidence gap. The Orchestrator reproduced two of the breaks (prompt duration forced to null; the invalid-row check disabled), each 0 red of 380 `src:server` tests. |
| 2. New Study tests are not vacuous | Confirmed. | The objective lane's attack: a throw on prompt ≥ projection reddens the three summary rows. |
| 3. Kept seams bind; the two unbound seams are unbound | Confirmed. | The objective lane's mutations. The unbound post-generate `check()` and the request-timeout wiring stay deferred to the post-results sweep. |
| 4. No production source changed | Confirmed. | Empty diffs; the installed Study `dist` is byte-equal to Study `dist` (14 files). |
| 5. Rename complete and inert | Confirmed by both lanes. | |
| 6. Lawful structure | **Broken.** | `tests/studies/memory/endurance.test.ts` proves `studies/endurance`. A `readStudyMemoryGrade` test (`helpers.ts`) sits in `StudyMemoryAdapter.test.ts`. Study's `tests/setupStudy.ts` exports `buildOllamaJudgeRow` and `buildStudyAgentOrigins` with no importer. |
| 7. U4 moved tests verbatim | Confirmed by both lanes. | |
| 8. Aliases and guide statements | **Broken (split).** | The aliases hold. The guide sentence on relative paths is true of result, output, rubric and label paths, but false of profile paths, which `resolveStudyProfile` resolves with `path.resolve`; `tools/local` declares root `.`. The two lanes answered about different objects; the sentence gets scoped. |
| 9. No claim silently weakened | **Broken (split).** | The subjective lane matched every removal to a ledger record. The objective lane found the ledger records some only in prose, and it found two removals with no covering test at all: the model names per role (`readMemoryModels`) and the `captureStudyPackages` wrong-package refusal. Both constraints are taken: restore what nothing covers, and record the rest as rows. |
| 10. Accept? | **Not accepted.** | Accept after the fix unit. |

## Correction to the claim 6 ruling (2026-10-16, user)

The objective lane prescribed dropping `export` from Study's `buildOllamaJudgeRow` and `buildStudyAgentOrigins` because nothing imports them. The Orchestrator carried that into the fix unit verbatim, and that was wrong. The binding law is:

- `scaffold/.claude/rules/tests.md:189`: "Export every reusable helper, fixture type, factory, constant, and guard from setup files."
- `scaffold/.claude/rules/architecture.md:51`: "Every declaration in a centralized file is exported. Fold away a trivial single-use declaration or export/test it; never leave it hidden."

An export with no importer is therefore repaired by keeping it exported and proving it in the sibling setup proof, or by folding away a trivial single-use declaration. Hiding it is never the repair.

U3's hidden `executeStudyProcess` (and any other hidden setup declaration) falls under the same ruling. Neither lane caught it, and the Orchestrator adopted the prescription without checking it against the law.

A correction unit restores every hidden setup declaration in both repositories, with proofs. Every subagent brief from now on carries the user's standing instruction verbatim: read scaffold's `AGENTS.md` and the files it points to, especially the rules, agents and skills, and follow them strictly, especially on repository structure.

## Outside the claims

- **O1.** The ledger existed only under the git-ignored `tmp/`, and its paths were stale after U4. Carried into the fix unit as a durable `.orkestrel/agent/studies-cleanup-ledger.md`.
- **O2.** A `vi.waitFor` poll in `StudyMemorySession.test.ts` was carried over from before the chain. `tests.md` § Condition requires `waitForCondition`. Carried into the fix unit.
- **Advisory.** A Study `test:src` deadline test (`StudyResults.test.ts`, "expired within budget") flaked under heavy mutation load and passed alone. It stays an observation.

## Fix unit

The fix unit is `tmp/units/studies-cleanup-u6-brief.md`, Claude Sonnet builder. It adopts both lanes' prescriptions verbatim, so it closes with Orchestrator mutation probes rather than a successor round.

- **Study fixes:** S1 durations, S2 summary role, S3 three evidence cases, S4 unexport, S5 guide sentence.
- **Agent fixes:** A1 endurance move, A2 grading-test move, A3 model-name and package-refusal restores, A4 ledger rows, A5 `waitForCondition`, A6 durable ledger.

## Closure

Pending until the fix unit lands. The record then follows: its mutation probes, gates and commits.
