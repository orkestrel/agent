# Admission and observation ruling

Root accepts the integrated code at Agent 3f7c2bd, Study ec988a9, and Ollama aad1e2d for
bounded calibration. Live calibration and Compaction qualification remain execution gates.
This ruling establishes neither model quality nor a performance improvement.

The independent lanes were native GPT-6 Astra and actual Claude Opus 5.5. Both received the
same claims and frozen diffs without the other report. Astra returned PASS; Opus returned
FAIL 3 because daemon prompt-count semantics were unresolved. Opus ran for 634618 ms,
exit 0, uncapped, session b38711b1-9819-4be6-82ff-b692c5578827. Its separate citation
correction ran for 13649 ms. No Fable lane ran.

## Rule on the claims

1. Admission is confirmed. The Agent prices the post-replay request, rebuilds it after
   compaction, and refuses a strict exhausted window before dispatch. Cancellation precedence
   and the existing compaction strategy remain intact.
2. Components are confirmed. Fixed-value tests distinguish disjoint heuristic contributions
   from actual provider usage. Root's image-contribution mutation produced 3 failed tests and
   28 passes; restoring the exact source bytes produced 31 passes. The mutation's restored
   SHA-256 is 04918c5b0e888fa05eba2405fe71b72dd553b56d10351d8c8f192508da15b400.
3. Projection is confirmed for the declared wrapper contract. Both lanes confirmed the code
   mechanism. The pinned Ollama v0.40.3 source resolves Opus's external question: its
   llama-server path adds cached and evaluated tokens to produce the public total, then
   reports the cached portion separately. See the [runner count and terminal response](https://github.com/ollama/ollama/blob/v0.40.3/llm/llama_server.go#L1488-L1499)
   and [chat response mapping](https://github.com/ollama/ollama/blob/v0.40.3/llm/llama_server.go#L1977-L1988).
   Adding the cached field again would double-count it. The diagnostic retains exact-body
   repeated-input controls to check the installed runtime; a mismatch blocks qualification.
4. Passive evidence is confirmed by real-protocol observation-off/on controls over request
   bodies, products, ordering, and accounted usage. Timing equality is not claimed.
5. Attribution and joins are confirmed. Admission measurements remain separate from inference,
   terminal refusals retain the last measured request, and unknown/mixed origins remain explicit.
6. The Study boundary is confirmed. Nominal capacity/deadline errors preserve their causes,
   explicit attribution wins, and absent settings preserve earlier serialized identity.
7. Provider measurements are confirmed. Raw timing fields retain their units, invalidity, and
   absence. Their nested durations are not reported as additive wall time.
8. Classifier and checkpoint observations are confirmed. Cache identity, judgment bytes, and
   execution order remain intact. Public snapshots are not private Ledger restore points.
9. Proof discrimination is confirmed by the fixed-value, changed-input, and observation controls,
   with the executed image mutation providing an additional failing control.

The source-level cache-count evidence answers a different question from the wrapper tests.
No code defect was substantiated, so no cache-count patch is admitted. The unmeasured
provenance-set cost stays advisory and enters no required fix.

## Retain evidence limits

The returned reports remain immutable under tmp/units. The citation checker rejected the
original Opus locations for message measurement and Study failure conversion. Root discarded
those locations and checked the corrected source directly: src/core/agents/helpers.ts:177-192
and ../study/src/core/engines/helpers.ts:22-34. A separate Astra lookup sampled the other
claims and confirmed their source support, including Classifier.ts and the Ollama tests.
Its additional corrected locations are studies/memory/helpers.ts:78-82 for revision,
studies/memory/helpers.ts:40-47 for nominal WINDOW translation, and
studies/memory/helpers.ts:102-126 for provenance. No returned verdict was edited.

Required tree-wide verification follows this ruling. The accepted diagnostic fitter has
passed its strict scoped TypeScript check and its fixed-data selftest, including forged custody,
ambiguous joins, underprediction, and missing pressure controls. Independent source checking
found its manifest, attempt, seal, and event joins aligned with the staged runtime. These
controls do not predict that the live calibration will qualify.

Records remains the sealed candidate-3 execution. Only Compaction may be rerun. No recovered
completion replaces a strict failure; no model-visible budget or rescue treatment is enabled.

VERDICT: PASS
