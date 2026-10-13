# Handoff: 0.0.30 release and the aggregate arm (2026-10-10)

For the Codex resumption state, read the opening user-directed scope in [the plan](../plan.md) and [the progress record](../progress.md). Agent0.0.30, Toolbox0.0.19, and Ollama0.0.23 are published; Desk is re-pinned. On2026-10-12 the user resumed after canceling the remaining pilot and model/matrix variations. The only remaining experiment is continuous long-work records versus aggregate with Qwen4B thinking off/on: four measured trajectories. Preserve the other session's Ollama service. The dedicated endpoint was restored on port11435 at18:00UTC; the minimum continuous operator entry is being resolved, and no continuous trajectory has run. The remaining-step lists and publication instructions in this historical handoff are superseded; preserve their evidence and artifacts.

The next session resumes two lines of work from this file. Read it whole before acting.

## Goals

1. Release `@orkestrel/agent` 0.0.30 as the measured method "Briefing + per-topic records" (`createLedger`), trimmed of the surface no consumer uses, and compliant with `/home/user/scaffold/AGENTS.md` and the scaffold 0.0.100 rules. Put it on the agent repository's `main`, publish it, and re-pin the desk to it.
2. Measure the user's summarized-aggregate idea (`../instruments/harness/bench/BRIEFING.md` § 9) against the ported ledger on the long scenario, on Qwen 3.5 and Gemma 4.

Branch layout, by the user's ruling: `main` stays clean with 0.0.30 alone. The aggregate arm lives on `claude/confident-maxwell-6nd0f3` in scaffold.

## Where everything stands

| Repository                                     | Branch state                                                                                                                                                                                                                                                                                                                                                                                                                                               | Not yet done                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `orkestrel/agent` (`/home/user/agent-release`) | `claude/confident-maxwell-6nd0f3` at `a2285b8`, pushed, working tree clean: phase 1 (`1b5ede0`) and phase 2 unit U5 (`a2285b8`). `main` sits at `65c706a` (0.0.26 history).                                                                                                                                                                                                                                                                                | Phase 2 units U6, U4, U3, U7, and U2, phase 3, the falsify round, the push to `main`, and the publish. |
| `orkestrel/scaffold` (`/home/user/scaffold`)   | `main` at `b4d13fd`: `.orkestrel/agent` with the harness, results, issues record, and probes. The session branch adds the aggregate arm through `98e8ce8` and this handoff.                                                                                                                                                                                                                                                                                | The `.orkestrel/agent` sweep (see § 0.0.30, step 9).                                                   |
| `mikesaintsg/desk` (`/home/user/desk`)         | `claude/confident-maxwell-6nd0f3` at `70c2357`, pushed by the user's ruling of 2026-10-10. Its code imports the ledger surface (`createLedger`, `LedgerGauge`, `LEDGER_NOTES`, `Selection`), while `package.json:47` pins `@orkestrel/agent` `^0.0.29` and the lockfile resolves the registry 0.0.29, which lacks that surface: a clean `npm ci` fails `check` until the re-pin. `desk-local-commits.bundle` beside this file holds the same four commits. | The desk steps in § 0.0.30, step 8.                                                                    |
| `@orkestrel/ollama` (`/home/user/ollama`)      | Outside this session's repository scope; the other session holds its publish authority.                                                                                                                                                                                                                                                                                                                                                                    | Patch X2 (see § 0.0.30, step 6).                                                                       |

## Records

The agent repository keeps its campaign files under its ignored `tmp/units/`. A copy taken at this handoff sits in `../instruments/units/agent-0030/`:

- `compliance-campaign.md`: outcomes, scope, acceptance evidence, and the routing ledger.
- `trim-rulings.md`: trims R1 to R7 (R5 removes the stock selection handler, R7 removes the conversation rollup), the keeps, and the prose corrections.
- `compliance-rulings.md`: conflict rulings C1 to C4 and the shared-file protocol.
- `compliance-plan.md`: the plan of record and its name table; it reconciles `compliance-plan-planner.md` (Opus) and `compliance-plan-analyst.md` (GPT-6 Astra).
- `compliance-audit.json`: 326 confirmed findings, 12 critic findings, and 197 refuted ones.
- `patches-snapshot/`: the shared-file patches written so far (U1 and S0 are final; the others were mid-run).
- `workflows/phase1.js` and `workflows/phase2.js`: the workflow scripts that ran phase 1 and phase 2.

The aggregate arm's records are in `../instruments/units/aggregates/`: `design.md`, `aggregate.md`, `attacks.md`, `rulings.md` (T1 to T10, F1 to F7, the scoring audit, and the tool rulings), and `reports/`.

## Running at handoff

The weekly limit stopped the subagents at 16:20 UTC on 2026-10-10. The state each line of work reached is saved under this directory, because the agent repository's `tmp/` and the harness's `tmp/` are ignored and die with the container.

- Phase 2 of the agent campaign (workflow run `wf_fc724977-56e`):
  - U5 (conversations, R7, the snapshot ruling) is committed as `a2285b8`, with its two setup patches applied. A GPT-6 Astra cleanup unit (Codex session 01a126a4-b6c2-7213-a9c0-2e0cbc4dfdb7, 187,121 ms) reversed U6, applied the patches, and gated the result: conversations 202 of 202, setup 79 of 79, `check:src:core` exit 0, scoped oxlint and oxfmt exit 0; `npm run test:src:core` reads 1,220 passed and 54 failed, all in `agents/Agent.test.ts`, `agents/AgentRegistry.test.ts`, `agents/factories.test.ts`, `providers/RelayStream.test.ts`, and `providers/factories.test.ts`, which import setup helpers S0 renamed (`addTool`, `loopTool`, `cancelled`, `createStreamingRelayRequest`) and which U3 and U7 update. Astra's review of U5 found one defect it did not repair: a getter inside a locally bound object at `tests/src/core/conversations/validators.test.ts:108` (the nested-accessor law in `.claude/rules/architecture.md`). U5's shared-file patches still owed are `agent-wip/patches/U5/tests-guides.test.ts.diff` (IG) and `guides-agent.md.diff` (G, after `patches/U1/guides-agent.md.diff`). Two rulings stay open: whether `rehydrate` stays silent on an unknown id (`src/core/conversations/Conversation.ts:230`), and whether `requireSectionsCap` refuses `NaN` (`src/core/conversations/helpers.ts:143`).
  - U5 also deleted shared scratchpad paths it did not create (`scripts/`, `base/`, `run/`, `applycheck/`, root `*.md`, `f.txt`); no tracked file and no record this handoff names was among them.
  - U6 (ledgers) died mid-run; the cleanup unit reversed its partial edits from the tree. `agent-wip/U6-ledgers-partial.diff` stays for reference only.
  - U4, U3, U7, and U2 never ran.
  - The agent working tree is clean at `a2285b8`.
- The supplementary audit (workflow run `wf_5f9617ac-565`): its 18 checker lanes returned 407 findings (`../instruments/units/agent-0030/compliance-audit-tests-unverified.json`). A read-only GPT-6 Astra lane (Codex session in `tmp/codex/tests-verify.jsonl` of the agent checkout, 1,058,243 ms) ruled on all 407 against the tree at `a2285b8`: 101 confirmed, 100 refuted, 206 covered, 0 gone. The verdicts are `../instruments/units/agent-0030/compliance-audit-tests-verdicts.json`; the most confirmed findings sit in `tests/setup.ts` (25), `tests/src/core/agents/Agent.test.ts` (14), and `tests/guides.test.ts` (8).
- The aggregate arm's judge-only seed pass finished: 1,897,212 ms, 500 live questions (topic 348, amends 96, category 48, supersedes 8), 823 cache rows. The cache is `l5-cache/judge.jsonl` and the pass's output `l5-seed/`. The dry coverage check then read 0 seed-only misses and 0 fetches on copies 1 to 8; copies 2 to 8 each leave 120 topic questions about their reworded requests, which go live during the runs.
- The results artifact's source page is `artifact/larkspur.html`.

## 0.0.30: the remaining steps

1. Rule on U5's two open questions and repair `tests/src/core/conversations/validators.test.ts:108`. Then rerun U6, U4, U3, U7, and U2 from `workflows/phase2.js` with U5 removed from its unit list, starting from `a2285b8`.
2. Give each of the 101 confirmed supplementary findings in `compliance-audit-tests-verdicts.json` to the unit that owns its file, with the corrected fix the verdict carries; setup, guides-test, and guide findings go to the S, IG, and G integration units.
3. Phase 3, in the order `compliance-plan-planner.md` § Integration order gives: B applies the barrel patches; S applies the setup patches in the order U6, U5, U4, U3, U7, U2, and each unit's acceptance runs after its own patch; then IG (`tests/guides.test.ts`), G (`guides/agent.md`, `guides/README.md`, `README.md`), and K (`npm run lint`, then `npm run format`).
4. Gates, read bare, by a `verifier`: `npm run prepublishOnly`; the recorded-wire replay (`npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts`, 108 of 108 at `c04eea4`; the probe and its evidence file come from `/home/user/agent-port-gauge/tmp/`); and a raw comparison of the requests the `c04eea4` build and the final build generate for the 8 recorded runs.
5. One `orkestrel-falsify` round on the integrated diff.
6. Consumer patches. X1 (desk): `fixed` to `overhead` in `app/core/parsers.ts`, `app/vue/Lane.vue`, `app/vue/helpers.ts`, and their tests. X2 (ollama): `body` to `encode` in `OllamaProvider.ts` and `OllamaJudge.ts`, the rollup reads at `tests/service/compaction.test.ts:118` and `tests/src/core/integration.test.ts:458` and `:530`, and the `RunOutcome` reference at `tests/service/tools.test.ts:239`; write it as a patch file for the session that holds ollama. X3 (harness): `bench5/seams.ts`, `bench5/Driver.ts` (`fixed`), and the replay probes, after the trimmed build is vendored. Then run the desk's `check`, `test:app`, and journey suite, and ollama's check and tests, against `npm pack` of the agent checkout.
7. Commit and push the session branch, then fast-forward `main` (`git push origin <commit>:main`). The Claude Code auto mode refuses a push to `main`: ask the user to switch the mode dropdown to Accept edits, approve the push, and switch back.
8. Publish with the `orkestrel-publish` skill. The npm login needs the user at the keyboard (`window.ts --login`); never authenticate for them. Then bring the desk onto it, on its session branch:
   - Set `@orkestrel/agent` to `^0.0.30` in `package.json` and run `npm install` to refresh the lockfile (when `npm ci` refuses `EBADDEVENGINES` in a remote session, run `scripts/npm.sh` first).
   - Apply X1: `fixed` becomes `overhead` in `app/core/parsers.ts` (`parseGauge`), `app/vue/Lane.vue`, `app/vue/helpers.ts`, and every gauge literal in the desk tests. Check the desk against the other renames in `../instruments/units/agent-0030/compliance-plan.md` § Name rulings; at the handoff the desk imports none of them besides `LedgerGauge`.
   - Re-pin `@orkestrel/ollama` when the other session publishes an ollama release built against 0.0.30 with patch X2.
   - Run `npm run check`, `npm run test:app`, the journey suite, lint, format, and build, read bare; then commit and push the branch. The desk default branch is `master`; merge to it only on the user's word.
9. Sweep `.orkestrel/agent` and push it to scaffold `main` the same way: move `instruments/bench4` into `harness/`, delete the superseded snapshot folders `instruments/bench` and `instruments/bench3`, repoint the file map in `issues.md`, and record the trims and the compliance campaign in `issues.md`.

Deferred by ruling: the agent's `@orkestrel/scaffold` devDependency moves to `^0.0.100` after the other session publishes 0.0.100 (the registry read 0.0.99 on 2026-10-10); the release visit then overwrites the scaffold-owned files.

## Aggregate arm: the remaining steps

All commands run from `../instruments/harness`; launch each live step through `node /home/user/scaffold/.agents/skills/orkestrel-dispatch/scripts/launch.ts` with a cap, in the background.

1. Restore `../handoff/l5-cache/judge.jsonl` into `tmp/l5/cache/` when the container is fresh. The seed pass and the dry coverage check are done (see § Running at handoff).
2. Calibrate the CHANGE and AGREE cutoffs: `node bench5/calibrate.ts --cache tmp/l5/cache --model qwen3.5:2b-q4_K_M --out tmp/l5/calibrate --live`, then copy its `fit.json` to `bench5/fit.json`.
3. Pilot: q2 copy 1 on goals g01 to g12, control then aggregate, through `tools/run-one.ts`. It sets the per-model allowance, the retry bound, and the summarizer cap in `bench5/settings.json`, and it measures the costs the cost attack refuted. Then run `node bench5/report.ts --base tmp/l5/pilot --pair q2,1-1`; no invariant line may fail.
4. Vendor the trimmed 0.0.30 build beside `vendor/agent-0.0.30/` after the agent campaign lands (ruling T8), record its row in `README.md`, apply X3, and rerun `node bench5/seams.ts` and `node --test bench5/tests/*.test.ts` (296 of 296 at `98e8ce8`) and the type check (`node /home/user/scaffold/node_modules/typescript/bin/tsc -p bench5/tsconfig.json`).
5. Stage A: q2 copies 1 to 4, both arms (`node bench5/plan.ts --models q2 --copies 1-4 --cache <absolute cache dir> --out <plan>`, then `tools/series.ts`), with the stopping rule in `rulings.md`. Stage B: g2, then g4, then q4, copies 1 to 4. `gemma4:e2b-it-q4_K_M` is not installed; the disk had 8.7 GB free, so remove one 4B model before pulling it if space runs short. Stage C runs copies 5 to 8 unless a pair clears at the low end.
6. Blind-audit both sides (`audit/audit.js`, `audit/items.ts --count 24`, `audit/tally.ts --count 24`), run the shadow on copies 1 and 2 per model, and write the report to `../instruments/results/l5/REPORT.md`, with each departure from BRIEFING § 9 named. Then update `../issues.md` and the results artifact (https://claude.ai/artifact/VgCKcDwqN7YMd74jawfJ3S; its source page at handoff is `artifact/larkspur.html` beside this file).

## Standing rules

- Never read, print, or copy a secret (`.env*`, `.npmrc` values, `auth.json`, keys, tokens, `CURSOR_API_KEY`). Never authenticate for the user. Never pass `--force` to the Cursor CLI.
- Commit as `mikesaintsg <michaelsgarcia1993@gmail.com>`, with the Co-Authored-By and Claude-Session lines the session supplies. No model identifier goes into a repository file.
- Never commit a running unit's half-written files. Every subagent brief forbids deleting a file the agent did not create, and every spawn names its model and effort; Fable is never a subagent.
- Route absorption and broad reading to `grok` (Cursor Grok 4.7 Extra High; the bench answered live on 2026-10-10), objective audits to `analyst` (GPT-6 Astra; live, logged in), and gates to `verifier`.
- An offline unit sends no request to 127.0.0.1:11434.

## Open items

- `bench5/copies.ts` passes a sentence-initial name that no mid-sentence mention in the scenario backs (copy-checker report).
- `bench4/Driver.mjs` imports `../../dist/src/core/index.js`, which does not exist under `instruments/`; its `ROOT` names `/home/user/agent-port`. Point it at a vendored build before rerunning it.
- The scaffold template copies still carry the defects U8 repaired in the agent's `tests/distribution.test.ts` (`/home/user/scaffold/src/core/templates.ts:2050`, `:1895`, `:2919`); refer them to the session that holds scaffold.
