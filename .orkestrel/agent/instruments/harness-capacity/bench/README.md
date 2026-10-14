# Larkspur comparison bench

The `bench.mjs` script drives the Larkspur Home support-desk scenario in `scenario.json` through one `@orkestrel/agent` agent against a local Ollama daemon. You can compare 4 ways of fitting a long conversation into a small context: summarizing compaction, judge selection, both together, and neither.

## Run the bench

The bench needs Node 22, the built agent at `/home/user/agent/dist/src/core/index.js`, and an Ollama daemon at `http://127.0.0.1:11434` that serves `qwen3.5:2b-q4_K_M`, `tev1:0.8b`, for `--judge mica`, `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`, and any model you name with `--model` or `--summary-model`, such as `qwen3.5:4b-q4_K_M`. A first model load takes 1 to 2 minutes on a 4-CPU host.

Run one goal first to prove the harness against the daemon:

```sh
node /home/user/agent/tmp/bench/bench.mjs --mode none --smoke
node /home/user/agent/tmp/bench/bench.mjs --mode selection --smoke
```

Run the full comparison, one mode at a time, because every mode shares the one daemon. The `selection` and `both` modes use the default `--judge mica`:

```sh
for MODE in none compaction selection both; do
	node /home/user/agent/tmp/bench/bench.mjs --mode "$MODE"
done
```

Each run writes `MODE.jsonl` and `MODE.md` under the output directory, where `MODE` is the mode name, and prints the table at the end. A later run of the same mode overwrites both files, so pass `--out` to keep runs apart.

To see whether a mode keeps going after `none` hits the window, the window has to be crossed mid-run. Run `none` with every goal first, then rerun the comparison with `--ctx` set below the largest `max prompt tokens` that `none` run reports.

To compare compaction without a summary instruction aimed at the scored facts, run `compaction` and `both` with the default `--summary generic`, then again with `--summary tuned` and a separate `--out`.

To compare selection states, run `selection` once per `--state` value with a separate `--out`. A bounded state fits a 4096-token judge context:

```sh
node /home/user/agent/tmp/bench/bench.mjs --mode selection --state bounded --neighbors 2 --judge-ctx 4096 --out /home/user/agent/tmp/bench/results/bounded
```

To measure the judge before a selection run, run the calibration for one state and judge; see the later section on calibration:

```sh
node /home/user/agent/tmp/bench/bench.mjs --calibrate --goals 1 --state bounded --judge-ctx 4096 --judge mica --out /home/user/agent/tmp/bench/results/calibration
```

To judge whole exchanges instead of single messages, pass `--unit exchange` with the `plain` or `bounded` state; see the later section on the exchange unit. Check the grouping with the probe first, which asks no model and no judge, then run the selection:

```sh
node /home/user/agent/tmp/bench/bench.mjs --probe-exchanges --goals 1 --unit exchange --state bounded
node /home/user/agent/tmp/bench/bench.mjs --mode selection --unit exchange --finished drop --state bounded --criterion lookup --judge-ctx 4096 --out /home/user/agent/tmp/bench/results/exchange
```

To keep a correction or withdrawal whenever the selection keeps the message it corrects, pass `--chain corrections`; see the later section on correction chaining. Check the chaining and the summarizer guard with their probes first, which ask no model and no judge:

```sh
node /home/user/agent/tmp/bench/bench.mjs --probe-guard
node /home/user/agent/tmp/bench/bench.mjs --probe-chain
node /home/user/agent/tmp/bench/bench.mjs --mode selection --chain corrections --state bounded --criterion lookup --judge-ctx 4096 --out /home/user/agent/tmp/bench/results/chain
```

To compare the two ways a goal can end, run each arm once per `--reply` value with a separate `--out`; see the later section on reply designs. Check both designs and the `--search words` ranking with their probes first, which ask no model and no judge:

```sh
node /home/user/agent/tmp/bench/bench.mjs --probe-reply
node /home/user/agent/tmp/bench/bench.mjs --probe-search
for REPLY in terminal tool; do
	node /home/user/agent/tmp/bench/bench.mjs --mode none --reply "$REPLY" --out "/home/user/agent/tmp/bench/results/reply-$REPLY"
done
```

The default `--reply terminal` changes the prompts of every arm against a run whose records lack the `replyVia` field: the system text ends with the terminal sentence, and no `send_reply` tool is advertised. A `--reply tool` run keeps the earlier system text and tools, and its prompts still differ from such a run in the lookup tool descriptions and, under `--search words`, in the search results; see the later section on reply designs. The `--state`, `--candidates`, `--search`, `--unit`, `--finished`, and `--chain` flags are opt-in. The default `--unit message` and the default `--chain none` add no field to the records and no clause to the summary line. The agent prompts of a run on 2026-10-08 or later differ from earlier runs in every mode: the system text carries the date line and the omitted-history sentences, and each tool message carries `tool_name`; see the later section on the 2026-10-08 changes. The results table and the JSON line gain columns and fields in every run.

To run the agent on another model or with a thinking pass, pass `--model` and `--think`; the summarizer keeps `qwen3.5:2b-q4_K_M` unless `--summary-model` names another, and the judge keeps its model. Check the thinking route with the reply probe first, which asks no model; see the later section on thinking mode:

```sh
node /home/user/agent/tmp/bench/bench.mjs --probe-reply
node /home/user/agent/tmp/bench/bench.mjs --mode none --model qwen3.5:4b-q4_K_M --think --out /home/user/agent/tmp/bench/results/none-4b-think
```

To re-score recorded runs with the scoring rules in `scenario.json` without the daemon, check the scorer with its probe, which asks no model, then pass one or more result files to `rescore.mjs`; see the later section on rescoring:

```sh
node /home/user/agent/tmp/bench/bench.mjs --probe-score
node /home/user/agent/tmp/bench/rescore.mjs /home/user/agent/tmp/bench/results/v2/*/*.jsonl
```

## Flags

The script reads the following flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--mode` | required | `compaction`, `selection`, `both`, or `none`. |
| `--goals N` | all 10 | Runs the first `N` goals in order. |
| `--judge` | `mica` | The selection judge: `tev1` drives `tev1:0.8b` through `createSystemOneJudge`; `mica` drives the Mica model through the ollama package's `createOllamaJudge`. |
| `--threshold` | `0.9` | The `needed` criterion's threshold, a multiple of 0.001; a subject is dropped only when its yes probability is at most the drop cut, 1 minus this value computed in integer thousandths, as the later section on the drop cut describes. |
| `--limit` | `all` | The fresh judge questions one selection may ask, or `all` for no cap; unasked subjects are kept. |
| `--summary` | `generic` | The summarizer instruction: `generic` names no scored category; `tuned` lists the ids, codes, corrections, and withdrawals the goals score, requires relative times as absolute dates with their meaning, and forbids next steps and advice. Both run under the summarizer system message described in the later section on the 2026-10-08 changes. |
| `--window` | `3000` | The compaction window, in `estimateMessages` units (characters divided by 4, plus 4 per message, plus the serialized tool calls), plus a fixed estimate for the tool definitions: the serialized `/api/chat` `tools` array length of the `--reply tool` definitions divided by 4, under either `--reply` value, so both designs fold at the same boundaries. `--probe-reply` prints each design's advertised estimate: 253 units under `--reply terminal` and 322 under `--reply tool` with `--search phrase`, and 266 and 335 with `--search words`; the window adds 322 or 335 in both designs. In `both`, the window measures the selected messages, so set it below the selected estimate or the run never compacts and repeats a selection run. |
| `--keep` | `6` | The live messages each compaction leaves verbatim. |
| `--ctx` | `6144` | The `num_ctx` option sent with every agent and summarizer call, together with `truncate: false` and the sampler options of `--temperature` and `--seed`, as the later section on sampler options describes. |
| `--temperature` | `0` | The `temperature` option of every agent and summarizer call, a nonnegative number. Above 0 the model samples, and `--seed` picks the sample. Any other value exits with status 2. |
| `--seed` | `7` | The `seed` option of every agent and summarizer call, a nonnegative integer. |
| `--judge-ctx` | `8192` | The `num_ctx` option the Mica judge sends; `tev1` takes no context option. The `stock` and `plain` states render the whole view and need the default or more; a `bounded` state needs no more than 4096. |
| `--timeout` | `3600000` | The milliseconds each agent run may take, and the deadline of each provider and judge call. A goal with a follow-up run makes 2 agent runs, so it can take twice this bound. |
| `--out DIR` | `tmp/bench/results` | The output directory. |
| `--scenario PATH` | `scenario.json` beside the script | The scenario file, read relative to the working directory. A variant under `variants/` differs from `scenario.json` only in its goal requests, so `--scenario variants/v3.json` runs the same seed, tools, and scoring rules under reworded requests, as the later section on reworded variants describes. Each record line and the settings line of `MODE.md` name the file. A file that is missing or is not JSON exits with status 2. |
| `--smoke` | off | Runs the first goal only and prints the per-call log and each reply, and the answer when it came from the final assistant content. |
| `--state` | `stock` | The judge state selection renders per question: `stock` is the package's `renderSelectionState`; `plain` and `bounded` are the harness states described in the later section on selection states. Every state runs through the harness handler described there. |
| `--criterion` | `stock` | The needed criterion the judge reads: `stock` is the package's `NEEDED_CRITERION`; `lookup` names a fact, rule, correction, or identifier the work must apply, quote, or look up, for a judge that misses an id the request needs for a lookup. The calibration and the selection both read it. |
| `--neighbors N` | `2`, or `1` under `--unit exchange` | The view messages a `bounded` state shows before and after the subject; under `--unit exchange`, the exchanges it shows before and after the subject exchange. Other states ignore it. |
| `--unit` | `message` | The selection's judgment unit: `message` asks about each view message and keeps whole exchanges, as the later section on selection states describes; `exchange` asks one question per exchange and keeps or drops the exchange whole, as the later section on the exchange unit describes. `exchange` needs `--state plain` or `bounded`, because the `stock` renderer marks one message. |
| `--finished` | `judge` | Under `--unit exchange`, how the selection treats an earlier goal's exchange, that is a request the harness posed with its work and reply: `judge` asks about it like any exchange; `drop` removes it from the view and from every judge state without a question, and its messages stay in the record for `search_history`. `--unit message` ignores it. |
| `--chain` | `none` | How the selection treats a correction of a kept message: `none` decides each subject on its needed answer alone; `corrections` keeps a later correction or withdrawal of a kept message, under either `--unit`, as the later section on correction chaining describes. |
| `--candidates` | `oldest` | The order selection asks about view messages: `oldest` asks in view order, as the package does; `newest` asks from the end of the view, so a numeric `--limit` leaves the oldest messages unasked and kept. Applies to every `--state`. |
| `--search` | `phrase` | How `search_history` matches: `phrase` matches the whole query as one substring; `words` ranks the messages by how many distinct words of the query each contains. |
| `--reply` | `terminal` | How a goal ends, as the later section on reply designs describes: `terminal` takes the final message of a run with no tool calls as the reply and advertises no `send_reply`; `tool` advertises `send_reply` and takes its text as the reply. Any other value exits with status 2. |
| `--model` | `qwen3.5:2b-q4_K_M` | The agent model; `--probe-tool-name` asks it too. The summarizer and the judge keep their models. An empty value exits with status 2. |
| `--summary-model` | `qwen3.5:2b-q4_K_M` | The summarizer model, which `--model` leaves unchanged. An empty value exits with status 2. |
| `--think` | off | Sends `think` true and `num_predict` from `--think-predict` (default 1024) on every agent call except the tool-free answer run, which sends `think` false and keeps `num_predict`, as the later section on thinking mode describes. Summarizer, judge, calibration, and `--probe-tool-name` calls send `think` false. |
| `--think-predict N` | 1024 | Under `--think`, the `num_predict` cap on every agent call, thinking and content together. A positive integer; any other value exits with status 2. |
| `--calibrate` | off | Runs no agent: asks the judge the needed question about every seed message for each of the first `--goals` goals and writes `calibration.jsonl` and `calibration.md`. `--mode` is not needed. Under `--unit exchange`, asks one question per seed exchange; see the later section on calibration. |
| `--progressive` | on | In `compaction` and `both`, loads the seed one message at a time and compacts whenever the window estimate of the system message, the view, and the tools reaches `--window`, so the first fold never takes the whole seed in one call. A fold that would leave a tool result live without its call waits for the next seed message. `--no-progressive` adds the seed at once, as before 2026-10-08. Other modes ignore it. |
| `--probe-judge-drift` | off | Runs no agent: asks the judge the needed question about every seed message for the g01 request, as `--calibrate` does, twice in a row in one process, each pass on a fresh conversation so no answer is reused. Writes `judge-drift.jsonl` and `judge-drift.md` under `--out` and prints the identical request bodies, the distribution and largest value of the absolute difference between the two passes, and the decisions that flip at `--threshold`. Pass the selection settings under test, such as `--state bounded --neighbors 2 --criterion lookup --judge-ctx 4096`. |
| `--probe-tool-name` | off | Runs no agent: sends two `/api/chat` requests with `stream` false and `num_predict` 1 that carry the same 4 messages (a system line, a user line, an assistant message with one `lookup_order` call, and its tool result), one with `tool_name` on the tool message and one without, and prints each HTTP status and `prompt_eval_count`. Equal counts mean the renderer ignores the field. |
| `--probe-guard` | off | Runs no agent, no model, and no judge: runs the summarizer guard over 11 fixtures with a stubbed summarizer (a fold whose summary invents an id; a fold whose summary drops an id held only in a tool call's arguments; a merge whose summary is its first input verbatim, over sections that folded seeds 2 and 22-37; the seed 25-43 fold, whose summarizer returns `No facts.` on every call, as in `ab-comp-tool` g01; a fold whose loss retry returns `No facts.` after a first summary that lost fewer ids, as in `ab-comp-terminal` g06; the seed 44-45 withdrawal fold, which holds no id, whose first summary is `No facts.`; the seed 8 fold, which holds no id, whose summarizer returns an empty text on every call; a merge of id-free sections whose sources hold the seed 44-45 withdrawal and whose first summary is `No facts.`; a merge of id-free sections whose sources hold only a `send_reply` call and its result, and whose summary is `No facts.`; a goal fold whose summary drops the ids of a lookup and of the assistant reply, two of which only the reply states; and a goal fold whose summary drops the ids of a lookup and of a `search_history` result that quotes an assistant reply) and prints, per fixture, the input identifiers, each stub call with its appended instruction, what an allowed set of message content alone without the date exemption rejects in each stub output, the guard entry, the restored sentences, and the final summary. Exits 1 when a final summary carries an identifier that neither its input nor a user message or lookup result of its sources states, lacks an input identifier that such a message states, or holds an `Identifiers:` line, when a restored sentence is not a user or lookup sentence verbatim, when either `No facts.` fold over facts is not retried as `empty` or keeps `No facts.`, when the empty withdrawal fold or the withdrawal merge keeps its first summary over a non-empty retry, when the merge without a user message or lookup result is retried, when the worse retry replaces the first summary, when the goal fold restores an assistant sentence or keeps an id only the reply states, or when the search fold restores the quoted reply or loses the lookup id. |
| `--probe-chain` | off | Runs no agent, no model, and no judge: replays the needed answers of the first g03 selection in `results/v4/selection/selection.jsonl` through both units with `--chain none` and `corrections`, as the later section on correction chaining describes, and prints the dropped seeds, the chained ids, and the questions asked and reused. Exits 1 when a check fails. |
| `--probe-exchanges` | off | Runs no agent, no model, and no judge: builds the exchanges of the seed with the first goal's request appended and prints the exchange count and each subject exchange's seed range, member count, leader, and member kinds. It confirms that the request's exchange holds the request alone and is excluded from the subjects, that the subject exchanges cover every seed message once and in order, and that no tool message sits outside its call's exchange, and exits 1 when a check fails. Under `--unit exchange`, it also prints the `--state` rendering for the last subject exchange. |
| `--probe-reply` | off | Runs no model and no judge: drives the g02 goal through the harness goal loop once per case, each over a fresh conversation holding the seed, with a stub transport behind the harness provider, and prints the advertised tool-schema estimate of each `--reply` value and the options every request must carry, then per case the reply route, the reply, the turns, the runs, the repeated calls, the tools each run advertised, and the messages the goal appended. The cases are listed in the later section on reply designs. Every stub answer streams its content in pieces and reports load, prompt, and generation durations and a cached prompt count, so each case also checks every call record: an answered call carries those 4 values and the `replyHash` of its scripted content and calls alone, without the stub's thinking or call ids, and a refused or cancelled call carries none of them. Exits 1 when a case differs from its expected outcome, a call record differs, or a request carries other options. |
| `--probe-search` | off | Runs no model: ranks the seed for the queries `Halvorsen Interiors`, `Kenji Nakamura replacement kettle`, `Sigrid Halvorsen callback`, and `Halvorsen pendant lights` as `--search words` does, and prints each query's words and hits as `SEED:MATCHED`, where `SEED` is the seed index and `MATCHED` the count of distinct words the message contains. It then extends the seed with a lookup repeated with its byte-identical result, two long replies, a reply in content, and a reply made through `send_reply`, and checks each search rule of the later section on modes. Exits 1 when a query over the seed finds nothing, when the tool result lists other hits under either `--reply` value, when the Halvorsen ticket correction (seed 27) is not among the `Halvorsen Interiors` hits, when a result lists one text twice, passes the token budget after its first hit, or holds more than 6 hits, or when a design cannot find its own earlier reply or `--reply terminal` finds a stray `send_reply` text. |
| `--probe-score` | off | Runs no agent, no model, and no judge: scores fixed texts with the scenario rules, among them the markdown pairs `not **ESC-2291**` (g04, passes) and `by **Friday**` (g07, fails), tables whose cells would join a negation to the wrong value, the negative g08 verdicts, the g03 sign-off left to "the manager" after a comma, a g07 request put off until tomorrow, and the LH-31055 account lookup text quoted in a g08 reply (passes with a verdict) and in a g10 reply (fails on 555-0142), and the 7 recorded v6 rows behind the 6 hand-read verdicts of `results/v6/diag/DIAGNOSIS.md` section 3, the 6 v7 rows the scorer bullets of `results/v7/GRADES-*.md` name as misread, and a correct and a wrong reply per scorer change of the later section on the 2026-10-09 changes, and prints each outcome with its reasons. Exits 1 when an outcome differs from the expected one. |

## Modes

Each mode builds the same conversation and tools and changes only what bounds the prompt:

- `none` sends the whole view every turn, so the prompt grows with every goal until it passes `--ctx`. Every call sends `truncate: false`, so the daemon refuses an over-context prompt and the goal ends in an error, counted as an overflow. Without that field, Ollama 0.40.0 drops whole leading messages until the rest fits and reports nothing: on 2026-10-08, a prompt of 18035 tokens at `num_ctx` 6144 returned `prompt_eval_count` 25.
- `compaction` sets the agent `window` to a `createBudget` over `estimateMessages` plus the tool-definition estimate. When the prompt reaches the window, the agent folds the older live messages into a section that the same qwen model summarizes. With `--progressive`, the harness also folds while it loads the seed.
- `selection` sets the agent `select` to `createSelection`, which asks the judge whether each view message is needed for the request and drops the decisive no answers. No window is set, so nothing is summarized. The selection asks about view messages in view order and keeps every message after the first `--limit` asked, so with a numeric `--limit` only the oldest `--limit` view messages are candidates; the `asked/screened` column shows the cap. Pass `--candidates newest` to make the newest `--limit` view messages the candidates instead.
- `both` sets the window and the selection together. The agent measures the window on the selected messages, so a window above the selected estimate never compacts; the summary line then says so.

The `search_history` tool reads the full record (every section's original messages and the live tail) in every mode, so the model can recover a fact that compaction or selection kept out of the prompt. It skips the results of earlier searches and every message from the goal's request on. A message's searchable text is its content; under `--reply tool`, the text of each `send_reply` call the message made follows its content on the next line, so either design can search its own earlier replies, and a hit shows that text. The tool walks the matching messages in rank order and keeps at most 6: it drops a message whose searchable text repeats a kept one, and skips a message that would take the kept hits past a token budget, estimated as the `role: text` line length divided by 4; the first hit always stays. The budget is 6 times the estimate of the longest seed message, 360 for this scenario, so it never cuts a search over the seed alone and bounds a result that long earlier replies would fill.

The `--search` flag sets how a query matches:

- `phrase` lowercases the trimmed query and matches a message whose lowercased content contains it as one substring. The tool description asks for one distinctive name, id, or word.
- `words` splits the query on whitespace, strips leading and trailing punctuation and symbols from each word, and lowercases it. It keeps each distinct word of 3 or more characters that is outside a fixed list of common words such as `the`, `and`, and `with`; the length counts characters, so an id such as `LH-80941` and a number such as `7719` stay; a count of letters would leave a query that names only an id with no word to search for. A word matches case-insensitively between characters that are neither letters nor digits, so `4127` does not match inside `41270`. Each message scores the count of distinct words it matches, and the result lists the messages that score at least 1, highest first, with a tie going to the newer message, so a correction outranks the value it replaced when the limit of 6 cuts the list. The tool description asks for a name, an id, or a few words and says the messages with the most words come first. When no message matches, the result names the words; when every word is common or shorter than 3 characters, it says so.

In a live run, the messages of earlier goals are newer than the seed, so they win a tie against a seed message. `--probe-search` ranks the seed alone, where the Halvorsen ticket correction (seed 27) is the sixth `Halvorsen Interiors` hit; a later goal's message that names Halvorsen once can push it out of the 6, and a long earlier reply can push it past the budget.

The `lookup_order` and `lookup_customer` descriptions ask for an order id or an account number exactly as written in the conversation, LH, a hyphen, then digits, and name no concrete id. Every scenario id carries the hyphen, and a lookup matches its key exactly after trimming and uppercasing, so an id without the hyphen returns `no record`.

## Reply designs

The `--reply` flag sets how a goal ends, so you can measure the two designs on the same code. Each design behaves the same way in every arm, and no branch of it reads a goal's facts, expected values, or patterns:

- `terminal`, the default, follows the package convention that a reply with no tool calls ends the run: the trimmed content of that final message is the reply. The harness registers no `send_reply` tool, so the tool list, its estimate, and the window leave it out, and a stray `send_reply` call gets `tool not found: send_reply` back while the loop continues. The last sentence of the system text, `You must finish every request by calling send_reply with the complete answer; only the send_reply text counts as your answer.`, becomes `Finish every request with your complete answer as your final message; that message is what the shift lead receives.` in the agent prompt and in the `--progressive` seed estimate. The harness exits with status 2 when `scenario.json` does not end with the first sentence.
- `tool` registers `send_reply` and keeps the system text unchanged. The harness calls `agent.abort('replied')` after the first successful `send_reply`, so the loop makes no further provider call, and the `send_reply` text joined across calls is the reply.

A goal gets at most one follow-up run. It carries the same selection and compaction hooks as any run, and every message it adds stays in the conversation record:

- Under `terminal`, a run that ends naturally with empty content, or that exhausts the turn limit with calls pending, gets one user message, `[Desk] Give your complete answer now as your final message, from what you already have.`, and one more run under `createScope({ name: 'answer', tools: [] })`, which advertises no tool, so the model answers from what it holds; the harness restores the previous scope after the run. The trimmed content of that run is the reply, and empty content leaves the goal with no reply. The package selects only when the last view message is a user message, so without that cue the answer run would follow an assistant or tool message and send the whole view in `selection` and `both`. A run cut off at `--ctx` can be cut off again on the answer run at the same context size.
- Under `tool`, a run that ends naturally with non-empty text and no `send_reply` gets one user message, `[Desk] That answer was not delivered. Call send_reply with the complete answer now; text outside send_reply never reaches anyone.`, and one more run. When that run also ends without `send_reply`, the harness delivers the last non-empty content of a run that ended naturally. When that content, after leading whitespace, opens with `Send reply:` or `send_reply:`, exactly as written, the harness removes the label, trims the rest, and removes one pair of surrounding quotes; any other content is delivered verbatim. A label after a preamble therefore stays in the reply with the preamble, and the scorer reads both. A run that ends naturally with empty content gets no reminder and leaves the goal with no reply.
- Under either design, an overflow, an abort, or another error on the first run ends the goal with no follow-up and no reply. A follow-up run that throws records `followError` and leaves the reply its design falls back to, which is scored like any other reply.

The designs rescue different runs: `terminal` reruns after an empty or exhausted run, and `tool` reminds only after non-empty text.

Both designs answer a lookup or a search once per goal. When a `lookup_order`, `lookup_customer`, or `search_history` call repeats the name and arguments of a call already answered in the same goal, the follow-up run included, the harness runs no tool and returns a fixed notice as its result: under `terminal`, `You already have this result earlier in this request; give your complete answer now as your final message.`, and under `tool`, `You already have this result earlier in this request; call send_reply with your complete answer now.` Arguments match as JSON with their keys sorted, so a change of case or spacing in an id is not a repeat. The goal's `tools` entry for that call carries `repeat: true`, and the record counts the repeats.

Under `selection` and `both`, the reminder or the answer cue is the package's request for its run. The harness maps it to the goal request before the handler runs, so the handler judges against the goal request, keeps the goal's judgments, and never asks about the follow-up message. A follow-up opens no exchange under either `--unit`, so the follow-up message sits in the request's exchange, which is always kept, and under `--finished drop` a later goal hides it with the rest of that exchange. A `stock` or `plain` state renders the whole view, which grew by the first run's messages and the follow-up message, so the follow-up run asks every question again; a `bounded` state reuses each answer whose rendered window is unchanged.

The reply is scored the same way under both designs. Under `terminal`, `tools ok` drops `send_reply` from each goal's tools, because no design path can call it.

The `--probe-reply` probe runs the following cases on g02, each against its expected route, reply, turn count, run count, and advertised tools per run:

- Under `terminal`: an answer on the first run; empty content, then an answer under the answer scope after the answer cue; empty content twice; 8 tool-call turns that exhaust the limit, then an answer under the answer scope, once without text on those turns and once with text on every turn; a run the agent aborts after a turn with text, which gets no follow-up; the same lookup twice, then an answer, where the second call gets the terminal notice; two lookups with different arguments, then an answer, where neither is a repeat; a stray `send_reply` call, then an answer; and an overflow on the first call.
- Under `tool`: `send_reply` on the first run; the same lookup twice, then `send_reply`, where the second call gets the tool notice; text, then `send_reply` after the reminder; a leading label twice, delivered without the label and quotes; a label after a preamble twice, delivered verbatim; text, then an empty natural end after the reminder, which delivers the first run's text; text, then an overflow on the reminder run, which records `followError`, delivers the first run's text, and scores `success` the same as `ok any`; 8 tool-call turns with text that exhaust the limit, which get no reminder; a run the agent aborts after a turn with text, which gets no reminder; an empty natural end; and an overflow on the first call.
- Under `terminal` with think on, as the later section on thinking mode describes: thinking with a lookup, then thinking and an answer; and thinking that spends `num_predict` with no content, then an answer under the answer scope. Each case checks that every request but the answer run's asks for thinking with `num_predict` 1024, that the answer-scope request in the second case sends `think` false with `num_predict` 1024 and logs `think` false with no thinking tally, that no request message carries a `thinking` field or the thinking text, the per-call thinking lengths, and the `cut` count.
- With a stub judge that answers every needed question at the drop cut, once per `--unit`: under `tool`, text, then `send_reply` after the reminder; under `terminal`, empty content, then an answer under the answer scope. Each case checks that the first run's prompt holds the system text and the request, that the follow-up run's prompt adds only the first run's message and the follow-up message, and that every needed question names the goal request.

Every case fails when a request carries options other than the pinned ones, which add `num_predict` from `--think-predict` (default 1024) under think on. The repeat cases fail when the first lookup gets anything but its canned result, which also shows that the answered calls reset with each goal, or when the second gets anything but the design's notice. The probe's text-bearing and abort cases fail when a route reads the joined content of an exhausted or aborted run in place of a natural end, the empty-after-reminder case fails when the fallback reads the last run in place of the last non-empty content, the reminder-overflow case fails when a follow-up error goes unrecorded, and the selection cases under `terminal` fail when the answer run has no user message to select on: that answer run's prompt then holds 51 messages.

## Thinking mode

The `--think` flag asks the agent model for a thinking pass, so you can measure whether thinking changes the replies. Under it, every agent call sends `think: true` and adds `num_predict` from `--think-predict` (default 1024) to its options, except the answer run that follows the answer cue under `--reply terminal`, which sends `think: false` and keeps `num_predict`. A thinking model asked for a reply with no tools might end its turn inside its reasoning or think to the cap with no content, so the answer run runs with thinking off. The reminder run of `--reply tool` keeps thinking. The cap bounds thinking and content together, so a call that thinks without end still returns. The log entry of an answer-run call carries `think` false and no thinking tally, so the `thinking` and `cut` totals count the other calls. Summarizer, judge, calibration, and `--probe-tool-name` calls send `think: false` and no `num_predict`. Without the flag, every request body matches the body before the flag existed.

Thinking text never reaches a later request. The harness provider returns the streamed `thinking` apart from the content; the package adds an assistant message with only its content and tool calls to the conversation; and `mapMessages` sends only `role`, `content`, `tool_calls`, and `tool_name`. The think cases of `--probe-reply` check that no request message carries a `thinking` field or the thinking text.

A run whose final turn has empty content after thinking ends naturally with empty content, so under `--reply terminal` it gets the answer cue and the answer-scope run with thinking off, as the earlier section on reply designs describes; under `--reply tool` it ends with no reply, as any empty natural end does.

The done record carries no separate thinking count, so each agent call records `thinking`, the length of its thinking text in characters, beside `completion`, the done record's `eval_count`. A call is `cut` when it ended truncated, as the truncated column defines, with no content and no tool call: its generation went to thinking. The JSON line sums both over the goal's agent calls, and the summary line ends with the cut calls over all agent calls and the summed thinking characters.

## Selection states

The `--state` flag sets the state the judge reads for each question. Every state marks the subject `[A]` and the request `[B]`, and appends the request when a compaction folded it out of the view:

- `stock` is the package's `renderSelectionState`: one JSON object per view message, so each question carries the whole view.
- `plain` renders the whole view as one line per message, `[A][B] role: content`, with a marker only where it applies. A newline inside content becomes a space. An assistant message with tool calls is followed by one line per call, `call NAME(ARGUMENTS)`, where `NAME` is the tool name and `ARGUMENTS` the arguments as JSON.
- `bounded` opens with the line `Messages [A] and [B] are from a longer conversation; other messages are omitted.` and then renders, as `plain` does, only the `--neighbors` view messages before and after the subject, the subject, and the request, in view order. Each question costs about the same at every view length.

The harness handler repeats `createSelection` step by step: it removes judgments recorded for an earlier request, screens the view minus the request, resolves each judgment through `conversation.judgments.resolve` with the subject and request ids as ordered sources so an identical state reuses the recorded answer, asks `buildNeededQuestion` with the `--criterion` at `--threshold`, spends `--limit` on fresh questions only, and returns the same `Selection` shape with `messages`, `judgments`, `usage`, and `fault`. It differs from `createSelection` in the following ways:

- It keeps whole exchanges. A user message and every message after it up to the next user message form one exchange, and the messages before the first user message form one too. An exchange is dropped only when every member is a decisive no; one kept or undecided member keeps the whole exchange, and the request's exchange is always kept. `filterSelectionMessages` then applies its unique-owner rule to a tool result whose call sits in another exchange.
- A judge call that fails without an abort leaves its subject undecided, so the subject is kept, records the error in the goal's `faults` and `selectionErrors`, and the selection continues. The handler returns a `fault` only when every fresh question failed and no recorded answer was reused. An abort, including a `JudgeAbortError` from the ollama package's agent build, matched by name, still returns the whole view with a `fault`.

The state renderer is the only difference between `--state` values, so a difference between them measures the state.

## Exchange unit

Under `--unit exchange`, the harness handler judges exchanges instead of messages. It groups the view into exchanges: a user message and every message after it up to the next user message form one exchange, and the messages before the first user message join the first exchange. Only a user message opens an exchange, so an assistant message with calls and its tool results share one exchange. The request's exchange, that is the request and the work after it in the current goal, is never a subject and is always kept.

The handler asks one needed question per subject exchange, in view order or, with `--candidates newest`, from the end of the view, and spends `--limit` on fresh questions as the message unit does. The exchange state renders each question as follows:

- The subject exchange is the `[A]` block: one line per message, `role: content`, with the tool-call lines of `plain`, and `[A]` on the exchange's first line only. The request is the `[B]` line. A blank line separates exchanges, so the `[A]` block ends at the next blank line.
- `plain` renders every exchange of the view in order, the request's exchange included, with `[B]` on the request line.
- `bounded` opens with the line `Exchange [A] and message [B] are from a longer conversation; a blank line separates exchanges, and other messages are omitted.` and then renders the `--neighbors` exchanges before and after the subject exchange without markers, the subject exchange, and the request line alone. The request's exchange never counts as a neighbor.

The judgment key is `buildConditionKey('needed', LEADER, REQUEST)`, where `LEADER` is the id of the exchange's user message and `REQUEST` is the request id. The ordered sources are the exchange's message ids followed by the request id. A recorded judgment is reused while its question, sources, rendered state, and judge model match, that is while the exchange's messages, the rendered neighbors, and the request are unchanged; a judgment recorded for an earlier request is removed, as in the message unit.

The decision drops the whole exchange when its `p` is at most the drop cut and keeps it otherwise; a refusal, a failed call, and an exchange that `--limit` left unasked keep it. `filterSelectionMessages` then removes the members of every dropped exchange. A failed judge call and an abort behave as in the message unit.

With `--finished drop`, an exchange led by a request the harness posed for an earlier goal leaves the view and every judge state without a question; its messages stay in the record, so `search_history` finds them. With `--finished judge`, such an exchange is a subject like any other.

## Drop cut

A selection drops a subject when its yes probability is at most the drop cut, `(1000 - round(1000 × threshold)) / 1000`, that is 1 minus `--threshold` computed in integer thousandths. The live selection of both units, the `margin` of every record, the `--probe-judge-drift` flips, and the calibration tables read the same cut, so a `p` of exactly 0.1 at threshold 0.9 is dropped in each. Plain `1 - 0.9` is 0.09999999999999998 in binary floating point and would keep that `p`. A `--threshold` that is not a multiple of 0.001 exits with status 2.

## Correction chaining

With `--chain corrections`, the selection of either unit runs a chaining step after its needed decisions. The step asks two more questions through `conversation.judgments.resolve`, each reused while its question, sources, state, and judge match:

- The correction question, `Does this message correct, replace, or withdraw a value, rule, or decision an earlier message stated?`, is a noul over the message alone in the `plain` form, without markers. Its key is `["correction", ID]`, where `ID` is the message id, and its source is that id. The key holds no request, and `parseConditionKey` reads `needed` keys only, so the cleanup of judgments recorded for an earlier request leaves it, and each message is asked once for the life of the conversation. The step asks it only about an unkept message after the first kept one.
- The amends question, `Does the later message replace or withdraw what the earlier message states?`, is a noul over the 2 messages in the `plain` form, under the lines `Earlier message:` and `Later message:`. Its key is `["amends", EARLIER, LATER]` with both ids as ordered sources, so each pair is asked once.

A correction is a message whose correction answer is at or above `--threshold`. For each correction in view order, the step looks for an earlier kept message, under the exchange unit a member of a kept exchange, and chains the correction to the first one that qualifies by either of the following tests:

- The 2 messages share an id-shaped token in their content or tool-call arguments, as the later section on the summarizer guard defines it, dates excluded.
- Neither message carries such a token, and the amends answer for the pair is at or above `--threshold`.

A chained correction is kept: under the message unit it loses its drop decision, so `selectExchanges` keeps its whole exchange; under the exchange unit its exchange is kept. The step repeats until no correction chains, so a correction of a chained correction chains too. The request's exchange and, under `--finished drop`, an earlier goal's hidden exchange take no part. `--limit` caps the needed questions only. A failed chain question leaves its message unchained and records the error as a failed needed question does; an abort faults the selection as it does in either unit. The chain questions stay out of the selection's `judgments` and `usage`, so `asked` and the mean judge prompt keep their meaning; the `chain` record carries their usage.

With `--chain none`, the selection skips the step, sets no `chain` field, and adds no clause to the summary line, so a run compares with the earlier arms.

The `--probe-chain` probe replays the needed answers that the first g03 selection of `results/v4/selection/selection.jsonl` records, at `--threshold`, through a stub judge: under the message unit each subject gets its recorded `p`, and under the exchange unit each exchange gets the largest recorded `p` among its members; a subject with nothing recorded gets 0.5. The stub answers the correction question yes for the scenario's `correction` and `withdrawal` messages, and the amends question yes for the fee rule (seeds 4 and 5) against its withdrawal (seeds 44 and 45). Pass 1 appends the g03 request and pass 2 the g04 request to one conversation, so pass 2 reuses a chain answer only when the answer outlives its request. The probe fails when the message unit under `--chain none` does not reproduce the recorded dropped seeds, when a chained run drops seed 44 or 45, or when pass 2 asks a fresh chain question.

## Summarizer guard

Every summarize call, a fold or a cap merge, runs through the identifier guard. An identifier is an id-shaped token: letters and digits joined by hyphens, with at least one digit, compared case-insensitively. A date-shaped token, `YYYY-MM-DD`, is never an identifier, because the summarizer system message requires absolute dates. The input's identifiers are the ones in the content and the serialized tool-call arguments of the messages the call summarizes; for a merge, those messages are the merged sections' summaries. A call's sources are its input for a fold and the messages the merged sections folded for a merge. Neither summary instruction names `No facts.`; the guard writes it when a summary stays empty.

The guard checks each call in the following order:

1. The invented check reads the summary against the allowed set: the input's identifiers and the identifiers of the summarizer system message. A summary that carries an identifier outside the set is retried once with the input's identifiers named; each sentence of the retry that still carries one is dropped, and a summary left empty becomes `No facts.`.
2. The loss check reads the summary against the input's identifiers. A summary that lacks one is retried once with an instruction that names the missing identifiers, and the retry passes the invented check's sentence filter. An empty summary or `No facts.` over an input that holds an identifier, or over sources that hold a user message or a `lookup_order` or `lookup_customer` result, counts as such a failure; a merge reads its merged sections' messages, because its input is their summaries, and its retry instruction also states that the messages hold facts, and identifiers when the input holds one. The guard keeps the retry when it lacks fewer of the input's identifiers than the summary it retries, or as many when the first summary was empty and the retry is not; otherwise the first summary stays.
3. Each identifier still missing is restored by the last sentence of a user message or lookup result of the sources that holds it, appended verbatim on its own line; a sentence that holds several missing identifiers appears once, and the sentences keep their source order. A sentence ends at `.`, `!`, or `?` followed by whitespace, or at a line break. An assistant message, its tool-call arguments included, holds the model's own words, which can carry a wrong answer, and so does a `search_history` result, which quotes earlier messages as `role: content` lines, so the guard never restores from either, and an identifier that only those messages state stays out of the summary. A `send_reply` result states nothing. The guard reads a result's tool name from its call, which the harness records when the tool runs. The sentences replace an empty summary or `No facts.`. No summary loses an identifier that a user message or lookup result of its sources states, and no summary carries a bare identifier list.

A call that triggers both checks makes 3 summarizer calls. The harness tells a merge from a fold by its input: a merge hands the summarizer one summary message per merged section, keyed by the section id.

## Metrics

Each JSON line holds one goal. The table shows the following columns:

| Column | Meaning |
| --- | --- |
| goal | The scenario goal id. |
| success | `yes` when the goal has a non-empty reply, as the earlier section on reply designs defines it, that holds every expected substring, at least one `expectedAny` substring when the goal lists them, no forbidden substring, and no match for a forbidden pattern, case-insensitively, and the first run did not throw. A follow-up run that throws leaves the reply its design falls back to, and that reply is scored like any other. `(overflow)` marks a goal where the daemon refused a call for exceeding `--ctx`, so the model never saw that call's prompt; an earlier call of the goal can have carried the request; `(partial)` marks a cancelled or limit-exhausted last run other than the reply abort, and `(error)` marks another thrown run, the follow-up run included. |
| answer | The earlier answer route, kept for readers of earlier records: `reply` when the model called `send_reply`, `content` when the last run's final assistant content holds text, and `none` when neither holds. |
| `reply via` | How the scored reply arrived: `final` (under `terminal`, the first run's final message), `answered` (under `terminal`, the answer-scope run), `tool` (`send_reply` on the first run), `reminded` (`send_reply` after the reminder), `content` (under `tool`, the plain text the harness delivered), or `none`. |
| ok any | `yes` when the answer passes the same checks as `success` from either route: every expected substring, an `expectedAny` substring, no forbidden substring or pattern, and no throw. `(overflow)` marks a refused goal, as in `success`. |
| turns | The agent provider calls in the goal. |
| repeats | The lookup and search calls the goal answered with the repeat notice, as the earlier section on reply designs describes. |
| max prompt tokens | The largest prompt an agent call in the goal carried: the `prompt_eval_count` the daemon reported, or, for a call it refused, the prompt tokens the refusal names. |
| overflow | The agent and summarizer calls the daemon refused because the prompt exceeded `--ctx`. |
| truncated | The calls whose prompt plus completion reached `--ctx` minus 64 tokens or that ended with `done_reason` `length`; such a call ran out of context while generating. |
| faults | The agent `fault` events: a failed selection or a failed summary. |
| judge calls | The HTTP requests the judge sent during the goal, ok or not; the JSON line splits them into `judgeOk` and `judgeErrors`. |
| selection/view | The messages the last selection kept over the view it selected from; `-` when no selection ran. |
| asked/screened | The judgments the last selection made over the view messages it could ask about; under `--unit exchange`, the exchange judgments over the subject exchanges, so a goal's questions are its exchange count. `(judge over ctx)` marks a goal where the mean judge prompt per judgment reached `--judge-ctx`. |
| wall s | The goal's wall-clock seconds, judge and summarizer included. In `selection` and `both`, the daemon can swap the agent and judge models during a goal, so read this as an upper bound. |
| in prompt | `yes` when the content of the first agent call's messages holds the content of every seed message the goal's facts name as a substring; a recap that paraphrases a fact does not count. It measures what the model holds verbatim without searching. |
| tools ok | `yes` when the model called every tool the goal lists, such as `send_reply`. When `in prompt` is `yes`, `search_history` is not required; under `--reply terminal`, `send_reply` is not required. |
| summaries | The summarizer calls during the goal; a compaction makes 1 and a merge under `--sections` 1 more, and each guard retry adds 1, as the earlier section on the summarizer guard describes. The rollup is off, so it makes none. |
| sections | The conversation's compacted sections after the goal. Pass `--sections N` to cap the compacted history (the conversation manager's `sections` option, which collapses on overflow); unset, sections grow without bound. |
| view | The messages in the conversation view after the goal. |

The line after the title gives the settings, which open with the mode, the scenario file, the agent model, and `think on` or `think off`, name the summarizer model in `compaction` and `both`, carry the sampler options and end with the `--reply` value and the advertised tool-schema estimate as `tools N` in every mode, followed in `compaction` and `both` by the window's tool estimate as `(window N)`, then the pass counts, the reply skips (goals whose `reply via` is `content`), the count of goals per `reply via` value, the repeated calls of all goals, the selection faults (judge errors on single subjects plus whole-selection faults), the ok and failed judge HTTP requests, under `--think` the cut agent calls and the thinking characters, and in `compaction` and `both` the messages each seed fold took and the messages each goal fold took. Under `--unit exchange`, the settings on that line name `unit exchange` with the `--finished` value, and a bounded state's neighbors read as exchanges.

The JSON line adds the per-call log (`label`, the agent run within the goal as `run`, 1 or 2, or 0 for a call outside a goal run, message count, `ids`, the advertised tool count `tools`, `estimate` including `toolEstimate`, the SHA-256 `hash` of the request body, the SHA-256 `replyHash` of the reply, `prompt`, `completion`, `done_reason`, milliseconds, the done record's `load_duration`, `prompt_eval_duration`, and `eval_duration` in nanoseconds and its `prompt_eval_cached_count` when the daemon reports one, truncation flag, overflow flag, HTTP status, the prompt tokens a refused call requested, and, for an agent call under `--think`, `thinking` and `cut` as the earlier section on thinking mode defines them); the `estimate` of a run before 2026-10-08 excludes the tool definitions, the summed completion tokens, the result `usage` (agent calls plus judge usage), each `select` receipt with its asked and screened counts, usage, mean judge prompt per judgment, and fault, every `fault` and `deny` event, each tool call with its arguments, the reply, the `missing` expected and the `violations` forbidden substrings, and the `partial`, `exhausted`, `aborted`, and `error` outcomes.

The `reply` field holds the delivered reply of the earlier section on reply designs. The `content` field holds the content the last settled run's agent result reports: the final turn's content on a natural end, and every turn's content joined on an abort or an exhaustion. It never counts toward success; `contents` lists each agent call's content in order. The `turns`, `wall`, and `usage` fields span every run of the goal.

The JSON line also carries the following fields:

| Field | Meaning |
| --- | --- |
| `scenario` | The absolute path of the `--scenario` file. |
| `model`, `think` | The agent model, and `true` when the goal's agent calls asked for thinking. |
| `thinking`, `cut` | Under `--think`: the summed thinking characters of the goal's agent calls, and the agent calls that were cut. Absent otherwise. |
| `state`, `neighbors`, `candidates` | The selection settings of a `selection` or `both` run; `neighbors` only for `bounded`. |
| `unit`, `finished` | In a `selection` or `both` run under `--unit exchange`: `exchange` and the `--finished` value. Absent under `--unit message`. |
| `chain` | In a `selection` or `both` run under `--chain corrections`: `corrections`. Absent under `--chain none`. |
| `guard` | The summarizer guard's deltas for the goal's own summarize calls: `retried` (the guard retries, invented and loss together), `filtered` (the calls that dropped a sentence), `empty` (the calls whose summary was empty or `No facts.` over identifiers or a user message or lookup result), `lost` (the calls with identifiers still missing after the retries, restored or not), and `calls`, one `{ kind, messages, retried, rejected, dropped, missing, kept, lost, restored }` entry per summarize call. In an entry, `kind` is `fold` or `merge`, `messages` the input count, `retried` the retry reasons in order (`invented`, then `lost` or `empty`), `rejected` the invented identifiers of the first summary, `dropped` the sentences the filter removed, `missing` the identifiers the summary lacked before the loss retry, `kept` `first` or `retry` after a loss retry, `lost` the identifiers still missing after it, and `restored` the sentences appended for them. A record from a run before the 2026-10-08 fixes carries `lost` as the identifiers on an appended `Identifiers:` line and no `empty`, `kept`, or `restored`; a record under `results/v4` carries cumulative `{ retried, filtered, dropped }` counters instead. |
| `search` | The `--search` value. |
| `design` | The `--reply` value. |
| `replyVia` | The `reply via` column. |
| `runs` | The agent runs in the goal: 1, or 2 with a follow-up. |
| `followup` | `answer` or `reminder` when a follow-up run ran; absent otherwise. |
| `followError` | The error of a follow-up run that threw; absent otherwise. The first run's error stays in `error`. |
| `replied` | `true` when the model called `send_reply`, under either design. |
| `repeats`, `tools[].repeat` | The calls the goal answered with the repeat notice, and `true` on each such call. |
| `patternViolations` | The forbidden pattern sources the reply matches; any entry fails `success`. |
| `answer` | The `send_reply` text when `send_reply` was called, else the `content` field, else an empty string. |
| `answerVia` | `reply`, `content`, or `none`, as in the `answer` column. |
| `answerMissing`, `answerViolations` | The expected substrings the answer lacks, and the forbidden substrings and pattern sources it holds. |
| `successAnswer` | The `ok any` verdict. |
| `sectionsHeld` | The sections the conversation holds after the goal, each as `{ id, summary, messages }`, where `messages` counts the folded originals. The older `sections` field keeps the count. |
| `rollup` | The conversation rollup summary after the goal; absent before the first compaction. |
| `selections` | One entry per `select` event: the fields of the matching `selects` entry, plus `kept` (the message ids the selection kept, in prompt order), `dropped` (the view ids it left out), `droppedSeed` (the seed indices among them), and `judgments`, one `{ subject, seed, p, margin }` per judgment the selection rests on, where `p` is the judge's yes probability from the recorded answer and `margin` is `p` minus the drop cut of 1 minus `--threshold` (at or under 0 is a decisive no), or `{ subject, seed, refusal }` for a refused question. `seed` is present only when the subject is a seed message. Under `--unit exchange`, each `judgments` entry is one exchange's judgment, with the leader as `subject` and the leader's seed index as `seed`, and `kept`, `dropped`, and `droppedSeed` stay message ids and seed indices derived from the exchange decisions, so a reader of message-unit records reads them unchanged. |
| `selections[].unit`, `selections[].exchanges` | Under `--unit exchange`: `exchange`, and one `{ leader, members, seed, finished, p, margin, refusal, kept }` entry per exchange outside the request's, in view order. `leader` is the leader message id, `members` the message count, `seed` the first and last seed index when the exchange holds seed messages, `finished` the goal id of an earlier goal's exchange, `p` and `margin` as in `judgments` when a judgment matching the question's state holds a probability, `refusal` when it holds a refusal, and `kept` the decision. |
| `selections[].chain` | Under `--chain corrections`: `asked`, one `{ head, sources, seeds, reused, p }` entry per chain question the selection rests on, with `refusal` or `error` in place of `p` when the judge gave no probability; `chained`, one `{ id, seed, from, fromSeed, by, shared, kept, keptSeeds }` entry per chained correction; and `usage`, the summed usage of the fresh chain questions. `head` is `correction` or `amends`, `seeds` maps `sources` to seed indices, `from` is the kept message the correction chains to, `by` is `id` or `amends`, `shared` lists the shared identifiers for `id`, and `kept` lists the message ids the chaining kept. A seed field holds `null` for a message outside the seed. |
| `selections[].finishedDropped` | Under `--unit exchange`: one `{ leader, goal }` entry per earlier goal's exchange that `--finished drop` removed; empty under `--finished judge`. |
| `judgeOk`, `judgeErrors`, `judgeLog` | The judge HTTP requests that returned an ok status, the ones that failed or threw, and one `{ ms, status, ok, prompt_eval_count, hash }` entry per request, with `error` when it threw. |
| `selectionErrors`, `selectionFaults` | One `{ subject, seed, error }` entry per judge error the selection survived, and the count of those errors plus whole-selection faults. |
| `contents` | Each agent call's assistant content, in order. |
| `folds`, `merges` | The messages each compaction during the goal folded, and the messages each merge under `--sections` combined. |
| `progressive`, `seedFolds`, `seedFaults` | In `compaction` and `both`: the `--progressive` value, one `{ messages, calls, guard }` entry per fold while the seed loaded, with the summarizer call records and the guard deltas in the shape of the `guard` field, and the summarizer errors that stopped seed folding. |

A goal in `scenario.json` can carry `forbiddenPatterns`, an array of JavaScript regular expression sources the harness tests case-insensitively against the reply and the answer, and `expectedAny`, a list of which any one entry satisfies the goal. An `expectedAny` entry matches as a whole word or phrase, between characters that are neither letters nor digits, because verdict words such as `no` and `yes` occur inside other words; `expected` and `forbidden` entries match as substrings. The scenario notes record which goals carry them and why, as changes (4) and (6), and the later section on the 2026-10-08 fixes records the changes after them. `bench.mjs` and `rescore.mjs` share the scoring through the `compileRules`, `scoreText`, and `plainText` functions that `rescore.mjs` exports.

Every check reads a copy of the text without the markdown that only styles it: `plainText` removes table separator rows, heading marks, and a list bullet or number at the start of a line, removes every `*` and backtick and each `_` at a word edge, writes the typographic single quotes `‘` and `’` as `'`, turns each line holding a pipe into a table row that starts and ends with `¦` and has `¦` between its cells, collapses runs of spaces and tabs, and trims each line. The record keeps the original text. Without that copy, `not **ESC-2291**` fails a correct g04 reply and `by **Friday**` passes a wrong g07 reply.

The `¦` separator is neither whitespace, a word character, nor a period, so a pattern's `\s+` or word chain stops at a cell or row edge as it stops at a pipe in the raw text, and a `[^.\n]*` clause crosses it as it crosses a pipe. Were cells joined by spaces, the header `Superseded` would sit before the first data cell and negate ESC-2291 in a g04 table that names it the current ticket. A pattern that reads a label and its value, such as `Deadline: Friday`, accepts `¦` where it accepts a colon.

## Rescore recorded runs

The `rescore.mjs` script reads no daemon. It takes one or more result jsonl paths, re-scores every goal line with the rules in `scenario.json` (`expected`, `expectedAny`, `forbidden`, and `forbiddenPatterns`, on the reply and on the answer), and prints a table per file with the goal, old and new `success`, old and new `ok any`, and the reasons a goal fails, followed by the pass counts. A reason names a pattern by its position in the goal's `forbiddenPatterns`. A line with no goal reply, such as a calibration row, is skipped and counted. A run recorded before the answer route existed has no old `ok any`, shown as `-`.

A line with `replyVia` scores the reply its design delivered, as `bench.mjs` does, so a `terminal` row rescores like a `tool` row; an older line without `replyVia` scores only a `send_reply` reply, from its `replied` field.

The script writes `FILE.rescored.jsonl` beside each input, where `FILE` is the input path. Each written line keeps the recorded fields, replaces the scoring fields, and adds `rescore` with the old `success`, the old `successAnswer`, and the SHA-256 of `scenario.json`. Pass `--out DIR` to write the files under `DIR` instead, at the input's path relative to the working directory; every input must then sit under the working directory.

## Calibration

The `--calibrate` flag measures how the judge separates the messages a goal needs from the ones it does not, before a selection run spends agent time. For each of the first `--goals` goals, the harness builds a fresh conversation from the seed, appends the goal's request as message `[B]`, and asks the needed question about every seed message as `[A]`, rendered by the `--state` renderer, one question at a time. Each answer goes to `calibration.jsonl` under `--out` as one row with the following fields:

| Field | Meaning |
| --- | --- |
| `goal`, `index` | The goal id and the zero-based seed index of the subject. |
| `kind`, `role` | The seed message's scenario kind and role. |
| `p` or `refusal` | The judge's yes probability, or its refusal; `error` replaces both when the question failed. |
| `mustKeep` | `true` for the goal's `facts` indices and the correction or withdrawal that governs them with its acknowledgment: 44 and 45 for g01, 27 and 28 for g04, and 29 and 30 for g05. |
| `mustDrop` | `true` for a `distractor` or `chatter` message. |
| `judgePrompt` | The judge prompt tokens for the question. |
| `ms` | The milliseconds the question took. |

After the rows, the harness writes `calibration.md` and prints it. For each goal, and over all goals when there are several, a table gives the keep rate over the `mustKeep` rows and the drop rate over the `mustDrop` rows at every threshold from 0.50 to 0.95 in steps of 0.05. A message counts as kept when its `p` is above the drop cut of the earlier section, or when the judge gave no answer, as in a live selection. A line after each table gives the mean and largest judge prompt tokens, the refused or failed questions, and the judge wall time. Pick the `--threshold` for a selection run from the row whose keep rate is 100 percent with the highest drop rate.

Under `--unit exchange`, every seed exchange is a subject for each goal, rendered by the exchange state, and the request's exchange holds the request alone. Each row describes one exchange: `index` is the seed index of its leader, `range` its first and last seed indices, `members` its message count, and `kinds` the scenario kind of each member. An exchange is `mustKeep` when it holds a goal fact or a governing index from the preceding table, and `mustDrop` when every member is a `distractor` or `chatter` message. The tables keep their columns, and each cell gives the share over exchanges, then the share over the messages those exchanges carry: the keep rate over the must-keep exchanges, the drop rate over the must-drop exchanges, and the kept share over all judged exchanges.

## Known limits

- The `tev1:0.8b` model carries `num_ctx 2050` in its Modelfile, and the System One endpoint refuses a longer prompt with HTTP 400 without truncating it. The `stock` and `plain` states render the whole view, which exceeds that limit from the first goal, so every `tev1` selection faults and the lenient run builds from the unfiltered view. The default `--judge mica` measures selection on this scenario.
- The window estimate runs under the qwen token count. Fitted over the v2 runs recorded on 2026-10-08 (none-words, c-tuned-s3, c-generic-s3, c-tuned-s4, selection-tuned, and both-tuned), the ratio of `prompt_eval_count` to the estimate with the 305-unit tool estimate those runs carried added is 1.16 to 1.42 for agent calls (1.16 to 1.32 in the compaction runs), against 1.40 to 2.20 without it, and 1.09 to 1.30 for summarizer calls. Set `--window` with that gap in mind.

## Changes on 2026-10-08

The following changes land together and change the prompts of every arm, so runs before and after them do not compare:

- Selection keeps whole exchanges, survives a failed judge call, and records each decision's `margin`; every `--state` runs through the harness handler.
- The window adds the tool-definition estimate.
- Each tool message carries `tool_name`, the name of the call it answers: by call id in the request, else by any call the harness sent or seeded, else by its position after the last assistant message with calls. The assistant `tool_calls` and every other field are unchanged.
- The summarizer receives a leading system message that states the scenario date, read from the first seed message, and requires relative times as absolute dates with their meaning: `You summarize a support-desk conversation that took place on Thursday 2026-10-08. Write every relative time as an absolute date with its meaning: for example, "off tomorrow" becomes "off on Friday 2026-10-09; requests must reach him on Thursday 2026-10-08".` The `tuned` instruction requires the same and forbids next steps and advice. `--progressive` folds while the seed loads.
- The system text in `scenario.json` states the date and that earlier messages can be omitted and condensed into a recap, as scenario change (5).
- `search_history` with `--search words` matches whole words and returns the newest hits first.
- Forbidden values in g01, g04, and g05 became adjacent-word patterns, g07 and g10 forbid a Friday deadline or callback, and g08 requires a verdict through `expectedAny` and forbids an over-limit verdict, as scenario change (6).
- The records gain the request hash, tool count, ids, durations, judge log, per-turn content, and the counts on the summary line, and `in prompt` reads the first call's message content.

## Changes with the reply designs

The following changes land with `--reply`. A record that carries `replyVia` comes from a run after them:

- The `--reply` flag defaults to `terminal`, which changes the system text and the advertised tools of every arm; `--reply tool` keeps the earlier ones. Both designs add a follow-up run, as the earlier section on reply designs describes.
- The `lookup_order` and `lookup_customer` descriptions name no concrete id and describe the id as LH, a hyphen, then digits. The earlier descriptions gave `LH-12345` as an example, and the model looked that id up 6 times in the v4 `both` run.
- `search_history` with `--search words` ranks messages by the distinct query words they contain instead of requiring every word, so a multiword query with one rare word still finds its messages. Phrase search is unchanged.
- `success` reads the delivered reply under both designs, and a follow-up run that throws does not fail a goal whose fallback reply passes. The records gain `design`, `replyVia`, `runs`, `followup`, `followError`, and the per-call `run`; the table gains `reply via`, and the summary line gains the `reply via` counts and the `reply` and `tools` settings.
- The `reply skips` count on the summary line counts goals whose `replyVia` is `content`, where it counted goals whose `answerVia` was `content`. Under `--reply terminal` it is always 0, so it does not compare with a summary line from an earlier run.

## Fixes on 2026-10-08, after the v6 head-to-head

The following changes follow `results/v6/diag/DIAGNOSIS.md` and `results/v6/diag/COMPACTION.md`. They change the request bodies of every arm, so runs before and after them do not compare:

- Every agent and summarizer call sends `presence_penalty` 1.5, `top_k` 20, and `top_p` 0.95 beside `num_ctx`, `temperature`, and `seed`, as the later section on sampler options describes. `--temperature` and `--seed` set the other two.
- The compaction window adds the `--reply tool` tool estimate under both designs. Offline, with a stub summarizer at `--window 1600 --keep 6 --sections 3`, the first seed fold took 29 messages under `terminal` and 25 under `tool` before the fix, as in the v6 records, and 25 under both after it.
- The summarizer guard retries an empty or `No facts.` summary over identifiers, keeps a loss retry only when it loses fewer identifiers, and restores each lost identifier with its last input sentence in place of the `Identifiers:` line, as the earlier section on the summarizer guard describes.
- `search_history` drops a repeated text, bounds its result by a token budget as well as by count, and indexes `send_reply` text under `--reply tool`, as the earlier section on modes describes. The tool descriptions are unchanged.
- Both designs answer a repeated lookup or search with a fixed notice, as the earlier section on reply designs describes.
- `max prompt tokens` counts a refused call's requested prompt.
- The scorer reads a copy without markdown and matches `expectedAny` entries as whole words, as the earlier section on metrics describes, and `rescore.mjs` scores the delivered reply of a row with `replyVia`.
- The scenario scores the timing questions and the g03 sign-off, widens the g08 verdict, and lists the mandated lookups, as the following list records.

The scenario changes after its notes' change (6) are the following, each a member of a goal in `scenario.json`. The `notes` field is unchanged, so its trap (e), which calls the g07 and g10 timing questions unscored, and its list of lookup goals predate these changes:

- g10 gains `expectedAny` with the forms of the 2 pm time Sigrid's hours start at (seed 24): `2 pm`, `2pm`, `2:00 pm`, `2:00pm`, `2 p.m.`, `2:00 p.m.`, and `14:00`. Its `forbiddenPatterns` gain 2 patterns: `555-0142`, the decoy of trap (b), which the LH-31055 lookup gives as Ines Albrecht's direct line, unless `not`, `never`, `instead of`, `rather than`, `avoid`, `skip`, `don't`, or `do not` sits up to 4 words before it; and `before`, `by`, `until`, or `no later than` 2 pm, which states her start time as a deadline.
- g07 gains `expectedAny` with `today` and `2026-10-08`, the deadline seed 8 sets for the release request. Its `forbiddenPatterns` gain a pattern for `tomorrow` stated as the time to ask: `ask`, `reach`, `contact`, `call`, `message`, `email`, `ping`, `tell`, or `notify` followed within 3 words by `tomorrow`, unless one of those words is `today` or `tomorrow` follows `off`, `out`, `away`, `unavailable`, `absent`, `not`, `before`, or `than`; `by`, `until`, `no later than`, or `due` tomorrow, unless it follows `off`, `out`, `away`, `unavailable`, `absent`, or `leave`; and a deadline of tomorrow. A reply that says Tomasz is off tomorrow still passes.
- g03's `forbiddenPatterns` gain a pattern that matches when no clause ties Marcus to the sign-off. The tie takes one of 2 forms. In the first, Marcus, with his surname, a possessive, a parenthetical, an appositive between commas, or a dash, is followed by an optional `must`, `will`, `needs to`, `has to`, `is to`, `to`, `shall`, or `should` and then a word that starts with `sign` or `approv`. In the second, a sign-off, approval, or signature word, optionally followed by `required`, is followed by `:`, `¦`, `by`, or `from`, and Marcus follows within 2 words other than `and` or `or`. Seed 18 says Marcus signs off, so a reply that copies Marcus and leaves the sign-off to "the manager" fails, whether a period or a comma separates the two.
- g08's `expectedAny` adds affirmative verdict forms to `fits`, `within`, `enough`, `covers`, and `approve`: `does fit`, `yes`, `can afford`, `can proceed`, `can go`, `can put`, `can be put`, `can place`, `can be placed`, `can take`, `can cover`, `can accommodate`, `can approve`, and `can be approved`. The $3,000 reorder fits the $3,760 of available credit, so every negative verdict is wrong, and the list holds no negative form: a word such as `no` or `cannot` would pass a reply that gives the wrong verdict or none. A bare `can` is not a verdict, because a reply such as "who can be reached at the main switchboard" would then pass with no verdict. Its `forbiddenPatterns` gain 3 patterns that fail a negative verdict worded with an affirmative entry, such as `doesn't fit within`: `does not fit` and its contractions; `cannot` or `can't` followed by a verb of approving, fitting, or placing the order; and a `No` that opens the reply or a table cell, or follows a colon, a question mark, or a line break, and ends its clause or cell.
- The system text requires `lookup_order` or `lookup_customer` when a request concerns an order id or account number from the conversation. A goal's request concerns one when the work is on an order or account whose id the seed states, so `goal.tools` gains `lookup_order` in g01 and g05 (the mixer order LH-79215, seed 40), g03 (Grace's order LH-77302, seed 13), g07 (the Halvorsen order LH-80941, seed 22), and g09 (Kenji's order LH-81660, seed 11). g02, g06, and g08 already listed their lookups. g04 asks for a ticket number and g10 for Sigrid's phone number, so neither gains one. `tools ok` reports the lookups beside `success` and does not change it.

Rescored with these rules, the four v6 head-to-head files pass 5 (`ab-none-terminal`), 5 (`ab-none-tool`), 5 (`ab-comp-terminal`), and 2 (`ab-comp-tool`) of 10, against the recorded 5, 6, 7, and 3. The scorer reads every hand verdict of `DIAGNOSIS.md` section 3 strictly except `ab-comp-terminal` g04, which it passes: no rule scores a reply that re-sends an earlier note after the right ticket.

## Changes on 2026-10-09, before Round B

The following changes follow the Round A grades in `results/v7/GRADES-none-6144.md`, `GRADES-compaction.md`, `GRADES-both.md`, and `GRADES-ledger.md`. At the default flags they leave every `none` request body unchanged; they change the summarizer requests of `compaction` and `both`:

- Neither summary instruction offers `No facts.`, and the guard retries an empty or `No facts.` summary whose sources hold a user message or lookup result, a merge included, as the earlier section on the summarizer guard describes. Round A folds of id-free rules (the fee withdrawal, the delivery-date rule, Tomasz's release role, Sigrid's extension) returned `No facts.` with no retry.
- The guard restores a lost identifier only from a user message or lookup result of its sources, never from an assistant message or a `search_history` result, which quotes the model's replies. Round A restores from the model's own replies carried "Manager approval code MX-4471 is required" and "Account manager Ines Albrecht (phone: 555-0142)" into later summaries.
- `--think`, `--model`, and `--summary-model`, as the earlier sections on flags and thinking mode describe. The records gain `model` and `think`, and the settings line names the agent model and the think setting.
- g08's `expectedAny` adds `sufficient` and `would be approved`. Its `forbiddenPatterns` gain 2 patterns for their negations: `not`, `never`, `no longer`, `hardly`, `no`, `nor`, `without`, `lack`, `lacks`, `lacking`, `lack of`, `short of`, `fall short`, `falls short`, or a word ending in `n't`, with an optional `be`, up to 1 word before `sufficient`, or `insufficient`; and `would`, `will`, `could`, or `should` with `not` or `n't`, `won't`, or `never`, before `be approved`.
- g05's MX-4471 pattern skips a retirement phrase: `previous` or `prior` before the code, an optional `approval code`, `code`, `ticket`, or `number` between a retirement word and the code, a retirement phrase after it (`dead`, `retired`, `expired`, `withdrawn`, `scrapped`, `invalid`, `obsolete`, or `no longer valid`, `applies`, `in use`, `used`, `active`, or `current`, each with an optional `is`, `was`, `has been`, or `had been`), `replaced` or `superseded` after it only with such an auxiliary or followed by `by`, and a parenthesis after it that retires the code: one that opens with `replaced by` or `superseded by`, or with a retirement word that no other code follows within 2 words, so "MX-4471 (previous code MX-4486 is no longer valid)" and "MX-4471 (replaced MX-4486)" still fail. "MX-4471 replaced MX-4486" states MX-4471 as current, so it still fails.
- g03's `forbiddenPatterns` gain the same pattern for ESC-2291 and for MX-4471, so a reply that gives the superseded ticket or the dead code as current fails.
- g07's bare `Friday, October 9` alternative skips a day-off phrase with up to 3 words between `off`, `out`, `away`, `unavailable`, `absent`, or `leave` and `tomorrow (`, each of them `work`, `sick`, `of`, `the`, `office`, `from`, `on`, `leave`, `for`, `all`, `day`, or `duty`, as in "off work tomorrow (Friday, October 9th)", so "out today so release tomorrow (Friday, October 9th)" still fails. A deadline of Friday or tomorrow still fails through the other alternatives. g07 also gains a pattern that fails a reply holding `today` only in a day-off phrase (`unavailable` or `absent` before it, `on leave`, or `off`, `out`, or `away` after a form of `be` or a `'s`, optionally followed by `work`, `sick`, or `of the office`) and no `2026-10-08`, as in "he is unavailable today". g10's copy of the Friday pattern is unchanged.

Rescored with these rules into `results/v7/prepwork/fix/rescored/`, the Round A files pass 5 (`none-6144`), 4 (`compaction`), 3 (`both`), and 7 (`ledger`) of 10, against the recorded 5, 4, 4, and 5. The `compaction` g07 reply fails on the day-off pattern: its only `today` is in "unavailable today", so it gives no deadline, as the rubric reads it.

## Sampler options

Every agent and summarizer call sends the options `num_ctx` (`--ctx`), `temperature` (`--temperature`, default 0), `seed` (`--seed`, default 7), `presence_penalty` 1.5, `top_k` 20, and `top_p` 0.95. The last 3 are the values of the agent model's params blob, `sha256-9371364b`, which the daemon applied when a request omitted them, so a run at the defaults samples as the v6 runs did and its request states every value. Under `--think`, agent calls add `num_predict` from `--think-predict` (default 1024). The settings line of `MODE.md` prints them.

## Wire facts

The following facts were measured against Ollama 0.40.0 at `http://127.0.0.1:11434` on 2026-10-08:

- The `qwen3.5:2b-q4_K_M` model has the template `{{ .Prompt }}` and renders through the built-in `qwen3.5` renderer and parser (`/api/show`). The `--probe-tool-name` run at 2026-10-08T18:38Z returned HTTP 200 for both requests and `prompt_eval_count` 122 with `tool_name` and 122 without, so the renderer ignores the field. The harness keeps sending it because it changes no token.
- A `none` run of 2 goals with `--dump` showed each agent body with the system text holding `Today is Thursday 2026-10-08.` and the omitted-history sentences, the 4 tools, and `tool_name` on every tool message. A `compaction` run of 2 goals at `--window 1600 --keep 6 --sections 3 --summary tuned` showed every summarize body opening with the summarizer system message; the seed loaded with one fold of 27 messages, and the g01 fold before its first turn took 16.
- The `--probe-judge-drift` run did not finish within its 10-minute bound because other runs shared the daemon: the questions took 9 to 54 seconds each against about 5 seconds alone, and pass 1 reached 30 of 48 questions. Those 30 answers, compared with the g01 judgments recorded in selection-tuned, both-tuned, and selection-keep, give the same p for seeds 15 to 29 in all 4 processes, and for seeds 0 to 14 a spread of up to 0.0996 (seed 4: 0.7177 against 0.8174 and 0.7926); seed 0 gave 0.6564, the selection-tuned value. None of the 30 crosses the 0.1 drop cut between processes. The in-process repeat is unmeasured.

## Changes on 2026-10-09, before the variant band

The following changes prepare the reworded-request runs that results/v8/ATTACK-BRIEFING.md plans, through fixes F4 and the `replyHash` record of F8:

- The LH-31055 lookup in `scenario.json` reads "Account manager Ines Albrecht, direct line 555-0142." in place of "Account manager Ines Albrecht; phone is the main switchboard 555-0142.", the same text the briefing harness's F4 sets. The number belongs to Ines Albrecht, so a g10 reply that dials it for Sigrid is wrong under any reading. The seed is unchanged, so the recorded judgments stay valid, and g08's `expected` `albrecht` still matches the lookup. The `notes` field is unchanged, so its trap (b) still calls the number the switchboard. The earlier text is in `scenario.json.pre-refine`.
- `--scenario PATH`, as the earlier section on flags describes.
- Every call record adds `replyHash` and `prompt_eval_cached_count` beside `hash`, `load_duration`, and `prompt_eval_duration`, as the earlier section on metrics describes. `replyHash` is the SHA-256 of `JSON.stringify({ content, calls })`, where `content` is the streamed content joined and `calls` lists each tool call as `{ name, arguments }` in order; thinking and the daemon's call ids are left out because neither reaches a later request. To prove a rerun reproduces, compare its jsonl with the reference call by call: the first equal `hash` with an unequal `replyHash` marks a daemon divergence, and the first unequal `hash` marks a harness or scenario divergence (results/v8/DIVERGENCE.md).

The code before these changes is in `bench.mjs.pre-refine`, and the README in `README.md.pre-refine`.

## Reworded variants

The `variants/` folder holds 8 copies of `scenario.json`, `v1.json` to `v8.json`, in which only the 10 goal requests are reworded: each asks the same thing about the same people, ids, and amounts in the words a shift lead might use. Run a variant with `--scenario`, one variant at a time and from a cold daemon:

```sh
node /home/user/agent/tmp/bench/bench.mjs --mode none --scenario /home/user/agent/tmp/bench/variants/v1.json --out OUT_DIR
```

`OUT_DIR` is a folder per variant and arm.

The briefing harness reads a `ledger` member and seed `truth` that `scenario.json` here lacks, so it runs the twin of each variant, `variants/ledger/v1.json` to `v8.json`. Each twin is `/home/user/agent/tmp/bench3/scenario.json` with the same 10 reworded requests, so request k of variant N is one string in both harnesses:

```sh
node /home/user/agent/tmp/bench3/bench.mjs --mode ledger --scenario /home/user/agent/tmp/bench/variants/ledger/v1.json --out OUT_DIR
```

Check the variants before a run with `node /home/user/agent/tmp/bench/variants/check.mjs`, which reads no daemon. It exits 0 when every variant passes and 1 otherwise, and you can pass variant files as arguments in place of the 16. A file with a `ledger` member compares with `/home/user/agent/tmp/bench3/scenario.json`, and any other with `scenario.json` here. Before it reads a variant, it edits the original requests in 7 ways that each break one of the following rules, and exits with status 2 when it accepts one of them. For each variant it checks the following:

- Every byte outside `goals[].request` equals its scenario file: putting the original requests back must give that file byte for byte, and the variant must be serialized as that file is.
- Each reworded request differs from the original and from the same goal's request in every other checked variant of the same harness.
- The two files of one variant carry the same 10 requests. With no argument every variant must have both files; with arguments only the pairs named are compared. The check refuses a twin pair whose g07 request differs and a briefing twin without its `ledger` member before it reads a file.
- Each id (such as `LH-31055`), number or amount (such as `$3,000`), and proper name of the original appears in the reworded request, and the reworded request adds none. A capitalized word counts as a name mid-sentence, or at a sentence start when the scenario uses it mid-sentence.
- The reworded request adds no rule word the original lacks, from groups that name a day or time, a before-or-after bound, a phone route, approval, authorization, sign-off, a code, a manager, copying, a correction, a fee, a return window, an arrival estimate, a rule, a limit, a tier, a ticket, an escalation, a carrier trace, a release, availability, an occasion, or a count; any form of a group the original uses is allowed.
- The reworded request adds no phrase of the goal's `expected`, `expectedAny`, or `forbidden` lists that the original lacks.

The script `results/v8/refinework/make-variants.mjs` writes the 8 files from `scenario.json` and the 8 twins from `/home/user/agent/tmp/bench3/scenario.json`, both from one table of reworded requests. Rerun it after any change to either scenario file, then rerun the check.
