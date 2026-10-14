import assert from 'node:assert/strict'
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { isRecord } from '@orkestrel/contract'
import { LEDGER_QUESTIONS } from '../vendor/agent-0.0.30-trimmed/index.js'
import { CORPUS, OUTPUT, VARIANTS } from './constants.ts'
import {
	buildJudgment,
	buildSystem,
	computeDigest,
	containsPath,
	describeError,
	readJSON,
	readLookup,
	readRows,
	resolveDestination,
} from './helpers.ts'
import {
	isCalibrationRow,
	isChatRequest,
	isGoal,
	isScenario,
	isSeed,
	isSeedMessage,
} from './validators.ts'

test('refuses malformed and unreadable archive fields without throwing', () => {
	const hostile = Object.defineProperty({}, 'ledger', {
		get() {
			throw new Error('unreadable')
		},
	})
	for (const guard of [
		isCalibrationRow,
		isChatRequest,
		isGoal,
		isScenario,
		isSeed,
		isSeedMessage,
	]) {
		assert.equal(guard(null), false)
		assert.equal(guard([]), false)
	}
	assert.equal(isScenario(hostile), false)
	assert.equal(isSeedMessage({ role: 'user', content: 1 }), false)
	assert.equal(isCalibrationRow({ question: 'topic', index: 'one' }), false)
	assert.equal(isChatRequest({ messages: [], tools: [], keep_alive: 7 }), false)
})

test('preserves archived helpers and refuses a question with changed wording', () => {
	const scenario = readJSON(join(VARIANTS, 'v1.json'), isScenario)
	const messages = scenario.seed.map((message, index) => ({ ...message, id: `message-${index}` }))
	const rows = readRows(CORPUS, isCalibrationRow)
	const category = rows.find((row) => row.question === 'category' && row.order === 'forward')
	assert.ok(category)
	assert.ok(buildJudgment(category, messages, [], 'judge'))
	assert.equal(
		buildJudgment({ ...category, asked: 'changed question' }, messages, [], 'judge'),
		undefined,
	)
	assert.equal(buildJudgment({ ...category, order: 'unknown' }, messages, [], 'judge'), undefined)
	assert.equal(
		buildJudgment({ question: 'amends', earlier: -1, later: 0 }, messages, [], 'judge'),
		undefined,
	)
	assert.equal(
		buildJudgment({ question: 'topic', index: 0, topic: 'missing' }, messages, [], 'judge'),
		undefined,
	)
	assert.equal(buildJudgment({ question: 'metadata' }, messages, [], 'judge'), undefined)
	assert.deepEqual(
		buildJudgment({ question: 'supersedes', earlier: 0, later: 1 }, messages, [], 'judge')
			?.question,
		LEDGER_QUESTIONS.supersedes,
	)
	assert.equal(
		computeDigest('abc'),
		'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
	)
	assert.equal(computeDigest({ value: 'abc' }), computeDigest('{"value":"abc"}'))
	assert.match(buildSystem(scenario), /Today is Thursday 2026-10-08\./)
	assert.match(buildSystem(scenario), /Never cite a handle such as m12 or r5 in your answer\.$/)
	assert.equal(readLookup({}, 'no record for an empty id'), undefined)
	assert.deepEqual(
		readLookup({ id: ' ord-7 ' }, 'Order ORD-7 for account AC-8 (Ari Linden): a chair.'),
		{ ids: ['ORD-7', 'AC-8'], owners: [{ id: 'AC-8', names: ['Ari Linden'] }] },
	)
	const error = new Error('outer', { cause: new Error('inner') })
	assert.equal(describeError(error), 'Error: outer <- Error: inner')
	error.cause = error
	assert.equal(describeError(error), 'Error: outer')
	assert.equal(describeError(undefined), '')
})

test('reads real JSON and CRLF rows and refuses invalid preserved input', () => {
	mkdirSync(OUTPUT, { recursive: true })
	const directory = mkdtempSync(join(OUTPUT, 'owned-rows-'))
	try {
		const file = join(directory, 'rows.jsonl')
		writeFileSync(file, '{"value":1}\r\n\r\n{"value":2}\n')
		assert.deepEqual(readRows(file, isRecord), [{ value: 1 }, { value: 2 }])
		writeFileSync(file, 'null\n')
		assert.throws(() => readRows(file, isRecord), /Invalid preserved row/)
		assert.throws(() => readJSON(file, isRecord), /Invalid preserved input/)
		writeFileSync(file, '{')
		assert.throws(() => readJSON(file, isRecord), /Invalid preserved input/)
	} finally {
		assert.ok(containsPath(OUTPUT, directory))
		rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 })
	}
})

test('contains existing and absent output paths and rejects escapes and filesystem links', (context) => {
	mkdirSync(OUTPUT, { recursive: true })
	const directory = mkdtempSync(join(OUTPUT, 'owned-paths-'))
	try {
		assert.equal(resolveDestination(directory), resolve(directory))
		assert.equal(
			resolveDestination(join(directory, 'absent', 'child')),
			resolve(directory, 'absent', 'child'),
		)
		assert.equal(resolveDestination(), resolve(OUTPUT))
		assert.throws(() => resolveDestination(dirname(OUTPUT)), /Output must stay/)
		assert.throws(() => resolveDestination(join(OUTPUT, '..', 'escape')), /Output must stay/)
		assert.throws(() => resolveDestination(`${OUTPUT}-sibling`), /Output must stay/)
		assert.throws(
			() => resolveDestination(join(directory, 'NUL.txt')),
			/Nonportable output segment/,
		)
		assert.throws(() => resolveDestination(join(directory, 'COM¹')), /Nonportable output segment/)
		assert.throws(
			() => resolveDestination(join(directory, 'trailing.')),
			/Nonportable output segment/,
		)
		assert.throws(
			() => resolveDestination(join(directory, 'bad:name')),
			/Nonportable output segment/,
		)
		const file = join(directory, 'file')
		writeFileSync(file, 'owned fixture')
		assert.throws(() => resolveDestination(join(file, 'child')), /not a directory/)
		const target = join(directory, 'target')
		mkdirSync(target)
		const link = join(directory, 'link')
		try {
			symlinkSync(target, link, 'junction')
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!('code' in error) ||
				!['EPERM', 'ENOTSUP', 'EACCES'].includes(String(error.code))
			)
				throw error
			context.diagnostic(`Symlink proof unavailable: ${error.message}`)
			return
		}
		assert.ok(existsSync(link))
		assert.throws(() => resolveDestination(join(link, 'child')), /Symbolic-link output is refused/)
		const escaping = join(directory, 'escaping')
		symlinkSync(dirname(OUTPUT), escaping, 'junction')
		assert.throws(
			() => resolveDestination(join(escaping, 'escape')),
			/Symbolic-link output is refused/,
		)
		const dangling = join(directory, 'dangling')
		symlinkSync(join(directory, 'missing'), dangling, 'junction')
		assert.equal(existsSync(dangling), false)
		assert.throws(
			() => resolveDestination(join(dangling, 'child')),
			/Symbolic-link output is refused/,
		)
		assert.equal(readFileSync(file, 'utf8'), 'owned fixture')
	} finally {
		assert.ok(containsPath(OUTPUT, directory))
		rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 })
	}
})
