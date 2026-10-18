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
| agent-r2 wave 1: T, P, C | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-t-sonnet-1`, `agent-r2-p-sonnet-1`, `agent-r2-c-sonnet-1` | `tmp/units/agent-r2-wave1-brief.md` |
| scaffold-fix-b2 | builder | Claude Sonnet 5.5 high | native Workflow | `wf_7e19bf2c-9da` | `tmp/units/scaffold-fix-b2-brief.md` |
| budget-fix-3 (build, gate) | builder, verifier | Claude Sonnet 5.5 high; Claude Haiku 5.5 | native Workflow | `wf_4e7ced2b-834` | `tmp/units/budget-fix-3-brief.md` |
| scaffold-fix-verify | verifier | Claude Haiku 5.5 | native Workflow | `wf_23c86f09-0a5` | inline |
| agent-r2 wave-1 integration (apply, verify) | builder, verifier | Claude Sonnet 5.5; Claude Haiku 5.5 | native Workflow | `wf_4d9f782f-0dd` | `tmp/units/agent-r2-wave1-patches.md` |
| agent-r2-H | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-h-sonnet-1` | `tmp/units/agent-r2-h-brief.md` |
| agent-r2-A | opus | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-a-opus-1` | `tmp/units/agent-r2-a-brief.md` |
| study-fix-4-falsify objective | analyst | GPT-6 Astra high | T3 `delegate_task` | `study-fix-4-falsify-objective-astra-1` | `tmp/units/study-fix-4-falsify-brief.md` |
| study-fix-4-falsify subjective | reviewer | Claude Opus 5.5 high | native Workflow | `wf_fe735657-fe7` | `tmp/units/study-fix-4-falsify-brief.md` |
| local-pin into Agent (budget `4d74195`, Study `422d549` copy) | Orchestrator | none | `tmp/units/local-pin.ts` | receipt `tmp/units/local-pin-agent-*.json` | none |
| study-fix-4-falsify objective, attempt 1 | analyst | GPT-6 Astra high | T3 `delegate_task` | `study-fix-4-falsify-objective-astra-1` | refused: "Selected model is at capacity"; bench re-probed live (session `01a14ef9-0f22-7c42-87b5-364ccf791ca5`) |
| study-fix-4-falsify objective, attempt 2 (disclosed re-run) | analyst | GPT-6 Astra high | T3 `delegate_task` | `study-fix-4-falsify-objective-astra-2` | `tmp/units/study-fix-4-falsify-brief.md` |
| scaffold-fix-b3 | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-b3-sonnet-1` | `tmp/units/scaffold-fix-b3-brief.md` |
| study-fix-5 | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `study-fix-5-sonnet-1` | `tmp/units/study-fix-5-brief.md` |
| local-pin into Study (budget `4d74195`; copies of the 10-16 staged Agent, Ollama, MCP) | Orchestrator | none | `tmp/units/local-pin.ts` | receipt `tmp/units/local-pin-study-*.json` | none |
| study-naming-a | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `study-naming-a-sonnet-1` | `tmp/units/study-naming-a-brief.md` |
| agent-r2 wave-2 integration (A patch applied by the Orchestrator; P guide patches; verify) | builder, verifier | Claude Sonnet 5.5; Claude Haiku 5.5 | native Workflow | `wf_87b00dc9-c1c` | `tmp/units/agent-r2-a-shared.patch`, `tmp/units/agent-r2-wave1-patches.md` |
| agent-r2-K | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-k-sonnet-1` | `tmp/units/agent-r2-wave3kl-brief.md` |
| agent-r2-L | opus | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-l-opus-1` | `tmp/units/agent-r2-wave3kl-brief.md` |
| study-naming-a-verify | verifier | Claude Haiku 5.5 | native Workflow | `wf_3032c12d-257` | inline |
| scaffold-fix-b3 verify | verifier | Claude Haiku 5.5 | native Workflow | `wf_c570acfa-374` | inline (`GATE: PASS`) |
| scaffold-fix-falsify objective | analyst | GPT-6 Astra high | T3 `delegate_task` | `scaffold-fix-falsify-objective-astra-1` | `tmp/units/scaffold-fix-falsify-brief.md` |
| scaffold-fix-falsify subjective | reviewer | Claude Opus 5.5 high | native Workflow | `wf_52564f99-6d1` | `tmp/units/scaffold-fix-falsify-brief.md` |
| local-pin restage of Study `983dba7` into Agent | Orchestrator | none | `tmp/units/local-pin.ts` (packs a pinned source with its registry ranges) | tarball `orkestrel-study-0.0.1-bba37038e8d2.tgz` | none |
| agent-r2-ST, agent-r2-SM | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-st-sonnet-1`, `agent-r2-sm-sonnet-1` | `tmp/units/agent-r2-wave3s-brief.md` |
| records-grok-label-import fix 2 | builder | Claude Sonnet 5.5 high | native Workflow | `wf_7d0ad5c7-0e1` | `tmp/units/records-grok-label-import-brief-2.md` |
| agent-r2-D | opus | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-d-opus-1` | `tmp/units/agent-r2-d-brief.md` |
| scaffold-fix-falsify reconcile (verdict `.orkestrel/scaffold/scaffold-fix-audit-verdict.md`; checkpoint `615ae1b72`) | Orchestrator | none | none | none | none |
| scaffold-fix-c | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-c-sonnet-1` | `tmp/units/scaffold-fix-c-brief.md` |
| scaffold-fix-c-instruments | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-c-instruments-sonnet-1` | `tmp/units/scaffold-fix-c-instruments-brief.md` |
| agent-r2 tree-wide gates and scan ruling | verifier, checker | Claude Haiku 5.5 high; Claude Sonnet 5.5 high | native Workflow | `wf_96801f75-3f8` | `tmp/units/agent-round-2-plan.md` § 4 (inline) |
| agent-r2-census | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `agent-r2-census-astra-1` | `tmp/units/agent-r2-census-brief.md` |
| agent-r2 gates 7 and 8 under absolute pins (manifest swap, restored byte-identical) | Orchestrator | none | none | none | `tmp/units/agent-r2-verify.md` |
| agent-r2-falsify objective | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `agent-r2-falsify-objective-astra-1` | `tmp/units/agent-r2-falsify-brief.md` |
| agent-r2-falsify subjective (three lenses and a synthesizer, in the child's own Workflow) | reviewer | Claude Opus 5.5 ultracode | T3 `delegate_task` (claudeAgent) | `agent-r2-falsify-subjective-opus-1` | `tmp/units/agent-r2-falsify-brief.md` |
| local-pin-absolute | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `local-pin-absolute-sonnet-1` | `tmp/units/local-pin-absolute-brief.md` |
| scaffold-fix-c integration (Orchestrator: the C8 clause at `src/core/types.ts:291` and `tests/setupPolicy.ts:3918`, both found by the unit's deviation 4) | Orchestrator | none | none | none | none |
