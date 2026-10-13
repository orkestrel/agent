import { readFileSync, writeFileSync } from 'node:fs'
import type { JudgeInterface, JudgeQuestion, JudgeRequest, Message, MessageInput, ProviderRequest } from '@src/core'
import { createLedger } from '@src/core'
import { isRecord } from '@orkestrel/contract'
import { createRecorder } from '@orkestrel/test'
import { expect, it } from 'vitest'
import {
	buildLedgerExchange,
	buildLedgerOptions,
	createPhraseJudge,
	createScriptedProvider,
} from '../../tests/setup.js'

// The complete-capture successor of ledger-golden.test.ts: it serves the same three requests through
// the same recorded scripted provider and phrase judge, but captures every provider request member
// (messages, full tool definitions, options) and every judge request (state and the complete
// questions), masking only the random message ids. LEDGER_GOLDEN=record writes the digest; otherwise
// the digest is compared with the recording and the first differing path fails the proof. Two
// controls prove the comparison reads question bodies and tool definitions: each applies a capture
// transform that a changed ledger would produce and must be refused.

const GOLDEN = new URL('./ledger-golden-full.json', import.meta.url)

interface Capture {
	readonly judge: (request: JudgeRequest) => JudgeRequest
	readonly provider: (request: ProviderRequest) => ProviderRequest
}

const IDENTITY: Capture = { judge: (request) => request, provider: (request) => request }

function describeMessage(message: Message): Readonly<Record<string, unknown>> {
	return {
		role: message.role,
		content: message.content,
		...(message.call === undefined ? {} : { call: message.call }),
		...(message.calls === undefined ? {} : { calls: message.calls }),
		...(message.thinking === undefined ? {} : { thinking: message.thinking }),
		...(message.images === undefined ? {} : { images: message.images }),
	}
}

function findDifference(expected: unknown, actual: unknown, path: string): string | undefined {
	if (Object.is(expected, actual)) return undefined
	if (Array.isArray(expected) && Array.isArray(actual)) {
		const length = Math.max(expected.length, actual.length)
		for (let at = 0; at < length; at++) {
			const found = findDifference(expected[at], actual[at], `${path}[${at}]`)
			if (found !== undefined) return found
		}
		return undefined
	}
	if (isRecord(expected) && isRecord(actual)) {
		for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
			const found = findDifference(expected[key], actual[key], `${path}.${key}`)
			if (found !== undefined) return found
		}
		return undefined
	}
	return `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
}

function changeQuestion(question: JudgeQuestion): JudgeQuestion {
	return { ...question, instructions: 'Changed question bytes.' }
}

const SEED: readonly MessageInput[] = [
	{ role: 'user', content: 'Keep the loading dock at warehouse 42 clear.' },
	{ role: 'user', content: 'Refunds over $100 need a manager.' },
	...buildLedgerExchange('Account BW-20931: Brightwater Studio. Refund is $148.50.'),
	...Array.from({ length: 20 }, (_unused, at): MessageInput => ({
		role: 'user',
		content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
	})),
	{ role: 'user', content: 'Correction: refunds need a manager over $250.' },
]

async function buildDigest(capture: Capture): Promise<unknown> {
	const asked = createRecorder<readonly [JudgeRequest]>()
	const inner = createPhraseJudge(['Refunds over'], ['Correction'])
	const judge: JudgeInterface = {
		id: inner.id,
		name: inner.name,
		model: inner.model,
		ask: (request) => {
			asked.handler(capture.judge(request))
			return inner.ask(request)
		},
	}
	const provider = createScriptedProvider(
		[
			{ content: '', usage: { prompt: 30, completion: 1, total: 31 } },
			{ content: '', usage: { prompt: 10, completion: 1, total: 11 } },
			{
				content: '',
				tools: [{ id: 'read', name: 'lookup', arguments: { id: 'BW-20931' } }],
				usage: { prompt: 400, completion: 12, total: 412 },
			},
			{ content: 'The account is Brightwater Studio.', usage: { prompt: 420, completion: 8, total: 428 } },
			{
				content: '',
				tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'refunds' } }],
				usage: { prompt: 430, completion: 10, total: 440 },
			},
			{ content: 'Refunds over $250 need a manager.', usage: { prompt: 500, completion: 9, total: 509 } },
			{ content: '', usage: { prompt: 450, completion: 1, total: 451 } },
			{ content: 'Nothing else is pending.', usage: { prompt: 470, completion: 6, total: 476 } },
		],
		{ recorded: true, repeat: false },
	)
	const { gauge: _gauge, ...uncalibrated } = buildLedgerOptions({ judge })
	const ledger = createLedger(provider, uncalibrated)
	ledger.conversation.add(SEED)
	const results = []
	let calibrated = ledger.gauge
	for (const request of ['Check BW-20931.', 'What do we know about refunds?', 'Anything else?']) {
		const result = await ledger.respond(request)
		if (results.length === 0) calibrated = ledger.gauge
		results.push({
			content: result.content,
			partial: result.partial,
			passes: result.passes.length,
			usage: result.usage,
		})
	}
	const ids = ledger.conversation.messages().map((message) => message.id)
	const text = JSON.stringify({
		calls: provider.calls.map((call) => {
			const request = capture.provider({
				messages: call.messages,
				...(call.tools === undefined ? {} : { tools: call.tools }),
				...(call.options === undefined ? {} : { options: call.options }),
			})
			return {
				messages: request.messages.map(describeMessage),
				tools: request.tools,
				options: request.options,
			}
		}),
		judge: asked.calls.map(([request]) => ({ state: request.state, questions: request.questions })),
		results,
		calibrated,
		final: ledger.gauge,
	})
	// Message ids are random, so each is replaced by its position in the conversation.
	return JSON.parse(ids.reduce((masked, id, at) => masked.split(id).join(`#${at}`), text))
}

function readGolden(): unknown {
	return JSON.parse(readFileSync(GOLDEN, 'utf8'))
}

it('serves the complete golden ledger digest', async () => {
	const digest = await buildDigest(IDENTITY)
	if (process.env.LEDGER_GOLDEN === 'record') {
		writeFileSync(GOLDEN, `${JSON.stringify(digest, null, '\t')}\n`)
		return
	}
	expect(findDifference(readGolden(), digest, '$')).toBeUndefined()
})

it('refuses a changed judge question', async () => {
	if (process.env.LEDGER_GOLDEN === 'record') return
	const digest = await buildDigest({
		...IDENTITY,
		judge: (request) => ({
			state: request.state,
			questions: Object.fromEntries(
				Object.entries(request.questions).map(([key, question]) => [key, changeQuestion(question)]),
			),
		}),
	})
	const found = findDifference(readGolden(), digest, '$')
	expect(found).toMatch(/^\$\.judge\[\d+\]\.questions\./)
})

it('refuses a changed tool definition', async () => {
	if (process.env.LEDGER_GOLDEN === 'record') return
	const digest = await buildDigest({
		...IDENTITY,
		provider: (request) =>
			request.tools === undefined
				? request
				: {
						...request,
						tools: request.tools.map((tool) => ({ ...tool, description: 'Changed tool bytes.' })),
					},
	})
	const found = findDifference(readGolden(), digest, '$')
	expect(found).toMatch(/^\$\.calls\[\d+\]\.tools\[\d+\]\.description/)
})
