# Freeze the complete-candidate controls

Offline preparation is complete. The frozen population contains the exact corrected original candidates and the matched fictional controls. The custody checks passed on Windows PowerShell on 2026-10-11. No semantic label is accepted by this report, and no inference ran.

Role: native Astra, GPT-6 Astra. Scope: the dispatched offline data unit. The author performed the work without delegation. No canonical, build, calibration, held-out, service, release, or other-unit file was edited. The final tracked status still showed only the preexisting `.orkestrel/agent/instruments/bench4/Driver.mjs` modification.

## Frozen artifacts

The following SHA-256 bindings identify the returned artifacts. See [the inventory](aggregate-focus-controls/inventory.json) for every authored byte binding and the decision-bearing input bindings.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `population.json` | 28779 | `3fc3e23d91c095b5f7935aa40b18b62e62616c75819f6f270fad3b7a0da11309` |
| `oracle.json` | 14132 | `1506fdc5a3742044029ad40ef5669fcda1ad67274918fba508570434273fa0ce` |
| `inventory.json` | 5475 | `6a647be9c064e935f54e7cb6a46c9f416f81fa782d47a4b2441473b3f09366dd` |

The final authored inventory is `population.json`, `oracle.json`, `inventory.json`, `types.ts`, `Validator.ts`, `check.ts`, `Freeze.ts`, and `tsconfig.json` under `tmp/units/aggregate-focus-controls`, plus this report. The temporary `Prepare.ts` fixture writer was removed after its create-only writes. Intended labels, rationales, original-name mappings, and boundary-pair mappings remain only in `oracle.json`. That oracle is an author proposal, not independent evidence or acceptance.

The population has only `question` and `rows` fields. Each row has only `id`, `sources`, `candidate`, and `spans`; each span has only `start`, `end`, and `text`. Row ids are SHA-256 of `JSON.stringify({ sources, candidate })`. Lexical id order is independent of intended labels. Synthetic source ids are SHA-256 of `JSON.stringify({ day, role, text })`; explicit roles, dates, and sentence indexes are present. The validator refuses extra row or span fields.

## Exact custody and partitions

The original packet hash is `52aa96b66f45b9cad0275cd6db52e63f1a12ffb9f4b80e84132831f9f885cf11`. The specification hash is `bd907fbb6b214f3fba41115e8ef31a83a58a5174d26ae153efc66d5c893bae71`. The complete `statement-a` and `statement-b` candidates match both frozen originals, including every unchanged surrounding line. Their private id mapping is in the oracle. Each retains all 21 original source objects in order, including the original `seed` fields; no projection replaced those stored objects.

The validator imports the accepted `partitionCandidate` and `validateCoverage` primitives. It also checks each actual span against the frozen partition, reconstructs native focus states through the existing renderer, and independently checks the resulting state fields through `validateState`. The installed `splitSentences` implementation supplies the partition; no parser was added. The source renderer remains `(day) role: text`.

This measured membership is exhaustive. Intervals are UTF-16 half-open offsets into the exact candidate. The source-byte column sums the UTF-8 bytes of source text only.

| Opaque id | Exact span intervals | Candidate UTF-16 units | Source-text UTF-8 bytes |
| --- | --- | ---: | ---: |
| `134528899cc700845d1b7a8df277ad9beb735d6d3ced27a5aead86d3dac6cdec` | `[0,148) [149,302) [303,510)` | 510 | 1484 |
| `172b52e9e40af5c62512ecb14cc6a5494e8dfe20b72e7ecf23391dc8615743df` | `[0,29) [30,55)` | 55 | 140 |
| `3506b19061b133d1dbab61ef4c119bb8714bfdf57db6638cffae0ddee5fd50f5` | `[0,60) [61,98)` | 98 | 107 |
| `378a30bd89e45045ee90460fc6f5a9a2b9ea3c76ac34377b4caf2ae6f1c87f96` | `[0,55) [56,93)` | 93 | 163 |
| `3b269190b1ec7d37645a36a1f8326d34b2c507da1fbd60e168e501a661448aab` | `[0,148) [149,236) [237,444)` | 444 | 1484 |
| `5802116a80776376c9a02d4fb56bf97ba7d45070f2c510de3096fa17834a69e0` | `[0,43) [44,67)` | 67 | 125 |
| `6c87d300636196ed4519f8639cf533e6f7108460009dd22d569d5ec94178ee87` | `[0,55) [56,93)` | 93 | 163 |
| `91ed4ec675e79d2208ac0a9fe9856a759fcccbf8454ec052297bcca9760de6d4` | `[0,43) [44,63)` | 63 | 125 |
| `92d734bc56d0fa052c3e46c7226bbc6947fa41f5ff33168e1d1f2f99225ce60f` | `[0,28) [29,54)` | 54 | 140 |
| `96ee113c95ee9066d265a0508aae7b7c67878640e8eb2eadc03984b016048f31` | `[0,29) [30,69)` | 69 | 191 |
| `b4418cb1f465bdd108c74ad449bbf0aba435cfb08b3dcebc5020ce292cdb50cb` | `[0,51) [52,85)` | 85 | 150 |
| `c14f54bd8607bb868fd2e02c32eb91a6fa697643bd05b578939177d73007690b` | `[0,51) [52,85)` | 85 | 150 |
| `de4833af1437ae5f132155a2491bb2dc59928cc6165f69e08948549386a70e1c` | `[0,60) [61,102)` | 102 | 107 |
| `e9fe8e9a54533210538feb9040a279dd10a7cf9b59e5f3a389bd579e34e01011` | `[0,29) [30,67)` | 67 | 191 |

The synthetic rows each partition into 2 nonempty spans. Their maximum measured candidate length is 102 UTF-16 units and maximum source-text size is 191 UTF-8 bytes, within the dispatched 1400-unit and 3000-byte limits. Every matched pair retains identical ordered sources and an unchanged surrounding span. The wording changes only the tested assertion or reference. These limits measure data size, not token fit.

## Prospective requests

The measured population has 14 rows and 30 spans. A complete pass has 30 contextual-focus requests and 14 whole-candidate guard requests, totaling 44. Forward and reverse passes therefore require `2 * sum(row.spans.length + 1) = 88` inference requests: 60 contextual-focus requests and 28 whole-candidate guards. Service checks are not inference and are not included. No sequence, screen acceptance rule, or live operator was added.

The selected prospective statistic remains `min(all contextual focus scores, unchanged l8 whole-candidate guard)`. Missing or invalid input remains unscored. This unit neither implements that statistic nor changes its prompts, rendering, thresholds, or settings. Root must settle independent labels and freeze the screen rule before any live operator.

## Commands and observations

The following commands ran from `C:/Users/mikes/WebstormProjects/scaffold`. The command outputs were read without output filters.

| Command | Exit | Observation |
| --- | ---: | --- |
| `node node_modules/typescript/bin/tsc --noEmit -p tmp/units/aggregate-focus-controls/tsconfig.json` | 0 | Strict scoped types passed before initial data generation and again for the final authored validator. |
| `node --check tmp/units/aggregate-focus-controls/Prepare.ts` | 0 | Initial fixture writer syntax passed before execution; the writer was subsequently removed. |
| `node tmp/units/aggregate-focus-controls/Prepare.ts` | 0 | Create-only data generation reported 14 rows, 30 spans, and 88 prospective requests. |
| `node --check tmp/units/aggregate-focus-controls/Validator.ts; node --check tmp/units/aggregate-focus-controls/Freeze.ts; node --check tmp/units/aggregate-focus-controls/check.ts; node --check tmp/units/aggregate-focus-controls/types.ts` | 0 | Final authored TypeScript syntax checks emitted no errors. |
| `node tmp/units/aggregate-focus-controls/Freeze.ts` | 0 | Wrote the inventory with create-only semantics. |
| `node tmp/units/aggregate-focus-controls/check.ts` | 0 | Revalidated custody, exhaustive coverage, source rendering, bounds, oracle references, every frozen binding, and request arithmetic. |
| `git status --short` | 0 | Only the preexisting tracked bench4 driver modification appeared. Authored files are under ignored `tmp/`. |
| `node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-focus-controls-report.md` | 0 | Report carries no line-number citations; the citation scanner reported zero unresolved. Artifact bindings, membership, and commands supply the evidence. |

The check executed 10 negative controls. Coverage rejected an external candidate with a dropped prefix, empty spans, and changed span text. Population validation rejected an added oracle field, changed criteria, an added row label, an altered id, omitted spans, duplicate membership, and reversed hash order. Each refusal matched its intended assertion. These controls test fixture custody; they cannot establish support, boundary discrimination, model ordering, token fit, or service non-truncation.

## Independent-label evidence slice

The proposed independent analyst receives only `tmp/units/aggregate-focus-controls/population.json` at hash `3fc3e23d91c095b5f7935aa40b18b62e62616c75819f6f270fad3b7a0da11309`, its embedded exact `question.instructions` and `question.criteria`, and the repository authority: `AGENTS.md`, `.agents/orchestration.md`, applicable quality/writing rules, and the dispatch skill. The analyst must judge each opaque row and each exact span in complete candidate context from that row's complete ordered sources. The analyst must return the labels, source anchors, and unresolved ambiguity without inferring labels from another row.

Exclude this report, `oracle.json`, scores, earlier label reports, named pair mappings, and prior discriminator results from that evidence slice. No independent labeling dispatch occurred in this unit.

## Questions reserved for adjudication

All whole-candidate and per-span labels remain unsettled. The original complete candidates require a source-based ruling on whether the wrong parcel plus the continuing replacement request establishes nonreceipt of her replacement, whether the locker-trace wording faithfully attributes the discovery, and whether the email-only phrase preserves the source's scope. A prior focus label does not settle those questions.

The synthetic controls require a ruling on how the frozen criteria interpret a reported claim followed by denial, an earlier note followed by a correction, and a preceding sentence explicitly designated as inactive history by a later sentence. The private oracle proposes answers but supplies no acceptance. A disagreement requires root adjudication before inference, not a label or wording change guided by scores.

No blocking deviation occurred. The within-scope wording choices preserve a common surrounding span and use the smallest assertion/reference change that exercises each selected boundary. No method change, missing original source, unowned edit, or unmet data bound was observed.
