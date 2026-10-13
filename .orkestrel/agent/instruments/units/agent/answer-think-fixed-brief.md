# Unit answer-think-fixed — Make the thinking-off answer pass the records harness's only behavior

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes the behavior and the names. Executor: NATIVE_SUBAGENT.

## Objective

In the records harness `tmp/bench3/bench.mjs` (in `/home/user/agent`), remove the `--answer-think` flag. Under `--think`, the ledger's tool-free answer pass always sends `think: false`. A run without `--think` is unchanged.

## Context

- **Evidence.**
  - Run `tmp/bench/results/v10/t2a-records-v1`, under `--think --think-predict 2048 --answer-think off`, replied on 10 of 10 goals, with 0 of 21 calls cut.
  - The same copy with the answer pass thinking (`t2w-records-v1`) replied on 8 of 10 goals, and both of its answer passes thought to the cap.
  - The user ruled that a thinking answer pass is a defect, not an option.
- **The installed file** has sha256 `4d07e56a17947e782d1aa751e5405f23dfc10d069b0155c7221ca3ef20f9c5c0`. It added the flag: declared near line 176, refused near lines 255 and 256, read near line 3297, used near line 3381, named in the summary near line 3748, and checked near lines 5964 to 5976. The diff that added it is `tmp/units/answer-think.diff`.
- **Law.**
  - `AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`;
  - `/home/user/scaffold/.claude/rules/writing.md` for comments.
- **Standing conditions.**
  - A live series runs `bench.mjs`. Write your change to `tmp/bench3/bench.mjs.next`: first copy `bench.mjs` over it, then edit the copy. Leave `bench.mjs` untouched. The Orchestrator installs the change between runs.
  - Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `tmp/bench3/bench.mjs.next`, and a temporary `.mjs` copy for the gates, which you delete before you finish.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **Remove the flag.** Delete the `--answer-think` declaration, its two refusals, and the setting's plumbing. A run given `--answer-think` fails as for any unknown flag.
2. **Thinking off on the answer pass.** Under `--think`, the answer pass's `generate` calls `agent.generate({ think: false })`. Every other pass keeps the provider's thinking.
   - Keep the provider's `body` reading `request.options?.think ?? this.#think`.
   - Keep the log entry's `think` member for an overridden call.
   - Add one comment there, stating why: a thinking model asked for a reply with no tools can end its turn inside its reasoning, or think to the cap.
3. **Without `--think`.** No call passes options, so every body is byte-identical to the installed file's bodies for a think-off run.
4. **Summary line.** Under `--think`, it names `answer pass think off`; without `--think`, it is unchanged.
5. **Self-check.** Rewrite the `--check-ledger` case so that it holds without the flag:
   - under `--think`, the answer-pass body sends `think: false` and the first-pass body sends `think: true`;
   - without `--think`, neither body sends `think: true`.

## Output

Return:

- each contract's `path:line` in `bench.mjs.next`;
- each gate's exit code;
- the sha256 of `bench.mjs.next`.

No process diary.

## Acceptance criteria

Run each from `/home/user/agent` against a temporary `.mjs` copy of `bench.mjs.next`:

1. `node --check` on the copy exits 0.
2. The copy's `--check-ledger --profile refined`, `--check-ledger --profile roundA`, and `--check-ledger --think --profile refined` each exit 0.
3. The copy with `--check-ledger --answer-think off` exits 2.
4. `diff tmp/bench3/bench.mjs tmp/bench3/bench.mjs.next` shows only this unit's edit.
