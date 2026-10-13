// Updates bench/README.md for the guard and scorer fixes.
import { swap } from './swap.mjs'

swap('/home/user/agent/tmp/bench/README.md', [
	['runs the summarizer guard over 9 fixtures with a stubbed summarizer', 'runs the summarizer guard over 11 fixtures with a stubbed summarizer'],
	[
		"; a merge of id-free sections whose summary is `No facts.`; and a goal fold whose summary drops the ids of a lookup and of the assistant reply, two of which only the reply states) and prints,",
		"; a merge of id-free sections whose sources hold the seed 44-45 withdrawal and whose first summary is `No facts.`; a merge of id-free sections whose sources hold only a `send_reply` call and its result, and whose summary is `No facts.`; a goal fold whose summary drops the ids of a lookup and of the assistant reply, two of which only the reply states; and a goal fold whose summary drops the ids of a lookup and of a `search_history` result that quotes an assistant reply) and prints,",
	],
	[
		'Exits 1 when a final summary carries an identifier that neither its input nor a user or tool message of its sources states, lacks an input identifier that such a message states, or holds an `Identifiers:` line, when a restored sentence is not a user or tool sentence verbatim, when either `No facts.` fold over facts is not retried as `empty` or keeps `No facts.`, when the empty withdrawal fold keeps its first summary over a non-empty retry, when the merge without a user or tool message is retried, when the worse retry replaces the first summary, or when the goal fold restores an assistant sentence or keeps an id only the reply states. |',
		'Exits 1 when a final summary carries an identifier that neither its input nor a user message or lookup result of its sources states, lacks an input identifier that such a message states, or holds an `Identifiers:` line, when a restored sentence is not a user or lookup sentence verbatim, when either `No facts.` fold over facts is not retried as `empty` or keeps `No facts.`, when the empty withdrawal fold or the withdrawal merge keeps its first summary over a non-empty retry, when the merge without a user message or lookup result is retried, when the worse retry replaces the first summary, when the goal fold restores an assistant sentence or keeps an id only the reply states, or when the search fold restores the quoted reply or loses the lookup id. |',
	],
	[
		'An empty summary or `No facts.` over an input that holds an identifier, or a user or tool message, counts as such a failure,',
		'An empty summary or `No facts.` over an input that holds an identifier, or over sources that hold a user message or a `lookup_order` or `lookup_customer` result, counts as such a failure; a merge reads its merged sections\' messages, because its input is their summaries,',
	],
	[
		'3. Each identifier still missing is restored by the last user or tool sentence of the sources that holds it,',
		'3. Each identifier still missing is restored by the last sentence of a user message or lookup result of the sources that holds it,',
	],
	[
		'An assistant message, its tool-call arguments included, holds the model\'s own words, which can carry a wrong answer, so the guard never restores from one, and an identifier that only assistant messages state stays out of the summary. The sentences replace an empty summary or `No facts.`. No summary loses an identifier that a user or tool message of its sources states,',
		'An assistant message, its tool-call arguments included, holds the model\'s own words, which can carry a wrong answer, and so does a `search_history` result, which quotes earlier messages as `role: content` lines, so the guard never restores from either, and an identifier that only those messages state stays out of the summary. A `send_reply` result states nothing. The guard reads a result\'s tool name from its call, which the harness records when the tool runs. The sentences replace an empty summary or `No facts.`. No summary loses an identifier that a user message or lookup result of its sources states,',
	],
	[
		'(the calls whose summary was empty or `No facts.` over identifiers or a user or tool message)',
		'(the calls whose summary was empty or `No facts.` over identifiers or a user message or lookup result)',
	],
	[
		'and the guard retries an empty or `No facts.` summary over any input with a user or tool message, as the earlier section on the summarizer guard describes.',
		'and the guard retries an empty or `No facts.` summary whose sources hold a user message or lookup result, a merge included, as the earlier section on the summarizer guard describes.',
	],
	[
		'- The guard restores a lost identifier only from a user or tool sentence of its sources, never from an assistant message.',
		'- The guard restores a lost identifier only from a user message or lookup result of its sources, never from an assistant message or a `search_history` result, which quotes the model\'s replies.',
	],
	[
		"`not`, `never`, `no longer`, `hardly`, `isn't`, `aren't`, `wasn't`, `won't be`, or `wouldn't be` up to 1 word before `sufficient`, or `insufficient`;",
		"`not`, `never`, `no longer`, `hardly`, `no`, `nor`, `without`, `lack`, `lacks`, `lacking`, `lack of`, `short of`, `fall short`, `falls short`, or a word ending in `n't`, with an optional `be`, up to 1 word before `sufficient`, or `insufficient`;",
	],
	[
		'and a parenthesis after it that opens with a retirement word.',
		'and a parenthesis after it that retires the code: one that opens with `replaced by` or `superseded by`, or with a retirement word that no other code follows within 2 words, so "MX-4471 (previous code MX-4486 is no longer valid)" and "MX-4471 (replaced MX-4486)" still fail.',
	],
	[
		"skips a day-off phrase with 1 to 3 words between `off`, `out`, `away`, `unavailable`, `absent`, or `leave` and `tomorrow (`, none of them `by`, `before`, `until`, `no`, `due`, or `deadline`, as in \"off work tomorrow (Friday, October 9th)\". A deadline of Friday or tomorrow still fails through the other alternatives.",
		"skips a day-off phrase with up to 3 words between `off`, `out`, `away`, `unavailable`, `absent`, or `leave` and `tomorrow (`, each of them `work`, `sick`, `of`, `the`, `office`, `from`, `on`, `leave`, `for`, `all`, `day`, or `duty`, as in \"off work tomorrow (Friday, October 9th)\", so \"out today so release tomorrow (Friday, October 9th)\" still fails. A deadline of Friday or tomorrow still fails through the other alternatives. g07 also gains a pattern that fails a reply holding `today` only in a day-off phrase (`unavailable` or `absent` before it, `on leave`, or `off`, `out`, or `away` after a form of `be` or a `'s`, optionally followed by `work`, `sick`, or `of the office`) and no `2026-10-08`, as in \"he is unavailable today\".",
	],
	[
		'Rescored with these rules into `results/v7/prepwork/rescored/`, the Round A files pass 5 (`none-6144`), 5 (`compaction`), 3 (`both`), and 7 (`ledger`) of 10, against the recorded 5, 4, 4, and 5. The `compaction` g07 reply passes: "off work tomorrow (Friday, October 9th)" no longer fails it, and "today" matches inside "unavailable today", so no rule reads its missing deadline, which the rubric fails.',
		'Rescored with these rules into `results/v7/prepwork/fix/rescored/`, the Round A files pass 5 (`none-6144`), 4 (`compaction`), 3 (`both`), and 7 (`ledger`) of 10, against the recorded 5, 4, 4, and 5. The `compaction` g07 reply fails on the day-off pattern: its only `today` is in "unavailable today", so it gives no deadline, as the rubric reads it.',
	],
])
