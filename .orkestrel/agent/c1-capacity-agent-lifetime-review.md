# Agent lifetime correction review

**CONFIRMED by source inspection:** change the agent orchestration timeout in `Trial.#assemble` and the `PlainArm` construction timeout in `Trial.#build` to `manifest.limits.goal`. Keep `Trial.#createProvider` at `manifest.timeout`. This is a warranted correction to the accepted request-versus-goal contract. Runtime proof, mutation control, and scoped gates remain pending; this ruling does not accept the implementation.

The current `agent: { ..., timeout: manifest.timeout }` at `.orkestrel/agent/instruments/harness-capacity/bench5/continuous/Trial.ts:324` reaches the ledger's internal `createAgent` unchanged. The `PlainArm` timeout at `.orkestrel/agent/instruments/harness-capacity/bench5/continuous/Trial.ts:382` similarly reaches `createAgent` through `.orkestrel/agent/instruments/harness-capacity/bench5/continuous/arms/PlainArm.ts:55`.

The pinned Agent starts its timeout once in `stream`, before selection and before pumping the whole generation loop. That timer remains active across selection/judge work, compaction, provider calls, and tool dispatch, and is cleared when the pump ends. It is not reset for each provider request. See `.orkestrel/agent/instruments/harness-capacity/vendor/agent-0.0.30-trimmed/index.js:4646` and `.orkestrel/agent/instruments/harness-capacity/vendor/agent-0.0.30-trimmed/index.js:4718`. Thus the current 180000 ms value can abort a valid multi-call generation whose individual calls are each below 180000 ms but whose cumulative generation exceeds it, despite the 900000 ms goal allowance.

For the ledger, the precise scope is one generation pass, not necessarily its entire `respond`. `Ledger.respond` can invoke a recovery answer pass with a fresh Agent timer after an unfinished initial pass; see `.orkestrel/agent/instruments/harness-capacity/vendor/agent-0.0.30-trimmed/index.js:6914`. This distinction does not justify the short timer: either pass can contain multiple calls, and the harness must not impose the request deadline over their cumulative work.

Using `manifest.limits.goal` at those orchestration sites does not grant a fresh full goal allowance after flush or for a recovery pass. `Trial.#begin` starts the authoritative absolute goal timer before advance and flush. Expiration calls `#terminate`, aborting the shared signal passed into `arm.respond` and into model transports. That earlier timer bounds all passes and auxiliary work together. The internal agent timer becomes a redundant bound no shorter than the intended total lifetime.

Adjacent behavior that must remain:

- Each individual decision and summary provider call still uses `manifest.timeout`; a single slow request must terminate even when substantial goal time remains.
- The recorder's decision/summary request deadline remains `manifest.timeout`, and calibration/flush/judge metadata deadlines retain their existing separate limits.
- A goal still expires from before advance/flush, including cumulative selection, tool, recovery, summary, and provider work. Neither a new tool turn nor a recovery pass resets that absolute deadline.
- Trajectory and series bounds, hard calls/tokens, partial-result rejection, sticky operational failure, and absence of later sends remain in force.
- Calibration calls use the provider directly through the ledger calibration path; changing the internal Agent timeout does not widen their metadata request bound.

The proposed real cumulative-call control is appropriate: use a lookup-producing first response and a final second response, each delayed comfortably below the configured request timeout; make their combined delay exceed that timeout while remaining comfortably below the goal bound. Assert both actual server requests were reached, a nonpartial successful product, and no operational terminal. Exercise both records and plain-agent construction sites. Restoring the old request-sized Agent timeout at each site must fail its corresponding control. Also retain a stalled single-call control and a cumulative goal-exhaustion control so the correction cannot pass by removing cancellation altogether. These controls should use short real durations with enough margin for fixture overhead, rather than real 180-second waits.

No source edits, builds, tests, or live calls were performed for this ruling. The earlier review verdict and deadline exposure remain unchanged.
