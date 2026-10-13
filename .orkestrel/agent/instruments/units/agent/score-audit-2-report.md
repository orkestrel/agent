1. **CONFIRMED — Claim 1.** The attack was to find a `real` item whose apparent fault disappears when read in context. Every `real` item retains a substantive fault:
   - `4bb98d89` omits the explicitly requested copy recipient, Priya. tmp/bench/results/v9/audit/items2.json:3
   - `62b47c46` and `dcb8bffd` omit the required approval code; referring to another note or supplying a placeholder does not authorize the refund. tmp/bench/results/v9/audit/items3.json:34 tmp/bench/results/v9/audit/items3.json:73
   - The kettle replies state delivery dates in text requested for Kenji. Calling the date an estimate does not rescue them: the full scenario explicitly treats the carrier estimate as prohibited customer-facing content. This holds for `7a8bd5e5`, `8deba591`, `e3951e48`, `6af840e3`, `6c3b2931`, `6f34f0a6`, `723021c7`, `b6ffa80c`, and `c920c6da`. tmp/bench/scenario.json:1
   - `2116eee6` omits the deadline; `1841e046` omits both the contact and deadline; `e133427f` gives Friday as the deadline; `c6c00d3f` wrongly identifies today as Friday. tmp/bench/results/v9/audit/items2.json:171 tmp/bench/results/v9/audit/items2.json:210 tmp/bench/results/v9/audit/items3.json:407 tmp/bench/results/v9/audit/items3.json:447
   - `6791a02e`, `e421c7ac`, `5972e30f`, `6ed90f56`, `a46f763d`, and `b59c983c` supply balances without answering whether the reorder fits. `af1ca274` also gives the wrong resulting balance: $4,240 is correct. tmp/bench/results/v9/audit/items2.json:313 tmp/bench/results/v9/audit/items2.json:437 tmp/bench/results/v9/audit/items3.json:486 tmp/bench/results/v9/audit/items3.json:672
   - `089570e2`, `6b5892f0`, and `d20dbfce` assign Ines’s number to Sigrid. Adding Sigrid’s extension does not establish that the number reaches her. The account lookup omitted from these items’ fact lists supplies the ownership evidence. tmp/bench/results/v9/audit/items2.json:499 tmp/bench/results/v9/audit/items2.json:541 tmp/bench/results/v9/audit/items2.json:583 tmp/bench/scenario.json:1

   These semantic judgments are reasoned from the item text and full scenario; in-memory scorer checks reproduced the recorded failures. Item verdict changes: none.

2. **CONFIRMED — Claim 2.** The attack was to interpret each supposedly harmless wording as an actual wrong answer. It failed:
   - `62d973a7`: “They can easily put a $3,000 order on credit” explicitly answers the fit question correctly. The available credit is $3,760. The probe reproduced the missing phrase failure; removing “easily” passes. tmp/bench/results/v9/audit/items2.json:251
   - `6e405b61`: “This replaces the earlier value of ESC-2291” unambiguously retires the old ticket while identifying ESC-2219 as operative. tmp/bench/results/v9/audit/items3.json:3
   - `e203b2b5`: “Approval Code: MX-4486 (rotated early from Marcus Oyelaran’s original code MX-4471)” identifies the operative code and its retired predecessor. tmp/bench/results/v9/audit/items3.json:112

   Probes reproduced both stale-value hits. Equivalent “corrected from” wording passes; controls directing use of the dead values fail. The semantic rulings follow the reply text, not the scorer’s vocabulary. Item verdict changes: none.

3. **CONFIRMED — Claim 3.** The attack was to resolve either ambiguous item decisively from its arithmetic or surrounding wording. Both `8607b631` and `ddeaeebf` state the $3,000 request and $3,760 available without explicitly saying the request fits. An accepting reading treats that comparison as an implicit affirmative answer (`misread`); a stricter reading requires the requested fit decision (`real`). Both existing reasons name these readings. tmp/bench/results/v9/audit/items2.json:375 tmp/bench/results/v9/audit/items3.json:796 tmp/bench/results/v9/audit/verdicts2.json:74 tmp/bench/results/v9/audit/verdicts3.json:146

   This judgment is reasoned from the text; reproducing the lexical miss cannot resolve the grading ambiguity. Item verdict changes: none.

4. **CONFIRMED — Claim 4.** The attack compared equivalent replies across batches. `e421c7ac` and `6ed90f56` both leave the fit decision unanswered and receive `real`; `8607b631` and `ddeaeebf` both calculate available credit without an explicit decision and receive `ambiguous`. tmp/bench/results/v9/audit/items2.json:437 tmp/bench/results/v9/audit/items3.json:548 tmp/bench/results/v9/audit/items2.json:375 tmp/bench/results/v9/audit/items3.json:796

   The same consistency holds for customer-facing delivery estimates (`7a8bd5e5`, `6af840e3`) and incorrect Friday timing (`e133427f`, `c6c00d3f`). No equivalent error receives conflicting verdicts. This conclusion is reasoned from the requests, replies, and verdicts. tmp/bench/results/v9/audit/verdicts2.json:18 tmp/bench/results/v9/audit/verdicts3.json:42 tmp/bench/results/v9/audit/verdicts2.json:50 tmp/bench/results/v9/audit/verdicts3.json:98

5. **CONFIRMED — Claim 5.** The attack removed scorer-only or debatable failures conceptually and checked whether each `real` reason still names a genuine fault. In `6af840e3`, `b6ffa80c`, and `c920c6da`, the historical ship date is harmless, but the separately stated arrival date is prohibited and expressly named. In `6f34f0a6` and `723021c7`, disputing the tracking-number requirement leaves the named delivery-date violation intact. tmp/bench/results/v9/audit/verdicts3.json:42 tmp/bench/results/v9/audit/verdicts3.json:74 tmp/bench/results/v9/audit/verdicts3.json:82 tmp/bench/results/v9/audit/verdicts3.json:58 tmp/bench/results/v9/audit/verdicts3.json:66

   The probe confirms that a ship-date-only reply still triggers the date pattern, while a delivery-date reply triggers both that pattern and the forbidden date. The verdicts correctly distinguish those meanings. No `real` verdict depends solely on a scorer-only miss.

Findings outside the claims: none. Cost advisories: none.

Attacked and held: a Friday mention describing Tomasz’s absence passes the scorer; a Friday action deadline fails. A callback giving extension 4127 after 2 pm passes; adding Ines’s number fails. These controls distinguish legitimate adjacent behavior from the faults in `e133427f` and `6b5892f0`. tmp/bench/results/v9/audit/items2.json:210 tmp/bench/results/v9/audit/items2.json:541

VERDICT: PASS