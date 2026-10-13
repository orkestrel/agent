# Qwen 4B preflight cost clarification

The accepted resource preflight's request ledger records fresh transport usage. Its per-goal usage includes replayed judge-cache usage and cannot be read as fresh inference cost. This supplement clarifies [the immutable preflight report](resumption-l7-q4-feasibility.md) without changing that report or any run artifact.

Native verifier Luna traced the row to `Ledger.respond` usage and the judge cache's replay of historical usage. The retained run records 756 judge-cache hits and no misses or judge-role network requests. Its request ledger has 43 agent requests and 24 flush requests. Those requests report 79563 prompt and 2560 completion tokens, totaling 82123. Flush accounts for 528 prompt and 24 completion tokens within that total.

The separate 172726-token row sum includes replayed selection/judge usage and excludes the separate flush operation. Neither that sum nor its difference from actual request usage is an additional fresh inference charge. No monetary tariff is recorded.

The source trace is `Driver.ts` at the row usage assignment and the shared request recorder, `JudgeCache.ts` at its cache-hit and replay paths, and the vendored agent at selection-usage accumulation and ledger response accumulation. These files remain bound to the accepted build manifest `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`.
