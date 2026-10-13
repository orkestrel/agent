# Typed successor preparation check

The successor artifacts still match the declared substitutions. The typed, read-only comparison helper passed, and the strict TypeScript check passed with no diagnostics. The original helper, result, and report remain preserved; this run created only the `-2` helper, result, and report.

Strict check command:

```text
node node_modules/typescript/bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ESNext --types node --skipLibCheck --ignoreConfig tmp/units/aggregate-successor-preparation-check-2.ts
```

Exit 0, 1.191 seconds, no output. The first invocation without `--ignoreConfig` was refused by the installed compiler because a `tsconfig.json` was present while a file was specified. Adding `--ignoreConfig` exposed four readonly-array assignment errors in the negative-control setup; the helper was corrected to mutate fresh cloned arrays, then the strict check passed:

```text
error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.

tmp/units/aggregate-successor-preparation-check-2.ts(259,1): error TS2542: Index signature in type 'readonly Readonly<{ sequence: number; id: string; capSeconds: number; argv: readonly string[]; expected: readonly string[]; }>[]' only permits reading.
tmp/units/aggregate-successor-preparation-check-2.ts(263,1): error TS2542: Index signature in type 'readonly Readonly<{ sequence: number; id: string; capSeconds: number; argv: readonly string[]; expected: readonly string[]; }>[]' only permits reading.
tmp/units/aggregate-successor-preparation-check-2.ts(267,1): error TS2542: Index signature in type 'readonly Readonly<{ sequence: number; id: string; capSeconds: number; argv: readonly string[]; expected: readonly string[]; }>[]' only permits reading.
tmp/units/aggregate-successor-preparation-check-2.ts(273,1): error TS2542: Index signature in type 'readonly Readonly<{ sequence: number; id: string; capSeconds: number; argv: readonly string[]; expected: readonly string[]; }>[]' only permits reading.
```

The read-only comparison exited 0 in 0.240 seconds (helper-measured 13.976 ms). It narrowed the command-plan and deployment JSON from `unknown`, then confirmed: the launcher body differs only by the declared host and receipt-path substitutions; the materializer statically checks the original endpoint and successor receipt and creates a separate host-only envelope; and the Q4 plan is exactly five selected tasks, sequence 1–5, with l15 paths, the successor deployment, explicit port 11435 at each child argv end, and unchanged seed, settings, models, phase inputs and caps. The four negative comparisons rejected a changed model, changed cap, missing URL and wrong URL. All eight model-phase expected outputs, l15 results root, successor start receipt and successor deployment remained absent. All eight compared input hashes matched before and after the check ([typed checker](tmp/units/aggregate-successor-preparation-check-2.ts:1-308), [comparison result](tmp/units/aggregate-successor-preparation-check-result-2.json:1-80), [Q4 plan sequence and task paths](tmp/units/aggregate-successor-q4-command-plan.json:3-188), [creator selection and substitutions](tmp/units/aggregate-successor-q4-plan.ts:10-47)).

The plan's stated gate stops after generation for independent blind labels and root adjudication; the fit command is present as sequence 5 but remains conditional on explicit root release. An operator must stop before submitting that command ([plan release condition](tmp/units/aggregate-successor-q4-command-plan.json:7), [fit task and labels path](tmp/units/aggregate-successor-q4-command-plan.json:159-200)). No daemon, materializer, calibration plan, model, port, process, canonical source or build was executed or changed; no active pilot output was read.

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

The typed helper SHA-256 is `6f66bdf67dd93d65a59a171b319c2126b50f8da2e240344b8b7f3a9bfc2f0936`; its result JSON SHA-256 is `c25dca109679072e8eefd60d8392e210fac57842d0b4d48cbebb5275aebe2e46a`. **Done:** strict temporary-helper check, static comparison, negative controls, absence checks and input hash rechecks passed. **Hypothesis:** the prepared plan is ready for a separate authorized runtime phase after pilot closure; this static check provides no runtime isolation evidence.
