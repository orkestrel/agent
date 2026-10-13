import { readFileSync, writeFileSync } from 'node:fs'
import type { JudgeInterface, Message, MessageInput } from '@src/core'
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

// A golden probe for the ledger's served behavior. It serves three requests through a recorded
// scripted provider and a deterministic phrase judge, collects what the provider and the judge
// saw and what each result carried, and either records that digest (LEDGER_GOLDEN=record) or
// compares it with the recorded file and fails with the first differing path.

const GOLDEN = new URL('./ledger-golden.json', import.meta.url)

function describeMessage(message: Message): Readonly<Record<string, unknown>> {
	return {
		role: message.role,
		content: message.content,
		...(message.call === undefined ? {} : { call: message.call }),
		...(message.calls === undefined ? {} : { calls: message.calls }),
		...(message.thinking === undefined ? {} : { thinking: message.thinking }),
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

it('serves the golden ledger digest', async () => {
	const asked = createRecorder<readonly [string, readonly string[]]>()
	const inner = createPhraseJudge(['Refunds over'], ['Correction'])
	const judge: JudgeInterface = {
		id: inner.id,
		name: inner.name,
		model: inner.model,
		ask: (request) => {
			asked.handler(typeof request.state === 'string' ? request.state : '', Object.keys(request.questions))
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
	// Message ids are random, so each is replaced by its position in the conversation.
	const ids = ledger.conversation.messages().map((message) => message.id)
	const text = JSON.stringify({
			calls: provider.calls.map((call) => ({
				messages: call.messages.map(describeMessage),
				tools: call.tools?.map((tool) => tool.name),
				options: call.options,
			})),
			judge: asked.calls.map(([state, questions]) => ({ state, questions })),
			results,
			calibrated,
			final: ledger.gauge,
	})
	const digest: unknown = JSON.parse(
		ids.reduce((masked, id, at) => masked.split(id).join(`#${at}`), text),
	)
	if (process.env.LEDGER_GOLDEN === 'record') {
		writeFileSync(GOLDEN, `${JSON.stringify(digest, null, '\t')}\n`)
		return
	}
	const recorded: unknown = JSON.parse(readFileSync(GOLDEN, 'utf8'))
	const difference = findDifference(recorded, digest, '$')
	if (difference !== undefined) throw new Error(`ledger golden differs at ${difference}`)
	expect(difference).toBeUndefined()
})
