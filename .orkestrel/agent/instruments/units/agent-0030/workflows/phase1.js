export const meta = {
  name: 'agent-0030-phase1',
  description: 'Phase 1 of the 0.0.30 compliance campaign: relocate shared declarations, repair the distribution proof, apply the barrel row, run the setup pass',
  phases: [
    { title: 'Relocate', detail: 'U1 relocation and U8 distribution in parallel' },
    { title: 'Barrel', detail: 'B applies the cloners barrel row' },
    { title: 'Setup', detail: 'S0 setup pass' },
  ],
}

const R = '/home/user/agent-release'
const P = `${R}/tmp/units`

function brief(unit, role, files, extra) {
  return `Role: ${role === 'opus' ? 'opus on Claude Opus 5.5' : 'builder on Claude Sonnet 5.5'}. You perform the work yourself and spawn nothing.
Checkout: ${R} (branch claude/confident-maxwell-6nd0f3, @orkestrel/agent 0.0.30). Its laws are /home/user/scaffold/AGENTS.md and the rule files under /home/user/scaffold/.claude/rules/ that the rule map scopes to your paths (read them first).
Unit: ${unit}.
Read in order: ${P}/compliance-plan.md (binding; it overrides the plans it reconciles), the section '### ${unit}' or the unit named ${unit} in ${P}/compliance-plan-planner.md (your brief), ${P}/compliance-rulings.md, ${P}/trim-rulings.md, and the findings your brief cites in ${P}/compliance-audit.json (confirmed entries and critic.missed, matched by file and line; read each finding's law and fix, and verify it against the code before repairing).
${extra}
Owned files: ${files.join(', ')}. Write nothing else, except patch files under ${P}/patches/${unit}/ as compliance-plan.md § Patch protocol states.
Refuse and report instead of doing: an install, a package.json edit, a commit or push, git checkout/restore/stash/reset/clean, a tree-wide lint --fix or format, an edit to a file you do not own, deleting a file you did not create (except a deletion your brief names), and any request to 127.0.0.1:11434.
Validate scoped to your files with the commands your brief's Acceptance names, read bare. Return: files written, patch files written, each command with its exit code and summary line, every finding you closed by file:line, every finding you could not close with expected / found / evidence, and any ruling you need.`
}

const GATE = {
  type: 'object',
  properties: {
    commands: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, exit: { type: 'integer' }, excerpt: { type: 'string' } }, required: ['command', 'exit', 'excerpt'] } },
    pass: { type: 'boolean' },
  },
  required: ['commands', 'pass'],
}
function gate(label, commands) {
  return `Role: verifier on Claude Haiku 5.5. Edit nothing. Spawn nothing. Send no request to 127.0.0.1:11434.
Gate: ${label}, checkout ${R}. Run exactly these commands from ${R}, each as its own Bash call ending in '; echo "exit=$?"' so the exit code prints, with no pipe that hides output, and read the output bare:
${commands.map((c) => `- ${c}`).join('\n')}
Return each command with the printed exit code and an excerpt: the summary line, or the first failure with its file and line. pass is true only when every printed exit is 0.`
}

phase('Relocate')
const U1_FILES = ['src/core/types.ts', 'src/core/helpers.ts', 'src/core/validators.ts', 'src/core/cloners.ts', 'src/core/providers/types.ts', 'src/core/providers/helpers.ts', 'src/core/providers/AgentJudge.ts', 'src/core/conversations/types.ts', 'src/core/conversations/helpers.ts', 'src/core/conversations/validators.ts', 'src/core/conversations/JudgmentManager.ts', 'src/core/conversations/Conversation.ts', 'src/core/contexts/helpers.ts', 'src/core/contexts/factories.ts', 'src/core/ledgers/Classifier.ts', 'src/core/ledgers/Ledger.ts', 'tests/src/core/helpers.test.ts', 'tests/src/core/validators.test.ts', 'tests/src/core/cloners.test.ts', 'tests/src/core/conversations/helpers.test.ts', 'tests/src/core/conversations/validators.test.ts'].map((f) => `${R}/${f}`)
const [u1, u8] = await parallel([
  () => agent(brief('U1', 'builder', U1_FILES, 'U1 relocates declarations only: it renames, rewords, and adds nothing beyond the moves its brief lists, and updates every import inside its owned files. The barrel row for src/core/cloners.ts goes to B as a patch; guide moves go to G as patches.'), { label: 'build:U1', phase: 'Relocate', agentType: 'builder', model: 'sonnet', effort: 'high' }),
  () => agent(brief('U8', 'builder', [`${R}/tests/distribution.test.ts`], 'U8 applies only the confirmed repairs its brief lists to tests/distribution.test.ts; the scaffold template copies are referred, not edited.'), { label: 'build:U8', phase: 'Relocate', agentType: 'builder', model: 'sonnet', effort: 'high' }),
])

phase('Barrel')
const b = await agent(`Role: builder on Claude Sonnet 5.5. You perform the work yourself and spawn nothing.
Unit: B (barrel integration), checkout ${R}. Apply every patch under ${P}/patches/U1/ that targets src/core/index.ts or a module index.ts, with \`git apply\` from ${R}, and no other file. When a patch does not apply, stop and report it with the git apply output; never hand-merge. Then run \`npm run check:src:core\` from ${R} and report its exit code and output tail. Refuse an install, a commit, any git checkout/restore/stash/reset/clean, and any edit outside the barrel files.
Return the patches applied, the command results, and any refusal.`, { label: 'build:B', phase: 'Barrel', agentType: 'builder', model: 'sonnet', effort: 'medium' })
const g1 = await agent(gate('after U1, U8, and B', ['npm run check:src:core', 'npm run test:src:core', 'npx vitest run --config vite.config.ts --project distribution tests/distribution.test.ts', 'npm run check']), { label: 'gate:phase1a', phase: 'Barrel', schema: GATE, agentType: 'verifier', model: 'haiku', effort: 'medium' })
if (!g1?.pass) return { stopped: 'phase 1a gate failed', u1, u8, b, g1 }

phase('Setup')
const s0 = await agent(brief('S0', 'builder', [`${R}/tests/setup.ts`, `${R}/tests/setup.test.ts`], 'S0 is the first pass of the S integration unit: it applies the setup findings its brief lists (C1 and C3 included) and no unit patch yet. Every rename of a setup export it makes is listed in its report with old and new names, because phase-2 units update their imports from that list; write the list also to ' + `${P}/patches/S0/renames.md` + '. test:src:core can stay red on importers of renamed exports until phase 2.'), { label: 'build:S0', phase: 'Setup', agentType: 'builder', model: 'sonnet', effort: 'high' })
const g2 = await agent(gate('after S0', ['npx vitest run --config vite.config.ts --project setup', 'npm run check:src:core']), { label: 'gate:S0', phase: 'Setup', schema: GATE, agentType: 'verifier', model: 'haiku', effort: 'medium' })
return { u1, u8, b, g1, s0, g2 }
