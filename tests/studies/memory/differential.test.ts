import { collectStudyEvidence, readStudyExchanges, readStudyResult } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	readStudyMemoryDifferential,
	normalizeStudyMemoryReceipt,
	scanStudyMemoryChange,
	scanStudyMemorySelection,
	validateStudyMemoryProfile,
	isStudyMemoryOptions,
	isStudyMemoryProvenance,
} from '../../../studies/memory/index.js'
import {
	buildMemoryLinkFixture,
	buildMemoryLexicalFixture,
	buildMemoryInertFixture,
	buildMemoryDifferentialReceipt,
	buildMemoryIdentityReceipt,
	captureMemoryLedgerOptions,
	STUDY_MEMORY_DIFFERENTIAL_SWITCHES,
	STUDY_MEMORY_LEDGER_CONTROLS,
	STUDY_MEMORY_LEDGER_INVALID,
	buildMemoryProfile,
	createMemoryReplayFixture,
	createMemoryServer,
	executeStudyInstall,
	replayMemoryDifferential,
} from '../../setupStudy.js'

it('AS1 admits only boolean Ledger switches and refuses the group on arms without a Ledger', () => {
	expect(isStudyMemoryOptions({ ledger: {} })).toBe(true)
	expect(isStudyMemoryOptions({ ledger: { link: false, lexical: true } })).toBe(true)
	for (const ledger of STUDY_MEMORY_LEDGER_INVALID)
		expect(isStudyMemoryOptions({ ledger })).toBe(false)
	const profile = buildMemoryProfile({
		url: 'http://127.0.0.1:1',
		settings: { ledger: { link: false } },
	})
	expect(() => validateStudyMemoryProfile(profile, ['records'])).not.toThrow()
	expect(() => validateStudyMemoryProfile(profile, ['compaction'])).toThrow(
		expect.objectContaining({ code: 'CONFIG' }),
	)
	expect(() => validateStudyMemoryProfile(profile, ['full'])).toThrow(
		expect.objectContaining({ code: 'CONFIG' }),
	)
	expect(() =>
		validateStudyMemoryProfile({ ...profile, settings: { ledger: { work: true } } }, ['records']),
	).toThrow(expect.objectContaining({ code: 'CONFIG' }))
})

it('forwards omitted, false, and enabled Ledger keys exactly to the real factory', async () => {
	const [omitted] = await captureMemoryLedgerOptions(undefined)
	const [empty] = await captureMemoryLedgerOptions({ ledger: {} })
	const [disabled] = await captureMemoryLedgerOptions({ ledger: { link: false } })
	const [enabled] = await captureMemoryLedgerOptions({ ledger: { lexical: true } })
	expect(omitted).not.toHaveProperty('link')
	expect(omitted).not.toHaveProperty('lexical')
	expect(empty).not.toHaveProperty('link')
	expect(empty).not.toHaveProperty('lexical')
	expect(disabled).toHaveProperty('link', false)
	expect(disabled).not.toHaveProperty('lexical')
	expect(enabled).toHaveProperty('lexical', true)
	expect(enabled).not.toHaveProperty('link')
})

it('refuses malformed and unreadable treatment groups and provenance without inventing sources', () => {
	const proxy = Proxy.revocable({}, {})
	proxy.revoke()
	expect(isStudyMemoryOptions({ ledger: proxy.proxy })).toBe(false)
	expect(
		isStudyMemoryOptions({
			ledger: {
				get link() {
					throw new Error('unreadable')
				},
			},
		}),
	).toBe(false)
	expect(isStudyMemoryProvenance({ origin: 'arrival', source: 'source' })).toBe(true)
	expect(isStudyMemoryProvenance({ origin: 'mixed' })).toBe(true)
	expect(isStudyMemoryProvenance({ origin: 'mixed', source: 1 })).toBe(false)
	expect(isStudyMemoryProvenance({ origin: 'invented' })).toBe(false)
	expect(isStudyMemoryProvenance(proxy.proxy)).toBe(false)
})

it('AD2 normalizes equal minted histories equally and keeps changed selection plans distinct', () => {
	const first = buildMemoryDifferentialReceipt('first')
	const second = buildMemoryDifferentialReceipt('second')
	expect(normalizeStudyMemoryReceipt(first)).toEqual(normalizeStudyMemoryReceipt(second))
	expect(normalizeStudyMemoryReceipt(first).receipt.selections[0]?.tail).toEqual([
		'source:receipt',
		'message:1',
		'message:2',
		'message:3',
	])
	const changed = buildMemoryDifferentialReceipt('second', 'different-owner')
	expect(normalizeStudyMemoryReceipt(first)).not.toEqual(normalizeStudyMemoryReceipt(changed))
	expect(normalizeStudyMemoryReceipt(normalizeStudyMemoryReceipt(first))).toEqual(
		normalizeStudyMemoryReceipt(first),
	)
	expect(
		normalizeStudyMemoryReceipt({
			...first,
			arrivals: first.arrivals.map((arrival) => ({ ...arrival, id: 'another-source' })),
		}),
	).not.toEqual(normalizeStudyMemoryReceipt(first))
	expect(normalizeStudyMemoryReceipt(first).receipt.selections[0]?.plan).toMatchObject({
		owners: ['owner'],
		filed: ['source:receipt', 'message:2'],
		rendered: ['source:receipt'],
		omitted: ['message:2'],
		sentences: [{ source: 'source:receipt', sentence: 0 }],
		withdrawn: [{ earlier: 'message:2', later: 'source:receipt' }],
	})
	expect(
		scanStudyMemorySelection(
			[{ event: 'selection', goal: 'opening', value: first }],
			[{ event: 'selection', goal: 'opening', value: second }],
		),
	).toBeUndefined()
	expect(
		scanStudyMemorySelection(
			[{ event: 'selection', goal: 'opening', value: first }],
			[{ event: 'selection', goal: 'opening', value: changed }],
		),
	).toMatchObject({ goal: 'opening', pass: 0 })
})

it('reports unmatched selection passes and refuses malformed or duplicated evidence', () => {
	const receipt = buildMemoryDifferentialReceipt('run')
	const row = { event: 'selection', goal: 'opening', value: receipt }
	expect(scanStudyMemorySelection([], [])).toBeUndefined()
	expect(scanStudyMemorySelection([row], [])).toMatchObject({
		goal: 'opening',
		pass: 0,
		actual: undefined,
	})
	expect(scanStudyMemorySelection([], [row])).toMatchObject({
		goal: 'opening',
		pass: 0,
		expected: undefined,
	})
	expect(() => scanStudyMemorySelection([row, row], [])).toThrow('Duplicated')
	expect(() => scanStudyMemorySelection([{ event: 'selection', value: receipt }], [])).toThrow(
		'Malformed',
	)
	expect(() => scanStudyMemorySelection([{ ...row, value: {} }], [])).toThrow('Malformed')
	expect(() =>
		normalizeStudyMemoryReceipt({ ...receipt, arrivals: [{ id: 'source', message: 'missing' }] }),
	).toThrow('Malformed')
})

it('AD2 detects an established message reorder across passes while accepting uniform minted renaming', () => {
	const earlier = buildMemoryIdentityReceipt('recorded', 0)
	const later = buildMemoryIdentityReceipt('recorded', 1)
	const renamed = buildMemoryIdentityReceipt('replayed', 1)
	const expected = [earlier, later].map((value) => ({ event: 'selection', goal: 'opening', value }))
	expect(
		scanStudyMemorySelection(expected, [
			{ event: 'selection', goal: 'opening', value: buildMemoryIdentityReceipt('replayed', 0) },
			{ event: 'selection', goal: 'opening', value: renamed },
		]),
	).toBeUndefined()
	const reordered = {
		...renamed,
		receipt: {
			...renamed.receipt,
			selections: renamed.receipt.selections.map((selection) => ({
				...selection,
				tail: ['replayed-later', 'replayed-earlier', 'replayed-request'],
			})),
		},
	}
	expect(
		scanStudyMemorySelection(expected, [
			{ event: 'selection', goal: 'opening', value: buildMemoryIdentityReceipt('replayed', 0) },
			{ event: 'selection', goal: 'opening', value: reordered },
		]),
	).toMatchObject({ goal: 'opening', pass: 1 })
})

it.each(['filed', 'rendered', 'omitted'] as const)(
	'AD2 distinguishes different unanchored %s messages in selection plans',
	(member) => {
		const recorded = buildMemoryIdentityReceipt('recorded', 0)
		const replayed = buildMemoryIdentityReceipt('replayed', 0)
		const [expected, actual] = [recorded, replayed].map((receipt, index) => ({
			event: 'selection',
			goal: 'opening',
			value: {
				...receipt,
				receipt: {
					...receipt.receipt,
					selections: receipt.receipt.selections.map((selection) => {
						if (selection.plan === undefined) throw new Error('Missing identity plan')
						return {
							...selection,
							plan: {
								...selection.plan,
								[member]: [index === 0 ? 'recorded-unseen-1' : 'replayed-unseen-2'],
							},
						}
					}),
				},
			},
		}))
		if (expected === undefined || actual === undefined) throw new Error('Missing identity controls')
		const renamed = {
			...replayed,
			receipt: {
				...replayed.receipt,
				selections: replayed.receipt.selections.map((selection) => {
					if (selection.plan === undefined) throw new Error('Missing identity plan')
					return { ...selection, plan: { ...selection.plan, [member]: ['replayed-unseen-1'] } }
				}),
			},
		}
		expect(scanStudyMemorySelection([expected], [{ ...actual, value: renamed }])).toBeUndefined()
		expect(scanStudyMemorySelection([expected], [actual])).toMatchObject({
			goal: 'opening',
			pass: 0,
		})
		const anchored = [expected, actual].map((row, index) => ({
			...row,
			value: {
				...row.value,
				receipt: {
					...row.value.receipt,
					selections: row.value.receipt.selections.map((selection) => ({
						...selection,
						tail: [
							...selection.tail,
							...(index === 0
								? ['recorded-unseen-1', 'recorded-unseen-2']
								: ['replayed-unseen-1', 'replayed-unseen-2']),
						],
					})),
				},
			},
		}))
		expect(scanStudyMemorySelection(anchored.slice(0, 1), anchored.slice(1))).toMatchObject({
			goal: 'opening',
			pass: 0,
		})
	},
)

it('AD1 keeps a replay interrupted after its last recorded response distinct from an inert sealed replay', async () => {
	const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'rec-fix-completion-' })
	const trajectory = buildMemoryInertFixture()
	const server = await createMemoryServer(trajectory.responses)
	try {
		const fixture = createMemoryReplayFixture(scratch, server.url, 'records', {
			goals: trajectory.goals,
			settings: { observe: true },
		})
		const output = join(scratch.path, 'recorded')
		const command = await executeStudyInstall(
			fixture,
			['execute', 'memory', '--out', output],
			120000,
		)
		if (command.code !== 0) throw new Error(JSON.stringify(command))
		const baseline = await readStudyResult(output)
		if (baseline.status !== 'sealed') throw new Error('Completion baseline did not seal')
		const [trial] = baseline.manifest.schedule
		if (trial === undefined) throw new Error('Missing completion trial')
		const sent = server.requests
		const original = scratch.read('studies/memory/StudyMemorySession.ts')
		if (original === undefined) throw new Error('Missing captured session')
		const history = await readStudyExchanges(baseline, trial.id)
		const interrupted = original
			.replace('#input: string | undefined', '#replayed = 0\n\t#input: string | undefined')
			.replace(
				'fetch: options.replay.fetch',
				`fetch: async (...args) => {
				this.#replayed += 1
				const response = await options.replay?.fetch(...args)
				if (response === undefined) throw new StudyError('FAULT', 'Missing replay')
				if (this.#replayed !== ${history.completion.count}) return response
				await response.arrayBuffer()
				return new Response(new ReadableStream({ start(controller) {
					controller.error(new StudyError('FAULT', 'Fixture failed after final recorded response'))
				} }), { status: response.status, headers: response.headers })
			}`,
			)
		expect(interrupted).not.toBe(original)
		scratch.write('studies/memory/StudyMemorySession.ts', interrupted)
		const replay = await replayMemoryDifferential(fixture, baseline, 'interrupted', {})
		expect(replay.command.code).not.toBe(0)
		expect(replay.result.status).toBe('interrupted')
		expect(
			await readStudyMemoryDifferential({ baseline, replay: replay.result, trial: trial.id }),
		).toEqual({
			complete: false,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
		scratch.write('studies/memory/StudyMemorySession.ts', original)
		const sealed = await replayMemoryDifferential(fixture, baseline, 'sealed', {})
		expect(sealed.command.code).toBe(0)
		expect(
			await readStudyMemoryDifferential({ baseline, replay: sealed.result, trial: trial.id }),
		).toEqual({
			complete: true,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
		const early = original.replace(
			'if (this.#goals === undefined || this.#goals.at(-1) === goal) await this.#transport.verify()',
			"throw new StudyError('FAULT', 'Fixture ended before postflight')",
		)
		expect(early).not.toBe(original)
		scratch.write('studies/memory/StudyMemorySession.ts', early)
		const ended = await replayMemoryDifferential(fixture, baseline, 'early', {})
		expect(ended.command.code).not.toBe(0)
		expect(ended.result.status).toBe('interrupted')
		expect(
			await readStudyMemoryDifferential({ baseline, replay: ended.result, trial: trial.id }),
		).toMatchObject({
			complete: false,
			change: undefined,
			selection: undefined,
			divergence: { expected: { stage: 'postflight' }, actual: undefined },
		})
		scratch.write('studies/memory/StudyMemorySession.ts', original)
		const refused = original.replace(
			'return product',
			"throw new StudyError('FAULT', 'Fixture refused the completed product')",
		)
		expect(refused).not.toBe(original)
		scratch.write('studies/memory/StudyMemorySession.ts', refused)
		const failed = await replayMemoryDifferential(fixture, baseline, 'refused', {})
		expect(failed.command.code).not.toBe(0)
		expect(failed.result.status).toBe('sealed')
		expect(
			await readStudyMemoryDifferential({ baseline, replay: failed.result, trial: trial.id }),
		).toEqual({
			complete: false,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
		scratch.write('studies/memory/StudyMemorySession.ts', original)
		expect(server.requests).toEqual(sent)
	} finally {
		await server.close()
		destroyScratch(scratch)
	}
}, 240000)

it('attributes the first changed message by baseline index and bounds UTF-16 excerpts', () => {
	const expected = { model: 'model', messages: [{ role: 'user', content: 'é😀same' }] }
	const actual = { model: 'model', messages: [{ role: 'user', content: 'é😀changed' }] }
	expect(
		scanStudyMemoryChange(expected, actual, [{ origin: 'arrival', source: 'public-source' }]),
	).toEqual({
		member: 'messages',
		index: 0,
		offset: 3,
		expected: 'é😀same',
		actual: 'é😀changed',
		origin: 'arrival',
		source: 'public-source',
	})
	expect(scanStudyMemoryChange(expected, { ...actual, model: 'other' }, [])).toMatchObject({
		member: 'model',
		index: undefined,
		origin: undefined,
		source: undefined,
	})
	expect(
		scanStudyMemoryChange({ options: { b: 2, a: 1 } }, { options: { a: 1, b: 2 } }, []),
	).toBeUndefined()
	expect(scanStudyMemoryChange({ stream: true }, { stream: false }, [])).toMatchObject({
		member: 'flags',
	})
	const long = scanStudyMemoryChange(
		{ prompt: 'x'.repeat(500) },
		{ prompt: `${'x'.repeat(400)}added${'x'.repeat(500)}` },
		[],
	)
	expect(long?.offset).toBe(401)
	expect(long?.actual).toContain('added')
	expect(long?.actual.length).toBeLessThanOrEqual(256)
	expect(() => scanStudyMemoryChange([], {}, [])).toThrow('JSON request objects')
	expect(
		scanStudyMemoryChange({ messages: [{ content: 'same' }] }, { messages: [] }, [
			{ origin: 'input', source: 'goal' },
		]),
	).toMatchObject({ index: 0, origin: 'input', source: 'goal', actual: '' })
	expect(
		scanStudyMemoryChange({ messages: [] }, { messages: [{ content: 'source-like text' }] }, []),
	).toMatchObject({ index: 0, origin: undefined, source: undefined })
	expect(
		scanStudyMemoryChange(
			{ tools: ['lookup'], options: { seed: 0 } },
			{ tools: [], options: { seed: 1 } },
			[],
		),
	).toMatchObject({ member: 'tools' })
	expect(
		scanStudyMemoryChange({ options: { seed: 0 } }, { options: { seed: 1 } }, []),
	).toMatchObject({ member: 'options' })
})

it.each(STUDY_MEMORY_DIFFERENTIAL_SWITCHES)(
	'AD1 %s changes the composed system message on its triggering recording and stays passive on controls',
	async (treatment) => {
		const scratch = createScratch({
			parent: resolve('tmp/units'),
			prefix: `rec-differential-${treatment}-`,
		})
		const trajectory = treatment === 'link' ? buildMemoryLinkFixture() : buildMemoryLexicalFixture()
		const server = await createMemoryServer(trajectory.responses)
		try {
			const fixture = createMemoryReplayFixture(scratch, server.url, 'records', {
				goals: trajectory.goals,
				settings: { observe: true },
			})
			const output = join(scratch.path, 'recorded')
			const command = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', output],
				120000,
			)
			if (command.code !== 0) throw new Error(JSON.stringify(command))
			const baseline = await readStudyResult(output)
			if (baseline.status !== 'sealed') throw new Error('Treatment baseline did not seal')
			const [trial] = baseline.manifest.schedule
			if (trial === undefined) throw new Error('Missing trial')
			const history = await readStudyExchanges(baseline, trial.id)
			const sent = server.requests
			for (const [target, settings] of Object.entries(STUDY_MEMORY_LEDGER_CONTROLS)) {
				const replay = await replayMemoryDifferential(fixture, baseline, target, settings)
				const reading = await readStudyMemoryDifferential({
					baseline,
					replay: replay.result,
					trial: trial.id,
				})
				expect(replay.command.code).toBe(0)
				expect(replay.result.status).toBe('sealed')
				expect(reading).toEqual({
					complete: true,
					divergence: undefined,
					change: undefined,
					selection: undefined,
				})
			}
			const enabled = await replayMemoryDifferential(fixture, baseline, 'enabled', {
				ledger: { [treatment]: true },
			})
			const reading = await readStudyMemoryDifferential({
				baseline,
				replay: enabled.result,
				trial: trial.id,
			})
			const predicted = history.exchanges.find(
				({ attempt }) => attempt.goal === 'closure' && attempt.role === 'agent',
			)
			expect(predicted?.attempt.ordinal).toBe(trajectory.ordinal)
			expect(reading.divergence?.ordinal).toBe(trajectory.ordinal)
			expect(enabled.command.code).not.toBe(0)
			expect(enabled.result.status).toBe('interrupted')
			expect(reading.complete).toBe(false)
			expect(reading.divergence?.expected?.goal).toBe('closure')
			expect(reading.change).toMatchObject({
				member: 'messages',
				index: 0,
				origin: 'mixed',
				source: undefined,
			})
			expect(reading.change?.actual).toContain(trajectory.marker)
			expect(reading.change?.expected).not.toContain(trajectory.marker)
			expect(reading.selection).toBeUndefined()
			expect(server.requests).toEqual(sent)
			expect(history.declaration.procedure).toBeUndefined()
			expect(
				(await collectStudyEvidence(baseline))[trial.id]?.some((row) => row.event === 'context'),
			).toBe(true)
		} finally {
			await server.close()
			destroyScratch(scratch)
		}
	},
	480000,
)

it('AD1 replays both enabled switches fully when the recording contains no selectable lookup unit', async () => {
	const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'rec-differential-inert-' })
	const trajectory = buildMemoryInertFixture()
	const server = await createMemoryServer(trajectory.responses)
	try {
		const fixture = createMemoryReplayFixture(scratch, server.url, 'records', {
			goals: trajectory.goals,
			settings: { observe: true },
		})
		const output = join(scratch.path, 'recorded')
		const command = await executeStudyInstall(
			fixture,
			['execute', 'memory', '--out', output],
			120000,
		)
		if (command.code !== 0) throw new Error(JSON.stringify(command))
		const baseline = await readStudyResult(output)
		if (baseline.status !== 'sealed') throw new Error('Inert baseline did not seal')
		const [trial] = baseline.manifest.schedule
		if (trial === undefined) throw new Error('Missing inert trial')
		const sent = server.requests
		for (const treatment of STUDY_MEMORY_DIFFERENTIAL_SWITCHES) {
			const replay = await replayMemoryDifferential(fixture, baseline, treatment, {
				ledger: { [treatment]: true },
			})
			expect(replay.command.code).toBe(0)
			expect(replay.result.status).toBe('sealed')
			expect(
				await readStudyMemoryDifferential({ baseline, replay: replay.result, trial: trial.id }),
			).toEqual({ complete: true, divergence: undefined, change: undefined, selection: undefined })
		}
		const helper = scratch.read('studies/memory/helpers.ts')
		if (helper === undefined) throw new Error('Missing captured memory helpers')
		const altered = helper.replace(
			'JSON.stringify(receipt)',
			"JSON.stringify({ ...receipt, receipt: { ...receipt.receipt, selections: receipt.receipt.selections.map((selection) => ({ ...selection, plan: selection.plan === undefined ? undefined : { ...selection.plan, owners: [...selection.plan.owners, 'altered-owner'] } })) } })",
		)
		expect(altered).not.toBe(helper)
		scratch.write('studies/memory/helpers.ts', altered)
		const selected = await replayMemoryDifferential(fixture, baseline, 'selection', {})
		expect(selected.command.code).toBe(0)
		expect(selected.result.status).toBe('sealed')
		const changed = await readStudyMemoryDifferential({
			baseline,
			replay: selected.result,
			trial: trial.id,
		})
		expect(changed.divergence).toBeUndefined()
		expect(changed.change).toBeUndefined()
		expect(changed.selection).toMatchObject({
			goal: 'opening',
			pass: 0,
			actual: {
				receipt: {
					selections: [
						expect.objectContaining({
							plan: expect.objectContaining({ owners: ['altered-owner'] }),
						}),
					],
				},
			},
		})
		scratch.write('studies/memory/helpers.ts', helper)
		expect(server.requests).toEqual(sent)
	} finally {
		await server.close()
		destroyScratch(scratch)
	}
}, 360000)
