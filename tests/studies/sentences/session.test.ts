import { expect, it } from 'vitest'
import { requireValue } from '@orkestrel/test'
import { isRecord } from '@orkestrel/contract'
import {
	createStudySentenceSessionFixture,
	renderStudySentenceReply,
	retainsStudySentenceResponse,
	buildStudySentenceCalibration,
	STUDY_MEMORY_MODULES,
} from '../../setupStudy.js'
import { parseStudyProfile } from '@orkestrel/study'
import { StudySentenceSession, isStudySentenceSettings } from '../../../studies/sentences/index.js'

it('refuses an old request binding before constructing the inference transport', () => {
	const fixture = buildStudySentenceCalibration()
	const settings = fixture.declarations.profile.settings
	if (!isStudySentenceSettings(settings)) throw new Error('Missing settings')
	const profile = parseStudyProfile({
		...fixture.declarations.profile,
		record: undefined,
		settings: { ...settings, binding: { ...settings.binding, request: '0'.repeat(64) } },
	})
	expect(
		() =>
			new StudySentenceSession({
				...STUDY_MEMORY_MODULES,
				profile,
				directory: process.cwd(),
				signal: new AbortController().signal,
			}),
	).toThrow('request binding')
})

it('retains real request evidence, refuses changed packet bytes and duplicate dispatch, and closes admission', async () => {
	const live = await createStudySentenceSessionFixture({
		responses: [{ path: '/api/generate', body: renderStudySentenceReply(0.9) }],
	})
	const goal = requireValue(live.fixture.declarations.scenario.goals[0])
	try {
		if (!isRecord(goal.input)) throw new Error('Missing goal input')
		await expect(
			live.session.execute(
				{ ...goal, input: { ...goal.input, state: 'changed' } },
				live.context.context,
			),
		).rejects.toThrow('packet bytes')
		await expect(
			live.session.execute(
				requireValue(live.fixture.declarations.scenario.goals[1]),
				live.context.context,
			),
		).rejects.toThrow('out of order')
		const product = await live.session.execute(goal, live.context.context)
		expect(product.partial).toBe(false)
		expect(product.value).toMatchObject({ observation: goal.id, score: expect.closeTo(0.9, 12) })
		expect(live.context.evidence.filter((row) => row.event === 'sentence')).toHaveLength(1)
		expect(live.context.evidence.some((row) => row.event === 'answer')).toBe(true)
		await expect(live.session.execute(goal, live.context.context)).rejects.toThrow('duplicated')
		await live.session.close()
		await expect(live.session.execute(goal, live.context.context)).rejects.toThrow('closed')
		expect(live.server.requests.filter((request) => request.path === '/api/generate')).toHaveLength(
			1,
		)
	} finally {
		await live.close()
	}
})

it('joins cancellation of an in-flight native response and retains failure evidence', async () => {
	const controller = new AbortController()
	const live = await createStudySentenceSessionFixture({
		signal: controller.signal,
		responses: [{ path: '/api/generate', body: '{"response":"Yes",', open: true }],
	})
	const timer = setTimeout(() => controller.abort(new Error('Fixture cancellation')), 1000)
	try {
		await expect(
			live.session.execute(
				requireValue(live.fixture.declarations.scenario.goals[0]),
				live.context.context,
			),
		).rejects.toThrow(/abort/u)
		expect(live.server.requests.filter((request) => request.path === '/api/generate')).toHaveLength(
			1,
		)
		expect(live.context.evidence.some((row) => row.event === 'failure')).toBe(true)
		expect(live.context.evidence.some((row) => row.event === 'sentence')).toBe(false)
	} finally {
		clearTimeout(timer)
		await live.close()
	}
})

it('refuses a native request deadline and retains partial response evidence without a usable score', async () => {
	const body = '{"response":"Yes",'
	const live = await createStudySentenceSessionFixture({
		duration: 500,
		responses: [{ path: '/api/generate', body, open: true }],
	})
	const goal = requireValue(live.fixture.declarations.scenario.goals[0])
	try {
		await expect(live.session.execute(goal, live.context.context)).rejects.toThrow(/abort/u)
		expect(live.server.requests.filter((request) => request.path === '/api/generate')).toHaveLength(
			1,
		)
		expect(live.context.evidence.some((row) => row.event === 'failure')).toBe(true)
		expect(live.context.evidence.some((row) => row.event === 'sentence')).toBe(false)
		expect(live.context.context.meter.usage).toHaveLength(1)
		expect(live.context.context.meter.usage[0]).toMatchObject({ role: 'judge', calls: 1 })
		const request = requireValue(live.server.requests.find((row) => row.path === '/api/generate'))
		expect(retainsStudySentenceResponse(live.context.evidence, goal.id, request.body, body)).toBe(
			true,
		)
		expect(
			retainsStudySentenceResponse(
				live.context.evidence.filter(
					(row) => !isRecord(row.value) || row.value.role !== 'judge' || row.event === 'dispatch',
				),
				goal.id,
				request.body,
				body,
			),
		).toBe(false)
		expect(
			retainsStudySentenceResponse(
				live.context.evidence.filter((row) => isRecord(row.value) && row.value.role === 'metadata'),
				goal.id,
				request.body,
				body,
			),
		).toBe(false)
	} finally {
		await live.close()
	}
})

it('refuses the empty open-response control without claiming retained partial body bytes', async () => {
	const live = await createStudySentenceSessionFixture({
		duration: 500,
		responses: [{ path: '/api/generate', body: '', open: true }],
	})
	const goal = requireValue(live.fixture.declarations.scenario.goals[0])
	try {
		await expect(live.session.execute(goal, live.context.context)).rejects.toThrow(/abort/u)
		expect(live.server.requests.filter((row) => row.path === '/api/generate')).toHaveLength(1)
		expect(live.context.evidence.some((row) => row.event === 'failure')).toBe(true)
		expect(live.context.evidence.some((row) => row.event === 'sentence')).toBe(false)
		const request = requireValue(live.server.requests.find((row) => row.path === '/api/generate'))
		expect(retainsStudySentenceResponse(live.context.evidence, goal.id, request.body, '')).toBe(
			true,
		)
		expect(
			retainsStudySentenceResponse(
				live.context.evidence,
				goal.id,
				request.body,
				'{"response":"Yes",',
			),
		).toBe(false)
		expect(live.context.context.meter.usage).toHaveLength(1)
		expect(live.context.context.meter.usage[0]).toMatchObject({ role: 'judge', calls: 1 })
	} finally {
		await live.close()
	}
})

it('retains malformed completed responses and refuses to turn a decoding error into a probability', async () => {
	const live = await createStudySentenceSessionFixture({
		responses: [
			{ path: '/api/generate', body: '{"model":"judge","done":true,"response":"uncertain"}' },
		],
	})
	try {
		await expect(
			live.session.execute(
				requireValue(live.fixture.declarations.scenario.goals[0]),
				live.context.context,
			),
		).rejects.toThrow(/.+/u)
		expect(live.context.evidence.some((row) => row.event === 'failure')).toBe(true)
		expect(live.context.evidence.some((row) => row.event === 'sentence')).toBe(false)
	} finally {
		await live.close()
	}
})
