# Migration record

This file maps the Larkspur harness from the untracked tree `/home/user/agent/tmp` to this directory. The copy was made on 2026-10-10 while a series (v11) ran from the source tree; no source file was written, moved, or deleted. The edits are to how files find each other, with three exceptions that change control flow or inputs: the `--out` default of `bench/bench.mjs` and `bench3/bench.mjs` (second judgment call), the refusal of `models/sweep.sh` without `G06_RESULTS` (fifth), and the environment variables `V10_RESULTS` and `G06_RESULTS` that four audit scripts read (fourth). `tools/run-one.ts` also resolves `OUT_BASE` to an absolute path (eleventh). No prompt, sampler option, scoring rule, or scenario text changed.

## Judgment calls

- `audit/extract.ts` comes from `results/v10/audit/extract.ts`, because `results/v10/tools/` holds no `extract.ts`. `results/v9/audit/extract.ts` differs in bytes (SHA-256 starts `2d93abda`, against `9369c8ed` for the v10 file); the v10 file names v10 paths and is the one the v10 tooling pairs with.
- The `--out` default of `bench/bench.mjs` and `bench3/bench.mjs` was `HERE/results`; it is `ROOT/tmp`, the documented default output root. A run that passes `--out` is unaffected.
- `--probe-chain`, `--probe-score`, and `bench/u2/compare.mjs` read raw run folders that were under `bench/results/`. They read `../results/` (the sibling `instruments/results` directory) with the same relative paths. That directory holds curated readings only, so these three readers cannot run until the raw folders are placed there. In the scratch copy used for verification, a symlink from `../results` to the original `bench/results` made `--probe-chain` and `--probe-score` print the original output, except one path in the `--probe-chain` output (see the checks table).
- Four audit scripts located their series directory from their own place (`results/v10/tools`, `results/g06/tools`). `audit/extract.ts` and `audit/adjudicated.ts` now read `process.env.V10_RESULTS ?? ../results/v10`; `audit/collect.mjs` and `audit/replay.mjs` read `process.env.G06_RESULTS ?? ../results/g06`. The other audit scripts already took directories as arguments.
- `models/sweep.sh` takes the g06 results directory from the required environment variable `G06_RESULTS` and exits 2 without it. `models/pilot.mjs` already took its request files as arguments and needed no edit.
- `bench/dated/check.mjs` used paths relative to a working directory that held `tmp/bench/`. It now builds absolute paths from `ROOT/bench`. The agreement test still writes `check/DATE/tmp_bench_*.json` under the old file names, so its output is byte-identical (verified in a scratch copy against a scratch copy of the original).
- The comment on the judge import said the ollama package inherits "agent 0.0.28". The source checkout held `@orkestrel/agent` 0.0.29 (`/home/user/ollama/node_modules/@orkestrel/agent/package.json`), so the comment now says 0.0.29, names `node_modules` and the vendored agent build, and keeps the stated reason (the judge's errors are not instances of the agent build's error classes).
- `package.json` pins `@orkestrel/agent` 0.0.29 for the vendored ollama build and the other eleven packages at the versions in `/home/user/agent/node_modules` (`@orkestrel/ndjson` 0.0.12 comes from the ollama checkout, which held the same versions, except a top-level `@orkestrel/emitter` 0.0.11 beside a nested 0.0.12 under its agent package; the pin is 0.0.12). `npm install` added 14 packages including `@orkestrel/indexeddb` 0.0.14 and `@orkestrel/sqlite` 0.0.14 as transitive dependencies of `@orkestrel/database`; `package-lock.json` resolves every package from `registry.npmjs.org`.
- `tmp/` does not exist and has no `.gitkeep`: the root `.gitignore` ignores the name `tmp`, so a `.gitkeep` inside it would be ignored too. `bench.mjs` creates its `--out` folder, but `tools/run-one.ts` and `tools/series.ts` append to `BASE/run.log` without creating `BASE`, so `README.md` tells you to run `mkdir -p tmp/SERIES` first. This differs from the brief's statement that the tools create the root on demand; the tools are unchanged.
- `bench3/records-check.mjs` reads `../results/v9/RECORDS-PLAN.md` (the sibling `instruments/results` directory) with the path it had in the source tree, so it is a fourth reader of `../results/` and the harness directory is not self-contained. The file exists there and the check passes.
- `tools/run-one.ts` built `out` with `join(base, name)`. A relative `OUT_BASE` stayed relative, so `--out` and `RECORD_DIR` resolved against the harness's own working directory (`bench/` or `bench3/`) and the overwrite refusal looked in the wrong place. It is `resolve(base, name)`, and `log` is `resolve(base, 'run.log')`. The source tool has the same flaw; its recorded runs passed absolute arguments, so they were unaffected. The `harness-sha256` that the tool logs differs from the value the source tree logged, because `bench/bench.mjs` and `bench3/bench.mjs` are edited files: v11 logged `b5c49e…` (`bench`) and `67c863…` (`bench3`); the copies hash to `9bed44…` and `19b1d8…`.
- The judge path (`vendor/ollama/index.js` with its `@orkestrel/agent` 0.0.29) loads from the shared `node_modules` in this directory. In the source trees the judge's `@orkestrel/*` modules came from `/home/user/ollama/node_modules` and the agent's from `/home/user/agent/node_modules`, as separate instances; the two now share one install. `tools/probe-judge.mjs` covers the import (see the checks table).
- Skipped on purpose: every `*.pre-*`, `*.frozen-*`, and `*.next` backup; `bench/think-predict.diff` and `bench3/think-predict.diff`; `bench/goals/`, `bench/results/`, and the `*.jsonl` files in `bench/models/` (output); the scratch directories `bench/u2/apply-test-*`; and the `*.log` and `*.txt` files in `bench/dated/` and `bench/u2/` (the brief names only `*.json`, `*.mjs`, `*.ts`, and `*.md`). `data/ledger-deny-first/memory.log` was copied but the root `.gitignore` pattern `*.log` ignores it, so git does not track it; no code path of the replay reads it.
- `bench/README.md`, `bench3/README.md`, and both `BRIEFING.md` files are byte copies. They keep the original absolute paths because they record history and commands as run.
- `bench3/records-fixtures.json` and `bench/u2/apply-tests.json` are data and keep the original paths inside their strings.

## Remaining references to the original tree

The sweep ran `grep -rIn` over this directory, excluding `node_modules`, `data/`, `MIGRATION.md`, and `package-lock.json`, for the four patterns `/home/user/agent/tmp`, `/home/user/agent/dist`, `/home/user/ollama/dist`, and `/home/user/agent-port`. The result is 62 lines in 8 files for the first pattern, 3 lines in 3 files for the second, 1 line in 1 file for the third, and no line for the fourth.

| File | Lines | Why it remains |
| --- | --- | --- |
| `bench/README.md` | 23 | Byte copy of the original; commands and history as run. |
| `bench3/README.md` | 23 | Byte copy of the original; commands and history as run. |
| `bench/BRIEFING.md` | 6 | Byte copy of the original briefing. |
| `bench3/BRIEFING.md` | 6 | Byte copy of the original briefing. |
| `README.md` | 3 | The table of vendored builds names their source paths, and the section on older documents names the original prefix. |
| `bench3/records-fixtures.json` | 3 | Fixture strings that describe how the recorded points were derived; data. |
| `bench/u2/apply-tests.json` | 1 | A recorded sandbox path in test output; data. |
| `audit/audit.js` | 1 | A line of the auditors' prompt (`FACTS`) names the original `scenario.json`. The prompt is unchanged because it is a prompt; the file is byte-identical to `bench/scenario.json` while the original exists. Point it at `bench/scenario.json` before an audit that runs after the original tree is gone. |

Three user-facing strings name the old relative layout `tmp/bench/...` and are unchanged because they are output text: the `--scenario` error in `bench3/bench.mjs` (line 274), and the usage lines in `bench/u2/apply.mjs` (line 119) and `bench/u2/compare.mjs` (line 88).

## Checks

All checks ran offline. A preload that replaces `fetch` with a function that throws and logs wrapped each run of a harness file; none logged a call. The comparisons ran the original and the copy with the same arguments and `--out` directories outside both trees.

| Check | Result |
| --- | --- |
| `node --check` on every `.mjs` and `.js` file | Exit 0 for all, except `audit/audit.js` and `audit/g06-audit.js`, which exit 1 with `Illegal return statement` in the original too: they are workflow-script bodies. Both parse as async function bodies. |
| `node --check` on the two vendored builds | Exit 0 for both; the SHA-256 of each equals its source. |
| `.ts` files | Each of `tools/run-one.ts`, `tools/series.ts`, `tools/plan.ts`, `audit/items.ts`, `audit/extract.ts`, `audit/tally.ts`, `audit/inspect.ts`, and `audit/adjudicated.ts` calls `process.exit(main())` on import, so it was run with no arguments instead: exit 64 and its usage line for each. `bench/dated/types.ts` imports cleanly. `bench/u2/verify.ts` was skipped because it writes a sandbox and `apply-tests.json`. |
| `node bench3/bench.mjs --check-ledger`, original and copy | Both exit 0 with 255 output lines; the outputs differ only in 3 lines (lines 177 to 179), which print the replay path, the judgments path, and the scenario path. Rerun from `/` with the copy's absolute path, the copy gives the same output as from its own directory. No run called `fetch`. |
| `node bench/bench.mjs --probe-exchanges`, `--probe-guard`, `--probe-reply`, `--probe-search` | Original and copy exit 0 with byte-identical output. |
| `--probe-chain`, `--probe-score` | The copy exits 1 with ENOENT on the raw folder (see the third judgment call). In a scratch copy with `../results` linked to the original results, the copy printed the original output, differing only in one path in `--probe-chain`; `--probe-score` exits 1 in the original and the copy, with identical output. |
| `bench3/records-check.mjs` | Original and copy exit 0 with identical output. |
| `tools/probe-judge.mjs` (added by this migration, run from the harness directory and from `/`) | Exit 0 in both; it prints `createOllamaJudge function; judge OllamaJudge; extends AgentJudge; fetch calls 0`. With a stub `vendor/ollama/index.js` in a scratch copy it exits 1 (no export); with the `@orkestrel/agent` import renamed it exits 1 with `ERR_MODULE_NOT_FOUND`. The earlier checks never load the vendored judge build. |
| `tools/run-one.ts` with a relative `OUT_BASE` | In a scratch tree with a stub cold start and stub harness files, a relative base wrote the run files under that base, and a rerun exited 2 with the overwrite refusal. The real cold start contacts the daemon, so no run used it. |
| `bench/variants/check.mjs`, `bench/check-long.mjs`, `bench/u2/apply.mjs --check` | Original and copy give the same exit codes (2, 3, 0) and identical output, except two paths in the `variants/check.mjs` message. |
| `node --test bench/dated/check.mjs` in scratch copies of both trees | Both give 7 tests, 6 passed, and the `CLI` case failed; the files written under `dated/check/` are byte-identical between the two. |
| `tools/plan.ts` and `models/plan.mjs` against the originals | Identical plans after mapping the `bench` and `data` path prefixes. |
| `tools/series.ts` with a plan whose only run is finished | Exit 0 and `done`; no run started. |
| `models/sweep.sh` | `sh -n` exits 0; without `G06_RESULTS` it exits 2 with the message; with it set and no tags it exits 0. |
| Source tree afterward | A listing of `bench/` and `bench3/` before and after differs only in `bench/results/v11/`, which the running series writes. |

## Files

Each row lists the destination under the harness directory, the source, the source SHA-256, and the destination SHA-256 (`same` when the bytes match). 342 source files: 324 byte-identical, 18 changed. Files this migration created (`README.md`, `MIGRATION.md`, `package.json`, `package-lock.json`, `tools/probe-judge.mjs`) have no source.

| Destination | Source | Source SHA-256 | Destination SHA-256 |
| --- | --- | --- | --- |
| `audit/adjudicated.ts` | `/home/user/agent/tmp/bench/results/v10/tools/adjudicated.ts` | `a9411d0837407238985aac99cd1b8818a402f395202823353b1fdbbd395301fc` | `c5bf51fff4c74f205ec5e14708d87145c54f674fe82b5c9fed40c8328270b390` |
| `audit/audit.js` | `/home/user/agent/tmp/bench/results/v10/tools/audit.js` | `d86e265a0e3ca55352d2f5213112bc8ded144ee31dc1873ced91d36c2c9b4f55` | `same` |
| `audit/collect.mjs` | `/home/user/agent/tmp/bench/results/g06/tools/collect.mjs` | `a75eb964da3b11e64c9896a0f56e1d64f0bd200b71e3a94ea789337108c0d727` | `d7874736bc40cd73f732958760d69a947e86a932b9d21a6dc3806f4cdd94a246` |
| `audit/extract.ts` | `/home/user/agent/tmp/bench/results/v10/audit/extract.ts` | `9369c8ed749401bc64c36c5b7770d47128bd8e5ae34b1e11bdc938218a3433b3` | `05da2dc9f622cd234f4cf8a894862d56fd54eaad3d7e3cacbde67d47cccb8119` |
| `audit/g06-audit.js` | `/home/user/agent/tmp/bench/results/g06/tools/audit.js` | `1625e5be37aa20a619be183dafd8ec9cedeedf8a142920edbf8e4db912d3c4c5` | `same` |
| `audit/inspect.ts` | `/home/user/agent/tmp/bench/results/v10/tools/inspect.ts` | `55ee050a1d1e2c44382fa66f9ab517eec48f6331981f7cb53fae1f5c4dd68500` | `same` |
| `audit/items.mjs` | `/home/user/agent/tmp/bench/results/g06/tools/items.mjs` | `2491172ad72b4b8d08333077407f09edd516c2c5b7f6b65513f07f6fed589e6a` | `same` |
| `audit/items.ts` | `/home/user/agent/tmp/bench/results/v10/tools/items.ts` | `652f6bdfeba55e8210e1a676be8f93ae67ed0aedb55b1c877afeb6625d38cf68` | `85fb4e340c4d0b0b18dcd1ef4b3e892b912362c9e2b7ccd39d9707ad2e134ff3` |
| `audit/probe-items.mjs` | `/home/user/agent/tmp/bench/results/g06/tools/probe-items.mjs` | `9cd00043b0fcdee646049af65345ab74f2b7fa25475f634568059916f2e0b7dd` | `8a1c1ce6e8338e30db1c10c4bb6f6cab729a1090fc22bb8d926109a1963783fa` |
| `audit/replay.mjs` | `/home/user/agent/tmp/bench/results/g06/tools/replay.mjs` | `263cc7e99f11d7aa738fdc07a2fc806ae5d13e9be1233f9b696eb69fa8ad85a8` | `ec24313247acba9682f47b50a0a523998680363f7653ba5dac721d94513b6359` |
| `audit/tally.ts` | `/home/user/agent/tmp/bench/results/v10/tools/tally.ts` | `7471237c7b96ad63275c9ed828fdb14e8353a8e2ba07d5d8b2343ef968bb82a8` | `same` |
| `audit/trace.mjs` | `/home/user/agent/tmp/bench/results/g06/tools/trace.mjs` | `4d26760ed7e58fa28632c992917a416d4ef26f9110f16f5e89b38c368629ea78` | `same` |
| `audit/variants.mjs` | `/home/user/agent/tmp/bench/results/g06/tools/variants.mjs` | `2c8bffbfcf8eee98e81b13b8cdab1517c64b1ae79628a44a9b68adbffbae2d74` | `cac3d9b1156a406fb8100d1430aa1af8b4e0b587e4ed3a877e3d737ae3520427` |
| `bench/BRIEFING.md` | `/home/user/agent/tmp/bench/BRIEFING.md` | `3f981bf230a0e70f2176406132175b4393f3e124bccff27366f909aa9968685a` | `same` |
| `bench/README.md` | `/home/user/agent/tmp/bench/README.md` | `5922adbcaf0db4be292bfccd02e67096072a73b0796069fb5e1f6a58f3dbcc99` | `same` |
| `bench/bench.mjs` | `/home/user/agent/tmp/bench/bench.mjs` | `b5c49ee4c16b31c849ddceb68c93296da360e2271a4a5a5cd076ca791c04e0a5` | `9bed447c5e35d2ab4be286d247808f6d70ced0f45e90d266cc75cdec325f83c9` |
| `bench/check-long.mjs` | `/home/user/agent/tmp/bench/check-long.mjs` | `1ed8cf278bb7473d81a17ef6612b7a9e48c8be47653dc9dbebcd9a29cd558628` | `same` |
| `bench/dated/Renderer.mjs` | `/home/user/agent/tmp/bench/dated/Renderer.mjs` | `62edfd3bd2f070ff389e7644bed076365caa4f6949f69224783bc0733e34044d` | `same` |
| `bench/dated/changes.json` | `/home/user/agent/tmp/bench/dated/changes.json` | `df78b8563ae0d98be600dcfe4bdae6542374e523b0bd46be87c6e81bbac75ec6` | `same` |
| `bench/dated/check.mjs` | `/home/user/agent/tmp/bench/dated/check.mjs` | `cc6bd6e8cb445897eb9ba04db024fca6f2c0c98586f131e15f78db689f1f2c60` | `7dbd3ea294d1e4a81190b8bcb6918e789d0ed8dd321ff7320164d689ea228e73` |
| `bench/dated/check/2026-10-09/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_scenario.json` | `86f0b8319c444e219c79eb7bea519c6c34fbb4a932d6d78964272d68f8c8058c` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_u2_rules.json` | `cbc258bf57828b280f8b3c49bf02838402be88b372556e516b9313daa01f0df8` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v1.json` | `564be8bc1409ccd8ade7719d537070ebece526cd8ec6906c3ad77e3ec019dd77` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v2.json` | `f0a128167f6657b2f27eb043c44402bc6184116e425868086828a84cbb9e47d2` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v3.json` | `9fb0502f6f011b23bc61c1aa0d66a366e96aeb2302dd88542da590b3ab32933e` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v4.json` | `d5ba0f73bec2e9982eee3f3740ed3ea27dd86aa208a8bc4dfbfb6fb52312c367` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v5.json` | `2e48485d7bddea7ce6f5bba6308cc17a2ff46a5ceb52777dc891abdd772bf23a` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v6.json` | `95e08ad2a0baf85a33be2e8a55ac99feed65c22585612b999427db20c5afbbf4` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v7.json` | `c5780fe3e60b04b209f8493bff0b999611f4667c7eab7f263d2dd5b7a9a33f27` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_ledger_v8.json` | `785e96b9b73bc769c5171702c41fd47b1002446f3efb1686921e86c1efb1309a` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v1.json` | `dbc3458611dfd98d0879c9cb911333d28f522355fcc1fc5c4662f851206ac0c4` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v2.json` | `3635a6d630e1ef4895c0b437d3e3ddaf0342b22a3f871501dfd0679d62acca4b` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v3.json` | `c1fd93760a60c234352600413483e79d867ad5945ab2c31c18f11f8e54ef7db1` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v4.json` | `875999e389757c3098f1f93c74edef2f1aa4993001b5123789984b70b7ac8e97` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v5.json` | `4215db4fc5d0e73212ef10dc9f760136c612ee3f39945f09aca87dd29bd98f7b` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v6.json` | `f40c3cc9e10a7ba4dc10cd72433219323dec982edb1494d5f20491365199bac1` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v7.json` | `2670296c2b67a52d42090acfe1cba3b99c3fd1507d1f10623ee0d83c13d8aa06` | `same` |
| `bench/dated/check/2026-10-09/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2026-10-09/tmp_bench_variants_v8.json` | `8bc27c6bf209e9ac2210a77462a0b00efab2e7e98743e38d395c790a51488a3a` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_scenario.json` | `a356ffe3ebc67a289597f574465b99155941e28ddae252ca7ee6b3f21a2d8ccd` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_u2_rules.json` | `af238db0df9ce29703ab28a00f294d3967b4cb9f9bf22b7b248506a17fb94c16` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v1.json` | `12c8463bdc9e1088be0d5ffee042d253aeb8a87426ce1a2e4b158dc2ff0219ac` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v2.json` | `8e70489264622daefda8ec6e7b65222f5713a3970d0abb26284a7783ab65adf4` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v3.json` | `9ff8e44dde95664cfc58715c57b1af26dba981f982ab688fdd38a3442679a78c` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v4.json` | `ca0ea8968fed9f1050aa53bce9c25454eedc1bac21a44568cfa8a2a25591a1a1` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v5.json` | `3aeb7488c2488013e47b9b506438762433391d92bba112ab15ff5a81d2b199f0` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v6.json` | `e674243094eed479ed1433d4a6ef676529b5f3154f62fd01de3880a05be65423` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v7.json` | `343c0b503249073e0498e87c0230a94a85f48a614a1e6c9a12791ffef2b1d678` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_ledger_v8.json` | `6e2a2e5a73c056d41d682727ccfc4e7ece675a5e9880b05bb71a7a9e47111005` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v1.json` | `bf2a3afc319c219f9b1470ab6eed8e41919ce4b39141fd0e6f6538eba146153b` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v2.json` | `6758f5cf46502549d0630db174441a44d9ea24e32a8c0ba393878ea065d936bb` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v3.json` | `147f425628c2c12147b356a465836c8842704aa17fe3867fa6e7f26220c3b7f1` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v4.json` | `a667a768d39dafc946a1a3a5d8a2587987ff6fd46fc33f6c350d209e81c46280` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v5.json` | `3fe3221cbd84df45bf7927cd4abf6170ae10e5c3ec486790c73ef079888a36e3` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v6.json` | `1f0225648c71fafef8bff163b796299bf842cfa089fe244f53c45ffb77942c1f` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v7.json` | `a3213480cdf46b9b580f4430d2a84eff920dc3cab2a2fcf62cc9e7d6af27b499` | `same` |
| `bench/dated/check/2027-01-04/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-04/tmp_bench_variants_v8.json` | `df8d2bd5c86f73d1b2e764773a078bd3e50bd7dee2efdd0191fb9cfa2359223d` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_scenario.json` | `55ab883d66f205a56ea3a4097039fe521b95d31c87021d5a22f663ade8dd8108` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_u2_rules.json` | `c866eddf676088a7aa37944a620c255654c38f371a70503faba141b75a3e517b` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v1.json` | `7f2392d6aaa7edf6dc45be52f3f1abd8bdebf6fdd95aa5613860f1dee54f7f68` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v2.json` | `e9d166a1d516c6a3eb42e686b97dae0f09e206111ce2cfdfd1ec3888f43810d2` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v3.json` | `2f34b5fbe6ec6ff02b6ca1680760d8ecaef3f44ffc31d359cb24e6323b4ada5c` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v4.json` | `2ca11d45356af44f5d78aacf1543afbf17efe78e6570abd1b0b5a1c42e4a4190` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v5.json` | `d7cef47b5880fee5b1d74cc40a9e1fe28bc58ef7d8ee7962520942e69c81e6cd` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v6.json` | `21eb5075b23fa2d4d1c19a02904ac07817e2ac5005163856cc5be95ea60aad5c` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v7.json` | `2f8656e677949e6b9e99c5f5b5d0d1141ac8f68a714cfec005404f432ae90635` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_ledger_v8.json` | `7fc16eae37cca17c440b0f7a56751818f0107e800f496fc4a078708ab777a527` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v1.json` | `8adb10dc3ab76cddfb60e52d94b80d8287785be656afd3ddf4fb77ebc464ffd5` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v2.json` | `7bb7ac04d7a2501f936f13c84e81c67b3b45152f6d122c42db76d41eaabd87d4` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v3.json` | `551edbddf56e099ba2ff82bcaff3b1dd7018b2561b6bbb06f63f09156ca3042d` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v4.json` | `e948ecd721cc38e40a5be41ca6fa8266d2d7580a8d158f021cb139def637d927` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v5.json` | `8d9b26d14182dd2e4e2a2c0820bca624ec22ef988afa2d374acaeccbfbfec6ab` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v6.json` | `607ec3f61a3391019e9e570a67b228ea0c904bb2418fb8af35e7400d4e79e18f` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v7.json` | `9934210d6cca97bfd031961f42440879b02fe0312aa6681a680091dcc3eca6e8` | `same` |
| `bench/dated/check/2027-01-05/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-05/tmp_bench_variants_v8.json` | `be5d8c95e18c180b7e273ac8d13200e9069ed0f44ea08ddd38226bd822cc47d8` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_scenario.json` | `d54e8e7b18e93c0393d29c4a91a1d57747d8952962b0a833243183aeb6077782` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_u2_rules.json` | `4165f57af9308fb634e0c8282c676a9b0b42b0b7c35e46aa045d537b68531b01` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v1.json` | `647321eb7e6b12b1437e712e2a0950c18c5a694f981d46f06436d39e6a40c9fb` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v2.json` | `90907efb2850afd458e7d7a13d04062bf126b3e78e53dd9052ec262af2dc7357` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v3.json` | `34423db0404341a1022867949ccc6a2d796e4181a8490e128842c3b9b99d1f60` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v4.json` | `2b08470504771a6aaae538ee878d004caf2bdab21e7183dba169e5841d73be51` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v5.json` | `27f5ecb6d53577757ec809405aeb2ccabeac6fc0634da7ba47dfc4596be9a260` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v6.json` | `abc288b5d88eecd2c10a5847ac587cea8ee299b2bfb897b307f0fcc00f70410c` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v7.json` | `a5c61a3b158682c9e7050c9d9e69665f9b5a1666abcb76e01a50d25b4a31849d` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_ledger_v8.json` | `be28902a68c2a66313a577dccb20d0ef62d647322bbc54e49126fe6a05e852d7` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v1.json` | `5836a986df5437bd3d2dc26d9791ba5b46fc5e41f102d5e2629f8bf63571ba0f` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v2.json` | `6c93e4ae1c26d0e071f47299f6c3968348a313e721b016376a437ef195035a4e` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v3.json` | `6077ca9c96238397806b044156bc2d191c5a43e50186b66f179d9a4cc157f644` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v4.json` | `1c085e60895c89aabe45bddf049cbe36ce7f1802dbf480844fe03759c16d88c3` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v5.json` | `8e66d8e4daff219afd750cf9bf0ab7cea06575dc09f5019bb2142402d189b0f1` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v6.json` | `3573bbf838efac8d903bc443be058c2f1c77521ab565ed84da6bbd562fc269a0` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v7.json` | `84202396874a042918976a01eaa0d00b31f3f717a199bf2da0cd6c29c76b24c6` | `same` |
| `bench/dated/check/2027-01-06/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-06/tmp_bench_variants_v8.json` | `f1cb3c1c88df12e0a7f0f71e688af9fe89298c921d08d45f3d95a19878ae9704` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_scenario.json` | `4d4d932fcfa3dc39038525e4c244c480d4c0421a041902afbf5cd38321f94526` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_u2_rules.json` | `11810f79d22dd25d2ee41b5bfbfbb7d6a0f2b18ca9ea108c5fbace0d84fef8e4` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v1.json` | `2170d33027e23d691a47d697561435184ac64ae2da1cc6bb927f644528e4b720` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v2.json` | `d59fff552d96dc61323b81ebee04424a1a6150382d2a007fce30c1e92d10e122` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v3.json` | `5bb012172801915f0fd150d210282d828aa8596d5895e78279b0b87e1b34df60` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v4.json` | `8773ca7e131eb2ddcf275838806608c8e1ade87905ef446724ed0867c2b679c9` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v5.json` | `e2c30612fd437f5694fc244c8c5e0d37cebed1063f91b272e37cbd01e23b7273` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v6.json` | `517186e03e05d866afc2fce59f7197f06a2eb7bcf93c37c8f1c89aacb1988c4b` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v7.json` | `e463613a8d069b2df0d95f5c29f9029f76f9bbf28ad556837145f64198a28919` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_ledger_v8.json` | `a227d7c01c83e2b37344dcf4ca0cd64a4861233f18fb6427d218b10438e91f0f` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v1.json` | `72c1a167f3431e70b522bff59273be2baa00cfae3b21a8a5b0e6dc03b6610ef3` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v2.json` | `44da7e61c86ce6094cd9b1e228a0830c402f56a8de722b4ff9425bbee60c6c9f` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v3.json` | `aa2f0508efee8ae7402661b9882326bc0fb5d45cdae2f942ba50b99956bd33d8` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v4.json` | `d93b38ba7e64fab3d8c64eef3a547c00458f08cf1ba131c1cb4e8677ee05d0ea` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v5.json` | `6cf7d4e7bc21332396e2ff84485fde502340cb36d7297a65cd5efe252c7487f0` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v6.json` | `4a0afb0062974d4486ee182946f17bef51baf7d8f51831103549d9e4e5986080` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v7.json` | `4ad85df8b3cf9d857945cabd6b4e63224e4ae9cc7cce01064507afc3c95b7f1f` | `same` |
| `bench/dated/check/2027-01-07/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-07/tmp_bench_variants_v8.json` | `124cedd505ed92f2e6ee96aa6ea57186994617cd18c54a67b05dc9af5c503759` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_scenario.json` | `343df569277d979e49524614237b9fd439acc1934eb7277422df6d9ab19f9bfc` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_u2_rules.json` | `932ab21d012cf9476c23630848f3bda69448ade35e82e9dee747fe52de6599aa` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v1.json` | `504e627da1ef34c2c5c551b57cc087bfbe5741b288f8802b77b5852b8f415ffb` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v2.json` | `73c01849011954c224307438cd1bcc0c481c2c0c0761595c11f8377efa1ef764` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v3.json` | `b75917a6168872e23d41b2785456f2d5f9de28137bee4e8fde3d85d57510ac70` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v4.json` | `e5db26ae3cec61d205e29a2d4f8985d183aaa773e445c9be7fd395b8e83a3476` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v5.json` | `b747949320fae67c6bbd4f89e0e5a5204b86902eaa224ef74287951c10ff318a` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v6.json` | `17623d3708413f0e7f4598b7d6f74a51ca2f302d04e942babf6089df28a9da3c` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v7.json` | `57f6ba917e52819cf672be7618c8458e8eec5b2345a5b818921a46679d2fa1a8` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_ledger_v8.json` | `0e3f4224b3a611ddc28bead5ee72400f2d090284fba32616084d0e9ed9d92216` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v1.json` | `c202e77ffeb6a46a7ae487cdff0a1a6a581d7f503f18c7765f9e3f76e9b63105` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v2.json` | `6de62a8803f6fe780447b089df3732e26d5675a659c4b133cf39b8fa7c8f441d` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v3.json` | `ce5f8dba8a812132444fe4c0f12f1f2622c4fb1a05355186d5562d17cd0f967b` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v4.json` | `9c3c80997b672529adc51f0eff964289e684f71a92b5a4f4f7c15065611e2ac3` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v5.json` | `e580ec80010a46a887bff5a4f22d10f0796a6b913df267a8905e59d21ce48b72` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v6.json` | `349503c6dc4f7f09aa927fe07df4e25635da62fc13ac8fbdff2f55de8bedc2a9` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v7.json` | `07f58ad2746fc87f35fecadd6869ee6259f36311ecc981d9b984b4fbe272a9b6` | `same` |
| `bench/dated/check/2027-01-08/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-08/tmp_bench_variants_v8.json` | `671fd775669e94dacc76a73ca5d290472386807eff9b4e43b333ccbd461e35b1` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_scenario.json` | `59a93c9c1958ee52ce4c7f5e40b9b98c4f967f3386f5c2eff39f8850ebbf4c7e` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_u2_rules.json` | `932ab21d012cf9476c23630848f3bda69448ade35e82e9dee747fe52de6599aa` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v1.json` | `26d399d37d95d3e9a57db27b6931b2cc8c5053fc8548723414ee0cfd092bc2a2` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v2.json` | `2b285917e1ef1a7c6b0830b7c3943d7de73ea1eafcb1ad9c0c86757562a8adae` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v3.json` | `18de80772cfe4e431bf4ff367e4def0c8e4b912a9e12a155e7e86b6c68590d70` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v4.json` | `c7b95a0c0204d72ea8b4cf13fcfc63286c90eb74ad7156ee55b2fb7423ad5ed9` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v5.json` | `fb05264d1cb36b2e5a510e55867186234f656c6838fdb93960290a4da2565ae1` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v6.json` | `4c3276fc50091bc85f05a317c9a48542746c9c0eb00bdcf47b3c48d9de79a822` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v7.json` | `ee21fd82ba80edc0e239803d59222ba37dc49455afbffdb58690e5cf293c4fee` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_ledger_v8.json` | `1ccfef18ffa61d6edfd2ff67b48aa4c82c74b3d1b30b972e7c185cfa6982e509` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v1.json` | `325f8540c374f6bf41c023654a0406753468ed23623d3ba654fd5c72e9743689` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v2.json` | `e3e5df412ec9679a1d12f7f4e91a0fbee2c687bdb04046b8fa5f23628a70b44c` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v3.json` | `3407fa5639d7f3cab8523f5481e49708f3820e570de9300713009bf94670c5ef` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v4.json` | `cddcc994bac3912a8145e7c47b4c4969352975fcd89c7df4a08fda2dc5b383ab` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v5.json` | `4ae1be9fc90b9cd788d20c85f8bdf9de5674ab5e4f6391663e55ae182c6dfc64` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v6.json` | `1695db2d5ee897cfefbc4421bf7f7e09a2ff4cb772c5907d22c33074c8729e46` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v7.json` | `a8e4cb591b71b8d3aeafbcdfac33e5cc4ba7cd45de9d43545cfb9dcbd8c0bc9c` | `same` |
| `bench/dated/check/2027-01-09/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-09/tmp_bench_variants_v8.json` | `b7dc7ee33fc5a367fb58c4680891c0047df394b2b30b2f1a4a7e77c443c65513` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_scenario.json` | `dfc30c3eb356e2f8a705a13bc30fd3feefd75e04bd1d5119eadb2e57b179b207` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_u2_rules.json` | `932ab21d012cf9476c23630848f3bda69448ade35e82e9dee747fe52de6599aa` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v1.json` | `22776ccd27171d9ae7f4b44294bc8eacf327e7ae791d2e11fb7e6c533fd7f347` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v2.json` | `c1b7d2e7f587752f65f9148c2253c6e765d8a6fcda6e69dcffd8e4dfc5687991` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v3.json` | `ae39c4ee256b5302dd0885793a87f84c0c3a573edbc71b03a9b6c53cb5dd6cc4` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v4.json` | `495fc3c0302864c2722123bf0b4ba99a8db25a566605cf607ac4495271831f5d` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v5.json` | `d2a221ac0a492dda9bed3e68883568c710f016905bee8df92e224da688295b33` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v6.json` | `7e47a93fe48a1fc727137e69b4faad8066d34bc5e45d87df263a8af4420b1b70` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v7.json` | `6789b5e230d87c9c56da696dd7445c0c9fff84545b7717294c3b1c5c282b19c8` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_ledger_v8.json` | `b9d8f5d02720954d0efc49c6e1431c87ca6d88e28731ab8a7f0c7a8e8f2619f4` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v1.json` | `f1f29957f7a35b157b2e73f33d0d9fc6d793b28b6a82ce18a63d401286a49c76` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v2.json` | `fac4ddecac0f1415bcd7600106c03dde890d76dfc882a7597be1fc0ffbc14635` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v3.json` | `95d100bd63b2cadb9f4d79124bffc09aacc7da14d06e9cbff378ffe011ef0082` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v4.json` | `6b10e329c21ed97c9375a4b09799a4bede0bd0860ab8e80c041923f177e468a7` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v5.json` | `534434627d3aeea1723665ebe6b49475cd367e8dae042315fb60e07f167d4a71` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v6.json` | `6f600bf289fd56c73a0a9384472949c9763080ae026a2eea70999127f1cc8e52` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v7.json` | `39f2fa55d8e447d859130fd18a99153933413d88b2f5af5f99481f7151e4ba62` | `same` |
| `bench/dated/check/2027-01-10/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-10/tmp_bench_variants_v8.json` | `13134e964c5ba4e85bee67c4c1d39fa5068fb85f11e4905dd32f818a9763f433` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_scenario.json` | `36952af4eb08b804a38cd2ee16df024834f504f0b43ec506b381539bab417dd1` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_u2_rules.json` | `a87c9bbffa0e79c324babdfca1d2b1e9e131cd65152df3a567ffe9821b3477e4` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v1.json` | `56b2b85655ad2fa0bb3eccfc32a038ab4381c360d278de23620dde69b13e10cf` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v2.json` | `bda3b202f8ce4e73d733e42f21fe37ace6558d1750e33395779903d3046ef911` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v3.json` | `62aee9618bac2bf39fa284d2c33c54505c4bfb7aace2bf9e98982513986fdec6` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v4.json` | `ba50491a249b8ed5a36bd25c0a78edba208798ed3b31a3d3203d831f0a30e47b` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v5.json` | `fa41119eebf5efdaac250638ecc43292b0d9d1b50a6202ecf3feb27344598557` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v6.json` | `59887519ff7b2ecb847965896ce12486b8669789613eb85c63ceb1bc1f1dffe1` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v7.json` | `611488885f705611bdf479d37125ff207aa2c6fe6867f71162611d3ce777aba0` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_ledger_v8.json` | `91bb65a954ba81d26e18a887fd069cce34c6e1e1a00bdf690388d169e96eccf3` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v1.json` | `a522d609d1eed5e9f5bf527cc5e9cdf5aa295e5b8357b7370c534df4e7673e3b` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v2.json` | `280941e5cd0497aefc1ea2a39175265e006c149c124e1a5febd297af19698c5b` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v3.json` | `28a29264ab43b6cdd75e9d61a77668978cf78393343a929ef44896f7977797e8` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v4.json` | `175592c121e36c560342c4dcf5e8adb3c9b38f683145db1a7c339417d1466130` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v5.json` | `c8c14817ed77c734a9f043529cf15a8574ed5b178403c0bf1a1d74acd65fe807` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v6.json` | `6406a7440a0eceb5ccd4b986cb0b5c68899dcc7aa0e1c735fd1007426bebdbbf` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v7.json` | `e1bdae1854137a26e9e013c2a6f3fc4203b5c4ec926506394a96e157d344b8fe` | `same` |
| `bench/dated/check/2027-01-31/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-01-31/tmp_bench_variants_v8.json` | `e51c572630407a6803482874cc6a5110d6a611ebe6635443842d5b24cdf9eefd` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_scenario.json` | `cd153f7affd40f3e7634f9f8e98f62e16f9581b279628aee0f7e7a789798d132` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_u2_rules.json` | `f7c934a7aa1ff27d85c04aae4d81251411aa48e8deea770905a35fc1303bbc79` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v1.json` | `9f2b193078564cb2417fc05ab3349793793d884da7f99cee08422f2c0009d773` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v2.json` | `4adfacc43636e5aa12202aa4fd082fbcca86642b028bf5029173d57edba538fa` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v3.json` | `ce490ded2b7eecd4f14ae07790d11a8769e09c3546f7099b036a2ea0ead7b49d` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v4.json` | `aacb0085d2d7471d45ffa5c35f4d10d5fbc241a3d812bbbdd9ec60c0d98ba829` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v5.json` | `a425a2658dc191b6b9fb1620942dd02290c63deebd8e907a5bba2ecd8b77e9f2` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v6.json` | `59d7e93afe59d91de21a390c3025dd5fe0014e90e2a14c144aea5d508791123f` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v7.json` | `6a03b4b5442517c0b320d4b7974f8688652f89b39d1ffe184dc67dd6bfebffc3` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_ledger_v8.json` | `dd8dbed45af0768cdb498cd4aa22e517a5d647f57f724fad273050bb384fe470` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v1.json` | `4c11870c8db4dfa225a7e968b7e9dcaa6fe6500d47c46aa3e272058453e5b3ab` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v2.json` | `5df219e573b9d1c3ef16df00a318e55136e3089143914155915bf7a293136844` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v3.json` | `1a6d8189a801dad527a4a053352f56161b06db65922ee692eae220755bd71c2d` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v4.json` | `99a65e73d0dfcb87d33a71215e0bafa454985ae0b2154f1352c952671718a7fb` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v5.json` | `15c63bafa6ecef6b8ea48f4a463d011c54c8691692370ebdf6ac7a3ca3967bfc` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v6.json` | `bbc52fb1d1003a79a6c4d5d41cd15fe79b4baa920aa9f3ca97f734467641615b` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v7.json` | `84eb0465c2289f058f792c79f8bb1fddd280137dc9fe6e2b8166db7bb6c76027` | `same` |
| `bench/dated/check/2027-12-31/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2027-12-31/tmp_bench_variants_v8.json` | `1b1ea25e0b387b48e769eb95635ec17b36fafc451b09d512234cf785ffc23393` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_scenario.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_scenario.json` | `02804591183f51f3de44ccb72f84160d0a89b7acb6542ba2c1f363214ca3a07e` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_u2_rules.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_u2_rules.json` | `3b2c534e176fb1d3ccae7640a292f67a9e93646df16af7994507810339a47cf6` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v1.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v1.json` | `5553823b2246475327d23430a0f241531559b4aa75f33c5f4ea19321d1874ac3` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v2.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v2.json` | `ed28dc10965ccffeee5ef542ebb5df9195a3931459a61bd37d7cce67b813d45f` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v3.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v3.json` | `c6ae4fa52f2263b31202da9381d021668b78749a91a997438fc9f501507751fd` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v4.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v4.json` | `ccccc99006789a2d3b478ffb67d1c7696bf4086a6973418ffd35ba93becf7ff6` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v5.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v5.json` | `4621438d2523dc8158950b500c7edee1907f3cb5dc34bbdd67542bb32c4f5548` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v6.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v6.json` | `bc8c091d1715fc93433bdcee222d4cc2f8dd5a14293c18906bad7e4d548ed917` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v7.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v7.json` | `040fc0f873affa6ec41e832fe2aad11d150fe02d284e5214995598dd448049c5` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v8.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_ledger_v8.json` | `405639b297743fbfc0546d230f4520ec08adeeee0b574b5f3b14d9a0f4cf7ccd` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v1.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v1.json` | `7edd9e1ba5584d7fe4817fa3f71c41bb1457b8af3f13b4b3159e0de5b127ebc3` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v2.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v2.json` | `637ba7384b76975462b2dcf1340d5370c5729ef90f29f9f6fd7969c384a73582` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v3.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v3.json` | `33de684f1ea0745a9b7230b64c61e3b7151bcd6eb95056e5bbbcfbf491ce2bd5` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v4.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v4.json` | `164c8586478f05dec2433ef40602e17e3f58d4af674b30acfd8c446330971811` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v5.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v5.json` | `757275e94e6a20968b7dec1c671c262c552fa7fe146e4ac23d865df04e0f2c50` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v6.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v6.json` | `70efa549404a9c6b79365dcd97982e8ba452baaf01c974f05211ef452ef77eb2` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v7.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v7.json` | `948f18054f67337f5fc7d7d68ee8b25c88dcefa5d87187cfccb123d3c8dcc1ac` | `same` |
| `bench/dated/check/2028-02-29/tmp_bench_variants_v8.json` | `/home/user/agent/tmp/bench/dated/check/2028-02-29/tmp_bench_variants_v8.json` | `4463e37ca0f97edf37d70a4e4ff31c80d05df730a6e22397b6759470e9bf007b` | `same` |
| `bench/dated/constants.mjs` | `/home/user/agent/tmp/bench/dated/constants.mjs` | `9f23253f22cc8a2a9a952048dab0011a1eac0cca7b0352579ee0a5db23f5f1e0` | `same` |
| `bench/dated/dates.mjs` | `/home/user/agent/tmp/bench/dated/dates.mjs` | `2f3d01a2eb397facd698db98b62a2e2c08569acb647fb3dd582b40d9cd2aeb18` | `same` |
| `bench/dated/failures.json` | `/home/user/agent/tmp/bench/dated/failures.json` | `accdbfef8385ce85cdccd967ae170f32b7831ceb867cc29f0d4e431493435598` | `same` |
| `bench/dated/gates.json` | `/home/user/agent/tmp/bench/dated/gates.json` | `5eae04da1e84061873bd62271e093e8b1cbd504108b935978c82a4bfe2323251` | `same` |
| `bench/dated/helpers.mjs` | `/home/user/agent/tmp/bench/dated/helpers.mjs` | `3153f44950d135ccd8daca48d4890440d4cd5d5f5e0c053e9de4b45715bcbf7b` | `same` |
| `bench/dated/identity-v1.json` | `/home/user/agent/tmp/bench/dated/identity-v1.json` | `073ba841d1fa55cc5476f9f81820b14d02b86733168c03bcfa5edc046b0d2f45` | `same` |
| `bench/dated/identity-v2.json` | `/home/user/agent/tmp/bench/dated/identity-v2.json` | `c5a29a2feea36c83b952d7ae8240b7a0758466e90cf32b64ba77a59986fa1f4a` | `same` |
| `bench/dated/identity-v3.json` | `/home/user/agent/tmp/bench/dated/identity-v3.json` | `21c2e3898f2af07e61b4d4c3e5fe3e02bbc92d8bafc75a37e2fe0dfa3209bebb` | `same` |
| `bench/dated/identity-v4.json` | `/home/user/agent/tmp/bench/dated/identity-v4.json` | `0943b6ba80eef0e0566d7ab49a8548a809683f4240f25705e9086ce1af5ba851` | `same` |
| `bench/dated/identity-v5.json` | `/home/user/agent/tmp/bench/dated/identity-v5.json` | `d3b8f225799823b1dd917b5ffaeea6a67b853c47d45393accd9297bec9dca6dc` | `same` |
| `bench/dated/identity-v6.json` | `/home/user/agent/tmp/bench/dated/identity-v6.json` | `9867628a3421c0cd10954755bdad46b43de7e7fecb067d26da3c4d5e40ed7e78` | `same` |
| `bench/dated/identity-v7.json` | `/home/user/agent/tmp/bench/dated/identity-v7.json` | `1189dd77b6126cfb8bea4ad7e424be10e01b5e63cafd7387da69d657f11c271c` | `same` |
| `bench/dated/identity-v8.json` | `/home/user/agent/tmp/bench/dated/identity-v8.json` | `51bd0ad1f0407e77efd693d15611f552cccfa72e66cb1ea71a67ba9f206562f5` | `same` |
| `bench/dated/output.json` | `/home/user/agent/tmp/bench/dated/output.json` | `6de3a9f9faffa633b28b190df83376cf53895f19216691d664142dc436b2c862` | `same` |
| `bench/dated/protected.json` | `/home/user/agent/tmp/bench/dated/protected.json` | `48b053d2bcae56944e6f2c45a62bbaa9f93347bd6f2c3e0b9c779488042faf9d` | `same` |
| `bench/dated/render.mjs` | `/home/user/agent/tmp/bench/dated/render.mjs` | `8c4362c7bd5a786b20b6613e6f841709f92bcbfb15aaec4cba852bc99bc871b3` | `same` |
| `bench/dated/rules-2026-10-09.json` | `/home/user/agent/tmp/bench/dated/rules-2026-10-09.json` | `d206602211813062640a90f5b3cf1c6f07126432389dc71fe996c684205b29a1` | `same` |
| `bench/dated/samples.json` | `/home/user/agent/tmp/bench/dated/samples.json` | `dd4516d880627f9a6f2f24096874135c6d60c06faad4c7a16bc3ba3f6bbb78ab` | `same` |
| `bench/dated/scope.json` | `/home/user/agent/tmp/bench/dated/scope.json` | `6271426a41764a3b7a6c19d4f1cf4237b5fb37c140f804829fb9ebd3b9a746ba` | `same` |
| `bench/dated/scoring.json` | `/home/user/agent/tmp/bench/dated/scoring.json` | `03507b9367db6b83e44bbec01a605e603e555d67b1470efb937cf43e71000c44` | `same` |
| `bench/dated/table.json` | `/home/user/agent/tmp/bench/dated/table.json` | `f406786771dab17c2fcf4cb22758f00f137ddea6d953d1664cadd523c17b2c11` | `same` |
| `bench/dated/today-rules.json` | `/home/user/agent/tmp/bench/dated/today-rules.json` | `d206602211813062640a90f5b3cf1c6f07126432389dc71fe996c684205b29a1` | `same` |
| `bench/dated/today.json` | `/home/user/agent/tmp/bench/dated/today.json` | `8274f7a0b5dc28f9d5cb2eaa268aaf726c9a90842e70893cd0a2b1a414ccdec0` | `same` |
| `bench/dated/types.ts` | `/home/user/agent/tmp/bench/dated/types.ts` | `814e4a2cf8097c97358d75232fe84678a4df5e881d3fdbec5b08633b5b21a37e` | `same` |
| `bench/rescore.mjs` | `/home/user/agent/tmp/bench/rescore.mjs` | `6019bdd29a6e8ceecf7515c5471ce9026a39ed448b435b2f8f070c62cf0f36fd` | `same` |
| `bench/scenario-long.json` | `/home/user/agent/tmp/bench/scenario-long.json` | `94e70c7cac1cbf2c2a92d98305e796e11dbbd9a414e7df19652e5a3b6ece6738` | `same` |
| `bench/scenario.json` | `/home/user/agent/tmp/bench/scenario.json` | `6ac003e9cd044dc47ff7e65eb33d124039d324a602432783699bd22fef85b71d` | `same` |
| `bench/u2/apply-tests.json` | `/home/user/agent/tmp/bench/u2/apply-tests.json` | `a23c00c4e7df7f7a3fef2a9e1cd63b3fff32ec88702974079994d9031a5dddca` | `same` |
| `bench/u2/apply.mjs` | `/home/user/agent/tmp/bench/u2/apply.mjs` | `4ab8f8f079fe152c999cf8e12b02964ed4befe490774c1733eb6dc03df916d5c` | `same` |
| `bench/u2/compare.json` | `/home/user/agent/tmp/bench/u2/compare.json` | `87ac29485241f5cc76723fbe51d8417650bb01df33dc7f453d8a02f4abd1d2a0` | `same` |
| `bench/u2/compare.md` | `/home/user/agent/tmp/bench/u2/compare.md` | `4d54c8fdea9e8a1a86adcc755f8d94b1e8d3c2c3c74f7ca3992760efed190dfe` | `same` |
| `bench/u2/compare.mjs` | `/home/user/agent/tmp/bench/u2/compare.mjs` | `3005ff6e84919fa0d9b8fc2033335882b4034b5a236898a1426a0740303a676e` | `4a5dbbc02188f69d6e834b47bd698c113f56d7cfbe8c7ba4a83d5da69b6ec540` |
| `bench/u2/fixtures-live.json` | `/home/user/agent/tmp/bench/u2/fixtures-live.json` | `61e4d2ddc9b0f2981ecae82ab8573c5382549001a932195638019deb160ec982` | `same` |
| `bench/u2/fixtures-results.json` | `/home/user/agent/tmp/bench/u2/fixtures-results.json` | `a135dd7ca8305a678da4e2021bc3355cc88ea65e4dd0564f8280df523915bd89` | `same` |
| `bench/u2/fixtures.json` | `/home/user/agent/tmp/bench/u2/fixtures.json` | `9c67272649d2827b3346d55105f755be4c81d2b139fa9d5351e5465c77b006d8` | `same` |
| `bench/u2/gates.json` | `/home/user/agent/tmp/bench/u2/gates.json` | `ed4a2a45aeba9eef60d68a51091ba8a39a5e1e5593f0fd7f026ae63bb947d0ce` | `same` |
| `bench/u2/rules.json` | `/home/user/agent/tmp/bench/u2/rules.json` | `bb56d9743f77402b1ee6f15db5b107f9db9c2a89b65c5c130194f661ee763bc2` | `same` |
| `bench/u2/verify.ts` | `/home/user/agent/tmp/bench/u2/verify.ts` | `6834a539c287a70d365e84dc2098c9e22deed5db411c52f06b26a80b633932df` | `same` |
| `bench/variants/check.mjs` | `/home/user/agent/tmp/bench/variants/check.mjs` | `8d5bd1a599e10837bd66e6db1f754cb476e3050522bd976a0f6da3ecc1e99008` | `a2ecade3f594fe525ad84448ac29034408a9bfe6be95eeb476694d13f9174e86` |
| `bench/variants/g06/after-2026-10-09/v1.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v1.json` | `b4df7485554986803539df8e016c68033dd13649b040a749b503d420eb92449e` | `same` |
| `bench/variants/g06/after-2026-10-09/v2.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v2.json` | `1e3bc2a64db71319505e76dd56e189ac713bf0cd67ffafa8a012df05c3356392` | `same` |
| `bench/variants/g06/after-2026-10-09/v3.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v3.json` | `4db1f7f1491e71e07cd1ac42e6afe889453bb2edf73c981f6140a0b1b836a631` | `same` |
| `bench/variants/g06/after-2026-10-09/v4.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v4.json` | `c4647a9756170845981d4f1b98396446735184a95d6a8cad566045ea7a8247c1` | `same` |
| `bench/variants/g06/after-2026-10-09/v5.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v5.json` | `ebb4731343d8f29b7cb8281dae5fffff90f190548535fb0d8b05d3ca77fb4681` | `same` |
| `bench/variants/g06/after-2026-10-09/v6.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v6.json` | `e3eb8a076ac185001260d0ef62d09c9cef232619770b2c4f3190f169650b30c2` | `same` |
| `bench/variants/g06/after-2026-10-09/v7.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v7.json` | `19a3226a9b518558bf3016d533ced8934fdd35e4a3d508e7bde577187288a12a` | `same` |
| `bench/variants/g06/after-2026-10-09/v8.json` | `/home/user/agent/tmp/bench/variants/g06/after-2026-10-09/v8.json` | `fb9f6aa07900c0819346cbe0ef282b8ad7feb3071ea8edc99fa5454112abbf18` | `same` |
| `bench/variants/g06/before/v1.json` | `/home/user/agent/tmp/bench/variants/g06/before/v1.json` | `45c186c3b682ca167c8531aaffdde6595d4758d96978109c00666e499ab2478d` | `same` |
| `bench/variants/g06/before/v2.json` | `/home/user/agent/tmp/bench/variants/g06/before/v2.json` | `1c8aeec35578ff9a0c4ec9682e71c722dc6a9a0fe812898d2d6e64afdb543382` | `same` |
| `bench/variants/g06/before/v3.json` | `/home/user/agent/tmp/bench/variants/g06/before/v3.json` | `00d2d9950907c1e1d98de56c44b0a69c239cbc2baa5daa141feb7671cbdc9d8e` | `same` |
| `bench/variants/g06/before/v4.json` | `/home/user/agent/tmp/bench/variants/g06/before/v4.json` | `a0431119ec3168d74837a62ade426e3b4464ff149feaa644cb5c5704b2eafaad` | `same` |
| `bench/variants/g06/before/v5.json` | `/home/user/agent/tmp/bench/variants/g06/before/v5.json` | `36d579c45aa842fe3d13c11900ebb57f085367a5e72538cee497906f6271a470` | `same` |
| `bench/variants/g06/before/v6.json` | `/home/user/agent/tmp/bench/variants/g06/before/v6.json` | `9f30df43fda77f25994dcd3e0f00e2cf587343e12b65f38aba98ef77783e16e0` | `same` |
| `bench/variants/g06/before/v7.json` | `/home/user/agent/tmp/bench/variants/g06/before/v7.json` | `671e130ed6aa6cdd3d803e70f668cec7e42bdeb889b2fd9ce9508afa47ecd102` | `same` |
| `bench/variants/g06/before/v8.json` | `/home/user/agent/tmp/bench/variants/g06/before/v8.json` | `45e6b66097fd1a8bf8266c9379fe04558cb106ebaa7faef2f25c6af4f3da81b1` | `same` |
| `bench/variants/g06/records-2026-10-09/v1.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v1.json` | `e55899ba630472de13cf00b05b0ed62497de9c7c204bde6578b1dd59295fc1ce` | `same` |
| `bench/variants/g06/records-2026-10-09/v2.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v2.json` | `f56002c251af38e8a59f0cadad31381ce645db8444bf31c7d714ffdb3ce05277` | `same` |
| `bench/variants/g06/records-2026-10-09/v3.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v3.json` | `95309a44a1a76399ca2ae6365dc06121ea43b72a638d365d858b1bfbb76f53e3` | `same` |
| `bench/variants/g06/records-2026-10-09/v4.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v4.json` | `9f2f7f398291755c52033b61711c643ac16abf31190eda577e9e691bd58c261d` | `same` |
| `bench/variants/g06/records-2026-10-09/v5.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v5.json` | `9bd7db6826cc0529c4989dab4b31559de22604c45c90de8cbdca1553eb758f34` | `same` |
| `bench/variants/g06/records-2026-10-09/v6.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v6.json` | `16c27b4dac75ce4e745a903dca478a9e8d3c05bb6ddd58017b5b5cba882a6440` | `same` |
| `bench/variants/g06/records-2026-10-09/v7.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v7.json` | `9ad8287c1c8ca806768231572aec71f06d271a499e22e2190f77ea7b4341e758` | `same` |
| `bench/variants/g06/records-2026-10-09/v8.json` | `/home/user/agent/tmp/bench/variants/g06/records-2026-10-09/v8.json` | `d4948b67cf5f8e9ecc5767d8690d3437464b10d629cc19326320925e68b51ff7` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v1.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v1.json` | `3c83a45ae26867e10c7c8620d5d7dbbb8d777d7aa0b5699f5feb3b81a2522c20` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v2.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v2.json` | `c63381c98711661318f2da181a3669142ae7ed378293e0ff9fc63ed07ce020d7` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v3.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v3.json` | `a9789eb65f96631201031f53296a656b804321fbe21c3df1f14ba60d071c361b` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v4.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v4.json` | `22d16d5be0146a563de9123642e504945dcd196e0b9b4540933b15f1d321be7a` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v5.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v5.json` | `fb73ae8b927c76ad06e9330e33cac2b3086cc3320c55046fdae8394630113f67` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v6.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v6.json` | `d9c34151256cd95ebe457954b1a5e7726e945c3654b26ed872131ac2dc1f983b` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v7.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v7.json` | `0f0222d61b0d9006eb75cc7734e11a190ef969169d73fd2240479dd3de41ff63` | `same` |
| `bench/variants/g06/records-plain-2026-10-09/v8.json` | `/home/user/agent/tmp/bench/variants/g06/records-plain-2026-10-09/v8.json` | `876b16ae7f48a28e314a81b5eb5139e44fe995254571ee4eb8946fa18185f4f7` | `same` |
| `bench/variants/g06/view-2026-10-09/v1.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v1.json` | `1458f521de16719cd7e3ec63081cb01893b79a72ce73aad6250f671efd4e7c35` | `same` |
| `bench/variants/g06/view-2026-10-09/v2.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v2.json` | `aac4a90100eb57097c4bac5865d362c7178bef981faf3ff7262a28e2b13e09d1` | `same` |
| `bench/variants/g06/view-2026-10-09/v3.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v3.json` | `50c5932fe0f6982a3c55722bb325f9981cfae99d2613e1a9254572e935fd3498` | `same` |
| `bench/variants/g06/view-2026-10-09/v4.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v4.json` | `35e24fda6f2f32c1c19d43409326b23c6751c0e00a52b2009c779ebe36e9cc7b` | `same` |
| `bench/variants/g06/view-2026-10-09/v5.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v5.json` | `5a147b133eaf5519678dd00009e0862585c771a2414137a1cb6484623fa7ce5d` | `same` |
| `bench/variants/g06/view-2026-10-09/v6.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v6.json` | `26bcc89eb81d7b54ac9f869c471fa74f63e037b9ceb0ef64a196fced5862f093` | `same` |
| `bench/variants/g06/view-2026-10-09/v7.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v7.json` | `be01e1827319c3a4c264be8157165a5eefba6cf81c114fa74b2a431071790856` | `same` |
| `bench/variants/g06/view-2026-10-09/v8.json` | `/home/user/agent/tmp/bench/variants/g06/view-2026-10-09/v8.json` | `d80f92f21519e937ef3322a3b5dcae8df83d5de2715ab346b0123faec971953b` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v1.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v1.json` | `0b43ee606f46db079d5469e3101056f355c759abc38d62914fcc28adda2dca07` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v2.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v2.json` | `fd4b1374dfcf719f1df56fdc658ea09dc931a05817aa25e7122e2692201ed457` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v3.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v3.json` | `8af72040f1e37ea09c9534ba7751c44a75501b887348eae6146c2ff631f99e1f` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v4.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v4.json` | `d79b99c54448074dd3a53f7b32b945b0b54e79865e3216fd4389a02c2dfc0d50` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v5.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v5.json` | `9c349d7431a97278633013b473622b30af8eec9fd24c27918d475435da89a3f2` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v6.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v6.json` | `4ff9dccd8296f0d49f09e89793f7132664d7083d88d259df3bcebfdb0bccb72e` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v7.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v7.json` | `0f5620cfe628925c8cf48c3e30db5573123aa5703a59dff112bd42d1b086a806` | `same` |
| `bench/variants/g06/view-plain-2026-10-09/v8.json` | `/home/user/agent/tmp/bench/variants/g06/view-plain-2026-10-09/v8.json` | `71af4a3682742f38216202e5968e20b3d5115e9f85bc0c4c6a272e077e1e8bf2` | `same` |
| `bench/variants/ledger/v1.json` | `/home/user/agent/tmp/bench/variants/ledger/v1.json` | `a2f987eb27043c77d5ae00d04d1d5464c21aad3ff5c09c62472df718a0d21e34` | `same` |
| `bench/variants/ledger/v2.json` | `/home/user/agent/tmp/bench/variants/ledger/v2.json` | `2663475822e1a02b0250b57f392f4cd57c3609768b70d0bd64a48a343552c5e9` | `same` |
| `bench/variants/ledger/v3.json` | `/home/user/agent/tmp/bench/variants/ledger/v3.json` | `d64367561ac4e63d445c79d85f6eba27155f22e500794569faaf4c402c81646e` | `same` |
| `bench/variants/ledger/v4.json` | `/home/user/agent/tmp/bench/variants/ledger/v4.json` | `df4220b9bea9fd29ecd24349bed88d5f9eef4d1e95399a0935752fc145bb7fc3` | `same` |
| `bench/variants/ledger/v5.json` | `/home/user/agent/tmp/bench/variants/ledger/v5.json` | `3e0da791ed1b83c0ea2b49abae040404529861f6aa0719b9f123ee174f73721d` | `same` |
| `bench/variants/ledger/v6.json` | `/home/user/agent/tmp/bench/variants/ledger/v6.json` | `0699287c6ffec907dadbabd680b86b6395192a120dfd50b846ecd42ff774ac66` | `same` |
| `bench/variants/ledger/v7.json` | `/home/user/agent/tmp/bench/variants/ledger/v7.json` | `dd6ace441dba53887c940bae7c573e97801413e9c269d0561ebe82c56872c127` | `same` |
| `bench/variants/ledger/v8.json` | `/home/user/agent/tmp/bench/variants/ledger/v8.json` | `82b23d0e119b8c63aab7e08ce5c1bd6d1ead0e1339631aaf98e9e683f542d641` | `same` |
| `bench/variants/v1.json` | `/home/user/agent/tmp/bench/variants/v1.json` | `96255b969d65e22b88c6da74a25df30aeb32a4d0df35c999a58974c3a0dc58b5` | `same` |
| `bench/variants/v2.json` | `/home/user/agent/tmp/bench/variants/v2.json` | `a23257886015afa4b7b59d1307c541e4afeb534156b93af4aeb06006ab571d56` | `same` |
| `bench/variants/v3.json` | `/home/user/agent/tmp/bench/variants/v3.json` | `1e8e85afdd7fbc065670b1710c69aa6dc847bbf280b40130cb6759a253fadfe1` | `same` |
| `bench/variants/v4.json` | `/home/user/agent/tmp/bench/variants/v4.json` | `3f36abab2364b9bd1e60d377c8e7ce46102730cce471acf7725ac1deb2c30282` | `same` |
| `bench/variants/v5.json` | `/home/user/agent/tmp/bench/variants/v5.json` | `aa49091b64898aaf30def27b4105d6053f339ddba3ae85362ac16df75010a0cc` | `same` |
| `bench/variants/v6.json` | `/home/user/agent/tmp/bench/variants/v6.json` | `5e1010ab6d5ac02d60fd8060d8ac31fe05bdfb10977f99790407ade586690d94` | `same` |
| `bench/variants/v7.json` | `/home/user/agent/tmp/bench/variants/v7.json` | `d44ca23b23a3ad3527fc38cf485ce95d3d2c0df2a42f36fa5d4dd0eeb3f3eb18` | `same` |
| `bench/variants/v8.json` | `/home/user/agent/tmp/bench/variants/v8.json` | `0affd7392923e42978fc5351faa07905da3af95891c968701eb7c6d517e52b72` | `same` |
| `bench3/BRIEFING.md` | `/home/user/agent/tmp/bench3/BRIEFING.md` | `c67e2088153e11f1aa773707d5b466c8168f54f9b12b00071d0dc50a87348ddc` | `same` |
| `bench3/README.md` | `/home/user/agent/tmp/bench3/README.md` | `0cd28068e7ddd002e328260d17be8ef5dcb43aacaa8af1317f8895d596578d80` | `same` |
| `bench3/bench.mjs` | `/home/user/agent/tmp/bench3/bench.mjs` | `67c863b179dcd56d9d096b930c7794264743635c1f75367157d0cb45bf5ce611` | `19b1d8a20849ceb1c9670a4f151b0d7f993f01bbf7ff57423d582a54fa4e4306` |
| `bench3/records-check.mjs` | `/home/user/agent/tmp/bench3/records-check.mjs` | `af6a637f1549fcd768b9341716c5ecf3cefb46e1eb502e84f1a37d94271df7aa` | `3d7de0561dfe4f8f3e7e375cc291ec4a0fc74f7266e9776e89784703db94b8a2` |
| `bench3/records-fixtures.json` | `/home/user/agent/tmp/bench3/records-fixtures.json` | `d483e910ffe0768c4e1d17920fcb75b42bea4ffc1c14b934523bbe2f33431982` | `same` |
| `bench3/records.mjs` | `/home/user/agent/tmp/bench3/records.mjs` | `03f20c9029f5fbdeb2c0328ac90520abc6bc41773c823e5020d32fcb89d23f61` | `same` |
| `bench3/scenario.json` | `/home/user/agent/tmp/bench3/scenario.json` | `a33b4d3e8d6d2a9ce6f00f5eef71b8270c1b95b99b5b28721662f6aad98a13dd` | `same` |
| `data/cal-categories.jsonl` | `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl` | `631cb5985f53f9f499f96a46184d407e7f4aa708ddbf69d5ca7a39d91f532ddd` | `same` |
| `data/ledger-deny-first/ledger.jsonl` | `/home/user/agent/tmp/bench/results/v3/ledger-deny-first/ledger.jsonl` | `a05041690c23f3a41a27be6c15398f5ba955746059a44fb28194be4cc5b970e9` | `same` |
| `data/ledger-deny-first/memory.log` | `/home/user/agent/tmp/bench/results/v3/ledger-deny-first/memory.log` | `1fdecc5c0e9044da46c092d0515238da93f027d32c20aed6391b3c19924f9d57` | `same` |
| `data/ledger-deny-first/seed.json` | `/home/user/agent/tmp/bench/results/v3/ledger-deny-first/seed.json` | `92469f14f8fe74c24ddd92d871c07746e1618cb7b159d5bf3929bd9c4ee0c334` | `same` |
| `models/pilot.mjs` | `/home/user/agent/tmp/bench/models/pilot.mjs` | `cee9c835efd73940ca5873de74f7fb0485ff9eb98534c05859f8b57ec99532d8` | `same` |
| `models/plan.mjs` | `/home/user/agent/tmp/bench/models/plan.mjs` | `f676313e243d80e63bcbb98d5f38cd9e194b540bc9bb73d54f19c311123e3b61` | `75495234edb5981e5c3377230e168f1f48e005783cc98094ad664dbf3d12ecc8` |
| `models/sweep.sh` | `/home/user/agent/tmp/bench/models/sweep.sh` | `08b406d3843f44b33900775b85ab00dcd74fb506f14d48c8c5b1252b62857619` | `431f4958d361409b2af834e81649cc5b917d8835f4141a683160af42e0adceb6` |
| `tools/cold-start.mjs` | `/home/user/agent/tmp/bench/results/v7/tools/cold-start.mjs` | `55a8e6091f40275f92b6279aae25eb807ef7c13690afde834f22c587cf9eb4db` | `same` |
| `tools/plan.ts` | `/home/user/agent/tmp/bench/results/v7/tools/plan.ts` | `22938476d69017b454f20eaefabcd201b8f1632275dbe656eb2b551278217210` | `10b604647f72371024b017b20579e06ca01ecdaf15eb55cbc19347381ab69abb` |
| `tools/record-fetch.mjs` | `/home/user/agent/tmp/bench/results/v7/tools/record-fetch.mjs` | `7cda1ddf6b4519812b9ea3a9ede61c53b99e9706422a0cceb2033773528c0755` | `same` |
| `tools/run-one.ts` | `/home/user/agent/tmp/bench/results/v7/tools/run-one.ts` | `abfc4080f3ff87a88673bdac5bc58ee7cf5b390235bddffcb852bf1531781e96` | `f9371979579ec5ca4acf3e1616345aff05de7b57d55f5e163346e09c271d8f5e` |
| `tools/series.ts` | `/home/user/agent/tmp/bench/results/v7/tools/series.ts` | `a1c297ca0a572ce642a41c8386f0ac28adbeed303271772d2bfce6abba67f238` | `371b7d164f0dc62d99665d816a8ac1da30578c43bc4381f93269c3cac64e3553` |
| `vendor/agent/index.js` | `/home/user/agent/dist/src/core/index.js` | `4db78c23046e9a1b081682d55779a5fd8f88dc904a2caf50e761a28cf36e5f51` | `same` |
| `vendor/ollama/index.js` | `/home/user/ollama/dist/src/core/index.js` | `e09277478a425e6227f37730a29b2df5d9f80cfc595740cd0335fa05da22b4a7` | `same` |

## Changed lines

The following unified diffs list every changed line; 18 files differ from their source.

### `audit/adjudicated.ts`

```diff
--- /home/user/agent/tmp/bench/results/v10/tools/adjudicated.ts
+++ harness/audit/adjudicated.ts
@@ -8,7 +8,8 @@
 import { existsSync, readdirSync, readFileSync } from 'node:fs'
 import { join, resolve } from 'node:path'
 
-const RESULTS = resolve(import.meta.dirname, '..')
+const ROOT = resolve(import.meta.dirname, '..')
+const RESULTS = process.env.V10_RESULTS ?? join(ROOT, '..', 'results', 'v10')
 const AUDIT = join(RESULTS, 'audit')
 const VERDICT_FILES: readonly string[] = ['verdicts.json', 'verdicts-pass-checked.json']
 const KEY_FILES: readonly string[] = ['key.json', 'key-pass.json']
```

### `audit/collect.mjs`

```diff
--- /home/user/agent/tmp/bench/results/g06/tools/collect.mjs
+++ harness/audit/collect.mjs
@@ -7,10 +7,11 @@
 import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
 import { join } from 'node:path'
 import { parseArgs } from 'node:util'
-import { compileRules, scoreText } from '../../../rescore.mjs'
+import { compileRules, scoreText } from '../bench/rescore.mjs'
 
-const RESULTS = join(import.meta.dirname, '..')
-const BENCH = join(RESULTS, '..', '..')
+const ROOT = join(import.meta.dirname, '..')
+const RESULTS = process.env.G06_RESULTS ?? join(ROOT, '..', 'results', 'g06')
+const BENCH = join(ROOT, 'bench')
 const GOAL = 'g06-kenji-shipping'
 const RULE = /never promise a customer a delivery date|never put a delivery date/i
 const ACK = /no delivery dates go in customer replies/i
```

### `audit/extract.ts`

```diff
--- /home/user/agent/tmp/bench/results/v10/audit/extract.ts
+++ harness/audit/extract.ts
@@ -6,10 +6,11 @@
 // Exit: 0 written; 64 on usage.
 import { createHash } from 'node:crypto'
 import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
-import { join } from 'node:path'
+import { join, resolve } from 'node:path'
 
-const RESULTS = '/home/user/agent/tmp/bench/results/v10'
-const VARIANTS = '/home/user/agent/tmp/bench/variants'
+const ROOT = resolve(import.meta.dirname, '..')
+const RESULTS = process.env.V10_RESULTS ?? join(ROOT, '..', 'results', 'v10')
+const VARIANTS = join(ROOT, 'bench', 'variants')
 
 interface Key {
 	readonly id: string
@@ -39,7 +40,7 @@
 		return 64
 	}
 	const seen = new Set((JSON.parse(readFileSync(earlierKey, 'utf8')) as readonly Key[]).map((entry) => `${entry.run} ${entry.goal}`))
-	const seed = JSON.parse(readFileSync('/home/user/agent/tmp/bench/scenario.json', 'utf8')).seed
+	const seed = JSON.parse(readFileSync(join(ROOT, 'bench', 'scenario.json'), 'utf8')).seed
 	const items: Record<string, unknown>[] = []
 	const keys: Key[] = []
 	for (const run of runs) {
```

### `audit/items.ts`

```diff
--- /home/user/agent/tmp/bench/results/v10/tools/items.ts
+++ harness/audit/items.ts
@@ -13,8 +13,9 @@
 import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
 import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
 
-const VARIANTS = '/home/user/agent/tmp/bench/variants'
-const SEED = '/home/user/agent/tmp/bench/scenario.json'
+const ROOT = resolve(import.meta.dirname, '..')
+const VARIANTS = join(ROOT, 'bench', 'variants')
+const SEED = join(ROOT, 'bench', 'scenario.json')
 
 interface Key {
 	readonly id: string
```

### `audit/probe-items.mjs`

```diff
--- /home/user/agent/tmp/bench/results/g06/tools/probe-items.mjs
+++ harness/audit/probe-items.mjs
@@ -10,7 +10,8 @@
 import { dirname, join, resolve, sep } from 'node:path'
 import { parseArgs } from 'node:util'
 
-const BENCH = join(import.meta.dirname, '..', '..', '..')
+const ROOT = join(import.meta.dirname, '..')
+const BENCH = join(ROOT, 'bench')
 const { values } = parseArgs({ options: { rows: { type: 'string' }, items: { type: 'string' }, key: { type: 'string' } } })
 if (values.rows === undefined || values.items === undefined || values.key === undefined || `${dirname(resolve(values.key))}${sep}`.startsWith(`${dirname(resolve(values.items))}${sep}`)) {
 	process.stderr.write('usage: node probe-items.mjs --rows ROWS.json --items ITEMS.json --key KEY.json (the key outside the items directory)\n')
```

### `audit/replay.mjs`

```diff
--- /home/user/agent/tmp/bench/results/g06/tools/replay.mjs
+++ harness/audit/replay.mjs
@@ -17,10 +17,11 @@
 import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
 import { join } from 'node:path'
 import { parseArgs } from 'node:util'
-import { compileRules, scoreText } from '../../../rescore.mjs'
+import { compileRules, scoreText } from '../bench/rescore.mjs'
 
-const RESULTS = join(import.meta.dirname, '..')
-const BENCH = join(RESULTS, '..', '..')
+const ROOT = join(import.meta.dirname, '..')
+const RESULTS = process.env.G06_RESULTS ?? join(ROOT, '..', 'results', 'g06')
+const BENCH = join(ROOT, 'bench')
 const GOAL = 'g06-kenji-shipping'
 const DAEMON = 'http://127.0.0.1:11434/api/chat'
 const RULE_LINE = 'And never promise a customer a delivery date in writing.'
```

### `audit/variants.mjs`

```diff
--- /home/user/agent/tmp/bench/results/g06/tools/variants.mjs
+++ harness/audit/variants.mjs
@@ -1,7 +1,7 @@
 // Writes the g06-only scenario sets for the rule experiment, each copy rendered in one date frame by the date
 // renderer and cut to g06:
 //   node variants.mjs --date YYYY-MM-DD
-// It writes four sets under tmp/bench/variants/g06/: `records-DATE` and `records-plain-DATE` from the ledger copies,
+// It writes four sets under bench/variants/g06/: `records-DATE` and `records-plain-DATE` from the ledger copies,
 // `view-DATE` and `view-plain-DATE` from the full view's copies. A plain set replaces seed 6's rule sentence
 // "And never promise a customer a delivery date in writing." with "And never put a delivery date, a carrier estimate
 // included, in a customer reply." and changes nothing else.
@@ -12,7 +12,8 @@
 import { join } from 'node:path'
 import { parseArgs } from 'node:util'
 
-const BENCH = join(import.meta.dirname, '..', '..', '..')
+const ROOT = join(import.meta.dirname, '..')
+const BENCH = join(ROOT, 'bench')
 const RENDER = join(BENCH, 'dated', 'render.mjs')
 const GOAL = 'g06-kenji-shipping'
 const PROMISE = 'And never promise a customer a delivery date in writing.'
```

### `bench/bench.mjs`

```diff
--- /home/user/agent/tmp/bench/bench.mjs
+++ harness/bench/bench.mjs
@@ -22,13 +22,15 @@
 	ProviderError,
 	renderSelectionState,
 	sumUsage,
-} from '/home/user/agent/dist/src/core/index.js'
+} from '../vendor/agent/index.js'
 import { createBudget } from '@orkestrel/budget'
 import { isArray, isNumber, isRecord, isString, parseJSONAs } from '@orkestrel/contract'
 import { createTool, createToolManager } from '@orkestrel/tool'
 import { clean, compileRules, scoreText } from './rescore.mjs'
 
 const HERE = dirname(fileURLToPath(import.meta.url))
+const ROOT = dirname(HERE)
+const RESULTS = join(ROOT, '..', 'results')
 const OLLAMA_URL = 'http://127.0.0.1:11434'
 const AGENT_MODEL = 'qwen3.5:2b-q4_K_M'
 const TEV_MODEL = 'tev1:0.8b'
@@ -105,7 +107,7 @@
 // The chain states render a message without the [B] marker, because no request takes part.
 const NO_REQUEST = {}
 // The recorded selection whose needed answers `--probe-chain` replays.
-const PROBE_CHAIN = { record: join(HERE, 'results', 'v4', 'selection', 'selection.jsonl'), goal: 'g03-grace-escalation' }
+const PROBE_CHAIN = { record: join(RESULTS, 'v4', 'selection', 'selection.jsonl'), goal: 'g03-grace-escalation' }
 // The recorded rows a hand reading ruled on, by path under results/, with the verdict the scorer must
 // give; `--probe-score` replays them. The v6 rows follow results/v6/diag/DIAGNOSIS.md section 3, and
 // the v7 rows the scorer bullets of results/v7/GRADES-*.md.
@@ -194,7 +196,7 @@
 		sections: { type: 'string', default: '' },
 		'judge-ctx': { type: 'string', default: '8192' },
 		timeout: { type: 'string', default: '3600000' },
-		out: { type: 'string', default: join(HERE, 'results') },
+		out: { type: 'string', default: join(ROOT, 'tmp') },
 		scenario: { type: 'string', default: join(HERE, 'scenario.json') },
 		smoke: { type: 'boolean', default: false },
 		state: { type: 'string', default: 'stock' },
@@ -646,10 +648,10 @@
 
 function createJudge() {
 	if (flags.judge === 'tev1') return createSystemOneJudge({ url: OLLAMA_URL, model: TEV_MODEL, timeout: goalTimeout, fetch: countingFetch })
-	return import('/home/user/ollama/dist/src/core/index.js').then(({ createOllamaJudge }) =>
-		// This judge comes from the ollama package, which inherits the agent 0.0.28 installed under
-		// /home/user/ollama/node_modules: its errors are not instances of this checkout's error classes,
-		// so the harness records them by message and never narrows them with this checkout's guards.
+	return import('../vendor/ollama/index.js').then(({ createOllamaJudge }) =>
+		// This judge comes from the vendored ollama build, which inherits the agent 0.0.29 installed under
+		// node_modules (pinned in package.json): its errors are not instances of the vendored agent build's error classes,
+		// so the harness records them by message and never narrows them with the vendored agent build's guards.
 		createOllamaJudge({
 			url: OLLAMA_URL,
 			model: MICA_MODEL,
@@ -2105,7 +2107,7 @@
 		lines.push(`synthetic ${index + 1}, ${probe.goal} ${JSON.stringify(probe.text)}: ${outcome(scored)}, expected ${probe.outcome} (${why(scored)})`)
 	}
 	for (const hand of HAND_READ) {
-		const row = readFileSync(join(HERE, 'results', hand.file), 'utf8')
+		const row = readFileSync(join(RESULTS, hand.file), 'utf8')
 			.split('\n')
 			.filter((line) => line.trim() !== '')
 			.map((line) => JSON.parse(line))
```

### `bench/dated/check.mjs`

```diff
--- /home/user/agent/tmp/bench/dated/check.mjs
+++ harness/bench/dated/check.mjs
@@ -1,9 +1,14 @@
 import assert from 'node:assert/strict';
 import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
 import { spawnSync } from 'node:child_process';
+import { join, relative } from 'node:path';
 import { test } from 'node:test';
 
-export const SOURCES = ['tmp/bench/scenario.json', ...['variants', 'variants/ledger'].flatMap(folder => Array.from({ length: 8 }, (_, index) => `tmp/bench/${folder}/v${index + 1}.json`)), 'tmp/bench/u2/rules.json'];
+const ROOT = join(import.meta.dirname, '..', '..');
+const BENCH = join(ROOT, 'bench');
+const RULES = join(BENCH, 'u2', 'rules.json');
+const RENDER = join(BENCH, 'dated', 'render.mjs');
+export const SOURCES = [join(BENCH, 'scenario.json'), ...['variants', 'variants/ledger'].flatMap(folder => Array.from({ length: 8 }, (_, index) => join(BENCH, folder, `v${index + 1}.json`))), RULES];
 export const FIXTURES = [
   { run: '2027-01-04', ship: '2027-01-01', off: '2027-01-05', estimate: '2027-01-06', forms: ['2027-01-06', 'January 6', 'Jan 6', 'Jan. 6', '6 Jan', '6th of January', '01/06', '1/6/27', '06/01/2027', 'January sixth', 'sixth of January', 'January six'] },
   { run: '2027-01-05', ship: '2027-01-04', off: '2027-01-06', estimate: '2027-01-07', forms: ['2027-01-07', 'January 7', 'Jan 7', 'Jan. 7', '7 Jan', '7th of January', '01/07', '1/7/27', '07/01/2027', 'January seventh', 'seventh of January', 'January seven'] },
@@ -118,14 +123,14 @@
       assert.deepEqual([...target.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(match => match[0]), expected, `${file}:${path}`);
     }
     if (rendered.seed) checkScenario(rendered, fixture); else checkRules(rendered, fixture);
-    const folder = `tmp/bench/dated/check/${fixture.run}`;
+    const folder = join(BENCH, 'dated', 'check', fixture.run);
     mkdirSync(folder, { recursive: true });
-    writeFileSync(`${folder}/${file.replaceAll('/', '_')}`, JSON.stringify(rendered));
+    writeFileSync(`${folder}/tmp_bench_${relative(BENCH, file).replaceAll('/', '_')}`, JSON.stringify(rendered));
   }
 });
 test('scoring: handwritten estimate forms fail and ship-only replies pass staged g06', async () => {
   const { renderDocument } = await import('./helpers.mjs');
-  for (const fixture of FIXTURES) checkRules(JSON.parse(renderDocument(readFileSync('tmp/bench/u2/rules.json', 'utf8'), fixture.run, 'tmp/bench/u2/rules.json')), fixture);
+  for (const fixture of FIXTURES) checkRules(JSON.parse(renderDocument(readFileSync(RULES, 'utf8'), fixture.run, RULES)), fixture);
 });
 test('refusal: undeclared dates name the input file and offending text, including identity run', async () => {
   const { renderDocument } = await import('./helpers.mjs');
@@ -137,27 +142,27 @@
 test('CLI: goal filtering, before parity, staged rules, today, and invalid arguments', async () => {
   const { renderDocument } = await import('./helpers.mjs');
   for (let index = 1; index <= 8; index++) {
-    const source = `tmp/bench/variants/ledger/v${index}.json`;
-    const output = `tmp/bench/dated/identity-v${index}.json`;
-    const result = spawnSync(process.execPath, ['tmp/bench/dated/render.mjs', '--date', '2026-10-08', '--source', source, '--out', output, '--goals', 'g06-kenji-shipping'], { encoding: 'utf8' });
+    const source = join(BENCH, 'variants', 'ledger', `v${index}.json`);
+    const output = join(BENCH, 'dated', `identity-v${index}.json`);
+    const result = spawnSync(process.execPath, [RENDER, '--date', '2026-10-08', '--source', source, '--out', output, '--goals', 'g06-kenji-shipping'], { encoding: 'utf8' });
     assert.equal(result.status, 0, result.stderr);
-    assert.deepEqual(readJSON(output), readJSON(`tmp/bench/variants/g06/before/v${index}.json`));
+    assert.deepEqual(readJSON(output), readJSON(join(BENCH, 'variants', 'g06', 'before', `v${index}.json`)));
   }
-  const result = spawnSync(process.execPath, ['tmp/bench/dated/render.mjs', '--date', 'today', '--source', SOURCES[0], '--out', 'tmp/bench/dated/today.json', '--goals', 'g07-depot-release,g06-kenji-shipping', '--rules', 'tmp/bench/u2/rules.json', '--rules-out', 'tmp/bench/dated/today-rules.json'], { encoding: 'utf8', env: { ...process.env, TZ: 'Pacific/Kiritimati' } });
+  const result = spawnSync(process.execPath, [RENDER, '--date', 'today', '--source', SOURCES[0], '--out', join(BENCH, 'dated', 'today.json'), '--goals', 'g07-depot-release,g06-kenji-shipping', '--rules', RULES, '--rules-out', join(BENCH, 'dated', 'today-rules.json')], { encoding: 'utf8', env: { ...process.env, TZ: 'Pacific/Kiritimati' } });
   assert.equal(result.status, 0, result.stderr);
   const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Kiritimati' });
   const expected = JSON.parse(renderDocument(readFileSync(SOURCES[0], 'utf8'), today, SOURCES[0]));
   expected.goals = expected.goals.filter(goal => ['g06-kenji-shipping', 'g07-depot-release'].includes(goal.id));
-  assert.deepEqual(readJSON('tmp/bench/dated/today.json'), expected);
-  assert.deepEqual(readJSON('tmp/bench/dated/today-rules.json'), JSON.parse(renderDocument(readFileSync('tmp/bench/u2/rules.json', 'utf8'), today, 'rules')));
-  for (const args of [[], ['--date', '2026-02-30'], ['--wat', 'x'], ['--date', 'today', '--source', SOURCES[0], '--out', 'tmp/bench/dated/invalid.json', '--rules', 'tmp/bench/u2/rules.json']]) {
-    assert.notEqual(spawnSync(process.execPath, ['tmp/bench/dated/render.mjs', ...args]).status, 0);
+  assert.deepEqual(readJSON(join(BENCH, 'dated', 'today.json')), expected);
+  assert.deepEqual(readJSON(join(BENCH, 'dated', 'today-rules.json')), JSON.parse(renderDocument(readFileSync(RULES, 'utf8'), today, 'rules')));
+  for (const args of [[], ['--date', '2026-02-30'], ['--wat', 'x'], ['--date', 'today', '--source', SOURCES[0], '--out', join(BENCH, 'dated', 'invalid.json'), '--rules', RULES]]) {
+    assert.notEqual(spawnSync(process.execPath, [RENDER, ...args]).status, 0);
   }
 });
 test('negative controls: the agreement checker detects stale dates, weekdays, relative words, clock, and scoring', async () => {
   const { renderDocument } = await import('./helpers.mjs');
   const fixture = FIXTURES.at(-1);
-  const correct = JSON.parse(renderDocument(readFileSync('tmp/bench/variants/ledger/v1.json', 'utf8'), fixture.run, 'v1'));
+  const correct = JSON.parse(renderDocument(readFileSync(join(BENCH, 'variants', 'ledger', 'v1.json'), 'utf8'), fixture.run, 'v1'));
   checkScenario(correct, fixture);
   for (const mutation of [
     value => { value.seed[0].content = value.seed[0].content.replace('Friday', 'Thursday'); },
@@ -166,7 +171,7 @@
     value => { value.tools.lookup_order['LH-81660'] = value.tools.lookup_order['LH-81660'].replace('2026-10-13', '2026-10-12'); },
     value => { value.goals.find(goal => goal.id === 'g06-kenji-shipping').forbidden[0] = '2026-10-12'; },
   ]) { const broken = structuredClone(correct); mutation(broken); assert.throws(() => checkScenario(broken, fixture)); }
-  const rules = JSON.parse(renderDocument(readFileSync('tmp/bench/u2/rules.json', 'utf8'), fixture.run, 'rules'));
+  const rules = JSON.parse(renderDocument(readFileSync(RULES, 'utf8'), fixture.run, 'rules'));
   rules['g06-kenji-shipping'].forbiddenPatterns[0] = '(?!)';
   assert.throws(() => checkRules(rules, fixture));
 });
```

### `bench/u2/compare.mjs`

```diff
--- /home/user/agent/tmp/bench/u2/compare.mjs
+++ harness/bench/u2/compare.mjs
@@ -5,6 +5,7 @@
 
 const HERE = dirname(fileURLToPath(import.meta.url))
 const BENCH = dirname(HERE)
+const RESULTS = join(dirname(BENCH), '..', 'results')
 const GOALS = JSON.parse(readFileSync(join(BENCH, 'scenario.json'), 'utf8')).goals
 const RULES = JSON.parse(readFileSync(join(HERE, 'rules.json'), 'utf8'))
 const STAGED = existsSync(join(HERE, 'rescore.mjs')) ? await import('./rescore.mjs') : { compileRules, scoreText, clean }
@@ -24,7 +25,7 @@
 function getAudits(version) {
  const keys = new Map()
  const audits = new Map()
- const root = join(BENCH, 'results', version)
+ const root = join(RESULTS, version)
  for (const directory of ['audit', 'audit-keys']) {
   if (!existsSync(join(root, directory))) continue
   for (const file of readdirSync(join(root, directory)).filter(name => /^key.*\.json$/.test(name)).sort()) {
@@ -108,7 +109,7 @@
  const skipped = []
  const snapshots = []
  for (const version of ['v9', 'v10']) {
-  const root = join(BENCH, 'results', version)
+  const root = join(RESULTS, version)
   const audits = getAudits(version)
   for (const name of collectDirectories(root)) {
    const entry = { name }
```

### `bench/variants/check.mjs`

```diff
--- /home/user/agent/tmp/bench/variants/check.mjs
+++ harness/bench/variants/check.mjs
@@ -1,5 +1,5 @@
 // Checks the reworded scenario variants against their scenario files. A variant with a `ledger` member is the
-// briefing harness's twin and compares with tmp/bench3/scenario.json; any other compares with scenario.json here.
+// briefing harness's twin and compares with bench3/scenario.json; any other compares with scenario.json here.
 // Each variant must equal its scenario file in every byte outside goals[].request, and each reworded request
 // must keep the original's ids, amounts, and proper names while adding no id, number, name, rule word, or
 // scoring phrase the original lacks, so a pass difference between variants comes from phrasing alone. The two
```

### `bench3/bench.mjs`

```diff
--- /home/user/agent/tmp/bench3/bench.mjs
+++ harness/bench3/bench.mjs
@@ -24,7 +24,7 @@
 	ProviderError,
 	renderSelectionState,
 	sumUsage,
-} from '/home/user/agent/dist/src/core/index.js'
+} from '../vendor/agent/index.js'
 import { createBudget } from '@orkestrel/budget'
 import { isArray, isNumber, isRecord, isString, parseJSONAs } from '@orkestrel/contract'
 import { createTool, createToolManager } from '@orkestrel/tool'
@@ -34,6 +34,7 @@
 import { buildRecords, checkRecords, extractTokens, linkAccounts, renderPinned, renderRecord, selectRecords, splitSentences } from './records.mjs'
 
 const HERE = dirname(fileURLToPath(import.meta.url))
+const ROOT = dirname(HERE)
 const OLLAMA_URL = 'http://127.0.0.1:11434'
 const AGENT_MODEL = 'qwen3.5:2b-q4_K_M'
 const TEV_MODEL = 'tev1:0.8b'
@@ -184,7 +185,7 @@
 		sections: { type: 'string', default: '' },
 		'judge-ctx': { type: 'string', default: '8192' },
 		timeout: { type: 'string', default: '3600000' },
-		out: { type: 'string', default: join(HERE, 'results') },
+		out: { type: 'string', default: join(ROOT, 'tmp') },
 		smoke: { type: 'boolean', default: false },
 		state: { type: 'string', default: 'stock' },
 		criterion: { type: 'string', default: 'stock' },
@@ -224,7 +225,7 @@
 		'calibrate-categories': { type: 'boolean', default: false },
 		'check-ledger': { type: 'boolean', default: false },
 		judgments: { type: 'string' },
-		replay: { type: 'string', default: '/home/user/agent/tmp/bench/results/v3/ledger-deny-first' },
+		replay: { type: 'string', default: join(ROOT, 'data', 'ledger-deny-first') },
 		model: { type: 'string', default: AGENT_MODEL },
 		think: { type: 'boolean', default: false },
 	},
@@ -532,10 +533,10 @@
 
 function createJudge(judgeFetch = countingFetch) {
 	if (flags.judge === 'tev1') return createSystemOneJudge({ url: OLLAMA_URL, model: TEV_MODEL, timeout: goalTimeout, fetch: judgeFetch })
-	return import('/home/user/ollama/dist/src/core/index.js').then(({ createOllamaJudge }) =>
-		// This judge comes from the ollama package, which inherits the agent 0.0.28 installed under
-		// /home/user/ollama/node_modules: its errors are not instances of this checkout's error classes,
-		// so the harness records them by message and never narrows them with this checkout's guards.
+	return import('../vendor/ollama/index.js').then(({ createOllamaJudge }) =>
+		// This judge comes from the vendored ollama build, which inherits the agent 0.0.29 installed under
+		// node_modules (pinned in package.json): its errors are not instances of the vendored agent build's error classes,
+		// so the harness records them by message and never narrows them with the vendored agent build's guards.
 		createOllamaJudge({
 			url: OLLAMA_URL,
 			model: MICA_MODEL,
@@ -889,7 +890,7 @@
 // The calibration record the v3 and v8 ledger runs of this seed imported. A record that names no `judgments` file and
 // has no `cal-categories.jsonl` beside its folder replays against it; the import-count check refuses a record
 // that imported other rows.
-const SEED_JUDGMENTS = '/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl'
+const SEED_JUDGMENTS = join(ROOT, 'data', 'cal-categories.jsonl')
 // The requests' desk topics for a record whose rows carry no `request` field, chosen so the code of that run
 // reproduces each recorded briefing (tokens, coverage, and tail length).
 const REPLAY_REQUEST_TOPICS = {
```

### `bench3/records-check.mjs`

```diff
--- /home/user/agent/tmp/bench3/records-check.mjs
+++ harness/bench3/records-check.mjs
@@ -8,11 +8,12 @@
 import { buildRecords, checkRecords, compareAmounts, extractTokens, linkAccounts, renderRecord, selectRecords, splitSentences } from './records.mjs'
 
 const HERE = dirname(fileURLToPath(import.meta.url))
+const ROOT = dirname(HERE)
 const BENCH = join(HERE, 'bench.mjs')
 const RECORDS = join(HERE, 'records.mjs')
 const SCENARIO = join(HERE, 'scenario.json')
 const FIXTURES = join(HERE, 'records-fixtures.json')
-const PLAN = '/home/user/agent/tmp/bench/results/v9/RECORDS-PLAN.md'
+const PLAN = join(ROOT, '..', 'results', 'v9', 'RECORDS-PLAN.md')
 // The plan's `Rules` fixture lines in the g03 desk order (escalations, delivery): m6 and m8 meet it, m2 and m29 follow.
 const G03_RULES_ORDER = [3, 4, 5, 6, 0, 1, 2]
 const FICTIONAL_ACCOUNT = 'BW-20931'
```

### `models/plan.mjs`

```diff
--- /home/user/agent/tmp/bench/models/plan.mjs
+++ harness/models/plan.mjs
@@ -6,9 +6,11 @@
 // f4-control (a 6,144-token window, word search). Only `--model` differs from the measured Qwen runs.
 // Exit: 0; 64 on usage.
 import { writeFileSync } from 'node:fs'
+import { dirname } from 'node:path'
 import { parseArgs } from 'node:util'
 
-const BENCH = '/home/user/agent/tmp/bench'
+const ROOT = dirname(import.meta.dirname)
+const BENCH = `${ROOT}/bench`
 const { values } = parseArgs({ options: { model: { type: 'string' }, prefix: { type: 'string' }, copies: { type: 'string' }, out: { type: 'string' }, estimate: { type: 'string' } } })
 const copies = /^(\d)-(\d)$/.exec(values.copies ?? '')
 const estimate = (values.estimate ?? '900,600').split(',').map(Number)
@@ -25,7 +27,7 @@
 		args: [
 			'--mode', 'ledger', '--profile', 'refined', '--scenario', `${BENCH}/variants/ledger/v${copy}.json`,
 			'--ctx', '3072', '--judge', 'mica', '--judge-ctx', '4096', '--tail', '0.35',
-			'--judgments', `${BENCH}/results/v3/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', '--model', values.model,
+			'--judgments', `${ROOT}/data/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', '--model', values.model,
 		],
 	})
 	plan.push({
```

### `models/sweep.sh`

```diff
--- /home/user/agent/tmp/bench/models/sweep.sh
+++ harness/models/sweep.sh
@@ -1,9 +1,9 @@
 #!/bin/sh
 # Pulls, pilots, and removes each candidate in turn, so the disk holds one candidate at a time:
-#   sh sweep.sh TAG...
+#   G06_RESULTS=DIR sh sweep.sh TAG...
 # Each candidate's capabilities and pilot rows land in caps.jsonl and pilot.jsonl beside this script.
 DIR=$(dirname "$0")
-G=/home/user/agent/tmp/bench/results/g06
+G=${G06_RESULTS:?set G06_RESULTS to the results directory that holds the f2-*-wire recordings}
 REQS="$G/f2-records-plain-2026-10-09-v1-wire/00010_api_chat-request.json $G/f2-view-plain-2026-10-09-v1-wire/00001_api_chat-request.json"
 for tag in "$@"; do
 	echo "===== $tag pull $(date -u +%H:%M:%S)"
```

### `tools/plan.ts`

```diff
--- /home/user/agent/tmp/bench/results/v7/tools/plan.ts
+++ harness/tools/plan.ts
@@ -13,8 +13,10 @@
 // the think-off 0.7 of 3,072 tokens.
 // Exit: 0; 64 on usage.
 import { writeFileSync } from 'node:fs'
+import { dirname } from 'node:path'
 
-const BENCH = '/home/user/agent/tmp/bench'
+const ROOT = dirname(import.meta.dirname)
+const BENCH = `${ROOT}/bench`
 const AGENT_2B = 'qwen3.5:2b-q4_K_M'
 const AGENT_4B = 'qwen3.5:4b-q4_K_M'
 const RECORDS_CTX = 3072
@@ -46,7 +48,7 @@
 		return [
 			'--mode', 'ledger', '--profile', 'refined', '--scenario', `${BENCH}/variants/ledger/v${copy}.json`,
 			'--ctx', String(ctx), '--budget', budget, '--judge', 'mica', '--judge-ctx', '4096', '--tail', '0.35',
-			'--judgments', `${BENCH}/results/v3/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', ...model, ...(condition.records ?? []),
+			'--judgments', `${ROOT}/data/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', ...model, ...(condition.records ?? []),
 		]
 	}
 	if (arm === 'control') return ['--mode', 'none', '--ctx', String(CONTROL_CTX + condition.grow), '--search', 'words', '--reply', 'terminal', '--scenario', `${BENCH}/variants/v${copy}.json`, ...model]
```

### `tools/run-one.ts`

```diff
--- /home/user/agent/tmp/bench/results/v7/tools/run-one.ts
+++ harness/tools/run-one.ts
@@ -11,9 +11,10 @@
 import { spawnSync } from 'node:child_process'
 import { createHash } from 'node:crypto'
 import { appendFileSync, closeSync, existsSync, openSync, readdirSync, readFileSync } from 'node:fs'
-import { join } from 'node:path'
+import { dirname, join, resolve } from 'node:path'
 
-const TOOLS = '/home/user/agent/tmp/bench/results/v7/tools'
+const ROOT = dirname(import.meta.dirname)
+const TOOLS = join(ROOT, 'tools')
 const HARNESSES: ReadonlySet<string> = new Set(['bench', 'bench3'])
 
 interface Row {
@@ -70,20 +71,20 @@
 		return 64
 	}
 	const args = argv.slice(split + 1)
-	const out = join(base, name)
-	const log = join(base, 'run.log')
+	const out = resolve(base, name)
+	const log = resolve(base, 'run.log')
 	const taken = [out, `${out}.log`, `${out}-wire`].filter((path) => existsSync(path))
 	if (taken.length > 0) {
 		process.stderr.write(`run-one: ${name} already has output, which a rerun would overwrite: ${taken.join(', ')}\n`)
 		return 2
 	}
-	const sha = createHash('sha256').update(readFileSync(join('/home/user/agent/tmp', harness, 'bench.mjs'))).digest('hex')
+	const sha = createHash('sha256').update(readFileSync(join(ROOT, harness, 'bench.mjs'))).digest('hex')
 	const cold = spawnSync(process.execPath, [join(TOOLS, 'cold-start.mjs')], { stdio: 'inherit' })
 	if (cold.status !== 0) return 3
 	appendFileSync(log, `===== ${name} start ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} [${harness} ${args.join(' ')}] harness-sha256 ${sha}\n`)
 	const sink = openSync(`${out}.log`, 'w')
 	const run = spawnSync(process.execPath, ['--import', join(TOOLS, 'record-fetch.mjs'), 'bench.mjs', ...args, '--out', out], {
-		cwd: join('/home/user/agent/tmp', harness),
+		cwd: join(ROOT, harness),
 		env: { ...process.env, RECORD_DIR: `${out}-wire` },
 		stdio: ['ignore', sink, sink],
 	})
```

### `tools/series.ts`

```diff
--- /home/user/agent/tmp/bench/results/v7/tools/series.ts
+++ harness/tools/series.ts
@@ -11,9 +11,10 @@
 // Exit: 0 when the plan finishes or the budget stops it; 1 when a run exits nonzero; 2 when a run is unfinished; 64 on usage.
 import { spawnSync } from 'node:child_process'
 import { existsSync, readFileSync } from 'node:fs'
-import { join } from 'node:path'
+import { dirname, join } from 'node:path'
 
-const RUN_ONE = '/home/user/agent/tmp/bench/results/v7/tools/run-one.ts'
+const ROOT = dirname(import.meta.dirname)
+const RUN_ONE = join(ROOT, 'tools', 'run-one.ts')
 const MARGIN = 1.3
 
 interface Planned {
```

## Per-requirement scorer (added 2026-10-10)

`bench/goals/` holds the per-requirement scorer copied from the untracked `bench/goals/`: `children.json`, `fixtures.json`, `check.mjs`, `read.mjs`, `anatomy.json`, and `README.md`. Only `read.mjs` changed: its `RESULTS` root moved to `../../../results` (the committed `instruments/results/`) and its `PORT` root to `RESULTS/port`. The recorded replies it reads were copied beside the curated readings: `results/v9/a1-control-v1..v8/none.jsonl`, `results/port/a5-records-v1..v8/ledger.jsonl`, `results/port/p1-ledger-v1..v8/ledger.jsonl`, and the `ledger.jsonl`, `none.jsonl`, and `run.json` of every `results/v10/{f4,t2a,t4}-{records,control}-v*` run. From the new location `node check.mjs` exits 0 (25 children, 238 fixtures, 59 patterns, 59 mutations), and `node read.mjs` writes 1,400 rows byte-identical to the reading taken in the original tree.

## Live reproduction (2026-10-10)

A run from this home reproduces a run from the original tree. Copy 1 of the `v11` Gemma 4 E2B series (`../results/v11/plan-g2-smoke.json` arguments, planned here by `models/plan.mjs`) ran again from this directory into `tmp/v11-repro/` after a cold start. `tools/compare-wires.mjs` compares the two wire recordings call by call: the records run matches on all 83 calls and the full view on all 13, in every request body and in every model output, and both runs score the same 10 verdicts. Four judge calls sampled a different one-token answer at temperature 1 while returning byte-identical log-probabilities; the judge decides from the log-probabilities, so `compare-wires.mjs` compares those on a sampled call. Two different copies differ on 69 of 83 calls, so the comparison can fail.

## Trimmed aggregate vendor (2026-10-10)

Bench5 and its refit instrument consume the byte-copied final `@orkestrel/agent` 0.0.30 entry from `C:/Users/mikes/WebstormProjects/agent/dist/src/core/index.js` at source commit `ee734c30151c7d431e480aff7a0d54306d387f13`. The additional directory is `vendor/agent-0.0.30-trimmed/`. Its `index.js` SHA-256 is `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d`; its byte-copied `index.d.ts` SHA-256 is `f6f28cab8a2d417510e68f308563f1f53eb86b600e0a57208799adc8d783d171`.

The consumers use the final declaration names: `overhead`, `closure`, `findLedgerCall`, `exclusions`, and `supersessions`. The `amends` and `supersedes` question and threshold keys retain their meanings. The original vendor directories and archived result, cache, fit, and settings bytes remain preserved. The Ollama build retains its installed `@orkestrel/agent` 0.0.29 resolution. Every declared bare dependency of the trimmed agent has the same installed version in the source checkout and the harness; no dependency pin or lock changed.
