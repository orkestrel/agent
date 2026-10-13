# Larkspur comparison bench

The `bench.mjs` script drives the Larkspur Home support-desk scenario in `scenario.json` through one `@orkestrel/agent` agent against a local Ollama daemon. You can compare 4 ways of fitting a long conversation into a small context: summarizing compaction, judge selection, both together, and neither. A fifth mode, `ledger`, builds the briefing architecture of `BRIEFING.md`; see the later section on the ledger mode.

## Run the bench

The bench needs Node 22, the built agent at `/home/user/agent/dist/src/core/index.js`, and an Ollama daemon at `http://127.0.0.1:11434` that serves `qwen3.5:2b-q4_K_M`, `tev1:0.8b`, for `--judge mica`, `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`, and any model you name with `--model`, such as `qwen3.5:4b-q4_K_M`. A first model load takes 1 to 2 minutes on a 4-CPU host.

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

To run the agent on another model or with a thinking pass, pass `--model` and `--think`; the summarizer keeps `qwen3.5:2b-q4_K_M` and the judge keeps its model. Check the thinking route with the ledger fixture first, which asks no model; see the later section on thinking mode:

```sh
node /home/user/agent/tmp/bench3/bench.mjs --check-ledger
node /home/user/agent/tmp/bench3/bench.mjs --mode ledger --model qwen3.5:4b-q4_K_M --think --out /home/user/agent/tmp/bench3/results/ledger-4b-think
```

The `--state`, `--candidates`, and `--search` flags are opt-in: without them, a run builds the same agent prompts, tool schemas, and judge states as a run before the flags existed. The results table and the JSON line gain columns and fields in every run.

## Flags

The script reads the following flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--mode` | required | `compaction`, `selection`, `both`, `none`, or `ledger`. |
| `--goals N` | all 10 | Runs the first `N` goals in order. |
| `--judge` | `mica` | The selection judge: `tev1` drives `tev1:0.8b` through `createSystemOneJudge`; `mica` drives the Mica model through the ollama package's `createOllamaJudge`. |
| `--threshold` | `0.9` | The `needed` criterion's threshold; a subject is dropped only when its yes probability is at most 1 minus this value. |
| `--limit` | `all` | The fresh judge questions one selection may ask, or `all` for no cap; unasked subjects are kept. |
| `--summary` | `generic` | The summarizer instruction: `generic` names no scored category; `tuned` lists the ids, codes, corrections, and withdrawals the goals score. |
| `--window` | `3000` | The compaction window, in `estimateMessages` units (characters divided by 4, plus 4 per message, plus the serialized tool calls). |
| `--keep` | `6` | The live messages each compaction leaves verbatim. |
| `--ctx` | `6144` | The `num_ctx` option sent with every agent and summarizer call, together with `truncate: false` and the sampler options of `--temperature` and `--seed`, as the later section on sampler options describes. |
| `--temperature` | `0` | The `temperature` option of every agent and summarizer call, a nonnegative number. Above 0 the model samples, and `--seed` picks the sample. Any other value exits with status 2. |
| `--seed` | `7` | The `seed` option of every agent and summarizer call, a nonnegative integer. |
| `--judge-ctx` | `8192` | The `num_ctx` option the Mica judge sends; `tev1` takes no context option. The `stock` and `plain` states render the whole view and need the default or more; a `bounded` state needs no more than 4096. |
| `--timeout` | `3600000` | The milliseconds one goal may run, and the deadline of each provider and judge call. |
| `--out DIR` | `tmp/bench/results` | The output directory. |
| `--smoke` | off | Runs the first goal only and prints the per-call log and each reply, and the answer when it came from the final assistant content. |
| `--state` | `stock` | The judge state selection renders per question: `stock` installs the package's `createSelection`; `plain` and `bounded` install a harness handler that mirrors `createSelection` and renders the state described in the later section on selection states. |
| `--criterion` | `stock` | The needed criterion the judge reads: `stock` is the package's `NEEDED_CRITERION`; `lookup` names a fact, rule, correction, or identifier the work must apply, quote, or look up, for a judge that misses an id the request needs for a lookup. The calibration and the selection both read it. |
| `--neighbors N` | `2` | The view messages a `bounded` state shows before and after the subject; other states ignore it. |
| `--candidates` | `oldest` | The order selection asks about view messages: `oldest` asks in view order, as the package does; `newest` asks from the end of the view, so a numeric `--limit` leaves the oldest messages unasked and kept. Applies to every `--state`. |
| `--search` | `phrase` | How `search_history` matches: `phrase` matches the whole query as one substring; `words` matches a message that contains every word of the query. |
| `--calibrate` | off | Runs no agent: asks the judge the needed question about every seed message for each of the first `--goals` goals and writes `calibration.jsonl` and `calibration.md`. `--mode` is not needed. |
| `--profile` | `refined` | Ledger mode only. Sets the default of every change flag of the later section on profiles: `roundA` sends the request bodies of the 2026-10-09 v8 run byte for byte, and `refined` turns every change on. A change flag on the command line overrides its profile default. |
| `--gate` | profile | Ledger mode only, `deny` under `roundA` and `admit` under `refined`. `deny` runs the gate (the authority and the deny listener under `--reply tool`, the hold under `--reply terminal`, and the settle step) and appends `ledger.gate` to the system text; `admit` keeps the settle step only and omits `ledger.gate`. |
| `--reply` | `terminal` | Ledger mode only. How a goal's reply arrives: `terminal` advertises no `send_reply` and takes the final message as the reply; `tool` advertises `send_reply` and takes its text. The later section on the reply gives each route. |
| `--budget SHARE` | `0.7` | Ledger mode only. The share of `--ctx` the whole first prompt of a goal can take, in tokens: the fixed cost of the tool schemas and framing comes out of it first, the system message and the tail take the rest, and everything past the share is room for the goal's own calls, results, and reply. The later section on the prompt gives the reason for the default. |
| `--tail SHARE` | `0.35` | Ledger mode only. The share of the budget the tail can take; the system string and the briefing take the rest of the budget beside what the tail used. |
| `--horizon RUNS` | profile | Ledger mode only, `3` under `roundA` and `99` under `refined`. The gap of consecutive untouched runs after which a pin that is not a rule retires. |
| `--date` | profile | Ledger mode only, `off` under `roundA`. `on` puts the control's date sentence, `Today is Thursday 2026-10-08.` from `ledger.clock`, after the first sentence of the system text, and keeps the clock on that date for the whole shift. |
| `--tail-answers` | profile | Ledger mode only, `keep` under `roundA`. `drop` leaves the model's earlier final answers, sent replies, and text written beside a call out of the tail and opens the tail on a user message. |
| `--tail-requests` | profile | Ledger mode only, `keep` under `roundA` and `drop` under `refined`. `drop` ends the tail's history where the first goal run starts, so a request's tail holds seed messages under the `--tail` cap and the request last, and no request, call, result, desk note, cue, or answer of an earlier goal run. |
| `--rules` | profile | Ledger mode only, `roundA` under `roundA`. `last` renders every user rule one sentence a line in a `## Rules` block at the end of the briefing, with the corrections that amend it, and filters no rule by topic. |
| `--handles` | profile | Ledger mode only, `roundA` under `roundA`. `bare` renders a message line as `mN: CONTENT` with no role word, lets `recall`, `read`, and `pin` take a leading handle token, so `m18 user` names m18, and appends `Never cite a handle such as m12 or r5 in your answer.` to the system text. |
| `--cache` | profile | Ledger mode only, `roundA` under `roundA`. `stable` keeps the system message and the tool list of a request's first agent call for every later call of the request: a hold, reminder, or answer run reads the plan the request entered with, a closed tool stays advertised and refuses in its result, and under `--answer-cue off` the answer run refuses every call that way. |
| `--autopin` | profile | Ledger mode only, `roundA` under `roundA`. `named` auto-pins, and renders unpinned, only a user message that carries an id, a number, or a name. |
| `--report` | profile | Ledger mode only, `roundA` under `roundA`. `full` sums `usage` over every agent call of every pass and the judge, counts a lookup in `toolsOk` as done when the briefing shows at entry a result of it on the request's record, and widens `briefing.stale` as the later section on ledger-mode fields gives it. It changes no request body. |
| `--arm-tools` | profile | Ledger mode only, `all` under `roundA`. `recall` leaves out the `pin` and `read` tools, the pin sentence of the system text, the pin clause of the hold note, and the `## Values` block; the settle step still pins every owed result whole. |
| `--tally` | profile | Ledger mode only, `roundA` under `roundA`. `once` counts an omitted pin on several topics one time in the `## Not shown` tally; `off` renders no tally. |
| `--request-questions` | profile | Ledger mode only, `all` under `roundA`. `topics` asks a request no category question and no `warehouse` topic question; the seed keeps its readings. |
| `--answer-cue` | profile | Ledger mode only, `off` under `roundA`. Under `--reply terminal`, `on` adds the main harness's `ANSWER_CUE` text, `[Desk] Give your complete answer now as your final message, from what you already have.`, as a desk note before the answer run, so the run reads it last, and the answer run advertises no tool, under `--cache stable` too. |
| `--recall-budget N` | profile | Ledger mode only, `unlimited` under `roundA` and `2` under `refined`. After N `recall` calls in one request the arm tools close for the rest of the request, as after a repeated `recall`, so a later `recall` refuses with the answer-now pointer; `0` closes them from the request's first call. |
| `--scenario PATH` | `scenario.json` beside the script | The scenario file. The reworded variants for this harness are `tmp/bench/variants/ledger/v1.json` to `v8.json`, which carry the same requests as the main harness's `tmp/bench/variants/v1.json` to `v8.json`. A reworded variant keeps the seed, so the seed judgments `--judgments` imports stay valid; a reworded request gets its judge questions live. The ledger mode, `--check-ledger`, `--calibrate-categories`, and `--probe-filing` exit with status 2 on a scenario without the `ledger` member or the seed `truth`, such as the main harness's variants. |
| `--probe-filing` | off | Runs no agent: asks the judge, live, the category and desk-topic questions of seed messages 0, 6, 8, 11, 18, and 24 and prints each answer beside the record `--judgments` imports. `--check-ledger` never runs it. |
| `--categories` | `choice` | Ledger mode only. The `category` question form: `choice` asks one choice over the 7 categories; `noul` asks one noul per category. |
| `--judgments FILE` | unset | Ledger mode only. Imports the seed records of a `calibration-categories.jsonl` written with the same `--judge` and `--judge-ctx`, so the seed pass reuses them instead of asking again; a row that failed on repeating top logprobs is held as an undecided item. With `--check-ledger`, names the calibration file the replay imports. |
| `--calibrate-categories` | off | Runs no agent: asks every categorical question over the seed and writes `calibration-categories.jsonl` and `calibration-categories.md`; see the later section on the ledger mode. |
| `--check-ledger` | off | Runs no model and no judge: replays the ledger fixture and the recorded run `--replay` names, and exits 0 when every assertion holds and 1 otherwise. |
| `--model` | `qwen3.5:2b-q4_K_M` | The agent model, in every mode; the two seed calls that measure the fixed cost and the scale ask it too, because they price the agent's prompts. The summarizer and the judge keep their models. An empty value exits with status 2. |
| `--think` | off | Sends `think` true and `num_predict` 1024 on every agent call, as the later section on thinking mode describes. Summarizer and seed-measurement calls send `think` false, and the judges run without thinking. |
| `--replay DIR` | `tmp/bench/results/v3/ledger-deny-first` | With `--check-ledger`, the recorded ledger run to replay: its `ledger.jsonl` and `seed.json`, with the calibration records from the first of `--judgments`, the `judgments` file `seed.json` names, `cal-categories.jsonl` beside `DIR`, and `tmp/bench/results/v3/cal-categories.jsonl`, the file the v3 and v8 ledger runs imported. The replay prints the file it imports, and its import-count check fails on a file whose rows differ from the run's. A ledger run records the absolute `--judgments` path in `seed.json`. An empty value skips the replay. |

## Modes

Each mode builds the same conversation and tools and changes only what bounds the prompt:

- `none` sends the whole view every turn, so the prompt grows with every goal until it passes `--ctx`. Every call sends `truncate: false`, so the daemon refuses an over-context prompt and the goal ends in an error, counted as an overflow. Without that field, Ollama 0.40.0 drops whole leading messages until the rest fits and reports nothing: on 2026-10-08, a prompt of 18035 tokens at `num_ctx` 6144 returned `prompt_eval_count` 25.
- `compaction` sets the agent `window` to a `createBudget` over `estimateMessages`. When the prompt reaches the window, the agent folds the older live messages into a section that the same qwen model summarizes.
- `selection` sets the agent `select` to `createSelection`, which asks the judge whether each view message is needed for the request and drops the decisive no answers. No window is set, so nothing is summarized. The selection asks about view messages in view order and keeps every message after the first `--limit` asked, so with a numeric `--limit` only the oldest `--limit` view messages are candidates; the `asked/screened` column shows the cap. Pass `--candidates newest` to make the newest `--limit` view messages the candidates instead.
- `both` sets the window and the selection together.

The `search_history` tool reads the full record (every section's original messages and the live tail) in every mode, so the model can recover a fact that compaction or selection kept out of the prompt. It skips the results of earlier searches and every message from the goal's request on, and returns at most 6 messages.

The `--search` flag sets how a query matches:

- `phrase` lowercases the trimmed query and matches a message whose lowercased content contains it as one substring. The tool description asks for one distinctive name, id, or word.
- `words` splits the query on whitespace, strips leading and trailing punctuation and symbols from each word, lowercases it, and drops empty words; a message matches when its lowercased content contains every word as a substring. The tool description asks for a name, an id, or a few words. When nothing matches, the result names the words no earlier message contains, or, when each word appears somewhere, says no message contains them all.

## Selection states

The `--state` flag sets the state the judge reads for each question. Every state marks the subject `[A]` and the request `[B]`, and appends the request when a compaction folded it out of the view:

- `stock` is the package's `renderSelectionState`: one JSON object per view message, so each question carries the whole view.
- `plain` renders the whole view as one line per message, `[A][B] role: content`, with a marker only where it applies. A newline inside content becomes a space. An assistant message with tool calls is followed by one line per call, `call NAME(ARGUMENTS)`, where `NAME` is the tool name and `ARGUMENTS` the arguments as JSON.
- `bounded` opens with the line `Messages [A] and [B] are from a longer conversation; other messages are omitted.` and then renders, as `plain` does, only the `--neighbors` view messages before and after the subject, the subject, and the request, in view order. Each question costs about the same at every view length.

The `plain` and `bounded` handler repeats `createSelection` step by step: it removes judgments recorded for an earlier request, screens the view minus the request, resolves each judgment through `conversation.judgments.resolve` with the subject and request ids as ordered sources so an identical state reuses the recorded answer, asks `buildNeededQuestion(NEEDED_CRITERION)` at `--threshold`, spends `--limit` on fresh questions only, drops the decisive no answers through `filterSelectionMessages`, which keeps a tool group whole, and returns the same `Selection` shape with `messages`, `judgments`, `usage`, and `fault`. The state renderer is the only difference, so a difference between `--state` values measures the state.

The `send_reply` tool ends the goal: the harness calls `agent.abort('replied')` after the first successful reply, so the loop makes no further provider call.

## Metrics

Each JSON line holds one goal. The table shows the following columns:

| Column | Meaning |
| --- | --- |
| goal | The scenario goal id. |
| success | `yes` when the model called `send_reply` and the reply passes every check of the later section on scoring, and the run did not throw. `(partial)` marks a cancelled or limit-exhausted run other than the reply abort, and `(error)` marks a thrown run. |
| answer | Where the scored answer came from: `reply` when the model called `send_reply`, `content` when it answered in the final assistant content instead, and `none` when it did neither. |
| ok any | `yes` when the answer passes the same checks as `success` from either route, and the run did not throw. |
| turns | The agent provider calls in the goal. |
| max prompt tokens | The largest prompt an agent call in the goal carried: the `prompt_eval_count` the daemon reported, or, for a call it refused, the prompt tokens the refusal names. |
| overflow | The agent and summarizer calls the daemon refused because the prompt exceeded `--ctx`. |
| truncated | The calls whose prompt plus completion reached `--ctx` minus 64 tokens or that ended with `done_reason` `length`; such a call ran out of context while generating. |
| faults | The agent `fault` events: a failed selection or a failed summary. |
| judge calls | The HTTP requests the judge sent during the goal. |
| selection/view | The messages the last selection kept over the view it selected from; `-` when no selection ran. |
| asked/screened | The judgments the last selection made over the view messages it could ask about; `(judge over ctx)` marks a goal where the mean judge prompt per judgment reached `--judge-ctx`. |
| wall s | The goal's wall-clock seconds, judge and summarizer included. In `selection` and `both`, the daemon can swap the agent and judge models during a goal, so read this as an upper bound. |
| in prompt | `yes` when the first agent call of the goal carried every seed message the goal's facts name, verbatim; it measures what the model holds without searching. |
| tools ok | `yes` when the model called every tool the goal lists, such as `send_reply`. When `in prompt` is `yes`, `search_history` is not required. |
| summaries | The summarizer calls during the goal; one compaction makes 2, one for the section and one for the conversation rollup. |
| sections | The conversation's compacted sections after the goal. Pass `--sections N` to cap the compacted history (the conversation manager's `sections` option, which collapses on overflow); unset, sections grow without bound. |
| view | The messages in the conversation view after the goal. |

The JSON line adds the per-call log (`label`, message count, `estimate`, `prompt`, `completion`, `done_reason`, milliseconds, truncation flag, overflow flag, HTTP status, the prompt tokens a refused call requested, and, for an agent call under `--think`, `thinking` and `cut` as the later section on thinking mode defines them), the summed completion tokens, the result `usage` (agent calls plus judge usage), each `select` receipt with its asked and screened counts, usage, mean judge prompt per judgment, and fault, every `fault` and `deny` event, each tool call with its arguments, the reply, the `missing` expected and the `violations` forbidden substrings, and the `partial`, `exhausted`, `aborted`, and `error` outcomes.

The reply is the `send_reply` text joined across calls. The `content` field holds the final assistant content, which never counts toward success.

The JSON line also carries the following fields:

| Field | Meaning |
| --- | --- |
| `model`, `think` | The agent model, and `true` when the goal's agent calls asked for thinking. |
| `thinking`, `cut` | Under `--think`: the summed thinking characters of the goal's agent calls, and the agent calls that were cut. Absent otherwise. |
| `state`, `neighbors`, `candidates` | The selection settings of a `selection` or `both` run; `neighbors` only for `bounded`. |
| `search` | The `--search` value. |
| `patternViolations` | The forbidden pattern sources the reply matches; any entry fails `success`. |
| `answer` | The reply when `send_reply` was called, else the final assistant content, else an empty string. |
| `answerVia` | `reply`, `content`, or `none`, as in the `answer` column. |
| `answerMissing`, `answerViolations` | The expected substrings the answer lacks, and the forbidden substrings and pattern sources it holds. |
| `successAnswer` | The `ok any` verdict. |
| `sectionsHeld` | The sections the conversation holds after the goal, each as `{ id, summary, messages }`, where `messages` counts the folded originals. The older `sections` field keeps the count. |
| `rollup` | The conversation rollup summary after the goal; absent before the first compaction. |
| `selections` | One entry per `select` event: the fields of the matching `selects` entry, plus `kept` (the message ids the selection kept, in prompt order), `dropped` (the view ids it left out), `droppedSeed` (the seed indices among them), and `judgments`, one `{ subject, seed, p }` per judgment the selection rests on, where `p` is the judge's yes probability from the recorded answer, or `{ subject, seed, refusal }` for a refused question. `seed` is present only when the subject is a seed message. |

### Scoring

The harness scores a reply and an answer with `compileRules` and `scoreText`, imported from `/home/user/agent/tmp/bench/rescore.mjs`, so every arm here reads a reply exactly as the main harness and its rescoring do. A text passes when it holds every `expected` substring, at least one `expectedAny` entry when the goal lists them, no `forbidden` substring, and no match for a `forbiddenPatterns` source, each case-insensitive. An `expectedAny` entry matches as a whole word or phrase, between characters that are neither letters nor digits, because verdict words such as `no` and `yes` occur inside other words. Every check reads a copy of the text without the markdown that only styles it: table separator rows, heading marks, a list bullet or number at the start of a line, every `*` and backtick, and each `_` at a word edge go, `‘` and `’` become `'`, and each table cell is bounded by `¦`, which no pattern's `\s+` or word chain crosses, and the record keeps the original text. Without that copy, `not **ESC-2291**` fails a correct g04 reply and `by **Friday**` passes a wrong g07 reply.

The goals of `scenario.json` are the goals of `/home/user/agent/tmp/bench/scenario.json` member for member; the following section on the fixes of 2026-10-08 records how they came to match. The scenario notes record changes (1) to (4), and the main harness's notes and README record the rest.

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

After the rows, the harness writes `calibration.md` and prints it. For each goal, and over all goals when there are several, a table gives the keep rate over the `mustKeep` rows and the drop rate over the `mustDrop` rows at every threshold from 0.50 to 0.95 in steps of 0.05. A message counts as kept when its `p` is above 1 minus the threshold, or when the judge gave no answer, as in a live selection. A line after each table gives the mean and largest judge prompt tokens, the refused or failed questions, and the judge wall time. Pick the `--threshold` for a selection run from the row whose keep rate is 100 percent with the highest drop rate.

## Ledger mode

The `ledger` mode builds the harness arm of the briefing architecture in `BRIEFING.md` section 5 with the public API of the built agent. It changes nothing in `/home/user/agent/src`, and no line it adds runs unless `--mode ledger`, `--calibrate-categories`, `--check-ledger`, or `--probe-filing` is set, so the other modes build the same prompts as before; the provider's per-call `hash` and `replyHash` fields record in every mode and change no body.

Run the fixture, then the calibration, then one goal:

```sh
node /home/user/agent/tmp/bench3/bench.mjs --check-ledger
node /home/user/agent/tmp/bench3/bench.mjs --calibrate-categories --judge mica --judge-ctx 4096 --out /home/user/agent/tmp/bench/results/v3/cal-categories
node /home/user/agent/tmp/bench3/bench.mjs --mode ledger --smoke --gate deny --ctx 3072 --judge mica --judge-ctx 4096 --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl --out /home/user/agent/tmp/bench/results/v3/ledger-smoke
```

### What the mode adds

The mode keeps every message verbatim in the conversation and adds the following pieces beside it:

- A results store: a `Map` from call id to `ToolResult`, written by the agent's `tool` listener with the wrapper's `[rN] ` prefix removed. The seed tool messages load under `call_1` to `call_4` as `r1` to `r4`. A held call id is refused and counted in `collisions`. A `no record` answer is empty and never owed.
- A tool wrapper passed as `tools`: `definitions()` delegates to the tool manager and drops `pin`, `recall`, and `read` while the run's arm tools are closed (see the later section on those tools), and `execute()` delegates and prefixes each successful value with `[rN] `, numbered by the results store's order. The shared tools keep their definitions unchanged.
- A topic registry of entity ids by kind: orders and accounts from a lookup argument whose lookup returned a record and from a result that names them, a customer as the holder name a result states beside an account id (an alias of that account), and tickets a result names. An alias matches by its whole name, case-insensitive, or by a capitalized name word no other alias carries, with its capital, so `Luis's mixer` names Luis Ferreira's account and `the grace period` names no Grace. The `amends` and `supersedes` pairs and the registry check against the seed truth read whole names only, the reading the calibration fitted. Codes and dates are never topics. A message's topics are the registered ids and aliases it contains plus its decided desk topics from `ledger.topics`.
- A categorizer at the select site over `conversation.judgments.resolve`, described in the later section on the judge questions, with a failure store that holds each question whose judge readout repeats a top logprob token, so the item stays undecided without a question at every later select site.
- A ledger of pins, each storing an id, a source message id, an optional value, an origin (`model` or `loop`), and an optional `until` that only code sets. Topics, category, position, amended marks, and the end derive at each read. The three ends are `superseded` (a decided `supersedes` record, a decided `amends` record whose later message carries a token of the value, or a later result of the same lookup with the same arguments), `expired` (`until` before the conversation clock), and `retired` (a gap of `--horizon` completed runs without a touch after the pin's write; a rule never retires this way).
- The `pin`, `recall`, and `read` tools, which replace `search_history`. Under `--reply tool` the advertised tools are `lookup_order`, `lookup_customer`, `pin`, `recall`, `read`, and `send_reply`, and `lookup_order`, `lookup_customer`, and `send_reply` alone after the arm tools close; under `--reply terminal` `send_reply` is left out of both sets.
- A select handler that never throws and never returns a `fault`: it categorizes, auto-pins, plans, writes the `briefing` instruction (or removes it when the briefing is empty), and returns the projected tail.
- Under `--gate deny`, an authority and a `deny` listener with `--reply tool` or the hold with `--reply terminal`, and a settle step; under `--gate admit`, the settle step alone.

### The prompt

The agent's instruction manager carries `format: { open: '' }`, so the `briefing` instruction renders after the system string with no header. The system message holds the following parts in order:

1. The system string: `ledger.system`, plus `ledger.gate` under `--gate deny`. Under `--reply terminal` each sentence that names `send_reply` takes its final-answer wording, which the later section on the reply quotes.
2. `## Values (as of mN)`: one line per live value pin, `pN (SOURCE) VALUE`.
3. `## Pinned`: each rendered unit's source, `mN ROLE: CONTENT` with `[amended by mK]` where a decided correction changes it in part, or `rN NAME ARGUMENTS: TEXT`. Each message `mK` an amended mark names renders right after the source it amends, so the mark names a line of this block. A source the tail carries verbatim is skipped here, unless a value line names it or it amends a source that renders here; a result always renders here.
4. `## Not shown`: the tally, one row per request topic with its omitted pins and remainder messages, one `other topics` row that sums every other topic, an `uncategorized` row, and a `no topic` row. Folding the other topics into one row names no topic the model could recall in place of the request's own.

The tail follows: the newest messages, call groups whole, back until the `--tail` share of the budget is spent, always ending on the request. An earlier run shows in the tail as its request, its lookup call groups, and each reply it sent, once, as assistant text, or under `--reply terminal` its delivered final answer once; its `recall`, `read`, and `pin` call groups, every refused or failed `send_reply`, every desk note the loop appended, every answer a note turned back, the empty assistant message a call cut by the window leaves, and every lookup the repeat notice answered are dropped. In the 2026-10-08 records the tail kept those call groups whole: the first call of deny g03 and admit g03 copied a `recall` of another customer's order from the tail, the stubs repeated each pin value and reply text, and `separation` read 5, 2, 8, and 10 for deny g03, g04, g09, and g10 and 6, 2, and 4 for admit g03, g06, and g07. Handles appear only inside the briefing (finding A7 of `results/AUDIT.md`): each tail message carries its stored content with no `[mN] ` prefix and no amended mark, because the correction that amends a tail message is newer and sits later in the same tail. A lookup message of an earlier run shows a stub with no handle:

- `lookup_customer {"account":"LH-44870"}: result shown under Pinned in the system message`, when its result renders in pinned items;
- `lookup_order {"id":"LH-79215"}: result not shown; call recall with LH-79215`, when the budget omitted it;
- `no record` or `failed`.

A stub of another tool names the tool and the outcome, `send_reply: sent` or `recall: done in an earlier request`, and never its arguments, which are the model's own text.

The model sees handles in two places only: the briefing's lines, and the `[rN] ` the wrapper puts before each result of the run in progress, which the `pin` duty names.

The briefing renders units in the following groups, and leaves every other topic to the tally and `recall`:

1. The request's topics: each live pin whose source carries a topic of the request, by source position, then each user message on those topics that no pin ever sourced and that is neither quiet, a run's request, superseded, nor in the tail, by relevance.
2. Rules and corrections on other topics, by source position.
3. Units on other topics, pinned or not, that share a name with the request, by relevance.

A name is a capitalized word away from the start of a sentence with a lowercase letter, such as `Kenji` or `Halvorsen`; relevance sums, over the words a message shares with the request, the logarithm of the message count over the count of messages that carry the word, so a rare name outweighs a common word. No reading of the goal truth enters either. The second clause of group 1 and group 3 reach message 11, the gift note the judge reads as a request at 0.73, which no pin holds: g06 reaches it by its `delivery` topic and g09, whose request reads no desk topic, by the names `Kenji` and `Nakamura`.

The tail takes up to its share of the budget first; the system string and the briefing take the rest of the budget beside what the tail used, and the room `briefing.room` reports is that rest minus the system string. When the system message passes its room, units are omitted in the following order: group 3 least relevant first, then the unpinned messages of group 1 least relevant first, then corrections, then rules, then the pins of group 1 least relevant first. Past the last unit, the tally loses rows from its end. `briefing.over` reads true when a pin of group 1 ends up neither in pinned items nor in the tail. A value pin and its source's reference pin are omitted together.

Every share is measured in `estimateMessages` units scaled to qwen tokens. The tool schemas cost the same at any prompt size and no estimate counts them, so the scale leaves that fixed cost out: at startup the seed prompt goes out twice for one predicted token, with the tool schemas and without them; the difference is the fixed cost, and the call without them over its estimate is the first scale. After each run, the scale is the run's first call's prompt count minus the fixed cost, over its estimate. A ratio that kept the fixed cost rose as the prompt shrank (1.61 to 2.84 over the 6 goals of the 2026-10-08 run in `results/v3/ledger-deny-first`), which shrank the next room and left the tally alone in the briefing from g04 on.

The budget is a share of the whole window, so the plan charges the fixed cost against it: the system message and the tail take `(ctx * budget - fixed) / 1.06` tokens. The divisor is `SCALE_DRIFT` in `bench.mjs`, the largest rise of a goal's first-call tokens per estimate unit over the scale its plan priced with in the 2026-10-08 records `results/v3/ledger-deny` and `results/v3/ledger-admit` (seed 1.150 to admit g01 1.212), so the first call stays inside the share when the next goal's text costs more per unit. Before this charge, the budget priced only the system message and the tail: the first calls of those records measured 2329 to 2580 tokens beside a fixed cost of 835, and 9 of the 20 goal runs ended without an answer because the window filled.

The default budget is 0.7 because the fixed cost leaves too little room for a useful briefing at 0.55. At 0.55 the system message and the tail take `(1690 - 835) / 1.06 = 806` tokens, the system string about 300 of them, and the replays of both records leave the briefing 202 to 312 tokens: 15 of the 20 replayed goal runs omit a request-topic pin, and g06 and g09 render none of their facts. At 0.7 the first call projects to 1896 to 2107 tokens in both replays (`--check-ledger`, 2026-10-08), every goal fact of all 20 replayed goal runs renders at entry, and at least 965 tokens stay for the goal's turns. That is more than the 689 tokens the selection arm's largest prompt left, and more than twice the 452 tokens the longest replied goal of `results/v3/ledger-deny` grew by: at `--ctx 3072` the selection arm's largest prompt per goal ran from 1166 tokens (g02 of `results/v2/selection-tuned`) to 2383 tokens (g05 of `results/v4/selection`).

The loop pins, with origin `loop`: every seed lookup result at seed load, every user message whose category reads decisive fact, rule, or correction, every result the gate finds owed, and every result still owed when the run settles. A request that touches a retired pin's topic gets a fresh pin from the same source.

### The gate

Under `--gate deny`, the authority records the `source` of each `pin` call it evaluates and clears that record on each `turn` event. It denies the first `send_reply` of a run while a lookup result of the run is owed and no `pin` call of the turn names it, with zone `ledger` and a reason such as `send_reply was refused one time because r5 was unpinned; the loop pinned r5 whole. ...`. The `deny` listener acts only on a call id the authority recorded, and pins each owed result whole before the model reads the denial. The next `send_reply` is admitted.

The authority admits the `send_reply` instead when the context the latest agent call left, `ctx - prompt - completion`, is less than the denial as a tool result plus twice the refused call's completion, the retry the denial forces; the settle step then pins the owed results whole, as under `--gate admit`. In deny g08 of 2026-10-08 the gate refused a reply that named the expected account manager with 315 tokens left, and the pin and the retry ran out of window.

### The reply

The `--reply` flag sets how a goal's reply arrives and what the loop does when a run ends without one. An extra run, the reminder, the hold, or the answer run, reads the plan of the goal's request: the briefing and the budget are planned for the request, the run's own messages follow the tail, and the arm tools stay closed if they closed earlier in the goal. A desk note is a user message that is never categorized, pinned, or shown in a later tail. Every message an extra run adds stays in the conversation.

Under `--reply terminal`, the manager holds no `send_reply`. The system text takes the following wording for the three sentences that name it:

- `Finish every request with your complete answer as your final message; that message is what the shift lead receives.` for the closing duty.
- `..., before your final answer.` at the end of the `pin` duty.
- `The first final answer while a lookup result is unpinned is held one time, and the hold names the handle.` for `ledger.gate`.

A run that ends on a reply with no tool call ends the goal, and that content, trimmed, is the reply. A run whose final content is empty, that ends at the turn limit, or that the repeat stop ended runs once more under `createScope({ name: 'answer', tools: [] })`: no tool is advertised, and the model answers from what it holds. Under `--answer-cue on` the goal's conversation first takes the desk note `[Desk] Give your complete answer now as your final message, from what you already have.`, the main harness's `ANSWER_CUE`, so the answer run reads it as its last message, and the run's `passes` entry records it as `note`; the run advertises no tool under `--cache stable` too. When the answer run still yields no text, the goal has no reply. The package selects only when the view ends on a user message, so the answer run reads a scratch conversation that holds the plan's tail and the run's own messages, less an empty assistant message; the messages it writes are copied into the goal's conversation, and the scratch conversation is removed.

Under `--gate deny`, the gate holds the first final answer of the goal where it would refuse the first `send_reply`, on the same owed results and the same room test, and pins the owed results whole. It appends one user message, such as `[Desk] Your final answer was held one time because r5 was unpinned; the loop pinned r5 whole. To add the exact value you will send, call pin with source r5 and that value, then give your final answer.`, and runs once more. The second final answer is the reply whatever the pins; when that run yields no text, the held answer is the reply. No `send_reply` authority runs under `--reply terminal`, so a stray `send_reply` call fails as an unknown tool and never spends the hold.

Under `--reply tool`, `send_reply` is advertised, the system text is the scenario's, and the first successful `send_reply` ends the goal. A run that ends with text and no tool call, with no overflow, abort, or error, gets one user message, `[Desk] That answer was not delivered. Call send_reply with the complete answer now; text outside send_reply never reaches anyone.`, and runs once more. A first run that the repeat stop ended gets the same message and runs once more, as in the main harness, and turns back no answer because it wrote none. When that run also ends without `send_reply`, the reply is the goal's last non-empty assistant text with no call, less one leading `Send reply:` or `send_reply:` label in any letter case and one pair of surrounding quotes.

An overflow, an abort other than the repeat stop, or an error ends the goal with no extra run. The `replyVia` field names the route the reply took:

| `replyVia` | Route |
| --- | --- |
| `final` | Terminal: the first run's final message. |
| `answered` | Terminal: the answer run's final message. |
| `held` | Terminal: the reply after a hold, the second answer or the held one. |
| `tool` | Tool: a `send_reply` call before any reminder. |
| `reminded` | Tool: a `send_reply` call after the reminder. |
| `content` | Tool: the last plain text after the reminder, with the label and the quotes stripped. |
| `none` | No reply. |

In ledger mode `success` follows the main harness's rule: the first run did not throw, and the reply of any route is not empty and passes every check. A later run that throws, the reminder, the hold, or the answer run, records `followError` and leaves the reply its route fell back to, which is scored like any other. `reply` holds the reply, `answerVia` reads `reply` whenever a reply arrived, `replied` reads true only when `send_reply` was called, and `toolsExpected` leaves out `send_reply` under `--reply terminal`. The table adds a `reply via` column after `answer`, and its settings line gives the reply mode, the sampler options, the count of goals per route, and the lookup repeats of all goals.

### The `pin`, `recall`, and `read` tools

The `pin` tool takes `source` (a handle) and an optional `value`, and refuses, with the reason as the tool error, when the following holds:

- The handle does not resolve and no unique source among this run's results, then the tail, carries every id and number of the value; the reason lists the valid handles.
- The source is an assistant message written in a run, or a tool message that is not a lookup result.
- The value carries an id-shaped token (letters and digits joined by hyphens, with a digit) or a number the source lacks; numbers compare by value after currency symbols and thousands separators go.
- The source is superseded, or the value carries a token that a later message with a decided `amends` record against the source also carries.

A handle that names a `read` result rewrites to the handle it read, and one that names a `recall` result rewrites to the one listed source that carries the value. A repeated source and value returns the live pin. A model value pin whose source has no live reference pin gets one with origin `loop`. A value that carries every id and number of its source, such as a whole record the model copied, pins the source whole, the receipt reads `pinned pN from rK (whole)`, and the briefing shows the source line once with no value line.

The `recall` tool takes `topic` and an optional `category` (`fact`, `rule`, `correction`, or `opinion`). It matches registry topics and desk topics that contain every query word, or an id exactly, and returns value pins and superseded or expired pins with their cause, then messages and lookup results on them, newest first; a live reference pin and a retired pin are listed through their source's line only. Each listed source is followed by each message that amends it, in the same item, so the cut keeps or drops the two together and every amended mark names a line of the result. A run's request is never listed, and from the request in progress on only this run's lookup results are. A handle as the topic (`m40`, `r5`, or `p4`) returns that source, with each message that amends it. Without a topic match it falls back to the word search over user messages and lookup results, with the same rules. A cut result ends with `N older items not shown; add a category to narrow the recall`. The `read` tool returns one message or result by handle.

The result's room is half of what the latest agent call left beyond the reply reserve, less the call message that asks for it, in estimate units priced at the marginal rate: the least-squares slope of prompt tokens over estimate units within each run's calls that advertised the same number of tools, pooled over the completed runs and the run in progress, with the scale standing in until a run has two measured calls. The estimate counts no tool schema, so a fit across a closure would read the dropped schemas of `pin`, `recall`, and `read` as a falling rate and shrink the reserve and the gate's price of a refusal. Appended calls and results cost more per unit than the whole prompt: 1.543 tokens per unit within the runs of `results/v3/ledger-deny` and 1.479 within `results/v3/ledger-admit`, against scales of 1.15 to 1.27. The reply reserve is the longest reply completion of the bench run, a `send_reply` call or under `--reply terminal` a final answer, or before the first reply the longest assistant message of the conversation in that reply form at the marginal rate, plus one call message with a short result.

A `lookup_order` or `lookup_customer` call that repeats the name and arguments of a lookup already answered in the same goal, the reminder, hold, and answer runs included, runs no lookup: the call fails with the main harness's notice as its error, so the tool message reads that notice, `You already have this result earlier in this request; give your complete answer now as your final message.` under `--reply terminal` and `You already have this result earlier in this request; call send_reply with your complete answer now.` under `--reply tool`. Arguments match as JSON with their keys sorted. The notice takes no `[rN] ` handle and is never stored as a record, owed, pinned, or shown in a later tail, and the arm tools stay open. The first such call also ends the run with reason `repeat`, as in the main harness, because a model that ignores the notice repeats the lookup until the turn limit; the goal end then asks for the answer as the section on the reply describes. A lookup with other arguments, or the same lookup in a later goal, runs the lookup.

A repeated call in one run gets a pointer: `same as rN in this request; answer with send_reply from what you have`, or, when the earlier result was empty, `nothing on "TOPIC", as rN showed in this request; answer with send_reply from what you have`; a repeated `read` of one handle gets the same pointer. The run's arm tools then close, and they also close the first time an agent call leaves less than twice the reply reserve, and under `--recall-budget N` after the run's Nth `recall` call. Each closure lasts to the end of the run: the next prompt drops the arm tools' schemas and leaves more room, which would otherwise reopen them. While closed, the wrapper advertises the shared tools alone, and a `pin`, `recall`, or `read` call refuses with `NAME is closed for the rest of this request; answer with send_reply from what you have`. Under `--reply terminal` the pointer and the refusal end with `give your final answer from what you have` instead. In the 2026-10-08 records the model repeated one recall up to 5 times in a goal at 64 to 69 tokens a repeat, with `recall` still advertised, and 8 of the 9 goal runs that ended without an answer were recall chains.

### The judge questions

Every state is plain `ROLE: CONTENT` text without handles, and a tool message's state reads its result from the results store, so the bytes never change and `matchesJudgment` reuses each record. No key's head is `needed`. The following table gives each question:

| Question | Form | Key | Asked of |
| --- | --- | --- | --- |
| `category` | Choice over fact, rule, correction, request, opinion, chatter, distractor; with `--categories noul`, one noul per category keyed `["category", ID, OPTION]` | `["category", ID]` | Every message the loop did not write that has no calls and is not a tool message |
| `topic` | One noul per desk topic in `ledger.topics` | `["topic", ID, TOPIC]` | Each such message whose chatter and distractor probabilities do not sum to the category threshold, and every request |
| `amends` | Noul | `["amends", EARLIER, LATER]` | Each user message whose correction probability reaches the correction floor, against each earlier message or result that shares a topic with it and is not chatter or a distractor |
| `supersedes` | Noul | `["supersedes", EARLIER, LATER]` | Each pair whose `amends` reads yes |

Call messages and loop-written assistant text read as `chatter` and results as `fact` by code. A judge error leaves the item without a record and logs it in the run's `faults`. A question whose readout fails with `invalid or duplicate top logprob token` is held in the failure store with its question text, state, sources, and judge, and its item stays undecided without another question until one of those changes; the fault carries the repeated tokens and which of the labels `No` and `Yes` the first position held. Any other judge error, such as a killed runner, is asked again at the next select site.

The ollama package raises `invalid or duplicate top logprob token` while it reads the first position's top 20 logprobs, before it looks for the labels: two entries carry the same token text, or one carries no finite logprob (`/home/user/ollama/src/core/helpers.ts:151`). A readout that lacks both labels yields a refusal instead, so the error is not a missing label. Mica returns the same readout for the same bytes, so the same 8 questions failed on every attempt: the `topic` nouls of messages 2, 3, and 7 on `warehouse`, message 10 on `escalations` and `warehouse`, message 26 on `returns`, and message 47 on `refunds` and `warehouse`. The chatter gate passes messages 2, 3, 7, and 10, so the 2026-10-08 run asked those 5 again at every select site: 5 of the 12 fresh questions each goal's `questions` field counts.

The thresholds are the `LEDGER_FIT` constant in `bench.mjs`, fitted by `--calibrate-categories` on the same seed, so every judge-dependent reading of the mode is in-sample. The following table gives each value and the reading it rests on, from the 364-question calibration of 2026-10-08 with Mica at `num_ctx` 4096:

| Setting | Value | Reading |
| --- | ---: | --- |
| `category` | 0.70 | The decisive threshold for a category and for the summed classes. At 0.70 the chatter gate closes on 8 of 14 truth chatter and distractor messages and on 1 other (acknowledgment 12), the auto-pin class takes 12 of 14 truth fact, rule, and correction user messages (not 0 or 11) and 1 other (distractor 9), and message 29 reads correction at 0.717. |
| `topic` | 0.60 | The largest grid value at which every goal fact and ground-truth pair member carries a topic and every ground-truth pair shares one; message 29 reads refunds at 0.64. |
| `amends` | 0.75 | Every ground-truth pair reads yes (lowest 0.774, pair 2 and 29); 2 of 12 other pairs read yes (40 and 43 against 44). |
| `supersedes` | 0.95 | Both ground-truth supersessions read yes (lowest 0.974); no other pair does (highest 0.946, pair 3 and 29). |
| `correction` | 0.30 | The gate floor: the truth corrections read 0.969, 0.717, and 0.816 (messages 27, 29, and 44), and no other user message reads above 0.01. |

The calibration's first refunds criterion read message 29 at 0.29 and left it with no topic, so the pairs 2 and 29 and 3 and 29 shared none; the criterion in `scenario.json` names the manager approval codes, the change that fixed it.

The seed pass runs at startup: it categorizes the seed, runs a second pass that must answer zero fresh questions, pins the seed results and the decisive user messages, checks the registry against the seed's `truth` topics and that every goal fact and ground-truth pair member carries a topic, makes the two seed calls that set the fixed cost and the token scale, and writes `seed.json` and a `seed:` line. A question whose judge call fails transiently has no record, so the second pass asks it again; the line reports questions asked, records answered, judge errors, and the undecided items apart. `seed.json` lists each undecided item in `undecided` with its state, its error, and, for a failure the run itself met, the readout summary.

### Ledger-mode fields

Each ledger-mode JSON line carries the fields of the other modes and the following:

| Field | Meaning |
| --- | --- |
| `briefing.recall` | The goal's `facts` covered at run entry (rendered in pinned items or verbatim in the tail) over the goal's facts. A later result of the same lookup with the same arguments covers a fact result it supersedes. `inPrompt` reads true when it is 1. |
| `briefing.precision` | Rendered pins whose source is a goal fact or its governing correction over rendered pins. |
| `briefing.topical` | Rendered pins any of whose topics is a truth topic of a goal fact over rendered pins. |
| `briefing.stale` | Under `--report roundA`, lines of the briefing and the tail at run entry that carry `MX-4471`, `ESC-2291`, or `restocking fee` with no `[amended by` marker while their governing correction renders nowhere in the prompt; lines whose source is a truth correction are skipped. Under `--report full`, every such line of the briefing, the tail, and the run's `recall` results counts unless its own source is a governing message, it carries the marker, or it reports the pin `ended: superseded`. |
| `briefing.facts`, `briefing.dated` | The goal facts covered at entry over the goal facts, and the same count over the goal facts plus the date line for a goal whose scorer accepts the clock date (g07): the date line counts as covered when the system text states the date or message 0 renders. The `MODE.md` settings line sums both over the goals. |
| `usage`, `usageAgent`, `usageJudge` | Under `--report roundA`, `usage` is the last pass's usage. Under `--report full`, it sums every agent call of every pass and the judge questions of the goal's select sites, and the other two fields hold the two parts. |
| `toolsSatisfied`, `toolsOk` | Under `--report full`, the lookups whose result the entry briefing renders on the request's record: the lookup's id is an entity of the request, or the order's own result states it is for an account that is. A desk topic never links a result to a request. `toolsOk` counts each of them as done. |
| `calls[].hash`, `calls[].replyHash` | The sha256 of the exact request body string, and the sha256 of the streamed content with the tool calls' names and arguments, call ids left out. Equal `hash` and `replyHash` on every call prove a rerun reproduced; the first equal `hash` with an unequal `replyHash` marks a daemon divergence. |
| `calls[].load_duration`, `calls[].prompt_eval_duration`, `calls[].eval_duration`, `calls[].cached` | The daemon's durations in nanoseconds and `prompt_eval_cached_count`, when the done record reports them; `calls[].prompt` is `prompt_eval_count`. |
| `profile`, `changes`, `scenario`, `clock` | The profile, every change flag's effective value, the scenario path, and the clock after the goal. |
| `briefing.tokens`, `briefing.room`, `briefing.over` | The scaled estimate of the briefing, the room the budget left it beside the tail and the system string, and whether a request-topic source was left out of both the briefing and the tail. |
| `briefing.seed` | The seed indices covered at run entry. |
| `pins` | Pins written this run by origin (`model`, `loop`), by route in `pins.routes` (`tool`, `deny`, `settle`, `auto`, `touch`), and `untopiced`, the live pins whose source has no topic. |
| `ends` | Pins ended this run by cause. |
| `refusals` | `pin` refusals by reason: `unresolved`, `assistant`, `token`, `superseded`, `amended`. |
| `questions` | Fresh judge questions this run by question, reused records, undecided items skipped for a held failure, and judge seconds. |
| `request` | The request's decided category and its topics, as the select site read them. |
| `recalls`, `reads`, `collisions` | The `recall` and `read` calls and the refused duplicate call ids. |
| `separation` | Request bodies that carry the text of a result produced before the run entry outside pinned items or this run's tool messages, each read beside the plan of the agent run that sent it, plus 1 when the run entry had no `select` event or had a `fault` event. |
| `gate`, `denials` | The `--gate` value, which also names the system text, and the gate's own denials, or its holds under `--reply terminal`. |
| `replyMode`, `replyVia` | The `--reply` value and the route the reply took, as the section on the reply gives them. |
| `passes` | One entry per agent run of the goal: `kind` (`first`, `reminder`, `hold`, or `answer`), its agent calls in `turns`, the desk `note` it ran after, and its final `content`, `partial`, `exhausted`, `aborted`, and `error`. The `partial`, `exhausted`, `aborted`, and `content` fields of the row are the last run's, `error` is the first run's, and `followError` is the first error of a later run, absent otherwise. |
| `holds` | Each hold under `--reply terminal`: the note and the answer it held. |
| `stop` | `repeat` when the repeat stop ended the goal's first run, absent otherwise, as in the main harness. |
| `budget`, `tail`, `horizon`, `ctx`, `scale`, `fixed` | The settings, the token scale after the run, and the fixed cost in tokens the scale leaves out. |
| `briefing.projected` | The first call's prompt as the plan priced it: the fixed cost plus the scaled system message and tail. |
| `repeats` | The repeated `recall` and `read` calls of the run that got a pointer. |
| `lookupRepeats`, `tools[].repeat` | The lookups the goal answered with the repeat notice, and `true` on each such call, as in the main harness's `repeats` and `tools[].repeat`. |
| `calls[].tools` | The tools the call advertised: 6, or 3 after the arm tools closed, under `--reply tool`; 5, or 2, under `--reply terminal`; 0 in the answer run. Under `--arm-tools recall` the open set loses `pin` and `read`, and under `--cache stable` every call of a request advertises the open set. |
| `fabricated` | Id-shaped and numeric tokens in the answer that no user or seed message and no lookup, `recall`, or `read` result states. An id-shaped token is stated when that text holds it in any case with each hyphen written as a hyphen, a space, or a tab on one line, so `5-quart` restates `5 quart`. A number is stated when that text holds it, or when the answer writes it as a dollar amount equal, to the cent, to the sum or difference of two dollar amounts that both the answer and that text state, so `$3,760 ($5,000 - $1,240)` restates the two amounts. A product, a percentage, a chain of steps, a sum whose operands the answer leaves out, or a sum with an operand that is no dollar amount counts as invented, so `$280.00` beside `$289.00` and `October 9` does, and so does a date restated in words, such as `October 9, 2026` for `2026-10-09`. |

`toolsExpected` reads `recall` where the goal lists `search_history`, and leaves it out when `inPrompt` is true. The ledger-mode table adds a lookup repeats column after turns, and the columns briefing recall, briefing precision, stale, judge questions (fresh, with the pair questions in parentheses), pins model/loop, and denials. `memory.log` holds `ollama ps` and the resident size of every `llama-server` process after the seed pass and after each goal.

### Category calibration

The `--calibrate-categories` flag runs no agent. Over the seed it asks `category` for the 41 messages without calls in both option orders, the `topic` nouls for the same messages without the chatter gate, and `amends` and `supersedes` for every ground-truth pair and every pair of a truth correction with an earlier message that shares a truth topic. It asks in the order the settings rest on: categories, pairs, the topics of the other messages (goal facts and pair members first), the reversed categories, then the topics of chatter and distractors. A `SIGTERM` ends the asking after the question in flight and still writes `calibration-categories.jsonl` and `calibration-categories.md`. To resume a stopped run, pass its `calibration-categories.jsonl` to `--judgments` with a fresh `--out`: the matching records answer without a call, and each row carries the question text it answered in `asked`, so a changed criterion is asked again. The tables give the category separation per order and the lean toward the first option, the chatter gate, the auto-pin class, the correction floor, the topic separation and acceptance, and the pair separation, each per threshold from 0.50 to 0.95. `--goals` is not read.

The seed's `truth` member on each message holds its category, its topics (entity ids as the seed's own lookups register them, plus desk topics), and, on a correction, the `amends` or `supersedes` indices it replaces; a `supersedes` index also counts as `amends`.

### The ledger fixture

The `--check-ledger` flag replays handmade messages, judge records written as data, and runs, with no model and no judge. It checks the registry against the seed truth, the wrapper's numbering, the results store, the token check and every refusal, source inference, the dedupe and collapse rules, `recall` and `read` (a handle as the topic, the cut notice, the repeat pointer), retirement after `--horizon` untouched runs with a fresh pin on a later touch, a rule that never retires, expiry by the clock, supersession by a judge record and by a repeated lookup, the tally bound, the omission order, and that no build renders an ended pin. Handmade unit cases check the fixed cost and the scale, the `recall` room at the marginal rate beside the reply reserve, the failure store against a transient error, an amending message that renders beside its source while the tail carries it, and tail messages with their stored content.

A further set of unit cases takes each fault of the 2026-10-08 records `results/v3/ledger-deny` and `results/v3/ledger-admit` in turn: the system message and the tail of the seed conversation at the recorded fixed cost stay inside the budget less that cost; a repeated `recall` and a repeated `read` get the pointer and the run then advertises the shared tools alone, with their definitions unchanged; a closed tool refuses with the order to answer; the arm tools close when the latest call left too little room and stay closed after a call that left more; a run that closed its arm tools leaves the marginal rate at its open-tools slope; the gate admits a reply at the deny g08 room (prompt 2633, completion 124) and denies it at prompt 1800; a value that copies its whole source pins whole; a `send_reply` stub never repeats its text; an earlier run shows in the tail as its request, its lookups, and its reply once; an unpinned request-topic message renders and is omitted before any request-topic pin; a topic recall carries the correction of a listed source; an `amends` reading with no shared id or number marks nothing; and a name word one alias carries names its account while a word two aliases carry names neither.

A set of stub-provider passes drives the arm's goal loop, the same `runGoal` the live mode calls, with a scripted provider and a fixture judge, once per reply route. Each pass asserts `replyVia`, the reply text, the tools each agent run advertised, and the user messages the loop appended: under `--reply terminal`, a final message, an empty final content and a run at the turn limit, with other arguments at each turn, that each run once more under the answer scope on the planned prompt with no added message, a hold under `--gate deny` with the exact note and the second answer delivered, a hold whose run yields no text, no hold under `--gate admit`, and a stray `send_reply` call that never spends the hold, and a hold of the answer run after the repeat stop; under `--reply tool`, a first `send_reply`, the exact reminder followed by `send_reply`, and plain text delivered with its label and quotes stripped; in both modes, an overflow that ends the goal with no reply and no further run, and the same lookup twice, where the second call gets the design's notice as a failed call with no handle and ends the first run with reason `repeat`, which the answer run follows under `--reply terminal` and the reminder and `send_reply` under `--reply tool`, and the next goal's same lookup gets its record while its tail shows the lookup once and no notice. The next goal's tail shows the delivered final answer or the sent reply once, with no note and no turned-back answer. It also checks the terminal system text against the scenario text, the notice texts against the main harness's, and that an agent request carries the pinned options with `think` false. Two think-on passes drive the same loop through the real provider behind a stub transport that streams thinking before content: a lookup, a held answer under `--gate deny`, the delivered answer, and a second goal, then a call whose thinking spends `num_predict` with no content followed by the answer run. They check that every request asks for thinking with `num_predict` 1024 and the `--model` model, that no request message carries a `thinking` field or the thinking text, the hold prompt and the next goal's system message and tail included, the per-call thinking lengths and completions, the `cut` calls, and that the hold and the answer run take the routes they take with think off. A scoring set scores the 58 fixed texts of the main harness's `--probe-score` with the scenario rules, among them `not **ESC-2291**` (g04, passes) and `by **Friday**` (g07, fails), checks the success rule on a reply, an empty reply, and a first run that threw, and checks the `fabricated` rule on restated, computed, and invented tokens, among them an amount that equals a dollar amount minus a date part and an id the corpus spells only across a line break.

It then replays the recorded run `--replay` names. The calibration records answer the seed questions, and a stub judge answers only what the replay declares: each request reads the category and the desk topics its row records in `request` (no option over the fit where the row reads `null`), or, for a record without that field, `request` with the desk topics in `REPLAY_REQUEST_TOPICS`; the seed's one `amends` question on messages 3 and 27 reads no, because the run asked no `supersedes` question after it. Every other fresh question fails closed. The recorded tool calls and canned answers rebuild each run's messages through the tool wrapper, with call ids as long as the daemon's; a call the record shows failing replays as that failure without running, a refused `send_reply` with its recorded reason after the `deny` listener's pins, and a last agent call that returned no tool call and no error leaves its assistant message, as the loop does. The recorded agent calls feed the scale, the marginal rate, the `recall` room, and the closing of the arm tools. The fixed cost is the seed record's prompt minus its call without tools, or, for a record without that call, the intercept of a least-squares line through the recorded calls (691 tokens for `results/v3/ledger-deny-first`). The budget and the tail share come from the flags, so the replay shows the sizing under test.

With the code of 2026-10-08 before the budget, tail, and briefing changes, the replay reproduced the recorded briefing tokens, seed coverage, and tail length of all 10 goals of `results/v3/ledger-deny`, and the tokens and coverage of all 10 goals of `results/v3/ledger-admit`, where the admit g08 tail held one message more than the record; the record keeps no assistant text beside a call, which is the likely gap.

It prints each goal beside the record: the first call's prompt projected at the larger of the plan's scale and the rate the goal's recorded first call measured, the briefing, the coverage, the tail, the separation, and the message count. It checks that every goal fact renders at entry; that a briefing omitting a request-topic pin renders no pin off the request's topics; that the scale holds steady; the g03, g04, g05, and g06 facts and the g05 lookup the request names by `Luis` alone; that every first call projects at or under the budget share and leaves the longest growth of a replied goal in the record; that every repeated `recall` or `read` of the record gets the pointer or the closed refusal, and the shared tools alone after it; that every goal the window cut has its arm tools closed at or before the cut call; that no tail carries an earlier `recall`, `read`, or `pin` call or a reply text twice and no first call carries an earlier result's text; that seed 11 renders at g06 and g09; that every amended mark in a recall result names a line of it and no recall lists a run's request; that the gate admits the reply the record refused in a goal the window then cut; that a run's first recall appends at most half of what its call left; that no value line repeats its source; that messages 40 and 43 carry no amended mark while 22 and 2 keep theirs; that every lookup the record repeats in one goal gets the notice; that max prompt tokens counts each refused call's requested prompt; and that the rebuilt conversation holds the recorded message count after every goal. It also prints how many recorded replies the scorer passes beside the record's count, and each goal whose verdict changed. A check whose record holds nothing to replay prints a line instead of passing empty. It exits 0 only when every assertion holds.

### Where the mode departs from the record

The following points are the nearest build the public API allows, or a reading the record leaves open:

- Results separate at the prompt only: `Agent.ts` still stores each result as the tool message's content, behind the wrapper's prefix.
- The registry registers a lookup argument only when its lookup returned a record, so an account number passed as an order id never types as an order.
- The tally adds a `no topic` row for omitted pins and remainder messages that carry no topic, because `recall` reaches them only by words.
- `briefing.stale` reads "the correction beside them" as the governing correction rendering anywhere in the briefing or the tail.
- `--judgments` is an addition, so a run on a shared daemon can reuse calibration records instead of re-asking the seed pass.
- `owed` follows the record's definition, so the settle step also pins a result that a later lookup in the same run has already superseded; that pin ends at once.
- The tail carries no `[mN] ` prefix, no amended mark, and no handle in a stub, where `BRIEFING.md` section 3 prefixes each tail message and puts the handle and pin state in each stub; this applies finding A7 of `results/AUDIT.md`.
- An amending message renders in pinned items beside the source it amends even when the tail carries it, and a value line's source renders there even when the tail carries it, so every handle the briefing names is a line of the briefing.
- The briefing's room is the budget, less the fixed cost of the tool schemas and framing, minus what the tail used, where the record gives the briefing the budget minus the tail's whole share and leaves the fixed cost outside the budget; the scale leaves out the fixed cost, where the record divides the whole prompt count by the estimate.
- The briefing renders a user message no pin holds when it is on the request's topics or shares a name with the request, renders other topics only by a shared name, and folds the other topics of the tally into one row, where section 3 renders every live pin while room allows.
- The tail shows an earlier run as its request, its lookups, and its sent reply as text, where section 3 keeps every call group of the window.
- A repeat or a low room closes `pin`, `recall`, and `read` for the rest of the run, and the gate admits a reply the room cannot retry; the record names neither.
- A question that fails on repeating top logprobs is held undecided, where section 4 asks every failed question again at the next select site.
- `recall` takes a handle as its topic and lists a live reference pin only through its source line, where section 3 lists every pin on the topic.
- `briefing.recall` counts a fact result covered by a later result of the same lookup with the same arguments, which supersedes it.
- The answer run reads a scratch conversation, because the package selects only when the view ends on a user message and the answer run appends none; without it the run would read the whole conversation outside the budget.
- The replay rebuilds a record that names no `replyMode` as a `--reply tool` run, the mode every record before the flag ran in.

## Sampler options

Every agent and summarizer call, and both seed calls that measure the fixed cost, send the options `num_ctx` (`--ctx`), `temperature` (`--temperature`, default 0), `seed` (`--seed`, default 7), `presence_penalty` 1.5, `top_k` 20, and `top_p` 0.95. The last 3 are the values of the agent model's params blob, `sha256-9371364b`, which the daemon applied when a request omitted them, so a run at the defaults samples as the 2026-10-08 runs did and its request states every value. The settings line of the ledger-mode `MODE.md` prints them. Under `--think`, agent calls add `num_predict` 1024. The judge's options are unchanged.

## Thinking mode

The `--think` flag asks the agent model for a thinking pass, so you can measure whether thinking changes the replies. Under it, every agent call, the reminder, hold, and answer runs included, sends `think: true` and adds `num_predict` 1024 to its options; the cap bounds thinking and content together, so a call that thinks without end still returns. Summarizer and seed-measurement calls send `think: false` and no `num_predict`. The judges are unchanged: `createJudge` takes no think setting, the Mica judge sends a raw `/api/generate` prompt that closes an empty think block, and `tev1` asks the System One endpoint. Without the flag, every request body matches the body before the flag existed.

Thinking text never reaches a later request. The harness provider returns the streamed `thinking` apart from the content; the package adds an assistant message with only its content and tool calls to the conversation; and `mapMessages` sends only `role`, `content`, and `tool_calls`. The ledger's briefing and tail read that conversation, so neither can carry thinking. The think passes of `--check-ledger` check every request body for a `thinking` field and for the thinking text.

A run whose final turn has empty content after thinking ends naturally with empty content, so under `--reply terminal` it takes the answer run, and under `--reply tool` it ends with no reply, as an empty final does with think off.

The gate, the reply reserve, and the recall room are the same code under both settings. They read each agent call's `completion`, which under `--think` counts the thinking tokens too: the reply reserve and the refusal retry the gate prices include the reply's thinking, which the reply turn generates inside `num_ctx`, and the room a call left reads lower by its thinking than the next prompt grows, because no thinking returns in it. Under `--think` the arm tools therefore close earlier and the gate admits an unpinned reply sooner than at the same prompt with think off.

The done record carries no separate thinking count, so each agent call records `thinking`, the length of its thinking text in characters, beside `completion`, the done record's `eval_count`, which counts thinking and content together. A call is `cut` when it ended truncated, as the truncated column defines, with no content and no tool call: its generation went to thinking. The JSON line sums both over the goal's agent calls, and the summary line of `MODE.md` opens with the mode, the agent model, and `think on` or `think off`, and under `--think` ends with the cut calls over all agent calls and the summed thinking characters.

## Fixes on 2026-10-08, after the v6 head-to-head

The following changes mirror the main harness's fixes after `results/v6/diag/DIAGNOSIS.md`, so the ledger arm is scored and sampled as the main harness's arms are. They change the request bodies, the scenario rules, and the row fields, so ledger runs before and after them do not compare:

- Every agent call sends the pinned sampler options, as the earlier section on sampler options describes, and `--temperature` and `--seed` set the first two.
- The scorer is the main harness's, as the earlier section on scoring describes, and `success` follows the main harness's rule, with `followError` for a later run's error, as the earlier section on the reply describes.
- A repeated lookup in one goal gets the main harness's notice and ends the run, as the earlier section on the `pin`, `recall`, and `read` tools describes.
- `max prompt tokens` counts a refused call's requested prompt.
- The goals of `scenario.json` take every scoring member of the main harness's goals: `expected`, `expectedAny`, `forbidden`, `forbiddenPatterns`, and `tools`. The other goal members, the seed and its `truth` members, the `ledger` member, the system text, and the notes are unchanged.

The goals take the main harness's members whole because 6 of the 14 operations of the main harness's scenario patch (`results/v6/fixwork/scenario-patch.json`) cannot apply to this scenario: its g08 has no `expectedAny` to replace, and its g08 and g10 have no `forbiddenPatterns` to append to. This scenario predated the main harness's notes change (6), so the goals also gain that change: the negation-aware patterns that replace the plain forbidden values of g01, g04, and g05, the Friday-deadline pattern of g07 and g10, and the g08 verdict list and its `exceeds`, over-the-limit, and not-enough patterns. Rescored with these rules, `results/v3/ledger-deny` passes 2 of 10 as recorded, `results/v3/ledger-admit` passes 3 of 10 against the recorded 4, because its g10 reply gives the switchboard 555-0142 as Sigrid's direct line, and `results/v3/ledger-deny-first` passes 0 of 6 as recorded.

## Changes on 2026-10-09, before Round B

The following changes mirror the main harness's changes after the Round A grades in `/home/user/agent/tmp/bench/results/v7/`. At the default flags they leave every agent request body unchanged:

- The goals of `scenario.json` take the main harness's 10 patch operations from `results/v7/prepwork/scenario-patch.json`, so the scoring members of both scenarios stay member for member equal: g08's `expectedAny` adds `sufficient` and `would be approved`, with 2 patterns for their negations; g05's MX-4471 pattern skips a retirement phrase before or after the code; g03 fails a reply that gives ESC-2291 or MX-4471 as current; and g07's bare `Friday, October 9` alternative skips a day-off phrase such as "off work tomorrow (Friday, October 9th)". The 6 review fixes of `results/v7/prepwork/fix/fix-scenario.mjs` follow on both scenarios: the parenthesis that exempts MX-4471 or ESC-2291 must retire that id, g08's `sufficient` negation adds `no`, `nor`, `without`, `lack`, `short of`, and every `n't` form, g07's day-off phrase before `tomorrow (` holds only day-off words, and g07 fails a reply whose every `today` states a day off. The main harness's README gives each pattern.
- `--think` and `--model`, as the earlier sections on flags and thinking mode describe. The records gain `model` and `think`, and the settings line names the agent model and the think setting. The main harness's `--summary-model` has no counterpart here; the summarizer keeps `qwen3.5:2b-q4_K_M`.
- `fabricated` no longer counts a token the corpus states in another case or with a space for a hyphen, or a dollar amount that is the sum or difference of two dollar amounts the answer and the corpus both state, as the earlier section on ledger-mode fields defines. Recounted over the recorded answers with the seed, the goal requests, and every lookup record as the corpus, `results/v7/ledger` flags 2 replies against the recorded 4: g05's "5-quart" and g08's "$3,760.00 ($5,000 - $1,240)" clear, and g06's "5-7" and "2026" and g07's "9" and "2026" stay. `results/v3/ledger-deny` flags 0 replies and `results/v3/ledger-admit` flags 2, as recorded.

## Profiles and the refinement of 2026-10-09

The fixes and trims of `/home/user/agent/tmp/bench/results/v8/ATTACK-BRIEFING.md` each have their own flag, so you can switch one off for an ablation. The `--profile` flag only sets their defaults: `roundA` reproduces the v8 run, and `refined`, the default, turns every change on. A ledger command that names no profile runs `refined`; to repeat a Round A command, add `--profile roundA`. The `MODE.md` settings line and the `settings:` line of the run print every effective value.

The following list gives each change, its flag and refined value, and its offline proof. Every proof ran on 2026-10-09 with no request to the daemon:

- F1, `--date on`: the system text states `Today is Thursday 2026-10-08.` from `ledger.clock` after its first sentence, where the control has it, and the clock stays on that date for the whole shift. The replay of `results/v8/ledger` finds the sentence in all 10 first-call system messages and the same clock at g01 and g10, and coverage over the goal facts plus the date line reads 19 of 19, against 18 of 19 under `roundA`.
- F2, `--tail-answers drop`: the tail leaves out the model's earlier final answers and sent replies and opens on a user message. The replay finds no earlier answer in any tail, a user message first in all 10 tails, and 18 of 18 goal-fact slots at entry, with m44 at g01 and m40 at g02.
- F3, `--rules last`: every user rule renders one sentence a line in a `## Rules` block at the end of the briefing, so the rules sit nearest the request; a correction that amends a rule renders beside it, and the amended mark goes on each sentence that shares an id or number with the correction. The code splits sentences, so no judge question is added, and no rule is filtered by topic. In the replay g06 shows m6 as 2 lines with the delivery-date sentence on its own line, g07 shows m8, and g05 shows `m2: This week's code from Marcus Oyelaran, our escalations manager, is MX-4471. [amended by m29]` with m29 next to it. Every goal renders the same 4 rules, m2, m6, m8, and m18, with m29 beside m2.
- F5, `--handles bare`: lines drop the role word, `recall` takes a leading handle token, and the system text ends on `Never cite a handle such as m12 or r5 in your answer.` In the replay no briefing line matches `^[mrp]\d+ (user|assistant):`, and the g03 recall of `m18 user` returns the m18 line.
- F6, `--cache stable`: every agent call of a request carries the first call's system message and tool list. A stub-provider fixture with a lookup, a repeated `recall`, a closed `recall`, and a hold sends 6 bodies with one system message and one tool list, each prompt extending the one before; the same goal under `roundA` drops the arm tools after the repeat and renders the system message again for the hold.
- F7, `--autopin named`: a decisive user message is auto-pinned only when it carries an id, a number, or a name, and an unpinned one renders only under the same test. The replay leaves m9 unpinned and unrendered and keeps the other 12 auto pins.
- F8, `--report full` and `--tally once`: as the earlier section on ledger-mode fields gives them, plus the per-call `hash`, `replyHash`, durations, and `cached` count in every profile. The wire replay under `--profile roundA --report full` sums `usage` in 10 of 10 rows (g01: 9862 = 8599 agent + 1263 judge prompt tokens) and reads `toolsOk` yes for g03, g05, g07, and g09; a fixture counts a pin on 2 request topics once under `--tally once` and twice under `roundA`. A second fixture reads `toolsOk` no when the only rendered result of the needed lookup is another customer's order on the request's desk topic, or an order whose text names the request's account but is for another account, and yes for the request's own order or an order the request names.
- Trims: `--gate admit`, `--arm-tools recall`, `--tally off`, `--horizon 99`, and `--request-questions topics`. Under them the replay retires no pin and asks each request 5 questions in place of 7, and a dry run of the live path through recorded judge answers matches 51 of 51 judge request bodies to the v8 recording.
- Stale scan: under `--report full` a fixture that renders m3's `MX-4471` without its marker beside m29 reports `stale` 1, where `roundA` reports 0; an unmarked `ESC-2291` in a recall result line counts too.
- Expiry and changed lookups: a fixture pin whose `until` passes the clock leaves Pinned, and `recall` lists it as `ended: expired`; a repeat lookup that returns changed text ends the older pin, and only the changed text renders.

The `roundA` profile sends the v8 request bodies byte for byte. The helper `/home/user/agent/tmp/bench/results/v8/refinework/wire-replay.mjs` answers each request with the recorded response of `results/v8/ledger-wire` and compares each body with the recorded one. With `--scenario scenario.json.pre-refine`, 122 of 122 bodies are identical (71 judge, 40 chat, 11 `ps`), and 38 of 38 agent `hash` values equal the recorded body hashes. With the F4 scenario, 117 of 122 are identical; the 5 that differ, 00099 to 00101 and 00120 to 00121, are the calls that carry the LH-31055 result. Each change flag added alone to `roundA` changes the bodies, and `--report full` alone changes none.

Run the offline proofs with the following commands:

```sh
node /home/user/agent/tmp/bench3/bench.mjs --check-ledger --profile roundA --replay /home/user/agent/tmp/bench/results/v8/ledger --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl
node /home/user/agent/tmp/bench3/bench.mjs --check-ledger --profile refined --replay /home/user/agent/tmp/bench/results/v8/ledger --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl
cd /home/user/agent/tmp/bench/results/v8/refinework && WIRE_DIR=../ledger-wire WIRE_REPORT=wire.jsonl node --import ./wire-replay.mjs /home/user/agent/tmp/bench3/bench.mjs --mode ledger --profile roundA --scenario /home/user/agent/tmp/bench3/scenario.json.pre-refine --reply terminal --judge mica --judge-ctx 4096 --ctx 3072 --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl --out out && node wire-summary.mjs wire.jsonl
```

The replay of a `--reply terminal` record follows each recorded pass: one tool call a turn, the final answer, the hold note after an answer the gate held, and the recorded cue before an answer run, as `byAnswer` and `answer` write them. Under `roundA` it takes the record's gate and horizon unless a flag names them, and it checks that the gate holds the recorded answers with the recorded notes. Before this, the replay of `results/v8/ledger` failed 3 checks (exit 1): the repeat pointer, the narrowed tool list, and the message count, because it modeled no hold.

F4 changes one canned lookup in `scenario.json`, so 555-0142 belongs to the account manager and is no longer a line for Sigrid. The seed and every judge state are unchanged, so the recorded judgments stay valid, and g08's `expected` `albrecht` still matches. The text before and after follows:

```text
before: Account LH-31055: Halvorsen Interiors, wholesale tier, net 30 terms, credit limit $5,000.00 with $1,240.00 outstanding. Account manager Ines Albrecht; phone is the main switchboard 555-0142.
after:  Account LH-31055: Halvorsen Interiors, wholesale tier, net 30 terms, credit limit $5,000.00 with $1,240.00 outstanding. Account manager Ines Albrecht, direct line 555-0142.
```

The following points limit what these proofs show:

- The replays rebuild the recorded conversation, holds included, under the flags; what the 2B answers from a refined prompt is unmeasured until a live run.
- Under `--cache stable` with `--answer-cue off` the answer run keeps the tool list and refuses each call in its result, where `roundA` advertises no tool, so a model that keeps calling tools there ends at the 8-turn limit with no reply. The `refined` profile sets `--answer-cue on`, which advertises no tool there.
- Every judge reading still comes from the v3 calibration import, fitted on this seed; `--probe-filing` re-asks the 6 seed messages the attack rests on, against the daemon.
- The `notes` member of `scenario.json` still calls 555-0142 the switchboard decoy; F4 changed the lookup text alone, so both scenario files stay identical.

## Answer cue and recall budget, 2026-10-09

Under `--profile roundA`, 3 goals of the A1 sweep in `results/v9` ended with no reply, each in an answer run that wrote no text: g04 of `a1-ledger-v1` after the repeat stop, where the answer run made a tool call; g03 of `a1-ledger-v3` after 8 `recall` calls that walked message handles to the turn limit; and g04 of `a1-ledger-v3` after recalls and lookups of other ids to the turn limit, where the answer run generated 754 tokens and no reply text. The main harness's answer run reads its `ANSWER_CUE` last and advertises no tool; this harness's answer run read no cue and, under `--cache stable`, kept the tool list. Two flags close that gap, each `off` or unbounded under `roundA` and on under `refined`:

- `--answer-cue on`: the answer run reads the main harness's cue as its last message, a desk note, and advertises no tool, under `--cache stable` too. When it still writes no text, the goal has no reply. A check reads the constant from `tmp/bench/bench.mjs` and finds the same text.
- `--recall-budget 2`: after 2 `recall` calls in one request the arm tools close for the rest of the request, so a later `recall` reads `recall is closed for the rest of this request; give your final answer from what you have`. Each request counts its own recalls. The flag reads `unlimited` or plain decimal digits and refuses any other form, such as `1e1` or `0x2`.

At their `roundA` values, `--answer-cue off` and `--recall-budget unlimited`, neither setting appears in the settings line of stdout and `ledger.md` or in the `changes` member of a `ledger.jsonl` row, so a `roundA` record has the shape of the A1 records written before the two flags existed. Either flag at another value names both.

The following list gives the offline proof of each claim. Every proof ran on 2026-10-09 with a fetch stand-in preloaded, so no request reached the daemon:

- Round A bodies: the wire replay of `results/v8/ledger-wire` with `--scenario scenario.json.pre-refine` reads 122 of 122 bodies identical, and the wire replays of `a1-ledger-v1-wire`, `a1-ledger-v2-wire`, and `a1-ledger-v3-wire`, each with its own `--scenario tmp/bench/variants/ledger/vN.json` and the sweep's flags, read 126 of 126, 121 of 121, and 134 of 134.
- The repeat stop: a stub-transport fixture under the `refined` change flags at `--gate admit` makes a lookup, a `recall`, and the same lookup; the answer run's body ends on the cue, carries no `tools` member and the first call's system message, and its text is the reply. Under the `roundA` flags the same answer run ends on the repeat notice, and under `refined` with `--answer-cue off` it advertises `lookup_order`, `lookup_customer`, and `recall`. The next request's tail leaves the cue out, and an answer run that still calls a tool ends the goal with no reply and no further run.
- The recall walk: 8 turns that each recall a different topic, handles first, run 2 recalls under `refined`; the other 6 read the closed recall, and the cued answer run after the turn limit replies. Under `roundA` all 8 run. A model that answers after the first refusal ends on that final answer with no answer run, and the next request of that ledger runs its first recall, which counts 1 against the 2 the earlier run counted.
- The turn limit: 3 recalls and 5 lookups of other ids reach the turn limit; under `refined` the third recall reads the closed recall and the answer run ends on the cue with no tool and replies, and under `roundA` the answer run ends on the last lookup result.
- The replays: under `refined`, the replays of `results/v8/ledger` and of the 3 A1 records find no goal running more than 2 recalls and every later recall failing. The F5 check of `m18 user` in `results/v8/ledger`, whose replayed call the budget closes, reads the handle from a direct recall after the replay; it does so only when the recalls of that goal that ran before the call reach the budget, so a refusal from a repeat or room closure fails the check, and a fixture holds that rule. The check that a recall by handle returns its source skips the recalls the budget refuses, so under `refined` it covers fewer recalls: the `a1-ledger-v3` replay passes it, where the harness before this change failed it on `m16 -> m16 is a result; read r2` and `m22 -> same as r14`. The `read r2` pointer names `read`, which `--arm-tools recall` removes, so a model can't follow it; that pointer is a separate defect this change leaves in place. A copy of `a1-ledger-v1` whose g04 answer pass records the cue replays to the recorded message count after every goal, which the harness before this change misses by 1 from g04 on.

The `--check-ledger` counts on 2026-10-09 follow, with no failure introduced. The 3 failures of the `a1-ledger-v3` replay under `roundA`, and the g05 coverage check under `refined`, fail before and after the change:

| Command | Profile | Checks passed | Exit |
| --- | --- | --- | --- |
| `--check-ledger` | `refined` | 194 of 194 | 0 |
| `--check-ledger` | `roundA` | 181 of 181 | 0 |
| `--replay results/v8/ledger` | `refined` | 196 of 196 | 0 |
| `--replay results/v8/ledger` | `roundA` | 183 of 183 | 0 |
| `--replay results/v9/a1-ledger-v1`, `v2` | `refined` | 195 of 195 each | 0 |
| `--replay results/v9/a1-ledger-v1`, `v2` | `roundA` | 183 of 183 each | 0 |
| `--replay results/v9/a1-ledger-v3` | `refined` | 195 of 196 | 1 |
| `--replay results/v9/a1-ledger-v3` | `roundA` | 181 of 184 | 1 |

Run the matrix with the helper `/home/user/agent/tmp/bench/results/v9/gapwork/proof.sh installed LABEL`, which writes each output under `gapwork/LABEL`, and the cue replay with `gapwork/cue-replay.sh installed`. In place of `installed`, a path such as `bench3/bench.mjs.pre-gap` runs that copy of the harness; `gapwork/base` holds its matrix.

## Tail requests, 2026-10-09

In `results/v9/a2-refined-v1`, the `refined` run on reworded copy 1, 2 replies answered an earlier request: g03, Grace's escalation, wrote Luis's refund and ran Luis's lookups, and g10, Sigrid's callback, wrote Luis's approval note. Under `--tail-answers drop` the tail kept every earlier request and its lookup stubs with no answer, so the g10 prompt, request 00097 of `a2-refined-v1-wire`, read as 6 unanswered requests, and the model answered an older one. The same prompt kept the g04 answer, because the model wrote it as text beside a `recall` call, and `--tail-answers drop` dropped only an answer with no call; the g03 text beside a lookup call leaked the same way. Over the first agent requests of g02 to g10 the recording carries 28 earlier requests and 9 earlier model texts.

Two changes close those paths:

- `--tail-requests drop`, the `refined` default: a request's tail holds the seed messages under the `--tail` cap and the request last. An earlier lookup result reaches the model through the briefing and `recall`. At `keep`, the `roundA` value, the setting appears in neither the settings line nor the `changes` member of a `ledger.jsonl` row, so a `roundA` record keeps the shape of the earlier records.
- `--tail-answers drop` drops the text the model wrote beside a call, answer runs included, and keeps the call, so no model-written answer reaches a later tail under `--tail-requests keep` either.

The following list gives the offline proof of each claim. Every proof ran on 2026-10-09 with a fetch stand-in preloaded, so no request reached the daemon:

- Fixtures: under the `refined` flags, goal 1 writes text beside a lookup call, text beside a `recall` call, and a final answer, goal 2 replies from its cued answer run, and goal 3 recalls the goal 1 lookup. With `--tail-requests drop` the first bodies of goals 2 and 3 carry the 6 seed messages and the request alone, and the goal 3 `recall` returns the lookup result. With `--tail-requests keep` the goal 3 body keeps both earlier requests and the lookup call and carries none of the 4 model texts, which `--tail-answers keep` shows. Both tail fixtures fail on the harness before this change. A third fixture runs 3 recalls in goal 1, the third reading the closed recall, then 1 recall in goal 2, which succeeds; the runs count 2 and 1.
- Replays: under `refined` every replayed tail holds seed messages only and ends on its own request, and no tail carries model text beside a call.
- Round A bodies: the wire replays of `results/v8/ledger-wire` with `--scenario scenario.json.pre-refine` and of `a1-ledger-v1-wire` to `a1-ledger-v4-wire`, each with its own variant, read 122 of 122, 126 of 126, 121 of 121, 134 of 134, and 128 of 128 bodies identical.
- Dry render: `results/v8/refinework/dry-run.mjs` serves the `a2-refined-v1-wire` replies under `--profile refined` with `--scenario tmp/bench/variants/ledger/v1.json`. In the first agent request of each of the 10 goals, the messages after the system message are the seed's last 15 to 19 in order and the request; g01 is byte-identical to the recording. With `--tail-requests keep --tail-answers drop`, 9 tails keep earlier requests and calls, and no tail carries assistant text that no seed message carries.

The following table gives each goal's first prompt in tokens: the recorded `prompt_eval_count`, the plan's projection in the recording, and the projection of the dry render under `refined`. The dry render answers from the recording, so its own prompt count is unmeasured until a live run:

| Goal | Recorded prompt | Recorded projection | Projection under `refined` |
| --- | --- | --- | --- |
| g01 | 1608 | 1611 | 1611 |
| g02 | 1538 | 1542 | 1607 |
| g03 | 1882 | 1829 | 1742 |
| g04 | 1800 | 1824 | 1847 |
| g05 | 1682 | 1745 | 1679 |
| g06 | 1630 | 1667 | 1641 |
| g07 | 1627 | 1603 | 1804 |
| g08 | 1584 | 1599 | 1607 |
| g09 | 1708 | 1703 | 1647 |
| g10 | 1894 | 1855 | 1764 |

The `--check-ledger` counts on 2026-10-09 follow, with no failure introduced. The failures of the `a1-ledger-v3` replays fail before and after the change:

| Command | Profile | Checks passed | Exit |
| --- | --- | --- | --- |
| `--check-ledger` | `refined` | 198 of 198 | 0 |
| `--check-ledger` | `roundA` | 184 of 184 | 0 |
| `--replay results/v8/ledger` | `refined` | 200 of 200 | 0 |
| `--replay results/v9/a1-ledger-v1` | `refined` | 199 of 199 | 0 |
| `--replay results/v9/a1-ledger-v2` | `refined` | 199 of 199 | 0 |
| `--replay results/v9/a1-ledger-v3` | `refined` | 199 of 200 | 1 |
| `--replay results/v9/a1-ledger-v4` | `refined` | 198 of 198 | 0 |
| `--replay results/v8/ledger` | `roundA` | 186 of 186 | 0 |
| `--replay results/v9/a1-ledger-v1` | `roundA` | 186 of 186 | 0 |
| `--replay results/v9/a1-ledger-v2` | `roundA` | 186 of 186 | 0 |
| `--replay results/v9/a1-ledger-v3` | `roundA` | 184 of 187 | 1 |
| `--replay results/v9/a1-ledger-v4` | `roundA` | 185 of 185 | 0 |

Run the matrix with `/home/user/agent/tmp/bench/results/v9/tailwork/proof.sh installed LABEL`, which writes each output under `tailwork/LABEL`, and the dry render with `tailwork/dry.sh LABEL [FLAG]`, whose flags follow `--profile refined`; `tailwork/base` holds the matrix of `bench.mjs.pre-tail`.

## Known limits

- The `tev1:0.8b` model carries `num_ctx 2050` in its Modelfile, and the System One endpoint refuses a longer prompt with HTTP 400 without truncating it. The `stock` and `plain` states render the whole view, which exceeds that limit from the first goal, so every `tev1` selection faults and the lenient run builds from the unfiltered view. The default `--judge mica` measures selection on this scenario.
- In ledger mode the scale still varies with the mix of message kinds, because `estimateMessages` prices every character the same: over the 27 agent calls of the 2026-10-08 run in `results/v3/ledger-deny-first`, the least-squares line read 1.405 tokens per estimate unit plus 691 fixed tokens, with a largest residual of 99 tokens, while the seed prompt reads 1.22 per unit after the same fixed cost.
- On this host, Mica at `num_ctx` 4096 beside qwen reached about 10.9 GB resident and the memory cgroup killed it twice during the ledger smoke on 2026-10-08 (kernel log); a killed judge returns `model runner has unexpectedly stopped`, the item stays uncategorized, and the question is asked again.
- Mica answers 8 of the 364 seed questions with `invalid or duplicate top logprob token` on every attempt (2026-10-08). The failure store holds them undecided, so the topics they would decide stay unassigned: message 2 and acknowledgment 3 carry no `warehouse` topic, and message 10 no `escalations` or `warehouse` topic. The record holds no readout for them, so which tokens repeat is unmeasured until a live run records it in the fault.
- The 2B echoed the `[mN] ` prefix and the `[amended by mK]` mark the tail carried before finding A7 was applied: the 2026-10-08 g01 smoke answered in content beginning `[m48] `, and the g01 answer of `results/v3/ledger-deny-first` began `[m49] ` and ended `[amended by m44]`. The wrapper's `[rN] ` before each result of the run in progress remains, because the `pin` duty names it.
- The category judge reads message 11, the gift note g06 and g09 need, as a request at 0.73, so auto-pinning never pins it; the briefing reaches it as an unpinned message on the request's topics or by the names it shares with the request.
- A model that calls a closed tool anyway, or looks up other arguments, still appends its call and its result, about 65 tokens a call in the 2026-10-08 records; a repeated lookup appends its call and the notice once and ends the run. Only the 8-turn limit of a goal bounds the other calls; `--recall-budget` bounds the recalls that run, and nothing ends a run with a reply the model did not write.
- The replays project each first call at the token rate the recorded goal measured on the record's own prompt; no live run of the 0.7 budget, the tail, or the briefing order exists, so what the 2B does with the smaller prompt is unmeasured.
- The `estimateMessages` count runs about 30 percent under the qwen token count on this scenario and excludes the advertised tool schemas: on 2026-10-08 the first call measured an estimate of 1714 against 2516 prompt tokens. Set `--window` with that gap in mind.
