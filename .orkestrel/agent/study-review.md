# Adversarial review: the optional study proposal (Opus 5.5)

I attacked the six claims against the packet only: brief.md, law.md, rules.md, procedure.md, facts.md, article.md, methods.md and proposal.md. The packet does not include the canon map that the proposal links (`study-canon.md`), so I treat its contents as unknown.

## Verdicts

**1. BROKEN.** The proposal names two owners and no seam between them. proposal.md § Name and ownership puts "a development command in the agent checkout and a durable harness in the scaffold checkout."
- **Counterexample:** you clone the agent repository and run `npm run study -- check memory`. The harness, scenarios and results tree (`studies/agent/…`) are in another checkout. The proposal gives no way to reach them. The only routes are an absolute path, which is the defect facts.md ¶5 already records for the frozen manifests, or a harness that ships inside scaffold's package, which would be a published executable the proposal itself rules out.
- **Basis:** the proposal's justification is "the earlier preservation proposal's ownership boundary." facts.md ¶5 says that proposal "was not implemented or accepted" and that "the user moved the campaign from scaffold to agent."
- **Smallest correction:** make the agent checkout the only owner of the command, study definitions, harness and durable manifests and reports. Put them in an unpublished top-level directory; the package publishes only `dist/src` and `README.md` (facts.md ¶3). Scaffold owns nothing until a second package uses the study surface (law.md, AGENTS § Minimal public API: "first real consumer").
- **Must preserve:** no `bin`, no runtime dependency, script-only entry, and the oracle kept outside agent-visible inputs and published files.
- **Unresolved inside this fix:** law.md, orchestration § Cleanup says "a campaign artifact never lives in the package it is about." I read a durable study as a development tool, like `tests/`, not a campaign record, but Root must rule on that. `.claude/rules/workspace.md` decides whether a new top-level folder is allowed, and it is not in the packet.

**2. CONFIRMED.**
- **Attack 1:** repeated records trials share one records store, so trial 2 inherits trial 1's filed answers. It held: a trial starts "from a clean initial state," and the world resets "between independent trials and strategies" (proposal.md § What the memory study measures).
- **Attack 2:** goal-level uncertainty is inferred from the 96-goal sequence. It held: the proposal says the goals "are not 96 independent reliability trials," and it separates pass^k from pass@k.
- **Attack 3:** an adaptive simulated user adds variance. It held: the external event schedule is fixed.
- **Limitation:** cold-start versus warm-state conditions (article.md § What is decisive) are not proposed. The claim does not require them.

**3. BROKEN.** "Expose that denominator" makes the coverage visible, but nothing stops a favorable comparison being built from partial survival. The capacity-versus-infrastructure line also has no criterion.
- **Counterexample 1 (survivorship):** Q4 records stopped at goal 48 and compaction served 92/96 (facts.md ¶6). A score over served products compares records on early, less history-dependent goals with compaction on nearly all of them. Both denominators are shown, but the headline still favors whichever arm died early.
- **Counterexample 2 (reclassification):** a full-history request goes past the 180 s request budget on the shared GPU (facts.md ¶6–7). The proposal gives no rule for whether that is a strategy capacity failure or a host fault. Calling it infrastructure voids the trial and allows a rerun, which turns an unfavorable capacity result into a retry.
- **Counterexample 3 (unpaired voids):** when an infrastructure fault voids one arm's trial, the proposal does not say what happens to the paired arm's trial.
- **Smallest correction:**
  - Write the failure-classification predicates into the study definition before execution. Overflow, an output-reservation refusal or a budget expiry with no host-fault evidence counts as capacity. A connection or provider error, or recorded host-fault evidence, counts as infrastructure.
  - The headline per arm uses every declared goal, with unserved or capacity-failed goals counted as unachieved and each one labeled with its cause.
  - Served-only scores are secondary and are compared only over goals that both arms served.
  - An infrastructure fault voids or re-executes the whole pair, and every attempt stays listed.
- **Must preserve:** overflow stays strategy evidence, grader faults stay visible as coverage, and the dimensions stay separate.

**4. BROKEN** (the historical-evidence half is broken; the installed-package half is unresolved).
- **Counterexample (historical):** facts.md ¶5 says raw runs, builds and dependencies are gitignored and `.orkestrel` is temporary. law.md, orchestration § .orkestrel layout says the folder is deleted in the acceptance commit and git history is the archive. After acceptance, git history keeps the manifests' digests of the vendored agent 0.0.30 and Ollama builds, but not the bytes those digests name. "Historical replay" (proposal.md § Name and ownership) then has nothing to run, and the absolute paths resolve nowhere.
- **Smallest correction:**
  - Before the campaign folder is deleted, copy the vendored subject builds and raw trials to the external artifact storage the proposal already names, keyed by the recorded digests.
  - Never rewrite a frozen manifest's paths; treat them as provenance.
  - Label a historical result replayable only when the archived bytes match their digests. Otherwise it is interpretable from its manifest but not replayable.
- **Installed package (unresolved):** "freezes the actual package build hash through an explicit subject seam" does not say what is hashed or how that hash is tied to the code the harness actually loads. A study inside the agent checkout that imports `@orkestrel/agent` resolves to its own build, not to a released artifact. law.md, quality § Instruments says to baseline a published-artifact claim against the tarball. What settles it: identify the subject by tarball integrity, installed into an isolated directory, with the manifest recording the resolved module path.

**5. BROKEN.** The proposal promises paid qualification and paid re-scoring, but no bounded command performs either.
- **Counterexample 1:** capacity qualification makes model calls (30 min, 512 calls, 1M known tokens; facts.md ¶7). But `check` runs "without paid generation" and `execute` is the comparison. The phase that must spend before the held-out budget has no command and no declared limits of its own.
- **Counterexample 2:** after a rubric change, `report` "makes no model calls," and `execute` buys new trajectories. The promised offline re-scoring that does not buy another rollout has no command.
- **Counterexample 3:** the layout has a single `results/<id>/report.json` slot. A re-scored version must either overwrite it, which contradicts "does not overwrite the first verdict," or start a new result id that is cut off from its trials.
- **Smallest correction:**
  - Make qualification its own study: `execute capacity`.
  - `execute memory` refuses to start without a passing capacity result for the same profile and subject digests.
  - Add a paid `grade <id>` command. It prints the judge population and limits before spending and writes `results/<id>/grades/<grader-digest>/`.
  - `report` reads a named grading.
- **Must preserve:** immutable trials, frozen limits printed before any spend, no interactive prompt, and `report` making no model calls.

**6. BROKEN.** The set produced by one execution is called three different things, and repeated attempts have no identity rule.
- **Counterexample:** `report <trial-set>` addresses a "trial-set." The layout calls the same thing `results/<id>`, and the internal scheduler is the "series." That breaks law.md, AGENTS § Design laws: one concept, one term. It is also unstated whether a second `execute memory` creates a new result or appends to the earlier one. "Attempt" is used for both trials and request retries.
- **Smallest correction:**
  - Use one noun, "result," for the evidence from one execution.
  - Each `execute` creates a new result id and never appends.
  - A pair re-executed after an infrastructure fault is a new trial in the same result, with an attempt ordinal.
  - Request retries are recorded inside a trial.
- **Must preserve:** `execute` with its fixed lifecycle meaning, `trial` as one strategy's trajectory (consistent with `TrialConfig`), and `series` kept internal.
- **Advisory:** `check` is also the name of the repository's type gate. Inside the study namespace it is still deterministic and makes no model calls, so the meaning is consistent and the clash is a matter of taste only.

## Findings outside the claims

**O1. Timed budgets have no host-load record or order control.** Trials run one after another on a shared GPU under wall-clock budgets (request 180 s, goal 15 min; facts.md ¶6–7). The proposal neither records host load nor alternates arm order, so host drift lines up with the arm being run. law.md, quality § Performance requires reporting "every measurement with the host's other load during the run."
- **Correction:** record host load per trial, and alternate or counterbalance arm order across scenarios and repeats.
- **Must preserve:** live GPU calls stay serial.

**Unsupported, not counted in the verdict line.** The proposal cites Anthropic's agent-evaluation guidance and the ABC audit (arXiv 2507.02825). Neither appears in article.md or methods.md, so the packet cannot verify those claims; both are unresolved. methods.md's τ-bench, Inspect and Harbor rows support the same points.

## Attacked and held

- **No published runtime surface:** a package script outside `dist/src` adds no `bin` and no dependency.
- **The `study` name:** facts.md ¶4 confirms no guide owner for `study`; registry availability is left unknown, as it should be. The proposal correctly drops `bench`, `probe` and `eval`.
- **No-action control:** the proposal exempts refusal and abstention from "must fail" and checks their evidence instead. That fixes the article's 6/20 do-nothing passes (article.md § What is decisive).
- **Equal envelope versus equal compute:** "equal envelope ≠ equal compute," with cost-matching left as a separate design, holds against methods.md § Prioritized considerations, item 7.
- **Overflow:** overflow counted as strategy evidence and a broken environment counted as invalid agrees with methods.md item 3.
- **Not a gate:** keeping the paid study out of the deterministic test gate holds.
- **No early inference:** the proposal infers nothing from Q2 preflight, which facts.md ¶7 says is still running.

## Corrected proposal

The agent checkout alone owns the optional study surface. It is a development script with no `bin` and no dependency, and it sits in an unpublished top-level directory. Root rules on the orchestration § Cleanup tension, and on top-level placement once `workspace.md` is read. Scaffold owns nothing until a second package uses the surface.

```text
npm run study -- check memory                       # deterministic; no model calls
npm run study -- execute capacity --profile local   # public qualification, own limits
npm run study -- execute memory --profile local     # refuses without matching passing capacity result
npm run study -- grade <id>                         # paid re-scoring; prints judge limits
npm run study -- report <id> [--grade <digest>]     # reads; no model calls
```

The studies directory holds:

```text
studies/
  memory/study.json      capacity/study.json
  scenarios/             (public development fixtures only)
  results/<id>/manifest.json
  results/<id>/trials/   (digests; raw bytes in external storage)
  results/<id>/grades/<grader-digest>/report.json, report.md
```

**Study definition and results**
- The study definition freezes the scenario set, strategies, profiles, limits, repeats, grader version and the failure-classification predicates.
- Each `execute` creates a new result.
- An infrastructure fault voids and re-executes the whole pair, recorded as a new attempt.
- Every attempt and every unit of host load is recorded.

**Reports**
- The headline per arm covers all declared goals, with unserved or capacity-failed goals counted as unachieved and labeled with their cause.
- Served-only scores appear only as a secondary comparison over goals both arms served.
- A report carries verdicts, not oracle values.

**Subject**
- An installed-package study identifies its subject by tarball integrity, installed in isolation, with the resolved module path recorded.
- Historical studies replay only when the archived vendored bytes match their digests.
- Before `.orkestrel` is deleted, copy those bytes to external storage; never rewrite frozen manifest paths.

The rest of the proposal stays as written: separate dimensions, state and trace predicates, the no-action and reference controls, blind calibrated judges, one sequence reported descriptively, repetition chosen from pilot variance, and both the first and re-scored verdicts retained.

**Limitations**
- `workspace.md` and the canon map are outside the packet.
- No source in the packet settles which strategy wins.
- The result of Q2 qualification is unknown.

VERDICT: FAIL 1, 3, 4, 5, 6; outside the claims: O1