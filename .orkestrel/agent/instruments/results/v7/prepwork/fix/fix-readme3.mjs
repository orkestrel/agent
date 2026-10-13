// Updates bench3/README.md for the scorer and fabricated fixes.
import { swap } from './swap.mjs'

swap('/home/user/agent/tmp/bench3/README.md', [
	[
		'An id-shaped token is stated when that text holds it in any case with each hyphen written as a hyphen or whitespace, so `5-quart` restates `5 quart`. A number is stated when that text holds it, or when it equals, to the cent, the sum or difference of two numbers that both the answer and that text state, so `$3,760 ($5,000 - $1,240)` restates the two amounts. A product, a percentage, a chain of steps, or a sum whose operands the answer leaves out counts as invented,',
		'An id-shaped token is stated when that text holds it in any case with each hyphen written as a hyphen, a space, or a tab on one line, so `5-quart` restates `5 quart`. A number is stated when that text holds it, or when the answer writes it as a dollar amount equal, to the cent, to the sum or difference of two dollar amounts that both the answer and that text state, so `$3,760 ($5,000 - $1,240)` restates the two amounts. A product, a percentage, a chain of steps, a sum whose operands the answer leaves out, or a sum with an operand that is no dollar amount counts as invented, so `$280.00` beside `$289.00` and `October 9` does,',
	],
	[
		'A scoring set scores the 45 fixed texts of the main harness\'s `--probe-score` with the scenario rules, among them `not **ESC-2291**` (g04, passes) and `by **Friday**` (g07, fails), checks the success rule on a reply, an empty reply, and a first run that threw, and checks the `fabricated` rule on restated, computed, and invented tokens.',
		'A scoring set scores the 58 fixed texts of the main harness\'s `--probe-score` with the scenario rules, among them `not **ESC-2291**` (g04, passes) and `by **Friday**` (g07, fails), checks the success rule on a reply, an empty reply, and a first run that threw, and checks the `fabricated` rule on restated, computed, and invented tokens, among them an amount that equals a dollar amount minus a date part and an id the corpus spells only across a line break.',
	],
	[
		"and g07's bare `Friday, October 9` alternative skips a day-off phrase such as \"off work tomorrow (Friday, October 9th)\". The main harness's README gives each pattern.",
		"and g07's bare `Friday, October 9` alternative skips a day-off phrase such as \"off work tomorrow (Friday, October 9th)\". The 6 review fixes of `results/v7/prepwork/fix/fix-scenario.mjs` follow on both scenarios: the parenthesis that exempts MX-4471 or ESC-2291 must retire that id, g08's `sufficient` negation adds `no`, `nor`, `without`, `lack`, `short of`, and every `n't` form, g07's day-off phrase before `tomorrow (` holds only day-off words, and g07 fails a reply whose every `today` states a day off. The main harness's README gives each pattern.",
	],
	[
		'- `fabricated` no longer counts a token the corpus states in another case or with a space for a hyphen, or the sum or difference of two numbers the answer and the corpus both state,',
		'- `fabricated` no longer counts a token the corpus states in another case or with a space for a hyphen, or a dollar amount that is the sum or difference of two dollar amounts the answer and the corpus both state,',
	],
])
