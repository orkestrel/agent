Blocked before implementation.

- **Expected:** The bridge driver launches GPT-6 Astra through `codex exec`.
- **Found:** The bench probe exited 3 (`live: false`); its child exited 1: `failed to initialize in-process app-server client: Read-only file system (os error 30)` — tmp/codex/bench.err:3.
- **Done:** Read the brief and probed the required engine.
- **Not done:** Implementation, behavior tests, and acceptance gates. No source changes; no shared-file patch.
- **Hypothesis:** CLI initialization requires a write outside the permitted workspace.

Journal: tmp/codex/bench.jsonl (empty). Session ID: unavailable; initialization failed before session creation.

All specified gates: not run; exit codes unavailable. No behavior-test citations exist.

`git status --porcelain`: exit 0, empty output.