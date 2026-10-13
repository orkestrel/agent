# Small models on the tool surface: findings, instruments, and advice

Hand-off record, written 2026-10-07 at the close of the small-model campaign, for the session that carries the agent's context work ([plan.md](plan.md)) and for anyone who runs the store harness or a judge model. The row-by-row evidence is `.orkestrel/veneer/lifecycle/reading/small/matrix.md` (rows T0 to P1); the releases are `.orkestrel/release.md` § 2026-10-07 round, continued. A measured fact names its run; a ruling names the user.

## The user's position

- **Tune to the smallest model that makes sense.** The campaign's bar was qwen3.5:2b-q4_K_M running every store task through the real harness; a larger model inherits what the 2B proves. The bar held: `confirm.ts 2b-final3` passed every one of the six tasks in 16 runs of 16 (matrix row F3).
- **Running the model reflexively was an instrument, not a mistake.** With `think: false` the 2B exposed defects the reasoning model walks around: stale references after a page change, a replay with no start, refusals that named two exits, an opening budget too small for its own prompt, a loop that dispatched calls to tools the scope had withdrawn, a refusal bound that reset on any success. Each was fixed in the package or the harness and pinned before thinking was turned on.
- **Thinking made the 2B pass only after that work.** With `think: true` and the fixed harness, the model's choices became byte-stable and its transcripts name every remaining confusion in its own words. Thinking on a broken harness would have hidden the defects behind a smarter reader.
- **The provider's `think` default stays `false`** (the user, 2026-10-07). A harness or a consumer that wants a thinking model's reasoning sets `think: true` itself; the store harness does (`STORE_BOUNDS.think`).

## What the campaign found, in the order it mattered

1. **The wire between the agent and the browser is sound** (matrix row W1; ollama `tmp/codex/wire-dump.test.ts`). One journey turn carries the system prompt (1,202 characters), 13 definitions (5,893 characters of JSON), the conversation with tool results verbatim, and `options {num_predict, temperature, num_ctx}`; no prompt came near the 16,384 window; no call arrived unshaped.
2. **A reflexive small model's tool choice is a near-tie.** The opening `click`/`type` decision on a link, re-sent byte for byte under another loopback port, flipped on 3 of 4 ports, and a change of description bytes or the daemon's cache path flipped it too. Tuning copy against that model is a lottery; the same bytes read as instructions once thinking is on (`type` description: "I should first click on the search box to activate it" against the shipped copy, a direct `type` with submit against "Focuses a field such as a search box and types into it").
3. **The remaining confusions were the fixture's, the prompt's, and the tool's**, each read from the model's reasoning in one transcript:
   - a checkout from an empty cart ("The cart is empty, so I need to add items to it first"): the journey's store starts with a product in the cart;
   - "Search for kettle" read as a page search, two `read` calls and no search box: the task says "Use the search box to search for kettle";
   - the `edit` call opened with the pasted edits array and never carried `journey`, under four instruction wordings, while its reasoning said "I need to provide the journey name": the instruction names the journey right before the array, and `edit` defaults an omitted `journey` to the only saved journey (browser 0.0.27);
   - a `save` after a successful replay, whose refusal ("Answer the user.") the model read as the user asking again and replayed a second time: each later turn of a store task asks for one call, so the harness ends a later turn's tool access after its first successful call, as it does after the refusal bound.
4. **Keep the model card's sampling penalties.** Plain greedy (`presence_penalty 0`, `repeat_penalty 1`) sent the thinking model back to reading the page before it searched: search 4 of 8 at 15.1 s against 16 of 16 at 7.2 s with the card's values (`search-greedy.md`, `search-think.md`). The harness sends `num_predict 1024` with thinking on, because thinking counts toward the cap, and nothing else beyond `temperature 0` and `num_ctx`.
5. **Time per attempt with thinking** (the 16-run confirmation): shipping about 11 s, search 7 s, checkout 8 s, paging 9 to 16 s, cart 8 to 33 s with a retry, journey 40 to 65 s.

## The instruments, all under the ollama checkout's `tmp/`

Read before tuning; replay before rerunning. Each is a TypeScript file run by Node. The ollama `tmp/` folder is ignored by git, so tracked copies of these instruments sit under `instruments/` beside this file, in the same `probes/` and `codex/` layout; copy them into an ollama checkout's `tmp/` to run them (`census.ts` and `tsconfig.json` belong with `store-live.test.ts`).

- `tmp/probes/wire-dump.test.ts` runs one live attempt per task through the real harness and writes every `/api/chat` body beside its parsed result (`tmp/codex/wire/<task>-<port>/turn-NN.json`). Env: `WIRE_DUMP_TASKS`, `WIRE_DUMP_PORT`, `WIRE_DUMP_DIR`.
- `tmp/codex/wire-replay.ts FILE [--port P] [--log LOG --turn N] [--think true] [--presence X] [--repeat X] [--predict N] [--raw]` re-sends one dumped turn, or the conversation before the N-th assistant turn of an attempt log under the dump's system message and tools, and prints thinking, content, calls, the stop reason, and the token counts. `--port` rewrites every loopback port, so another port's decision can be re-sent byte for byte.
- `tmp/codex/thinking.ts LOG [--from N] [--width CHARS]` prints an attempt as the model saw it: each user turn, each assistant turn's thinking and calls with full arguments, each tool reply.
- `tmp/codex/wire-audit.ts [--budget N] [--calls] DIR...` reads attempt logs for peak prompt size, completions that hit the cap, silent turns, and unshaped arguments.
- `tmp/probes/store-live.test.ts` runs whole live attempts per variant at the provider boundary (`STORE_LIVE_LABEL`, `STORE_LIVE_TASKS`, `STORE_LIVE_VARIANTS`, `STORE_LIVE_PORTS`); a variant rewrites the system prompt, the task prompt, the definitions, a tool result, or a call. Use 8 ports to screen and 16 to decide.
- `tmp/codex/confirm.ts LABEL MODEL RUNS [PATTERN]` runs the real service cases N times and stops at the first failed run; it is the gate.

The method that worked: dump one attempt, replay the decision turn with `--think true`, read the reasoning, change the fixture, the prompt, or the tool, screen 8 ports, confirm 16 runs. A description change is the last lever, not the first.

## Advice for the context work

- **The model opens a call's arguments with what it read last.** A key argument that competes with a large pasted structure gets dropped; put the key before the structure in the instruction, or let the tool default it when the default is unambiguous (`edit`'s `journey` to the only saved journey, `journeys`' `from` to 1).
- **A refusal that addresses the user reads as a user turn** to a reasoning model mid-task ("now they're asking again"). The planner's one-exit rule stands: a refusal names the one next call and nothing about who asked.
- **A result that names a field can be typed literally** by a reflexive model (`Typed "searchbox \"Search products\""`); with thinking the same text is read as advice. Keep such naming, and measure with thinking on.
- **Each later user turn asks for one call.** A context layer that carries turn intent can close admission after the turn's request is met, which the harness does by policy today; a turn's first successful call is a usable boundary.
- **Admission stays in the loop** (agent 0.0.28, [plan.md](plan.md) § Dispatch admission): a call to a tool the active scope does not admit is never dispatched, and a turn that advertised no tool ends on the reply. The store harness relies on it to end a turn after the refusal bound.
- **Measure, never infer, a small model's reading.** The transcript's thinking is the evidence; a reflexive run's shape is a symptom.

## The judge models: Mica and tev1

Two different kinds of model on two different wires; `ollama/tests/service/judge.test.ts` needs both installed.

| | Mica | tev1 |
| --- | --- | --- |
| Tag | `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` | `tev1:0.8b` (the Ollama library) |
| Card on this daemon | qwen3.5 architecture, 4.84B parameters, Q4_K_M, 3.1 GB; capabilities completion, tools, thinking | qwen3.5 architecture, 752M parameters, Q8_0, 811 MB; capability `decision` alone; requires Ollama 0.35.0 |
| Wire | `createOllamaJudge` in `@orkestrel/ollama`: the `MICA_SYSTEM` prompt it was trained with, a byte-exact render of the state, the answer read as a probability from the raw token logprobs, the calibration temperature 1.1244734010661372 shipped with the model | `createSystemOneJudge` in `@orkestrel/agent`: Ollama's System One endpoint, one request carrying choice, noul, and score; answers constrained to the supplied options, so the server never refuses |
| Cost | cold load about 231 s on a CPU host; 8,192-token limit | small and fast; the baked-in system prompt says "Select exactly one listed option" |
| Role | the user's production judge (the user, 2026-10-07) | the native decision model the second wire proves; the System One endpoint refuses Mica with HTTP 400, which the test asserts |

To run the judge file: `ollama pull hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` and `ollama pull tev1:0.8b`; `OLLAMA_JUDGE_MODEL`, `OLLAMA_JUDGE_TEMPERATURE`, and `OLLAMA_DECISION_MODEL` override the defaults. The file passed on Ollama 0.35.1 (1 of 1, 16.9 s) although the guide's System One readings were recorded on 0.40.0. No accuracy measurement ranks the two against each other; the Mica probe in [refine.md](refine.md) § Measurements is the only reading.

## Open after the campaign

- The 2B's one residual class under the real harness, a second replay after a refused save, is held by the follow-up turn policy; it is a model behavior, not a tool defect.
- `edit`'s choice refusal with no readable journey and a faulted entry names no journey (`Edit requires journey, one of ;`); a degenerate store state, recorded, not repaired.
- Run a package's whole service suite before a release: the small-model unit's release visit found three service pins and one server case that earlier units had left unrun.
- mcp's distribution pins move with the agent re-pin (this session's mcp layer); every other package carries only post-release visit commits.
