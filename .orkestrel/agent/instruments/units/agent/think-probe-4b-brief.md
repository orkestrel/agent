# Unit think-probe-4b — A thinking-length probe that reads 4B wires

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes the flags and the behavior. Executor: NATIVE_SUBAGENT.

## Objective

Write `tmp/bench/results/v10/probes/think-probe.ts` (in `/home/user/agent`). It is a copy of `tmp/bench/results/v9/probes/think-probe.ts` extended with the flags this brief lists, so that it can replay recorded 4B agent requests with thinking on and measure how long the 4B thinks. Leave the v9 file unchanged.

## Context

- **The v9 probe** keeps only requests whose `model` is the 2B (`:10`, `:26`). It fixes `num_predict` 4096 and `num_ctx` 8192 (`:11-12`), and it sets no fetch timeout (`:45`).
- **The 4B wires** are `tmp/bench/results/v10/f4-records-v1-wire`, `f4-records-v3-wire`, `f4-control-v1-wire`, and `f4-control-v3-wire`.
  - Their bodies carry `model: qwen3.5:4b-q4_K_M`.
  - The records wires open with two seed measures, `options.num_predict` 1, and no tools.
- **The design** is `tmp/bench/results/v10/INVESTIGATE-4B.md`, section Design, Step 1 and unit U1.
- **Law.** `AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`. Write TypeScript run by Node, with no `as` assertions beyond what reading JSON needs. Its opening comment carries the usage line and the exit codes.
- **Standing condition.** Send no request to `127.0.0.1:11434` while you build it. The `--list` mode sends nothing; use it to test.

## Scope

- **Owned.** `tmp/bench/results/v10/probes/think-probe.ts`.
- **Off-limits.** Every other file.

## Contracts to land

1. **`--from MODEL`.** Keep bodies whose `model` equals MODEL. Default: `qwen3.5:2b-q4_K_M`.
2. **`--model MODEL`** is the model to send, as in v9.
3. **`--think on|off`, `--per N`, `--out FILE`,** and the `WIRE_DIR...` arguments work as in v9.
4. **Skip seed measures.** Skip every body with `options.num_predict === 1`.
5. **`--tools-only`.** Skip bodies with no tools.
6. **`--ctx N` and `--predict N`.** Defaults: 8192 and 4096.
7. **`--temperature T` and `--seed N`.** Override the recorded values when given.
8. **`--timeout-ms N`.** Bound each call with `AbortSignal.timeout`. A timeout writes a row with `reason: "timeout"` and the run continues.
9. **`--max-cuts K`.** Stop after K rows with `reason: "length"`, and print why.
10. **`--list`.** Print the selected files, one per line, plus a count, then exit 0 without sending anything.
11. **Rows.** Each row adds `thinkingText` (the thinking string) and `promptRate` to the v9 row fields.
12. **Exit codes.** 0 normally; 1 on a daemon error other than a timeout; 64 on usage. With no arguments, print the usage line and exit 64.

## Output

Return:

- each contract's `file:line`;
- the `--list` output for the acceptance command;
- the exit codes of the acceptance checks.

## Acceptance criteria

Run from `/home/user/agent/tmp/bench/results/v10`:

1. `node --no-warnings probes/think-probe.ts` exits 64.
2. The following command prints only 4B tool-bearing requests, with no `00002` or `00003` record files, and exits 0:

   ```
   node --no-warnings probes/think-probe.ts --list --from qwen3.5:4b-q4_K_M --model qwen3.5:4b-q4_K_M --think on --tools-only --per 99 --out /dev/null f4-records-v1-wire f4-records-v3-wire f4-control-v1-wire f4-control-v3-wire
   ```

3. `node --check` passes when run through a `.mjs` copy, or the file runs under Node's type stripping without a syntax error.
