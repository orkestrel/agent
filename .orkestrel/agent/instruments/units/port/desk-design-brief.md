# Unit desk-design — Design the desk's move to the ledger with strategy, model, and thinking toggles

## Role and engine

`planner` on Claude Opus 5.5, read-only, subjective lane. Executor: NATIVE_SUBAGENT. You design; you edit nothing.

## Objective

Design how the desk at `/home/user/desk` (branch `claude/confident-maxwell-6nd0f3`) serves its agent through the ported ledger, and adds three controls a desk user sets per thread so the desk shows the measured methods side by side:

- **Context strategy:** Records (the ledger, `createLedger`), Full view (the agent over the whole thread), and Compaction (the agent with the conversation's compaction).
- **Model:** the 2B agent `qwen3.5:2b-q4_K_M` or the 4B agent `qwen3.5:4b-q4_K_M`.
- **Thinking:** off or on.

The desk is the showcase of the System One packages (reason, interpret, brief, qualifier, rater, program, workflow) and of the ledger; a user must see from the start of a turn to its end what each strategy did: what the briefing held, what `recall` returned, the passes, the thinking, the tokens, and the reply.

## Context

- **Desk.** `/home/user/desk`: `app/server/Desk.ts`, `app/server/constants.ts`, `app/server/parsers.ts`, `app/server/handlers.ts`, `app/core/constants.ts`, `app/vue/App.vue` and its components, and the desk's tests. Its agent model is `AGENT_MODEL` in `app/core/constants.ts`.
- **Adoption sites.** `/home/user/agent-port/tmp/units/records-port-planner.md` § 6 lists the sites; `/home/user/agent-port/tmp/units/records-port-plan.md` rules T8 (the desk's questions and thresholds) open for this unit.
- **Port API.** `/home/user/agent-port/src/core/ledgers/types.ts` and `/home/user/agent-port/guides/agent.md` § Serving a conversation through a ledger, at commit `7f346b5`. The answer pass always runs with thinking off; `predict` and `think` serve a thinking model.
- **Measured settings.** `/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md` (§ Arms, § Conditions) and `cap.md`:
  - records: window 3,072 and prompt share 0.7; with thinking, the window grows by the cap and the share shrinks so the prompt budget stays 2,150 tokens;
  - full view: window 6,144, grown by the cap with thinking;
  - compaction: window 3,072, summary `tuned`, window 1,600, keep 6, sections 3;
  - caps: 2,048 for the 2B and 1,024 for the 4B.
- **Results the desk can cite.** `FINAL-CHECK.md` § Thinking read and § The 4B read.
- **Law.** `/home/user/scaffold/AGENTS.md`, `/home/user/scaffold/.claude/rules/*`, and the desk's own `AGENTS.md` if present. The desk's earlier redesign followed the `enterprise-bootstrap` skill at `/home/user/scaffold/.agents/skills/enterprise-bootstrap/SKILL.md`; keep its visual language.

## Required

1. The server design: per-thread state, how each strategy builds its agent, how model and thinking map to options, where the ledger's judge, topics, questions, and thresholds come from (rule T8), and how a turn's receipts reach the page.
2. The page design: where the three controls sit, how a user sees each strategy's turn end to end, and what stays the same.
3. Units, each with its owned files, engine, gates, and order, written for one writer in the desk checkout. The desk builds against the published `@orkestrel/agent`; name what waits on the release.
4. Risks, each with the reading that settles it.

## Output

The design, the units, and the risks, citing `file:line` for each claim about existing code. No process diary.
