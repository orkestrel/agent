# Successor preparation check 3

The `-3` helper applies only the requested cast removal and helper renames (`hashBytes`, `readHashes`, `buildCommands`). Its strict no-emit check passed with no diagnostics, and its static comparison exited 0. The earlier helper, result and report artifacts were not modified.

Strict check: `node node_modules/typescript/bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ESNext --types node --skipLibCheck --ignoreConfig tmp/units/aggregate-successor-preparation-check-3.ts` — exit 0 in 0.816 s. Read-only comparison: `node tmp/units/aggregate-successor-preparation-check-3.ts` — exit 0 in 0.180 s; helper-measured duration 9.735 ms.

All prior comparisons remained green: launcher body only changes the endpoint/receipt target; the materializer's endpoint and receipt checks, host-only envelope delta and create-only output match; the five-command Q4 plan carries the expected l15 paths, successor deployment and child URL while preserving Q4 selection, model, seed, settings, phase order and caps `[240, 240, 240, 1800, 240]`. The changed-model, changed-cap, missing-URL and wrong-URL controls all reject. All eight planned outputs, l15 results root, successor start receipt and successor deployment are absent. The fit command remains conditional on the plan's explicit stop after generation and later root release ([plan release condition](tmp/units/aggregate-successor-q4-command-plan.json:7), [five Q4 tasks](tmp/units/aggregate-successor-q4-command-plan.json:11-188), [selected predecessor tasks](tmp/units/aggregate-final-calibration-command-plan-2.json:227-710), [typed comparison helper](tmp/units/aggregate-successor-preparation-check-3.ts:1-308), [result](tmp/units/aggregate-successor-preparation-check-result-3.json:1-80)). No service, port, model, canonical source or build was run.

| Compared input | SHA-256 |
| --- | --- |
| `aggregate-successor-daemon-launch.ts` | `f5ef2dcb4b1285bfe389a99cf716d4b37407095596952abf2c48a87fdd51b2f4` |
| `aggregate-successor-daemon-materialize.ts` | `314c8f2f2eda265c9535bc5fc2ba3584d7416ff70f83aaa9b7d8ac5bb88c961e` |
| `aggregate-successor-q4-command-plan.json` | `fbc73fbc19ebd34910fd977a87322ed5be296df9dcb5e761ab0661d1ff54fbb0` |
| `aggregate-successor-q4-plan.ts` | `3e6097ff21ea21d56ea9dacf13f63b656c1eadb05e93f72428673e844e057758` |
| `aggregate-final-daemon-launch.ts` | `dff98e5b3f93af1029e6fbb7f6517290de5d3293eaee4355feddce636ab49c3f` |
| `aggregate-final-daemon-materialize.ts` | `34890ae73c7664bf0b374fbd73b152eac8cb39125f9542c6e5eec2160d765ce9` |
| `aggregate-final-daemon-deployment.json` | `c20472169bc4a0767cfa9882d7674825d84fa4be338b9bab1de386425c743eed` |
| `aggregate-final-calibration-command-plan-2.json` | `1fbb63293257db03c53d4da97242534e69ad6b9a9b1d7e8bea56ec10fed4477d` |

The `-3` helper SHA-256 is `5678562cea61d0fca01832188377e259b661b224802fdabd84d7c73caf0ce5e7`; its result SHA-256 is `d5193b982645b244343ceefe2d6e20a4b49e0c02678c8a320eb661f5fa985a71`. **Done:** requested narrow corrections, strict check, comparisons and citations. **Hypothesis:** none; this remains static preparation evidence without runtime isolation proof.
