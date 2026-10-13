export const meta = {
  name: 'ledger-unit-fix',
  description: 'Apply ruled checker findings to one ledger port unit, then gate it',
  phases: [
    { title: 'Fix', detail: 'the unit writer applies the ruled findings' },
    { title: 'Gate', detail: 'verifier runs the acceptance gates; one more fix round on red' },
  ],
}

const ROOT = args.root ?? '/home/user/agent-port'
const { brief, findings, gates, writer, model, effort, owned } = args
const GATE_SCHEMA = {
  type: 'object',
  properties: {
    gates: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, exit: { type: 'number' }, excerpt: { type: 'string' } }, required: ['command', 'exit', 'excerpt'] } },
    green: { type: 'boolean' },
  },
  required: ['gates', 'green'],
}
const SAFETY = `Hard limits: work only in ${ROOT}. Edit only these files: ${owned.join(', ')}. Never run npm run build, npm run clean, or anything that writes a dist directory. Never write under /home/user/agent. Send no request to 127.0.0.1:11434. Never delete a file you did not create. Never commit.`
const gate = (label) => agent(`Role: verifier on Claude Haiku 5.5. ${SAFETY} You edit nothing.\n\nFrom ${ROOT}, run each of these commands exactly, in order, with \`; echo EXIT=$?\` appended, and report each one's exit code and, for a nonzero exit, the exact failure excerpt (at most 40 lines). For git status, put its full output in the excerpt.\n${gates.map((g, i) => `${i + 1}. ${g}`).join('\n')}\n\nSet green to true only when every command exits 0.`, { label, phase: 'Gate', model: 'haiku', effort: 'high', agentType: 'verifier', schema: GATE_SCHEMA })

phase('Fix')
let report = await agent(`You are the ${writer}, the sole writer in ${ROOT}, for the unit brief ${brief}. ${SAFETY}\n\nThe Orchestrator ruled these checker findings real; apply each one exactly and change nothing else:\n${findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nThen run the gates yourself: ${gates.join(' ; ')}. Return one line per finding with the file:line of the fix, and each gate with its exit code.`, { label: 'fix', phase: 'Fix', model, effort, agentType: writer })

phase('Gate')
let verdict = await gate('gate:1')
if (!verdict?.green) {
  report = await agent(`You are the ${writer} for ${brief}. ${SAFETY}\n\nThe verifier found the gates red after your fixes:\n${JSON.stringify(verdict?.gates ?? [])}\n\nFix the cause within the files you may edit, rerun the gates, and report.`, { label: 'fix:2', phase: 'Gate', model, effort, agentType: writer })
  verdict = await gate('gate:2')
}
return { report, verdict }
