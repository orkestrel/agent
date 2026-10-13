# Compliance campaign rulings (2026-10-10)

The audit is in `compliance-audit.json` (`confirmed`, `refuted`, `critic`); the test-file supplement lands in `compliance-audit-tests.json`. The trims are in `trim-rulings.md`. These rulings settle what the audit left open.

## Conflicts

- C1: the setup helpers take `{verb}{Noun}` names (`AGENTS.md` § Design laws, Self-describing helpers; `.claude/rules/tests.md` § helper names): `turnParts` becomes `splitTurn`, `addTool` becomes `createAddTool`, `loopTool` becomes `createLoopTool`.
- C2: `tests/src/core/agents/factories.test.ts:172` `loopTools` uses the setup module's `createLoopTool`; no second export.
- C3: the `conversationStore*` runners in `tests/setup.ts` take the verb `exercise` (`exerciseConversationStoreRoundTrip` and its siblings).
- C4: `src/core/agents/helpers.ts:92` writes `4 characters per token` (`.claude/rules/writing.md` § Examples, numbers, abbreviations).

## Duplicates

Merge every pair the critic names before dispatch (`copyJSON` at `src/core/helpers.ts:223`, Gauge `fixed` and `left`, `tests/setupLedger.ts:1`, `tests/setup.test.ts:70`, `tests/setupLedger.test.ts:23`, the `tests/guides.test.ts:800` bindings, `conversations/types.ts:213` and `:376`, `agents/types.ts:507`, and `conversations/constants.ts:25`). One unit owns each repair.

## Deferred

- `package.json` `@orkestrel/scaffold` `^0.0.99` to `^0.0.100`: 0.0.100 is not on the registry (`npm view @orkestrel/scaffold version` reads 0.0.99 on 2026-10-10). The other session holds scaffold's publish authority; the release visit re-pins and overwrites when it lands.

## Shared files

`guides/agent.md`, `guides/README.md`, `tests/setup.ts`, `tests/setup.test.ts`, `tests/guides.test.ts`, `src/core/index.ts`, and each module's `index.ts` are shared. A unit that needs a change there returns the exact patch; one integration unit per shared file applies them serially.
