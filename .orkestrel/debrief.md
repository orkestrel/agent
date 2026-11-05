# Debrief of the refuse-by-default fleet campaign

Verdict: the law for ending a wave existed, and the route this campaign took never reached it. The canon delta below needs the user's go-ahead before anything lands, and nothing in `@orkestrel/scaffold` has changed.

Canon paths name files in `@orkestrel/scaffold` at `1f73afbf3`. Evidence is quoted from the campaign record. A second pass follows `@orkestrel/learn`'s M3. Input: `methods.md`, `plan.md`, `ledger.md`, `falsify.md`, `@orkestrel/learn` `.orkestrel/learn/`.

## Rulings on divergences

| Question | The lanes said | Ruling and reason |
| --- | --- | --- |
| Who owns the missing bar | The objective lane: `orkestrel-dispatch`. The subjective lane: `.agents/orchestration.md` | `.agents/orchestration.md` § Campaign. Every campaign reads it, and `TARGET_SKILL_NAMES` hosts no dispatch skill in a target, so a dispatch check would not have reached this campaign. No second termination law: it points at `orkestrel-harden` step 3 |
| Who owns running the real thing early | `orkestrel-harden` or `.agents/orchestration.md` | Two obligations. The order goes in § Campaign, because this route never loads harden. The brief's form goes in `orkestrel-harden` |
| May a review lane run probes | Objective: read-only with supplied receipts. Subjective: the charter is wrong | The charter is wrong. Objective claim 5 and subjective claims 6, 25, and 29 came from lane-run scripts, and `orkestrel-falsify/SKILL.md:32` contradicts `references/brief.md:21`. Source stays read-only, a lane writes only its named probe folder, and runs go through the host's runner. Supplied receipts remain the route where a lane has no shell |
| Does a settling lane break "it runs once" | `.agents/orchestration.md:150` against the practice | It does not. A lane running named inputs through public calls collects evidence, and the Orchestrator still judges. The skill gains that step, and each claim names its settling row before the round |
| Is reading a whole log an independent receipt | `AGENTS.md:106` against the recovery | Yes, when the reader did not run the gates, and the log holds the whole output, the head, and the exit. `.agents/orchestration.md:87` already allows the Orchestrator to run them |
| Does breadth by class replace probe-first | Objective: it agrees with the law. Subjective: the law is silent on placement | Both hold. The law supports a census and never orders one across packages, and the delta adds only that order |
| Why `distiller` lanes ran on an engine § Roles does not map | The subjective lane asked, and the record is silent | A deviation by the Orchestrator, and no law changes. § Routing sends distillation to `grok`, `distiller` only with the bench recorded dark, and "ease or cost never authorizes a fallback". The bench probe read live on 2026-11-04. The promotion census ran the same way |
| 23 or 26 unresolved claims | `methods.md:65` said 23, the verdict numbered 26 | 26 of 31, with 3 broken and 2 confirmed. `methods.md:65` is corrected |
| A content-filter stop in this wave | The brief asserted one, and neither lane found it | Dropped as a campaign claim, because no record of it exists. The pointer in D23 stands on its own evidence |
| `scaffold overwrite` exits 1 on `--offline` | The subjective lane: a contract gap | Stays as-is. `orkestrel-publish/references/wave.md:105` documents it. The leftover files are a separate claim, D24 |

## Findings

Sources: O is the objective audit, F the subjective audit, K a method candidate, P a promotion row.

| Id | Sources | Finding and evidence | Bucket | Carrier |
| --- | --- | --- | --- | --- |
| D01 | O01, F1 | § Campaign's design lists "units, owned files, dependencies, parallel and serial order, acceptance criteria, exit criterion, ledger", with no bar and no stops (`.agents/orchestration.md:139`). `orkestrel-falsify/SKILL.md:50`: "a brief that names no bar puts every substantiated outside finding in the terminal line." `methods.md:34`: "The missing bar is why the wave felt endless" | Orchestration-contract refinements | `.agents/orchestration.md` § Campaign |
| D02 | F2 | A plan names no governing skill, so a plan that never says "harden" never loads it. `orkestrel-harden` appears nowhere in `plan.md` | Rule additions, one law each | `.claude/rules/campaign.md` |
| D03 | F3 | Step 3 is headed "Establish the intended contract", and the bar arrives in its fourth sentence | Skill refinements / creation | `orkestrel-harden/SKILL.md` |
| D04 | O03, F7 | "re-examine it at every round" (`.agents/orchestration.md:130`) never says what a re-examination may conclude or who rules. `methods.md:64`: "a declared stop was passed by four rulings that each sounded reasonable." The freeze held because it named what opens it: "A proposal to reopen this comes with the rule it meets" (`@orkestrel/learn` `.orkestrel/learn/plan.md:189`) | Orchestration-contract refinements | `.agents/orchestration.md` § Depth, breadth, and machinery |
| D05 | O05, F8, K31 | `methods.md:28`: "By hand: 21 rows and it stopped early, and 14 rows where a search found 91 pairs. From a list: all 279 sites marked". `scout.md` says "Refuse broad mapping" and that it does not judge. Bound: the list bought completeness and one data-loss row, not a large count (`ledger.md:39`). No new role | Orchestration-contract refinements; Charter refinements for `scout` | `.agents/orchestration.md` § Depth, breadth, and machinery; `scout` on both surfaces |
| D06 | O07, F10, K34, K38 | `methods.md:37`: "One scratch decision found the carried-value defect and seven other mismatches, after an audit and several reviews missed it". The contract's only "try the shipped result" line sits in § Acceptance (`.agents/orchestration.md:239`). The product also needs a milestone that keeps running beside the hardening | Orchestration-contract refinements for the order; Skill refinements / creation for the form | § Campaign; `orkestrel-harden/SKILL.md` |
| D07 | F5 | `reviewer.md:10`: "You hold no edit tool and run no command", while the same role's other surface allows read-only inspection commands. Lanes ran 18 probe scripts and found most of the wave's broken claims with them | Charter refinements | `reviewer`, `analyst` on both surfaces; `references/brief.md:21` |
| D08 | F6 | § Roles' subjective lens has no claims to hold in a falsify round. `methods.md:65` names the real difference as posture: "the real-caller lane drove each package as a caller would and found `database` losing data and a wrong correction in fault text" | Orchestration-contract refinements | `.agents/orchestration.md` § Roles |
| D09 | F11 | Two lanes left 26 and 14 of 31 claims unresolved. A row-driven settling lane ruled all 15 it was given, and an earlier campaign did the same | Skill refinements / creation | `orkestrel-falsify/SKILL.md` |
| D10 | F9, P01 | `orkestrel-parallel/SKILL.md:29` counts a lane as process-running for its whole life if it runs one test. Practice serialized processes, and the user: "we need to work in parallel" | Skill refinements / creation | `orkestrel-parallel/SKILL.md` |
| D11 | O02 | `.agents/orchestration.md:165`: "No role commits, pushes, tags, publishes, installs, or runs a destructive command." `:153`: "Commit inside the branch, clone, copy, or worktree as its unit needs". The floor names no actor for the second | Orchestration-contract refinements | `.agents/orchestration.md` § Permission floor |
| D12 | F4, F20 | Tools are unrestricted under a hosted child, so a charter binds only when the brief carries it. A brief line closed the writer deviations: "Don't commit and don't install". `references/claude-code.md:9` names role files a target does not hold | Orchestration-contract refinements | `orkestrel-parallel/references/t3.md`, `references/claude-code.md` |
| D13 | O04, F15, K32 | `methods.md:68`: "A file this model needs is yours" let in "a guide imported by tests, nine centralized files in a subfolder, and two npm packages. The user caught it" | Skill refinements / creation | `orkestrel-dispatch/SKILL.md` |
| D14 | F16 | None of the 27 surviving briefs uses the template, and none runs `brief.ts --check`. `src/core/constants.ts` excludes dispatch, scout, publish, and align "because they run from the scaffold checkout and a target is not an orchestration host". This campaign ran from a target | Fix now, on the user's ruling | `src/core/constants.ts` `TARGET_SKILL_NAMES` |
| D15 | O08, F17, K06, P09 | `methods.md:19`: "`reason` read 37.57 ms against a 35 ms line; interleaved, the same build read 35.78 and 36.68, so `contract` added 0.9 ms, 2.5 percent". `methods.md:13`: "93.3 ms was quoted as published for hours; the published build reads 19.44 ms" | Rule additions, one law each; package promotion for the script | `.claude/rules/quality.md`; a harden skill script |
| D16 | O06, K27 | `quality.md:36` asks for a control "drawn from outside the population the instrument covers". `methods.md:60`: "The `oneOf` control needed an unstable accessor, outside the laws' stable-read domain" | Rule additions, one law each | `.claude/rules/quality.md` |
| D17 | O09, F12 | "Read every named input in full" gives no form for a read that outlasts a turn. Ten continuations were needed on one record. A per-file coverage table and "stop at a clean boundary" worked | Charter refinements | `distiller`, `grok` on both surfaces |
| D18 | F13 | `ledger.md:56`: "a verifier's shell returned early on this host". The verifier's charter names no yield behavior, and the fix sits on a page the role never reads | Charter refinements | `verifier` on both surfaces |
| D19 | F14 | § Engines: "The Orchestrator owns the plan, every decision, integration, and acceptance." The user split design from implementation across two sessions. `methods.md:59`: "The implementer checks a ruling against the code before sending it on", and it reversed four rulings on measured evidence | Orchestration-contract refinements, on the user's ruling | `.agents/orchestration.md` § Sessions and consultation |
| D20 | O10 | `references/hardening.md:43` drops "for project-owned behavior" and fake clocks from the root's law at `AGENTS.md:43` | Root-reference trims | `orkestrel-harden/references/hardening.md` |
| D21 | F18 | "Lane" means a capability, a unit, and a host resource. "Census" means four things. Scope this to those two words | Orchestration-contract refinements | `.agents/orchestration.md` |
| D22 | F19 | `.codex/agents/opus.toml:10-11` swaps "when ... the Astra bench dark", on a file that runs on that engine | Charter refinements | `.codex/agents/opus.toml`, `.codex/agents/reviewer.toml` |
| D23 | F21 | `references/codex.md:27` holds the neutral-wording rule, and the dispatch skill does not point at it. A brief still read "a hostile table", against `writing.md:89` | Skill refinements / creation | `orkestrel-dispatch/SKILL.md` |
| D24 | F22 | `scaffold overwrite --groups configs --dirty --offline --json` "reports `removed: []` and leaves `configs/app/tsconfig.core.json`, `tsconfig.server.json`, and `vite.server.config.ts` after `app/` leaves". Not reproduced on an identified build | Fix now, once reproduced | `@orkestrel/scaffold` `overwrite` |
| D25 | M2's rescore | `methods.md:69` asks for an independent rescore, and no role owns one that needs a new scorer. "A `checker` on Luna stopped twice without writing a scorer, at low and high effort", and the Orchestrator wrote it (`@orkestrel/learn` `.orkestrel/learn/ledger.md:84`). Writing a scorer from a definition is judgment: `astra` in a clean context writes it, blind to the scorer under test, and `checker` runs it and compares | Orchestration-contract refinements | `.agents/orchestration.md` § Routing |

## Methods: where the 63 land

The running catalog merges 436 source rows into 63 methods: performance 13, measurement 11, boundaries and refusal 18, proofs and tests 8, review 4, process 9. Fifteen are already law. Forty-eight are partly law, consolidated into 40 candidates.

All 63 land together in one new reference, `orkestrel-harden/references/methods.md`: the selector by package kind and scenario, each method with what to do, what not to do and why, one reading, one example with its package and commit, then what failed and the arguments now settled. `.agents/orchestration.md` § Campaign points at it, so a campaign reads it before a hardening package does. This file is the user's request of 2026-11-04, and `writing.md`'s "Keep an example only when it disambiguates the rule" gives way to it here. A commit holds the rest of each method's evidence.

The candidates below become one law each, a sentence at the named owner. The rest stay in the reference only.

| Owner | Candidate | Law |
| --- | --- | --- |
| `quality.md` | K01 | Price a cost at the caller's whole lifecycle and workload, construction, restoration, and decision beside warm savings |
| `quality.md` | K06 | D15 |
| `quality.md` | K07 | Derive a cost stop from the consumer, and tell responsiveness from throughput |
| `quality.md` | K27 | D16 |
| `patterns.md` | K04 | Persistence canonicalization is part of the declared identity round trip |
| `patterns.md` | K05 | A refusal bound covers the ownership and capture work paid before validation |
| `patterns.md` | K13 | Choose guard or shape by execution frequency and representation |
| `patterns.md` | K14 | Raw owned admission keeps corrupt-present apart from absent, before projection or fallback |
| `patterns.md` | K15 | Shape soundness, lossless semantic admission, and authoring validity are separate claims |
| `patterns.md` | K18 | Unread or unavailable evidence is neither a false predicate nor an empty success |
| `patterns.md` | K19 | Admission and approval bind the exact operation and instance across suspension and callbacks |
| `patterns.md` | K23 | A restore or continuation claim names the actual commit boundary, partial commits included |
| `patterns.md` | K25 | A parser declares its whole admitted language and its adjacent refusals, instead of tuning example by example |
| `patterns.md` | K26 | An editable prior result never substitutes for validated inputs when deriving a decision |
| `patterns.md` | K39 | Outward projection respects authorship and trust origin, and accepts no authority channel from a client |
| `tests.md` | K12 | A synchronous negative control terminates without depending on the blocked test's timer |
| `tests.md` | K29 | A migration proof covers defaulted branches that still compile and entries outside the check graph |
| `tests.md` | K40 | Developmental selection and untouched confirmation are separate evidence populations |
| `documentation.md` | K21 | A corrective refusal keeps computed provenance and never invents the user's intent |
| `.agents/orchestration.md` | K33 | A command's service and data side effects include setup imports and informational invocations |
| `orkestrel-harden/references/document.md` | K30 | Where authoring ergonomics are claimed, an independent declaration-only read accompanies the executed example |

K31 lands in D05, K32 in D13, K34 and K38 in D06. Reference only, with no new law: K02, K03, K08, K09, K10, K11, K16, K17, K20, K22, K24, K28, K35, K36, K37. Each is true of one kind of package or one kind of experiment, so the selector is where a reader meets it.

## Promotion

| Rows | Ruling | When |
| --- | --- | --- |
| P10, then P11 to P21 | Implement. Eleven packages copied one standing proof. A shared observation engine goes in `@orkestrel/test` core, with one consumer proved first and the verdict left to each caller. No universal "all guards equal wire" law | After publish, on the user's word |
| P27, then P05 | Implement the bounded perturbation leaf in `@orkestrel/test` core, then the pure comparison on it. P05's generated-value discard and load fallback get fixed on the way | After P10 |
| P09 | Implement as a harden skill script, with its mirrored proof | With D15 |
| P01 | Implement. A lane serializer carries correctness claims, so `.agents/orchestration.md:111` sends it to its own package. Its source shows open questions: same-millisecond order, an owner absent at handover, an unchecked kill. These are unproved properties, not observed failures | On the user's word |
| P02, P07, P08 | Repair by adopting `orkestrel-publish`'s `swap.ts` and dispatch's `chain.ts` and `launch.ts`. `@orkestrel/learn` reads local builds through the current stack, so nothing moves mid-run | After publish |
| P22, P23, P24, P28 | Repair by adopting `createHostileValues` and `seededRandom` where the semantics match, keeping targeted reads such as `steps` | Next visit to each package |
| P03, P06, P25, P26, P29 | Retain with their owners | none |
| P04 | Intentionally exclude. A campaign's regexes are not a mechanism; the method lands as D05 | none |

## Canon delta, proposed

| Layer | Files |
| --- | --- |
| Agents | `reviewer`, `analyst`, `scout`, `distiller`, `grok`, `verifier` on both surfaces; `.codex/agents/opus.toml` |
| Rules | `.claude/rules/campaign.md`, `quality.md`, `patterns.md`, `tests.md`, `documentation.md` |
| Skills | `orkestrel-harden` (`SKILL.md`, `references/hardening.md`, `references/document.md`, new `references/methods.md`, a comparison script); `orkestrel-falsify` (`SKILL.md`, `references/brief.md`); `orkestrel-parallel` (`SKILL.md`, `references/t3.md`, `references/claude-code.md`); `orkestrel-dispatch/SKILL.md` |
| Process | `.agents/orchestration.md` § Roles, § Campaign, § Depth, breadth, and machinery, § Sessions and consultation, § Permission floor |
| Code and guide | `src/core/constants.ts` `TARGET_SKILL_NAMES`; `overwrite`'s leftover files once reproduced |

Re-proof: a process finding closes when the next campaign round runs the corrected process, and a tool finding closes by the same real command on an identified build.

## Open

- The user's go-ahead on the delta, then the scaffold session lands and propagates it.
- The user's ruling on D14, D19, P01, and P10.
- The second pass after M3.
- Folder retirement and the `tmp/` sweep, after `orkestrel-debrief` steps 7 to 9.

DEBRIEF: OPEN — the user's go-ahead, the scaffold session's landing, and the pass after M3.
