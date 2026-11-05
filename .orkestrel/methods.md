# Methods this campaign proved or disproved

The user, 2026-11-04: "I also want a full debrief on performance, the patterns and conventions applied along with proper evidence, research, and examples so that we can use them in other runs, especially since we will need them in our skills and rules, they are invaluable and needed across our packages, especially so that we don't have to relitigate each issue and already start on the correct foot and then be able to use it as a springboard to determine the correct methods to use per package and scenario."

This file is the debrief's working input, added to as methods prove out so nothing is reconstructed from memory. The debrief rules each row into scaffold's canon. Readings carry their limits, and a reading marked unconfirmed stands on a writer's single run. Agent's own performance record is in `agent/designs/measurement.md` and `agent/ledger.md`, and the debrief reads those whole.

## Performance

| Scenario | Method | Reading | Example |
| --- | --- | --- | --- |
| Import cost dominated by contracts built at module load | Compile a built contract's function members on first use; the first call pays | A hardened `reason` build's cold import 93.3 to 33.5 ms; `workflow` 56.6 to 40.2 ms. Against what's published, `reason` reads 19.44 to 36.85 ms, interleaved, so the contracts still cost about 17 ms | `contract` `198f48a` |
| A speedup would weaken a published promise | Measure it on a throwaway copy first, then weigh the number against the promise | Deferring `schema` saved 4.7 of 36.6 ms on `reason`, against `schema` staying a plain value and failures staying at creation. Declined | `contract` `d359d94` |
| Comparing a build to what's published | Measure the published artifact, interleaved. A number from earlier in the same campaign is not the published baseline | 93.3 ms was quoted as published for hours; the published build reads 19.44 ms | `reason` `f8646a5` |
| A builder re-walks subtrees it already validated | Seal built shapes so a walk of them runs once | Depth-6 `createContract` 1.317 to 0.111 ms; object `is` and `parse` 2 to 4 percent slower | `contract` `0f05405` |
| A union parse tries each arm | A value's literal property names one arm | Last arm 20.7 to 4.1 µs | `contract` `4dff475` |
| A per-element hot path needs validation | Hand guard with a lockstep test; a shape-derived guard only at a once-per-entity door | Policy ruling 12 in `failopen.md` holds the readings and where each form belongs | `agent` hydrate guards |
| A walk's cost is exponential on shared cyclic data | Change the precedence so one linear walk decides; delete the mechanism rather than bound it | Shared cyclic graph at 22 levels: 4.56 s to 163 µs; 41 levels 253 µs | `contract` `aadb739` |
| A bound exists, and is read after the cost is spent | Read the existing limit during capture, one counter per door call, passed down | `createContract` spent 1.2 GB before refusing; landing, unread after the repair | `contract`, in progress |
| A reading on a loaded host passes a bar set at a quieter moment | Compare builds interleaved in one lane ticket, and bar the relative change, not an absolute from another moment | `reason` read 37.57 ms against a 35 ms line; interleaved, the same build read 35.78 and 36.68, so `contract` added 0.9 ms, 2.5 percent | `contract` `32b987b` |
| One loop scans the whole preceding text per number | A counting probe located it before any rewrite | 238 million characters at 65,534 units to 1; 74 ms at the limit, against 330 ms estimated | `interpret`, in progress |
| A refused raw schema is re-walked per owner | One-line repair | 4,251 to 38 ms at N=4,000, unconfirmed | `contract`, in progress |

## Hardening

| Scenario | Method | Reading | Example |
| --- | --- | --- | --- |
| Findings keep coming, package by package | Ask whether it is depth or breadth. Census each defect class across every package, rule each hit once, and fix at the cause | Four censuses over sixteen packages reduced to a handful of rows | `plan.md` § How the wave runs |
| A census must list every instance | A script lists; a model only marks each row | By hand: 21 rows and it stopped early, and 14 rows where a search found 91 pairs. From a list: all 279 sites marked | `ledger.md` |
| Two representations of one thing might disagree | A counting probe runs every pair on generated, perturbed, and edge values, and only then does anyone read | 88 pairs, 31 distinct splits, seven causes, two above the bar | `plan.md` § How the wave runs |
| A probe reports a large count | Read the count as causes, and prove each reachable through a public call before opening a row | 60 raw splits fell to 40 once perturbed only from values both sides accept, then to 31 distinct | `ledger.md` |
| A guard and its contract disagree | Name the representation: definitions need `is` to imply the guard; results need `wire.is(project(result))`; runtime guards stay wider | Tightening runtime guards would have been wrong for most splits | `plan.md` § How the wave runs |
| Several walkers compile one language | A generated test of their laws, as regression coverage. It sees stable values only, so it does not replace review of accessors, reentrancy, or limits | 49,722 pairs on the verified build, no violation. Default size 17,013 pairs in 2.35 s | `contract` tests, with the door |
| Unbounded behavior at a door | A limits probe at field level of a value both sides accept: long, deep, self-referencing, wide | 9,510 calls, no throw, no oversized report. Blind to shared-reference graphs | `ledger.md` |
| Review rounds do not converge | Name a release bar in every brief, since no bar makes every finding block; set a stop per seam; re-audit the repaired claim only | The missing bar is why the wave felt endless | `plan.md` § How the wave runs |
| A synchronous guard's mutant hangs | A counting fixture small enough for the mutant to finish; a test runner's timeout runs on the same thread and can't interrupt it | A `Proxy` counting `ownKeys` read 3 against 0, and a tower past the limit read 32,767 visits against 10,000, where the two had hung at 600 s and 120 s | `reason` `cb76b97` |
| A value's reads change between calls | Assert what one captured result promises, never agreement across calls | `oneOf`'s regression: `parse` returns its input or nothing | `contract` `aadb739` and its successor |
| Real defects a review can't see | Run one real thing end to end early | One scratch decision found the carried-value defect and seven other mismatches, after an audit and several reviews missed it | `learn`, `research/skeleton.md` |
| A bound is proposed from one door's reading | Measure every door on the fixture first; ownership allocates before validation | The fixture was read on `is`; `cloneShape` costs about 8 times that, and `createContract` refused only after 1.2 GB, so the first ruling would have closed the smaller path | `contract`, in progress |
| A re-audit reports a fixture | Reproduce it on the committed build before acting, and extend it where that's cheap | Extending one fixture is how the ownership table turned up | `learn`, the ledger |
| A column is about to run | Set the keep rule first, as a cost ratio | `wait` kept at 0 correct facts asked per 3 latent values removed; the multi-word alias at 0 latent values added per 1 right gained; a broad gate dropped on the same kind of column | `interpret` `f65b39e` |
| Each review finds another form a parser accepts | Invert it: state what's admitted, and everything else refuses. A list of what's wrong has no end | `interpret` read `3_000_000` and `3 миллиона` as 3 after three rounds of lists. Two laws replaced them: a token must match a declared numeric form whole, and what follows a claimed number must be declared. On 1,200 messages, independently rescored, wrong values behind a question fell from 68 to 24 and right from 35 to 33, with net rules down 18. The largest form removed, `$38.50 an hour` held as `hours=38.5`, was one no review had named | `interpret` `cb0bb5c` |
| A reader misreads a form a review found | State the law for the class and prove it with a table of every form, not the review's list: it consumes the whole numeric token or says unreadable, and never keeps a part | `3 000 000` read as 3 and approved past the authority, in `learn`'s composed model | `interpret`, in progress |
| An author's API feels heavy | Read the example as an author and count what is said twice, before shrinking the example or moving the bar | 62 lines, 26 of them three sentences stated twice | `learn`, in progress |

## Disproved

| Idea | Reading | Why it stays out |
| --- | --- | --- |
| A model links numbers to fields by index | 27.1 right, 37.7 silent | Worse than filling by name |
| A model quotes its evidence beside each value | Nested: 77 percent of fields null. Flat: 45 right against 144, for 6 fewer accepted wrong answers | Costs far more right answers than the wrong ones it removes |
| Fitting field descriptions from the writers' own brief | 68.6 right against 54.8 with blind ones | Flattery, not skill; quote only blind readings |
| Reading usage counts as what a rule will earn | Multi-word wording in 46 percent of messages; the alias gained 1 case net | A usage count measures wording, not value |

## Process

| Scenario | Method | Reading |
| --- | --- | --- |
| The deliverable sits behind open-ended rounds | Put the deliverable first and let hardening run alongside | `learn` went from no model code to a real decision within a day of the reorder |
| Two sessions rule on one design | The implementer checks a ruling against the code before sending it on | Reversed four of the designer's rulings today, each on measured evidence |
| A delegated control proves a test can see a defect | Check first that the control is in the test's domain | The `oneOf` control needed an unstable accessor, outside the laws' stable-read domain |
| A consultant reads a build | Prove the build matches a commit by its source maps before dispatch | A stale tarball cost one analyst run at zero pairs |
| Lanes wait on one another | The host limit counts only process-running lanes. A writer keeps drafting behind a ticket, changes no file a live ticket reads, and batches tests. A row that needs no later unit starts now | The user, 2026-11-04: "we need to work in parallel, looks like most of the subagents and consistently waiting on another when there is other work that can be done at the same time". A brief line, "Start nothing else while it runs", caused it in one session, and folding independent rows into a later take-up caused it in the other |
| A keep rule loses on a metric that overstates the cost | Override it on the record with the reason, and write the re-read rule now | A unit rule read 8.33 against a bar of 5, with 25 questions and no right case moved; re-read at M2 in whole cases |
| Findings keep refining a heuristic | Ask whether the rule is about what the reader may do, true of any message, or about what particular words mean. The first stays; the second goes on a known-limits list with its example, for later tuning or learning, and the system says why it refused | The last two rounds moved no count on 1,200 messages, and a declared stop was passed by four rulings that each sounded reasonable. The user: "we just need to find the right point where we need to be reasonable" |
| A falsify round needs depth and breadth | Run two lanes on different engines and postures. The correctness lane sampled widely and left 26 of 31 claims unresolved; the real-caller lane drove each package as a caller would and found `database` losing data and a wrong correction in fault text. A claim's "not run" is not a pass | `falsify.md` |
| A brief's premise may be wrong | Give each row a stop clause naming what it must not add, such as a state or a second walk | Writers stopped correctly on five brief faults and on two of the designer's rulings; the clause surfaced the capture bound's false premise |
| A unit has stopped on scope | Preflight every remaining item once, and better still, before the brief ships | After three stops on unforeseen paths, one preflight gave one stop with a complete file map, and found a scaffold-owned file wrongly listed as owned |
| A brief assigns ownership | Name each path with the rule that places it; a catch-all line is a defect, and `test:policy` right after a move catches placement early | "A file this model needs is yours" let in a guide imported by tests, nine centralized files in a subfolder, and two npm packages. The user caught it |
| A test population is audited before a run | Assert how its strata cross, the largest single-value share, and how often boundary values land together, along with its counts. Count too what its facts can reach, since a ceiling under the bar makes the run measure the grid | Every count held, while all 200 ordinary messages were approvals and one pair of boundary values sat on 202 of 600 subjects. An earlier draw could reach 28.1 percent against a 40 percent bar |
| Two scorers read one definition | Run both on scripted traces before any outcome exists, and rule each difference then, since a ruling after the run has outcomes in view | Reading them side by side, one called a latent value that turned a limit case into an approval "unproven", and the other counted it |
| A writer reports a corpus table | Rescore it independently before recording it | It matched on every row twice; the 30 seconds it costs is what makes the table quotable |
