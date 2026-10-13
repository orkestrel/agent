1. **BROKEN.** The recorded `a4-refined-v6` comparison has unequal g06 rows. The judge fault embeds different randomly generated message IDs; wall-clock fields also require normalization. This is inherited nondeterminism, not an observed records regression. Additionally, off runs execute the sentence and token helpers imported from `records.mjs`. Evidence: tmp/bench/results/v9/recordsrender/proof/final2.txt:25, tmp/bench/results/v9/recordsrender/proof/final2/dry/frozen-a4-refined-v6/out/ledger.jsonl:6, tmp/bench/results/v9/recordsrender/proof/final2/dry/off-a4-refined-v6/out/ledger.jsonl:6, tmp/bench/results/v9/recordsrender/bench.mjs:34. Smallest correct repair: define parity over deterministic fields, canonicalize diagnostic source IDs by conversation position, and distinguish shared parsing helpers from record projection. Literal equality of independently measured durations cannot be repaired by a candidate-only patch.

2. **BROKEN.** Read-only probes reproduced these failures:
   
   - With the seed judgments loaded, request `List the escalation tickets.`, desk topic `escalations`, no named account, context 10000, and tail share 0, the system renders `Escalations opened ticket ESC-2291 for it.` from m22. The unscoped branch retains the raw unit; `assertPlan` reports the stale token but still returns the plan. The removal must apply to raw fallback sentences too. Evidence: tmp/bench/results/v9/recordsrender/bench.mjs:2117, tmp/bench/results/v9/recordsrender/bench.mjs:2251, tmp/bench/results/v9/recordsrender/bench.mjs:1233.
   - Append `The approval code MX-4486 is replaced by MX-4499.`, with decided amendment and supersession of m29, then request g05. The system revives m2’s MX-4471 sentence. Both `records.stale` and `assertPlan` are empty. Removing m29 from the live set erases the evidence that m29 corrected m2. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:372.
   
   Smallest correct repair: retain correction effects after their correcting source is superseded, and filter stale sentences on every system-rendering route. For the reproduced correction chain, these exact replacements preserve the earlier correction’s effect in the builder and checker:
   
   ```diff
   --- a/tmp/bench/results/v9/recordsrender/records.mjs
   +++ b/tmp/bench/results/v9/recordsrender/records.mjs
   @@
   -		const laters = (judgments.amended?.[id] ?? []).filter((later) => live.has(later))
   +		const laters = (judgments.amended?.[id] ?? []).filter((later) => live.has(later) || (judgments.superseded?.[later] ?? []).length > 0)
   @@
   -		const laters = (input.judgments?.amended?.[id] ?? []).filter((later) => members.has(later)).map((later) => extractTokens(index.byId.get(later).content))
   +		const laters = (input.judgments?.amended?.[id] ?? []).filter((later) => members.has(later) || (input.judgments?.superseded?.[later] ?? []).length > 0).map((later) => extractTokens(index.byId.get(later).content))
   ```
   
   This patch addresses the demonstrated chain, not the raw-render failure. The stale assertion’s injected-array test does not distinguish the chain failure: its producer supplies an empty array, so the assertion has nothing to reject. Evidence: tmp/bench/results/v9/recordsrender/bench.mjs:3116, tmp/bench/results/v9/recordsrender/bench.mjs:3251, tmp/bench/results/v9/recordsrender/bench.mjs:4483.

3. **CONFIRMED.** For the supplied scenario goals, attacks against entry-fact preservation held. An independent comparison across the a4 dry renders found no required positive scorer literal present in the frozen entry system and absent from the candidate’s entry system. Shrinking-window probes against the seed goals found no lost required source that refined still covered. Cutting an account line or a matching Rules line sets `over` through the explicit predicates. Evidence: tmp/bench/results/v9/recordsrender/bench.mjs:2173, tmp/bench/results/v9/recordsrender/bench.mjs:2184.
   
   Proof mutations: removing the gift-note sentence would fail the expected Kenji text; forcing `over` false after a matching Rules cut would fail the consolidation assertion. Those assertions distinguish both mutations. Evidence: tmp/bench/results/v9/recordsrender/records-check.mjs:179, tmp/bench/results/v9/recordsrender/bench.mjs:4447. This confirmation concerns the supplied scorers; it does not establish claim 9.

4. **CONFIRMED.** Attacks selecting a different registered account, selecting no account, and attempting to introduce a foreign account heading held. Account views come only from the request’s resolved account list; Rules is selected separately. The unscoped escalation probe retained refined’s Pinned units and read Rules, although that behavior exposes claim 2. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:118, tmp/bench/results/v9/recordsrender/records.mjs:122, tmp/bench/results/v9/recordsrender/bench.mjs:2113.
   
   Proof mutations: selecting every account would produce foreign headings; omitting Rules for an unscoped request would fail the explicit unscoped assertion. The assertions distinguish both. Evidence: tmp/bench/results/v9/recordsrender/records-report.mjs:93, tmp/bench/results/v9/recordsrender/bench.mjs:4399.

5. **BROKEN.** A successful `lookup_order` for LH-79215 followed, in a later request, by an identical successful lookup returning `no record found` leaves the earlier $289 result in the record. The module reports no faults; `assertPlan` correctly reports that the displayed lookup was replaced. The adapter removes the empty successor before the module can use it as a replacement. Evidence: tmp/bench/results/v9/recordsrender/bench.mjs:2030, tmp/bench/results/v9/recordsrender/bench.mjs:1758, tmp/bench/results/v9/recordsrender/records.mjs:330.
   
   The smallest adapter repair is:
   
   ```diff
   --- a/tmp/bench/results/v9/recordsrender/bench.mjs
   +++ b/tmp/bench/results/v9/recordsrender/bench.mjs
   @@
   -				if (call === undefined || !LOOKUPS.has(call.name) || result?.success !== true || this.empty(result)) return []
   +				if (call === undefined || !LOOKUPS.has(call.name) || result?.success !== true || this.empty(result) || this.replaced(message.id, marks) !== undefined) return []
   ```
   
   The prefix clause also fails. Input `The buyer visited Riverside Depot. She orders on Mondays.` produces `Riverside Depot: She orders on Mondays.`, with no checker fault. Capitalization does not establish that an antecedent is a person. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:393, tmp/bench/results/v9/recordsrender/records.mjs:212. The conservative repair is to omit inferred prefixes until person identity has evidence:
   
   ```diff
   --- a/tmp/bench/results/v9/recordsrender/records.mjs
   +++ b/tmp/bench/results/v9/recordsrender/records.mjs
   @@
   -			const party = PRONOUN.test(sentence) && at > 0 ? listRuns(sentences[at - 1]).filter((name) => !holders.includes(name) && !system.includes(name)).at(-1) : undefined
   +			const party = undefined
   ```

6. **BROKEN.** A read-only budget probe used context 1536, budget 0.7, tail share 0.35, and this history:
   
   - An AC-1 message containing `Keep the parcel at the depot.` repeated 100 times.
   - `Check account AC-1.`
   - A successful customer lookup returning `Account AC-1: Brightwater Studio, credit limit $500.`
   - Request `What is the credit limit for AC-1?`
   
   Refined retains the lookup and renders the tail stub `result shown under Pinned in the system message`. Records cuts the lookup from the account record and renders `result not shown; call recall with AC-1`. The history is identical; the tail bytes differ. Evidence: tmp/bench/results/v9/recordsrender/bench.mjs:2149, tmp/bench/results/v9/recordsrender/bench.mjs:2167, tmp/bench/results/v9/recordsrender/bench.mjs:1882.
   
   Smallest correct repair requires retaining baseline lookup visibility wherever baseline tail bytes assert that visibility. Copying the baseline stub alone would make the stub false. This is a consolidation-design repair, not a wording substitution.
   
   The supplied a4 dry tails do match exactly. The report’s `tailSame` field nevertheless discards lookup-status text before comparison. Replace that comparison with the actual byte-sensitive message comparison:
   
   ```diff
   --- a/tmp/bench/results/v9/recordsrender/records-report.mjs
   +++ b/tmp/bench/results/v9/recordsrender/records-report.mjs
   @@
   -						tailSame: offMessages !== undefined && JSON.stringify(offMessages.slice(1).map(selected)) === JSON.stringify(messages[0].slice(1).map(selected)),
   +						tailSame: offMessages !== undefined && JSON.stringify(offMessages.slice(1)) === JSON.stringify(messages[0].slice(1)),
   ```

7. **CONFIRMED.** The added-question and changed-state attacks held for the recorded histories. Every candidate-on judge body matched its corresponding frozen dry body across the a4 wires. Reading the live wires also found no original refined request body missing from the corresponding frozen dry render. Record projection reads existing judgments after categorization and adds no judge invocation. Evidence: tmp/bench/results/v9/recordsrender/bench.mjs:1226, tmp/bench/results/v9/recordsrender/bench.mjs:2054.
   
   Proof mutation: changing a judge question or its state would make the exact-body comparison fail; adding a question would change the body sequence. The comparisons distinguish these mutations. Evidence: tmp/bench/results/v9/recordsrender/compare-dry.mjs:11, tmp/bench/results/v9/recordsrender/compare-dry.mjs:13. This does not predict identical model behavior between live arms.

8. **BROKEN.** Two successive customer results with arguments `{account:"AC-1",region:"north"}` and `{region:"north",account:"AC-1"}` retain both the old $75 balance and the replacement $50 balance. Reordering only the second object to match the first removes the old result and changes the build hash. Both builds pass `checkRecords`. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:321, tmp/bench/results/v9/recordsrender/records.mjs:333, tmp/bench/results/v9/recordsrender/records.mjs:195.
   
   Reversing every object simultaneously preserves this inconsistent-order relationship, so the existing reversal assertion cannot detect this input. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:298. The smallest repair for the demonstrated flat lookup arguments is:
   
   ```diff
   --- a/tmp/bench/results/v9/recordsrender/records.mjs
   +++ b/tmp/bench/results/v9/recordsrender/records.mjs
   @@
   -	const shape = (result) => `${result.name} ${JSON.stringify(Object.entries(result.arguments ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toUpperCase() : value]))}`
   +	const shape = (result) => `${result.name} ${JSON.stringify(Object.entries(result.arguments ?? {}).sort(([left], [right]) => compareText(left, right)).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toUpperCase() : value]))}`
   @@
   -	return JSON.stringify(Object.entries(args ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toUpperCase() : value]))
   +	return JSON.stringify(Object.entries(args ?? {}).sort(([left], [right]) => compareText(left, right)).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toUpperCase() : value]))
   ```
   
   If nested argument objects are admitted, canonicalization must also recurse into those objects. The independent-key-order case must enter the fixtures.

9. **BROKEN.** Request `Does Grace have to pay a restocking fee for an opened-item return?`, with desk topic `refunds`, context 3072, and tail share 0. Refined shows `Opened-item returns get a full refund again.` Records drops it, with `over:false`. The desk-wide correction is in m44, whose reference to Luis confines it to Luis’s record. It reaches neither Grace’s record, Rules, nor a loose unit. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:357, tmp/bench/results/v9/recordsrender/bench.mjs:2117. The imported supersession is established in tmp/bench/results/v3/cal-categories.jsonl:67.
   
   Smallest repair for this demonstrated loss: suppress raw units only when a selected record replaces them. Preserve refined’s otherwise relevant units, applying claim 2’s sentence filtering:
   
   ```diff
   --- a/tmp/bench/results/v9/recordsrender/bench.mjs
   +++ b/tmp/bench/results/v9/recordsrender/bench.mjs
   @@
   -			const recorded = new Set([...held].filter((source) => scoped || ruleMembers.has(source) || (units.has(source) && this.#ruled(units.get(source)))))
   +			const selectedKeys = new Set(records?.views.map((view) => view.key) ?? [])
   +			const recorded = new Set(reads ? records.built.records.filter((record) => selectedKeys.has(record.key)).flatMap((record) => record.members) : [])
   @@
   -					if (done.has(later) || scope?.members.has(later) || (rule && scope?.held.has(later))) continue
   +					if (done.has(later) || scope?.members.has(later)) continue
   ```
   
   This changes the account-scope ruling and requires reconciliation. It repairs the reproduced loss; it does not establish a universal inference of unnamed account relationships.

10. **BROKEN.** The a4 g06 rewordings name the same unregistered Kenji account at entry, yet their Rules views differ: v1 begins with the depot-release rule; v2 begins with the refund-approval rule. Evidence: tmp/bench/results/v9/recordsrender/proof/final2/dry/on-a4-refined-v1/bodies/00055_api_chat.json:1, tmp/bench/results/v9/recordsrender/proof/final2/dry/on-a4-refined-v2/bodies/00053_api_chat.json:1. The request’s decided desk topics reorder Rules and determine which Rules lines consolidation cuts first. Evidence: tmp/bench/results/v9/recordsrender/records.mjs:125, tmp/bench/results/v9/recordsrender/bench.mjs:2146.
    
    Smallest correct resolution: reconcile claim 10 with the explicit desk-dependent ordering and cutting policy. Making the claim literally true requires both request-independent Rules ordering and request-independent Rules cutting. Changing ordering alone would invalidate the prefix-based consolidation assumptions. No scenario-specific membership literal was found; the failure is the additional dependency on request wording through desk judgments.

Findings outside the claims: none. Cost findings: none.

Attacked and held:

- The offline module check ran successfully: 253 of 253 assertions passed. The counterexamples demonstrate gaps beyond those fixtures.
- Assistant sources, quiet sources, excluded sources, and ordinary same-key-order repeated lookups remained excluded in the supplied builds. An empty supersession list correctly leaves a source live.
- A correcting sentence may mention the old value. That is permitted by claim 2 and differs from reviving the earlier sentence.
- Raw recall results and other-account tail history are not account records in the system message. Their presence alone does not break claims 2 or 4.
- All probes were read-only. The proposed patches were not applied or validated as an integrated repair.

VERDICT: FAIL 1,2,5,6,8,9,10; outside the claims: none