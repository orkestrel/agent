export const meta = {
  name: 'agent-0030-phase2',
  description: 'Phase 2 of the 0.0.30 compliance campaign: the six module units close their findings and trims and write shared-file patches',
  phases: [{ title: 'Modules', detail: 'U6, U5, U4, U3, U7, U2' }],
}

const R = '/home/user/agent-release'
const P = `${R}/tmp/units`

function brief(unit, section, role, files, extra) {
  return `Role: ${role === 'opus' ? 'opus on Claude Opus 5.5' : 'builder on Claude Sonnet 5.5'}. You perform the work yourself and spawn nothing.
Checkout: ${R} (branch claude/confident-maxwell-6nd0f3, @orkestrel/agent 0.0.30). Its laws are /home/user/scaffold/AGENTS.md and the rule files under /home/user/scaffold/.claude/rules/ the rule map scopes to your paths (read them first).
Unit: ${unit}. Phase 1 has landed (commit 1b5ede0): U1 relocated Reading, copyJSON (src/core/cloners.ts), isMessage, collectExchanges, collectToolGroups, matchesJudgment, Judgment, and JudgmentInput, and S0 renamed setup exports per ${P}/patches/S0/renames.md. Update every import in your owned files to those names and locations.
Read in order: ${P}/compliance-plan.md (binding; it overrides the plans it reconciles, including its name table), the section '${section}' in ${P}/compliance-plan-planner.md (your brief), ${P}/compliance-rulings.md, ${P}/trim-rulings.md, and each finding your brief cites in ${P}/compliance-audit.json (confirmed entries and critic.missed, matched by file and line; line numbers can have shifted after phase 1, so find the code by content and verify each finding before repairing it). If ${P}/compliance-audit-tests.json exists when you finish, apply its confirmed findings for your owned files too; otherwise a second pass follows later.
${extra}
Owned files: ${files.join(', ')}. Write nothing else. Shared files (tests/setup.ts, tests/setup.test.ts, tests/guides.test.ts, guides/agent.md, guides/README.md, README.md, src/core/index.ts, and every module index.ts) take patches: write each as a unified diff applicable with \`git apply\` from ${R} to ${P}/patches/${unit}/<file-with-slashes-as-dashes>.diff. A reference to one of your renamed or removed symbols inside another unit's owned files takes the same kind of patch, named xref-<file>.diff. For guides/agent.md, give each changed Summary cell as the exact new TSDoc description paragraph, with each {@link} written as its code token.
Refuse and report instead of doing: an install, a package.json edit, a commit or push, git checkout/restore/stash/reset/clean, a tree-wide lint --fix or format, an edit to a file you do not own, deleting a file you did not create (except deletions your brief names), and any request to 127.0.0.1:11434. Five other units write other files in this checkout at the same time.
Validate scoped to your files, read bare: \`npx vitest run --config vite.config.ts --project src:core <your test files>\`, \`npx oxlint --config .oxlintrc.json --deny-warnings <your files>\`, \`npx oxfmt --config .oxfmtrc.json --check <your files>\`, and \`npx tsc --noEmit -p configs/src/tsconfig.core.json\`. A failure caused only by a pending shared-file patch is expected; name the patch it waits on.
Return: files written, patch files written, each command with its exit code and summary line, every finding closed by file:line, every finding not closed with expected / found / evidence, and any ruling you need.`
}

const S = (d) => [`${R}/src/core/${d}/**`, `${R}/tests/src/core/${d}/**`]
const UNITS = [
  ['U6', '### U6 ledgers (with R1–R4 and the setup fold)', 'opus', [...S('ledgers'), `${R}/tests/setupLedger.ts (deleted)`, `${R}/tests/setupLedger.test.ts (deleted)`, `${R}/tmp/probes/ledger-replay-support.ts`, `${R}/tmp/probes/ledger-replay.test.ts`, `${R}/tmp/probes/ledger-replay-compare.ts`], 'The setup fold moves every tests/setupLedger.ts declaration into tests/setup.ts as one S patch and both describe blocks into tests/setup.test.ts; repoint the ledger tests to the setup module; delete both setupLedger files. After your changes, the replay probe (`npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts`) must read 108 passed once S applies your patch; report its reading in your checkout state too.'],
  ['U5', '### U5 conversations (with R7 and the snapshot ruling)', 'opus', S('conversations'), 'R7 removes the conversation rollup; the snapshot ruling reads a 0.0.29 snapshot without its summary. Add the snapshot proof the plan names.'],
  ['U4', '### U4 contexts (with R5 and R6)', 'opus', S('contexts'), 'R5 removes the stock selection handler and its closure; R6 removes Scope.description. Delete an emptied kind file and its mirrored test, and send the barrel row removal to B as a patch.'],
  ['U3', '### U3 agents', 'opus', S('agents'), 'RunOutcome becomes AgentRunResult (compliance-plan.md); handleAgentQueueJob and handleAgentRunnerJob keep their names; Channel #buffer takes copy-on-write.'],
  ['U7', '### U7 providers', 'opus', S('providers'), 'body becomes encode and readHeaders becomes buildProviderHeaders (compliance-plan.md).'],
  ['U2', '### U2 root', 'builder', [`${R}/src/core/{types,helpers,validators,cloners,constants,errors,contracts,shapers}.ts`, `${R}/tests/src/core/{helpers,validators,cloners,contracts,shapers,integration}.test.ts`], ''],
]
const out = await parallel(UNITS.map(([unit, section, role, files, extra]) => () =>
  agent(brief(unit, section, role, files, extra), { label: `build:${unit}`, phase: 'Modules', agentType: role, model: role === 'opus' ? 'opus' : 'sonnet', effort: 'high' }).then((report) => ({ unit, report }))))
return { units: out.filter(Boolean) }
