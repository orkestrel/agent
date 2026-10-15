# Production-informed Compaction baseline

Decision on 2026-10-15: withdraw the unlaunched `sections: 2` treatment. Replace it with
rolling text compaction: summarize the previous recap and eligible older messages together,
then replace that covered history with the new recap. Keep the protected current exchange
verbatim. This is a portable text baseline informed by vendor documentation, not a replica
of Claude Code, Codex or Cursor.

## Evidence

Claude Code documents clearing older tool output before summarizing conversation history.
Its published description preserves requests and important details but does not expose its
exact prompt or retention algorithm. See
[How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up).

Anthropic's API documents repeated compaction explicitly: the next summary consumes the
previous summary and subsequent messages; only the newest summary remains. Its separate
retention recipe keeps recent turns verbatim and avoids splitting tool exchanges. These
are corroborating mechanisms, not proof of Claude Code's exact implementation. See
[On-demand compaction](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)
and [Keeping recent turns](https://platform.claude.com/docs/en/build-with-claude/compaction-keep-recent-turns).

Codex documents replacing earlier turns with a concise summary and exposes a configurable
automatic token threshold. OpenAI's Responses API also offers opaque encrypted compaction
items. That native representation cannot be reproduced by the ordinary Qwen summarizer.
See [Codex commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli),
[Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference), and
[OpenAI compaction](https://developers.openai.com/api/docs/guides/compaction).

Cursor describes condensing active context and continuing from the summary and conversation
state. Composer is trained with compaction in its trajectories. Cursor also documents access
to a transcript file for retrieving omitted details. Those model and retrieval capabilities
are distinct from text summarization. See
[Composer self-summarization](https://cursor.com/blog/self-summarization) and
[Dynamic context discovery](https://cursor.com/blog/dynamic-context-discovery).

No reviewed source establishes the proposed fixed two-section, two-pass policy. The shared
portable replacement pattern is an inference from these sources. Exact vendor prompts,
thresholds, native representations and quality are not established by this study.

## Mechanism and comparison

Add an opt-in `rolling` conversation behavior with its first consumer in the memory study.
Each fold makes one summary call over framed prior recaps and the eligible live slice. Commit
the replacement only after success and unchanged-input checks. Preserve all original messages
for inspection, preserve tool boundaries and the current exchange, and serialize folds. Refuse
combining rolling behavior with the existing sections cap. No eligible live slice means no call.

The study replaces the withdrawn draft setting with `rolling: true` for the new Compaction
treatment. Preserve the Qwen model, instructions, tools, gauge, room and output limits, thinking
setting, and first-failure policy. Record summary calls, context components, measured usage,
truncation signals and failures. Add no retrieval, retry, estimator refit or silent rescue.
The summary prompt remains the existing fixed prompt; equivalence to vendor prompts is not claimed.

Historical evidence stays immutable: Records completed 96 goals; the room Compaction treatment
completed 37, attempted and failed goal 38, and left 58 unexecuted. Its eleven accumulated recaps
occupied 80.739% of its estimated request. That result describes append-only compaction under
the frozen settings; it does not establish a verdict against production compaction generally.
Records is never rerun or replayed. The rolling successor needs a new frozen identity and finite
deadline. Build its changed Agent runtime separately so historical runtime inventories remain valid.

## Review and state

Actual Opus 5.5 planner session `70511d04-e265-47a3-9fd5-ab2e0359c50f` completed exit 0,
uncapped, in 148642 ms. It independently rejected the cap policy after receiving the primary-source
distillate and inspected the local mechanism. Root accepted the design recommendation, not an
implementation. Its shortened Agent citation was checked against the actual core Agent file.

The optional cap draft passed 112 focused fixture tests and a typecheck but was never accepted,
frozen or executed. Root withdrew its source edits and retained the patch under temporary custody.
Its draft stage, freeze, launch and reader scripts must never be executed.

## Implementation accepted on 2026-10-15

Actual Sonnet session `c6c2bbba-5e76-415a-9b93-4b17ff68eaed` implemented the selected shape
and the prescribed proof additions. Actual Opus reviewer session
`25cb5cf7-fa18-4982-bf04-7b88b9bca2ba` confirmed the contract and risky seams; its remaining
claim concerned unexecuted consumer proofs. Root closed that claim with the isolated build,
111 focused consumer tests and the full service project: 180 passed. Core mutations omitting
prior recaps and retaining old sections each failed three assertions. Disabling session
forwarding failed the intended consumer assertion. All mutations were restored.

Verification retained 1474 core, 119 policy, 229 config and 161 setup passes, with two existing
skips. Guide parity failed before its documentation correction and then passed 137 tests.
The isolated full-service proof initially lacked checkout fixtures; after supplying and
removing those temporary inputs, its remaining failure was an order-dependent topology
expectation. Canonical-path ordering fixed that assertion without changing runtime behavior.
Format, lint, TypeScript and isolated build passed. The full-service wrapper restored its
temporary test copy and removed its dependency junction and workload fixture.

Root dist and installed runtimes retain their historical bytes. The successor uses separately
built Agent and copied Ollama siblings under `tmp/studies/compaction-rolling-runtime`. Native
Astra reviewed the launch bindings; the daemon wrapper now permits dispatcher-owned logs
and runs only under the canonical four-hour cap. The independent reader passed 52 offline
controls and discloses that replacement recap IDs are observed in the next Agent context,
not emitted by the summary-completion event.

Accept the implementation and the qualification protocol, not a future successful result.
The prospective Compaction-only attempt retains 96 goals, zero retries, strict failures,
the existing room/gauge, and a 9662835-ms trial/series budget. Its immutable outer deadline
adds 60000 ms cleanup and 120000 ms launch margin. Repeated nonempty reducing folds are
required to qualify; completed operations alone do not establish quality or vendor equivalence.
`handoff.md` carries the subsequent frozen identity and actual launch state.
