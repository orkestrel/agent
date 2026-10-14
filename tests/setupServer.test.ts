import { createScratch } from '@orkestrel/test/server'
import { join } from 'node:path'
import { buildStudyRubric } from './setupStudy.js'
import { buildCustodyGrading, buildCustodyLabels, retainStudyFixture } from './setupServer.js'
import { createRecorder } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { createFixtureServer } from './setupServer.js'

describe('createFixtureServer', () => {
	it('binds independent loopback listeners, customizes routes, and releases caller-owned resources', async () => {
		const requests = createRecorder<readonly [string]>()
		const first = createFixtureServer([
			{
				method: 'POST',
				path: '/answer',
				handler: async (request) => {
					requests.handler(await request.text())
					return Response.json({ answer: 7 })
				},
			},
		])
		const second = createFixtureServer([
			{ method: 'GET', path: '/other', handler: () => new Response('other') },
		])
		try {
			expect(first.status).toBe('idle')
			const port = await first.start()
			const other = await second.start()
			expect(port).toBeGreaterThan(0)
			expect(other).not.toBe(port)
			expect(first.address?.address).toBe('127.0.0.1')
			expect(second.address?.address).toBe('127.0.0.1')
			const response = await fetch('http://127.0.0.1:' + port + '/answer', {
				method: 'POST',
				body: 'question',
			})
			expect(await response.json()).toEqual({ answer: 7 })
			expect(requests.calls).toEqual([['question']])
			const refused = await fetch('http://127.0.0.1:' + port + '/answer')
			expect(refused.status).toBe(405)
			expect(refused.headers.get('allow')).toBe('POST')
			await refused.text()
			const missing = await fetch('http://127.0.0.1:' + port + '/absent')
			expect(missing.status).toBe(404)
			await missing.text()
			expect(await (await fetch('http://127.0.0.1:' + other + '/other')).text()).toBe('other')
		} finally {
			await Promise.all([first.stop(), second.stop()])
		}
		expect(first.status).toBe('stopped')
		expect(second.status).toBe('stopped')
		expect(first.address).toBeUndefined()
		expect(second.address).toBeUndefined()
	})
	it('lets a caller close the listener when its scenario rejects', async () => {
		const server = createFixtureServer([])
		const failure = new Error('scenario failed')
		await expect(async () => {
			try {
				await server.start()
				throw failure
			} finally {
				await server.stop()
			}
		}).rejects.toBe(failure)
		expect(server.status).toBe('stopped')
		expect(server.address).toBeUndefined()
	})
})

describe('study server fixtures', () => {
	it('returns a sealed real-files fixture with complete grades and explicit supplied label provenance', async () => {
		const scratch = createScratch()
		try {
			const result = await retainStudyFixture(join(scratch.path, 'result'))
			const rubric = buildStudyRubric()
			const grading = buildCustodyGrading(result, rubric)
			expect(grading.attempts).toEqual(result.manifest.schedule.map((trial) => trial.id))
			expect(
				grading.judgments
					.filter((judgment) => judgment.method === 'human')
					.every((judgment) => judgment.verdict === 'unknown'),
			).toBe(true)
			const labels = buildCustodyLabels(result, 'supplied-human')
			expect(labels.labeler).toBe('supplied-human')
			expect(labels.created).toBe('2026-10-14T12:00:00.000Z')
			expect(buildCustodyGrading(result, rubric, labels).judgments).toEqual(
				expect.arrayContaining(labels.judgments),
			)
		} finally {
			scratch.destroy()
		}
	})
})
