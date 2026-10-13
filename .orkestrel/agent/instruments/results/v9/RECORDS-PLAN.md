# Per-topic records on the refined profile: the build plan (2026-10-09)

## Summary

Build the per-topic records as a pure module over `--profile refined`. Code projects one record per account and one `Rules` record from the stored events, each line is a verbatim sentence of a live source, and the 2B writes nothing into a record.
In the briefing, the records replace their topics' raw sources in `## Pinned` and `## Rules`. A request reads its own accounts' records plus `Rules`, and the briefing leaves out each sentence that holds a value a decided correction replaced: m2's MX-4471 sentence and m22's ESC-2291 sentence. The tail stays refined's, so a dead token that an earlier reply wrote stays in view (defect 2).
The first unit is /home/user/agent/tmp/bench3/records.mjs with /home/user/agent/tmp/bench3/records-check.mjs. It runs offline, asks the judge nothing, and needs no calibration step. The record carries no today line and no date notes, because refined's system message states "Today is Thursday 2026-10-08." The derived amount comparison is built and checked, but it stays out of the measured arm.
Noise is measured over the 8 reworded copies with the paired band rule, so the plan drops the second-seed rerun (AGGREGATES R8).

## Baseline and evidence

The baseline is `--profile refined` (bench.mjs:118-133). It has the date line, `## Rules` split by sentence, tail answers dropped, tally off, the tools lookup_order, lookup_customer, and recall, answer cue on, recall budget 2, gate admit, cache stable, and horizon 99.
Every bench.mjs line number cites the 6,312-line file read on 2026-10-09; bench.mjs changed at 06:22:51Z to 6,411 lines, so the integration unit finds each cited function by the name the plan gives.
The evidence comes from the following sources:
- A1 control: the full view (`bench --mode none --ctx 6144`, results/v9/run.log:11-32), copies v1 to v8, rows in a1-control-vN/none.jsonl.
- A1 ledger: `--profile roundA` (run.log:9-30), copies v1 to v4, rows in a1-ledger-vN/ledger.jsonl. RoundA renders each rule as one unsplit line (bench.mjs:2078), so these runs test no sentence split.
- A2 refined: a2-refined-v1 (run.log:33-34), the only live refined run in run.log on 2026-10-09; it passes 5 of 10 (a2-refined-v1.log), rows in a2-refined-v1/ledger.jsonl.
- Refined dry render: copy 2 on the a1-ledger-v2 wire, in /tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/dry-a2v2 (`log.txt`, `bodies/`, `out/ledger.jsonl`). Its replies are replayed, so it grades nothing.

## Rulings on the six defects

**Defect 1, noise.** AGGREGATES R8 reruns with another `--seed`. At temperature 0 the sampler takes the top token, so the seed selects nothing; the variance comes from prompt-cache history (results/v8/DIVERGENCE.md:42). A cold rerun reproduces a run's pass count: a0-ledger-1 and a0-ledger-2 both pass 7 of 10, and a0-control-1 and a0-control-2 both pass 6 of 10 (results/v9/a0-*.log). Ruling: both arms run over the same 8 copies, variants/ledger/v1.json to v8.json, whose seed and tools equal scenario.json's (compared 2026-10-09). The paired score is d = passes(arm) - passes(refined) per copy. The arm clears as a fix when mean(d) - 2*sd(d)/sqrt(8) > 0, and as a trim when that bound is > -1; the strict bar fails d = -1 on every copy (results/v8/ATTACK-BRIEFING.md:179-183). Every run cold-starts through results/v7/tools/run-one.sh, one run at a time.

**Defect 2, record beside raw sources.** Under refined, m2's sentence "This week's code ... is MX-4471. [amended by m29]" renders under `## Rules` in all 10 copy-2 prompts. m22's ESC-2291 sentence renders in `## Pinned` for g03, g04, g07, g08, and g10 (dry bodies 00010 to 00093). The choices and their risks:
- (a) Replace: the request's account records and the `Rules` record stand in for their raw sources in `## Pinned` and `## Rules`. The record becomes the only carrier, so a membership error, a wrong party, or a dropped sentence loses a value with no verbatim copy beside it. The choice departs from section 9's "never the only carrier" and from ruling 3's in-prompt mark (BRIEFING.md:507, 519).
- (b) Add the record, and leave each sentence that holds an old token out of the raw render. Every live value renders twice, and the room cannot pay for it. Refined used 580 of 590 briefing tokens at g03, 576 of 619 at g05, 548 of 580 at g07, and 594 of 605 at g10 (dry-a2v2/log.txt), and g04 already drops m8 for room (body 00039). The 2B can also echo the duplicate.
- (c) Render both unchanged. The dead sentence stays in view beside the record, and the room cost of (b) applies as well.

Ruling: (a), because only (a) both removes the dead sentence from the briefing and fits the measured room. Computed from the fixture text in this plan with records joined by one blank line, the selected records take 1,169 characters at g03, 1,140 at g05, and 1,382 at g10. Refined's briefings take 1,582, 1,511, and 1,894 (bodies 00027, 00051, 00093). Construction limits the only-carrier risk: each line is a verbatim sentence, and `checkRecords` recomputes each live member's placement and the stale list apart from `buildRecords`. The module also returns the stale sentences, so the render unit can build (b) without a module change if the user rules (b). Confound: tail answers drop keeps an assistant text that rides on a call that is not a lookup (bench.mjs:1907-1909). The copy-2 g05 prompt carries g04's "ESC-2219 (not ESC-2291 as previously noted)" in its tail (body 00051), and A1 control replies wrote ESC-2291 at g05 in copies v1, v2, v3, v5, and v8 (none.jsonl line 5). Ruling: the arm leaves the tail as refined renders it and reports each tail entry that holds an old token (run 3), so the arm measures the briefing change alone; a tail change is its own arm (FINDINGS-A1.md:33-36).

**Defect 3, what the record adds over refined.** The following table covers each goal that failed in A1 or in a2-refined-v1. The failures cite the rows' `missing`, `patternViolations`, and `reply` fields; the refined column cites a2-refined-v1/ledger.jsonl at the goal's line and the dry bodies.

| goal | A1 failures | refined shows | the record adds | claim against refined |
|---|---|---|---|---|
| g03 | control v1, v2, v3, v5, v6, v7, v8 write ESC-2291; ledger v1, v2 omit Priya; ledger v3, v4 empty reply | v1 answers Luis's refund request; body 00027 holds m6 (Priya), m18 (Marcus), r1 (tracking) | scope removes m22 and m27 | none: no ledger or refined copy wrote ESC-2291, and the wrong-request reply comes from the tail, which records leave |
| g04 | ledger v1, v3 empty reply | v1 writes ESC-2291 as "the earlier incorrect number" | m22's ESC-2291 sentence leaves; m27 keeps "not ESC-2291" | bet, low |
| g05 | control v2 to v8, ledger v1, v3, v4 omit MX-4486; control v4, v7, ledger v1 call $289.00 under $200; control v1, v2, v3, v5, v8 write ESC-2291; ledger v4 answers Grace's request | v1 passes; body 00051 holds m2's rule beside m29's MX-4486 | the MX-4471 sentence leaves; m27 and m18 leave Luis's view | bet; ESC-2291 stays in the tail (defect 2); comparison line deferred (defect 6) |
| g06 | control 7 of 8, ledger 4 of 4 write the delivery date | v1 writes the date; m6's date clause under `## Rules` (body 00059) | nothing: Kenji's account registers only at g06's own lookup (bench.mjs:1333-1352), and cache stable fixes the system message within a request | none |
| g07 | control v1, v2, v3, v5 omit Tomasz; control v6, ledger v1, v3 misplace Friday or tomorrow | v1 passes; m8 split by sentence | "Tomasz Brennan: He's off tomorrow, ..." restores the antecedent the split separates; scope removes m13 and m18 | none: the Tomasz misses are control only, and the ledger runs rendered m8 unsplit |
| g10 | control v1, v3, v5, v6, ledger v1 to v4 dial 555-0142; control v7 "before 2 pm" | v1 answers Luis's refund request; m24 and r17 both say "direct line" (body 00093) | "Sigrid Halvorsen: She only takes calls ..." | none: the ledger runs rendered m24 unsplit, and the refined miss comes from the tail |

The other failures have no record target: g08 in ledger v2 is the `exceeds` pattern on a correct answer, g08 in a2-refined-v1 misses the fit verdict, g09 in control v1 is the full view missing m11, and g05 in ledger v4 answering Grace's request is tail residue (FINDINGS-A1.md:32-36).
The plan drops these AGGREGATES parts because refined covers them or no evidence supports them: the today line, date notes, `--records today`, the request-turn and system placements, `Replaced:` lines (the correcting sentence states the replacement verbatim), segment copying and its failing checks (ATTACK-BRIEFING.md:97), `agrees`, and `--record-share`.

**Defect 4, rules gated by the desk filing.** Under refined, every live rule renders for every request while room lasts. m2, m6, m8, m18, and m29 sit under `## Rules` in 9 of 10 copy-2 prompts, and g04 drops m8 for room. The desk topic only orders the rules. The AGGREGATES gate would make presence depend on the imported filing (results/v3/cal-categories.jsonl, topic fit 0.6 at bench.mjs:781):
- g06 and g09: m6 reads delivery 0.444. The Kenji requests read delivery on v1, v3, and v4, and no desk topic for g06 on v2 (a1-ledger-vN rows, `request.topics`). Rule 6 would therefore leave g06's view in all 4 recorded copies, and g09's in 3, because g09 on v1 reads contacts, which m6 meets at 0.63.
- g05: m29 reads refunds 0.64, which is 0.04 over the fit. A lower reading would leave m2's rule without its replacement code.
- g03 (Priya, m6 escalations 0.93) and g07 (Tomasz, m8 delivery 0.93): these depend on the request reading escalations, delivery, or contacts, which every recorded copy does. g10 depends on no rule.

Ruling: the `Rules` record holds every live desk rule, and desk topics only order its lines, with the request's topics first. No A1 failure then depends on a desk-topic reading for presence. Presence still rests on in-sample readings: m29 joins `Rules` through the m2→m29 amends reading 0.774 against the 0.75 fit (cal-categories.jsonl:54, bench.mjs:781), a margin of 0.024, and without that pair through its forward category reading, correction 0.717 against 0.7 (cal-categories.jsonl:27, bench.mjs:1563), a margin of 0.017; the reverse-order reading is 0.467 (cal-categories.jsonl:266). When both fail, m29 goes to `loose` and renders as refined renders it. The filing stays imported and in-sample (ATTACK-BRIEFING.md:111-124).

**Defect 5, account scope.** Ruling: records scope by account. A request reads the records of the accounts its entity topics name, plus the `Rules` record. A member whose entities name an account joins only that account's records, so `Rules` holds no account member; a unit whose accounts are all other accounts renders nowhere, `recall` still reaches it, and its pin keeps its lifetime, because scope filters the render and ends nothing.
Under refined, m22 and m27 reach Grace through the escalations desk topic (m22 0.97, m27 0.95; g03 reads escalations on v1 to v4). m27, m44, and m18 also reach most requests as group-2 rules and corrections (bench.mjs:1984-1986). Under scope, the copy-2 prompts lose these units: m27 and m18 at g01, g02, and g05; m22 and m27 at g03; m18 at g04 and g08; m13 and m18 at g07 and g10; m13, m27, m34, and m18 at g09; and m44 at g07, g08, g09, and g10. g06 keeps refined's view, because its request names no registered account at entry.
m44 ("Before you work on Luis: the director scrapped the 15 percent restocking fee") corrects the desk rule m4 (amends 0.993, supersedes 0.974; cal-categories.jsonl:66-67), and `marks()` files the pair under `amended` too (bench.mjs:1710). Ruling: m44 stays in Luis's record only. Refined shows m44 in no copy-2 g03 or g04 body, and g03 scores a revived restocking percentage (scenario.json, g03 `forbiddenPatterns`), so placing m44 in `Rules` would add the "15 percent" token to Grace's and Halvorsen's prompts.
Risks: a desk-wide correction stated inside one account's message stays with that account; a request that needs another account's fact misses it; a partial alias match (bench.mjs:1587-1602) files a message under the wrong account. Overfit: m24 joins Halvorsen only because the buyer's surname is the firm's name, matched through the word "Halvorsen" (bench.mjs:1595-1598); its truth topics are only "contacts" (scenario.json seed 24). A contact whose surname differs from the holder name joins no account and goes to `loose`. All 8 copies name the customer in every request (variants/ledger/v1.json to v8.json; ATTACK-BRIEFING.md:185-189), so the band leaves scoping untested for an unnamed customer and for such a contact.

**Defect 6, derived comparison.** The general mechanism takes each `Rules` sentence that holds a comparator word (`over`, `above`, `more than`, `under`, `below`, `less than`, `at least`, `at most`) before a currency amount, and whose desk topics meet the request's. It compares that threshold with each currency amount in a lookup-result line of a selected account record and emits `AMOUNT is over THRESHOLD.` or `AMOUNT is under THRESHOLD.` On the seed it emits "$289.00 is over $200." for the Luis requests and nothing for the others.
Ruling: the measured arm's record does not carry the line. The `compareAmounts` function lands in the first unit with fixtures and gets its own arm only if the records arm leaves g05 failing. The comparison error explains 3 of the 10 A1 g05 failures (control v4, v7, ledger v1). The other 7 omit the rule or the code, or answer another request (ledger v4).
Failure modes: the mechanism compares an order total, not the refund, so a live fee would make them differ; a record with several amounts (Halvorsen: $1,240.00, $5,000.00, $1,240.00) emits one line per amount, and only the desk-topic gate stops that, so the line depends on the filing (m2 refunds 0.80); an exception clause reads as a plain threshold; and the 2B can ignore the line, as it ignores rule 6. Overfit risk: the seed holds one threshold rule and one crossing amount, so the mechanism is built, fixtured, and scored on the same goal. A gain on g05 does not show the mechanism generalizes until a second threshold exists, for example in the long scenario.

## The first build unit

/home/user/agent/tmp/bench3/records.mjs imports nothing from bench.mjs and only `node:crypto` for hashes, and every export is pure. Its exports follow:

```js
splitSentences(text)              // string -> string[]; the rule of bench.mjs:988-994
extractTokens(text)               // string -> { ids: Set<string>, numbers: Set<number> }; bench.mjs:860-871
linkAccounts({ results, accounts }) // -> { [subjectId]: accountId }
buildRecords(input)               // Input -> Built
selectRecords(built, request)     // (Built, { accounts: string[], desk: string[] }) -> View[]
renderRecord(view)                // View -> '## TITLE\n- LINE\n- LINE'; the render joins records with one blank line
compareAmounts(views, request)    // (View[], { desk: string[] }) -> string[]; not rendered in the arm
checkRecords(built, input)        // (Built, Input) -> string[] faults; empty when clean
```

The input and output shapes follow:

```text
Input  = { today: 'YYYY-MM-DD', system: string, exclude: [id], accounts: { [accountId]: [holderName] },  // learn order
           messages: [{ id, role: 'user'|'assistant'|'tool', content }],   // conversation order
           results: [{ id, name, arguments, text }],                        // successful, non-empty lookups
           entities: { [id]: [entityId] },
           judgments: { quiet: [id], categories: { [id]: category }, desk: { [id]: [topic] },
                        amended: { [earlierId]: [laterId] }, superseded: { [earlierId]: [laterId] } } }
Built  = { records: [Record], stale: [{ source, sentence, tokens }], loose: [id], hash }
Record = { key: 'account:ID' | 'rules', title, members: [id], lines: [Line], hash }
Line   = { text, source, sentence, party?, desk: [topic] };  View = { key, title, lines: [Line] }
```

`buildRecords` applies the following rules:
- Live members are user messages outside `exclude` and `quiet` with no `superseded` entry, plus each lookup result that no later result of the same name and normalized arguments replaces (the rule of bench.mjs:1721-1735). An assistant message never joins, so no wrong answer is carried forward.
- `linkAccounts` maps a result's id-shaped argument to the single `accounts` key its text names, or to itself when the argument is an account. A member's accounts are those its entities name, directly or through a link.
- A member with an account joins only its account records. A member with no account joins each record that the earlier side of its decided `amended` pair joins, or would join if it were live; with no such pair, it joins `Rules` when its category reads rule or correction. Every other live member goes to `loose`, which the render unit renders as refined does.
- Lines are the member's sentences, verbatim and in order. A sentence of an amended earlier message that holds a token shared with the amending message goes to `stale`. The amending message keeps every sentence.
- A sentence that opens with He, She, They, His, Her, or Their gets the prefix `PERSON: `, where PERSON is the last person the preceding sentence of the same member names. A person is a maximal run of words that each start with an uppercase letter followed by lowercase letters, outside sentence-initial position, whose text is neither a holder name nor a name in `system`. When the member has no preceding sentence, or that sentence names no person, the line takes no prefix (m24's "Their buyer is Sigrid Halvorsen.").
- The titles are `HOLDER (account ID)`, with the first holder name learned for the account, and `Rules`; lines keep member position order. A record's hash is SHA-256 over `today`, the key, and the rendered text.
- `selectRecords` returns the request's account records, then `Rules`. In `Rules`, lines whose desk topics meet the request's come first, each group in position order.

`checkRecords` returns a fault for each of the following conditions, and records-check.mjs injects one fault per check:
- A line, minus its party prefix, is not a sentence of its source, or a party is absent from the source's preceding sentence.
- A line holds a token that `stale` lists for its source, or a line comes from an excluded, quiet, superseded, replaced, or assistant source.
- A sentence of a live member is neither a line nor a `stale` entry.
- A live member's records or `loose` entry differ from a separate placement pass over `entities`, `categories`, `amended`, and `linkAccounts` that calls no `buildRecords` helper (injected fault: a member moved to another account's record).
- `stale` differs from a separate pass over `amended` and `extractTokens` (injected fault: `stale` emptied).
- A line holds a handle matching `/\b[mrp]\d+\b/` that its source lacks.
- A build over the input with its object keys reversed returns another hash.
- records.mjs holds an id-shaped token, a person or holder name, or an amount with a currency sign or decimals from scenario.json's seed or tools (source sweep).

An error inside bench.mjs's `entities()` (bench.mjs:1587-1602), such as name-word matching turned off (bench.mjs:1595), feeds the module a wrong input and passes every check; the seed fixtures catch it, because the Halvorsen fixture holds m24 and its party prefix.
At integration time, each input comes from bench.mjs as follows, and bench.mjs replaces its `splitSentences` and `extractTokens` with imports from records.mjs, so each rule keeps one home:

| input | source in bench.mjs | lines |
|---|---|---|
| `messages` | `conversation.messages()` as `#messages` indexes it; tool content from `text(id)`, which strips the `[rN] ` prefix | 1364-1379, 1447-1454 |
| `results` | `results` written by `record`; `name` and `arguments` from `call(message)`, because the map stores neither; emptiness from `empty()` | 1077, 1315-1331, 1321-1323, 1403-1405, 1354-1356 |
| `quiet`, `categories`, `desk` | `quiet(id)`, `category(id)`, and `deskTopics(id)` at `LEDGER_FIT` | 1567-1573, 1555-1565, 1604-1608, 781 |
| `amended`, `superseded` | `marks()`, which applies the fit and the shared-token filter | 1700-1719 |
| `entities` | `entities(text(id))`, the entity half of `topics()` | 1587-1602, 1610-1617 |
| `accounts` | `registry.accounts` and the `aliases` map inverted into each account's holder names in learn order, filled by `#learn` | 1081, 1333-1352 |
| `exclude` | run requests (`runs[].request`) and `notes` | 1162-1178, 1973, 1083 |
| `today`, `system` | `clock` and the text `buildLedgerSystem` returns | 1132, 964-986 |
| request | `topics(request)`, split into accounts through `linkAccounts` and into desk topics | 1610-1617 |
| call site | `select`, after `autoPin` and before `plan`; the seed pass after `autoPin(undefined)` | 1202-1203, 3179 |

The fixtures read the texts from scenario.json and the decided readings of cal-categories.jsonl at bench.mjs:781, use the registry state at each build point, and expect the following texts, derived offline from the seed. Grace at g03 entry is built from the seed and the g01 and g02 lookups, with requests g01 to g03 excluded; its `Rules` record holds the 7 lines of the Luis fixture's `Rules`, in the g03 desk order:

```text
## Grace Okafor (account LH-20418)
- First real ticket: Grace Okafor on account LH-20418 says order LH-77302 never arrived, and she wants a replacement.
- Order LH-77302 for account LH-20418 (Grace Okafor): linen duvet set, queen, total $148.50.
- Shipped 2026-09-30 by Parcelway, tracking PW-5521-9930; marked delivered 2026-10-03 to a parcel locker at Elm Street station.
- Account LH-20418: Grace Okafor, Gold tier, member since 2021-04-12.
- 2 claims in the last 12 months; preferred contact is email.
- Agreed, open the locker trace.
- Because of her two earlier claims, any replacement for Grace needs Marcus to sign off first.
```

Halvorsen at g10 entry is built from the seed and g08's lookup_customer LH-31055. m22's ESC-2291 sentence is in `stale`, m24's first sentence takes no prefix, and a repeat lookup of LH-80941 in g07 changes no byte:

```text
## Halvorsen Interiors (account LH-31055)
- Next: Halvorsen Interiors, wholesale account LH-31055, is escalating a late $1,240 lighting order, LH-80941.
- Their buyer is Sigrid Halvorsen.
- Sigrid Halvorsen: She only takes calls after 2 pm, on her direct line at extension 4127.
- Correction on Halvorsen: the ticket is ESC-2219, not ESC-2291.
- I transposed the digits.
- Anyway, can you check where the Halvorsen shipment actually is?
- Order LH-80941 for account LH-31055 (Halvorsen Interiors): 8 brass pendant lights, total $1,240.00.
- Freightline pro number FL-660412; held at the Riverside depot since 2026-10-02, awaiting a release from the Larkspur Home warehouse.
- Account LH-31055: Halvorsen Interiors, wholesale tier, net 30 terms, credit limit $5,000.00 with $1,240.00 outstanding.
- Account manager Ines Albrecht, direct line 555-0142.
```

Luis at g05 entry is built from the seed, g01's LH-79215 lookup (which replaces the seed's, so it follows m44), and g02's LH-44870 lookup. The selected `Rules` record follows it; m2's MX-4471 sentence is in `stale`, and m44 renders only in Luis's record:

```text
## Luis Ferreira (account LH-44870)
- Last one for the morning: Luis Ferreira on account LH-44870 wants to return an opened stand mixer from order LH-79215.
- Before you work on Luis: the director scrapped the 15 percent restocking fee this morning.
- Opened-item returns get a full refund again.
- Order LH-79215 for account LH-44870 (Luis Ferreira): stand mixer, 5 quart, total $289.00.
- Delivered 2026-09-21; return window open until 2026-10-21.
- Account LH-44870: Luis Ferreira, Standard tier, member since 2023-02-08.
- Refund method on file is Mastercard ending 7719; email luis.ferreira@example.net.

## Rules
- Standing rule: any refund over $200 needs a manager approval code in the internal note.
- Marcus just messaged that the approval code rotated early.
- Use MX-4486 from now on; MX-4471 is dead.
- Third rule: copy Priya Raman from the refunds team on every escalation.
- And never promise a customer a delivery date in writing.
- For anything stuck at a carrier depot, Tomasz Brennan in the warehouse issues the release.
- Tomasz Brennan: He's off tomorrow, Friday 2026-10-09, so release requests have to reach him today.
```

Kenji's record exists only after g06's lookup_order LH-81660, because no seed lookup names LH-81660 or the Kenji alias; the version built after that lookup is the one g09 reads:

```text
## Kenji Nakamura (account LH-52307)
- Quick one before the queue: Kenji Nakamura's replacement kettle on order LH-81660 needs a gift note that reads 'Happy 40th, Aiko'.
- Order LH-81660 for account LH-52307 (Kenji Nakamura): replacement electric kettle, gift wrapped, no charge.
- Shipped 2026-10-07 by Parcelway, tracking PW-6013-2280, carrier estimated delivery 2026-10-12; gift note text is not recorded on the order.
```

Three more fixtures pin the edge cases:
- m29's category undecided: m29 stays in `Rules` through m2→m29 and MX-4486 renders; with the amends pair undecided as well, m29 is in `loose` and m2 keeps both sentences.
- A contact with another surname, on fictional data: holder Brightwater Studio, and a message "Their buyer is Odile Marlow. She orders on Mondays." whose entities name no account; it lands in `loose`, and its second line takes the prefix `Odile Marlow: `.
- m44 with its decided m4 pair: it joins Luis's record and no `Rules` line.

## Rendering, a later unit

The render unit follows the briefing attack and edits bench.mjs behind `--records off|on`, a flag to add; `off` keeps refined's bytes. Under `on`, `select` calls `buildRecords` after `autoPin` (bench.mjs:1202), and `plan` (1952) receives `selectRecords` output. In `#render` (2048-2100), `## Pinned` carries the request's account records, then the `loose` units refined would pin there, and `## Rules` carries the `Rules` record, then the `loose` units refined would rule. Units of other accounts are dropped, and a request that names no registered account gets refined's view whole. Consolidation cuts the `Rules` lines of other desk topics first and account lines last, and sets `over` when a request-account line goes. `measureBriefing` (2876), `countStale` (2813), and `assertPlan` (2933) are taught that a record line carries its source. Cache stable is unchanged, so a version built after a lookup reaches the next request.

## The judge

Mica keeps the `category`, `topic`, `amends`, and `supersedes` questions with their states, keys, and thresholds. The first unit reads decided judgments only and adds no question, so it needs no calibration step. AGGREGATES's `agrees` question and the stage-2 `changes` and `closes` questions each need their own calibration step on the long scenario, and they are outside this plan.

## Measurement plan

The runs go in the following order, and each settles one decision:
1. Offline: `node /home/user/agent/tmp/bench3/records-check.mjs` exits 0. Settles that the module builds the 4 account fixtures, the `Rules` fixture, and the 3 edge fixtures byte for byte, that each check fires on its injected fault, and that the module holds no scenario literal.
2. Offline, integration unit: `node --import /home/user/agent/tmp/bench/results/v8/refinework/no-net.mjs /home/user/agent/tmp/bench3/bench.mjs --check-ledger` exits 0, and a dry render under `--records off` reproduces the dry-a2v2 bodies and each A2 wire's request bodies byte for byte. Settles that `off` is the refined baseline and that A2's rows stand as refined's half of run 4.
3. Dry render under `--records on` of every goal on each complete A1 ledger wire (a1-ledger-v1 to v4), with results/v8/refinework/dry-run.mjs and `WIRE_DIR`, `DRY_BODIES`, `DRY_REPORT`, and `DRY_SCENARIO` set. For each goal it reads briefing tokens against room, `over`, goal facts plus the date line at entry, no old-token sentence in `## Pinned` or `## Rules` outside its correcting message, no account-record line of an account the request does not name, and every judge body an exact recorded match. It reports apart each tail entry that holds an old token and each tail request of another account. Settles whether the arm runs live: it runs only with `over` false and full fact recall in every goal.
4. Live: the arm over v1 to v8, 8 runs at about 9 minutes each (a2-refined-v1 ran 06:07:22 to 06:16:21, run.log:33-34), about 72 minutes. Refined's row per copy comes from A2; refined runs again only for a copy A2 lacks or whose bodies run 2 fails to reproduce, about 9 minutes per copy. Pairing with an earlier run holds because every run cold-starts and a cold rerun reproduces its pass count (defect 1). Each run is `run-one.sh NAME bench3 OUT_BASE -- --mode ledger --profile refined --scenario /home/user/agent/tmp/bench/variants/ledger/vN.json --ctx 3072 --judge mica --judge-ctx 4096 --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl --reply terminal --records on`. Settles the fix bar on d. Per copy, it also reports g03 replies holding ESC-2291, g05 holding MX-4486, g07 naming Tomasz, g10 holding 4127, each reply that answers an earlier request, and each goal refined passes that the arm fails.
5. Ablations, only when run 4 calls for them, each 8 arm runs, about 72 minutes, with the records arm reused from run 4:
   - When the arm clears, run `--records scope` (scope without replacement, a flag to add). This settles whether replacement and its departure from section 9 earn their place.
   - When g05 still fails on any copy, run `--records on --compare on`. This settles whether the comparison line enters the record.
   - When the arm clears only the trim bound, the user rules on it, and when it clears neither bound, the render unit stops.

Cost against refined: refined asks 5 judge questions per goal and 1 amends question in the seed pass (a2-refined-v1.log, `judge questions` column and seed line); the arm adds no judge request. a2-refined-v1-wire holds 32 model swaps over 88 model requests, and run 4 reports the arm's count from its wire. Prompts shrink by the character counts in defect 2. Run 3 gives the tokens per goal and run 4 the seconds per answer.

## Rulings the user owns

- Replace (a) over add (b): the prompt carries a value only through its record line, which departs from section 9's "never the only carrier" and from ruling 3's in-prompt mark; `recall` keeps the raw message.
- Account scope: other accounts' units leave the briefing and keep their pins; m44 stays in Luis's record; the tail stays refined's.
- `Rules` holds every live desk rule, and the arm runs on the short scenario, which departs from section 9's "runs on the long scenario" (BRIEFING.md:519); a desk-topic gate waits for the long scenario.
- The comparison line stays out of the measured arm until run 5 calls for it.
- No record reaches g06, because Kenji registers at g06's own lookup and the system message is fixed within a request.
- Whether an arm that clears only the trim bound stays for its smaller prompts.
