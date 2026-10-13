// Re-scores recorded bench result lines with the scoring rules in scenario.json, without the daemon.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCENARIO = join(HERE, 'scenario.json')

/**
 * Compiles one goal's scoring rules; bench.mjs and the rescoring share this so both score alike.
 * @param goal - A scenario goal with `expected`, optional `expectedAny`, `forbidden`, and optional `forbiddenPatterns`
 * @returns The rules with each pattern compiled case-insensitively
 */
export function compileRules(goal) {
	return {
		expected: goal.expected ?? [],
		expectedAny: goal.expectedAny ?? [],
		forbidden: goal.forbidden ?? [],
		patterns: (goal.forbiddenPatterns ?? []).map((source) => {
			try {
				return { source, pattern: new RegExp(source, 'i') }
			} catch (error) {
				throw new Error(`goal ${goal.id} has an invalid forbidden pattern ${source}: ${error.message}`)
			}
		}),
	}
}

// Markdown that only styles a reply: bold and italic markers, backticks, table pipes and separator
// rows, heading marks, and list bullets. An underscore inside a word, as in send_reply, stays.
// A table cell boundary becomes CELL rather than a space, so a pattern's `\s+` or word chain never
// joins two cells or two rows, which the pipes on the raw text also prevent; `[^.\n]*` crosses it as it
// crosses a pipe. CELL is neither whitespace, a word character, nor a period.
const CELL = '¦'
const TABLE_RULE = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/
const HEADING = /^\s{0,3}#{1,6}\s+/
const BULLET = /^\s*(?:[-*+•]|\d+[.)])\s+/
const UNDERSCORE = /(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu

// Wraps a table line's cells in CELL, the outer pipes included or not, so a row starts and ends with one.
function tableRow(line) {
	const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
	return `${CELL} ${cells.map((cell) => cell.trim()).join(` ${CELL} `)} ${CELL}`
}

/**
 * Removes the markdown that styles a reply, so a marker between words never decides a check, and writes a
 * typographic single quote as `'` so a pattern names one apostrophe.
 * @param text - The reply or answer text
 * @returns The text without those markers, each table cell bounded by `CELL`, each line trimmed and its runs
 * of spaces and tabs collapsed to one
 */
export function plainText(text) {
	return String(text)
		.replace(/[‘’]/g, "'")
		.split('\n')
		.filter((line) => !TABLE_RULE.test(line))
		.map((line) => {
			const plain = line.replace(HEADING, '').replace(BULLET, '').replaceAll('*', '').replaceAll('`', '').replace(UNDERSCORE, '')
			return (plain.includes('|') ? tableRow(plain) : plain).replace(/[ \t]+/g, ' ').trim()
		})
		.join('\n')
}

// An `expectedAny` entry matches only between characters that are neither letters nor digits,
// because a verdict word such as "no" or "yes" occurs inside other words.
function wordMatcher(phrase) {
	return new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu')
}

/**
 * Scores one text against compiled rules, case-insensitively, on the text without its markdown
 * (see `plainText`); the caller keeps the original for display.
 * @param rules - The output of `compileRules`
 * @param text - The reply or answer text
 * @returns The expected strings it lacks, the forbidden strings it holds, and the pattern sources it matches
 */
export function scoreText(rules, text) {
	const plain = plainText(text)
	const lower = plain.toLowerCase()
	const missing = rules.expected.filter((expected) => !lower.includes(expected.toLowerCase()))
	if (rules.expectedAny.length > 0 && !rules.expectedAny.some((expected) => wordMatcher(expected).test(plain)))
		missing.push(`any of ${rules.expectedAny.join('/')}`)
	return {
		missing,
		violations: rules.forbidden.filter((forbidden) => lower.includes(forbidden.toLowerCase())),
		patterns: rules.patterns.filter(({ pattern }) => pattern.test(plain)).map(({ source }) => source),
	}
}

export function clean(scored) {
	return scored.missing.length === 0 && scored.violations.length === 0 && scored.patterns.length === 0
}

function yesNo(value) {
	return value === undefined ? '-' : value ? 'yes' : 'no'
}

// A pattern source runs to hundreds of characters, so a reason names the pattern by its position in the goal.
function reasons(goal, label, scored) {
	const parts = []
	if (scored.missing.length > 0) parts.push(`${label} missing ${scored.missing.join(', ')}`)
	if (scored.violations.length > 0) parts.push(`${label} forbidden ${scored.violations.join(', ')}`)
	if (scored.patterns.length > 0)
		parts.push(`${label} pattern ${scored.patterns.map((source) => `#${(goal.forbiddenPatterns ?? []).indexOf(source) + 1}`).join(', ')}`)
	return parts
}

function rescoreLine(line, goal, rules) {
	const error = line.error
	const reply = line.reply ?? ''
	const replied = line.replied ?? reply !== ''
	// A row with `replyVia` scores the reply its design delivered; an older row counts only a sent reply.
	const delivered = line.replyVia !== undefined ? reply !== '' : replied
	const content = line.content ?? ''
	const answerVia = line.answerVia ?? (replied ? 'reply' : content.trim() !== '' ? 'content' : 'none')
	const answer = line.answer ?? (answerVia === 'reply' ? reply : answerVia === 'content' ? content : '')
	const replyScore = scoreText(rules, reply)
	const answerScore = scoreText(rules, answer)
	const success = error === undefined && delivered && clean(replyScore)
	const successAnswer = error === undefined && answerVia !== 'none' && clean(answerScore)
	const overflow = (line.overflow ?? 0) > 0
	const why = [
		...(overflow ? ['(overflow)'] : error === undefined ? [] : ['(error)']),
		...(answerVia === 'reply' ? [] : [`answer via ${answerVia}`]),
		...reasons(goal, 'reply', replyScore),
		...(answerVia === 'content' ? reasons(goal, 'answer', answerScore) : []),
	]
	return {
		row: {
			...line,
			missing: replyScore.missing,
			violations: replyScore.violations,
			patternViolations: replyScore.patterns,
			success,
			answer,
			answerVia,
			answerMissing: answerScore.missing,
			answerViolations: [...answerScore.violations, ...answerScore.patterns],
			successAnswer,
			rescore: { success: line.success, successAnswer: line.successAnswer },
		},
		cells: [line.goal, yesNo(line.success), `${yesNo(success)}${overflow ? ' (overflow)' : ''}`, yesNo(line.successAnswer), yesNo(successAnswer), why.join('; ') || '-'],
	}
}

const SCORING_FIELDS = ['expected', 'expectedAny', 'forbidden', 'forbiddenPatterns', 'tools']
const namedGoals = new Map()

// The goals of the scenario file a row names, or undefined when the field is no readable file or is scenario.json itself.
function namedScenario(name) {
	if (typeof name !== 'string' || name === '') return undefined
	const file = resolve(name)
	if (file === SCENARIO) return undefined
	if (!namedGoals.has(file)) {
		let goals
		try {
			goals = existsSync(file) ? new Map(JSON.parse(readFileSync(file, 'utf8')).goals.map((goal) => [goal.id, goal])) : undefined
		} catch {
			goals = undefined
		}
		namedGoals.set(file, goals)
	}
	return namedGoals.get(file)
}

// Scoring uses scenario.json's rules alone, so a row whose own scenario file scores differently is refused.
function refuseOtherRules(path, line, goal) {
	const other = namedScenario(line.scenario)?.get(goal.id)
	if (other === undefined) return
	const field = SCORING_FIELDS.find((name) => JSON.stringify(other[name] ?? null) !== JSON.stringify(goal[name] ?? null))
	if (field === undefined) return
	process.stderr.write(`rescore: ${path}: goal ${goal.id} names ${line.scenario}, whose ${field} differs from scenario.json\n`)
	process.exit(2)
}

function rescoreFile(path, scenario, scenarioHash, outDir) {
	const goals = new Map(scenario.goals.map((goal) => [goal.id, goal]))
	const rules = new Map(scenario.goals.map((goal) => [goal.id, compileRules(goal)]))
	const lines = readFileSync(path, 'utf8').split('\n').filter((text) => text.trim() !== '')
	const rows = []
	const cells = []
	let skipped = 0
	for (const text of lines) {
		const line = JSON.parse(text)
		const goal = goals.get(line.goal)
		// A calibration row or a row from another scenario holds no reply to score.
		if (goal === undefined || !Object.hasOwn(line, 'reply')) {
			skipped += 1
			continue
		}
		refuseOtherRules(path, line, goal)
		const result = rescoreLine(line, goal, rules.get(goal.id))
		result.row.rescore.scenario = scenarioHash
		rows.push(result.row)
		cells.push(result.cells)
	}
	const count = (pick) => rows.filter(pick).length
	const totals = {
		rows: rows.length,
		skipped,
		oldSuccess: count((row) => row.rescore.success === true),
		newSuccess: count((row) => row.success),
		// Runs recorded before the answer route existed carry no successAnswer, so their old count reads '-'.
		oldAny: rows.some((row) => row.rescore.successAnswer !== undefined) ? count((row) => row.rescore.successAnswer === true) : '-',
		newAny: count((row) => row.successAnswer),
	}
	let target
	if (rows.length > 0) {
		target = outDir === undefined ? `${path}.rescored.jsonl` : join(outDir, `${relative(process.cwd(), resolve(path))}.rescored.jsonl`)
		mkdirSync(dirname(target), { recursive: true })
		writeFileSync(target, rows.map((row) => `${JSON.stringify(row)}\n`).join(''))
	}
	return { cells, totals, target }
}

function main() {
	const { values, positionals } = parseArgs({ options: { out: { type: 'string' } }, allowPositionals: true, strict: true })
	if (positionals.length === 0) {
		process.stderr.write('usage: node rescore.mjs [--out DIR] RESULT.jsonl...\n')
		process.exit(2)
	}
	const outDir = values.out === undefined ? undefined : resolve(values.out)
	if (outDir !== undefined) {
		const outside = positionals.filter((path) => {
			const rel = relative(process.cwd(), resolve(path))
			return rel.startsWith('..') || isAbsolute(rel)
		})
		if (outside.length > 0) {
			process.stderr.write(`rescore: with --out, every input must sit under the working directory: ${outside.join(', ')}\n`)
			process.exit(2)
		}
	}
	const text = readFileSync(SCENARIO, 'utf8')
	const scenario = JSON.parse(text)
	const scenarioHash = createHash('sha256').update(text).digest('hex')
	const summary = []
	for (const path of positionals) {
		const { cells, totals, target } = rescoreFile(path, scenario, scenarioHash, outDir)
		const lines = [`## ${path}`, '']
		if (totals.rows === 0) lines.push(`No goal records; skipped ${totals.skipped} lines.`, '')
		else {
			lines.push(
				'| goal | old success | new success | old ok any | new ok any | reasons |',
				'| --- | --- | --- | --- | --- | --- |',
				...cells.map((row) => `| ${row.join(' | ')} |`),
				'',
				`Passed ${totals.oldSuccess} -> ${totals.newSuccess} of ${totals.rows}; ok any ${totals.oldAny} -> ${totals.newAny} of ${totals.rows}.${totals.skipped > 0 ? ` Skipped ${totals.skipped} lines with no goal record.` : ''} Wrote ${target}.`,
				'',
			)
			summary.push(`| ${path} | ${totals.rows} | ${totals.oldSuccess} | ${totals.newSuccess} | ${totals.oldAny} | ${totals.newAny} |`)
		}
		process.stdout.write(`${lines.join('\n')}\n`)
	}
	if (summary.length > 0)
		process.stdout.write(
			`${['## Pass counts', '', '| file | goals | old success | new success | old ok any | new ok any |', '| --- | ---: | ---: | ---: | ---: | ---: |', ...summary, ''].join('\n')}\n`,
		)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
