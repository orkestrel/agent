# Blind semantic and action audit

The packet distinguishes correct answers from fulfilled actions: a recalled lookup result does not satisfy the controlling fresh-lookup requirement. Each supplied entry has an independent semantic, system-tool, listed-tool, and complete-work verdict in the judgment file.

## Evidence population

The input is `C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-development-blind-packet-successor-a/packet.json`, verified before grading against SHA256 `6d10d40bc303dc09c4db2d643fbc913cafe647899e070703a7856db9a7641745`.

The packet contains 72 planned entries. All 72 retain status `served`; this packet contains no failed or unattempted entry. Every supplied ID appears exactly once in `aggregate-successor-quality-a-judgments.json`. A served status records an operational response, not semantic or complete-work success. The g06 entries remain in the raw judgments.

The truth reference is `C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`. I read its original goals, ledger protocol, seed conversation, and canned/versioned lookup sources directly. Each judgment cites the original authored goal and eligible seed rows, plus the packet's retained reply and actual action fields. The packet remains unchanged.

I inspected no private joins, run directories, prior grades, other audit answers, automatic scores, model identities, or service artifacts. I used no model call, delegation, automatic pattern scorer, or substring-based semantic grading. Programmatic work serialized my manual verdicts and checked structural coverage and citation resolution.

## Grading conventions

The following conventions determine the separate axes.

- **Semantic:** The response must answer the substantive request accurately under the eligible conversation. Corrected identifiers, withdrawn rules, expired delegation, reopened damage, and completed carrier chases matter. A corrected or historical value is not a stale assertion merely because it occurs in the reply. Equivalent currency/date formatting and implicit but clear arithmetic conclusions are accepted.
- **System-tool:** The original `ledger.system` governs. Requests about known customer accounts or orders require a fresh goal-local `lookup_order` or `lookup_customer` for the relevant identifier. A request can concern such an identifier through the customer's name without repeating its literal ID. Recalled or seeded old lookup results do not count. Generic walk-in-counter policy has no associated order/account and does not require a lookup.
- **Listed-tool:** The authored per-goal list is a separate, narrower action contract. `recall` replaces `search_history`; the final reply replaces `send_reply`. A missing lookup in that list does not waive the system rule. Conversely, a fresh customer lookup satisfies the system's disjunction but does not satisfy an explicit `lookup_order` entry.
- **Complete-work:** A served response must have acceptable substantive content and fulfill the required actions. A known failure on either action axis prevents completion, even if another axis is ambiguous. Ambiguous content with otherwise adequate actions remains ambiguous. A failed or unattempted response could never count as completed work, although there is none in this packet.

The system also requires recall when needed facts are out of view. The packet supplies actual calls/results and replies, but does not fully expose the initial per-entry model view. I therefore do not infer a conditional recall violation merely from absence of recall where the explicit goal list does not require it. This limit cannot excuse a missing unconditional fresh lookup.

A cited seed boundary is inclusive. Later corrections never decide earlier goals. In particular, Owen Pritchard and extension 4310 remain eligible for account-manager replies through seed 137; Hana's seed-138 replacement does not apply retroactively.

## Ambiguities and material readings

The following entries preserve interpretation limits.

- `6175ce8c13c7f6604341ac5e93de22a7` and `784e187a063079b4bdcb10af424b62ad`: The gift text is correct, and the replies refuse to promise a date. Their reference to the original October 12 estimate can be internal historical advice. Under the requested customer-draft reading, however, they provide no directly sendable reply and associate an old kettle estimate with a second shipment whose arrival is not established. Semantic verdict: ambiguous. Complete work still fails because no fresh lookup occurred.
- `7f8d25ba543f51147b021e483c6f2608`: The Saturday closure and Monday day are correct. The source does not specify Monday morning as the reopening period. A day-level reading passes; an exact-time reading adds an unsupported fact. Semantic and complete-work verdicts remain ambiguous.
- `4a6801b598f71bbdc3fbe066ffaf2386`, `4d08a00afbde7c29c4a0551645533ea9`, and `50edc8cf7c8607f1cf71086769da5369`: ESC-2219 is correct. The protocol sends final text to the shift lead, so it cannot establish delivery to Priya. The informational/draft-only content bound passes. Actual delivery remains unproved, and these entries independently fail the fresh-lookup requirement. The first entry's claim that Priya was copied can describe seed-23 history; it is not evidence of a goal-local delivery action.

Other readings are stated in the individual reasons. The October 9 Luis reply that says the October 21 window already closed fails temporal accuracy despite having the right date value. Replies saying the window ends October 21 pass that point. Their non-specific reassurance that the refund appears shortly is not treated as a verified processing deadline.

The Grace October 9 response that first names Marcus's ordinary sign-off requirement and then expressly substitutes Ruth is read as a coherent delegation explanation. October 10 responses that assign Ruth the actual sign-off fail because her cover has expired.

The walk-in replies saying Monday morning or later are read as deferring return processing until Monday, not guaranteeing a precise opening hour. The separate reply asserting that the counter will reopen Monday morning carries the explicit-time ambiguity.

The packet's g06 customer replies fail on their own content, including written arrival estimates and an incorrect today/shipment-date equation. No unavailable `send_reply` call is demanded, and the goal receives no automatic exemption.

## Limits and sealing

These judgments cover the supplied public packet and its eligible authored truth only. They do not establish external delivery, hidden action execution, response latency, cost, or broader model performance. No group identity was inferred and no totals were computed by a guessed group.

The judgment JSON preserves each opaque ID and exact status. Original reply text is retained in the sealed input and cited directly rather than rewritten as evidence. The returned SHA256 seals the judgment file; any later change requires a different seal.

