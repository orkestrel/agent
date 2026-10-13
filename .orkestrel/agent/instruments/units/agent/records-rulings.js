export const meta = {
  name: 'records-rulings',
  description: 'Apply the two orchestrator rulings to the records candidate and rerun its proofs offline',
  phases: [
    { title: 'Apply', detail: 'opus applies the Rules-everywhere and Pinned-heading rulings' },
    { title: 'Gates', detail: 'verifier reruns proof.sh' },
    { title: 'Review', detail: 'opus reviewer checks the two rulings' },
  ],
}

const COMMON = `
Hard rules:
- Never send a request to 127.0.0.1:11434 or any other host; live runs use the daemon. Every harness command preloads no-net.mjs, a wire-replay preload, or the dry-run preload.
- The installed /home/user/agent/tmp/bench3/bench.mjs (sha256 3d75138e...) and bench3/records.mjs, records-check.mjs, records-fixtures.json are frozen: never write them. Your files are under /home/user/agent/tmp/bench/results/v9/recordsrender/ only.
- Never delete, move, or overwrite a file you did not create. Never read or print secrets. Comments state why; prose follows /home/user/scaffold/.claude/rules/writing.md.
`

const BRIEF = `${COMMON}
The records candidate in /home/user/agent/tmp/bench/results/v9/recordsrender/ (bench.mjs, README.md, records-check.mjs, records-fixtures.json, proof.sh, dry.sh, and the report scripts) passed its proofs. Read its README section "Records, 2026-10-09" and the candidate code around plan (:2073 onward), #render, and #renderRecords first. Apply two rulings under --records on, leaving --records off byte-identical to the frozen harness:

1. The Rules record applies to every request. A request that names no registered account (g06 on every wire) keeps refined's ## Pinned units, but its ## Rules slot carries the Rules record, so m2's MX-4471 sentence renders nowhere under --records on. Update the README sentence about g06 and the fixture that asserted g06 equals refined's view: it now asserts g06's ## Pinned equals refined's and its ## Rules is the Rules record.
2. The request's account records render under one "## Pinned" heading line, followed by each record's own "## HOLDER (account ID)" block as renderRecord builds it, then the loose units refined would pin. If no record and no loose unit renders, the heading is left out, as refined does. Update the fixtures and the README layout text.

Rerun proof.sh (a, b, c) and report every command with its exit code and counts, including: records off byte identity on every wire listed in the earlier proof (a3-refined v1 to v3, a4-refined v1 to v5, and any later complete a4-refined wire), the roundA replays, and run 3 totals (over, fact recall, old tokens anywhere in the briefing, other-account lines, faults) over every complete wire. State the go or no-go by the plan's rule.`

phase('Apply')
const apply = await agent(BRIEF, { label: 'apply', phase: 'Apply', model: 'opus', agentType: 'opus' })
phase('Gates')
const gates = await agent(`${COMMON}\nYou write no files except under /tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/gates-rulings/. Rerun /home/user/agent/tmp/bench/results/v9/recordsrender/proof.sh as the unit reports, confirm the frozen bench3 files are unchanged (sha256), and report each exit code and count. The unit's report follows.\n${apply}`, { label: 'gates', phase: 'Gates', model: 'opus', agentType: 'verifier' })
phase('Review')
const review = await agent(`${COMMON}\nYou write no files. Check the two rulings in the records candidate: under --records on, does m2's MX-4471 sentence render in any briefing, including g06; do records render under one ## Pinned heading with no empty heading; is --records off still byte-identical to the frozen harness. Use the unit report and the gate results. Return findings with severity and evidence, and a go or no-go.\nUnit report:\n${apply}\n\nGates:\n${gates}`, { label: 'review', phase: 'Review', model: 'opus', agentType: 'reviewer' })
return { apply, gates, review }
