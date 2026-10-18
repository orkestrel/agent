# Routing ledger: fleet campaign of 2026-10-17

Every dispatch, its engine, and any bench substitution. Plan: `.orkestrel/plan.md`.

| Unit | Role | Engine | Transport | Id | Brief |
| --- | --- | --- | --- | --- | --- |
| bench probe | driver | Codex `gpt-6-astra` | `bench.ts --codex` | session `01a14cd6-e19f-7681-95ac-1b923f7d6c0e` | none |
| bench probe | driver | Cursor `grok-4.7-xhigh` | `bench.ts --cursor` | session `2e8af759-282c-4b87-9904-5ff0ab471c80` | none |
| bench probe | scout | Claude Haiku 5.5 | native `Explore` | none | none |
| bindings-rule-3-review | analyst | GPT-6 Astra xhigh | T3 `delegate_task` | `bindings-rule-3-review-astra-1` | `tmp/units/bindings-rule-3-review-brief.md` |
| bindings-rule-3-census-scaffold | grok | Grok 4.7 xhigh | T3 `delegate_task` | `bindings-rule-3-census-scaffold-grok-1` | `tmp/units/bindings-rule-3-census-scaffold-brief.md` |
| bindings-rule-3-census-agent | analyst | GPT-6 Astra high | T3 `delegate_task` | `bindings-rule-3-census-agent-astra-1` | `tmp/units/bindings-rule-3-census-agent-brief.md` |
| bindings-rule-3-census-study | analyst | GPT-6 Astra high | T3 `delegate_task` | `bindings-rule-3-census-study-astra-1` | `tmp/units/bindings-rule-3-census-study-brief.md` |
| bindings-rule-3-census-budget | analyst | GPT-6 Astra high | T3 `delegate_task` | `bindings-rule-3-census-budget-astra-1` | `tmp/units/bindings-rule-3-census-budget-brief.md` |
| records-grok-label-import | builder | Claude Sonnet 5.5 | native Workflow | `wf_1a27ca76-2af` | `tmp/units/records-grok-label-import-brief.md` |
| local-pin | builder | Claude Sonnet 5.5 | native Workflow | `wf_c5e90d98-bdc` | `tmp/units/local-pin-brief.md` |
| scaffold-fix-design | planner | Claude Opus 5.5 high | native Workflow | `wf_9621d7af-3e6` | `tmp/units/scaffold-fix-design-brief.md` |
| budget-sweep (build, gate) | builder, verifier | Claude Sonnet 5.5 high; Claude Haiku 5.5 | native Workflow | `wf_70cf6f1e-56f` | `tmp/units/budget-sweep-brief.md` |
| records-grok-label-import-review | analyst | GPT-6 Astra high | T3 `delegate_task` | `records-grok-label-import-review-astra-1` | `tmp/units/records-grok-label-import-review-brief.md` |
| bindings-rule-4 (revision) | planner | Claude Opus 5.5 max | native Workflow | `wf_3a1f0954-2c0` | `tmp/units/bindings-rule-4-brief.md` |
| agent-round-2-plan | planner | Claude Opus 5.5 high | native Workflow | `wf_7013ca49-53d` | `tmp/units/agent-round-2-plan-brief.md` |
| budget-u1-falsify objective | analyst | GPT-6 Astra high | T3 `delegate_task` | `budget-u1-falsify-objective-astra-1` | `tmp/units/budget-u1-falsify-objective-brief.md` |
| budget-u1-falsify subjective | reviewer | Claude Opus 5.5 high | native Workflow | `wf_94c286f3-7d9` | `tmp/units/budget-u1-falsify-subjective-brief.md` |
| budget-fleet-survey | grok | Grok 4.7 xhigh | T3 `delegate_task` | `budget-fleet-survey-grok-1` | `tmp/units/budget-fleet-survey-brief.md` |
| budget-fix-2 (build, gate) | builder, verifier | Claude Sonnet 5.5 high; Claude Haiku 5.5 | native Workflow | `wf_9579df76-91b` | `tmp/units/budget-fix-2-brief.md` |
| scaffold-fix-a | opus | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-a-opus-1` | `tmp/units/scaffold-fix-a-brief.md` |
| scaffold-fix-b | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-b-sonnet-1` | `tmp/units/scaffold-fix-b-brief.md` |
| bindings-rule-4-review | analyst | GPT-6 Astra xhigh | T3 `delegate_task` | `bindings-rule-4-review-astra-1` | `tmp/units/bindings-rule-4-review-brief.md` |
| budget-fix-2-review | analyst | GPT-6 Astra high | T3 `delegate_task` | `budget-fix-2-review-astra-1` | `tmp/units/budget-fix-2-review-brief.md` |
| study-fix-4 | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `study-fix-4-sonnet-1` | `tmp/units/study-fix-4-brief.md` |
| records-grok-label-import fix 2 | builder | Claude Sonnet 5.5 high | native Workflow | `wf_7d0ad5c7-0e1` | `tmp/units/records-grok-label-import-brief-2.md` |
