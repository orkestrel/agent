import { buildRecordedConversationSnapshot, RECORDED_CONVERSATION_SIZE } from '../../../setup.js'
import { measureOtherLoad } from '../../../setupServer.js'
import { createConversation } from '@src/core'
import { createRecorder } from '@orkestrel/test'
import { expect, it } from 'vitest'

// Ruling R2: hydrating a snapshot of the recorded size (290 messages, 539538 characters) owns and
// freezes each message through `freezeJSON` alone, and stays within 3 times one `JSON.stringify` of
// that snapshot. Each reading times one hydrate and then one stringify of the same snapshot, so the
// two arms interleave under one host load. The test discards 10 warmup readings, takes 40, and logs
// one JSON line with both medians, their ratio, and the host's other load. The ratio is the bar; the
// medians themselves are this host's baseline.

// The readings each arm takes, and the warmup readings the test discards.
const READINGS = Object.freeze({ measured: 40, warmup: 10 })

// The most a hydrate may take, in multiples of one stringify of the same snapshot.
const BAR = 3

it(
	'hydrates the recorded conversation within 3 stringifies of its snapshot (ruling R2)',
	{ timeout: 300_000 },
	async ({ bench, task }) => {
		const snapshot = buildRecordedConversationSnapshot()
		expect(snapshot.messages).toHaveLength(RECORDED_CONVERSATION_SIZE.count)
		expect(snapshot.messages.reduce((sum, message) => sum + message.content.length, 0)).toBe(
			RECORDED_CONVERSATION_SIZE.characters,
		)
		// The control: the hydrated conversation holds every message, owned and frozen.
		const hydrated = createConversation({ snapshot })
		expect(hydrated.messages()).toEqual(snapshot.messages)
		expect(hydrated.messages().every((message) => Object.isFrozen(message))).toBe(true)
		expect(hydrated.messages()[0]).not.toBe(snapshot.messages[0])
		expect(
			Array.from({ length: READINGS.warmup }, () =>
				[createConversation({ snapshot }).count, JSON.stringify(snapshot).length].join(),
			),
		).toHaveLength(READINGS.warmup)
		const hydrates = createRecorder<readonly [wall: number]>()
		const stringifies = createRecorder<readonly [wall: number]>()
		const measured = await measureOtherLoad(() =>
			bench(task.name, { async: false, retainSamples: true }, () => {
				const start = performance.now()
				createConversation({ snapshot })
				const middle = performance.now()
				JSON.stringify(snapshot)
				const end = performance.now()
				hydrates.handler(middle - start)
				stringifies.handler(end - middle)
				return { overriddenDuration: middle - start }
			}).run({ iterations: READINGS.measured, time: 0, warmup: false, throws: true }),
		)
		const middle = Math.floor(READINGS.measured / 2)
		const hydrate =
			hydrates.calls.map(([wall]) => wall).toSorted((left, right) => left - right)[middle] ??
			Number.NaN
		const stringify =
			stringifies.calls.map(([wall]) => wall).toSorted((left, right) => left - right)[middle] ??
			Number.NaN
		console.log(
			JSON.stringify({
				count: RECORDED_CONVERSATION_SIZE.count,
				characters: RECORDED_CONVERSATION_SIZE.characters,
				hydrate,
				stringify,
				ratio: hydrate / stringify,
				load: measured.load,
				version: process.version,
			}),
		)
		expect(hydrate).toBeLessThanOrEqual(BAR * stringify)
	},
)
