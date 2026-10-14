import type { Selection } from '../../../vendor/agent-0.0.30-trimmed/index.js'
import type { ProbeReading, TurnReading } from './types.js'
import { strict as assert } from 'node:assert'
import { createTool } from '@orkestrel/tool'
import {
	createLedger,
	createRelayProvider,
	createScope,
	createSystemOneJudge,
	estimateMessages,
	LEDGER_QUESTIONS,
	LEDGER_NOTES,
} from '../../../vendor/agent-0.0.30-trimmed/index.js'
import { Fixture } from './Fixture.js'
import { FullViewAdapter } from '../../FullViewAdapter.js'
import { RelayFrameParser } from './RelayFrameParser.js'
import { buildSeed, projectMessages } from './helpers.js'

export class ContextProof {
	readonly #fixture = new Fixture()
	async execute(): Promise<void> {
		const url = await this.#fixture.start()
		try {
			const plans: ProbeReading[] = []
			for (const reserve of [512, 1024, 2048, 4096, 8192]) {
				const reading = await this.#plan(url, reserve, 2560 + reserve, reserve - 512)
				plans.push(reading)
			}
			const first = plans[0]
			assert.ok(first)
			assert.ok((first.selection.briefing?.length ?? 0) > 0, 'Nonempty records briefing required')
			assert.ok(first.selection.messages.length > 1, 'Tail must contain history and request')
			assert.ok(
				first.selection.messages.length < buildSeed().length,
				'Tail must exclude some history',
			)
			const text = `${first.selection.briefing}\n${first.selection.messages.map((message) => message.content).join('\n')}`
			const included = buildSeed().filter((message) =>
				text.includes(message.content.split(':')[0] ?? ''),
			).length
			assert.ok(
				included > 0 && included < buildSeed().length,
				'Plan must include and exclude seed sources',
			)
			for (const plan of plans) {
				assert.equal(plan.selection.fault, undefined)
				assert.equal(plan.selection.briefing, first.selection.briefing)
				assert.deepEqual(
					projectMessages(plan.selection.messages),
					projectMessages(first.selection.messages),
				)
				assert.deepEqual(projectMessages(plan.wire.messages), projectMessages(first.wire.messages))
			}
			const control = await this.#plan(url, 9000, 12000, 0)
			assert.throws(() =>
				assert.deepEqual(
					projectMessages(control.wire.messages),
					projectMessages(first.wire.messages),
				),
			)
			console.log(
				JSON.stringify({
					claim: 'initial-plan-identity',
					reserves: plans.map((plan) => plan.reserve),
					included,
					excluded: buildSeed().length - included,
					tail: first.selection.messages.length,
					briefing: first.selection.briefing?.length,
					control: 'different capacity changes actual plan',
				}),
			)
			await this.#full(url, false)
			await this.#full(url, true)
		} finally {
			await this.#fixture.stop()
		}
	}
	async #plan(
		url: string,
		reserve: number,
		capacity: number,
		predict: number,
	): Promise<ProbeReading> {
		const selections: Selection[] = []
		const path = `/plan-${reserve}`
		const ledger = createLedger(
			createRelayProvider({ url: url + path, parser: () => new RelayFrameParser() }),
			{
				judge: createSystemOneJudge({ url, model: 'fixture' }),
				system: 'Answer desk questions.',
				topics: [{ name: 'refund', criterion: 'refund policy' }],
				questions: LEDGER_QUESTIONS,
				thresholds: { category: 0.9, topic: 0.9, correction: 0.9, amends: 0.9, supersedes: 0.9 },
				capacity,
				predict,
				gauge: { scale: 1, overhead: 11 },
				agent: { on: { select: (selection) => selections.push(selection) } },
			},
		)
		ledger.conversation.add(buildSeed())
		await ledger.respond('What refund rules apply?')
		const selection = selections[0]
		const wire = this.#fixture.calls.get(path)?.[0]
		assert.ok(selection)
		assert.ok(wire)
		assert.equal(selection.fault, undefined)
		return { reserve, capacity, predict, selection, wire }
	}
	async #full(url: string, start: boolean): Promise<object> {
		const path = start ? '/full-start' : '/full-scope'
		const ledger = createLedger(
			createRelayProvider({ url: url + path, parser: () => new RelayFrameParser() }),
			{
				judge: createSystemOneJudge({ url, model: 'fixture' }),
				system: 'Answer desk questions.',
				topics: [{ name: 'refund', criterion: 'refund policy' }],
				questions: LEDGER_QUESTIONS,
				thresholds: { category: 0.9, topic: 0.9, correction: 0.9, amends: 0.9, supersedes: 0.9 },
				capacity: 3072,
				gauge: { scale: 1, overhead: 11 },
				think: true,
				lookups: [
					{
						tool: createTool({ name: 'lookup', execute: () => 'CASE-1 lookup payload preserved.' }),
						read: () => ({ ids: ['CASE-1'], owners: [] }),
					},
				],
				agent: { limit: 4 },
			},
		)
		const seed = ledger.conversation.add(buildSeed())
		const context = ledger.agent.context
		let selected: Selection | undefined
		let boundary = 0
		const turns: TurnReading[] = []
		const selections: Selection[] = []
		ledger.agent.emitter.on('select', (selection) => {
			selected = selection
			boundary = ledger.conversation.messages().length
			selections.push(selection)
		})
		ledger.agent.emitter.on('turn', () => {
			const messages = [
				...context.build(selected),
				...ledger.conversation.messages().slice(boundary),
			]
			turns.push({ scope: context.scope?.name, messages, estimate: estimateMessages(messages) })
		})
		if (start) assert.ok(new FullViewAdapter(ledger.agent))
		else
			context.apply(
				createScope({
					name: 'full',
					select: async (conversation, request, signal) => {
						const scope = context.scope
						context.apply(undefined)
						try {
							const selection = await context.select(request, signal)
							assert.ok(selection)
							assert.equal(selection.fault, undefined)
							return {
								messages: conversation.view(),
								judgments: selection.judgments,
								...(selection.usage === undefined ? {} : { usage: selection.usage }),
							}
						} finally {
							context.apply(scope)
						}
					},
				}),
			)
		const result = await ledger.respond('Look up CASE-1 and answer the refund question.')
		const calls = this.#fixture.calls.get(path) ?? []
		assert.equal(calls.length, 3)
		assert.equal(result.passes.length, 2)
		assert.equal(result.passes[0]?.partial, true)
		assert.equal(result.partial, false)
		assert.equal(turns.length, 4, 'Repeat abort emits an unsent turn before recovery')
		for (const [index, request] of calls.entries()) {
			const turn = request.options?.think === false ? turns.at(-1) : turns[index]
			assert.ok(turn)
			assert.deepEqual(projectMessages(request.messages), projectMessages(turn.messages))
			assert.equal(estimateMessages(request.messages), turn.estimate)
		}
		for (const request of calls.slice(0, 2)) {
			assert.deepEqual(
				request.messages.filter((message) => seed.some((source) => source.id === message.id)),
				seed,
			)
			assert.equal(request.messages[0]?.content, 'Answer desk questions.')
			assert.equal(
				new Set(request.messages.map((message) => message.id)).size,
				request.messages.length,
			)
			assert.deepEqual(
				request.tools?.map((tool) => tool.name),
				['lookup', 'recall'],
			)
			assert.equal(request.options?.think, true)
		}
		assert.equal(calls[1]?.messages.at(-1)?.content, 'CASE-1 lookup payload preserved.')
		const continuation = calls[1]
		const opening = calls[0]
		assert.ok(continuation)
		assert.ok(opening)
		assert.deepEqual(
			projectMessages(continuation.messages.slice(0, opening.messages.length)),
			projectMessages(opening.messages),
		)
		assert.equal(continuation.messages.length, opening.messages.length + 2)
		assert.equal(continuation.messages.at(-2)?.calls?.[0]?.id, 'call-1')
		assert.equal(continuation.messages.at(-1)?.call, 'call-1')
		const recovery = calls[2]
		assert.ok(recovery)
		assert.equal(recovery.tools, undefined)
		assert.equal(recovery.options?.think, false)
		assert.equal(
			recovery.messages.some(
				(message) => message.role === 'tool' || (message.calls?.length ?? 0) > 0,
			),
			start,
		)
		assert.ok(recovery.messages.some((message) => message.content === LEDGER_NOTES.cue))
		assert.ok(recovery.messages.some((message) => message.content.includes(LEDGER_NOTES.results)))
		const retained = recovery.messages.filter((message) =>
			seed.some((source) => source.id === message.id),
		)
		if (start) {
			assert.deepEqual(retained, seed)
			assert.equal(recovery.messages[0]?.content, 'Answer desk questions.')
			assert.deepEqual(recovery.messages.slice(1), ledger.conversation.messages().slice(0, -1))
			assert.equal(
				new Set(recovery.messages.map((message) => message.id)).size,
				recovery.messages.length,
			)
			assert.equal(
				selections.every(
					(selection) => selection.fault === undefined && selection.briefing === undefined,
				),
				true,
			)
		} else {
			assert.ok(recovery.messages[0]?.content.includes('## Rules'))
			assert.throws(
				() => assert.deepEqual(retained, seed),
				'Scope-only full-view recovery contract must fail',
			)
		}
		assert.equal(context.scope?.name, 'full')
		assert.equal(ledger.gauge?.scale, 3, 'Ledger prices the actual built full-view first request')
		const initial = calls[0]
		assert.ok(initial)
		assert.notEqual(estimateMessages(initial.messages), estimateMessages(recovery.messages))
		console.log(
			JSON.stringify({
				claim: 'full-view',
				adapter: start ? 'start-hook' : 'scope-only',
				initial: 'pass',
				continuation: 'pass',
				recovery: start ? 'pass' : 'refused',
				retained: retained.length,
				seed: seed.length,
				passes: result.passes.length,
				priced: turns.map((turn) => turn.estimate),
				calibrated: ledger.gauge,
				recoveryScope: turns.at(-1)?.scope,
				turnEvents: turns.length,
				wireRequests: calls.length,
			}),
		)
		return {
			result,
			turns,
			selections,
			conversation: ledger.conversation.messages(),
			gauge: ledger.gauge,
		}
	}
}
