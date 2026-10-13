Role: analyst on GPT-6 Astra, the objective lane of a two-lane design round (an Opus planner runs the same brief blind). Weigh correctness, constraints, consumer breakage, and test sufficiency most heavily, and still rule on every item the brief lists. Read-only; your final message is the plan in the brief's return shape.

# Design brief: the 0.0.30 compliance and trim campaign for @orkestrel/agent

## Objective

Produce one implementation plan that brings every package-owned file of `/home/user/agent-release` (branch claude/confident-maxwell-6nd0f3, version 0.0.30, unpublished) into compliance with `/home/user/scaffold/AGENTS.md` and the rules it maps (scaffold 0.0.100, `/home/user/scaffold/.claude/rules/`), and applies the ruled trims, in bounded units with disjoint owned files. You design; you write no file except your report. Send no request to 127.0.0.1:11434.

## Evidence (read in this order)

1. `tmp/units/compliance-campaign.md`: outcomes, scope, exclusions, acceptance evidence.
2. `tmp/units/trim-rulings.md`: trims R1 to R7 (R5 removes the stock selection handler and its closure; R7 removes the conversation rollup), the keeps, the prose corrections T1 to T4 and NEW-1 to NEW-4, and the proof that the measured bytes stay (the recorded-wire replay at `tmp/probes/ledger-replay.test.ts`, 108 of 108 at c04eea4).
3. `tmp/units/compliance-rulings.md`: conflict rulings C1 to C4, duplicates to merge, the deferred scaffold range, and the shared-file protocol.
4. `tmp/units/compliance-audit.json`: `confirmed` (326 findings, each with file, line, law, fix), `critic.missed` (12), `critic.gaps`, and `refuted` (do not resurrect a refuted finding).
5. A supplementary audit of the test files no lane read whole is running; its confirmed findings land in `tmp/units/compliance-audit-tests.json`. Plan for them: every test file has an owning unit, and that unit applies the supplementary findings for its files.
6. The source, tests, `guides/agent.md`, `guides/README.md`, `README.md`, and `package.json` themselves, to verify any finding you rely on.

Consumers that a public change can break: the desk (`/home/user/desk/app`), `@orkestrel/ollama` (`/home/user/ollama/src`, which extends `AgentProvider` and `AgentJudge`), and the measured live driver (`/home/user/scaffold/.orkestrel/agent/instruments/bench4/Driver.mjs`) and the aggregate harness (`/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/seams.ts` lists the seams it relies on). The registry's 0.0.29 surface is the published contract (`npm pack @orkestrel/agent@0.0.29`); 0.0.30 creates the ledger, selection, judgment, and thinking surfaces.

## What the plan must decide

1. The deduplicated finding set, keyed by file and line, with each finding assigned to exactly one unit. List every finding you reject on verification, with the reason.
2. Every public rename or removal the findings or trims imply (for example `RunOutcome` to `RunResult`), its consumer blast radius in the desk, ollama, and the harness, and whether it lands in 0.0.30. A rename that breaks a consumer lands only with that consumer's patch named.
3. The R7 snapshot ruling: whether a 0.0.29 `ConversationSnapshot` that carries `summary` is refused by the validator or read without it.
4. The `tests/setupLedger.ts` fold into `tests/setup.ts` and `tests/setupLedger.test.ts` into `tests/setup.test.ts`.
5. Units: name, role (`builder` for a closed shape, `opus` for API shape, naming, or guide voice, `astra` for constraint-heavy objective work), owned files, the findings and trims each closes, dependencies, and parallel or serial order. Owned files are disjoint. The shared files in `compliance-rulings.md` take patches from units and one integration unit each, applied serially; `guides/agent.md` integrates last because its Summary cells must equal the final doc blocks.
6. Acceptance per unit, cheap first: the scoped commands (`npx vitest run --config vite.config.ts --project <project> <file>`, `npm run check:src:core`, `npm run test:guides`) and the finding-specific checks.
7. The exit criterion and the final gates: `npm run prepublishOnly` read bare; the recorded-wire replay 108 of 108; the desk's `check` and `test:app` against a packed build; `@orkestrel/ollama`'s check and tests against a packed build; `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/seams.ts` against a vendored build of the result.

## Return shape

A Markdown plan with sections: Rejected findings, Public changes and blast radius, R7 snapshot ruling, Units (one subsection per unit with role, owned files, closes, depends on, acceptance), Integration order, Exit criterion and gates, Risks. Cite file and line for every claim.

## Deviation contract

When a finding, trim, or ruling conflicts with a law or with a consumer, stop on that item, state expected, found, and evidence, and propose one resolution. Do not invent units for work the evidence does not support.
