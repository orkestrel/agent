# Study 0.0.2 falsify verdict

One `orkestrel-falsify` round on the integrated Study 0.0.2 change (Study `eed15ac..c26c538`, four local commits) and
Agent's tools adoption (worktree branch `study-002-adopt`, `b56eb69..52af054`). The claims file was
`tmp/units/study-002-claims.md`: the design's C1-C27 (`tmp/units/study-002-design.md` § 4) plus adverse claims C28-C33.

## Lanes

| Lane | Engine | Result | Verdict file |
| --- | --- | --- | --- |
| Objective, attempt 1 | GPT-6 Astra xhigh (`study-002-falsify-astra-1`) | No verdict: the provider's content filter stopped the run. C29's wording was then made neutral, with its substance unchanged | none |
| Objective, attempt 2 | GPT-6 Astra xhigh (`study-002-falsify-astra-2`) | `VERDICT: FAIL C7, C28, C29, C31; outside the claims: none`; 33 claims reviewed; 5 citations resolve | `tmp/units/study-002-falsify/objective/verdict.md` |
| Subjective | Claude Opus 5.5 (`wf_9f3c432f-fad`) | `VERDICT: FAIL C7, C27, C28, C29, C31; outside the claims: O1, O2`; 24 citations resolve | `tmp/units/study-002-falsify/subjective/verdict.md` |

Neither lane saw the other before reconciliation. Both ran their probes against the built Study pinned in the worktree.

## Rulings

- **C1-C6, C8-C26, C30, C32, C33: CONFIRMED** by both lanes. Among them, C33: Agent's tools evidence rows are equal
  before and after the adoption across 26 inputs; the only two differences come from non-JSON tool arguments, which
  Agent's tool event never delivers.
- **C7: BROKEN** (both lanes, and S1's own record). Restoring only the parser's relative `StudyError` value import
  reddens C1, C5 and C6 but leaves C3 green (release subset: 1 failed, 1 passed, 12 skipped), because a private value
  copy is pruned from the declarations. **F7:** restate C7 as two controls: the value import for C1, C5 and C6; the
  relative `StudyControl` type import for C2 and C3. C3's implementation and its own mutation stand.
- **C27: UNRESOLVED in the subjective lane, settled here.** The lane saw the gate counts only in the commit message.
  The Orchestrator ran the final gates on the pinned built Study after V3 round 2 (`check` 0, `test:setup` 173,
  `test:studies` 99; format and lint clean on the touched files; `swap --status` 1 pin, 0 drift; ledger row of
  2026-10-20). The absence wording "nowhere in tracked or ignored sources" exceeds the ruled scope: 25 frozen review
  snapshots still contain the removed names, and they import only their own copies. **F27:** restate C27's absence
  check to live readers (`tmp/probes`, `tmp/units/ladder`, top-level `tmp/units` tooling); no code change.
- **C28: BROKEN** (both lanes). Mixing module formats (ESM root with CJS server, or the reverse) keeps `isStudyError`
  true but `instanceof StudyError` false; same-format controls hold both. The guide (`guides/study.md:13`) never states
  the limit and `README.md:25` claims both formats. **F28:** state the mixed-format identity limit beside the brand
  guidance in the guide and the README. Do not unify the module graphs or weaken the guard.
- **C29: BROKEN** (both lanes; the lanes differ on the fix). A `scenarios` directory or a rubric reached through a
  junction to an outside directory refuses with `CUSTODY: Linked or invalid custody directory` and exit 1, from the
  custody primitive at `study/src/server/stores/helpers.ts:206`, while every path-shaped malformed input (parent,
  absolute, drive-absolute, drive-relative, UNC, NUL) refuses with `CONFIG`, and nothing outside the bundle is read.
  **Ruling: F29 takes the objective lane's fix.** A declaration bundle is consumer input, and C13's contract maps
  invalid declaration input to `CONFIG` and exit 64. Classify a linked declaration path as `CONFIG` at the declaration
  reader's boundary, with reader and CLI assertions. Bound: links stay refused and nothing is read through them;
  `CUSTODY` stays the code for result and grading storage; do not translate custody errors in general. The subjective
  lane's documentation-only fix answered a different question (what the code does today), so it is not adopted.
- **C31: BROKEN** (both lanes). A real `node:fs` ENOENT posted from a worker arrives without `code`, so
  `matchesSystemError` is false; throwing `code` getters and null-prototype records correctly stay false. None of the
  seven call sites receives a cloned error. **F31:** narrow the claim and state in the TSDoc and the guide that
  structured cloning drops the system code. Do not parse message text or accept arbitrary code records
  (`study/src/server/helpers.ts:19`).
- **O1: substantiated** (subjective lane; verified at `study/src/server/agents/helpers.ts:28-38` and `:89-99`, an
  identical 11-line tool-call reader in `buildStudyAgentToolResult` and `buildStudyAgentToolDenial`). **FO1:** one
  exported, documented and tested reader that both call, named per `names.md`. Bound: the two projections keep their
  outputs and their `FAULT` refusal text.
- **O2: substantiated** (subjective lane; `guides/study.md:190` says the label instrument covers the package's "whole
  dist directory", while `computeStudyInstrumentDigest(entry, inventory)` hashes the entry and the instrument
  inventory, and the lane showed `.d.ts`, `.d.cts` and `.map` changes do not move it while `package.json` does).
  **FO2:** reword that sentence to what the inventory covers, verified against the code.

Advisories (subjective lane, six, none required for release) stay in its verdict file. One is carried as a follow-up:
Agent's `.orkestrel/study.md` ownership paragraph does not yet list the tool projections and the declaration reader.

## Carried into the fix unit

F7, F27 (claim restatements in the design and the claims record), F28, F31, FO2 (documentation), F29 and FO1 (code
with tests). Each code fix adopts the prescription and closes with a mutation probe, not a second round; the
restatements close by reading. Then the tree-wide gates on Node 24 and Node 22.18.0, then the release.
