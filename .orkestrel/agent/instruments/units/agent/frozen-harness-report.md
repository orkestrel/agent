1. **CONFIRMED — reasoned from code, with the established wire replays.** The attack was to find an unconditional change reaching Round A’s prompts, judgments, or row fields. The added behavior is disabled by Round A’s defaults; its settings omit the added flags, and its passes omit `digest`. The recall refactoring preserves the unsplit path. See [bench.mjs:2573](/home/user/agent/tmp/bench3/bench.mjs:2573), [bench.mjs:2585](/home/user/agent/tmp/bench3/bench.mjs:2585), and [bench.mjs:3456](/home/user/agent/tmp/bench3/bench.mjs:3456).

2. **CONFIRMED.** The attack combined earlier requests, text beside calls, results, final answers, and an answer-run cue before another goal. The offline check passed. The tail stops before the first goal request, while continuation messages start after the current request. Neither path admits an earlier goal’s messages. See [bench.mjs:1996](/home/user/agent/tmp/bench3/bench.mjs:1996), [bench.mjs:1900](/home/user/agent/tmp/bench3/bench.mjs:1900), and [bench.mjs:4547](/home/user/agent/tmp/bench3/bench.mjs:4547).

3. **BROKEN.** Call `recall({"topic":"m0"})` twice using the same call ID. The second execution returns the repeat error, but `record()` retains the first successful result. The listener therefore misses the repeat and continues the first run. The probe returned `via:"final"` with one pass; changing only the second call ID returned `via:"answered"` after an abort with reason `repeat`. See [bench.mjs:1359](/home/user/agent/tmp/bench3/bench.mjs:1359) and [bench.mjs:3165](/home/user/agent/tmp/bench3/bench.mjs:3165).

   The smallest fix is to detect the repeat from the result being emitted. In the tool listener, insert this declaration and replace both `ledger.repeated(call.id)` expressions with `repeated`:

   ```js
   const repeated = !result.success && result.error === REPEAT_NOTICE[ledger.replyMode]
   ```

4. **BROKEN.** The live answer request for a4-refined-v1 g04 retains assistant tool-call messages from the seed: `lookup_order` for LH-80941 and LH-79215. See [00038_api_chat-request.json:23](/home/user/agent/tmp/bench/results/v9/a4-refined-v1-wire/00038_api_chat-request.json:23), [00038_api_chat-request.json:57](/home/user/agent/tmp/bench/results/v9/a4-refined-v1-wire/00038_api_chat-request.json:57), and its [ledger row:4](/home/user/agent/tmp/bench/results/v9/a4-refined-v1/ledger.jsonl:4). This breaks the unqualified assistant-tool-call prohibition; the removal of current-request calls and results holds. The fixture checks only messages after the request, so it misses this live path. See [bench.mjs:4378](/home/user/agent/tmp/bench3/bench.mjs:4378).

   A separate probe breaks the digest requirement. In one goal, recall `m0` into `r1`, then recall `r1` into `r2`. In the next goal, recall `r2`, then repeat it. The answer note contains:

   ```text
   r1 recall {"topic":"m0"}: m0: Alpha record
   ```

   `#noteLine()` strips only one result prefix. See [bench.mjs:1933](/home/user/agent/tmp/bench3/bench.mjs:1933).

   The smallest fixes are these exact replacements. At [bench.mjs:3214](/home/user/agent/tmp/bench3/bench.mjs:3214), remove the `start` declaration and replace the `messages` declaration with:

   ```js
   const messages = collapsed
     ? prepared.messages.filter((message) => message.role !== 'tool' && (message.calls?.length ?? 0) === 0)
     : prepared.messages
   ```

   Replace `#noteLine()` with:

   ```js
   #noteLine(line) {
     if (CUT_LINE.test(line)) return undefined
     let text = line
     for (;;) {
       const handle = /^r\d+(?= )/.exec(text)?.[0]
       const source = handle === undefined ? undefined : this.resolve(handle)
       const lead = source === undefined ? undefined : this.#resultLead(source)
       if (lead === undefined || !text.startsWith(lead)) return text
       text = text.slice(lead.length)
     }
   }
   ```

5. **BROKEN.** A first-run timeout returns a partial result with an abort reason other than `repeat`. The probe produced `reply:""`, `via:"none"`, and only a `first` pass. A transport exception also produced no answer pass. The `quiet` condition excludes both paths. See [bench.mjs:3257](/home/user/agent/tmp/bench3/bench.mjs:3257).

   The smallest fix for the missing fallback is to replace that declaration with:

   ```js
   const quiet = ledger.answerView === 'collapsed'
     ? final(first) === ''
     : first.error === undefined && (
         first.exhausted !== undefined ||
         first.aborted === 'repeat' ||
         (first.result?.partial === false && first.result.content.trim() === '')
       )
   ```

   This preserves Round A’s branch and attempts one answer run for a refined first pass without a deliverable reply. The claim’s final exception also needs to include failed or interrupted answer runs: partial text is not necessarily a complete reply. `final()` deliberately rejects it at [bench.mjs:3237](/home/user/agent/tmp/bench3/bench.mjs:3237).

6. **BROKEN.** With seed messages `m0: Alpha record` and `m1: Beta record`, separate recalls return both records. `m0, m1` and `m0; m1` return “nothing”; `m0 and m1` and `m0 / m1` return only `m0`. Handle normalization runs before splitting, and the split search has no handle-resolution branch. See [bench.mjs:2352](/home/user/agent/tmp/bench3/bench.mjs:2352) and [bench.mjs:2365](/home/user/agent/tmp/bench3/bench.mjs:2365).

   The smallest fix is to split before resolving handles, collect the directly named sources, and merge them into the existing ordered, deduplicated collection. The following exact edits passed the four separator probes in memory, including a missing handle beside a valid one:

   - Move the existing `pieces` and `parts` declarations immediately before `const handle = this.normalize(query)`, and replace that declaration with:

     ```js
     const handle = parts.length === 1 ? this.normalize(query) : ''
     ```

   - Replace `const searches = parts.map((part) => {` with:

     ```js
     const direct = new Set()
     const namedPins = new Set()
     const wordsOnly = []
     for (const part of parts) {
       const named = this.normalize(part)
       if (!/^[mrp]\d+$/.test(named)) {
         wordsOnly.push(part)
         continue
       }
       const pin = named.startsWith('p') ? this.pins[Number(named.slice(1)) - 1] : undefined
       const source = pin?.source ?? this.resolve(named)
       if (source === undefined) continue
       direct.add(source)
       if (pin !== undefined) namedPins.add(pin.id)
     }
     const searches = wordsOnly.map((part) => {
     ```

   - In the pin loop, replace its two exclusion conditions with:

     ```js
     if (!namedPins.has(pin.id) && (matched.size === 0 || !intersects(this.topics(pin.source), matched) || !fits(pin.source))) continue
     // Keep the existing declaration of end between these conditions.
     if (!namedPins.has(pin.id) && (end === undefined ? pin.value === undefined : end.cause === 'retired')) continue
     ```

   - Replace the message-collection loop at [bench.mjs:2428](/home/user/agent/tmp/bench3/bench.mjs:2428) with:

     ```js
     for (const message of [...list].reverse())
       if (direct.has(message.id) || (listable(message) && fits(message.id) && (onTopic(message) || worded(message))))
         add(message.id)
     ```

7. **CONFIRMED.** The attack submitted three distinct recalls in one tool batch, then recalled again in another goal. The first goal executed two recalls and refused the third; the next goal executed its recall with count `1`. The budget resets with the run and is checked before execution. See [bench.mjs:1204](/home/user/agent/tmp/bench3/bench.mjs:1204), [bench.mjs:1340](/home/user/agent/tmp/bench3/bench.mjs:1340), and [bench.mjs:2330](/home/user/agent/tmp/bench3/bench.mjs:2330).

8. **BROKEN.** The schema excludes `category`, but the argument still changes truncation. At room `55`, recalling `Alpha` over the following two seed messages returns both; adding `category:"rule"` returns only the newest and a cut notice:

   ```text
   Alpha record with some useful extra information.
   Another Alpha record with more useful extra information.
   ```

   Filtering ignores the category, but `#callSize()` prices it. See [bench.mjs:2334](/home/user/agent/tmp/bench3/bench.mjs:2334) and [bench.mjs:2435](/home/user/agent/tmp/bench3/bench.mjs:2435).

   The smallest fix is this exact replacement for `#callSize()`:

   ```js
   #callSize(args) {
     const priced = this.recallCategory === 'off' && isRecord(args)
       ? Object.fromEntries(Object.entries(args).filter(([key]) => key !== 'category'))
       : args
     return estimateMessages([{ id: 'call', role: 'assistant', content: '', calls: [{ id: CALL_ID, name: 'recall', arguments: priced ?? {} }] }])
   }
   ```

9. **BROKEN.** Each following input failed under `scenario.json.pre-negation` and passed under the edited scenario:

   | Goal | Failing input |
   |---|---|
   | g04 | `ESC-2219 is the corrected ticket, but use the incorrect ticket ESC-2291 for Halvorsen.` |
   | g05 | `Refund $289.00. Marcus approves. Copy Priya Raman. MX-4486 is the corrected code, but use the incorrect approval code MX-4471.` |
   | g01 | `The price is $289.00, but pay the incorrect refund amount of $245.65.` |
   | g01 | `The price is $289.00, but pay the incorrect refund amount of $43.35.` |
   | g08 | `Albrecht: The $3,000 order can still be rejected because it will never fit.` |

   The stale-value exclusions treat “incorrect” as sufficient to excuse an instruction to use that value. The added `can still` phrase supplies positive credit-check evidence without expressing approval. See [frozen-harness-scoring.md:3](/home/user/agent/tmp/units/frozen-harness-scoring.md:3), [frozen-harness-scoring.md:69](/home/user/agent/tmp/units/frozen-harness-scoring.md:69), [frozen-harness-scoring.md:87](/home/user/agent/tmp/units/frozen-harness-scoring.md:87), and [frozen-harness-scoring.md:117](/home/user/agent/tmp/units/frozen-harness-scoring.md:117).

   The smallest safe fix is to revert the permissive changes until their checks distinguish rejection from instructions to use a stale value. The exact field patch, applied to each scenario and variant named in claim 10 using that file’s `.pre-negation` backup, is:

   ```js
   for (const index of [0, 2, 3, 4])
     edited.goals[index].forbiddenPatterns = before.goals[index].forbiddenPatterns
   edited.goals[7].expectedAny = before.goals[7].expectedAny
   ```

   Preserve the added `no … room` forbidden pattern. With the permissive changes reverted, it only tightens the earlier scoring.

10. **CONFIRMED.** The attack compared every named scoring field across all 18 files. They matched. An in-memory mutation of one expected value failed the comparison. The variant checker also exited `0`, checking all 16 variants and their eight pairs. Its comparison includes every field outside the request. See [check.mjs:18](/home/user/agent/tmp/bench/variants/check.mjs:18) and [check.mjs:153](/home/user/agent/tmp/bench/variants/check.mjs:153).

11. **CONFIRMED.** The attack compared the actual rescore function with the harness predicate for empty replies, clean replies, first-run errors, follow-up errors, and partial rows. Their results matched. Both require no first-run error, a nonempty delivered reply, and clean scoring; neither independently rejects a follow-up error or partial flag. See [rescore-runs.mjs:44](/home/user/agent/tmp/bench/results/v9/rescored/rescore-runs.mjs:44), [bench3/bench.mjs:6505](/home/user/agent/tmp/bench3/bench.mjs:6505), and [bench/bench.mjs:2592](/home/user/agent/tmp/bench/bench.mjs:2592).

Outside the claims:

- **O1 — BROKEN: the empty-reply assertion cannot detect removal of the empty-reply guard.** Removing `reply !== ''` from `succeeds()` left all three scoring assertions passing. The empty g02 input already fails its expected-value checks, so it never isolates the guard. With clean scoring supplied, the mutated function incorrectly accepts the empty reply. See [bench.mjs:5654](/home/user/agent/tmp/bench3/bench.mjs:5654). The smallest fix is to replace `score(byPrefix('g02'), '')` in that assertion with:

  ```js
  { missing: [], violations: [], patterns: [] }
  ```

There are no cost advisories.

Attacked and held:

- An answer response containing text beside a forbidden tool call still delivers its text; the answer scope prevents tool execution. The probe returned `via:"answered"`. See [bench.mjs:3223](/home/user/agent/tmp/bench3/bench.mjs:3223).
- Recalling an earlier lookup’s facts is permitted even though the earlier goal’s messages are excluded from the projected tail. These are separate paths. See [bench.mjs:1996](/home/user/agent/tmp/bench3/bench.mjs:1996) and [bench.mjs:2353](/home/user/agent/tmp/bench3/bench.mjs:2353).
- The credit-check input `Albrecht: There is no room for the $3,000 order.` fails both scoring versions. The added denial pattern itself holds; the permissive phrase matching breaks claim 9. See [frozen-harness-scoring.md:180](/home/user/agent/tmp/units/frozen-harness-scoring.md:180).

VERDICT: FAIL 3, 4, 5, 6, 8, 9; outside the claims: O1