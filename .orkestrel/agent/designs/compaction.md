# Compaction design

Compaction stays the common long-conversation strategy. This design covers its one fix, the shared literal vocabulary, the anchor capability, rule retention, recall, repeat loops, and the deferred items. Source locations name a symbol and its file as of `1e82d145`.

## Plug-in surface

Compaction still plugs in through `summarize` and `window`. The campaign adds one option (`literals`) and one error code (`'SUMMARY'`), and no `Strategy` interface: both strategies already plug in through `Selection` and `window`.

Compaction and the ledger share exactly two seams: `extractLiterals` and `LiteralSet` at the environment root (the anchors and the ledger's id sets), and `ConversationSnapshot`, which `LedgerSnapshot` embeds (`designs/records.md` § Ledger snapshot).

| Item | Ships as | Unit |
| --- | --- | --- |
| blank digest becomes a section | fix | rc-u1 |
| `extractTokens` and `LedgerTokenSet` named for model tokens | fix (vocabulary) | rc-u2 |
| recaps omit literals | experiment-shaped capability | rc-e1 |
| rule retention over rounds | documentation, instrument later | rc-d1; D3 |
| rolling omission persists | covered by anchors; no second mechanism | rc-e1 |
| accumulation until `WINDOW` | no change; the two-section cap stays excluded | none |
| cache-safe summarizer call | deferred | D1 |
| masking old tool results | deferred | D2 |
| recall over folded originals | study-only experiment, after rc-e1 | rc-a5 |
| repeated identical lookups | an authority rule in the Study arm; no core switch | rc-s1; D5 |

## Blank-digest refusal

`Conversation#fold` stores whatever string the summarizer returns as `Section.summary`, and the overflow merge does the same; a blank digest still removes its slice from `view()` (`Conversation` in `src/core/conversations/Conversation.ts`). The early rolling run left most of its recaps empty (`research/evidence.md` § Prior-campaign readings).

`rc-u1` refuses a blank digest:

```ts
export type ConversationErrorCode = 'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT' | 'KEEP' | 'SUMMARY'
```

- A fold digest whose trimmed text is empty rejects with `ConversationError('SUMMARY', …)`. Nothing commits: the live tail and the sections stay unchanged, and no event fires.
- A blank overflow-merge digest rejects under the same rule and leaves the appended section, matching the merge-throw semantics the type remarks state.
- The agent's automatic path is unchanged: it emits `fault`, then a lenient run dispatches over the window and a strict run rethrows the summarizer's error (`Agent` in `src/core/agents/Agent.ts`).
- The Study summarizer already rejects blank text, so no study arm moves. A host run that finished with an empty recap can stop with an error instead, and a capacity reading can move.
- A host summarizer that wants a fallback digest writes one; the policy stays in the host.

## Literal vocabulary

"Token" means a model token everywhere else in the package (`estimateTokens`, `TokenUsage`, `MESSAGE_TOKEN_OVERHEAD`). The ledger's id-and-number reader uses the word in a second sense, and anchors add a second module that needs the reader.

`rc-u2` moves the reader to the environment root:

```ts
// src/core/types.ts
/** Holds the ids and numbers one text carries, copied verbatim. */
export interface LiteralSet {
	readonly ids: ReadonlySet<string> // hyphenated runs that contain a digit, uppercased
	readonly numbers: ReadonlySet<number> // the other numbers
}

// src/core/helpers.ts
export function extractLiterals(text: string): LiteralSet
```

- `extractTokens` leaves `src/core/ledgers/helpers.ts` and `LedgerTokenSet` leaves `src/core/ledgers/types.ts`; every caller and guide row moves in the same change, with no shim.
- Briefing bytes stay identical.

## Anchored recaps

`rc-e1` adds an extractor option to the conversation:

```ts
export type LiteralExtractor = (text: string) => LiteralSet

export interface ConversationOptions {
	// existing members unchanged
	/** Anchors each recap with the literals of its folded messages that the summary lacks. Default: no anchors. */
	readonly literals?: LiteralExtractor
}
```

- When an extractor is set, `buildRecapMessage` appends the literals of `section.messages` that the summary text does not contain, in a deterministic order, capped in count.
- Derive the anchors at render; store nothing on `Section`, in the snapshot, or in a validator. The originals already live on `Section.messages`, so removal leaves no stored data.
- Anchors change bytes only when a fold changes the section, so they are cache-neutral.
- A rolling fold sends prior recaps to the summarizer, so anchors also present omitted literals to the next digest. That is the only rolling-omission repair the evidence supports.
- Ship no default extractor: which literals matter is domain policy. The Study passes `extractLiterals`.
- The first cut anchors ids only; rc-p1 (a) decides whether numbers join.
- An absent option changes nothing. The recap-literals reading (`research/evidence.md` § Prior-campaign readings) and C01 motivate the change; C02 shows retention is not continuation, so a quality screen gates promotion (`designs/measurement.md` § Gates, row rc-e1).
- On promotion, `literals` stays as a capability with the Study compaction arm as its first consumer. On any other outcome, delete the option, the render branch, its constant, and its tests.

## Rule retention

- Instructions never fold, so a rule placed in an instruction survives every compaction round (C09). rc-d1 states this in the guide.
- Rule decay across rounds is measured elsewhere (C03). The rule-retention instrument joins rc-a8 when rc-e1 promotes or a unit's gate names it, and verbatim rule pins wait for a measured loss (D3).

## Recall over folded originals

`rc-a5` gives the Study compaction arm a recall tool that searches section originals through the public `Conversation#search`.

- Build it in `studies/memory`, never in `src/`; removal reverts the study wiring and touches no package surface.
- It targets closures without evidence and fabricated completions in the compaction arm (`research/evidence.md` § Prior-campaign readings, c1 results). Its known cost is re-acquisition (C06).
- It runs after rc-e1's reading, with one compaction experiment on the GPU at a time.
- Promote it into `src/` only for a second consumer.

## Repeat loops

The plain agent loop lacks the ledger's repeat stop, and the compaction arm recorded identical-lookup loops (`research/evidence.md` § Prior-campaign readings, repeat loops).

- Add no `AgentOptions.distinct` and no core repeat-stop switch.
- In the Study compaction arm, rc-s1 adds an authority rule whose matcher holds a per-run `Set` of tool name and canonical arguments, reset on the agent's `start` event, with a static `reason` that orients the model: the earlier result is in the conversation; answer from it or call something else.
- `AuthorityContext` carries the call, and `AuthorityRule.reason` carries the text (`src/core/agents/types.ts`), so the rule needs no core change.
- The ledger already owns a repeat stop (`LedgerRequest.admit`); a loop switch would be a second implementation of one concept.
- Whether this arm becomes the compaction baseline is the user's decision (Q2). A core stop reopens on D5.

## Deferred

- Cache-safe summarizer prefix (D1): the summarizer would send the agent's last dispatched prefix plus a final instruction. That needs a public change to `ConversationSummaryHandler` (`src/core/conversations/types.ts`); `ConversationSummaryHandler` keeps its `(messages, signal?)` shape until the trigger. The summary-cache reading and C27 motivate it.
- Masking old tool results (D2): the supporting evidence is coding-agent only and the masking window is tuned to one agent (C05).

## Guide drifts

rc-d1 corrects two drifts in `guides/agent.md`:

- The guide says automatic compaction never folds existing sections; `rolling` and a `sections` cap fold them.
- The guide shows `consumer: estimateMessages`; the loop consumes a `ProviderRequest`, and the option remarks name `estimateRequest`.
