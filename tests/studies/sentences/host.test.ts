import { expect, it } from 'vitest'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { isObject, isRecord, parseJSON } from '@orkestrel/contract'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { hashStudyBytes, readStudyExchangeRows } from '@orkestrel/study/server'
import { readFileSync } from 'node:fs'
import { requireValue } from '@orkestrel/test'
import {
	buildStudySentenceCalibration,
	createMemoryServer,
	prepareStudySentenceWorkspace,
	prepareStudySentenceBuild,
	prepareStudySentenceDrift,
	renderStudySentenceReply,
} from '../../setupStudy.js'

it.each([false, true])(
	'checks frozen raw Agent bytes before inference, matching receipt: %s',
	async (receipt) => {
		const server = await createMemoryServer([
			{ path: '/api/generate', body: '{"model":"judge","done":true,"response":"uncertain"}' },
		])
		const scratch = createScratch({
			parent: resolve('tmp/units/ledger-sentence-calibration'),
			prefix: 'build-5-',
		})
		try {
			const original = buildStudySentenceCalibration(server.url)
			const fixture = prepareStudySentenceBuild(scratch, original, receipt)
			expect(
				hashStudyBytes(readFileSync(resolve(scratch.path, fixture.declarations.profile.agent))),
			).not.toBe(hashStudyBytes(readFileSync(original.declarations.profile.agent)))
			const directory = prepareStudySentenceWorkspace(scratch, fixture)
			const failure: unknown = await promisify(execFile)(
				process.execPath,
				[
					resolve('tmp/units/ledger-sentence-calibration/launch-5.ts'),
					'--execute',
					'--directory',
					directory,
					'--entry',
					resolve('node_modules/@orkestrel/study/dist/bin/main.js'),
				],
				{
					cwd: scratch.path,
					windowsHide: true,
					maxBuffer: 16777216,
					env: { ...process.env, OLLAMA_HOST: 'http://127.0.0.1:1' },
				},
			).catch((error: unknown) => error)
			if (!isObject(failure) || !('code' in failure) || !('stderr' in failure))
				throw new Error('Expected the admission refusal or deliberately unusable judge response')
			console.log(
				'Frozen build admission diagnostic',
				JSON.stringify({
					receipt,
					requests: server.requests.filter((request) => request.path === '/api/generate').length,
					stderr: String(failure.stderr),
				}),
			)
			expect(failure.code).toBe(1)
			expect(scratch.has('run/check.json')).toBe(true)
			expect(server.requests.filter((request) => request.path === '/api/generate')).toHaveLength(
				receipt ? 1 : 0,
			)
			expect(scratch.has('run/execute.command.json')).toBe(receipt)
			expect(scratch.has('run/result')).toBe(receipt)
			for (const name of [
				'selection.json',
				'completed.json',
				'fitting-grade.command.json',
				'validation-grade.command.json',
			])
				expect(scratch.has(`run/${name}`)).toBe(false)
			expect(String(failure.stderr)).toContain(
				receipt
					? 'Exchange history has no successful completion'
					: 'Frozen Agent build bytes changed',
			)
		} finally {
			await server.close()
			await destroyScratch(scratch)
		}
	},
	90000,
)

it('refuses raw profile drift after the actual check before check-only admission', async () => {
	const scratch = createScratch({
		parent: resolve('tmp/units/ledger-sentence-calibration'),
		prefix: 'profile-5-',
	})
	try {
		const directory = prepareStudySentenceWorkspace(scratch, buildStudySentenceCalibration())
		const entry = prepareStudySentenceDrift(scratch)
		const failure: unknown = await promisify(execFile)(
			process.execPath,
			[
				resolve('tmp/units/ledger-sentence-calibration/launch-5.ts'),
				'--directory',
				directory,
				'--entry',
				entry,
			],
			{
				cwd: scratch.path,
				windowsHide: true,
				maxBuffer: 16777216,
				env: { ...process.env, OLLAMA_HOST: 'http://127.0.0.1:1' },
			},
		).catch((error: unknown) => error)
		if (!isObject(failure) || !('code' in failure) || !('stderr' in failure))
			throw new Error('Expected raw profile receipt refusal')
		expect(failure.code).toBe(1)
		expect(String(failure.stderr)).toContain(
			'Checked profile bytes changed before frozen admission',
		)
		expect(scratch.has('run/check.json')).toBe(true)
		for (const name of [
			'execute.command.json',
			'result',
			'selection.json',
			'completed.json',
			'fitting-grade.command.json',
			'validation-grade.command.json',
		])
			expect(scratch.has(`run/${name}`)).toBe(false)
	} finally {
		await destroyScratch(scratch)
	}
}, 90000)

it('runs check, execution, fitting, frozen selection, and validation through the installed launcher chain', async () => {
	const source = buildStudySentenceCalibration()
	const server = await createMemoryServer(
		source.sample.goals.map((goal) => ({
			path: '/api/generate',
			body: renderStudySentenceReply(
				source.labels.find((label) => label.id === goal.id)?.label === 'yes' ? 0.9 : 0.1,
			),
		})),
	)
	const scratch = createScratch({
		parent: resolve('tmp/units/ledger-sentence-calibration'),
		prefix: 'cpu-3-',
	})
	try {
		const fixture = buildStudySentenceCalibration(server.url)
		const directory = prepareStudySentenceWorkspace(scratch, fixture)
		const result = await promisify(execFile)(
			process.execPath,
			[
				resolve('tmp/units/ledger-sentence-calibration/launch-5.ts'),
				'--execute',
				'--directory',
				directory,
				'--entry',
				resolve('node_modules/@orkestrel/study/dist/bin/main.js'),
			],
			{
				cwd: scratch.path,
				windowsHide: true,
				maxBuffer: 16777216,
				env: { ...process.env, OLLAMA_HOST: 'http://127.0.0.1:1' },
			},
		)
		const outcome = parseJSON(result.stdout)
		expect(isRecord(outcome)).toBe(true)
		expect(scratch.has('run/completed.json')).toBe(true)
		expect(server.requests.filter((request) => request.path === '/api/generate')).toHaveLength(
			fixture.sample.requests,
		)
		expect(server.responses).toEqual([])
		const selected = parseJSON(scratch.read('run/selection.json') ?? '')
		if (!isRecord(selected) || !isRecord(selected.selection))
			throw new Error('Frozen selection was not retained')
		expect(selected.selection.cutoff).toBe(0.55)
		expect(scratch.read('run/execute.command.json')).toContain('--expected')
		console.log('Sentence CPU rehearsal', result.stdout)
	} finally {
		await server.close()
		await destroyScratch(scratch)
	}
}, 180000)

it('refuses an interrupted real host execution while retaining its request, partial response, and elapsed charge before grading', async () => {
	const body = '{"response":"Yes",'
	const server = await createMemoryServer([{ path: '/api/generate', body, open: true }])
	const scratch = createScratch({
		parent: resolve('tmp/units/ledger-sentence-calibration'),
		prefix: 'interrupted-4-',
	})
	try {
		const fixture = buildStudySentenceCalibration(server.url)
		const profile = fixture.declarations.profile
		const bounded = {
			...fixture,
			declarations: {
				...fixture.declarations,
				profile: {
					...profile,
					bounds: { ...profile.bounds, request: { ...profile.bounds.request, duration: 500 } },
				},
			},
		}
		const directory = prepareStudySentenceWorkspace(scratch, bounded)
		const failure: unknown = await promisify(execFile)(
			process.execPath,
			[
				resolve('tmp/units/ledger-sentence-calibration/launch-5.ts'),
				'--execute',
				'--directory',
				directory,
				'--entry',
				resolve('node_modules/@orkestrel/study/dist/bin/main.js'),
			],
			{
				cwd: scratch.path,
				windowsHide: true,
				maxBuffer: 16777216,
				env: { ...process.env, OLLAMA_HOST: 'http://127.0.0.1:1' },
			},
		).catch((error: unknown) => error)
		if (!isObject(failure) || !('code' in failure) || !('stderr' in failure))
			throw new Error('Interrupted launcher did not return its process failure')
		expect(failure.code).toBe(1)
		expect(scratch.has('run/execute.error.txt')).toBe(true)
		for (const file of [
			'selection.json',
			'completed.json',
			'fitting-grade.command.json',
			'validation-grade.command.json',
		])
			expect(scratch.has(`run/${file}`)).toBe(false)
		const trial = 'r1-s1-a1'
		const root = `run/result/execution/trials/${trial}`
		const rows = readStudyExchangeRows(
			readFileSync(resolve(scratch.path, root, 'exchanges.jsonl')),
			false,
		)
		const request = requireValue(
			rows.find(
				(row) => row.phase === 'attempt' && row.role === 'judge' && row.path === '/api/generate',
			),
		)
		if (request.phase !== 'attempt') throw new Error('Judge request is absent')
		const terminal = requireValue(
			rows.find(
				(row) =>
					row.phase === 'failure' && row.ordinal === request.ordinal && row.goal === request.goal,
			),
		)
		if (terminal.phase !== 'failure') throw new Error('Judge failure is absent')
		expect(Buffer.from(request.body, 'base64').toString('utf8')).toBe(
			requireValue(server.requests.find((row) => row.path === '/api/generate')).body,
		)
		expect(terminal.response?.status).toBe(200)
		expect(terminal.response?.size).toBe(Buffer.byteLength(body))
		expect(Buffer.from(terminal.response?.body ?? '', 'base64').toString('utf8')).toBe(body)
		expect(terminal.response?.digest).toBe(hashStudyBytes(body))
		expect(terminal.response?.chunks.reduce((sum, length) => sum + length, 0)).toBe(
			Buffer.byteLength(body),
		)
		expect(rows.some((row) => row.phase === 'complete')).toBe(false)
		const evidence = (scratch.read(`${root}/evidence.jsonl`) ?? '')
			.split(/\r\n|\n/u)
			.filter((line) => line.length > 0)
			.map((line) => parseJSON(line))
		console.log('Sentence interrupted host evidence', JSON.stringify(evidence))
		expect(
			evidence.some(
				(row) =>
					isRecord(row) &&
					row.event === 'dispatch' &&
					row.goal === request.goal &&
					isRecord(row.value) &&
					row.value.role === 'judge' &&
					row.value.path === '/api/generate' &&
					row.value.ordinal === request.ordinal,
			),
		).toBe(true)
		expect(evidence.some((row) => isRecord(row) && row.event === 'sentence')).toBe(false)
		const attempt = parseJSON(scratch.read(`${root}/attempt.json`) ?? '')
		if (!isRecord(attempt) || !Array.isArray(attempt.observations))
			throw new Error('Interrupted host lost terminal attempt accounting')
		const executed = attempt.observations.filter((row) => isRecord(row) && row.executed === true)
		expect(executed).toHaveLength(1)
		const observation = requireValue(executed[0])
		if (!isRecord(observation) || !Array.isArray(observation.usage))
			throw new Error('Interrupted host lost judge usage')
		expect(observation.product).toBeUndefined()
		expect(observation.usage).toHaveLength(1)
		expect(observation.usage[0]).toMatchObject({
			role: 'judge',
			calls: 1,
			duration: expect.any(Number),
		})
		expect(observation.usage[0]?.duration).toBeGreaterThan(0)
		expect(server.requests.filter((row) => row.path === '/api/generate')).toHaveLength(1)
		console.log(
			'Sentence interrupted host refusal',
			JSON.stringify({
				failure: String(failure.stderr),
				duration: attempt.duration,
				cleanup: attempt.failure,
				executed,
				unexecuted: attempt.observations.length - executed.length,
				request,
				terminal,
			}),
		)
	} finally {
		await server.close()
		await destroyScratch(scratch)
	}
}, 90000)
