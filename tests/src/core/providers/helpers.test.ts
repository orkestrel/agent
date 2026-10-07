import type { JudgeAnswer, JudgeQuestion } from '@src/core'
import { getEventListeners } from 'node:events'
import {
	buildJudgeResult,
	buildProviderResult,
	computeReading,
	extractSystemOneAnswer,
	extractSystemOneUsage,
	isSystemOneAnswer,
	questionToSystemOne,
	isJudgeError,
	readHeaders,
	releaseReader,
	readText,
	readChunks,
} from '@src/core'
import { captureError, requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	RecordedBody,
	RecordedHeaders,
	TEV1_CHOICE,
	TEV1_NOUL,
	TEV1_SCORE,
	TEV1_REQUEST,
	TEV1_ANSWERS,
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_OBJECT,
	SYSTEM_ONE_LLAMA,
	SYSTEM_ONE_MICA,
} from '../../../setup.js'

describe('buildProviderResult — the assembled provider turn', () => {
	it('omits empty result optionals and retains populated calls and usage', () => {
		expect(buildProviderResult('answer', '', [], undefined)).toEqual({ content: 'answer' })
		const tools = [{ id: '1', name: 'lookup', arguments: {} }]
		const usage = { prompt: 1, completion: 2, total: 3 }
		expect(buildProviderResult('answer', 'reason', tools, usage)).toEqual({
			content: 'answer',
			thinking: 'reason',
			tools,
			usage,
		})
	})
})

describe('readText — bounded decoded text', () => {
	it('reports incompletion for exactly the byte limit followed by EOF', async () => {
		const body = new RecordedBody([new TextEncoder().encode('abc')])
		expect(await readText(body.stream, 3)).toEqual({ text: 'abc', complete: false })
		expect(body.stream.locked).toBe(false)
	})
	it('stops at an exact limit without waiting for another chunk', async () => {
		const body = new RecordedBody([new TextEncoder().encode('abc')], false)
		const abort = new AbortController()
		expect(await readText(body.stream, 3, abort.signal)).toEqual({ text: 'abc', complete: false })
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	}, 400)
	it('reports incompletion for an empty body with a zero-byte limit', async () => {
		const body = new RecordedBody([])
		expect(await readText(body.stream, 0)).toEqual({ text: '', complete: false })
	})
	it('reports completion for limit minus one followed by EOF', async () => {
		const body = new RecordedBody([new TextEncoder().encode('ab')])
		expect(await readText(body.stream, 3)).toEqual({ text: 'ab', complete: true })
	})
	it('leaves an empty chunk unread after an exact limit', async () => {
		const body = new RecordedBody([new TextEncoder().encode('abc'), new Uint8Array(0)])
		expect(await readText(body.stream, 3)).toEqual({ text: 'abc', complete: false })
		expect(body.count).toBe(1)
	})
	it('reports incompletion for limit plus one with one overshoot chunk', async () => {
		const body = new RecordedBody([
			new TextEncoder().encode('abcd'),
			new TextEncoder().encode('unread'),
		])
		expect(await readText(body.stream, 3)).toEqual({ text: 'abc', complete: false })
		expect(body.count).toBe(1)
		expect(body.bytes).toBe(4)
		expect(body.cancelled).toBe(true)
	})
	it('measures BOM-prefixed completion from bytes despite identical decoded text', async () => {
		const complete = new RecordedBody([new TextEncoder().encode('{"messages":[]}')])
		const overflow = new RecordedBody([new TextEncoder().encode('\uFEFF{"messages":[]}  ')])
		expect(await readText(complete.stream, 18)).toEqual({ text: '{"messages":[]}', complete: true })
		expect(await readText(overflow.stream, 18)).toEqual({
			text: '{"messages":[]}',
			complete: false,
		})
	})
	it('cancels a pending text read on abort and returns the decoded prefix', async () => {
		const body = new RecordedBody([new TextEncoder().encode('prefix')], false)
		const abort = new AbortController()
		const result = readText(body.stream, undefined, abort.signal)
		await body.pending
		abort.abort(new Error('text cancelled'))
		expect(body.cancelled).toBe(true)
		expect(await result).toEqual({ text: 'prefix', complete: false })
		expect(body.reason).toBe(abort.signal.reason)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	}, 400)
	it('cancels an already-aborted text read before pulling', async () => {
		const body = new RecordedBody([new TextEncoder().encode('unread')], false)
		const abort = new AbortController()
		abort.abort()
		expect(await readText(body.stream, 3, abort.signal)).toEqual({ text: '', complete: false })
		expect(body.count).toBe(0)
		expect(body.cancelled).toBe(true)
		expect(body.reason).toBe(abort.signal.reason)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	})
	it('preserves a successful prefix when source cancellation rejects', async () => {
		const signal = new AbortController().signal
		const body = new RecordedBody(
			[new TextEncoder().encode('abcdef')],
			false,
			undefined,
			new Error('cancel failed'),
		)
		expect(await readText(body.stream, 3, signal)).toEqual({ text: 'abc', complete: false })
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('reads a bounded byte prefix even when a chunk exceeds the limit', async () => {
		const signal = new AbortController().signal
		const body = new RecordedBody([new TextEncoder().encode('abcdef')])
		expect(await readText(body.stream, 3, signal)).toEqual({ text: 'abc', complete: false })
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('stops without reading for a zero-byte limit', async () => {
		const signal = new AbortController().signal
		const body = new RecordedBody([new TextEncoder().encode('abcdef')])
		expect(await readText(body.stream, 0, signal)).toEqual({ text: '', complete: false })
		expect(body.bytes).toBe(0)
		expect(body.cancelled).toBe(true)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('decodes a multibyte prefix and flushes an incomplete final character', async () => {
		const bytes = new TextEncoder().encode('🌍')
		const complete = new RecordedBody([bytes.subarray(0, 2), bytes.subarray(2)])
		expect(await readText(complete.stream)).toEqual({ text: '🌍', complete: true })
		const partial = new RecordedBody([bytes])
		expect(await readText(partial.stream, 2)).toEqual({ text: '�', complete: false })
	})
	it('preserves read failures and releases the text reader lock', async () => {
		const signal = new AbortController().signal
		const error = new Error('read failed')
		const text = new RecordedBody([], true, error)
		await expect(readText(text.stream, undefined, signal)).rejects.toBe(error)
		expect(text.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('reads an empty body as empty text', async () => {
		expect(await readText(new RecordedBody([]).stream)).toEqual({ text: '', complete: true })
	})
})

describe('readChunks — streamed decoded text', () => {
	it('cancels a pending chunk read on abort and yields nothing further', async () => {
		const body = new RecordedBody([new TextEncoder().encode('prefix')], false)
		const abort = new AbortController()
		const chunks = readChunks(body.stream, abort.signal)
		expect(await chunks.next()).toEqual({ done: false, value: 'prefix' })
		const pending = chunks.next()
		await body.pending
		abort.abort(new Error('chunks cancelled'))
		expect(body.cancelled).toBe(true)
		expect(await pending).toEqual({ done: true, value: undefined })
		expect(body.reason).toBe(abort.signal.reason)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	}, 400)
	it('cancels already-aborted chunk iteration before pulling', async () => {
		const body = new RecordedBody([new TextEncoder().encode('unread')], false)
		const abort = new AbortController()
		abort.abort()
		expect(await readChunks(body.stream, abort.signal).next()).toEqual({
			done: true,
			value: undefined,
		})
		expect(body.count).toBe(0)
		expect(body.cancelled).toBe(true)
		expect(body.reason).toBe(abort.signal.reason)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	})
	it('discards a held decoder tail on abort even when source cancellation rejects', async () => {
		const body = new RecordedBody(
			[new Uint8Array([0xe2])],
			false,
			undefined,
			new Error('cancel failed'),
		)
		const abort = new AbortController()
		const chunks = readChunks(body.stream, abort.signal)
		const pending = chunks.next()
		await body.pending
		abort.abort()
		expect(await pending).toEqual({ done: true, value: undefined })
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	})
	it('preserves a yielded chunk and consumer failure when source cancellation rejects', async () => {
		const signal = new AbortController().signal
		const body = new RecordedBody(
			[new TextEncoder().encode('answer')],
			false,
			undefined,
			new Error('cancel failed'),
		)
		const chunks = readChunks(body.stream, signal)
		expect(await chunks.next()).toEqual({ done: false, value: 'answer' })
		const failure = new Error('consumer failed')
		await expect(chunks.throw(failure)).rejects.toBe(failure)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('flushes decoder state at the end of chunk iteration', async () => {
		const signal = new AbortController().signal
		const body = new RecordedBody([new Uint8Array([0xe2])])
		const chunks: string[] = []
		for await (const chunk of readChunks(body.stream, signal)) chunks.push(chunk)
		expect(chunks).toEqual(['�'])
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('decodes split UTF-8 through chunk iteration', async () => {
		const bytes = new TextEncoder().encode('🌍')
		const body = new RecordedBody([bytes.subarray(0, 2), bytes.subarray(2)])
		const chunks: string[] = []
		for await (const chunk of readChunks(body.stream)) chunks.push(chunk)
		expect(chunks).toEqual(['🌍'])
	})
	it('releases a byte reader after early return', async () => {
		const signal = new AbortController().signal
		const body = new RecordedBody([new TextEncoder().encode('answer')], false)
		const chunks = readChunks(body.stream, signal)
		expect(await chunks.next()).toEqual({ done: false, value: 'answer' })
		await chunks.return(undefined)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('preserves read failures and releases the lock', async () => {
		const signal = new AbortController().signal
		const error = new Error('read failed')
		const chunks = new RecordedBody([], true, error)
		await expect(readChunks(chunks.stream, signal).next()).rejects.toBe(error)
		expect(chunks.stream.locked).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('reads an empty body as empty iteration', async () => {
		expect(await readChunks(new RecordedBody([]).stream).next()).toEqual({
			done: true,
			value: undefined,
		})
	})
})

describe('computeReading — the measures derived from a judge answer', () => {
	it('reads the recorded tev1 choice with the published choice confidence', () => {
		const reading = computeReading(TEV1_CHOICE)
		expect(reading.winner).toBe('bug')
		expect(reading.probability).toBeCloseTo(0.969, 3)
		expect(reading.confidence).toBeCloseTo(0.9536, 4)
		expect(reading.score).toBeUndefined()
	})

	it('reads the recorded tev1 score as its expected level and spread confidence', () => {
		const reading = computeReading(TEV1_SCORE)
		expect(reading.winner).toBe('1')
		expect(reading.probability).toBe(0.9494108750977565)
		expect(reading.score).toBeCloseTo(0.99192, 5)
		// spread 0.0505891 over the even spread 2/3 of three levels.
		expect(reading.confidence).toBeCloseTo(0.924116, 6)
	})

	it('reproduces the TypeSafe documented choice and score examples', () => {
		const choice = computeReading({
			form: 'choice',
			probabilities: { billing: 0.88, technical: 0.12, sales: 0 },
		})
		expect(choice).toMatchObject({ winner: 'billing', probability: 0.88 })
		expect(choice.confidence).toBeCloseTo(0.82, 2)
		const score = computeReading({ form: 'score', probabilities: [0, 0.95, 0.05] })
		expect(score.winner).toBe('1')
		expect(score.score).toBeCloseTo(1.05, 10)
		// The documented 0.92 is the formula's 0.925 shown at two decimals, half a unit away.
		expect(score.confidence).toBeCloseTo(0.925, 10)
		expect(Math.abs(score.confidence - 0.92)).toBeLessThanOrEqual(0.005 + Number.EPSILON)
		const spread = computeReading({ form: 'score', probabilities: [0, 0.57, 0.43] })
		expect(spread.confidence).toBeCloseTo(0.355, 3)
		expect(spread.score).toBeCloseTo(1.43, 10)
	})

	it('clamps a score confidence at zero when the spread passes the even spread', () => {
		const reading = computeReading({ form: 'score', probabilities: [0.34, 0, 0.33, 0.33] })
		expect(reading.winner).toBe('0')
		expect(reading.confidence).toBe(0)
	})

	it('reads a noul over false then true with the confidence |2p - 1|', () => {
		expect(computeReading(TEV1_NOUL)).toEqual({
			winner: 'true',
			probability: 0.9978973674111222,
			confidence: expect.closeTo(0.995794734822244, 12),
		})
		expect(computeReading({ form: 'noul', noul: 0.5 })).toEqual({
			winner: 'false',
			probability: 0.5,
			confidence: 0,
		})
		const no = computeReading({ form: 'noul', noul: 0.25 })
		expect(no).toEqual({ winner: 'false', probability: 0.75, confidence: 0.5 })
	})

	it('names the first of two equal candidates in enumeration order', () => {
		const choice = computeReading({
			form: 'choice',
			probabilities: { refund: 0.4, replace: 0.4, other: 0.2 },
		})
		expect(choice.winner).toBe('refund')
		const reversed = computeReading({
			form: 'choice',
			probabilities: { replace: 0.4, refund: 0.4, other: 0.2 },
		})
		expect(reversed.winner).toBe('replace')
		expect(computeReading({ form: 'score', probabilities: [0.2, 0.4, 0.4] }).winner).toBe('1')
	})

	it('refuses a choice or score answer with fewer than two candidates', () => {
		for (const answer of [
			{ form: 'choice', probabilities: { billing: 1 } },
			{ form: 'choice', probabilities: {} },
			{ form: 'score', probabilities: [1] },
		] satisfies readonly JudgeAnswer[]) {
			const error = captureError(() => computeReading(answer))
			expect(isJudgeError(error)).toBe(true)
			expect(error).toMatchObject({ code: 'PROTOCOL', status: undefined })
		}
	})
})

describe('buildJudgeResult — the merge of a judge request’s calls', () => {
	it('returns the given model and no answers for an empty list', () => {
		expect(buildJudgeResult('tev1:0.8b', [])).toEqual({ model: 'tev1:0.8b', answers: {} })
	})

	it('joins answers and refusals, sums usage, and reports the first call’s model', () => {
		const result = buildJudgeResult('jev-latest', [
			{
				model: 'jev-1.13.0',
				answers: { label: TEV1_CHOICE },
				usage: { prompt: 975, completion: 4, total: 979 },
			},
			{ model: 'jev-1.13.1', answers: {}, refusals: { team: { missing: ['sales'] } } },
			{
				model: 'jev-1.13.0',
				answers: { refund: TEV1_NOUL },
				usage: { prompt: 10, completion: 1, total: 11 },
			},
		])
		expect(result).toEqual({
			model: 'jev-1.13.0',
			answers: { label: TEV1_CHOICE, refund: TEV1_NOUL },
			refusals: { team: { missing: ['sales'] } },
			usage: { prompt: 985, completion: 5, total: 990 },
		})
	})

	it('omits empty refusals and absent usage, and sanitizes reported usage', () => {
		const result = buildJudgeResult('tev1:0.8b', [
			{ model: 'tev1:0.8b', answers: { refund: TEV1_NOUL }, refusals: {} },
			{
				model: 'tev1:0.8b',
				answers: { severity: TEV1_SCORE },
				usage: { prompt: -5, completion: Number.NaN, total: 12.7 },
			},
		])
		expect(result).toEqual({
			model: 'tev1:0.8b',
			answers: { refund: TEV1_NOUL, severity: TEV1_SCORE },
			usage: { prompt: 0, completion: 0, total: 12 },
		})
		expect(Object.hasOwn(result, 'refusals')).toBe(false)
		expect(Object.hasOwn(buildJudgeResult('m', [{ model: 'm', answers: {} }]), 'usage')).toBe(false)
	})
})

describe('readHeaders — request headers inside the cancellation bound', () => {
	it('returns the JSON content type alone without a hook', async () => {
		const headers = await readHeaders(undefined, new AbortController().signal)
		expect([...headers]).toEqual([['content-type', 'application/json']])
	})

	it('passes the signal to the hook and sets its entries over the content type', async () => {
		const hook = new RecordedHeaders({ authorization: 'Bearer KEY', 'Content-Type': 'text/plain' })
		const signal = new AbortController().signal
		const headers = await readHeaders(hook.headers.bind(hook), signal)
		expect(hook.signals).toEqual([signal])
		expect(headers.get('authorization')).toBe('Bearer KEY')
		expect(headers.get('content-type')).toBe('text/plain')
		expect(getEventListeners(signal, 'abort')).toHaveLength(0)
	})

	it('refuses an aborted signal without calling the hook', async () => {
		const hook = new RecordedHeaders()
		const abort = new AbortController()
		const reason = new Error('cancelled')
		abort.abort(reason)
		await expect(readHeaders(hook.headers.bind(hook), abort.signal)).rejects.toBe(reason)
		expect(hook.signals).toEqual([])
	})

	it('rejects a pending hook with the abort reason and removes its listener', async () => {
		const hook = new RecordedHeaders(new Promise(() => {}))
		const abort = new AbortController()
		const reason = new Error('cancelled')
		const headers = readHeaders(hook.headers.bind(hook), abort.signal)
		await hook.entered
		expect(getEventListeners(abort.signal, 'abort')).toHaveLength(1)
		abort.abort(reason)
		await expect(headers).rejects.toBe(reason)
		expect(getEventListeners(abort.signal, 'abort')).toHaveLength(0)
	})

	it('rethrows a throwing hook unchanged', async () => {
		const error = new Error('token unavailable')
		const hook = new RecordedHeaders(error)
		await expect(readHeaders(hook.headers.bind(hook), new AbortController().signal)).rejects.toBe(
			error,
		)
	})
})

describe('System One helpers', () => {
	it('preserves omission, null descriptions, and structured instructions in the question projection', () => {
		expect(questionToSystemOne({ form: 'noul' })).toEqual({ type: 'noul' })
		expect(
			questionToSystemOne({ form: 'choice', criteria: { billing: null, bug: 'Defect' } }),
		).toEqual({ type: 'choice', criteria: { billing: null, bug: 'Defect' } })
		expect(
			questionToSystemOne({
				form: 'score',
				instructions: { question: ['Severity?'] },
				criteria: [null, 'Blocking'],
			}),
		).toEqual({
			type: 'score',
			instructions: { question: ['Severity?'] },
			criteria: [null, 'Blocking'],
		})
		expect(
			questionToSystemOne({
				form: 'noul',
				criteria: { true: 'Requested', false: 'Not requested' },
			}),
		).toEqual({ type: 'noul', criteria: { true: 'Requested', false: 'Not requested' } })
	})

	it('decodes the recorded tev1 and transliterated llama.cpp and Mica answers into the same distributions', () => {
		for (const body of [SYSTEM_ONE_TEV1, SYSTEM_ONE_LLAMA, SYSTEM_ONE_MICA]) {
			for (const [id, answer] of Object.entries(body.answers)) {
				expect(isSystemOneAnswer(answer)).toBe(true)
				if (!isSystemOneAnswer(answer)) throw new Error('invalid fixture answer')
				expect(extractSystemOneAnswer(answer, requireValue(TEV1_REQUEST.questions[id]))).toEqual(
					TEV1_ANSWERS[id],
				)
			}
		}
		const answer = SYSTEM_ONE_OBJECT.answers.intent
		if (!isSystemOneAnswer(answer)) throw new Error('invalid object fixture answer')
		expect(
			extractSystemOneAnswer(answer, { form: 'choice', criteria: { refund: null, other: null } }),
		).toEqual({
			form: 'choice',
			probabilities: { refund: 0.672163600162288, other: 0.32783639983771207 },
		})
		expect(extractSystemOneUsage(SYSTEM_ONE_TEV1.usage)).toEqual({
			prompt: 975,
			completion: 4,
			total: 979,
		})
		expect(extractSystemOneUsage(SYSTEM_ONE_OBJECT.usage)).toEqual({
			prompt: 148,
			completion: 1,
			total: 149,
		})
		expect(extractSystemOneUsage(SYSTEM_ONE_MICA.usage)).toEqual({
			prompt: 975,
			completion: 0,
			total: 975,
		})
	})

	it('orders choice probabilities by criteria, keeps prototype-like labels, and preserves values without normalization', () => {
		const question: JudgeQuestion = {
			form: 'choice',
			criteria: { bug: null, billing: null, ['__proto__']: null },
		}
		const answer = requireValue(
			extractSystemOneAnswer(
				{
					type: 'choice',
					probabilities: { ['__proto__']: 0, billing: 0.3, bug: 0.6, extra: 0.05 },
				},
				question,
			),
		)
		expect(answer).toEqual({
			form: 'choice',
			probabilities: { bug: 0.6, billing: 0.3, ['__proto__']: 0 },
		})
		if (answer.form !== 'choice') throw new Error('expected choice')
		expect(Object.keys(answer.probabilities)).toEqual(['bug', 'billing', '__proto__'])
		expect(
			extractSystemOneAnswer(
				{ type: 'score', probabilities: [0.2, 0.7, 0.05] },
				{ form: 'score', criteria: [null, null] },
			),
		).toEqual({ form: 'score', probabilities: [0.2, 0.7] })
	})

	it('refuses missing labels, missing levels, mismatched forms, and non-finite or unbounded values', () => {
		expect(
			extractSystemOneAnswer(
				{ type: 'choice', probabilities: { bug: 1 } },
				{ form: 'choice', criteria: { bug: null, billing: null } },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'choice', probabilities: {} },
				{ form: 'choice', criteria: { ['__proto__']: null, bug: null } },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'score', probabilities: { '0': 0.5 } },
				{ form: 'score', criteria: [null, null] },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'score', probabilities: [1] },
				{ form: 'score', criteria: [null, null] },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'noul', noul: 0.5 },
				{ form: 'score', criteria: [null, null] },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer({ type: 'choice', probabilities: { bug: 1 } }, { form: 'noul' }),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer({ type: 'noul', noul: Infinity }, { form: 'noul' }),
		).toBeUndefined()
		expect(extractSystemOneAnswer({ type: 'noul', noul: -0.1 }, { form: 'noul' })).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'choice', probabilities: { bug: 1.1, billing: 0 } },
				{ form: 'choice', criteria: { bug: null, billing: null } },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'choice', probabilities: { bug: NaN, billing: 0 } },
				{ form: 'choice', criteria: { bug: null, billing: null } },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'score', probabilities: [0.5, -0.01] },
				{ form: 'score', criteria: [null, null] },
			),
		).toBeUndefined()
		expect(
			extractSystemOneAnswer(
				{ type: 'score', probabilities: { '0': 0.5, '1': 1.01 } },
				{ form: 'score', criteria: [null, null] },
			),
		).toBeUndefined()
		expect(extractSystemOneAnswer({ type: 'noul', noul: NaN }, { form: 'noul' })).toBeUndefined()
	})

	it('ignores an unrequested candidate outside [0, 1]', () => {
		expect(
			extractSystemOneAnswer(
				{ type: 'choice', probabilities: { bug: 0.6, billing: 0.4, extra: 7 } },
				{ form: 'choice', criteria: { bug: null, billing: null } },
			),
		).toEqual({ form: 'choice', probabilities: { bug: 0.6, billing: 0.4 } })
		expect(
			extractSystemOneAnswer(
				{ type: 'score', probabilities: [0.2, 0.8, -3] },
				{ form: 'score', criteria: [null, null] },
			),
		).toEqual({ form: 'score', probabilities: [0.2, 0.8] })
	})

	it('omits incomplete or invalid usage and accepts finite fractional counts and zero', () => {
		expect(extractSystemOneUsage(undefined)).toBeUndefined()
		expect(extractSystemOneUsage({})).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: 2 })).toBeUndefined()
		expect(extractSystemOneUsage({ output_tokens: 2 })).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: null, output_tokens: 2 })).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: 2, output_tokens: null })).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: -1, output_tokens: 2 })).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: NaN, output_tokens: 2 })).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: 2, output_tokens: Infinity })).toBeUndefined()
		expect(
			extractSystemOneUsage({ input_tokens: Number.MAX_VALUE, output_tokens: Number.MAX_VALUE }),
		).toBeUndefined()
		expect(extractSystemOneUsage({ input_tokens: 0.5, output_tokens: 0 })).toEqual({
			prompt: 0.5,
			completion: 0,
			total: 0.5,
		})
	})
})

describe('releaseReader — the cancel-and-release sequence', () => {
	it('cancels the source and frees the lock', async () => {
		let cancelled = false
		const stream = new ReadableStream<Uint8Array>({
			cancel: () => {
				cancelled = true
			},
		})
		await releaseReader(stream.getReader())
		expect(cancelled).toBe(true)
		expect(stream.locked).toBe(false)
	})

	it('frees the lock and resolves when the source refuses cancellation', async () => {
		const stream = new ReadableStream<Uint8Array>({
			cancel: () => {
				throw new Error('refused')
			},
		})
		await releaseReader(stream.getReader())
		expect(stream.locked).toBe(false)
	})
})
