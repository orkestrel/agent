# Browser and server boundary design

Agent decides trust by inlet, and that rule holds only inside the process that builds the request. This design covers the user's request and rulings, the four placements and their trust, the ranked consumer mistakes and their remedies, run binding, relay ownership, the page wire with its live `ask` frames, the stored-role refusal, the units that ship them in `@orkestrel/ndjson` 0.0.15 and Agent 0.0.35 (O34 to O48), the deferred items, and the 0.0.35 notes this design adds. Source locations name a symbol and its file as of `a7f4fe9f`, except where a line names `ad866d2b`, and a `path:line` reads at that commit. The Orchestrator's rulings live in `plan.md` § Rulings: O39 on the live `ask` wire, O40 on rc-u13, O41 on rc-u14, O42 on rc-u15, O43 on rc-u16, O44 on the sequence, O45 on the advertised-name guard, O46 on the review of 2026-11-01 (§ Review), O47 on the parser re-evaluation and the release route, and O48 on the intuitiveness review and the brief refresh of 2026-11-01; O47 and the user's Q18 and Q19 close § Review's later rounds, and O48 and the user's Q20 to Q22 close the intuitiveness review. Deferrals point at `plan.md` § Deferred.

## Request and rulings

The user's request of 2026-10-31 (O34): "let's also look at how the system prompt is handled between browser and server ... I don't want to drift into application code but I want to make sure we're not opening up ways for consumers to make mistakes, since my idea is for agent to be used in either side and often on both sides, the browser and server."

The user's rulings, verbatim (`plan.md` § Decisions):

| Decision | Question | Ruling |
| --- | --- | --- |
| Q13, stored role | whether 0.0.35 refuses a stored `system` role at every ingress (D33) | "Refuse it now (Recommended)" |
| Q13, shared agent | whether one `Agent` shared across concurrent requests is guarded or only documented | "Let's think this one through, I feel that might be the point is to be able to switch in and out on a dime, but if it means a security issue or if it weakens the agent or makes it brittle instead of helping with freshness then think it through" |
| Q13, relay | who owns the system turn a relay forwards | "Not sure but I would say the server should always win but if the user wants the server to accept a system prompt then let them but explicitly otherwise the page to server prompt can either silently drop or explicitly error out, but the point is to be explicit between them." |
| Q13, placement | whether the page-to-Node placement is named with a wire contract | "Name it and ship a contract" |
| Q14, run binding | whether the reconciled run binding ships in 0.0.35 | "Approve as designed (Recommended)" |
| Q14, relay ownership | whether the reconciled relay ownership ships in 0.0.35 | "Approve as designed (Recommended)" |
| Q14, page wire | whether the page wire ships with `ask` frames | "Include ask frames now" |
| Q15, advertised-name guard | whether the advertised-name guard covers every call, not only an asked one (D57) | "Push study and guard against me up calls", read as "made-up calls", a reading the Orchestrator confirmed with the user |
| Q20, run-owned user turn | whether a run appends its own user turn through `AgentRunOptions.prompt`, so both server fences drop `thread.add`, `startRun`, and `thread.remove` (D64) | "Add the prompt option (Recommended)" |

- Three read-only consultation rounds produced the substance: the first at `99574d8b` (the ranked mistakes and remedies R1 to R6), the second at `07940894` (topics A to C), and the third at `c1306929` (the live `ask` wire). The Orchestrator's rulings O39 to O44 close the third round, and O45 widens its advertised-name guard on Q15.
- The first round's question on the shared agent became the second round's run binding, because the user kept switching on a dime unless it weakens the agent or makes it brittle, and binding keeps the switch while closing the cross-write (O34).
- The relay ruling chose the explicit error: a refused member is answered with status 422, never dropped (§ Relay ownership).
- "Include ask frames now" departs from the second round, which deferred `ask` frames with D21. The third round designed the frame and its inbound answer; the live `ask` wire is not D21, which pauses, persists, and resumes a decision that outlives the process or the run `timeout` (O36).

### Review

A fourth read-only consultation reviewed the design on 2026-11-01 over the records at `328df93c` and the rc-u13 to rc-u16 briefs, and four independent refuters tested its changes over `ad866d2b`. The consultation found the chosen shapes minimal and the closed defects closed, named one hazard no record held (both server fences look up a client-facing thread id with no principal scope), and proposed nine changes. O46 rules on them, and the user ruled the relay tool default and the default parser on 2026-11-01 (`plan.md` § Decisions, Q16 and Q17).

| Change | Consultation | Refuter | Outcome |
| --- | --- | --- | --- |
| Threads held per principal in both server fences | adopt | holds with amendments: one `Agent` per principal, because a per-request `Agent` leaves the per-agent `'CONCURRENCY'` guard unreachable; a durable store keyed by principal, because `open` and `save` key snapshots by conversation id alone; two transcription cases | adopted as amended (O46; § Run binding, § Page wire) |
| Remove the user turn a refused run leaves | adopt, on `'CONCURRENCY'` | holds with amendment: remove on any synchronous throw, and never on an asynchronous rejection, because assistant or tool turns can follow by then | adopted as amended (O46; § Run binding); a run that appends its own user turn is D64 |
| A loop-minted ask id, with an `Approver` reduced to `ask` and `answer` | adopt | refuted: it frames asks nothing waits on, turns a redacting wrapper into a disclosure, and turns D58 into a race | rejected (§ Page wire, Rejected); the approver becomes a required parameter of `agentStreamToFrames` (O46) |
| Relay tool definitions refused only when the server declares `definitions` | adopt | refuted: a page tool description would reach the operator's `system` turn with no opt-in, and the change reverses the design the user approved (Q14); independently, the consumer migration line names only `system.accept`, though Ollama's page gate and mcp's fixture send page tools | rejected by the user, "Keep refusing (Recommended)" (Q16); § Relay ownership stands, and the migration line names `tools: { accept: true }` or declared `tools.definitions` beside `system.accept` (§ Breaking) |
| An NDJSON parser in Agent, with `RelayProviderOptions.parser` optional | adopt | holds with amendment: the `RelayProvider` example names `@orkestrel/ndjson` as consumer code, not as a missing declaration; `@orkestrel/ndjson` skips a malformed line where Agent's relay framing refuses it with `ProviderError` `'PROTOCOL'`, so the choice needs that difference stated; the proposed names collide with a `tests/setup.ts` export | the user chose "Strict mode in ndjson (Recommended)" (Q17): rc-nd1 adds an opt-in strict mode to `@orkestrel/ndjson`, and after its 0.0.15 release rc-u17 makes `RelayProviderOptions.parser` optional with the strict parser as its default; rc-u15 stays as ruled |
| rc-u14's ledger refusal tested by conversation identity | adopt | not tested | adopted (O46; § Run binding) |
| A deferral for relay `options` and history, with one guide sentence | adopt | not tested | D65 and an rc-d1 sentence (O46) |
| The third round's ask-only guard rulings marked superseded | adopt | not tested | records only: O45 supersedes them (O46) |
| No default run `timeout` | keep | not tested | kept (O46; § Page wire, Opened or kept) |

A read-only consultation re-evaluated the parser design and the drafted rc-nd1 and rc-u17 briefs on 2026-11-01, over `ad866d2b` and `@orkestrel/ndjson` at `699230c`, on three topics: strict mode and its release order (A), the ledger tool residual (B), and the user turn a run leaves as the thread's tail (C). It found the decisions sound in substance and proposed three questions for the user. Independent refuters tested every proposal. O47 adopts the refuter's amendments of A1 to A3, A5, A6, the first half of A7, C1, and C2, and replaces A4 with the late route. The user ruled two of the questions: B1 and B2 on Q18, deferred as D66, which records B2's mechanism without adopting it, and A7's question on Ollama's framing on Q19. The third, an interim Ollama release, rested on A4's measurement; A4 was refuted, so it never reached the user, and O47's late route settles the release route.

| Proposal | Consultation | Refuter | Outcome |
| --- | --- | --- | --- |
| A1, the strict surface | keep the drafted surface: `NDJSONParserOptions` with `strict`, `NDJSONError` with `code` `'SYNTAX'` or `'RECORD'` and a fixed message, `isNDJSONError` by brand, blank lines skipped, no `flush`, and the refusing call leaving the parser as `clear()` leaves it | holds with amendments: the runner lane runs every test, mutation, and gate, and the writer keeps its owned-file format, non-fix lint, and scoped type checks; the clearing rationale is that a refusal ends the stream, because keeping the partial line could join it to a later chunk as a record that never crossed the wire; the fixed messages cite `tenets.md` § Trust; the `strict` sentence sits in the options interface's `@remarks` | adopted as amended (O47; rc-nd1) |
| A2, trimming | strict mode trims each line as the default path does; no no-trim strict variant | holds with amendments: the decoder already strips a byte-order mark at byte 0, so the change is Unicode space around a line inside the stream; rc-nd1's case iterates the whole `String.prototype.trim` set written as escapes; rc-u17's case places the trimmed line after an earlier complete line | adopted as amended (O47; rc-nd1, rc-u17) |
| A3, the `'PROTOCOL'` translation | the engine translates every framing throw at its two parser call sites, so `AgentProvider.ts` imports nothing from `@orkestrel/ndjson` | holds with amendments: the translation rethrows unchanged when the run's combined signal aborted or the throw is already a provider error, so a refusal that races a cancel stays the abort's `cause`; the class `@remarks` and the guide's `'PROTOCOL'` bullet state the framing seam | adopted as amended (O47; rc-u17; § Breaking) |
| A4, the release order | measure `study check` under a top-level ndjson 0.0.15, and publish an interim Ollama release if it refuses | refuted: `study check` excludes the provider entry, so it cannot see the hazard; a Study command that loads a profile's Ollama provider entry refuses the nested ndjson 0.0.14 outside the profile roots | replaced by the late route (O47; the following table) |
| A5, the pin route | the pin route packs ndjson's `Release 0.0.15` commit, never rc-nd1's acceptance commit | holds with amendment: a changed acceptance criterion goes into the brief before launch | adopted as amended (O47; rc-u17) |
| A6, the order against rc-u16 | rc-u17 launches after rc-u15 and rc-u16 commit and owns the page fence's framing swap | holds with amendments: the swap is specified (§ Page wire, Route pattern), with a transcription case and a mutation; the launch-HEAD census gains the page fence's framing | adopted as amended (O47; rc-u17) |
| A7, Ollama at its wave visit | Ollama drops the lenient parser from its relay fence; whether `OllamaProvider.frame` opts into strict mode is the user's question | holds with amendments: the migration names every Ollama site that passes the lenient factory and keeps `'ndjson'` in the page import map; strict framing catches neither the daemon's in-band `{"error": ...}` record nor a stream cut before `done` | adopted as amended (O47; § Breaking); the user chose strict framing, "Yes, strict (Recommended)" (`plan.md` § Decisions, Q19) |
| B1, the ledger tool residual | defer it as D66, closed through `ToolContext.caller` | holds with amendments: D28 concerns `AuthorityContext`, which a tool-context member never reaches, so D28 keeps its own row; the agent-wide listener residual stays with D53; `caller` would hand the writable thread to every tool, so the carrier is chosen at the trigger | deferred as D66 by the user, "Defer and document (Recommended)" (`plan.md` § Decisions, Q18; § Deferred) |
| B2, a refusal keyed on an active `respond` call | reject it as a half-closure | holds with amendment: the run's abort signal reaches the selection handler and every tool handler, so the tool path closes with no added `ToolContext` member | rejected; the user deferred the tool path as D66, which records the signal mechanism without adopting it (Q18; § Deferred) |
| C1, the kept tail | keep both fences as ruled, and prove and document the kept turn | holds with amendments: the proof asserts that the next request carries both user turns; rc-u14's fence has no abort path, so its case uses a provider that rejects before the first append; each sentence lands in the unit that runs its case | adopted as amended (O47): a stated limit with an executed proof (§ Run binding, § Page wire) |
| C2, a tail check | reject a tail check in the fences | holds with amendment: the rejection covers the check on both exits, not a catch-only form | adopted (O47; § Run binding) |

Two independent refuters then tested the route that replaced A4 and the signal mechanism that B2 found. O47 rules the route, and the user ruled the ledger question on Q18 and Ollama's strict framing on Q19 (`plan.md` § Decisions).

| Change | Refuter | Outcome |
| --- | --- | --- |
| rc-u17 runs late, with no interim Ollama or Study release; ndjson 0.0.15 publishes after rc-nd1, and no consumer moves, because every fleet range on ndjson stays under 0.0.15 | holds with amendments: late is defined by what loads the Ollama provider entry, so rc-u17 launches after the campaign's last Study command that loads it and after every unit whose acceptance names `test:studies`, immediately before rc-d1 in S8; `test:studies` fails exactly one case in the window (§ Breaking); criterion 0 lists one nested ndjson 0.0.14 under `@orkestrel/ollama` and nothing else; mcp's distribution composition moves its ndjson range at the wave | adopted as amended (O47; § Breaking) |
| rc-u14's ledger gates `recall` and lookups on the run signals its selection handler records for `ledger.conversation` | holds with amendments: recording keys on conversation identity, not on `respond` ownership, in a `WeakSet` with no drop; the gate comes first in both tools; a run with no selection, or under a host scope that replaces `select`, loses those tools | deferred as D66 with this mechanism and `ToolContext.caller` (Q18; § Deferred); rc-u14 corrects its residual sentence to name D66 (§ Run binding) |

## Placements

`guides/agent.md` § Placement proofs (`guides/agent.md:2972`) names three placements. The fourth is named "Page to Node agent" (Q13); rc-u16 writes its bullet (O43).

- **Node alone.** The agent, provider, and tools run in Node.
- **Page alone.** The agent, an in-page provider, and page tools run in the page.
- **Page to Node relay.** The agent, `RelayProvider`, and page tools run in the page; `createRelay` and the upstream provider run in Node. A tool handler runs where its registry lives (`guides/agent.md:706`).
- **Page to Node agent.** The agent, its provider, its tools, its Authority, and its approver run in Node; the page renders `AgentFrame` values and sends one `AgentPrompt` per run and one `AgentAnswer` per ask (§ Page wire).

The trust each placement carries after rc-u13 to rc-u16:

| Placement | Writes the `system` turn, instructions, skills, tool definitions | Runs Authority and `ask` | What the server enforces |
| --- | --- | --- | --- |
| Node alone | host code in Node | Node | everything |
| Page alone | the page, so the page's own user | the page | nothing; the risks left are injected text and other scripts on the page |
| Page to Node relay | the server for the `system` turn and every tool definition it declares (rc-u15); the page only where `RelayOptions.system.accept` or `RelayOptions.tools.accept` admits it | the page; page Authority protects the user from the model, never the server from the user | `authorize`, `limit`, the upstream provider, and the head and tool policy of rc-u15 |
| Page to Node agent | host code in Node; the page writes one user turn | Node; the page answers each `ask` frame through an authenticated answer route (rc-u16) | everything; the page sends `AgentPrompt` and `AgentAnswer` only |

- The rule "the `system` message carries host-authored text only" (`designs/layout.md` § Boundary) holds only inside the process that builds the request. In the relay placement that process is the page, so the relay server receives whatever the bearer sends until rc-u15 lets the server own the head.
- `ask` and the `consequential` floor run in the loop's own process (`designs/authority.md` § Loop placement). In the relay placement a page tool that calls a server API is gated by the page; the server authorizes that API call as the user.
- System text, instructions, and skill bodies are not secret and are no security control: OWASP classes a system prompt as neither (see [LLM07:2025 System Prompt Leakage](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/)).
- rc-d1 writes the per-placement guide table naming which side writes each inlet (system text, instructions, the skill index and bodies, tool definitions, deny reasons, memos, workspace, the conversation, tool results) and which side enforces it (R5). The table binds the thread id to the principal and keys a durable conversation store by principal (O46), and it says that a relay forwards `options` and the history under the operator's credential (D65).

## Mistakes

The first round ranked ten consumer mistakes. Every evidence cell names a symbol and file as of `a7f4fe9f`.

| Rank | Mistake | Evidence | Severity | Disposition |
| --- | --- | --- | --- | --- |
| 1 | Client JSON reaches a stored-message inlet with a privileged role: `add`, the job seed, a snapshot, and a selection accept `role: 'system'`, and a stored one is sent in place as a second `system` message that is not first | `Conversation#create` copies `input.role` unchecked (`src/core/conversations/Conversation.ts`); `MessageInput.role: MessageRole` (`src/core/types.ts:64`) with `'system'` in `MESSAGE_ROLES` (`src/core/constants.ts:6`); the job seed adds through `agent.context.messages.add` (`src/core/agents/AgentRegistry.ts:91`); `AgentContext#build` folds `selection?.messages` as given; a fabricated `tool` message files as `fact` (`src/core/ledgers/Ledger.ts:482`); Qwen 3.5's own chat template raises on a `system` message that is not first (`designs/layout.md` § Refused) | high on a server-run agent | rc-u13 (R1, § Stored roles) |
| 2 | One `Agent` shared across concurrent requests cross-writes threads: the loop appends through the live `messages` getter, which follows `switch`, so a second request's `switch` during the first's provider await stores the first's reply in the second's thread | appends at `src/core/agents/Agent.ts:522`, `:541`, `:559` through `AgentContext#messages` (`src/core/contexts/AgentContext.ts:151`); the fold and the rebuild read the active conversation; the guide calls the shared agent "the real app pattern" | high on a server; silent | rc-u14 (§ Run binding; R2 replaced) |
| 3 | A client-held snapshot hydrates as trusted state: sections and messages were seated unchecked, only judgments re-validated, and a stored judgment is reused as the judge's answer | the `Conversation` constructor; `isMessage` admits `'system'`; `Classifier#read` reuses a matching stored judgment; only `DatabaseConversationStore#get` runs the guard (`src/core/conversations/stores/DatabaseConversationStore.ts:95`) | high where snapshots cross a client | R3 in rc-u4 (`805075f5`) and `c1306929`; the validating constructor in rc-u13 |
| 4 | The relay forwards the page-authored head as if the server owned it | `createRelay` runs `authorize`, the byte limit, and `providerRequestContract.is`, then `RelayStream` (`src/core/providers/factories.ts:63`); `RelayStream` forwards `messages`, `tools`, and `options` after `stripThinking` only; `RelayOptions` has no member that sees the parsed body (`src/core/providers/types.ts:305`); the qwen3.5 renderer writes tool definitions inside the `system` turn (`designs/layout.md` § Boundary) | medium: model use under the operator's credential, not escalation | rc-u15 (§ Relay ownership) |
| 5 | Jobs carry policy from whoever enqueues them | `AgentJobInput` carries `system`, `messages`, `tools`, `authority`, and `children` with no depth bound (`src/core/agents/types.ts`, `src/core/agents/AgentFanout.ts`); the registry resolves names as given | medium | the stored role in a job seed: rc-u13; the job guard: D56 |
| 6 | Page Authority mistaken for server authorization | `ask` and the floor run in the loop's process (`Agent#authorize`, `Agent#approve` in `src/core/agents/Agent.ts`) | medium; guide-only | rc-d1 (R5); the Page to Node agent placement runs Authority on the server (rc-u16) |
| 7 | Untrusted text routed into a host inlet, a deny `reason` included | `AgentOptions.system`, `instructions`, `workspaces` (`src/core/agents/types.ts`); a rule's `reason` reaches the model verbatim through `denyCall` (`src/core/agents/helpers.ts:500`) | medium; guide-only | rc-d1 (R5); the record fix O38 (R6) |
| 8 | Raw events and errors forwarded to the page | `error` and `fault` carry `ProviderError` bodies; `select` carries the request copy; `deny` carries the raw model tool name | low to medium | rc-u16's allow-listed frames (§ Page wire); rc-d1 (R5) |
| 9 | Operator text treated as secret | plain strings in `AgentOptions`; OWASP LLM07 | low; guide-only | rc-d1 (R5) |
| 10 | Workspace `path` and `language` render unencoded into the context message; `crypto.randomUUID` needs a secure context (see [MDN `Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)) | `src/core/contexts/helpers.ts`; `Agent`, `Conversation`, and `AgentContext` mint ids with `crypto.randomUUID` | low | secure context: rc-d1 (R5); path encoding rejected |

The remedies and where each landed:

| Remedy | Substance | Where it lands |
| --- | --- | --- |
| R1 | Refuse a stored `system` role at every ingress: `add`, a snapshot hydrate, the job seed, and a selection | rc-u13, on Q13 (O37; § Stored roles) |
| R2 | Fail closed on an active-conversation change during a run | replaced by run binding, which keeps the switch and closes the cross-write (O34; § Run binding) |
| R3 | Hydrate guards in the in-flight units: `isLedgerSnapshot` refuses a mis-roled id; memos hydrate through a guard, and the `MemoOrigin` TSDoc states it is asserted, not verified | rc-u4 (`805075f5`) and rc-u7's follow-up `c1306929`, which refuses a malformed memo snapshot with `ContextError` `'SNAPSHOT'` (O34); the `MemoOrigin` TSDoc in `src/core/contexts/types.ts` carries no asserted-origin sentence as of `a7f4fe9f`, and rc-d1 owns it (`plan.md` § Units, row rc-d1) |
| R4 | A round-trip test between `isMessage` and `messageContract`; snapshots keep the open guard | rc-u13 (O34) |
| R5 | Guide text: the fourth placement, the per-placement inlet table, the shared-agent sentence struck, relay authorship, page Authority's reach, `{ role: 'user', content }` only from a client, client history and snapshots as untrusted input, `agentResultToJSON` and no forwarded `error`, `fault`, or `select`, a secure context | rc-d1 |
| R6 | Correct `designs/authority.md` § Denial notes: a deny rule's `reason` reaches the tool message verbatim, so the host must author every rule reason | O38 |

Rejected in the first round, with the later rulings that superseded a rejection:

- A `HostText` brand: it needs `as` or a public factory, so it proves nothing at runtime.
- Role demotion or coercion of a client `system` message to `user`: `@orkestrel/scaffold` `.claude/rules/documentation.md` § Agent-facing surfaces forbids coercing or silently dropping; refuse with the correction.
- A `./browser` or `./server` face, or runtime host detection: core stays host-independent, and `createRelay` is fetch-standard core.
- Signing, HMAC, sessions, identity in `AuthorityContext`, CORS, or CSRF: `authorize`, `@orkestrel/server`, and middleware own them; D21 and D28 stay deferred.
- Content filters, delimiters, and prompt secrecy: D22 and D31 own the only measured path.
- A declarative `RelayOptions.system` alone: it leaves the tool-definition channel open. Superseded: rc-u15 pairs `RelayOptions.system` with `RelayOptions.tools`, which closes both channels without a hook (§ Relay ownership).
- Rebinding a run to its entry conversation: rejected as a mechanism in favor of R2. Superseded on Q13: run binding is the design (§ Run binding).
- Snapshot messages checked with the exact `messageContract.is`: it refuses snapshots with extra members for no trust gain; R4's round-trip test meets `@orkestrel/scaffold` `.claude/rules/patterns.md` § Validation and contracts.
- Encoding workspace `path` and `language`: the context message is already `user`, and path validity is `@orkestrel/workspace`'s contract.
- A default relay policy, default system text, per-user store keying, and memo partitioning: application policy.

The first round's questions and their outcomes:

| Question | Consultation's recommendation | Outcome |
| --- | --- | --- |
| Open D33 at `add`, hydrate, job seed, and selection | yes | ruled yes (Q13); rc-u13 |
| Guard the shared-agent run, or correct the guide only | both | ruled "think it through" (Q13); run binding, rc-u14 |
| Relay: a `prepare` hook, a head check, or guide only | guide only | settled by the second round's relay ownership, approved (Q14); rc-u15; the hook is D54 (O34) |
| Who owns the `system` turn in the relay | the page | overruled: the server, unless it accepts the page's explicitly (Q13) |
| Name the fourth placement and ship a wire contract | name it, no contract | overruled: "Name it and ship a contract" (Q13); rc-u16 |
| Successor briefs for rc-u4 and rc-u7 carrying R3 | yes | none sent: rc-u4 shipped the mis-roled id refusal under its own brief (`805075f5`), and rc-u7's memo guard landed after its acceptance as `c1306929` (O34) |
| Export `isAgentJobInput` with a depth bound | no, defer | the Orchestrator's ruling as recommended, not put to the user, because it adds no 0.0.35 surface: D56 (O34) |

## Run binding

Topic A, approved as designed (Q14), ships in rc-u14. Keeping "switch on a dime" creates no security issue by itself and stays. The defect is that a run re-reads the active pointer at every write and every fold rebuild, so a switch during a live run moves that run's writes and reads to another thread: brittleness within one principal and a confidentiality defect across principals. Binding leaves freshness untouched: instructions, workspace, scope, and (after rc-u9) memos and skills are read at each `build`.

Types and API:

- `AgentRunOptions.conversation?: ConversationInterface` (`src/core/agents/types.ts:556`). Absent, the run binds the conversation active when `stream()` or `generate()` is called. The run reads its request from that conversation's tail, selects and builds over its `view()`, appends every assistant and tool message to it, and folds it under `window`. A later `switch`, `open`, `remove`, `clear`, or same-id `add` never moves a live run, and the conversation need not be registered.
- `AgentContextInterface.messages` widens to `ConversationInterface` (`src/core/contexts/types.ts:834`); the getter already returns one. Its TSDoc says the pointer is the default for the next run, never a live run's target.
- `AgentContextInterface.select(conversation, request, signal)` (`src/core/contexts/types.ts:888`) takes the conversation first, the parameter order of `SelectionHandler`, and `#check` compares that conversation. Required, never an optional third parameter, because an optional that defaults to the pointer keeps the hazard in the public context API.
- `build(selection?)` is unchanged. On the default path the loop passes `{ messages: conversation.view(), judgments: [] }`, so the render is identical; one private `#build(conversation, selection?)` in `Agent` composes it for every build site.
- `requireConversation(value)` in `src/core/agents/helpers.ts`, shaped like `requireBudget`, throws `ContractError` `'placement'` with path `['options', 'conversation']`. `isConversation` in `src/core/conversations/validators.ts` checks `id` and `summarizable` by their declared types and `view`, `add`, `compact`, and `messages` as functions; unknown members and class instances pass, and it never throws (O41).
- No `resolveConversation` helper: `requireConversation(options?.conversation) ?? this.#context.messages` is one expression.
- `AgentErrorCode` is unchanged (`src/core/agents/types.ts:985`); the guard reuses `'CONCURRENCY'`, and the `@throws` text of `stream` and `generate` widens.

`stream()` order from rc-u16 (O48, O49): the prompt check; `limit`; `requireBudget` twice; the window and budget guard; `requireConversation` and resolve; the conversation guard; the deadline, whose `createTimeout` throws `ContractError` for a per-run `timeout` outside its range; the append, when `prompt` is present; then `start()`; then `#combineSignals`. rc-u14 ships the same order without the prompt check and the append. A `signal` that `AbortSignal.any` refuses throws in `#combineSignals`, after the append and after `start()`, and leaves the prompt appended; rc-u16 accepts that order and states it in the `stream` remarks, because the typed `signal` option makes such a value a compile-time error in practice (O49). `#runs` becomes a map from each run's abort handle to `{ budgets, conversation }`. The guard refuses when a live entry holds the same instance, synchronously, before any `start()` or emit, with context `{ agent, conversation: conversation.id }`. A default the getter seats cannot be held, so no refusal follows a mutation. `conversation` threads through `#drive` and `#execute` as `budget` does: the request read, the three appends, the fold, `select`, and every build.

The ledger passes `conversation: this.#conversation` at its `generate` call (`src/core/ledgers/Ledger.ts:429`), so a switch through `ledger.agent.context.conversations` never moves the ledger's runs. rc-u14 also fixes the refusal gap: `Ledger` passes the handler's conversation into the `'REQUEST'` refusal, so the selection of a run naming another conversation (the fault's `messages` and the prompt built from them) never carries the ledger's history (O41), tested by conversation identity (O46). The claim covers the selection only: such a run still reaches the ledger's `recall` and lookup tools, which read `ledger.conversation`, and during a `respond` call it still reaches that call's gauge readings and repeat stop through the agent-wide listeners (`src/core/ledgers/Ledger.ts`); the guide and the `respond` remarks state that residual. The tool path is deferred as D66 with its closure mechanisms (§ Deferred), and the listener residual stays with D53. rc-u14's guide rewrites state the rule: `ledger.agent` serves only `ledger.conversation`, and a run on another conversation gets no ledger selection but can still reach `recall` and lookups (D66).

The server pattern the guide carries from rc-u16, which rewrites rc-u14's committed fence for the run-owned user turn (Q20, O48):

```ts
interface Session {
	readonly agent: AgentInterface
	readonly threads: ConversationManagerInterface
}

async function handle(session: Session, threadId: string, text: string): Promise<string> {
	const thread = session.threads.conversation(threadId) ?? session.threads.add({ id: threadId })
	return (await session.agent.generate({ conversation: thread, prompt: { content: text } })).content
}
```

- One `Agent` serves one principal: the workspace pointer, scope, instructions, memos, the approver (`AuthorityContext` is `{ call }`), `agent.abort()`, and the emitter's events, which carry no run identity, are agent-wide. The application's session table holds one entry per authenticated principal, `{ agent, threads }`: `threads` is a `createConversationManager()` value that principal owns, and `agent` is one `Agent` built once per principal from shared providers, tool registries, rules, and immutable host text (O46). Each entry builds its own `window`, `budget`, and `allowance`, never shared across principals: the guard is per agent, so it never sees another principal's `Agent` holding the same instance, and each run entry clears its `window` (`Agent#execute`, `src/core/agents/Agent.ts`), which would reset another principal's live measurement.
- No fence looks up a client-facing thread id in a process-global manager, because a client naming another principal's thread id would read that thread. A per-principal manager over one shared store still lets a client read or overwrite another principal's snapshot, because `ConversationManager.open` and `save` key snapshots by conversation id alone (`src/core/conversations/ConversationManager.ts`), so the application keys a durable store by principal as well (O46).
- A per-principal `Agent` shares its workspace pointer, scope, instructions, memos, emitter, and `agent.abort()` across that principal's threads. While one run is live, an `Agent` built with a `window`, a `budget`, or an `allowance` refuses that principal's next run on any thread, not only on one thread, with `AgentError` `'CONCURRENCY'` (a rethrow in the Node fence, `409` on the wire), and never queues it, because every run holds a construction `budget` or `allowance` it does not override (`Agent#stream`, `src/core/agents/Agent.ts`). A run that never settles therefore refuses every later run of that principal, so the host bounds a run it cannot finish through a `timeout` or `signal` it passes, or `agent.abort()`. The guide says so in both fences' sentences (O46).
- The run appends the user turn itself (Q20, O48). `AgentRunOptions.prompt?: AgentPrompt` is checked before the bound and concurrency guards by one guarded statement in `Agent#stream` that reads `agentPromptContract` directly and throws `ContractError` `'placement'` at path `['options', 'prompt']`; no helper, export, guide row, or helper test carries the check, because `@orkestrel/scaffold` `.claude/rules/architecture.md` forbids `helpers.ts` importing `contracts.ts`, and `createRelay` and `RelayProvider` read a compiled contract the same way (O49). The run appends `{ role: 'user', content: prompt.content, ...(prompt.images === undefined ? {} : { images: prompt.images }) }`, built from named members and never a spread of the caller's object, after the conversation guard and the deadline and immediately before the `start()` loop, so a refusal, `'CONCURRENCY'` included, a per-run `timeout` that `createTimeout` refuses, or a throwing `add` leaves the thread unchanged and nothing started or emitted; a `signal` that `AbortSignal.any` refuses is the one throw after the append, stated in the `stream` remarks (O49). rc-u16 proves the deadline case: a valid `prompt` with `timeout: -1` throws `ContractError`, and the thread's message count is unchanged. The Node fence therefore appends and removes nothing and needs no `catch`; a guard's throw propagates to its caller. When `prompt` is absent, the run reads its request from the conversation's tail, as rc-u14 ships it, and that form stays the default; the guide documents `prompt` as the server form.
- rc-u14's committed fence kept the message `thread.add` returns, wrapped only the synchronous `generate` call in `startRun`, and called `thread.remove(message.id)` on any synchronous throw, removing nothing on an asynchronous rejection (O46). rc-u16 rewrites that section, its `tests/guides.test.ts` transcription and cases, and both caveats, which drop the synchronous-removal sentence and keep the kept-tail limit (O48).
- rc-d1 gathers the per-principal server pattern into one guide hub section (O48): it names the session entries as O46 does, `{ agent, threads }` for the Node fence and `{ agent, threads, approver }` for the wire fence, the approver required, never `approver?` and never one shared `Session` type with an optional approver, and holds what one `Agent` shares across a principal's threads, the `window`, `budget`, and `allowance` rule, the 409 or rethrow mapping, the kept tail, and the store keyed by principal; the run-binding caveat, the page-wire introduction, the relay section, and the inlet table point at it, and the inlet table keeps O46's thread-binding sentence.
- Name the thread per run; `switch` sets only the default. Forward a run's own `events` and cancel with its own `abort` or `signal`, never the emitter or `agent.abort()`.
- The ledger limit flips: a direct run on the ledger's conversation while a `respond` call's pass runs is refused with `AgentError` `'CONCURRENCY'`; during the calibration that opens the call it is a run no active `respond` call owns, because calibration calls the provider directly and puts no run in the agent's `#runs` (`Ledger#respond` and `#measureGauge`, `src/core/ledgers/Ledger.ts`).

Closed:

- Cross-thread writes at the three append sites.
- The fold compacting another thread, and the rebuilt prompt reading its history.
- A selection fault or cancel building from the other thread.
- `remove` or a same-id `add` mid-run re-seating a default and losing the reply.
- The `switch; await; add; generate` race in handlers, closed because the caller holds the instance.
- Two runs interleaving a call turn and its tool results on one tail.
- A switch through `ledger.agent` moving the ledger's run.
- The false guide sentence.
- A client-facing thread id reaching another principal's thread through a process-global registry, in the fence (O46).
- A refused run leaving the caller's appended user turn unanswered, as at `a7f4fe9f`: rc-u14's fence removes it on a synchronous throw (O46), and from rc-u16 a refused run appends nothing, because the run appends the prompt only after its guards (O48).

Opened or left open:

- `context.messages` can differ from a live run's thread, by design; observe the run's instance.
- Overlap on one conversation throws `'CONCURRENCY'` (§ Breaking).
- The guard is per agent and per process: two agents, or two hydrated instances of one id, on one conversation stay unguarded, and a per-request `Agent` leaves overlap on one thread unguarded, so the fences hold one `Agent` per principal (D52, O46).
- The session table holds one `Agent` per principal, so the application owns the entry's lifetime and its eviction.
- A run that settles partial or rejects before any assistant append (an abort or a run `timeout` while an ask is open, a cancel seen at a turn's entry, or a provider rejection before the first append) leaves the user turn as the thread's tail, because nothing removes the turn after the run starts (O46, O48). This is a stated limit with an executed proof (O47; § Review, C1): the next request carries that turn unanswered directly before its own user turn, so the model might answer it or call tools for it, and a call the authority allows outright runs without asking; an application that wants a cancelled ask withdrawn removes the thread's tail after settle while that tail is still a `user` turn whose `content` equals the prompt sent (O48). rc-u14's caveat carries the sentence with its server-section case, rc-u16's route bullet carries it with claim 15 (§ Page wire), and rc-u16 rewrites both for the run-owned append (O48).
- A tail check in the fences is rejected (O47; § Review, C2): removing the turn when the run rejects, or settles `partial: true` with the turn still last, needs the check on both exits, because a cancel or a run `timeout` resolves the result and never rejects it (`Agent#finish`, `src/core/agents/Agent.ts`), and on either exit it erases an ask whose partial answer the page might already show. Agent's loop accepts the adjacent user turns that result. D64, opened in rc-u16 as `AgentRunOptions.prompt` (Q20, O48), moves the append into the run and so removes the fences' append and removal, but it does not close the kept tail: a run that rejects, aborts, or times out before any assistant append still leaves its user turn as the tail, a stated limit.
- How a small model answers an unanswered user turn followed by a later one stays unmeasured: `designs/measurement.md` § Uncertainty lists adjacent user turns as untested, behind rc-a9's render probe M3.
- Emitter events carry no run or conversation identity, so an emitter observer cannot route by thread; a run's own `events` can (D53).
- The workspace pointer races the same way for per-thread workspaces (D61); documented.
- A `remember` tool cannot learn the run's conversation for `MemoOrigin`, because tools receive `{ signal }` (D62).
- An instance removed mid-run still receives the reply, the same loss as the re-seat at `a7f4fe9f` (D63); documented.

Tests (`describe('Agent — run-bound conversation')`, gated scripted providers):

- A switch mid-run with a tools turn: A holds the user turn, the assistant turn with calls, the tool turn, and the answer; B holds only its own message. Mutation: any append site reverted to `context.messages` fails.
- A fold under a switch with a gated summarizer: the section lands in A, and the recorded rebuilt request carries only A's messages; the handler's `conversation` argument after a mid-fold switch is A.
- The explicit option while A is active stores in B, and `active` stays A.
- Two overlapping runs on A and B with interleaved gates: each thread holds only its own turns.
- The guard throws synchronously with no `start` emitted and no budget started; the first run is unaffected; a run on that conversation is admitted after settle. Mutation: drop the conversation from the guard.
- A free `createConversation()` passed as the option runs and leaves the registry count unchanged.
- `remove(a.id)` mid-run stores the reply in held A and re-seats no default.
- An instruction added mid-run appears in the rebuilt head after a fold; one added between runs appears at the next entry.
- `AgentContext.test.ts`: `select` hands the given conversation to the handler, and `#check` faults on that conversation only.
- `Ledger.test.ts`: a switch of `ledger.agent.context.conversations` during `respond` leaves every turn in `ledger.conversation`; one case and two mutations for the `'REQUEST'` refusal gap (O41), the messages source and the identity condition, each in its own edit file because the mutation script applies every block of one file together; the case tests conversation identity, not message id (O46).
- `requireConversation` and `isConversation` cases over one appended `tests/setup.ts` table of malformed conversations, with its `tests/setup.test.ts` row (O41).
- `tests/guides.test.ts`: the transcription of the rewritten server fence, with two further cases (O46): two principals posting the same thread id get distinct conversations, and a same-principal overlap on one thread over a gated provider rethrows `'CONCURRENCY'` with the thread's message count unchanged. A server-section case proves the kept tail (O47; § Review, C1): a scripted provider rejects before the first append, `handle` rejects, and the thread's tail is the appended user message; a second `handle` on that thread appends after it, and the second run's recorded request carries both user messages adjacent and in order, with no assistant turn between them. It uses no abort, no `timeout`, and no `agent.abort()`. rc-u16 rewrites this transcription and its cases for the `prompt` form (O48).

Rulings on rc-u14 (O41, O46):

- rc-u14 corrects each `guides/agent.md` sentence it makes false (the server section and its caveat, the `select` fence line, the ledger limit on a direct run during `respond`, the message-source and concurrency-guard contract bullets, the handler's view sentence, and the "between runs" clause) with the smallest true wording; rc-d1 keeps the server-pattern prose.
- rc-u14 fixes the ledger refusal gap.
- rc-u14 launches right after rc-u13 commits.
- `isConversation` takes the member set listed earlier.
- One appended `tests/setup.ts` table holds the malformed-conversation cases.
- The Orchestrator confirms `requireConversation` and `isConversation` free on the scaffold surface before launch.
- The open items become deferrals with triggers (§ Deferred: D52, D53, D61, D62, D63).
- The server fence takes the principal's session entry, `handle(session, threadId, text)`, and removes the appended user turn on a synchronous throw (O46); rc-u16 rewrites it to the run-owned append (O48).
- The brief's first unknown takes the recommended reading: the ledger's `'REQUEST'` refusal tests conversation identity, not message id (O46).
- rc-u14 adds the kept-tail case and its caveat sentence (O47; § Review, C1), and its residual sentence names D66 and the signal mechanism in place of run identity in `ToolContext` (Q18; § Review, B1; § Deferred).

## Relay ownership

Topic B, approved as designed (Q14), ships in rc-u15. The server owns the head: `createRelay` refuses by default a page `system` message and any tool definition the server did not declare, after the contract parse and before the upstream call, and the server opts in with `accept`. Tools follow `system` because the qwen3.5 renderer writes the tools block inside the `system` turn.

Types, in `src/core/providers/types.ts` beside `RelayOptions`:

```ts
/** Configures who writes the system turn a relay forwards. */
export interface RelaySystemOptions {
	/** Holds the server-owned text the relay places first in the request's one system message. */
	readonly text?: string
	/** If true, admits one page system message at index 0 and joins it after `text`; if false, refuses it. Default: false. */
	readonly accept?: boolean
}

/** Configures which tool definitions a relay forwards. */
export interface RelayToolOptions {
	/** Holds the server-owned definitions; a page definition of a listed name must equal it. */
	readonly definitions?: readonly ToolDefinition[]
	/** If true, admits a page definition of a name `definitions` lacks; if false, refuses it. Default: false. */
	readonly accept?: boolean
}

export interface RelayOptions {
	// provider, authorize, limit: unchanged
	readonly system?: RelaySystemOptions
	readonly tools?: RelayToolOptions
}

/** Names why a relay refuses a request member. */
export type RelayRefusalReason = 'system' | 'head' | 'tool' | 'mismatch'

/** Carries one refused member and where it sits. */
export interface RelayRefusal {
	readonly reason: RelayRefusalReason
	readonly index: number
	readonly name?: string
}
```

- `accept` is a leaf under each entity noun, never a group key (`@orkestrel/scaffold` `.claude/rules/names.md` § Group options by entity).
- `'system'` reports a page `system` message with no `accept`, at every `system` index. `'head'` reports, under `accept`, every `system` message not at index 0, and index 0 when it carries `thinking`, `calls`, `call`, or `images`. `'tool'` reports an undeclared definition with no `accept`. `'mismatch'` reports a listed name whose definition differs, and every repeat of a page tool name after the first, at its own index, under every setting.
- `REFUSED_RELAY_STATUS = 422` sits beside the status constants in `src/core/providers/constants.ts`. Not `403`, which collides with the origin and CSRF middleware `RelayOptions` tells hosts to compose; not `400`, because the page could not tell a refused member from a malformed body.
- `REFUSED_RELAY_CONTENT_TYPE = 'text/plain; charset=utf-8'` follows `REFUSED_RELAY_STATUS` in `src/core/providers/constants.ts` and names the content type of the 422 refusal body.

Helpers, pure and exported from `src/core/providers/helpers.ts`:

- `buildRelayRequest(request, policy: Pick<RelayOptions, 'system' | 'tools'>): Result<ProviderRequest, readonly RelayRefusal[]>` (`Result`, `success`, `failure` from `@orkestrel/contract`). One pass collects every refusal, so one answer names every member.
- The head: one `system` message at index 0, built only when `system.text` is set (`''` counts as set, matching `AgentContext#build`), holding `text` then the admitted page content joined by `'\n\n'`, with an id minted by `crypto.randomUUID()`. With no `text`, an admitted page `system` message passes unchanged, so `{ accept: true }` behaves as 0.0.34 does.
- The tools: equality by `canonicalStringify` of the wire projection (`name`, `description`, `parameters`), so key order does not matter. The relay forwards the server's projection, taken at construction so that `title` and `annotations` drop, in the page's order. Only names the page advertised are forwarded, because the page's scope decides per turn. An absent or empty page list passes.
- `describeRelayRefusal(refusal): string`: one fixed line naming the key path (`messages[0]`, `tools[1] "lookup"`), the expected shape, and the admitting option; the tool name through `preview`. It never echoes page content or server text and never lists the server's tool names; its remarks say why: the page learns no server tool names (O42).

`createRelay` (`src/core/providers/factories.ts:63`):

- At construction it copies `system` and `tools`, validates `definitions` against the wire tool shape, and refuses duplicates with `ProviderError` `'PROTOCOL'`, as `RelayProvider#encode` does.
- Per request: `401`; `400` or `413`; the `400` contract check; then `buildRelayRequest` with no `try`, because its input is parsed JSON and a construction-time copy of the policy. A failure answers `REFUSED_RELAY_STATUS` with `content-type` set to `REFUSED_RELAY_CONTENT_TYPE` and `cache-control: no-store`, one `describeRelayRefusal` line per refusal, and the upstream never entered; then `RelayStream` or `502`.
- The body is uncapped; the `createRelay` remarks state that the page reads only the first `MAX_ERROR_BODY_LENGTH` (2048) bytes.
- `RelayStream`, `providerRequestContract`, and `stripThinking` are unchanged; a host mounting `RelayStream` itself calls the helper. `limit` still counts inbound bytes only. The `createRelay` example stays unchanged; examples with server text go to rc-d1.

The page side changes no code. A page relying on the server's text sets no `system`, `instructions`, or skills, so `build` emits no `system` message. The refusal reaches the page as `ProviderError` `'HTTP'` with status 422 and the lines in `message`, and the page branches on `error.status === REFUSED_RELAY_STATUS`. Per-user text needs no hook: build the handler per request, `createRelay({ ...shared, system: { text: textFor(user) } })(request)`.

Rejected:

- Guide only (the first round's recommendation, overruled on Q13).
- A silent drop or a demotion to `user`: the rules forbid it, and demotion creates adjacent user turns.
- A `prepare` hook: no default and no consumer (D54).
- A flat `system: string` plus an `accept` group: a verb group key.
- A position check alone: it fixes placement, not authorship.
- A server copy silently replacing a differing page definition: it hides version skew.
- Server tools added to every request: it breaks per-turn scope.
- A JSON refusal body with its own shape: the page reads the body as a message excerpt, and a small refusal does not earn a shape.
- A refusal frame on `200`: `guides/agent.md` promises none.

Closed:

- A bearer holder writing the operator's system turn.
- Tool descriptions as a second channel into the system turn.
- Tools the server never approved.
- A page bundle older than the server, which fails as a coded 422 instead of argument errors.
- A `system` message that is not first or not alone, which Qwen's own template refuses and which surfaced as the opaque `relay provider failed`.

Opened or kept:

- A page `Ledger` over a relay fails under the default: calibration always sends a head and `LedgerOptions.system` is required, so it needs `system.accept: true`; the ledger's head is its own text.
- A page `window` prices only what the page sends; the guide tells the developer to subtract the server head's `estimateRequest` from `max`.
- Server text is not secret (OWASP LLM07); the guide says so.
- Text the page writes is still model-facing; Authority remains the control.

Tests (`tests/src/core/providers/helpers.test.ts`, `factories.test.ts`, and the relay cases of `tests/src/core/integration.test.ts`):

- The four-row system table and the four-row tools table, each cell asserting the status, whether the upstream recorder was entered, and the forwarded `messages[0]`.
- A definition differing only in key order passes; one differing in a value is refused naming `tools[0]`; a repeated page name is refused.
- Construction throws `'PROTOCOL'` on a malformed or duplicate server definition.
- The refusal body names every refused member in one answer and holds neither the page content nor the server text (sentinels).
- `limit` is unaffected by server text; `RelayStream` still strips thinking after composition; the `createRelayHop` round trip (`tests/setup.ts:5334`) holds under `tools.definitions`.
- Mutation: drop the `system` row check, and the default-refusal test fails.

Rulings on rc-u15 (O42):

- The drafter's choices on the head with no server text, the head id, where `'head'` refusals land, a repeated page tool name, the forwarded copy, the body length, no `try`, and the unchanged example take the recommended option, as written earlier.
- The refusal lines omit the server's tool names.
- rc-u15 corrects the `guides/agent.md` relay sentences its default makes false (the page-owned tool registry, the handler that validates and streams with no policy step, the refusal with no body and its status list, and the contract bullet's status list) with the smallest true wording in its own commit, because the guide stays true at every commit; rc-d1 keeps the explanatory prose.
- `@orkestrel/mcp`'s distribution fixture (`tests/fixtures/distributionServer.mjs`, at mcp `f9a88e9`) mounts a default `createRelay`; the 0.0.35 consumer migration adds mcp beside Ollama, and the release wave checks that fixture.
- rc-u15 launches after rc-u13 commits and runs beside rc-u14, then beside rc-u6 (O44); rc-u16 launches after rc-u15 commits (O46). rc-u15 builds this section as approved, because the user kept the default refusal of every undeclared page tool definition (§ Review; `plan.md` § Decisions, Q16); the `prepare` hook stays deferred (D54).

## Page wire

Topic C ships in rc-u16 with the live `ask` wire (Q13, Q14). Agent ships an allow-listed wire contract and no transport. Frames come only from the run's own handle (`events` and `result`), never `agent.emitter`: events fire synchronously at the yield site while chunks buffer in the unbounded `Channel`, so an emitter bridge sends `finish` ahead of trailing tokens and forwards other runs' events on a shared agent. The reconciled `ask` design lives here (O43).

### Types

```ts
// src/core/agents/types.ts
// AgentChunk (src/core/agents/types.ts:47) gains one arm:
| { readonly category: 'ask'; readonly call: ToolCall; readonly decision: AuthorityDecision }

/** Carries one step of a server-run agent turn to a page, then exactly one terminal `finish` or `error`. */
export type AgentFrame =
	| { readonly category: 'token'; readonly content: string }
	| { readonly category: 'think'; readonly content: string }
	| { readonly category: 'tool'; readonly success: true; readonly name: string }
	| { readonly category: 'tool'; readonly success: false }
	| { readonly category: 'usage'; readonly usage: TokenUsage; readonly estimate: number }
	| { readonly category: 'ask'; readonly id: string; readonly name: string; readonly zone: string; readonly arguments: string }
	| { readonly category: 'finish'; readonly content: string; readonly partial: boolean; readonly usage?: TokenUsage; readonly layer?: AgentStop['layer'] }
	| { readonly category: 'error' }

/** Carries the one user turn a page sends or a server passes as `AgentRunOptions.prompt`; the run writes `role: 'user'` itself. */
export interface AgentPrompt {
	readonly content: string
	readonly images?: readonly string[]
}

// AgentRunOptions (src/core/agents/types.ts) gains one member (Q20, O48):
readonly prompt?: AgentPrompt

/** Carries a page's answer to one ask frame; only `approved: true` approves. */
export interface AgentAnswer {
	readonly id: string
	readonly approved: boolean
}

/** Answers asked calls through a page: frames each ask it is entered for and settles it from a matching answer. */
export interface ApproverInterface {
	/** The `AuthorityHandler`, bound once, so `ask: approver.ask` wires it; pass the received `context` unchanged and synchronously. */
	readonly ask: AuthorityHandler
	/** Returns the ask frame for a call this approver is waiting on, or `undefined`; a call framed with no waiting ask is refused when it is asked later. */
	frame(call: ToolCall): AgentFrame | undefined
	/** True if the answer settled a waiting ask; false for an unknown, settled, late, or other principal's id, with no effect. */
	answer(answer: AgentAnswer): boolean
}
```

- `category` is the axis `AgentChunk` already names, and the union is explicit, so a later chunk arm forces a decision in the exhaustive projection.
- The terminal is `finish`, one term with the `finish` event, not a rebuilt `AgentResult`: it drops `thinking`, so a server that filters `think` frames cannot leak reasoning in the terminal, and drops the stop's `id`, `max`, and `consumed`; `layer` alone crosses. No `AgentFrameOptions.think`: filtering `think` frames is one `if` in the route.
- `AgentPrompt` has no `role`, `id`, `calls`, `call`, or `thinking`; `images` stays because `MessageInput.images` exists, bounded by the route's body limit.
- `Approver` is the name the design and the `Authority` TSDoc already use; `Approval` is the outcome noun and is refused. `frame` pairs with `AgentFrame` and returns `AgentFrame | undefined`, so no extra type name is added.

What never crosses: `call.arguments` outside an `ask` frame, `call.id`, `ToolResult.value`, `ToolResult.error` (a denial carries the raw model name and the host reason), the name on a failure, error and fault bodies (up to `MAX_ERROR_BODY_LENGTH`), the `select` request copy, the abort reason, every emitter argument, and, from an ask, `reason`, `verdict`, and the signal.

### Shapes, contracts, and helpers

- `tokenUsageShape` in `src/core/shapers.ts`, reused by `providerResultShape` in `src/core/providers/shapers.ts` in place of its inline object; the schema is unchanged.
- `src/core/agents/shapers.ts` holds `agentFrameShape` (a `unionShape`, the tool arms through `literalShape([true])` and `literalShape([false])`), `agentPromptShape`, and `agentAnswerShape`. `src/core/agents/contracts.ts` holds `agentFrameContract`, `agentPromptContract`, and `agentAnswerContract`. No `validators.ts` entry and no constant; the barrel adds both files.
- Beside `agentResultToJSON` in `src/core/agents/helpers.ts`, typed and exhaustive, with no contract import: `agentChunkToFrame(chunk): AgentFrame | undefined` builds each arm member by member and returns `undefined` for the `ask` arm, because only the approver that holds the ask knows its id; `agentResultToFrame(result)` returns the `finish` frame; `agentStreamToFrames(stream: AgentStreamInterface, approver: ApproverInterface | undefined)` yields one frame per chunk in order, yields `approver?.frame(chunk.call)` for an `ask` chunk when defined and nothing otherwise, awaits `result` only after the drain ends, yields the `finish` frame, and on any throw yields one `{ category: 'error' }`; drained to the end, it yields exactly one terminal frame, last. It never calls `abort` itself, but a consumer's `return()` while it waits at a chunk's frame closes its `for await` over the stream's events, and the `finally` of `Agent#drainEvents` (`src/core/agents/Agent.ts`) aborts the run, with no terminal frame yielded (O43). The approver is a required positional parameter, so omitting it fails to compile; passing `undefined` is a visible choice, and the TSDoc says ask chunks are then dropped, because an in-process approver answers them (O46).
- `renderArguments(value): string | undefined` beside `denyCall` wraps `canonicalStringify` in `attempt` (a cycle returns `undefined`; a throwing member read returns `undefined`), then writes every code point in `\p{Cc}`, `\p{Cf}`, `\p{Zl}`, and `\p{Zp}` as `\uXXXX` over its UTF-16 units (two for an astral tag character). It keeps `canonicalStringify` semantics, so `NaN` renders as `null` and `undefined` members drop; the exact round trip is promised for JSON arguments only, which a provider's parsed call carries (O43).
- `Approver` is one class in `src/core/agents/Approver.ts` beside `Authority.ts`, with `createApprover()` in `src/core/agents/factories.ts` beside `createAuthority` and a barrel row. The test helper `createApprover` (`tests/setup.ts:1057`) is renamed `createScriptedApprover`, matching `createScriptedProvider` (O39).

### Loop changes

- **The ask chunk.** `Agent#approve` becomes an async generator, entered through `yield*` inside its unchanged guard, so a turn with no ask adds no `await` and `designs/authority.md` ordering 7 holds. Per asked call: emit `ask`; the listener abort check, so an `ask` listener that aborts yields no chunk; build `answer`, which enters the handler synchronously; yield `{ category: 'ask', call, decision }`; then `raceSignal`. The handler is entered before the push, so an `Approver` entry exists when the chunk reaches the page, unless the handler suspended first. The chunk carries the same `call` object the handler received and the later `tool` chunk carries. It ships as a breaking change (O39).
- **The advertised-name guard.** In the synchronous pass of `Agent#authorize`, beside the scope allow-list filter (the scope check of `Agent#decide`, `src/core/agents/Agent.ts:867`) and before `authority.evaluate`, a call whose name no definition advertises this turn is denied: the loop returns `denyCall(call, SCOPE_NOTE)` and emits `` deny(call, `${call.name} is not in the active scope`, undefined) ``, exactly as a scope miss does. It covers every verdict (Q15, O45): the authority, the approver, and `ToolManager` never see a made-up name, and no `ask` event, `ask` chunk, or frame names it. The `deny` event carries no decision, because the guard fires before evaluation; this supersedes the ask-only reach and the evaluated decision of O39 and O43. rc-u16 widens the `SCOPE_NOTE` summary and its guide row.
- The guard closes these holes: with no scope, `filterAllowList` (`src/core/helpers.ts:34`) admits every call, and with a scope it admits a listed name no registered tool carries, so a made-up name reached the authority's rules in every case; an allowed one reached `ToolManager`, whose own unknown-tool failure answered the model; and an asked one reached the approver, whose approval check `tools.tool(call.name) === tool` (`src/core/agents/Agent.ts:954`) reads `undefined === undefined` and allows it, with the frame's `name` model text.

### Approver mechanics

State: `#asks`, a `Map` keyed by the call object holding `{ id, frame, resolve, settled }` (added when the ask starts, deleted on every settling path), and `#missed`, a `WeakSet` of calls written once per call.

| Step | Behavior |
| --- | --- |
| `ask(context, decision, signal)` | Reads `context.call` once. An aborted `signal` resolves `false` and registers nothing. A call `#missed` or `#asks` already holds rejects with `AgentError('APPROVER')`, which the loop reads as `unanswered`. `renderArguments` returning `undefined` rejects the same way (O43). Otherwise it mints `id = crypto.randomUUID()`, builds `{ category: 'ask', id, name: call.name, zone: decision.zone, arguments }`, registers the entry before its first suspension, adds one `abort` listener on `signal` with `{ once: true, signal: settled.signal }`, and returns the entry's promise. |
| `frame(call)` | Returns the waiting entry's frame. With no entry it adds the call to `#missed` and returns `undefined`. Synchronous; never throws. |
| `answer({ id, approved })` | Finds the entry whose `id` matches; none returns `false`. Otherwise it deletes the entry, aborts `settled` (removing the run-signal listener), resolves `approved === true` (strict: `'true'`, `1`, and `null` refuse), and returns `true`. |
| the run signal aborts | The listener deletes the entry and resolves `false`; a later `answer` returns `false`. |

- `ask` is bound once (O48): `Approver` keeps the logic in a `#` private method, binds it in the constructor into a `readonly #` field, as `RelayStream` does (`src/core/providers/RelayStream.ts`), and exposes that field through `get ask(): AuthorityHandler`, which returns the same function on every read. No class-field arrow; `frame` and `answer` stay methods. A detached `const { ask } = approver` works, so the unbound form cannot be written, and the `ApproverInterface` guide row shows `ask` as a property.
- rc-u16 updates the `AgentError` docs in `src/core/agents/errors.ts` (the summary, the `'APPROVER'` remarks, and the `code` member doc) and the `AgentError` guide row to name the `'APPROVER'` rejection of a missed, repeated, or unrenderable ask (O43).
- One `Approver` per authenticated principal, holding several pending asks and found by principal; no run id header (O39).
- Identity, not FIFO: keyed by the call object, an answer reaches exactly the handler of the call the page saw. Under FIFO, a wrapper that auto-approves call A and forwards only call B would show the page A's frame while B's handler waits. Keying by `call.id` would admit the wrong call when provider ids repeat.
- The missed mark replaces a pull-ahead race. A handler that enters the approver after an await finds its call marked, because the projection already called `frame(call)`; the late `ask` rejects immediately, the model reads the `unanswered` note, and the run continues (O39; the composed case is D58). A race over a pulled-ahead chunk would need an iterator entity to hold the pending result across awaits, machinery for a hypothetical handler.
- Correction (O43): the third round claimed "Fail closed, never the wrong call, never a hang" for a wrapper that copies the call. That is false. A handler that passes a copy of the call to `approver.ask` synchronously registers the copy; the projection's `frame` of the original call returns `undefined`, no frame crosses, and the copy waits until the run `timeout` or an abort deletes it. It fails closed and never answers the wrong call, but it is held until the timeout. By the same mechanics a copy passed after an await also registers, because the missed mark holds the original call, not the copy. The mechanism stays; the `ApproverInterface.ask` TSDoc and the fence's introducing sentence say "pass the received `context` unchanged and synchronously", and the test `times out a copied call with no frame` pins the limit. The guide adds one sentence: a wrapper that redacts or copies the call gets no frame and waits until the run `timeout`, when one is set, or until the page disconnects and the route's `cancel` aborts the run, because the fence sets no `timeout`; redaction belongs to D60 (O46).

### Frame members

- **`id`:** minted per ask, never `call.id`, which the provider writes and can repeat. It is the capability for one reply.
- **`name`:** an advertised definition's name, by the loop guard.
- **`zone`:** crosses; a host label that can depend on the arguments, so the page cannot derive it.
- **`arguments`:** always crosses as canonical JSON text with every control, format, and line or paragraph separator code point written as `\uXXXX`, with no cap (O39). `designs/authority.md` § Guide requires that an approver see the full call, and users accepted 93% of one coding agent's manual permission prompts (C41). Clipping would hide what is approved; the turn's output bounds the size. The text is valid JSON that parses back to the original with canonical key order, and bidi overrides, zero-width characters, U+0085, U+2028, U+2029, U+FEFF, and tag characters appear only encoded. The page renders it through `textContent`; `content` can already echo tool data, so no leak class is added.
- **Never crosses:** `reason` (host prose, which the `consequential` floor keeps from an allow rule on a raised ask, so it could mislead), `call.id`, `verdict`, the signal, and every other chunk member (O39).

### Ordering and adverse cases

Per tools turn: the `token`, `think`, and `usage` frames; then `ask` 1; after its answer, `ask` 2; then the `tool` frames in call order; then the next turn; the terminal frame last. At most one ask is open per run (`designs/authority.md` ordering 3), so a page closes an open ask on the next frame of any category. The outcome shows in the following `tool` frame: `{ success: true, name }` when approved, `{ success: false }` when refused; no answered frame exists.

| Case | Outcome |
| --- | --- |
| Abort, disconnect, or run `timeout` while an ask is open | Frames end `ask`, `finish` with `partial: true`; no `tool` frame; the assistant message is never stored; the entry is deleted; a later `answer` returns `false`. A per-ask deadline stays D30. |
| An abort before the page reads the `ask` chunk | No `ask` frame crosses; frames end `finish` with `partial: true` (O43); documented. |
| An `ask` listener aborts before the handler is entered | No ask chunk; frames end `finish` with `partial: true`. |
| A call whose name no definition advertises this turn, under any verdict | Denied before evaluation (O45): no `ask` event, chunk, or frame; the `deny` event carries no decision; the model reads `SCOPE_NOTE`; the `tool` frame shows failure and names nothing. |
| A late, duplicate, or unknown id, or an id minted for another principal | `answer` returns `false` and nothing changes; the route answers `404`. |
| The handler enters the approver after an await | `unanswered` note, no frame, the run continues promptly. |
| The handler passes a copy of the call to `approver.ask` | No frame; the copy waits until the run `timeout`, when one is set, or until the page disconnects and the route's `cancel` aborts the run, then the run settles `partial: true`; fail closed, never the wrong call (O43, O46). |
| No handler, a throwing `ask` getter, or a handler that throws synchronously | A rejection, read as `unanswered`; no frame. |
| A tool replaced during the ask | `answer` returns `true`; the loop denies as unanswered; the `tool` frame shows failure. |
| `agentStreamToFrames(stream, undefined)` with an `Approver` wired | No frame; the ask waits for the run `timeout`, when one is set, or for an abort (claim 19). Omitting the approver argument fails to compile, so the route states the choice; the guide names it as a misconfiguration (O46). |
| A multi-process deployment | The answer must reach the owning process; `404` until D21. |
| An idle proxy timeout during an ask | A disconnect, so the run aborts; a heartbeat frame is D59. |

### Route pattern

rc-u16 writes the guide rows, the placement bullet, the pattern heading and its introducing sentences, both fences, and the Contract clause the `ask` chunk makes false; rc-d1 writes the prose, the incomplete chunk lists, and the denial bullet (O43).

- The frame route authenticates a principal, composes the same origin and CSRF checks as the answer route before it reads the body and answers `403` when they refuse, because under an ambient credential a cross-site simple POST would otherwise store a user turn in the principal's thread and run `session.agent` with every allowed tool, checks `agentPromptContract.is(body)` and answers `400` otherwise (`is`, never `parse`, which would drop a sent `role` silently), takes that principal's session entry, looks the thread id up only in `session.threads` (§ Run binding), and passes the checked body as the run's `prompt`, which the run appends as a `user` turn from named members after its guards (Q20, O48).
- The application's session table holds one entry per authenticated principal, `{ agent, threads, approver }`: one `Agent` built once per principal, one `createConversationManager()` value, and one `Approver` (O46). The authority is built over shared rules with `createAuthority({ rules, ask: approver.ask })`, because `ApproverInterface.ask` is a bound `AuthorityHandler` property (§ Approver mechanics; O48). The route uses `session.agent`, never one `Agent` per request, because the run guard is per agent: two posts on one thread would start two agents, neither would throw `'CONCURRENCY'`, and both runs would append to one tail (D52).
- The route wraps only the synchronous `session.agent.stream({ conversation: thread, prompt: body, signal: request.signal })` call in `try`/`catch`: it answers `409` for `AgentError` `'CONCURRENCY'` and rethrows any other error. It appends and removes nothing, because the run appends the prompt after its guards; the `409` contract stands (O46, O48).
- The route's caveat carries rc-u14's sentence that the host bounds a run it cannot finish, through a `timeout` or `signal` it passes or `agent.abort()` (§ Run binding; O48). With the run-owned append, both server fences take one shape, so no second fence shape is kept (O48).
- The route writes each frame of `agentStreamToFrames(stream, session.approver)` as one NDJSON line from a `ReadableStream` with `pull` and `cancel`, the `RelayStream` pattern. Its `cancel` calls `stream.abort()`, because a `return()` on a parked drain waits for the next push, and none comes while an ask is open. No buffering or compression without flush on the frame route.
- The page parses each line with `parseJSONAs(line, agentFrameContract.is)` and treats a refused frame as a protocol error.
- The answer route authenticates the same principal, composes the origin and CSRF middleware `RelayOptions` already prescribes, checks `agentAnswerContract.is(body)`, and answers `400` on a refused body, `404` when `answer()` returns `false` (one status, so ids leak no state), and `204` when it returns `true`. `answer() === true` permits the call and never promises it runs (`designs/authority.md` ordering 4).
- NDJSON, not SSE, in the executed fence: at `ad866d2b` Agent declares `@orkestrel/server` and `@orkestrel/router` as development dependencies and no SSE or NDJSON package, and the guide transcribes a line parser. rc-u17 adds `@orkestrel/ndjson` as a runtime dependency (Q17) and, in the commit that retires that line parser, moves this fence's framing to one `createNDJSONParser({ strict: true })` per body, ended with `parser.parse('\n')`, with a per-record `agentFrameContract.is` check; the page treats a thrown `NDJSONError`, a refused record, and a body that ends without `finish` or `error` as protocol errors, and rc-u17 adds the transcription case and the mutation that prove it (O47; § Review, A6). rc-u16 builds the framing this section rules. An application on `@orkestrel/server` can write the same frames through `createStream`, whose `write` returns `false` for `drain()`; the guide says so in one sentence. No constants are added.

### Rejected

- Guide only (overruled on Q13).
- A guard over raw `AgentChunk`, or a deny-list redaction over the event map: it leaks by default.
- An Agent-owned route, `Response` class, or id registry: the route owns identity, thread choice, persistence, and abort policy, and core cannot import `@orkestrel/server`.
- An error frame with a message or code: a constant member drifts, and codes expose internals.
- A `tool` frame carrying `id`, or the name on a failure.
- An inbound `MessageInput` with a narrowed role: it invites forwarded history, and a fabricated `tool` message files as `fact`.
- A projection over `unknown` with `attempt`: the server projects its own run.
- An ask frame from the emitter (ordering, and other runs' calls on a shared agent); a side queue merged by arrival; a pulled-ahead race; FIFO correlation; `call.id` as the wire id.
- A loop-minted id in `AuthorityContext` or a fourth handler parameter, rejected again on the 2026-11-01 review (O46, § Review). It removes the invariant that an ask frame crosses only while an `Approver` entry waits for it, because the frame is built from the chunk:
  - A handler that decides without the approver (an auto-approve, a cached decision, or an ask routed to another approver) frames an ask nothing waits on, and that frame stays open through the batch dispatch, so the page shows a consent prompt for a call already running or refused, and its answer gets `404`.
  - A wrapper that redacts the call before `approver.ask` turns from fail-closed (no frame, held until the run `timeout`) into a disclosure: the frame shows the original, unredacted arguments.
  - D58 turns from a prompt refusal into a race: a page that answers before an await-first handler registers gets `404`, and the ask then waits for the run `timeout`, which has no default (O46).
  - A `404` on a freshly framed id no longer means only that the ask is dead, so the page cannot tell whether to close the prompt or retry.
  - An optional `AuthorityContext.id` is a member absent on the `evaluate` and rule `match` path; only a required `id` on a separate ask context type would be sound. rc-a14 is unreleased, so its shapes alone are no reason.
- One `Approver` per run with a run id header; refusing a second concurrent ask on one approver.
- `reason` on the wire; raw, clipped, or omitted `arguments`; a `verdict: 'allow' | 'deny'` reply, because a binary answer is a boolean; an answered frame; separate statuses for unknown, duplicate, and late answers; a `presented` mark on `frame`; an `AgentAsk` type for the frame arm.

### Closed

- Terminal-before-trailing-chunk ordering, and cross-run frames on a shared agent.
- Error, fault, and selection bodies; the raw model tool name and the host deny reason; tool values; reasoning and budget internals in the terminal.
- A page-written role, id, or history; unvalidated JSON on the page; silent widening by a later chunk arm.
- A call whose name no definition advertises reaching the authority, the approver, or `ToolManager`, under any verdict, and model text as an `ask` frame's `name` (O45).
- An answer settling the wrong call.

### Opened or kept

- `content` and `think` are model output and can echo system text or tool data; `usage` reveals prompt size.
- The `Channel` buffers without bound while the page reads slowly.
- A run outlives a disconnect until the route's `signal` fires.
- No default run `timeout` (O46): a default would change every Node consumer, and disconnect wiring (the route's `cancel` calling `stream.abort()`) bounds the wire case.
- A failed registered tool loses its name on the wire.
- Frames are unsigned; TLS and the route's authentication own that. Image size is bounded only by the server's body limit.
- The frame route and the answer route each need authentication and origin and CSRF middleware.
- An abort, a disconnect, or a run `timeout` before any assistant append leaves the user turn as the thread's tail, because the route removes nothing after the stream starts (O46); the next post on that thread carries it unanswered directly before its own user turn. It is a stated limit: rc-u16's route bullet states it, and claim 15 proves it (O47; § Run binding, Opened or left open; § Review, C1).
- Host code that mutates a call object after it was framed: hosts are trusted.

### Test claims

Each claim names the mutation that reddens it where it is load-bearing.

1. **Chunk placement.** Over a real `Agent` with a scripted provider: one `ask` chunk per asked call, after that turn's `usage` chunk and before its `tool` chunks, carrying the same `call` and `decision` objects as the `ask` event; none for an allow or a deny. The first `frame(call)` from the chunk reader finds the entry. Mutation: yield the chunk only after the `raceSignal` await settles; no frame reaches the reader while the ask waits, so the page answer fails. Moving the yield before the handler entry is no mutation target: `Agent#drive` pushes each chunk and calls `run.next()` in one synchronous step, resuming through `yield*` enters `#approve` synchronously, and `Channel.push` wakes a parked reader only through a promise, so the handler is entered before any reader sees the chunk in either order; a case that the approver is entered before the chunk stays as a regression pin.
2. **Slow reader.** Nothing is pulled until the handler is entered; the ask frame still follows every `token` and `usage` frame of its turn. No mutation: taking the frame from an emitter `ask` listener edits no line rc-u16 writes, because `agentStreamToFrames` receives the stream and no emitter; the late-reader case pins the order.
3. **Outcomes.** Approve gives `tool` with `success: true` and the name; refuse gives `tool` with `success: false` and the `refused` note; every frame passes `agentFrameContract.is`.
4. **Abort during an ask.** Frames end `ask`, `finish` with `partial: true`; `answer` then returns `false`; no stored assistant message; the run signal holds no abort listener after each settle, read with `getEventListeners` as ordering 8 does. Mutation: drop `settled.abort()` in `answer`.
5. **Run `timeout` during an ask** behaves as claim 4 with a real short deadline.
6. **Answers.** A duplicate returns `true` then `false`; an unknown id `false`; ask 1's id while ask 2 is open `false`, leaving ask 2 untouched; `approved` as `'true'`, `1`, and `null` through `Reflect.apply` refuses and settles the ask as refused.
7. **Two agents, one approver.** Each projection yields only its own ask frames; each answer settles only its own call.
8. **Missed ask.** A handler that awaits a real `setTimeout(0)` gate before `approver.ask`: the `unanswered` note, no frame, and the run finishes before a short run `timeout` would fire. Mutation: drop the `#missed` check; the run waits for its timeout. The copied call is claim 18, not this claim (O43).
9. **A handler that throws synchronously, a throwing arguments getter, a cyclic argument:** `unanswered`, no frame. Through the loop, the case is a handler that throws synchronously, because a bound `ask` leaves no unbound form to test (O48); the throwing getter and the cyclic argument are proved at the approver, which rejects `'APPROVER'` for arguments it cannot render, and `designs/authority.md` ordering 2 pins that the loop reads every rejection as `unanswered`.
10. **Tool replaced during the ask:** `answer` returns `true`, and the `tool` frame shows failure.
11. **Loop guard.** Two calls, each named with a sentinel no tool advertises, one allowed and one asked: the fixtures are no-scope agents with a registered tool, so the turn advertises definitions, each over a recording authority whose `evaluate` records its call and answers `allow` in one fixture and `ask` in the other. For each, the authority's `evaluate` is never called (its recorder holds no call), the approver is never entered, no `ask` event fires and no `ask` chunk is yielded, `deny` fires with the reason `` `${call.name} is not in the active scope` `` and no decision, the tool message reads `denyCall(call, SCOPE_NOTE).error`, and the sentinel is in no frame (O45). Mutation: remove the guard; both cases fail. The brief departs here, recorded before launch (O48): the failing-proof phase's loop-guard cases, `denies an allowed unadvertised name` and `denies an asked unadvertised name`, name each call with plain text, because the `name` member joins `CANARY_SENTINELS` only in the source phase, and carry every assertion of this claim except the frame one; `frames no unadvertised name` reruns both fixtures with the call named `CANARY_SENTINELS.name` and carries the frame assertion; the mutation fails both `denies` cases.
12. **`renderArguments`.** Parses back to the original; U+202E, U+200B, U+2028, U+0085, U+FEFF, and U+E0041 appear only encoded; key order is canonical; a cycle and a throwing getter return `undefined` without throwing.
13. **Sentinels.** Arguments holding a newline, a fake `{"category":"finish"}` line, `</script>`, `"approved": true`, and a fake id: the NDJSON line count equals the frame count; the sentinel appears only inside `arguments` of ask frames; `JSON.parse(frame.arguments)` deep-equals the call's arguments and what the recorded tool received; `answer` with the fake id returns `false`. Sentinels in `decision.reason`, `call.id`, the agent id, the abort reason, the system text, the instructions, and the selection copy are absent from every serialized frame. The rc-u10 canary gains `reason`, `body`, `argument`, `thinking`, `budget`, `name`, and `copy` members in `CANARY_SENTINELS` and a `CANARY_FRAME_SOURCES` list, none containing another or rc-u13's select sentinel (O43).
14. **Contracts and shapes.** An ask frame with `call`, `reason`, `decision`, `verdict`, or object `arguments` is refused; an answer with `arguments`, `reason`, `name`, a missing or numeric `id`, `approved` as `'true'`, `1`, or `null`, `null` itself, or an array is refused; a `Proxy` with a throwing getter returns `false`; parse and guard agree on seeded values; `Infer` of each shape and its declared type extend each other both ways. Topic C's rows hold too: a tool frame with `arguments`, `value`, `error`, or `id`, a failure with `name`, a finish with `thinking` or `stop`, an error with `message`, and the categories `select`, `deny`, `fault`, `abort`, and `start` are refused; a prompt with `role` (`'system'` and `'user'`), `id`, `calls`, `call`, `thinking`, or a history is refused.
15. **The hop.** A frame-route post that fails the origin check gets `403`, with the provider unentered and the thread unchanged; stream to the ask, POST the answer, `204`, and the stream reaches `tool` and `finish`; refuse gives `success: false`; another principal's approver with the same id gets `404` and the ask stays pending; an extra member gets `400`; a duplicate gets `404`; a `role` in the prompt body gets `400`; cancelling the response body during an ask settles the run partial without waiting for its timeout and leaves no pending entry; after that cancel the thread's tail is the appended user message, and a second post on that thread runs with a recorded request that carries both user messages adjacent and in order (O47; § Review, C1). The HTTP hop runs in the `tests/guides.test.ts` transcription of the unit's fence pair, because `tests/src/core/integration.test.ts` runs in process in the core project; core tests drive `agentStreamToFrames` in process over a real `Agent` (O43).
16. **`tests/guides.test.ts`:** the placement case extended to the fourth bullet, and the fence pair with both routes, with two cases (O46): two principals posting the same thread id get distinct conversations, and a same-principal overlap on one thread over a gated provider answers `409` with the thread's message count unchanged.
17. **`Approver.test.ts`** (no agent): a fresh id per ask, never equal to `call.id`; approve, refuse, duplicate, unknown; an aborted signal resolves `false` and registers nothing; `frame` of an unasked call returns `undefined`, and the later `ask` rejects `'APPROVER'`.
18. **Copied call** (`times out a copied call with no frame`): a handler that calls `approver.ask({ call: { ...context.call } }, decision, signal)` synchronously; `frame(chunk.call)` returns `undefined`, no `ask` frame crosses, the call never runs, the run settles `partial: true` at its `timeout`, and afterwards `answer` of any id returns `false` (O43).
19. **The required approver argument** (O46). At compile time, `Parameters<typeof agentStreamToFrames>` equals `[AgentStreamInterface, ApproverInterface | undefined]` with a required second member, so a call that omits the approver fails to compile. At run time, `agentStreamToFrames(stream, undefined)` over an asked call answered by an in-process handler yields no `ask` frame, then the call's `tool` frame and one `finish`, last; with `createApprover()` wired as the handler and `undefined` passed (`holds an ask passed no approver`), no `ask` frame crosses, the call never runs, the run settles `partial: true` at a short run `timeout`, the run signal holds no abort listener afterwards, and `answer` of any id returns `false`.
20. **Detached ask** (`answers through a detached ask`, O48): `const { ask } = approver` wired as the handler; one `ask` frame crosses, `answer({ id, approved: true })` returns `true`, and the call runs. Mutation: declare `ask` as a plain prototype method; the case then fails with the `unanswered` note and no frame.

Topic C's own helper claims hold beside these: each chunk arm projects to its frame; a `denyCall` result with a sentinel name and reason serializes with neither; the finish drops extras and keeps both `layer` arms; a provider error with a body sentinel ends in `{ category: 'error' }` with the sentinel absent; an abort yields `finish` with `partial: true`; a lazy drain still gets `finish` last (mutation: await `result` before the drain; drop the `catch` and the error case fails); `tokenUsageShape` infers `TokenUsage`, and `providerResultShape` compiles to the schema of its inline shape at `a7f4fe9f`.

## Stored roles

D33 opens in Agent 0.0.35 as rc-u13 on the user's Q13 ruling (O37). Agent's own paths store no `system` message, but client JSON reached a stored `system` role through `Conversation.add`, the job seed, a snapshot, and a selection, so the "host-written by construction" claim of `designs/layout.md` § Boundary was false at those inlets.

- `CONVERSATION_ROLES` (`['user', 'assistant', 'tool']`) and `ConversationRole` at the core root. `MessageInput.role` narrows to `ConversationRole`.
- `Message.role`, `MESSAGE_ROLES`, `messageShape`, `messageContract`, and `isMessage` keep `'system'` for the built head and the relay wire. `MessageMeasure.role` and `LedgerLine.role` stay `MessageRole`.
- `ConversationErrorCode` (`src/core/conversations/types.ts:21`) gains `'ROLE'` and `'SNAPSHOT'`.
- `Conversation#add` refuses any other role with `ConversationError` `'ROLE'`, and `add(batch)` checks every role before it stores any.
- The `Conversation` constructor validates a hydrating snapshot through `requireConversationSnapshot` before any member is seated: a snapshot that fails `isConversationSnapshot`, a malformed judgment included, throws `'SNAPSHOT'`; a stored `system` role in a section message or a live message throws `'ROLE'`; every section id, section message id, and live message id must differ from every other, or it throws `'SNAPSHOT'`. A judgment the guard admits but JSON cannot carry still raises `'JUDGMENT'` from the `JudgmentManager` constructor. `requireConversationSnapshot` reads `id`, `sections`, `messages`, and `judgments` once, takes each array once, and the constructor seats from that one read. The helper names are `requireRole` and `requireConversationSnapshot`.
- `ConversationManager.add` passes the snapshot to the constructor before it registers anything. `ConversationManager.open` rejects with the constructor's error and leaves the registry and `active` unchanged, where 0.0.34 hydrated such a snapshot and sent the stored `system` message in place; that breaks stored 0.0.34 data that holds one.
- A ledger hydrate runs `isLedgerSnapshot`, then `conversations.add({ snapshot })`, so `createLedger` throws `ConversationError` `'ROLE'` for an unmarked `system` message and `'SNAPSHOT'` for a repeated id. rc-u13 owns the three ledger sentences the refusal makes false: the `Ledger` constructor's `@throws` list, the `LedgerOptions` remark on `snapshot`, and the `isLedgerSnapshot` `@returns`.
- A job seed refuses through `add`: `AgentRegistry#build` throws before the agent is returned, and the agent and its conversation are dropped unsaved, so `AgentRegistry.ts` does not change. rc-u13 owns the `AgentRegistryInterface.build` `@throws` line.
- R4's round-trip test between `isMessage` and `messageContract` rides rc-u13 (`@orkestrel/scaffold` `.claude/rules/patterns.md` § Validation and contracts: derive parser and guard from one source or test the round trip).
- The rc-u10 canary gains a stored-ingress table (`CANARY_INGRESS_SOURCES`, `IngressCanary`, `serveIngressCanary`) through `add`, a snapshot, a job seed, and a scope `select` handler, run in `tests/src/core/agents/Agent.test.ts`; the setup tables `MALFORMED_CONVERSATION_SNAPSHOTS` and `DUPLICATE_ID_SNAPSHOTS` follow `INVALID_JUDGMENTS` in `tests/setup.ts`.
- The census at `c1306929` found no stored `system` role in Agent, `@orkestrel/ollama`, `@orkestrel/toolbox`, or `@orkestrel/study`: every `role: 'system'` hit is a built head, an assertion on a built or sent array, a recorded wire array, or a `Message`-typed value. The narrowing breaks types in tests only: the `RECORDED_*` wire arrays typed `readonly MessageInput[]` become `Omit<Message, 'id'>`, and one `Ledger.test.ts` recorder is retyped.

Rulings on rc-u13 (O40, O44):

- The selection refusal is a fault over `view()` carrying `ConversationError` `'ROLE'`, matching the changed-view fault of `AgentContext#check`; a host's direct `build(selection)` is unchanged.
- `isConversationSnapshot` and `isLedgerSnapshot` stay structural; `requireConversationSnapshot` and the constructors are the stored-data check, and both guards' TSDoc says so. Tightening the guards would make a database `open` of a stored `system` role resolve `undefined`, a silent drop, and turn the ledger's `ConversationError` `'ROLE'` into `LedgerError` `'SNAPSHOT'`.
- No ownership copy of a conversation snapshot: the check and the seating run synchronously in the constructor over one read of the snapshot's members, and a stored snapshot is a fresh object from storage.
- rc-u13 is the next writer of every chain it touches, ahead of rc-u14, rc-u15, rc-u16, rc-u6, rc-u8, and rc-u9 (O44).
- rc-u13 adds the role fault to the `AgentOptions` remarks clause on `strict`. rc-d1 writes the guide sentences the refusal leaves false or incomplete: the `#### ConversationManagerInterface` sentence on `open`, the selection-failures paragraph ("A selection fails three ways"), and the **Selection faults** Contract bullet, which close the fault list without the role fault (O40).
- The brief's readings stand, except its routing, the owner of the selection refusal, and the placement of its setup tables, which its rulings set.

Kept open, aliasing: `MemoManager` copies a memo snapshot through JSON and checks the copy (`c1306929`), while a conversation snapshot is seated without a copy (O40). The top-level single read closes an accessor snapshot at its top level, but each section and message object stays seated by reference, so a host that defines an accessor `role` on a message object, or edits a seated message object's `role` after hydrate, can still place a `system` role in the stored conversation. Agent reads that as host-trusted, and the `requireConversationSnapshot` and `ConversationOptions.snapshot` TSDoc says a host must not mutate a seated snapshot or back its message members with accessors. `MemoManager`'s copy stays a manager-local choice.

## Units

O35 maps the units; the second round numbered topics A to C as rc-u13 to rc-u15 and called the D33 unit R1, and every brief carries this map.

| Unit | Subject | Size | Role | Owned surface |
| --- | --- | --- | --- | --- |
| rc-u13 | the stored-`system` refusal at every ingress (D33, R1, R4) | medium: a public type change, a refusal on untrusted input, a breaking change to stored data | `opus`; review by `reviewer` as neutral QA | `src/core/{types,constants}.ts`, `src/core/conversations/*`, the selection fault in `src/core/contexts/AgentContext.ts` with the `select`, `Selection`, and `Selection.fault` docs in `src/core/contexts/types.ts`, the TSDoc lines it makes false in `src/core/ledgers/*` and `src/core/agents/types.ts`, the canary and snapshot tables of `tests/setup.ts` |
| rc-u14 | run binding (topic A) | medium: concurrency | `opus`; review by `reviewer` as neutral QA | `src/core/agents/{types,Agent,helpers,errors}.ts`, `src/core/contexts/{types,AgentContext}.ts`, `src/core/conversations/validators.ts` and the active-pointer TSDoc in `src/core/conversations/types.ts`, `src/core/ledgers/Ledger.ts` and the `respond` remarks in `src/core/ledgers/types.ts`, one `tests/setup.ts` table, the guide rows, the server fence, and the false sentences of O41 |
| rc-u15 | relay ownership (topic B) | medium: a protocol and untrusted input | `opus`; review by `reviewer` as neutral QA | `src/core/providers/{types,constants,helpers,factories}.ts`, the `createRelayHop` region of `tests/setup.ts`, the relay cases of `tests/src/core/integration.test.ts`, the guide rows, and the false sentences of O42 |
| rc-u16 | the page wire with live `ask` frames (topic C, O39) | medium: a public contract, concurrency, a protocol, untrusted input | `opus`; review by `reviewer` as neutral QA (O43) | `src/core/agents/{types,Agent,Approver,factories,constants,errors,helpers,shapers,contracts,index}.ts`, `src/core/shapers.ts`, `src/core/providers/shapers.ts`, the `createScriptedApprover` rename, the frame tables and the frame canary of `tests/setup.ts`, the guide rows, the placement bullet, and the fence pair; from O48, `AgentRunOptions.prompt`, the `SCOPE_NOTE` and `AUTHORITY_NOTES.refused` texts with every site that pins them, and rc-u14's server section with its transcription and cases |
| rc-nd1 | the opt-in strict mode of `@orkestrel/ndjson` (Q17, O47) | medium: a public API and a refusal on untrusted wire input | `opus`; review by `reviewer` as neutral QA | in `@orkestrel/ndjson`: `src/core/{types,NDJSONParser,factories,index}.ts` and the added `src/core/errors.ts`, their tests and the added `tests/src/core/errors.test.ts`, the strict-mode fixtures of `tests/setup.ts`, the guide and README cases of `tests/guides.test.ts`, the header and error-recognition case of `tests/distribution.test.ts`, `guides/ndjson.md`, `README.md`, and the `package.json` `description`; no version or release commit |
| rc-u17 | the optional relay parser with a strict default, and the framing-agnostic `'PROTOCOL'` translation (Q17, O47) | medium: a public type change, a protocol behavior, untrusted input | `opus`; review by `reviewer` as neutral QA | `RelayProviderOptions` in `src/core/providers/types.ts`, `src/core/providers/{RelayProvider,AgentProvider}.ts`, the `createRelayProvider` docs in `src/core/providers/factories.ts`, their tests, the relay parser regions of `tests/setup.ts`, the relay and default-refusal cases of `tests/guides.test.ts`, rc-u16's page fence framing and its transcription, and the `guides/agent.md` relay lines; the Orchestrator owns the `@orkestrel/ndjson` entry in `package.json` and `package-lock.json` |

- Sequence (O44, O50): rc-u13; then rc-u14 and rc-u15 in parallel; then rc-u16 and rc-a3b in parallel, rc-u16 on `src/core/agents/*`, the shapers, and the page wire and rc-a3b on `src/core/ledgers/*` and its tests; then rc-u6 on the ledger classifier after rc-a3b commits, beside rc-u16 when it is still live; then rc-u8, with rc-u18, the refusal-text follow-up, beside it on disjoint files after rc-u6 and rc-u16 commit (O48, O49); then rc-u9. rc-u16 launches after rc-u14 and rc-u15 both commit (O46). rc-a3 ran on the tree rc-u14 committed, its timed run alone on a quiet host, and its reading meets its threshold (O48); rc-a3b and rc-u16 therefore launch together, and only rc-u6 waits for rc-a3b's commit on its own acceptance, because both write `src/core/ledgers/Classifier.ts`, `src/core/ledgers/types.ts`, and `src/core/ledgers/Ledger.ts` (O50, O51, O54). rc-a3b appends its helpers after the last declaration of `tests/setup.ts` and of `tests/setup.test.ts`, and its only `tests/guides.test.ts` line is its internal class's entry in the `INTERNAL` array after `'class LedgerPass'`; rc-u16 re-reads those regions before each patch. Each rc-a3b bench run launches with rc-u16 paused at a green phase boundary for the length of the slot, its diff digest recorded at slot start and end, and a slot whose digest changes is void and reruns; rc-u16's runner requests wait while it runs (O50, O54, O55). One runner lane runs every check. rc-nd1 runs beside rc-u14 and rc-u15 as the one writer in the `@orkestrel/ndjson` checkout, and the Orchestrator's `@orkestrel/ndjson` 0.0.15 release visit follows its acceptance; rc-u17 launches after rc-u15 and rc-u16 commit and runs late in S8, immediately before rc-d1 (O47; § Breaking).
- rc-u14 launches right after rc-u13 commits (O41); rc-u15 launches after rc-u13 commits (O42) and builds § Relay ownership as approved, with the default refusal of every undeclared page tool definition the user kept (O46; `plan.md` § Decisions, Q16).
- `plan.md` § Parallelism holds the writer chains, and the rc-d1 row of `plan.md` § Units holds the guide prose the four units leave to it (O44).
- rc-u16's estimate is 360 writer minutes; it stops and reports at 570 (O43, O49).

## Deferred

The boundary rounds and rulings defer these items. Each row's trigger is the reopen condition; `plan.md` § Deferred carries the rows.

| Id | Item | Trigger | Source |
| --- | --- | --- | --- |
| D52 | A conversation-level lease, so two agents, or two hydrated instances of one id, cannot run on one conversation at the same time; rc-u14's guard is per agent | an application runs two agents on one conversation | topic A; O41 |
| D53 | Run or conversation identity on emitter events, beside D28; a run's own `events` carry it meanwhile | an application forwards emitter events per request on a shared agent | topic A; O41 |
| D54 | A relay `prepare` hook for per-request system text or tool policy; a handler built per request covers per-user text | an application needs per-request relay policy a per-request handler cannot express | topic B; O42 |
| D55 | `turn`, `exhaust`, and `start` frames on the page wire | a page needs step or run-start progress | topic C; O34 |
| D56 | An exported `isAgentJobInput` and a job shape that bounds the depth of `children` | a queue store or HTTP handler in an application needs one | the first round's job question; O34 |
| D58 | An `ask` frame in place for a handler that enters the approver after an await; such an ask is refused as `unanswered` | an application composes an asynchronous gate before its approver and needs its frame in place | O39 |
| D59 | A heartbeat frame on the page wire | a deployment's idle timeout is shorter than its approval latency | O39 |
| D60 | Approval prose or a summary the server writes into the `ask` frame (`reason` or a `render` option) | an application needs approval text the zone and the arguments cannot carry | O39 |
| D61 | A workspace pointer per conversation, which races as the active-conversation pointer did before rc-u14 | an application needs a workspace per conversation | O41 |
| D62 | The run's conversation for the `remember` tool's `MemoOrigin`; tools receive only `{ signal }`; with D20 and D23 | the toolbox wave carries `remember` | O41 |
| D63 | A conversation removed while a run on it is open: the run's held instance still receives the reply | a host removes a conversation while a run on it is open | O41 |
| D65 | An operator policy over the relay `options` (`think`, `schema`) that a page sends, which a relay forwards with the history under the operator's credential | an operator must pin reasoning or structured output under its credential | the 2026-11-01 review; O46 |
| D66 | The ledger tool residual: a run on `ledger.agent` naming another conversation still reaches the ledger's `recall` and lookup tools, which read `ledger.conversation` | D62, or an application that runs `ledger.agent` on a second thread | the 2026-11-01 parser re-evaluation and route verification; Q18 |

- D66 records both closure mechanisms the rounds found (§ Review, B1 and B2). The run's abort signal reaches the selection handler and every tool handler (the `AgentInterface` remarks in `src/core/agents/types.ts`; the `SelectionHandler` and `select` docs in `src/core/contexts/types.ts`): the ledger records in a `WeakSet` the signal its `#select` sees for its own conversation, and `recall` and each lookup check that set first; the cost is that a run with no selection, or under a host scope that replaces `select`, loses those tools. `ToolContext.caller`, the consumer-asserted identity `@orkestrel/tool` declares, is the other carrier, and it also serves D62. The agent-wide listener residual (`#pending` filing, `usage`, and `turn` in `src/core/ledgers/Ledger.ts`) stays with D53, and D28 keeps its own row, because it concerns `AuthorityContext`.

- O41's item "two agents on one conversation" is D52, with the second round's trigger "an application runs two agents on one conversation"; the relay `prepare` hook is D54.
- D52 stays deferred (O46): a per-request `Agent` leaves overlap on one thread unguarded, so both server fences hold one `Agent` per principal, and the guard still covers one process only.
- D21 (durable approval), D27 (approver text to the model), D28 (run or agent identity in `AuthorityContext`), D29 (approval with edited arguments), and D30 (an ask deadline apart from the run `timeout`) stay deferred (O36, O39); D28 stays deferred because rc-u14 makes one `Agent` serve one principal. D22 and D31 keep content filtering and delimiting. D20 and D23 keep the `remember` tool and `untrusted` on `AuthorityContext`.
- D55 dropped `ask` from the second round's deferred frames: the live `ask` wire ships in rc-u16 (Q14).
- D57 (the advertised-name guard widened from the `ask` verdict to every verdict) closed into rc-u16, Agent 0.0.35, on the user's Q15 ruling (O45, § Page wire).
- D64 (a run that appends its own user turn, so a fence neither appends nor removes it) opened into rc-u16, Agent 0.0.35, on the user's Q20 ruling, as `AgentRunOptions.prompt`, for the run-owned append only (O48, § Run binding). The kept tail is no deferral: it stays a stated limit with an executed proof, because a run that rejects, aborts, or times out before any assistant append still leaves its user turn as the thread's tail.

## Breaking

This design adds these entries to the 0.0.35 release notes (`plan.md` § Release). The notes also name the entries other designs own: `extractTokens` and `LedgerTokenSet` renamed `extractLiterals` and `LiteralSet` (rc-u2); the blank-digest refusal (rc-u1); the single denial-note form (rc-a14); the owner-record trim order (rc-u5); `matchEntities` taking the alias index in place of the registry, the read-once timing of a write during a pair-phase await, and the `LedgerLookup.read` call count (rc-a3b, O54); and frozen records from `JudgmentManager` reads, `add`, and `resolve` when rc-u19 lands (rc-u19, O54, O55). `designs/records.md` § CPU cost and memoization owns the rc-a3b and rc-u19 entries, and `plan.md` § Release holds every entry (O48). No changes list goes in the guide.

Breaking:

- A stored `system` role is refused at every ingress (`add`, a snapshot hydrate, the job seed, and a selection) with `ConversationError` `'ROLE'` or `'SNAPSHOT'`; `MessageInput.role` narrows to `ConversationRole`; `ConversationErrorCode` gains `'ROLE'` and `'SNAPSHOT'`; `ConversationManager.open` rejects a stored snapshot that holds a `system` message, where 0.0.34 hydrated it and sent the stored message in place (rc-u13, O37).
- `AgentContextInterface.select` takes the conversation as its first parameter (rc-u14).
- A second live run on one conversation instance is refused with `AgentError` `'CONCURRENCY'`, a ledger's direct run during `respond` included (rc-u14).
- `createRelay` refuses a page `system` message and an undeclared tool definition by default with status 422 until `RelayOptions.system` or `RelayOptions.tools` admits them (rc-u15).
- `AgentChunk` gains an `ask` arm: stream consumers see one more chunk per asked call, and an exhaustive switch stops compiling; no exhaustive consumer exists in Agent, Ollama, Toolbox, or Study (rc-u16, O39).
- A call whose name no definition advertises that turn is denied with the scope note before the authority evaluates it, under every verdict, and its `deny` event carries no decision, as a scope miss's does. 0.0.34 passed such a call to the authority's rules in every case and answered an allowed one with `ToolManager`'s own unknown-tool failure, and rc-a14's `ask` passed an asked one to the approver; the change breaks only a host that relied on the unknown-tool text or evaluated unknown names (rc-u16, Q15, O45).
- The scope note reads `it is not one of the listed tools. Use a listed tool or answer with what you have.`, and the refused note reads `it was refused. Do not call it again; continue without it.`; the host-facing deny reason `` `${call.name} is not in the active scope` `` is unchanged (rc-u16, Q22, O48; `designs/authority.md` § Denial notes).
- A throw from a provider's framing seam, its parser's `parse` or the provider's `finish`, that is not already a `ProviderError` or `ProviderAbortError` and races no cancel rejects as `ProviderError` `'PROTOCOL'` with the throw as `cause`, where 0.0.34 passed it to the caller unchanged; a throw from `read`, `frame`, or `clear` still reaches the caller unchanged (rc-u17, O47; § Review, A3).

Additions, none breaking:

- `CONVERSATION_ROLES`, `ConversationRole`, `requireRole`, and `requireConversationSnapshot` (rc-u13).
- `AgentRunOptions.conversation`, a run bound to the conversation active at its call (a defect fix), `AgentContextInterface.messages` widened to `ConversationInterface`, `requireConversation`, and `isConversation` (rc-u14).
- `RelaySystemOptions`, `RelayToolOptions`, `RelayRefusal`, `RelayRefusalReason`, `REFUSED_RELAY_STATUS`, `REFUSED_RELAY_CONTENT_TYPE`, `buildRelayRequest`, and `describeRelayRefusal` (rc-u15).
- The "Page to Node agent" wire contract: `AgentFrame`, `AgentPrompt`, and `AgentAnswer`; `agentFrameShape`, `agentPromptShape`, `agentAnswerShape`, and `tokenUsageShape`; `agentFrameContract`, `agentPromptContract`, and `agentAnswerContract`; `agentChunkToFrame`, `agentResultToFrame`, `agentStreamToFrames`, and `renderArguments`; `Approver`, `ApproverInterface` with `ask` as a bound `AuthorityHandler` property, so `ask: approver.ask` wires it, and `createApprover`, with live `ask` frames (rc-u16, O48).
- `AgentRunOptions.prompt`, which one guarded statement in `Agent#stream` checks against `agentPromptContract` before the run's guards, adding no public name (O49); the run appends the prompt as its own user turn, so a server fence neither appends nor removes it; the tail-read form stays the default when `prompt` is absent (rc-u16, Q20, O48). `agentChunkToFrame` returning `AgentFrame | undefined` and the required approver parameter of `agentStreamToFrames` ship in the same release as topic C, so nothing published changes.
- `RelayProviderOptions.parser` is optional: absent, `RelayProvider` frames each body with a fresh `createNDJSONParser({ strict: true })`, so a line that is not JSON or not an object rejects as `ProviderError` `'PROTOCOL'` with the `NDJSONError` as `cause`, and a supplied factory still wins. Agent declares `@orkestrel/ndjson` ^0.0.15 as a runtime dependency and adds no public name of its own (rc-u17, Q17, O47).

Release order and the known red window (`plan.md` § Release):

- `@orkestrel/ndjson` 0.0.15, rc-nd1's opt-in strict mode, publishes before Agent 0.0.35. No consumer moves when it publishes, because every fleet range on ndjson stays under 0.0.15 and a 0.0.x caret pins exactly (O47).
- rc-u17 runs late: after the campaign's last Study command that loads a profile's Ollama provider entry and after every unit whose acceptance names `test:studies`, immediately before rc-d1 in S8, with no interim Ollama or Study release (O47; § Review).
- From the install that puts `@orkestrel/ndjson` 0.0.15 in Agent's tree during rc-u17 (on the registry route, the install before its dependency commit; on the pin route, the install after the restore) until Agent's closing development re-pin, `test:studies` fails exactly `loads the actual q4 native topology with two distinct captured Agent occurrences` (`tests/studies/memory/integration.test.ts`), because the development `@orkestrel/ollama` 0.0.28 loads its nested `@orkestrel/ndjson` 0.0.14, which Study's artifact resolution refuses (`Artifact dependency is not admitted ESM`). rc-u17's brief, rc-d1's brief, and the 0.0.35 release record name the case under known failing commands, and no Study command that loads a provider entry runs in Agent in that window (O47).
- Agent's closing development re-pin is accepted only when `npm ls @orkestrel/ndjson --all`, run on the newest Node 22 release (`tenets.md` § Host, O18), lists one 0.0.15 and `test:studies` is fully green (O47).

Consumer migration in the release wave: `@orkestrel/ollama`'s live page gate (`tests/setupServer.ts`) and `@orkestrel/mcp`'s distribution fixture (`tests/fixtures/distributionServer.mjs`) mount a default `createRelay` and send page tools, so each sets `RelayOptions.system.accept` or moves its system text to the server (rc-u15, O42), declares its fixed page tools in `tools.definitions`, and sets `tools: { accept: true }` only where its page tools are not fixed, keeping one case that an undeclared page tool still answers 422 (`plan.md` § Decisions, Q16; O48).

The optional parser adds to that migration (O47; § Review, A7). At its 0.0.35-wave visit, Ollama re-pins `@orkestrel/agent ^0.0.35` and `@orkestrel/ndjson ^0.0.15` together. It deletes `parser: createNDJSONParser` and the fence's ndjson import from its relay fence (`guides/ollama.md`), replaces the sentence that Agent "declares no parser dependency" with one saying the relay provider frames with Agent's strict default and refuses a malformed frame as `ProviderError` `'PROTOCOL'`, drops the same parser lines from its tests and page module, and keeps `'ndjson'` in `IMPORT_MAP_PACKAGES`. In a separate acceptance inside that visit, measured first on the dedicated daemon port 11435, `OllamaProvider.frame` returns `createNDJSONParser({ strict: true })` (Q19), so a daemon line that is not JSON or not an object rejects as `ProviderError` `'PROTOCOL'` through Agent 0.0.35's engine translation; it catches neither the daemon's in-band `{"error": ...}` record nor a stream cut before `done`. mcp's distribution page fixture drops its parser under the same line, and its distribution composition moves `@orkestrel/ndjson@^0.0.14` to `^0.0.15` beside `@orkestrel/agent@^0.0.35`.
