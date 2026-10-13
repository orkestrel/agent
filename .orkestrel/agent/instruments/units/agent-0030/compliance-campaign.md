# Compliance and trim campaign for @orkestrel/agent 0.0.30 (2026-10-10)

## Outcomes

- Every package-owned file conforms to `../scaffold/AGENTS.md` and the scaffold 0.0.100 rules it maps.
- `tests/setupLedger.ts` and `tests/setupLedger.test.ts` fold into `tests/setup.ts` and `tests/setup.test.ts`, the host-independent setup module and its proof that `.claude/rules/tests.md` names.
- The 0.0.30 surface carries only what the measured ledger method, the desk, and `@orkestrel/ollama` use.
- The live port's requests stay byte-identical: `bench4/Driver.mjs --dry` passes on copies 1 to 8, and one live copy matches its recorded wire under `compare-wires.mjs`.

## Scope

- In: `src/core/**`, `tests/src/**`, `tests/setup*.ts` except `tests/setupPolicy.ts`, `tests/guides.test.ts`, `tests/distribution.test.ts`, `guides/agent.md`, `guides/README.md`, `README.md`, and `package.json`.
- Out: the files the scaffold visit overwrites (`scaffold audit --offline` groups them as content-owned or presence-owned) and the vendored dependency guide mirrors under `guides/`.

## Hosts

Linux (this container). The Windows reading is the other session's publish gate.

## Dirty files at the start

None. HEAD is c04eea4 on `claude/confident-maxwell-6nd0f3`, pushed.

## Acceptance evidence

- Every confirmed audit finding is closed or ruled out of scope with a reason.
- `npm run prepublishOnly` passes, read bare.
- The desk passes `check`, `test:app`, and its journey suite against a packed build.
- One `orkestrel-falsify` round on the integrated diff.

## Routing ledger

- 2026-10-10: the trim audit and the aggregate design survey lanes ran on the Haiku `distiller` while the Cursor Grok bench was live (probe answered READY, 38,270 ms). This deviates from `.agents/orchestration.md` § Routing; later absorption lanes go to `grok`.
- 2026-10-10: the design round ran the `planner` (Opus 5.5) and the `analyst` (GPT-6 Astra, read-only Codex, session 01a1266d-a6f5-75e3-b903-3cfa829efd0c, 525,248 ms) blind on `compliance-design-brief.md`; `compliance-plan.md` reconciles them.
- 2026-10-10: the planner's `astra` implementation units (U4, U5, U6, IG) run on `opus`, because the Codex transport refuses a second writer in the checkout and phase 2 runs six writers at once; U8 runs on `builder`.
