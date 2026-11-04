# Falsify round on the integrated stack: verdict

Delete this file when its rows close and the debrief has carried them.

**Lanes:** objective, `reviewer` on `astra`; subjective, `reviewer` on `opus`. Same 31 claims, clean contexts. Each `BROKEN` below was reproduced by the Orchestrator on the committed build.

**Terminal lines:** objective `FAIL 5, 25, 26`; subjective `FAIL 6, 14, 22, 23, 25, 28, 29; outside the claims: O1`.

| Claim | Finding | Ruling | Carrier |
| --- | --- | --- | --- |
| 14, 29 | `database` writes `NULL` for a value a column can't hold, so `set` resolves and `get` refuses; an empty SQLite path opens a temporary database | correction, above the bar | `database` |
| 6 | `describeFaults` names a refused value as the fix across discriminated arms, writes a foreign `type` word raw, and encodes `received` twice | correction, in `contract` | `contract` |
| O1 | a strict refusal's message names no keyword | correction, in `contract` | `contract` |
| 25 | the formatter read inherited schema data | correction; `9eb302a`, and `in fault` reads with the row above | `contract` |
| 25 | a polluted `Object.prototype` changes what a builder reads | a stated limit, on the guide's honest-intrinsics boundary | `plan.md` § Deferred |
| 5, 26 | a getter changing between `is` and `parse` publishes a value with no repair recorded | a stated limit: the door requires stable reads | `plan.md` § Deferred |
| 28 | `ollama`'s daemon shape and guard split where a shape can state the rule | correction | `ollama` |
| 23 | `ollama`, `toolbox`, and `workflow` table rows can't fail, and `agentJobContract` has no test | correction | `ollama`, `toolbox`, `workflow`, `agent` |
| 22 | `agent`'s guide and a refusal name `strict: false` with no place | correction | `agent` |
| O2 | `agent.generate({ shema })` ignores an unknown key | below the bar, since a type check refuses it | `plan.md` § Deferred |
| O3 | `program`'s definition refusal gives no path, and `rating.lines: 'x'` throws a bare `TypeError` | below the bar: a correct refusal with no remedy | `plan.md` § Deferred |

**Confirmed by a lane:** 2, 3, 4, 5's stable paths, 7, 10, 17, 21, 27, 31.

**Unresolved, each with a named row not yet run:** 1, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 24, 26, 30. These take one settling lane on the repaired tips. Claim 15 also needs the live project: a zero-argument tool on a model whose parser omits `arguments`, and an untagged or case-varied `model` name.
