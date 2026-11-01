# Request layout design

Agent sends one `system` message built from host inlets only, then one `user` context message, then the conversation, with the ledger's records written into a built copy of the request turn. This design covers the boundary and its inlets, the layout per configuration, the request turn, the context message, the literal strings, the shapes and their deletions, sampling, the canary, the layout readings, and the deferred items. `rc-u10` ships the move as a fix with no switch (O12, O15); `rc-u11` ships the vocabulary its reading keeps. Source locations name a symbol and its file as of `2da6d0b6`. Gates point at `designs/measurement.md` § Gates; deferrals point at `plan.md` § Deferred.

## Boundary

The `system` message carries host-authored text only: nothing a user wrote, a tool returned, a judge or summarizer produced, or a model wrote, a model-written memo included (O11).

- Agent's inlets to the `system` turn are four: the system text, the instructions with loaded skill bodies, the skill index, and the host-registered tool definitions. Ollama's qwen3.5 renderer writes the tools block inside the `system` turn (see the [Ollama qwen3.5 renderer at v0.40.13](https://raw.githubusercontent.com/ollama/ollama/v0.40.13/model/renderers/qwen35.go)).
- As of `2da6d0b6`, `AgentContext#build` (`src/core/contexts/AgentContext.ts`) also joins the workspace text and `Selection.briefing` into the `system` message, so a lookup reading and a user's rule sentence reach it through the ledger's `## Pinned` and `## Rules` text. rc-u10 removes both inlets.
- After rc-u10, `Selection` has no text member and `build` reads no other inlet, so a host adds `system` text only through `system`, `instructions.add`, a skill load, and the skill index.
- Agent's own paths store no `system` message: the loop stores `assistant` and `tool` messages (`Agent` in `src/core/agents/Agent.ts`), the ledger stores `user` notes (`Ledger` in `src/core/ledgers/Ledger.ts`), and a summary renders as `assistant` (`buildRecapMessage` in `src/core/conversations/helpers.ts`). Client JSON reaches a stored `system` role through `Conversation.add`, the job seed, a snapshot, and a selection until rc-u13 refuses it at every ingress (`plan.md` O37; D33 closed; `designs/boundary.md` § Stored roles).
- Tool definitions carry host text only. rc-t1's brief states it: no factory interpolates memo names, descriptions, or other stored text into a `description` (D20).
- Rely on the boundary for authorship, never for obedience: small models follow a system instruction less often than a user one (C36, C46), and the protection lives in the loop's checks (`designs/authority.md` § Principle).

## Final layout

Every configuration opens with the tools block inside the `system` turn, then:

| Position | Records arm, first pass of request k | Compaction arm (unchanged) | Plain agent |
| --- | --- | --- | --- |
| 1 `system` | host system text; after rc-u9 `\n\n## Instructions\n\n…`, then `\n\n## Skills\n\n- name: description` | `## Instructions\n\n` plus the `desk` instruction | system text when set, `## Instructions`, `## Skills` |
| 2 `user` context | absent in the Study; after rc-u9 `## Memos\n\n- name: description`, then `\n\n## Workspace\n\nFile: path` and the fence; minted id; never stored or folded | absent | `## Memos`, then `## Workspace`; present only when non-empty |
| 3 tail | seed arrivals `[Source id] content` and lookup stubs; after rc-a7 the most recent exchanges | one `assistant` recap per section, `[Summary of earlier messages] …`, then the live tail | `view()` |
| 4 request | `user`, a built copy: `## Records\n…\n\n## Rules\n- …\n\n## Request\n<prompt>`; the prompt verbatim when nothing renders; images attach here | `user`, the prompt | the last stored `user` message; images attach here |
| 5 run turns | `assistant` with calls, one `tool` body per call | same | same |

- The answer pass keeps positions 1 to 4 byte-identical, then sends the non-call `assistant` content, the `user` digest, and the `user` cue.
- Rendered for Qwen 3.5 2B with thinking off, the request turn is one user turn that ends in the user's words, followed by the assistant opener with an empty think block. It is the last user turn, so both renderers treat it as the query, and the text nearest generation is the request, then the rules, then the records.
- The proximity order follows the placement readings: the gold document nearest the question scored highest (C47), and a 3B model followed an instruction in the user turn 64% of the time against 8% in the system turn (C46).
- The compaction recap stays `assistant` (`designs/compaction.md` § Recap role).

## Request turn

rc-u10 writes the records into a built copy of the request turn: `${records}\n\n## Request\n${content}`.

- The stored request stays unchanged; the answer pass reuses the copy.
- Stored and sent bytes already differ: `Ledger#renderTailStub` sends a rewritten copy of a stored `tool` message under its own id, and rc-u4's replay compares selection messages that are already copies.
- One turn holds the records and the request: both renderers fold consecutive tool results into one user turn instead of emitting adjacent user turns (C43), and a separate records message would be the only adjacent `user` pair Agent emits on purpose. The separate message is rc-a16's remedy arm and the screen's contingency (D34).
- Images attach to the last `user` message (`attachUserImages` in `src/core/contexts/helpers.ts`), which is this turn.
- `LEDGER_NOTES.cue` names "the request", and the heading is `## Request`: one term in one place.
- Trim prices the system text, the tail, and the request copy.

## Context message

`build` emits one `user` message after `system`, with a minted id, holding the memos index and then the workspace text (rc-u9 head order).

- The message is never stored and never folded; it is absent when both sections are empty.
- Workspace text leaves `system` because the model edits workspace files through a tool (`guides/agent.md` § Giving the model documents to read), and memo text leaves it because the model writes memos (O11).
- Memos before workspace: a memo write invalidates the cached workspace text after it, and the other order invalidates memos on every file write (`designs/context.md` § AgentContext).
- The calibration pass sends the built head: `system`, then the context message, then `view()`. rc-u9's pricing fix covers calibration.
- Moving memos and workspace into the request turn waits for D32.

## Literal strings

Each string is judged for a 2B reader. A string that changes ships in the unit named.

| String | Site, role | Unit | Judgment |
| --- | --- | --- | --- |
| `${records}\n\n## Request\n${content}` | request turn, `user` | rc-u10 | a heading the cue can name; the task is the last text before generation |
| `## Records` replaces `## Pinned` | `Ledger#render`, `user` | rc-u10 (closes D18) | names what it holds; `Pinned` names an implementation act |
| `: result shown under Records below` replaces `: result shown under Pinned in the system message` | `renderStub`, `tool` | rc-u10 | names the heading the model sees, at its position |
| `… in these records.` replaces `… in this briefing.` in both amendment sentences | `renderLedgerAnnotation`, `user` | rc-u10 | the word `briefing` no longer names anything the model sees |
| `[N]` plus ` Changed later by [M].` or ` A later change is not shown.` replace `[Ledger source N]` and the two amendment sentences | same | rc-u11, when A2 reads within N of A1 | states the relation in words a reader can act on; no implementation noun |
| `Your lookups and recalls in this request returned:` replaces `LEDGER_NOTES.results` | `user` digest | rc-u11, same gate | no speaker tag; same fact |
| `Give your complete answer to the request now, from what you already have.` replaces `LEDGER_NOTES.cue` | `user` cue | rc-u11, same gate | names `## Request`; status-free, next step only |
| `Quoted from earlier messages and lookup results for this request.` after `## Records`; `Rules and corrections given earlier. Follow them.` after `## Rules`; `### Related` over non-owner units | `user` | rc-u11, only when A3 beats A2 by more than N on one reading | an addition earns its bytes or never lands |

- Drop `[Desk]` with rc-u11's strings: labels and speaker tags gain little or lose at 2B (D31).
- Keep unchanged: `## Instructions`, `## Workspace`, `File: `, `## Skills`, `## Memos`, `### <title>`, `- `, `${party}: `, `[Summary of earlier messages] `, `failed`, `no record`, the not-shown stub, every recall string, `LEDGER_NOTES.repeat` and `closure`, and the denial notes of `designs/authority.md` § Denial notes.

## Shapes

```ts
// src/core/contexts/types.ts
export interface Selection {
	/** Lists the messages `build` folds in place of `view()`, in prompt order: conversation parts only. */
	readonly messages: readonly Message[]
	readonly judgments: readonly string[]
	readonly usage?: TokenUsage
	readonly fault?: Error
	// `briefing` deleted; no shim
}
// AgentContextInterface: every signature unchanged. `build(selection?)` returns `[system?, context?, ...tail]`:
// `system` from the system text, the instructions section, and (rc-u9) the skills section; `context` a `user`
// message with a minted id from (rc-u9) the memos section and the workspace section; each omitted when empty.
// `ContextSectionFormat`, `renderSection`, `renderFencedFile`, `WORKSPACE_SECTION_HEADER`: shapes unchanged, TSDoc only.

// src/core/ledgers: `#plan` returns `Pick<Selection, 'messages'>` whose last element is the request copy;
// the answer-pass branch drops its `briefing` spread. `LedgerNote` is unchanged in rc-u10;
// rc-u11 adds `records` and `rules` only when the lead lines promote. No error code is added.
```

rc-u10 deletes in one change, with no shim:

- `Selection.briefing` in `src/core/contexts/types.ts`, and the briefing branch of `AgentContext#build`.
- The briefing members of `Ledger#plan` and `Ledger#select`, and the `LedgerOptions.system` remark that places the briefing in the system message (`src/core/ledgers/types.ts`).
- The `briefing` cases in `tests/src/core/agents/Agent.test.ts`, `tests/src/core/ledgers/Ledger.test.ts`, and `tests/guides.test.ts`, and the `tests/setup.ts` regions naming `briefing` or `## Workspace`.
- Every `guides/agent.md` passage that names `briefing` or places workspace text in the system message.

## Sampling

The Study pins the effective sampling values on every role; a value change is D38 (O13).

- rc-s1 adds `STUDY_MEMORY_SAMPLING` in `studies/memory/constants.ts`, one record per role (`agent`, `summary`, `judge`) carrying `temperature`, `seed`, `top_k`, `top_p`, `min_p`, `presence_penalty`, and `repeat_penalty`.
- The agent and summary records carry the `qwen3.5:2b-q4_K_M` stored values (`top_k` 20, `top_p` 0.95, `min_p` 0, `presence_penalty` 1.5, `repeat_penalty` 1; C44) under `temperature` 0 and `seed` 0. The judge record carries the values `/api/show` reports for the Mica v0.1 4B digest, with Ollama's defaults pinned where the model stores none (C45).
- `buildStudyMemoryRoles` in `studies/memory/helpers.ts` spreads each record into its role's options; a roles test asserts every role sends every key, and a missing key fails.
- A pin that changes a value is a hidden experiment, so the pin repeats what the daemon applies when a request omits a key (C45). rc-a9's sampling probes prove it, and every GPU step's run record carries the options as sent (`designs/measurement.md` § Recording).

## Canary

rc-u10's canary test proves the boundary on every path.

- Plant distinct sentinels in a user message, a tool result, a workspace file, a lookup reading filed onto an owner record, a `## Rules` sentence, a summarizer return, assistant content, and a scripted judge state.
- None appears in any `system` message of `build()`, a ledger first pass, an answer pass, a late request, or a fault path; the system-text and instruction sentinels do appear.
- Exactly one `system` message is sent, at index 0.
- On the unchanged tree the canary fails first on the workspace and briefing sentinels; pushing the records back into the `system` parts makes it fail again (mutation).
- rc-u9 adds memo name, description, and content sentinels and a skill description sentinel: the skill description appears in `system`, and the memo sentinels appear in the context message only.

## Layout readings

The ruling's cost is read one time, and no reading vetoes the ruling (O12). Every reading is study-only and leaves no switch in `src/`.

- rc-a9's render probe M3 compares `[system, A, B]` with `[system, A + '\n\n' + B]` at `num_predict` 1, each behind a unique random system prefix, by `prompt_eval_count`. A delta at or under 0 stops the recording and opens D34.
- rc-a16 replays every recorded first-pass request under six arms: A0 (the records moved into `system` by a string transform), S (A0 with the `\n\n` before the records replaced by `\n`), A1 (as recorded), A2 (A1 with rc-u11's replacements), A3 (A2 plus the gated lead lines), and R (A1 with the records as a separate `user` message before the request). It runs at `temperature` 0 with thinking off and the tools as recorded, and reads use (the reply names every id the records carry for an owner the request names) and re-acquisition (a `lookup` or `recall` for an id the records hold) by fixed predicate. N = 2·|S − A0|. Its gates are `designs/measurement.md` § Gates, row rc-a16.
- rc-a10 for rc-u10 screens the move against a Study transport rewrite that rebuilds the 0.0.34 placement: arm `system` appends the records block to `system` after `\n\n` and strips it from the request copy. The rewrite is deleted after the screen, and no screen returns records to `system` in what Agent ships (O12). On a failed gate the `separate` arm runs as the contingency. Its gates are `designs/measurement.md` § Gates, row rc-a10 for rc-u10.
- A 0.0.34 tree is no comparison arm: every S2 fix confounds it.

## Deferred

Each item's trigger lives in `plan.md` § Deferred.

- Memos and workspace in the request turn (D32).
- Records as a separate `user` message before the request (D34).
- The call head on owner-record lines from a lookup (D35).
- Digest and cue as one `user` message (D36).
- The compaction recap in the `user` role (D37).
- A sampling change for literal copying (D38): `presence_penalty` 1.5 is unmeasured against id copying at `temperature` 0.

## Refused

- A switch for the layout move (O12).
- A screen arm that returns records to `system` in what Agent ships (O12).
- Records in a late `system` message: Qwen 3.5's own chat template raises on a `system` message that is not first, though Ollama's renderer accepts it (C42).
