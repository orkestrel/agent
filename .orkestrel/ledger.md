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
| agent-r2 falsify reconcile (verdict `.orkestrel/agent/agent-r2-audit-verdict.md`; reproductions `tmp/probes/orchestrator-r2-repro.test.ts`) | Orchestrator | none | none | none | none |
| local-pin re-pin of Agent to absolute specs (same tarball hashes; `test:distribution` 9/9 on the real pins) | Orchestrator | none | `tmp/units/local-pin.ts` | receipt `tmp/units/local-pin-agent-*.json` | none |
| agent-r2 checkpoint `0192ced` (pins excluded) | Orchestrator | none | git | `0192ced` | none |
| scaffold-fix-c verify (build, instruments, controls, gates) | verifier | Claude Haiku 5.5 high | native Workflow | `wf_5f39527e-88f` | inline |
| agent-r2-fix FH2 (`selectRecords` holes; recorders in `ledgers/helpers.test.ts`) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-fix-fh2-sonnet-1` | `tmp/units/agent-r2-fix-fh2-brief.md` |
| agent-r2-fix FH integration (the Orchestrator applied FH's `Classifier.test.ts` hole-test patch: 19/19) | Orchestrator | none | none | none | none |
| agent-r2-fix integration (Orchestrator: FD's `AgentTurn` and `compact` doc patches; `validators.test.ts` getter member name for `tsc`) | Orchestrator | none | none | none | none |
| agent-r2-fix verify (tree-wide gates) | verifier | Claude Haiku 5.5 high | native Workflow | `wf_d9f983ac-d53` | inline |
| agent-r2-fix falsify (one lane) | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `agent-r2-fix-falsify-astra-1` | `tmp/units/agent-r2-fix-claims.md` |
| agent-r2-fix falsify reconcile (verdict `.orkestrel/agent/agent-r2-fix-audit-verdict.md`; claim 1 ruled approved B0; 3 and 5 reproduced) | Orchestrator | none | none | none | none |
| agent-r2-fix R5 (`AgentProvider.#assemble` sparse `tools`, from R1's sweep) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-fix-r5-sonnet-1` | inline |
| agent-r2 final gates before commit | verifier | Claude Haiku 5.5 high | native Workflow | `wf_ff334071-025` | inline |
| agent-r2 acceptance (Orchestrator: `helpers.test.ts` `ToolCall` type import from `@orkestrel/tool` for `tsc`; commit `53bfe20`) | Orchestrator | none | git | `53bfe20` | none |
| local-pin Agent `53bfe20` and budget into Study (absolute; Agent tarball `f22e76bd50c9`) and into Ollama | Orchestrator | none | `tmp/units/local-pin.ts` | receipts `tmp/units/local-pin-study-*.json`, `local-pin-ollama-*.json` | none |
| Study gates on Agent round 2 | verifier | Claude Haiku 5.5 high | native Workflow | `wf_5315eb3f-1ce` | inline |
| U4 Ollama | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `u4-ollama-sonnet-1` | `tmp/units/u4-ollama-brief.md` |
| U4 live re-run after the user re-pulled `tev1:0.8b`: dedicated daemon PID 40572 on 11435 (receipts `tmp/units/u4-daemon-2/daemon-{start,stop}.json`; stopped with runner children 12312 and 26904; 11434 untouched); judge 1/1; full `test:service` 80/80 | Orchestrator | Ollama 0.40.6 | PowerShell `Start-Process` | PID 40572 | none |
| U4 falsify reconcile (verdict `.orkestrel/ollama/u4-audit-verdict.md`; claim 5 inventory recorded; O1 reproduced) | Orchestrator | none | none | none | none |
| U4 final gates before commit | verifier | Claude Haiku 5.5 high | native Workflow | `wf_74f089e4-470` | inline (GATE PASS) |
| U4 accepted: Ollama commit `ba171bd` (pins excluded) | Orchestrator | none | git | `ba171bd` | none |
| local-pin Ollama `ba171bd` into Agent (devDependency, plus an `@orkestrel/agent` override to Agent's own tarball) and into Study | Orchestrator | none | `tmp/units/local-pin.ts` | receipts `tmp/units/local-pin-*.json` | none |
| restage gates, Agent and Study | verifier | Claude Haiku 5.5 high | native Workflow | `wf_9a7b9660-55b` | inline (GATE PASS both) |
| Ollama sweep OS-src, OS-setup, OS-store, OS-server, OS-service, OS-docs | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `os-{src,setup,store,server,service,docs}-sonnet-1` | `tmp/units/ollama-sweep-brief.md` |
| Ollama sweep OS-store-F (OS-store's D1 and D2) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `os-store-f-sonnet-1` | `tmp/units/os-store-f-brief.md` |
| Ollama sweep OS-place (OS-server's D4; placement moves and inventory) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `os-place-sonnet-1` | `tmp/units/os-place-brief.md` |
| Ollama sweep OS-hermetic (the `setup` project's daemon contact; OS-place leftovers) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `os-hermetic-sonnet-1` | `tmp/units/os-hermetic-brief.md` |
| scaffold-fix-d-verify (build and gates after round D) | verifier | Claude Haiku 5.5 | T3 `delegate_task` (claudeAgent) | `scaffold-fix-d-verify-haiku-1` | `tmp/units/scaffold-fix-d-verify-brief.md` |
| ollama-sweep-verify (build and gates, daemon-guarded) | verifier | Claude Haiku 5.5 | T3 `delegate_task` (claudeAgent) | `ollama-sweep-verify-haiku-1` | `tmp/units/ollama-sweep-verify-brief.md` |
| Ollama sweep falsify, objective | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `ollama-sweep-falsify-astra-1` | `tmp/units/ollama-sweep-falsify-brief.md` |
| Ollama sweep falsify, subjective | reviewer | Claude Opus 5.5 high (3 lenses + synthesizer) | native Workflow | `wf_50ab4b16-3c4` | `tmp/units/ollama-sweep-falsify-brief.md` |
| scaffold round 5 reproductions | builder (reproducer) | Claude Sonnet 5.5 high, 7 agents | native Workflow | `wf_e5417653-afc`, `wf_48b33d44-363` | inline |
| scaffold fix E1 (policy helpers, guide) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-e1-sonnet-1` | `tmp/units/scaffold-fix-e-brief.md` |
| scaffold fix E2 (lazy consumption in src) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-e2-sonnet-1` | `tmp/units/scaffold-fix-e-brief.md` |
| Ollama sweep falsify reproductions | builder (reproducer) | Claude Sonnet 5.5 high, 6 agents | native Workflow | `wf_5ca72aa3-030` | inline |
| Ollama fix OS-F-src | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-src-sonnet-1` | `tmp/units/ollama-fix-brief.md` |
| Ollama fix OS-F-store | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-store-sonnet-1` | `tmp/units/ollama-fix-brief.md` |
| Ollama fix OS-F-store-2 (thinking log reads) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-store2-sonnet-1` | `tmp/units/ollama-fix-brief.md` (shared sections) plus inline item |
| Ollama fix OS-F-server | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-server-sonnet-1` | `tmp/units/ollama-fix-brief.md` |
| ollama-fix-verify (build and gates after OS-F, daemon-guarded) | verifier | Claude Haiku 5.5 | T3 `delegate_task` (claudeAgent) | `ollama-fix-verify-haiku-1` | `tmp/units/ollama-fix-verify-brief.md` |
| Ollama fix OS-F-dist (baseline classifier test restore) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-dist-sonnet-1` | inline |
| Ollama sweep falsify round 2, objective | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `ollama-sweep-2-falsify-astra-1` | `tmp/units/ollama-sweep-2-falsify-brief.md` |
| Ollama sweep falsify round 2, subjective | reviewer | Claude Opus 5.5 high (3 lenses + synthesizer) | native Workflow | `wf_04d77175-c35` | `tmp/units/ollama-sweep-2-falsify-brief.md` |
| scaffold fix E2b (iterator protocol, loose ends) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-e2b-sonnet-1` | `tmp/units/scaffold-fix-e2b-brief.md` |
| Ollama round-2 reproductions | builder (reproducer) | Claude Sonnet 5.5 high, 4 agents | native Workflow | `wf_6d287199-478` | inline |
| Ollama fix OS-G-store | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-g-store-sonnet-1` | `tmp/units/ollama-fix-g-brief.md` |
| Ollama fix OS-G-main | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-g-main-sonnet-1` | `tmp/units/ollama-fix-g-brief.md` |
| Ollama fix OS-G-place (generic builders into setup.ts) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-g-place-sonnet-1` | inline |
| ollama-fix-g-verify (build and gates after OS-G, daemon-guarded) | verifier | Claude Haiku 5.5 | T3 `delegate_task` (claudeAgent) | `ollama-fix-g-verify-haiku-1` | `tmp/units/ollama-fix-g-verify-brief.md` |
| Ollama sweep falsify round 3, objective | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `ollama-sweep-3-falsify-astra-1` failed on model capacity before writing a verdict, and its three stray `objective-r3-*` probes were removed; retried as `ollama-sweep-3-falsify-astra-2`, which returned FAIL 1, 5, 7, 8, 9, 10 | `tmp/units/ollama-sweep-3-falsify-brief.md` |
| Ollama sweep falsify round 3, subjective | reviewer | Claude Opus 5.5 high (3 lenses + synthesizer) | native Workflow | `wf_8ef49df5-26c` | `tmp/units/ollama-sweep-3-falsify-brief.md` |
| Ollama fix OS-H (round-3 findings) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-fix-h-sonnet-1` | `tmp/units/ollama-fix-h-brief.md` |
| Ollama sweep closure check (exit rule) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `ollama-sweep-closure-astra-1` | `tmp/units/ollama-sweep-closure-brief.md` |
| Ollama closure FAIL 1 fixed (`setup.test.ts:615` count-only recorder: whole history asserted, mutant fails), gates rerun, commit `c7c611a`, restaged as `9a5756095d99` into Agent and Study | Orchestrator | none | none | none | none |
| ollama-probes-drift (follow-up: the series probes' 5 type errors, `wire-dump`'s removed `provider.body`) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `ollama-probes-drift-sonnet-1` | `tmp/units/ollama-probes-drift-brief.md` |
| scaffold-fix E3 accepted; F1 (`ignorePatterns`) fixed with `Iterator.from` and a 7-row pin (fails before, passes after); approvals rebound; both instruments exit 0; `PARALLEL.md` build note; build and gates green (`tmp/units/scaffold-f1/gates/`) | Orchestrator | none | none | none | none |
| scaffold closure check (exit rule) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `scaffold-closure-astra-1` (task prefix `3d4d1248-2da1-4e90-ab33-36fd648f2775`) | `tmp/units/scaffold-closure-brief.md` |
| scaffold fix F (closure B1: `length + 1` step budgets truncate replaced iterators; one generator helper, cardinality shapes across the differential) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-f-sonnet-1` | `tmp/units/scaffold-fix-f-brief.md` |
| scaffold fix F accepted (B1 witnesses pass; `iterateAnswers` mutants killed; closure probes deleted; `test:skills` 108) | Orchestrator | none | none | none | none |
| scaffold closure re-check 2 (F only) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `scaffold-closure-astra-2` (task prefix `46ceac7a-0d12-4308-a958-391c03966f7b`) | `tmp/units/scaffold-closure-2-brief.md` |
| scaffold closure re-check 2 FAIL 2 (B2: the `iterateAnswers` `@throws` form, `typescript.md:217`) fixed by the Orchestrator (doc-only); build and gates rerun (`tmp/units/scaffold-f1/gates-final/`) | Orchestrator | none | none | none | none |
| study-admission-timing (follow-up: the custody deadline equals the test's 25 ms request bound; widen the margin, proven under load) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `study-admission-timing-sonnet-1` | `tmp/units/study-admission-timing-brief.md` |
| study-admission-timing accepted, Study commit `65e0188` (tests only) | Orchestrator | none | none | none | none |
| scaffold chain accepted: final gates green (src:core 582 on quiet reruns), commit `4d67f0f32`, hash written to `PARALLEL.md` | Orchestrator | none | none | none | none |
| scaffold-local-pins | opus | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-local-pins-opus-1` | `tmp/units/scaffold-local-pins-brief.md` |
| scaffold-local-pins review (one falsify lane, claims 1–9) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `scaffold-local-pins-review-astra-1` (task prefix `a92302b2-6ed8-4f54-b212-57429f1e4406`) | `tmp/units/scaffold-local-pins-review-brief.md` |
| scaffold-local-pins review: FAIL 2, 3, 4, 7, 8, 9. B1 status by basename; B2 an override that installs nothing; B3 override placement with no predecessor; B4 the no-ledger pack guard; B5 restore drops an empty `overrides`; B6 `item` names (19, confirmed); F1 no write-order test. The review probe directory was removed by the Orchestrator (git-ignored) | Orchestrator | none | none | none | none |
| scaffold-local-pins-fix (B1–B6, F1) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-local-pins-fix-sonnet-1` | `tmp/units/scaffold-local-pins-fix-brief.md` |
| scaffold-local-pins-fix returned (`tmp/units/scaffold-local-pins-fix-report.md`): B1–B6 and F1 fixed, each test red before and green after; plus D1, a restore that kept the lockfile's `file:` entry, found through new loopback-registry fixtures; 10 mutants each fail; full gates rerun (`tmp/units/scaffold-local-pins-gates-2/`) | Orchestrator | none | none | none | none |
| scaffold-local-pins closure check (B1–B6, F1, D1) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `scaffold-local-pins-closure-astra-1` (task prefix `b7cce64e-61f3-4030-ab81-16a7e88d23cd`) | `tmp/units/scaffold-local-pins-closure-brief.md` |
| scaffold-local-pins closure: B1, B2, B3, B5, B6, F1 and the fixture CLOSED. Still OPEN: B4 (a bare `tmp/tarballs/x.tgz` spec slips past the guard) and D1's containment (a ledger override key `../x` made restore delete outside `node_modules`). Probes removed by the Orchestrator with Node `rmSync` (paths past `MAX_PATH`) | Orchestrator | none | none | none | none |
| scaffold-local-pins-fix-2 (B4, D1 containment) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-local-pins-fix-2-sonnet-1` | `tmp/units/scaffold-local-pins-fix-2-brief.md` |
| scaffold-local-pins accepted: full quiet gates green (src:core 582, src:server 527, src:bin 349, policy 121, config 280, setup 378, skills 122, guides 47, templates 64, distribution 11; emission 0); committed `8cc944140` on branch `local-pins` so the Veneer session's U1 (`2cc1ded7a`) stays a fast-forward; `PARALLEL.md` answered (local-pins rides 0.0.102; this session carries the fleet re-pin after the publish) | Orchestrator | none | none | none | none |
| local-pins rebased onto Veneer U1 in worktree `scaffold/tmp/worktrees/local-pins` (`main` untouched): `cb5745417` on `2cc1ded7a`; only `host.json` conflicted, regenerated by build (200 entries); full gates running (`tmp/units/scaffold-rebase-gates/`); the Veneer session had not fast-forwarded after 110 minutes | Orchestrator | none | none | none | none |
| rebased local-pins gates green: src:core 586, src:server 528, src:bin 350, policy 121, config 280, setup 378 (after creating the worktree's `tmp/`), skills 122, guides 47, templates 64, distribution 11. **Observation:** the `createDistributionScratch` test (present at `1f2eed70e`) needs `<root>/tmp` to exist, so a fresh clone fails it | Orchestrator | none | none | none | none |
| scaffold-serve-hoist (worktree `local-pins`) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-serve-hoist-sonnet-1` (task prefix `2235e9cb-3b2b-4b10-8233-53d70fcdb240`) | `tmp/units/scaffold-serve-hoist-brief.md` |
| serve hoist accepted: `createServedList` in `tests/setup.ts`, 4 proofs, 12 callers repointed, and the mutant fails every cardinality pin; committed `5ae2e8d8f` on `local-pins` (`2cc1ded7a` → `cb5745417` → `5ae2e8d8f`); `PARALLEL.md` offers Veneer one fast-forward of `main` to `5ae2e8d8f`, or the two-window order | Orchestrator | none | none | none | none |
| scaffold-local-pins-fix-2 accepted (`tmp/units/scaffold-local-pins-fix-2-report.md`): B4 follows npm-package-arg (19 local and 17 remote forms); D1 validates names and contains deletions before any write (a linked scope is caught); the closure reproductions are pinned; 16 mutants each fail a test; full quiet gates rerun (`tmp/units/scaffold-local-pins-gates-3/`) | Orchestrator | none | none | none | none |
| scaffold fix E2c (in-contract residuals, iterator return) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-e2c-sonnet-1` | `tmp/units/scaffold-fix-e2c-brief.md` |
| scaffold fix E3 (instruments, class-method cases) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-e3-sonnet-1` | `tmp/units/scaffold-fix-e3-brief.md` |
| scaffold falsify round 5, objective | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `scaffold-fix-d-falsify-astra-1` | `tmp/units/scaffold-fix-d-falsify-brief.md` |
| scaffold falsify round 5, subjective | reviewer | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-d-falsify-opus-1` | `tmp/units/scaffold-fix-d-falsify-brief.md` |
| Study accepted: commit `c1a289f` (pins excluded); restaged into Agent (Study tarball `62b0c34f2995`; Agent check, setup 175 and studies 100 green) | Orchestrator | none | git, `tmp/units/local-pin.ts` | `c1a289f` | none |
| SB-study-F (grading traversal laziness; StudyChannel reply-id capture) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `sb-study-fix-sonnet-1` | inline (the review's prescriptions, verbatim) |
| SB-study falsify (one lane) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `sb-study-falsify-astra-1` | `tmp/units/sb-study-claims.md` |
| SB-budget check, then commit `a26ff9a` | checker | Claude Haiku 5.5 high | native Workflow | `wf_7129a0f7-3cf` | inline (pass) |
| SB-study, SB-budget (recorder sweep; hole and catch-boundary differential sweep against `ca81174` / `edd3553`) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `sb-study-sonnet-1`, `sb-budget-sonnet-1` | `tmp/units/study-budget-sweep-brief.md` |
| U4-F integration (Orchestrator: `budget.test.ts:142` duplicate prompt to `LONG_ANSWER_PROMPT`) | Orchestrator | none | none | none | none |
| U4-F (fixtures into `tests/setup.ts`) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `u4-ollama-fix-sonnet-1` | inline (the verdict's O1 prescription) |
| U4 falsify (one lane) | analyst | GPT-6 Astra high | T3 `delegate_task` (codex) | `u4-ollama-falsify-astra-1` | `tmp/units/u4-ollama-claims.md` |
| U4 live proof: dedicated daemon PID 45292 on 11435 (receipts `tmp/units/u4-daemon/daemon-{start,stop}.json`; stopped with its two runner children; 11434 untouched); `tests/service/budget.test.ts` 9/9; full `test:service` 79/80 (1 environmental: `tev1:0.8b` model format) | Orchestrator | Ollama 0.40.6, `qwen3.5:2b-q4_K_M` | PowerShell `Start-Process` | PID 45292 | `tmp/units/u4-ollama-brief.md` |
| local-pin Study's Ollama and MCP copies to absolute (same hashes; Study `test:distribution` 10/10) | Orchestrator | none | `tmp/units/local-pin.ts` | receipt `tmp/units/local-pin-study-*.json` | none |
| agent-r2-fix R1–R4 (builders, then independent mutation checkers) | builder, checker | Claude Sonnet 5.5 high; Claude Haiku 5.5 high | native Workflow | `wf_a6af27b8-cde` | the verdict's § Fix items |
| scaffold-fix falsify round 4 reconcile (FAIL 1, 5, 6, 7, 8, 10; 6 and 7 reproduced by reading; claim 1 wording) | Orchestrator | none | none | none | none |
| scaffold-fix D2/D3 accepted (28 hole fixes, mutation-proved; the Orchestrator applied D2's `config.test.ts` patch: 239 pass, only the stale host inventory red; `environmentBoundary` partial config ruled contract-violating) | Orchestrator | none | none | none | none |
| scaffold `PARALLEL.md` reply to the Veneer session (`@orkestrel/test` 0.0.26) and this session's hold section | Orchestrator | none | scaffold `PARALLEL.md` | none | none |
| scaffold-fix D4 instruments | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-d4-sonnet-1` | `tmp/units/scaffold-fix-d-brief.md` (D4 addendum) |
| scaffold-fix D1 accepted (82 655-observation differential, 0 mismatches; 7 fixes, each mutation-proved) | Orchestrator | none | none | none | none |
| scaffold-fix D1, D2 (with D3) | builder | Claude Sonnet 5.5 high | T3 `delegate_task` (claudeAgent) | `scaffold-fix-d1-sonnet-1`, `scaffold-fix-d2-sonnet-1` | `tmp/units/scaffold-fix-d-brief.md` |
| scaffold-fix-c falsify round 4 (one lane, claims 1–10) | analyst | GPT-6 Astra xhigh | T3 `delegate_task` (codex) | `scaffold-fix-c-falsify-astra-1` | `tmp/units/scaffold-fix-c-claims.md` |
| scaffold-fix-c9 (census, one builder per file, independent check) | checker, builder, checker | Claude Sonnet 5.5 high; Claude Sonnet 5.5 high; Claude Haiku 5.5 high | native Workflow | `wf_eaf21bbd-c18` | the scaffold verdict's § Added after the round |
| agent-r2-fix FD (wave 2) | opus | Claude Opus 5.5 high | T3 `delegate_task` (claudeAgent) | `agent-r2-fix-fd-opus-1` | `tmp/units/agent-r2-fix-brief.md` (D1 and FD addendum) |
| agent-r2-fix FS (wave 2: census, one builder per file, independent check) | checker, builder, checker | Claude Sonnet 5.5 high; Claude Sonnet 5.5 high; Claude Haiku 5.5 high | native Workflow | `wf_f4a508f1-b76` | `tmp/units/agent-r2-fix-fs-brief.md` |
| agent-r2-fix FA, FH, FL, FT (wave 1) | opus, builder | Claude Opus 5.5 high (FA); Claude Sonnet 5.5 high (FH, FL, FT) | T3 `delegate_task` (claudeAgent) | `agent-r2-fix-fa-opus-1`, `agent-r2-fix-fh-sonnet-1`, `agent-r2-fix-fl-sonnet-1`, `agent-r2-fix-ft-sonnet-1` | `tmp/units/agent-r2-fix-brief.md` |
| fleet-repair (budget; Agent stopped on `file:../study`) | builder | Claude Sonnet 5.5 high | native Workflow | `wf_cf065744-c24` | `tmp/units/fleet-repair-brief.md` |
| fleet-repair (Agent, under the temporary-floor ruling; stopped on the `swap.ts` pack guard) | builder | Claude Sonnet 5.5 high | native Workflow | `wf_1663e825-08b` | `tmp/units/fleet-repair-brief.md` (2026-10-19 rulings) |
| fleet-repair (Agent re-pin, gates, commit `e8cdcba`) | Orchestrator | Claude Opus 5.5 | direct | `tmp/units/swap-agent-2026-10-19T13-55-05-266Z.json`; `local-pin.ts` Agent row | `tmp/units/fleet-repair-brief.md` (Agent as a source) |
| fleet-repair (Ollama `3ddedba`, Study `4d97e8d`, Agent refresh) | builder | Claude Sonnet 5.5 high | native Workflow | `wf_f2962025-c28` | `tmp/units/fleet-repair-brief.md` |
| realign (seven read lanes, planner, critic) | analyst, planner, reviewer | Claude Opus 5.5 (messages, records, compaction, plan, critic); Claude Sonnet 5.5 (studies, budget, boost); Claude Haiku 5.5 (bindings census) | native Workflow | `wf_70cdc1b9-ec6` | the workflow prompts; reports `tmp/units/realign/*.md` |
| mine-series-ideas (Claude sessions, Codex threads, catalogue) | analyst | Claude Opus 5.5 (Claude sessions, catalogue); Claude Sonnet 5.5 (Codex threads through T3 `t3_thread_read`) | native Workflow | `wf_7ba22958-cf3` | the workflow prompts; `tmp/units/realign/ideas.md` |
| boost-ladder-design (four evidence lanes, planner, critic) | analyst, planner, reviewer | Claude Sonnet 5.5 high (evidence); Claude Opus 5.5 high (ladder, critic) | native Workflow | `wf_c72480fe-dfa` | the workflow prompts; `tmp/units/ladder/*.md` |
