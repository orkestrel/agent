import { parseJSON } from '@orkestrel/contract'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { lstatSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryServer,
	loadStudyToolsFixture,
	readStudyToolsEvidence,
	captureServicePackages,
	createStudyServiceFixture,
	executeStudyService,
	executeStudyProcess,
	executeStudyTopology,
	readMemoryToolResults,
} from './setupService.js'

describe('study service fixtures', () => {
	it('preserves fresh topology worker diagnostics and runs bounded native entries', async () => {
		const scratch = createScratch({ prefix: 'study-topology-setup-' })
		try {
			const entry = scratch.write(
				'receipt.mjs',
				"console.log(process.argv[2])\nconsole.error('retained diagnostic')\nprocess.exitCode = 7\n",
			)
			expect(await executeStudyProcess([entry, 'retained output'], scratch.path, 60000)).toEqual({
				code: 7,
				stdout: 'retained output\n',
				stderr: 'retained diagnostic\n',
			})
			const refused = await executeStudyTopology(scratch, [])
			expect(refused.code).toBe(1)
			expect(refused.stdout).toContain('"roots":[]')
			expect(refused.stderr).toContain('Artifact entry must be admitted built ESM:')
		} finally {
			await destroyScratch(scratch)
		}
	})
	it('reads tool receipts from actual wire shapes and refuses malformed messages', () => {
		expect(
			readMemoryToolResults(
				JSON.stringify({
					messages: [
						{ role: 'user', content: 'Read' },
						{ role: 'tool', content: 'No record' },
						{ role: 'tool', content: 'order: Owner\nReleased' },
					],
				}),
			),
		).toEqual(['No record', 'order: Owner\nReleased'])
		expect(() => readMemoryToolResults('{}')).toThrow('Invalid chat request')
		expect(() => readMemoryToolResults('{"messages":[7]}')).toThrow('Invalid chat message')
		expect(() => readMemoryToolResults('{"messages":[{"role":"tool","content":7}]}')).toThrow(
			'Invalid tool receipt',
		)
	})
	it('copies actual package closure with one selected Agent and retains exact native command diagnostics', async () => {
		const scratch = createScratch()
		try {
			const fixture = createStudyServiceFixture(scratch, 'http://127.0.0.1:7')
			expect(fixture.packages.filter((entry) => entry.name === '@orkestrel/agent')).toEqual([
				{
					name: '@orkestrel/agent',
					source: resolve('.'),
					target: join(scratch.path, 'node_modules', '@orkestrel/agent'),
				},
			])
			for (const entry of fixture.packages) {
				expect(lstatSync(entry.target).isSymbolicLink()).toBe(false)
				expect(readFileSync(join(entry.target, 'package.json'))).toEqual(
					readFileSync(join(entry.source, 'package.json')),
				)
			}
			expect(parseJSON(scratch.read('studies/memory/profiles/local.json') ?? '')).toMatchObject({
				qualification: 'tmp/studies/memory-capacity',
				provider: { url: 'http://127.0.0.1:7', model: 'model', judge: 'judge' },
				roots: fixture.packages.map((entry) => entry.target),
			})
			const help = await executeStudyService(fixture, ['--help'])
			expect(help).toMatchObject({ code: 0 })
			expect(help.stdout).toContain('study execute')
			const refused = await executeStudyService(fixture, ['unsupported'])
			expect(refused.code).toBe(64)
			expect(refused.stderr).not.toBe('')
			expect(() =>
				captureServicePackages(scratch, new Map([['wrong-package', resolve('.')]])),
			).toThrow('Malformed selected package')
		} finally {
			await destroyScratch(scratch)
		}
	})

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
