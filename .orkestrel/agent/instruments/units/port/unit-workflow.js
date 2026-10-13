export const meta = {
  name: 'ledger-unit',
  description: 'Build, gate, and check one ledger port unit in the agent-port worktree',
  phases: [
    { title: 'Build', detail: 'the unit writer lands the unit' },
    { title: 'Gate', detail: 'verifier runs the acceptance gates; up to two fix rounds' },
    { title: 'Check', detail: 'checker reviews the diff file against the brief' },
  ],
}

const ROOT = args.root ?? '/home/user/agent-port'
const { unit, brief, gates, writer, model, effort, paths } = args
const DIFF = `${ROOT}/tmp/units/${unit}.diff`
const GATE_SCHEMA = {
  type: 'object',
  properties: {
    gates: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, exit: { type: 'number' }, excerpt: { type: 'string' } }, required: ['command', 'exit', 'excerpt'] } },
    green: { type: 'boolean' },
  },
  required: ['gates', 'green'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, verdict: { type: 'string', enum: ['pass', 'fail'] }, evidence: { type: 'string' } }, required: ['criterion', 'verdict', 'evidence'] } },
    pass: { type: 'boolean' },
  },
  required: ['items', 'pass'],
}
const SAFETY = `Hard limits: work only in ${ROOT}. Never run npm run build, npm run clean, or anything that writes a dist directory. Never write under /home/user/agent. Send no request to 127.0.0.1:11434. Never delete a file you did not create.`
const DIFF_STEP = `As your last action, record the diff for review: run \`git -C ${ROOT} add -N ${paths.join(' ')} && git -C ${ROOT} diff -- ${paths.join(' ')} > ${DIFF}\` (intent-to-add only; never commit).`
const gate = (label) => agent(`Role: verifier on Claude Haiku 5.5. ${SAFETY} You edit nothing.\n\nFrom ${ROOT}, run each of these commands exactly, in order, with \`; echo EXIT=$?\` appended, and report each one's exit code and, for a nonzero exit, the exact failure excerpt (failing test names and assertion lines, at most 40 lines). For git status, put its full output in the excerpt.\n${gates.map((g, i) => `${i + 1}. ${g}`).join('\n')}\n\nSet green to true only when every command exits 0 and git status lists only files the brief ${brief} owns plus tmp/ paths.`, { label, phase: 'Gate', model: 'haiku', effort: 'high', agentType: 'verifier', schema: GATE_SCHEMA })

phase('Build')
let report = await agent(`Carry out the unit brief at ${brief} exactly as written. You are the ${writer} on the engine the brief names, the sole writer in ${ROOT}. ${SAFETY}\n\nThe gates the verifier will run after you: ${gates.join(' ; ')}. Run them yourself before you finish. ${DIFF_STEP}\n\nReturn the brief's Output section as your final message.`, { label: 'build', phase: 'Build', model, effort, agentType: writer })

phase('Gate')
let verdict = await gate('gate:1')
for (let round = 1; round <= 2 && !verdict?.green; round += 1) {
  report = await agent(`You are the ${writer} for the unit brief at ${brief}, the sole writer in ${ROOT}. ${SAFETY}\n\nThe independent verifier ran the acceptance gates on your change and they are not green:\n${JSON.stringify(verdict?.gates ?? [])}\n\nFix the cause within your owned files only. ${DIFF_STEP} Then return the brief's Output section. If the failure lies outside your owned files, change nothing and report expected, found, evidence, and one hypothesis.`, { label: `fix:${round}`, phase: 'Gate', model, effort, agentType: writer })
  verdict = await gate(`gate:${round + 1}`)
}

phase('Check')
const check = await agent(`Role: checker on Claude Haiku 5.5. ${SAFETY} You edit nothing.\n\nReview the unit against its brief ${brief}. The full diff, new files included, is in ${DIFF}; read it and the changed files. Check, one item each with one piece of evidence (file:line): each numbered requirement in the brief's behavior or contracts section is met and, where the brief asks, pinned by a test; TSDoc and prose obey ../scaffold/.claude/rules/writing.md and typescript.md; no file outside the owned list changed; the AGENTS.md letter: no 'as' type assertions (other than 'as const'), no non-null '!', no mocks, fakes, spies, or module replacement, no 'any'. A fail item must quote the offending line.`, { label: 'check', phase: 'Check', model: 'haiku', effort: 'high', agentType: 'checker', schema: CHECK_SCHEMA })

return { report, verdict, check }
