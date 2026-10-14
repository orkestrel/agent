import { parseJSON } from '@orkestrel/contract'
import { createScratch } from '@orkestrel/test/server'
import { describe, expect, it } from 'vitest'
import {
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryServer,
	loadStudyToolsFixture,
	readStudyToolsEvidence,
} from './setupService.js'

describe('study service fixtures', () => {
	it('serves queued protocol responses and owns real request accounting and cleanup', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', status: 503, body: 'unavailable' },
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		try {
			const refused = await fetch(`${server.url}/api/chat`, { method: 'POST', body: '{}' })
			expect(refused.status).toBe(503)
			expect(await refused.text()).toBe('unavailable')
			expect(server.requests[0]).toEqual({ path: '/api/chat', body: '{}' })
			const metadata = await fetch(`${server.url}/api/show`, { method: 'POST' })
			expect(parseJSON(await metadata.text())).toMatchObject({
				model_info: { 'fixture.context_length': 32768 },
			})
			expect(parseJSON(buildMemoryReply({ content: 'retained', completion: 3 }))).toMatchObject({
				message: { content: 'retained' },
				eval_count: 3,
			})
			const ticket = await fixture.context.meter.admit({ role: 'agent', tokens: 5, bytes: 32 })
			ticket.finish({ role: 'agent', calls: 1, tokens: 3, bytes: 8, duration: 0 })
			await fixture.context.evidence.append({ event: 'fixture', goal: 'first', value: 'saved' })
			expect(fixture.context.meter.usage).toHaveLength(1)
			expect(fixture.evidence).toEqual([{ event: 'fixture', goal: 'first', value: 'saved' }])
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('loads actual tools declarations and refuses malformed retained evidence', async () => {
		const fixture = await loadStudyToolsFixture()
		expect(fixture.manifest.definition.driver).toBe('tools')
		expect(fixture.subject).toHaveProperty('Agent')
		const scratch = createScratch()
		try {
			scratch.write(
				'execution/trials/first/evidence.jsonl',
				'{"event":"saved","goal":"write","value":7}\n',
			)
			expect(await readStudyToolsEvidence(scratch.path, 'first')).toEqual([
				{ event: 'saved', goal: 'write', value: 7 },
			])
			scratch.write('execution/trials/first/evidence.jsonl', '{"event":1}\n')
			await expect(readStudyToolsEvidence(scratch.path, 'first')).rejects.toThrow(
				'invalid evidence',
			)
		} finally {
			scratch.destroy()
		}
	})
})
