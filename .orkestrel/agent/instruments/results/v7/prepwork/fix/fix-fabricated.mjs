// Limits the fabricated rule's computed amounts to currency amounts and keeps an id's spelled form on one line.
import { swap } from './swap.mjs'

swap('/home/user/agent/tmp/bench3/bench.mjs', [
	[
		`// The id-shaped and numeric tokens of \`text\` that \`corpus\` does not state. An id-shaped token is stated when
// the corpus holds it in any case with each hyphen written as a hyphen or whitespace, so "5-quart" restates
// "5 quart". A number is stated when the corpus holds it, or when it equals to the cent the sum or difference
// of two numbers that both the text and the corpus state, so "$3,760 ($5,000 - $1,240)" restates the two
// amounts; a product, a percentage, or a chain of steps counts as invented.
function listFabricated(text, corpus) {
	const known = extractTokens(corpus)
	const found = extractTokens(text)
	const missing = new Set(listMissingTokens(found, known))
	const cents = (value) => Math.round(value * 100)
	const operands = [...found.numbers].filter((number) => known.numbers.has(number)).map(cents)
	const derived = new Set()
	for (const left of operands) for (const right of operands) if (left !== right) derived.add(left + right).add(Math.abs(left - right))
	for (const number of found.numbers) if (missing.has(String(number)) && derived.has(cents(number))) missing.delete(String(number))
	for (const id of found.ids) {
		if (!missing.has(id)) continue
		const spelled = new RegExp(\`(?<![\\\\p{L}\\\\p{N}-])\${id.split('-').map(escapePattern).join('[\\\\s-]+')}(?![\\\\p{L}\\\\p{N}-])\`, 'iu')`,
		`// The id-shaped and numeric tokens of \`text\` that \`corpus\` does not state. An id-shaped token is stated when
// the corpus holds it in any case with each hyphen written as a hyphen, a space, or a tab on one line, so
// "5-quart" restates "5 quart". A number is stated when the corpus holds it, or when the text writes it as a
// dollar amount equal to the cent to the sum or difference of two dollar amounts that both the text and the
// corpus state, so "$3,760 ($5,000 - $1,240)" restates the two amounts; a product, a percentage, a chain of
// steps, or a sum with an operand that is no dollar amount, such as the 9 of "October 9", counts as invented.
function listFabricated(text, corpus) {
	const known = extractTokens(corpus)
	const found = extractTokens(text)
	const missing = new Set(listMissingTokens(found, known))
	const cents = (value) => Math.round(value * 100)
	const amounts = new Set([...String(text ?? '').matchAll(/\\$\\s?(\\d[\\d,]*(?:\\.\\d+)?)/g)].map(([, token]) => Number(token.replace(/,/g, ''))))
	const operands = [...amounts].filter((number) => known.numbers.has(number)).map(cents)
	const derived = new Set()
	for (const left of operands) for (const right of operands) if (left !== right) derived.add(left + right).add(Math.abs(left - right))
	for (const number of amounts) if (missing.has(String(number)) && derived.has(cents(number))) missing.delete(String(number))
	for (const id of found.ids) {
		if (!missing.has(id)) continue
		const spelled = new RegExp(\`(?<![\\\\p{L}\\\\p{N}-])\${id.split('-').map(escapePattern).join('[ \\\\t-]+')}(?![\\\\p{L}\\\\p{N}-])\`, 'iu')`,
	],
	[
		`		'fabricated counts no token the corpus states up to case and a hyphen written as a space, and no sum or difference of two numbers both texts state',`,
		`		'fabricated counts no token the corpus states up to case and a hyphen written as a space on one line, and no dollar sum or difference of two dollar amounts both texts state',`,
	],
])
