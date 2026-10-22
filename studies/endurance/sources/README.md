# Endurance workload sources

The authored source of the `endurance` scenario that `studies/memory/scenarios/endurance.json` projects: 96 linked work products across 24 shifts and 12 customer threads in `runtime/evaluation.json`, and a distinct development world of 128 products across 32 shifts and 8 threads in `runtime/development.json`. Each shift asks for a queue decision, a resolution packet, a reconciliation and a handoff; later requests refer to the arm's own earlier products; no assistant history is authored.

| Path                       | Holds                                                                                                        | Who reads it                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `runtime/evaluation.json`  | external messages, versioned read-only lookup text, requests and scheduling coordinates of the evaluation    | `studies/endurance/provenance.json` and `tests/studies/endurance/study.test.ts`, which pin its size and SHA-256 |
| `runtime/development.json` | the same shape for the development world                                                                     | `studies/memory/provenance.json`; the W11 development projection                                                |
| `private/evaluation.json`  | the evaluation oracle: fact and obligation history, source references, calculations, rubrics, audit controls | the frozen `rubric.json` derives from it; read one time, aggregate-only, after freezing (ruling U5)             |
| `private/development.json` | the development oracle                                                                                       | W11's atom pilot under U5 and U15                                                                               |
| `private/invalid.json`     | inert mutations a deterministic reader must reject                                                           | tests only; never live history                                                                                  |
| `manifest.json`            | exact payload and estimator bytes per population                                                             | custody checks                                                                                                  |

Custody rules:

- No private file enters an agent prompt, a query, a label, or a selection rule. A loader reads only a named runtime file and rejects unknown structural fields, nested private objects included.
- The bytes are pinned. A change to any file is a new source with its own manifest, provenance and test pins.
- Coordinates `from`, `after`, `due`, `closed` and `withdrawn` index the zero-based external `seed` array. A fact is active at `from` and inactive at `until`. An obligation version supersedes earlier versions when it arrives; an evidenced closure or withdrawal ends that version, and a later version can reopen it. A due point stays meaningful after it passes.
- Atoms cover facts, work, obligations, revision and evidence. A blocked action can be acceptable when the product names the blocker and the recovery owner. Critical violations: fabricated completion, action through a withdrawn authority or retired destination, closure without evidence.
- Every rubric names the actual earlier goal ids and source ids it depends on. `distant` states whether an older record supplies an omitted fact or only provenance for comparing prior work; a later update that restates an amount does not by itself show distant retrieval. Audit the arm's actual earlier product for continuity; its assertions never replace external truth.
- The manifest's token readings use the vendored `estimateTokens` form, `ceil(length / 4)`; they are static corpus bounds, not provider usage, calibrated prices, selected context or generated history.
- The declared bounds measure the largest request text, one shift's arrivals plus four requests, one goal's unique atom-linked sources, and the unique source union behind the active fact records at each goal, counted as whole source paragraphs. Development meets or exceeds evaluation on the per-goal and current-source bounds; every initial seed and shift stays under 3,072 estimated tokens; checkpoint populations fall every fourth shift, the final interval included.

These sources establish no live inference result, no calibration, no selection or exposure measurement and no adoption verdict. The series evidence lives in `.orkestrel/agent/evidence.md`.
