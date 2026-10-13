# Unit aggregate-final-blind-b — Grade anonymized work against the original conversation and required actions

Read the governing instructions and original scenario to prepare the grading boundary, then wait for root to attach the public packet path and hash before grading. Return a readiness message after this preparation. Do not inspect any run or other campaign record while waiting.

## Role and engine

Analyst on GPT-6 Astra high through a clean Codex native agent. Executor: NATIVE_SUBAGENT.

## Objective

Grade every anonymous planned goal for semantic quality, actual required actions, and complete work without learning trajectory identities.

## Context

- **Evidence.** Root supplies one public packet generated from retained run rows and messages. Use the original authored scenario `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json` as the complete truth reference, including per-goal tools and source requirements. Packet replies and tool call/result text are exact retained values, with opaque per-run/goal IDs. Wait for the released packet path and SHA256 before grading.
- **Law.** `AGENTS.md`; `.agents/orchestration.md`; quality and writing rules under `.claude/rules/`; `.agents/skills/orkestrel-dispatch/SKILL.md`. This is a decision-bearing audit; read the permitted evidence yourself.
- **Installed primitives.** None required. Do not run an automatic pattern scorer or model.
- **Host.** Windows PowerShell at scaffold, local read-only evidence access. EVERY exec explicitly uses cwd C:/Users/mikes/WebstormProjects/scaffold. EVERY patch/write uses an absolute scaffold path. Write only your report and structured judgments under this unit's tmp/units prefix. Any temporary reader is TypeScript run by Node; no other script language or model call.
- **Standing conditions.** Another unit may continue inference elsewhere. Neither interact with that service nor inspect its artifacts.

## Unknowns

Arm, model, order, costs, and prior grades are deliberately hidden. Do not infer or recover identities. Report missing evidence instead of filling it from other campaign files.

## Scope

- **Owned.** Only tmp/units/aggregate-final-blind-b-judgments.json, tmp/units/aggregate-final-blind-b-report.md, and a temporary reader under the same prefix if needed. Preserve all other files.
- **Shared (read-only).** Only the public packet root supplies, the original scenario named here, and the governing instruction files.
- **Off-limits.** Private joins, run directories, request prompts, selected summaries, automatic scores, previous reports/grades, RESULTS, progress, plan, ledger, git history, model calls, source/build edits, and other audit answers.
- **Made false by this change.** None; return judgments only.
- **Tools and limits.** Read every supplied goal and its eligible evidence. Use seed indices from zero through goal.after inclusive; later corrections must not affect an earlier goal. The original reference may contain later material for other goals, so explicitly respect each boundary.

## Execution

Perform the assignment yourself and spawn nothing. Grade all planned rows, including failed and unattempted work, with no cherry-picking. Use the scenario's ledger.system as the actual protocol: recall replaces search_history, and the final message replaces send_reply. Do not require an unavailable send_reply tool. Use actual goal-local tool calls and results; seeded calls or recalled old results do not count as fresh actions.

Judge meaning and fulfilled requests, not substring matches. Treat corrections, withdrawn policies, unsupported additions, wrong current identifiers, and unanswered substantive questions as material. Distinguish an answer containing an earlier wrong value only to correct it from an answer asserting that value. Do not penalize equivalent date/amount formatting or optional details absent from the request. Preserve genuine ambiguity with explicit alternatives; do not prelabel any goal ambiguous.

Report semantic content, tool compliance under the controlling system-wide fresh-lookup requirement, and tool compliance under the narrower per-goal explicit lists separately. An omitted list does not silently waive the system rule. Treat generic desk-policy questions without an order/account reference according to their actual obligations. Distinguish composing a message from proven external delivery; if the protocol cannot represent a requested delivery, expose that limitation and any reasonable draft-only bound instead of claiming delivery occurred.

Keep g06 in raw judgments; root will also report the predeclared adjusted denominator excluding that protocol-sensitive goal. Grade it honestly, with no automatic pass or deletion. A failed or unattempted planned goal cannot count as completed work. Report any useful semantic content in a failed reply separately from its operational completion status.

## Output

Return one JSON judgment per opaque ID with status, semantic verdict (pass/fail/ambiguous/unattempted), system-tool verdict, listed-tool verdict, complete-work verdict, concise reason, and exact references to the packet and eligible scenario evidence. Include specific contradictory or missing facts/actions, not generic impressions. Preserve the ID unchanged. Write a Markdown report with evidence population, grading conventions, ambiguities, and limits. Do not group or total by a guessed arm.

Use a top-level JSON array. Each object has `id`, `status`, `semantic`, `systemTool`, `listedTool`, `completeWork`, `reason`, `eligibleSource`, and `references`. Copy `status` exactly from the packet. Set `eligibleSource.through` to the packet's inclusive seed boundary and `eligibleSource.goal` to the original scenario file followed by its JSON pointer to the authored goal object. Set `references.packet` and `references.scenario` to arrays of exact file paths followed by JSON pointers. Root will supply the packet path. Cite its exact reply/action fields and the eligible original seed rows that decide the verdict. Do not put arm labels or totals into judgments. Do not learn private join identities after sealing.

## Deviation contract

Stop only when required evidence is absent or malformed enough to prevent grading. Report exact affected IDs and missing evidence; continue independent rows where possible. Do not open private joins or another report to resolve uncertainty.

## Acceptance criteria

1. Every supplied planned ID appears exactly once with its retained operational status.
2. Every substantive verdict cites eligible conversation truth and actual reply/action evidence.
3. Content, system-wide actions, explicit-list actions, and completion remain separate; ambiguity and unavailable actions remain visible.
4. No arm identity, automatic score, prior grade, or later source fact supplies a judgment.

**Observations, not criteria.** Development quality alone cannot decide adoption or certify a held-out comparison.

**Measurement.** Blind semantic and action audit against the original authored conversation and exact retained work.

## Review evidence

Root will validate coverage, citations, and joins only after the judgments are sealed. The auditor never reads the private join map.
