# Lane brief — falsify round port-release-3

## Role and lane

Read the role your dispatch names. The objective lane is GPT-6 Astra (`analyst`, read-only `codex exec`); the subjective lane is the `reviewer` on Claude Opus 5.5. Each lane works alone; neither sees the other's answer. Engines that wrote parts of the subject: Astra wrote the ledger entity, the classifier, and the fidelity fix; Sonnet builders wrote the helpers, the gauge, and the thinking record; Opus wrote the types and the guides. You perform the assignment yourself and spawn nothing. You edit no source, create no file outside `tmp/units/`, and send no request to `127.0.0.1:11434`.

## The round

Read `tmp/units/port-release-3-claims.md` in `/home/user/agent-port`: the subject, what the round decides, what is established, the evidence, the 8 claims, the unknowns, and the threshold.

## Output

Return exactly:

1. Numbered verdicts in claim order, one value each: `CONFIRMED` (attacked and held, with the attack), `BROKEN` (the failing input, state, or interleaving plus the smallest correct fix), `UNRESOLVED` (what would settle it), `NOT-EVIDENCED` (the capture that is missing). Before confirming a claim about a proof, name the mutation that would make the proof fail and state whether the assertions distinguish it.
2. Findings outside the claims, each substantiated to the `BROKEN` standard; then any cost finding marked `ADVISORY`.
3. Attacked and held.
4. One terminal line: `VERDICT: PASS` or `VERDICT: FAIL <claim numbers>; outside the claims: <finding ids or none>`.

No process diary.
