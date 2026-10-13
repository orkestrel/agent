# S0 renames of `tests/setup.ts` exports (2026-10-10)

Phase-2 units update their imports from this list. `Importers` counts the files that name the old export outside `tests/setup.ts` and `tests/setup.test.ts`.

| Old name | New name | Importers |
| --- | --- | --- |
| `turnParts` | `splitTurn` | none outside setup |
| `addTool` | `createAddTool` | `tests/src/core/agents/Agent.test.ts`, `tests/src/core/agents/AgentRegistry.test.ts` |
| `loopTool` | `createLoopTool` | `tests/src/core/agents/Agent.test.ts`, `tests/src/core/agents/AgentRegistry.test.ts`, `tests/src/core/agents/factories.test.ts` (a local `loopTools` helper; C2 rules it to use `createLoopTool`) |
| `conversationStoreRoundTrip` | `exerciseConversationStoreRoundTrip` | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `conversationStoreUpsert` | `exerciseConversationStoreUpsert` | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `conversationStoreDeleteThenAbsent` | `exerciseConversationStoreDeleteThenAbsent` | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `conversationStoreDeleteAbsent` | `exerciseConversationStoreDeleteAbsent` | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `conversationStoreGetAbsent` | `exerciseConversationStoreGetAbsent` | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `conversationStoreTwoIds` | `exerciseConversationStoreTwoIds` | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `conversationStoreRoundTripExpectation` | `CONVERSATION_STORE_ROUND_TRIP_EXPECTATION` (frozen, lists frozen) | `MemoryConversationStore.test.ts`, `DatabaseConversationStore.test.ts` |
| `domainArgument` | `returnDomain` | `tests/src/core/contracts.test.ts`, `tests/src/core/providers/contracts.test.ts` |
| type `DeltasOf` | `DeltaFunction` | none outside setup (the `deltasOf` option key stays) |
| type `MakeConversationStore` | `ConversationStoreFunction` | none outside setup |
| type `BuildConversationSnapshot` | `ConversationSnapshotFunction` | none outside setup |
| `RecordedProvider.cancelled` (getter) | `RecordedProvider.aborted` | `tests/guides.test.ts:3392`, `tests/src/core/providers/RelayStream.test.ts:83`, `:218` (`body.cancelled` on `RecordedBody` stays) |
| `createStreamingRelayRequest(body, signal?)` | deleted; call `createRelayRequest(body, signal?)` with a `ReadableStream<Uint8Array>` body | `tests/src/core/providers/factories.test.ts:6`, `:20`, `:43` |

## Parameter and behavior changes with no export rename

- `exerciseConversationStore*` first parameter `makeStore` is `create`; positional callers need no change.
- `createRelayRequest` body type is `string | ReadableStream<Uint8Array>`; a stream body adds `duplex: 'half'`.
- `rejectTransportOnAbort` is `async` and awaits `waitForAbort`: a missing signal rejects instead of throwing synchronously, and an already-aborted signal rejects at once.

## New exports (no importer to update)

- `createFixtureStore` (moved from `tests/setup.test.ts`): a conforming in-memory `ConversationStoreInterface`.
- `compactSeedTurns(conversation)`: adds the `first`, `second`, `third` turns and compacts; `buildConversationSnapshot` and `seedConversation` call it.
- Types `ConversationStoreFunction` and `ConversationSnapshotFunction` (renames above).

## Not closed by S0 (owned by later units)

- `SequentialSystemOneJudge`, `ScriptedWire`, and `ScriptedJudge` keep `body`; U7 renames it to `encode` with the provider and judge types.
- The R5 selection fixtures (`createStockSelectionFixture`, `SELECTION_STAND_IN`, `answerNeededRequest`, and their imports) wait for U4.
- The R7 rollup lines (`rollup: true`, `summary` in `TOOL_SNAPSHOT`, the rollup assertions in `setup.test.ts`) wait for U5.
