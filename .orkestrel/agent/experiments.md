# Prospective model and records studies

Researched on 2026-10-14 at the user's request, alongside study implementation and the frozen capacity comparison. This plan authorizes no automatic model download or GPU execution while that comparison owns the host. It changes no existing prompt, judge, strategy, manifest, or result.

## Decisions

Keep judge selection separate from agent selection. The current Mica adapter reads one generated token's log probabilities through Ollama's generate endpoint. The package also has a native System One adapter accepting several typed questions for one state. A change from Mica to a native decision model changes both model and adapter; retain both identities and do not call that a model-only contrast.

Shortlist Kev-4B Q4 as the first concrete native decision challenger, with d1-3B and Wald-4B conditional on proving their exact serving path. Kev's official GGUF card lists a 3.03 GB Q4_K_M artifact and identifies the System One endpoint; llama.cpp 0.6.0 lists native Kev support. That establishes an available artifact and runtime seam, not accuracy, local speed, or 6 GB fit. Its weight file plus the current 4B agent's weights exceeds 6 GB before cache and runtime buffers, so simultaneous GPU residency must not be assumed. [Kev GGUF](https://huggingface.co/ggml-org/Kev-4B-GGUF), [llama.cpp release](https://github.com/ggml-org/llama.cpp/releases/tag/v0.6.0).

Retain Mica as the measured judge reference. Julia-1 is a possible CPU floor for narrow classification. Defer Clef Flash on this host: its listed Q4 artifact is larger than the GPU's physical VRAM before runtime allocations. d1 and Wald remain candidates, not deployment recommendations; license, mode, runtime and calibration differ. The research report records primary sources and unresolved compatibility details. Do not turn a generated JSON answer into a claimed calibrated decision distribution.

Keep the pinned Qwen 2B/4B agents as references. Llama 3.2 3B is an independently sourced family comparator from the research, not a claim of best current performance. Model discovery is not exhaustive. Freeze actual bytes and runtime options for a prospective comparison; mutable registry tags and publisher benchmark scores cannot replace host qualification.

## Records implementation candidates

| Candidate | Exact target | Acceptance evidence |
| --- | --- | --- |
| Same-state topic batching | Classifier topic loop after category/quiet gating; preserve request-topic filters | Logical questions and per-question distributions/refusals, HTTP calls, prompt/completion usage, full-horizon task quality |
| Request-level judge usage | Multi-question resolve currently omits per-record aggregate usage | Every request charged once, unknown usage retained, no invented per-question division |
| Exact identity reuse | Question bytes, state bytes, ordered sources, complete judge behavior identity | Exact-hit/no-call control; one-byte, source-order and model/config changes force misses |
| Arrival filing | Explicit awaitable filing and conversation revision barrier | Total work separately from response wait; late corrections, aborts and duplicate in-flight work accounted |
| Retrieval diagnostics | Filed relations, selected source lines, then generated answer | Current/stale/wrong-entity exposure, omitted obligations, supported correction links, source provenance |

The first code target is topic grouping plus truthful aggregate usage, after the study tooling and frozen comparison close. The transport already supports grouped questions, but the existing Mica adapter intentionally sends each question separately. Grouping alone therefore does not establish a transport saving for the current judge. Use a native batching adapter for that contrast and preserve an independent model/adapter baseline.

Do not batch conditional phases into one unconditional request. Category results decide quiet skipping; amendment results decide whether supersession is asked. Missing classifications remain unknown. Keep repeat lookup stopping, answer-pass error propagation, and the complete request-byte baseline. A changed wire recording is a named prospective baseline, never an overwrite of historical evidence.

Moving filing earlier can shorten response wait only when there is independent work to overlap. It does not inherently reduce calls or tokens. Current conversation addition is synchronous and has no arrival event, and judgment resolution has no in-flight coalescing. An emitter callback alone would not establish a completion barrier. Preserve one completed revision for selection and invalidate or re-file when that revision changes.

Measure memory before generation as well as after it. LongMemEval separates extraction, multi-session reasoning, time, updates and abstention. Recent memory research also distinguishes stored-state validity, identity assignment and the context actually exposed to the model. These are useful measurement axes; their reported scores do not transfer to this ledger. Temporal graph provenance is a design reference, not evidence that adding a graph store will improve our records. [LongMemEval](https://arxiv.org/abs/2410.10813), [memory failure study](https://arxiv.org/abs/2610.10265), [Zep provenance](https://www.getzep.com/blog/how-zep-tracks-provenance-in-agent-memory/).

## Execution order

Start with offline protocol/shape checks and CPU mechanism studies. Then qualify each prospective local artifact on this host with measured peak memory, cold/warm latency, actual context, output bounds and cancellation. Run model work serially after the current comparison releases the GPU.

Use a public development fixture for threshold calibration and keep a separately frozen evaluation fixture. Include negation, quoted instructions, unclear categories, partial corrections, unrelated entities sharing identifiers, full replacements, unknown relations, and abstention. For probability decisions report calibration and class-specific errors, especially false supersessions; label confidence is not correctness.

Run baseline strategy with baseline judge, grouped strategy with that same judge/adapter where supported, then baseline strategy with a candidate judge/adapter. Run their combination only after the isolated readings exist. Fresh judgment stores prevent one arm satisfying another's questions. Retain request count, logical question count, usage, loading time, serving time, task coverage, critical violations and product acceptance independently. Use the declared horizon; common-served results are secondary. Repeat trajectories with declared order before making stability claims.

Predeclare budgets and termination predicates for each new study. Output/context exhaustion, request deadlines and transport faults stop promptly with attributable evidence; ordinary unsuccessful work remains a semantic result. No automatic retry or escalating model ladder follows a failed qualification.

## Research custody

Luna max researched the model attachment and independently verified primary model/runtime sources in `tmp/units/system-models-report.md`. A separate Luna max lane mapped records code and primary memory research in `tmp/units/records-research-report.md`. Root checked the judge adapter, classifier stages, current interfaces, Kev artifact and llama.cpp release directly. The records reader accidentally issued an early broad campaign search; its report excludes those matches, and that lane will not perform blind labeling. New fixtures must not be derived from encountered held-out grading material.

The source reports are preserved beside this plan as research evidence. They are proposals and measurements from named external sources, not local benchmark results. No new model was downloaded or executed for this research.
