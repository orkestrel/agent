# Unit d1-dated — Render the Larkspur scenario in the date frame of the run day

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Build `tmp/bench/dated/render.mjs`, which rewrites a Larkspur scenario file so that every date it carries is anchored to a chosen run day: today is the run day, every other date keeps its meaning relative to today, every weekday name and relative word ("today", "tomorrow", "this morning") agrees with the date it names, and every scoring rule tied to a date names the rendered date. The model reads the seed messages, the lookup results, and the system date sentence; a reply is scored against the goal rules; both have to stay realistic and consistent on any run day.

## Context

- **Scenario files.** `tmp/bench/scenario.json`, `tmp/bench/variants/v1.json` to `v8.json`, and `tmp/bench/variants/ledger/v1.json` to `v8.json` (17 files). Each copy rewords the seed and the requests, so the same date can be written differently in each file. Leave the `.pre-*` backups beside them alone.
- **Where dates live.** An inventory of `variants/ledger/v1.json` found dates in `ledger.clock` (2026-10-08), seed messages 0, 1, 8, 15, 16, 17, 36, 37, 42, 43, and 44, the `tools.lookup_order` and `tools.lookup_customer` tables, the `forbidden`, `expectedAny`, and `forbiddenPatterns` fields of goals g06, g07, and g10, and `notes`. Inventory every file yourself; the other copies word these differently.
- **How the harness uses them.** `tmp/bench3/bench.mjs` runs the records arm under `--profile refined`, which sets `date: on`: the ledger clock stays at `scenario.ledger.clock`, and `buildDateSentence` (line 999) puts `Today is WEEKDAY YYYY-MM-DD.` in the system message. The judge records in `tmp/bench/results/v3/cal-categories.jsonl` are matched by seed index and carry no dates, so they stay valid for a rendered seed.
- **Meaning to keep.** The original frame is Thursday 2026-10-08. Kenji's kettle (`LH-81660`) shipped the business day before today and carries a carrier estimate two business days after today. Tomasz is off the next business day, so depot requests must reach him today. Luis's return window ends 30 days after his order date. Every order date precedes its ship and delivery dates, and every dated event keeps its order against today. Customer-since dates years back carry no meaning relative to today.
- **Staged scorer rules.** `tmp/bench/u2/rules.json` holds the corrected scoring for g01, g03, g04, g05, g06, g08, and g09; some of its g06 patterns name 2026-10-12. These are scored against the rendered files, so they render too.
- **Before files.** `tmp/bench/variants/g06/before/vN.json` is `variants/ledger/vN.json` with `goals` cut to g06 and nothing else changed; the Orchestrator wrote them.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/writing.md` for comments and the report.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Write only under `tmp/bench/dated/` and `tmp/bench/variants/g06/after-*/`. Never run `npm run build` or `npm run clean`. Never edit a scenario file, `rescore.mjs`, either harness, or `tmp/bench/u2/`.

## Scope

- **Owned.** `tmp/bench/dated/` and `tmp/bench/variants/g06/after-*/`, which you create.
- **Off-limits.** Every other path.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each check before the code it checks, and report the checks that fail before the code exists.

## Contracts to land

1. **One date table.** `tmp/bench/dated/dates.mjs` declares every date the 17 files carry, once, with its derivation from the run day `R`: a business-day offset for a business event, a calendar offset from another table date for a stated interval, or fixed for a date with no meaning relative to today. A weekday or weekend run day keeps today equal to `R`, and business-day offsets skip Saturday and Sunday.
2. **Render.** `node tmp/bench/dated/render.mjs --date YYYY-MM-DD --source FILE --out FILE [--goals ID,...] [--rules FILE --rules-out FILE]` rewrites every occurrence of every table date in every written form the file uses (ISO, month and day, weekday names, numeric forms, ordinals), every weekday name and relative word bound to a table date, `ledger.clock`, the seed, the lookup tables, the goal requests, every scoring field, and `notes`. Where a relative word stops being true on a run day (Tomasz's "tomorrow" when the next business day is Monday), the sentence names the day in words a person would write. `--goals` keeps only the listed goals, in source order, and changes nothing else. `--rules` renders a rules file of `tmp/bench/u2/rules.json`'s shape the same way. `--date` also takes `today`, the process's local date. The renderer fails, naming the file and the text, on any date it finds that the table does not declare.
3. **Identity.** Rendering any of the 17 files, and `tmp/bench/u2/rules.json`, at `R` = 2026-10-08 reproduces it byte for byte. Rendering `variants/ledger/vN.json` at 2026-10-08 with `--goals g06-kenji-shipping` equals `variants/g06/before/vN.json` as parsed JSON.
4. **Agreement.** `node tmp/bench/dated/check.mjs` renders all 17 files and the rules file at run days that cover every weekday from Monday to Sunday, a month end, a year end, and 2028-02-29, and fails on any of the following:
   - an unrendered date of the original frame, other than a fixed one;
   - a weekday name that is not the weekday of the date it names;
   - a relative word that disagrees with today;
   - two table dates out of order, or a stated interval broken;
   - a business event on a Saturday or Sunday;
   - a scoring rule that names any date other than the rendered one it stands for;
   - a rendered g06 rule set that misses a written form of the rendered estimate date, checked against hand-written replies for the run day (`fixtures` in `check.mjs`) that relay the estimate in each form, and replies that give only the ship date.
   Every rendered file also parses, keeps every key and array length of its source, and differs from its source only in strings that carry a date, a weekday, or a relative word.
5. **After files.** Render `variants/ledger/v1.json` to `v8.json` at 2026-10-09 with `--goals g06-kenji-shipping` into `tmp/bench/variants/g06/after-2026-10-09/vN.json`, and render `tmp/bench/u2/rules.json` at 2026-10-09 into `tmp/bench/dated/rules-2026-10-09.json`.

## Output

Return the following:
- the date table, with each date's derivation;
- per file, every changed string at 2026-10-09 as source and rendered text;
- seed 0, seed 8, and the `LH-81660` lookup of `after-2026-10-09/v1.json` and `v8.json` as rendered;
- the rendered g06 scoring fields;
- each check that failed before its code existed;
- each gate's exit code.

## Acceptance criteria

1. `node --check` exits 0 for every script in `tmp/bench/dated/`.
2. `node tmp/bench/dated/check.mjs` exits 0.
3. The identity of contract 3 holds for all 17 files and the rules file.
4. `tmp/bench/variants/g06/after-2026-10-09/` holds `v1.json` to `v8.json`.
5. No file outside the owned paths changed.
