# Stale-carrier report verification

The independent verifier confirmed the report repair. Empty and innocuous g03 summaries produce soleStale 0, while the summary `Use ESC-2291.` still triggers stale leakage STOP. The answer scorer, budget rule, fit, and stopping conditions are unchanged.

The writer's regression command first failed 2 of 3 cases, then passed all 3 after the fix. Restoring the old unqualified pattern projection failed the empty and innocuous cases. Removing pattern leakage entirely failed the forbidden-code case. Both mutations were restored. The verifier inspected that evidence and the final restored filter.

The verifier ran these commands from the harness, reading output bare:

| Command | Result |
| --- | --- |
| `node --test bench5/tests/report.test.ts` | Exit 0; 37 passed, 0 failed, 9 suites; 16945.0296 ms. |
| `node C:/Users/mikes/WebstormProjects/scaffold/node_modules/typescript/bin/tsc --noEmit -p bench5/tsconfig.json --typeRoots C:/Users/mikes/WebstormProjects/scaffold/node_modules/@types` | Exit 0; no diagnostics; about 1.9 seconds. The explicit type root supplies the main checkout's installed Node declarations to the isolated worktree. |
| `node bench5/report.ts --base tmp/l5/pilot-retry --pair q2,1-1` | Exit 0; about 0.5 seconds. soleStale PASS, plan FAIL, STOP (invariant plan). |

Every aggregate goal still withholds every topic: zero rendered on 12 of 12 goals. Equal 9-of-12 pass totals do not establish a null effect. The report repair is accepted; the pilot is not. The first-select tail mismatch remains a measured consequence of the recorded allocation rule. Later measurement stages have not run.

The original pilot and its pre-repair report remain preserved in results/l5/pilot-resumption. This verification does not rewrite that evidence or authorize a changed experiment.
