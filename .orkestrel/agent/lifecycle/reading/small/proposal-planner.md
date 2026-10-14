# Small-model tool surface: proposal (planner lane)

Returned 2026-10-07 by the Opus planner lane and filed by the orchestrator because the lane had no write tool. The lane is objective: mechanism, evidence, and what the oracle and contracts permit. The wording it proposes is a set of variants to measure.

## Variants and predicted effects

1. **V1, `click`/`type` copy and prompt order:** the 2B stops calling `type` on links and buttons, which it does in all 33 cart and 33 checkout passes in `census.md`. Cart and checkout each lose one call; search must be re-measured for a regression.
2. **V2, stable link references:** a link with the same name and destination keeps its `eN` reference across page changes in one tab. This removes the 4B's stale `e3` failure. The 2B's `e4` loop becomes one refusal that says the element is gone.
3. **V3, `from` defaults to 1 and accepts digit strings:** removes the `journeys{}` refusal (1) and the `"from":"1"` read refusals (10) from the 2B journeys. The listing turn finishes in one call.
4. **V4, journey refusal wording:** the repeated `save` calls drop from 3 per affected turn to 1, and a misplaced `edit` name is fixed in one retry.
5. **V5, trimmed journey tool list (harness only):** the prompt the model reads shrinks. Predicted: little or no change on the five page tasks and only a small gain on the journey; run it last.
6. **V6, numbered "not shown" line for cut plain reads:** low confidence. It targets ports 49173 and 49175, which fail in every C0 to C3 variant.

## Design

The design changes the advertised copy and the refusal texts, and adds one rule about reference identity. Each change is measured first as a transform in the harness, then adopted in `@orkestrel/browser` only if it beats the baseline (C0) with no regression on any of the five tasks.

### 1. Why the 2B calls `type` on links and buttons (V1)

**How it happens.** Every recorded `type!` fills the `text` argument with the target's own name and sets `submit` to true: `type(e3, "Checkout", submit true)` in 2b/run-12 checkout-1, and `type(e16, "Add to cart", submit true)` in cart-1. Journey-3 opens with the same habit on a real field: `type(e4, "Search products")`.

The system prompt causes this in two ways:

- The `type` sentence is the only action sentence with a full argument recipe ("its reference, the text, and submit true"), and it comes before the `click` sentence.
- The `click` sentence uses the abstract verb "activate".

The tool definitions add two more pulls toward `type`:

- The `submit` description matches buttons that submit a form ("Place order", "Add to cart").
- The `text` parameter's phrase "or the option to choose" invites a choice among links.

The 4B never makes this mistake (census: 0).

**Replacement wording:**

- `click` description: `Clicks a link, button, checkbox, or tab by its reference, settles its action, and returns the page.` (17 words)
- `type` description: `Enters text into a field such as a textbox, searchbox, or combobox, optionally submits its form, and returns the page. Click links and buttons instead.` (24 words)
- `type.text` description: `The words to enter or the option to choose; never the field's own name.`
- Prompt: replace the sentences `To fill a field or use the site's search box, call type with its reference, the text, and submit true. To activate an element, click its reference from the latest result.` with `To follow a link or press a button, call click with its reference from the latest result. To fill a textbox or the site's search box, call type with its reference, the text, and submit true.`

**Arms:** V1a changes the definitions only; V1b the prompt only; V1c both. Separating the arms tells which part causes the effect, because the 2B is byte-sensitive.

### 2. Stable references (V2)

**The rule.** Within one tab, a link keeps its earlier reference when all of these hold: it has the same role (`link`), the same accessible name, and the same resolved `href` as a link in that tab's previous document; and exactly one link in each document carries that identity. Every other element takes a fresh reference, as it does today. Rule R is unchanged: a successful action still resets the accepted set, and the carried references are accepted again because the new result lists them.

**Why links only.** A link's effect is fixed by its `href`, so acting on a carried link does exactly what the earlier page showed. A button's effect depends on its form and page state; a "Delete" button on another record is a different action. Carrying buttons would let a model act on an element it never saw.

**Refusal when the element is gone:** `Element e4 (searchbox "Search products") is not on this page; use a reference from the latest result.` This removes the text "call read for fresh refs". In journey-3, that text sent the 2B into 7 rounds of `read` followed by a refused `type` on the same missing `e4`.

**Cost:** one identity lookup per link on each capture; a per-tab map of the previous document's link identities; a map from shown reference to its rendered element, kept until the context closes.

**Coverage:** the rule lives in `BrowserElementManager.#bind`, so the MCP server's allocator inherits it. Journey replay resolves steps by role and name, so replay is unaffected. The oracle's `findUnlistedReferences` check needs no change, because the carried `e3` appears in the result of `click e2`.

### 3. `from` default (V3)

Default `from` to 1 in the tool, for both `read` and `journeys`. The lane rules against relying on the prompt alone: the journey prompt already says `call journeys with from 1`, and the 2B still sent `journeys{}` in journey-1, then fell back to 7 calls of `read{from:1}` and hit the 8-call turn limit; every extra prompt sentence adds bytes to all tasks, and the 2B is byte-sensitive.

The same unit accepts a whole-number decimal string (`"1"`) for these parameters. In journey-3 the 2B sent `"from":"1"` 10 times, starting after its call to `journals`, an unknown tool whose call had no schema to guide the argument types. The refusal naming "integer" never corrected it.

`from` leaves the `required` list. Its description becomes `The first line to show: 1 for the top, or the line a reply's footer names. Default: 1.` The `read` method contract does not change.

### 4. Journey refusal wording (V4)

**The `save` refusal.** The 2B uses the `save` description as its answer channel: after the replay it called `save("The journey places an order for Grace Hopper, and the confirmation code is HG-48213.")`, which is shaped like a final answer. The present refusal lists three tools and gives no way out, so the model repeated `save` up to the 3-refusal cap.

Replacement text: `Nothing is recording, so there is nothing to save; "place-order" is already saved. Answer the user.` The package already uses this phrasing in `BrowserJourneyToolset.ts:309`: "or answer the user when the task is done".

**The `edit` refusal.** In journey-3 the 2B put `journey` inside an edit item, and the refusal `The journey parameter must be a string.` describes the wrong problem. When `journey` is absent, the refusal becomes `Edit requires journey, the saved journey's name such as "place-order", beside edits.` It names the journey that was saved last, when there is one.

### 5. Tool list trim (V5)

The journey task advertises `read`, `click`, `type`, `press`, `navigate`, `wait`, `dialog`, `switch`, `record`, `save`, `journeys`, `edit`, `replay`, `capture`, and `forget`.

**The trim.** For the journey task, advertise only `read`, `click`, `type`, `wait`, `record`, `save`, `journeys`, `edit`, and `replay`. None of the dropped tools appears in any of the 205 recorded attempts. Keep `wait` because the shared prompt names it, and keep the `edit` schema as it is: the 4B used it without error, and the 2B's `edit` failure is the misplaced name V4 fixes.

**Predicted effect.** The prompt prefix shrinks: turn 1 measures 2234 prompt tokens for 2b/run-12 cart-1 against 3358 for journey/run-1 journey-1. Predicted: no change on the page tasks and at most a small gain on the journey. Run it after V1 to V4. The trim belongs in the harness, not the package.

### 6. Early answer on a cut plain read (V6)

The residual paging failures are ports 49173 and 49175. Both use a plain `read{from:33,to:80}` and fail in C0, C1, C2, and C3 alike (`tmp/codex/paging-live/all.json`, `C3.json`).

**What the lane thinks happens.** The 2B asked for `to: 80` and treats the window as if it covered 33 to 80. The tail-slot sentence in C3 did not help. The search-miss sentence works because it tells the model that the visible text does not contain the answer; a plain read has no query, so it has no such sentence.

**The variant.** For a read cut before the end of the page, drop the header's "This read shows … not shown yet." line. Insert a numbered row after the last shown row: `61–80: not shown yet; call read with from 61.` The model scans numbered rows, so this states the unread range in that stream. **Alternative arm.** V6b removes `to` from the `read` advertisement. Confidence is low that either arm changes the result on those two ports.

## Alternatives

Each alternative is one a constraint favors, with the reason it loses:

- **Redirect a `type` on a link or button into a click.** This removes the refusal with no wording change, but the tool would perform an action it was not called to do and print a receipt for a different action. The `type!` class causes no failures (census: 0 failing attempts), so wording comes first.
- **Hint the action on each row, such as `textbox "Full name" [ref=e19] type here`.** The paging evidence shows that text near the rows steers the 2B more than the definitions do. The cost is extra bytes on every result for every task. Measure it as V1d only if V1c leaves `type!` calls in place.
- **Keep renumbering and change only the refusal so it names the new reference.** The 4B would recover in one extra call, but the oracle still fails the attempt: a refused call that names an unlisted reference counts as unlisted (`setupStore.ts:1160`). V2 wins. Its gone-element refusal is adopted in either case.
- **Carry references for every element role.** Ruled out for the reason in Design §2: a carried button can act on an element the model never saw.
- **Teach `from` only in the prompt.** Already in force and failed in journey-1.

## Constraints

- `browser/src/core/constants.ts:441-447`: each tool description is at most 25 words and each parameter description at most 100 characters. `read` and `journeys` require `from`, and this remark changes with V3.
- `browser/src/core/constants.ts:476-510`: the present `click` and `type` copy.
- `browser/src/core/constants.ts:397-399`: `BROWSER_TYPED_ROLES` is textbox, searchbox, spinbutton, combobox, and listbox.
- `browser/src/core/BrowserToolset.ts:935-940` holds the `type` role refusal; `:838-847` the `read` argument refusal; `:1324-1337` the not-in-view refusal.
- `browser/src/core/BrowserToolset.ts:869-871`: the click receipt already points to `type` for a typed role.
- `browser/src/core/BrowserJourneyToolset.ts:293-299` holds the idle `save` refusal; `:309` the "answer the user" precedent; `:398-407` the `journeys` argument refusal; `:435` the `edit` journey read; `:662` the not-in-view refusal for journey steps.
- `browser/src/core/elements/BrowserElementManager.ts:396-436`: references bind per `session:backend`, so a new document means new references.
- `browser/src/core/helpers.ts:705-720` renders the footer; `:770-834` the passage and the miss-sentence placement.
- `ollama/tests/setupStore.ts:136-143` holds the system prompt; `:152-158` the journey prompt; `:713-739` the bounds (`limit` 8, `refusals` 3).
- `ollama/tests/setupStore.ts:799-814`: the `createTimedTools` Proxy is the seam where variants plug in.
- `ollama/tests/setupStore.ts:1146-1176` holds the unlisted-reference oracle; `:1356-1369` the shared oracles; `:1445-1447` the footer parser.

## Refusals

- **A store-specific tool subset inside the package.** AGENTS.md: "Mechanism, not product policy." V5 filters in the harness.
- **Keeping the old `from`-required behavior or the old wording behind an option.** AGENTS.md: "No compatibility shims."
- **A switch for V2.** The rule is unconditional; nothing in the evidence calls for a switch.

## Measurements

Supplied: `census.md` (205 attempts; the `type!` class in 33 cart and 33 checkout 2B passes and 0 4B attempts; every `read>read` paging attempt passes (34) and every single-`read` attempt fails (18); journey 2B 0 of 3, 4B 1 of 2); paging-live C0 10/16, C2 14/16, C3 14/16 with residual failures on ports 49173 and 49175; turn-1 prompt tokens 2234 (2b/run-12 cart-1) against 3358 (journey/run-1 journey-1).

Missing: a per-port journey baseline for the 2B and the 4B; the token size of each tool definition; whether requiring `from` was a deliberate steer toward paging; the 4B on the five page tasks with V2 applied; the cause of the ollama 500 in journey-2.

## Units

Units U3 to U8 each depend on their variant beating C0 in U2 with no regression. Every adoption unit is medium size under AGENTS.md and gets one review pass.

- **U1, variant hook and runner.** Writer, Codex. Owns `ollama/tests/setupStore.ts` (an optional `variant` field on the store run options, holding `system`, `definitions`, `arguments`, and `result` transforms applied through the `createTimedTools` Proxy) and `ollama/tmp/probes/surface-live.test.ts`. The runner covers the five tasks and the journey, takes the model from an environment variable, and uses the paging-live port list; it writes JSON rows holding variant, model, port, task, pass by `STORE_PREDICATES`, call shape, and refusal-class counts. Recorded calls are model-facing: arguments before translation and results after the transform. Accept when the C0 arm reproduces the census shapes on 2B cart and checkout (`type!` present), the file and project typecheck, and the package is unchanged.
- **U2, variant transforms V1a to V1c, V2, V3, V4, V5, V6, and V6b.** Writer, Codex; depends on U1. V2 is a two-way map between a link's identity and its canonical reference, applied over results and `ref` arguments. Accept when each transform has a test on recorded result texts from `tmp/codex/confirm`, and C0 is the identity transform.
- **Live runs.** Orchestrator; depends on U2. Run the C0 baseline and each variant on the 2B and the 4B; record pass counts and per-class counts against the census.
- **U3, adopt V1.** Owns `browser/src/core/constants.ts` and the copy tests, plus `ollama/tests/setupStore.ts:136-143` if the prompt arm wins. Accept when the copy matches Design §1, the word and character limits hold, and the browser project is green.
- **U4, adopt V2.** Owns `BrowserElementManager.ts`, both not-in-view refusals, the reference documentation in `types.ts`, the tests, and the guide. Accept when tests prove: a carried link resolves to the live node, a non-unique identity takes a fresh reference, a button never carries, and a missing identity refuses with the Design §2 text.
- **U5, adopt V3.** Owns `BrowserToolset.ts#read`, `BrowserJourneyToolset.ts#journeys`, the `constants.ts` schemas and remark, and a `readBrowserToolInteger` parser in the parsers kind file. Accept when a missing `from` reads from line 1, `"7"` reads as 7, `"7a"`, `"1.5"`, and `"-1"` are refused, and tests are green.
- **U6, adopt V4.** Owns `BrowserJourneyToolset.ts:298`, the missing-journey branch in `#edit`, and the tests. Accept when the texts match Design §4 exactly.
- **U7, adopt V5.** Owns the journey advertisement filter in `ollama/tests/setupStore.ts`. Accept when the journey task advertises exactly the set in Design §5.
- **U8, adopt V6 only if it flips a residual port.** Owns `helpers.ts` (window rendering), plus `extractWindowText` and `extractFooterLine` in the harness. Accept when every parser test is green.

## Tensions

- **Was requiring `from` a deliberate paging steer?** Rule after V3's paging rows.
- **Lenient digit-string parsing** relaxes strict schema validation at the model boundary.
- **Links-only V2 changes the documented reference contract.** The subjective lane rules on whether a links-only rule surprises MCP consumers.
- **Refusal text that says "Answer the user."** steers the conversation from inside a tool result; the precedent is `BrowserJourneyToolset.ts:309`.
- **V1b's prompt reword against the 2B's search history.** An earlier prompt reword that fixed paging broke search. If V1b breaks search, adopt V1a alone.
- **V5 sits outside the package.** The advertised set is the consumer's policy.
- **The `journals` invention.** `tool not found: journals` comes from `@orkestrel/agent`; a nearest-name hint there is a separate decision.
- **The `save` description field reads like an answer slot.** Left unchanged so V4 isolates the refusal text; a non-answer example in that description is a candidate follow-up.

## Risks

- **Byte sensitivity.** Any copy change can move other tasks; every arm runs all five tasks.
- **Small samples.** Journey attempts are long and few; per-class counts are the primary reading, the pass count secondary.
- **The ollama 500 sits outside the tool surface.** The harness counts it as a failed attempt, so it can hide a variant's effect.
- **V2 mapping.** The probe's V2 map must apply the same uniqueness rule as U4, or the measurement does not transfer.
