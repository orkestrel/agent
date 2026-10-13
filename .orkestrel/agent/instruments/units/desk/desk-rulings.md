# Rulings on the desk design's tensions (2026-10-10)

The design is `/home/user/agent-port/tmp/units/desk-design.md`. Its § Tensions leaves ten judgment calls to the Orchestrator. Every desk unit treats these rulings as binding, beside the design.

1. **Fan-out.** One turn sends the brief to every thread of the conversation, as the design states.
2. **Statement plus request for records.** Keep the design: the customer message enters as a statement, then `respond` serves the brief as the request. The T10 boundary stands: a statement after the first request reaches the model through the briefing or `recall` only. The page's Briefing disclosure states it.
3. **Reply cap with thinking off.** No cap, as measured: send no `num_predict` with thinking off. `PREDICT_AGENT` leaves with the agent speech.
4. **Date sentence.** The agent system text carries today's date: `AGENT_SYSTEM` followed by `Today is WEEKDAY YYYY-MM-DD.`, built by one helper from the server's local date when a thread is created. The ledger expects a date sentence in `system` (`/home/user/agent-port/src/core/ledgers/types.ts:239-240`), and every thread family carries the same text.
5. **Compaction guard.** Leave compaction unguarded, as the design's § Alternatives rules; the page's Folds disclosure shows every fold.
6. **Threads and contrasts.** Run the threads first, one after another, then the two contrasts. The threads are the page's subject, and the daemon serves one request at a time.
7. **Thresholds.** The measured `LEDGER_FIT` cutoffs, as the design states, with the TSDoc noting the in-sample fit on another load.
8. **The full view's literal.** `'view'`, labeled "Full view" on the page.
9. **Default conversation.** The measured headline pair: Records · 2B · thinking off and Full view · 2B · thinking off.
10. **Turn limit.** The page's limit for one turn is `TURN_LIMIT` times the number of threads, so a turn with thinking threads does not end early.

## Standing conditions for every desk unit

- **Release candidate.** `node_modules/@orkestrel/agent` holds the `@orkestrel/agent` release candidate (the port build at `8f5098b`, version 0.0.29, which exports `createLedger`), installed with `--no-save`. Never run `npm install`, `npm ci`, or `npm update` in the desk, and never edit `package.json` or `package-lock.json`: either reverts the candidate.
- **npm.** The desk requires npm 11.6 or later. Run every `npm` command with `PATH=/home/user/desk-npm11/bin:$PATH`.
- **Daemon.** Send no request to `127.0.0.1:11434`; a measured series holds it. Tests use a recording `fetch` that answers in the Ollama wire format.
- **One writer.** You are the only writer in `/home/user/desk`. Never delete a file you did not create. Never commit.
