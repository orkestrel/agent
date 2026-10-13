# Independent offline verification: aggregate-focus-controls

The frozen fixture and custody checks passed on Windows PowerShell at `C:/Users/mikes/WebstormProjects/scaffold` on 2026-10-11. This report makes no semantic label ruling and no model or service call.

## Commands and outputs

The strict scoped typecheck exited 0:

```text
node node_modules/typescript/bin/tsc --noEmit -p tmp/units/aggregate-focus-controls/tsconfig.json
```

`node --check` exited 0 for each authored TypeScript file: `types.ts`, `Validator.ts`, `check.ts`, and `Freeze.ts`. `Freeze.ts` was syntax-checked only; neither `Freeze.ts` nor any fixture generation entry was executed.

The data custody checker exited 0:

```text
node tmp/units/aggregate-focus-controls/check.ts
```

Complete bare stdout and stderr are retained by command in `tmp/units/aggregate-focus-controls-verify-*.stdout.txt` and `tmp/units/aggregate-focus-controls-verify-*.stderr.txt`. Typecheck, all syntax checks, and every stderr file are empty. The checker stdout is the complete measurements JSON in `aggregate-focus-controls-verify-check.stdout.txt`; it reports 14 rows, 30 spans, 88 derived prospective requests, 10 refusal controls, and `offline custody only; semantic labels remain unaccepted`.

## Bindings and data custody

Independently hashed every inventory entry: all 7 authored-file bindings and all 9 input bindings match their expected byte count and SHA-256, with 0 mismatches. The frozen artifacts are:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `population.json` | 28779 | `3fc3e23d91c095b5f7935aa40b18b62e62616c75819f6f270fad3b7a0da11309` |
| `oracle.json` | 14132 | `1506fdc5a3742044029ad40ef5669fcda1ad67274918fba508570434273fa0ce` |
| `inventory.json` | 5475 | `6a647be9c064e935f54e7cb6a46c9f416f81fa782d47a4b2441473b3f09366dd` |

The checker binds the original packet at `52aa96b66f45b9cad0275cd6db52e63f1a12ffb9f4b80e84132831f9f885cf11` and the focused specification at `bd907fbb6b214f3fba41115e8ef31a83a58a5174d26ae153efc66d5c893bae71`. Both original candidate anchors and their complete ordered source objects match the packet. The exact partition spans match the accepted `partitionCandidate` result and pass coverage and rendered-state validation.

The population schema has only `question` and `rows`; rows have only `id`, `sources`, `candidate`, and `spans`; spans have only `start`, `end`, and `text`. The original source objects remain intact. Synthetic sources use the checker’s exact `id`, `sentence`, `role`, `text`, and `day` shape. No oracle label, rationale, original-name mapping, or private pair mapping field appears in the opaque population schema.

The validator checks private-oracle row/span membership, original anchors, pair source equality, and intended-label internal consistency as fixture custody. This check does not establish that any proposed semantic label is correct. The prospective request arithmetic follows the actual measured rows and spans: `2 * sum(spanCount + 1) = 88`. The two original rows with 3 spans contribute 8 requests each; the 12 synthetic rows with 2 spans contribute 6 each.

## Refusal controls

The passing checker reaches all 10 controls because each `throws` assertion requires its specific error match before the final success record is emitted:

- Dropped-prefix coverage, empty coverage, and changed-span text are refused by the coverage primitive.
- An added population field, altered question/criteria, added row field, changed content-derived id, omitted spans, duplicate row, and reversed opaque-id order are refused by population validation.

No claimed negative was absent from the checker. The checker uses the existing accepted partition/render helpers unchanged; no replacement parser or behavioral fake was introduced.

## Status and limits

HEAD was `61e1ea0404382e00c7facce3be8af2de3026991a`. Final `git status --porcelain` showed only the preexisting `.orkestrel/agent/instruments/bench4/Driver.mjs` modification. No source, fixture, build, service, or labeler-report file was changed. No oracle value or semantic opinion was sent to the independent labeler.

This evidence establishes offline fixture custody, schema, exact span coverage, and prospective request arithmetic only. It does not establish semantic support, boundary discrimination, model ordering, token fit, service truncation behavior, or label acceptance.
