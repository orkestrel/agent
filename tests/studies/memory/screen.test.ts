import { canonicalStringify, isRecord, parseJSON } from '@orkestrel/contract'
import { buildStudySchedule, parseStudyProfile } from '@orkestrel/study'
import {
	collectStudyEvidence,
	readStudyDeclaration,
	readStudyResult,
	readStudyExchanges,
	readStudyClosure,
	hashStudyBytes,
} from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { join, resolve } from 'node:path'
import { readFileSync, writeFileSync, realpathSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTeardown } from '@orkestrel/test'
import type { MemoryScreenGroupFixture, MemoryScreenTimeoutFixture } from './types.js'
import { StudyMemoryAdapter } from '../../../studies/memory/StudyMemoryAdapter.js'
import {
	buildStudyMemoryMatched,
	readStudyMemoryAdmission,
	matchesStudyMemorySham,
	buildStudyMemoryTarget,
} from '../../../studies/memory/helpers.js'
import { isStudyMemoryOptions } from '../../../studies/memory/validators.js'
import {
	buildMemoryScreenResponses,
	createMemoryScreenFixture,
	createMemoryServer,
	executeMemoryScreenProcess,
	admitMemoryScreen,
	createMemoryScreenReplay,
	buildMemoryReply,
	executeMemorySourceFailure,
	prepareMemoryScreenSource,
	createMemoryDaemonFixture,
	createMemoryScreenLauncher,
	destroyStudySentinel,
	executeStudyProcess,
} from '../../setupStudy.js'

describe.sequential('portable R2 identity controls', () => {
	let source: MemoryScreenGroupFixture | undefined
	let close: (() => Promise<void>) | undefined
	beforeAll(async () => {
		const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
		const server = await createMemoryServer(buildMemoryScreenResponses(declaration.scenarios))
		close = () => server.close()
		const scratch = createScratch({
			parent: resolve('tmp/units/r2-consumer-20261025'),
			prefix: 'identity-',
		})
		const fixture = await createMemoryScreenFixture(scratch, server.url)
		source = await prepareMemoryScreenSource(fixture, server)
	}, 300000)
	afterAll(async () => {
		await close?.()
	}, 30000)
	it('refuses public scenario draft lookup and source-host substitutions at their intended guards', async () => {
		if (source === undefined) throw new Error('Missing freshly sealed portable source')
		const { fixture: original, admission, output, frozen } = source
		const scratch = createScratch({
			parent: resolve('tmp/units/r2-consumer-20261025'),
			prefix: 'identity-',
		})
		const server = await createMemoryServer([])
		try {
			const scenarios = original.scenarios.map((scenario, index) =>
				index !== 0
					? scenario
					: {
							...scenario,
							goals: scenario.goals.map((goal, ordinal) =>
								ordinal !== 1 || !isRecord(goal.input)
									? goal
									: {
											...goal,
											input: {
												...goal.input,
												prompt: String(goal.input.prompt) + ' Changed public target.',
											},
										},
							),
						},
			)
			const changed = {
				directory: output,
				...original,
				identity: source.result.manifest.identity,
				scenarios,
				profile: parseStudyProfile({
					...original.profile,
					settings: {
						...original.profile.settings,
						screen: { preparation: true, targets: scenarios.map(buildStudyMemoryTarget) },
					},
				}),
			}
			await expect(readStudyMemoryAdmission(changed)).rejects.toThrow(
				'Screen source is unsealed, derived, or differs from the checked declarations',
			)
			const fixture = await createMemoryScreenFixture(scratch, server.url)
			for (const kind of ['draft', 'lookup']) {
				const altered = {
					...admission,
					trials: admission.trials.map((trial, index) =>
						index !== 0
							? trial
							: kind === 'draft'
								? { ...trial, draft: trial.draft + ' Changed retained draft.' }
								: {
										...trial,
										lookups: trial.lookups.map((lookup, ordinal) =>
											ordinal !== 0
												? lookup
												: { ...lookup, content: lookup.content + ' Changed lookup version.' },
										),
									},
					),
				}
				const matched = buildStudyMemoryMatched(fixture.profile, altered, {
					name: kind,
					work: false,
					sham: false,
				})
				scratch.write(`studies/memory/profiles/${kind}.json`, JSON.stringify(matched))
				const destination = join(scratch.path, `${kind}-closure`)
				const freeze = await executeMemoryScreenProcess(fixture, [
					fixture.entry,
					'freeze',
					'r2-request-screen',
					'--profile',
					kind,
					'--to',
					destination,
				])
				assert.equal(freeze.code, 0, freeze.stderr)
				const selection = scratch.write(
					`${kind}-selection.json`,
					JSON.stringify({
						closure: destination,
						expected: readStudyClosure(destination).fingerprint,
						output: join(scratch.path, `${kind}-refused-output`),
						source: { directory: output, closure: frozen, seal: admission.seal },
						replay: {
							result: output,
							prefix: Object.fromEntries(admission.trials.map((trial) => [trial.id, trial.prefix])),
							offline: false,
						},
					}),
				)
				const rejected = await executeMemoryScreenProcess(
					fixture,
					[fixture.admission, scratch.path, fixture.entry, 'admit', selection],
					65000,
				)
				scratch.write(`${kind}-admit.json`, JSON.stringify(rejected))
				expect(rejected.code).toBe(1)
				expect(rejected.stderr).toContain(
					'Screen CLI source or prefix differs from immutable admission',
				)
				expect(server.requests).toEqual([])
			}
			const selection = join(scratch.path, 'draft-selection.json')
			const before = readFileSync(fixture.admission)
			const mutant = before
				.toString()
				.replace('canonicalStringify(admission) !== canonicalStringify(screen.admission) ||', '')
			expect(mutant).not.toBe(before.toString())
			try {
				writeFileSync(fixture.admission, mutant)
				const control = await executeMemoryScreenProcess(
					fixture,
					[fixture.admission, scratch.path, fixture.entry, 'admit', selection],
					65000,
				)
				scratch.write('admission-mutation.json', JSON.stringify(control))
				expect(control.code).toBe(1)
				expect(control.stderr).not.toContain(
					'Screen CLI source or prefix differs from immutable admission',
				)
				expect(control.stderr).toContain('Screen non-treatment settings or serving runtime differ')
			} finally {
				writeFileSync(fixture.admission, before)
				scratch.write(
					'admission-restoration.json',
					JSON.stringify({
						before: hashStudyBytes(before),
						restored: hashStudyBytes(readFileSync(fixture.admission)),
					}),
				)
			}
			expect(readFileSync(fixture.admission).equals(before)).toBe(true)
			const comparison = process.env.ORKESTREL_R2_SOURCE_STUDY
			if (comparison === undefined)
				throw new Error(
					'Set ORKESTREL_R2_SOURCE_STUDY to a separately installed real comparison Study',
				)
			const hostScratch = createScratch({
				parent: resolve('tmp/units/r2-consumer-20261025'),
				prefix: 'identity-',
			})
			const host = await createMemoryScreenFixture(hostScratch, server.url, { study: comparison })
			const profile = buildStudyMemoryMatched(host.profile, admission, {
				name: 'host',
				work: false,
				sham: false,
			})
			hostScratch.write('studies/memory/profiles/host.json', JSON.stringify(profile))
			const destination = join(hostScratch.path, 'host-closure')
			const freeze = await executeMemoryScreenProcess(host, [
				host.entry,
				'freeze',
				'r2-request-screen',
				'--profile',
				'host',
				'--to',
				destination,
			])
			assert.equal(freeze.code, 0, freeze.stderr)
			const selected = hostScratch.write(
				'host-selection.json',
				JSON.stringify({
					closure: destination,
					expected: readStudyClosure(destination).fingerprint,
					output: join(hostScratch.path, 'refused-output'),
					source: { directory: output, closure: frozen, seal: admission.seal },
					replay: {
						result: output,
						prefix: Object.fromEntries(admission.trials.map((trial) => [trial.id, trial.prefix])),
						offline: false,
					},
				}),
			)
			const rejected = await executeMemoryScreenProcess(
				host,
				[host.admission, hostScratch.path, host.entry, 'admit', selected],
				65000,
			)
			hostScratch.write('host-admit.json', JSON.stringify(rejected))
			expect(rejected.code).toBe(1)
			expect(rejected.stderr).toContain('Screen retained Study differs from selected host')
			expect(server.requests).toEqual([])
			expect((await readStudyResult(output)).status).toBe('sealed')
			expect(
				(
					await readStudyMemoryAdmission({
						directory: output,
						...original,
						identity: source.result.manifest.identity,
					})
				).seal,
			).toBe(admission.seal)
			scratch.write('requests.json', JSON.stringify(server.requests))
		} finally {
			await server.close()
		}
	}, 180000)
})

describe.sequential('portable R2 timeout controls', () => {
	const prepared = Promise.withResolvers<MemoryScreenTimeoutFixture>()
	const teardown = createTeardown()
	beforeAll(async () => {
		const scratch = createScratch({
			parent: resolve('tmp/units/r2-consumer-20261025'),
			prefix: 'launcher-',
		})
		const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
		const replies = [...buildMemoryScreenResponses(declaration.scenarios)]
		const terminal = replies[4]
		if (terminal === undefined) throw new Error('Missing real fifth agent reply')
		replies[4] = {
			...terminal,
			body: '{"model":"model","done":false,"message":{"role":"assistant","content":"Pending final"}}\n',
			open: true,
		}
		const server = await createMemoryServer([...replies.slice(0, 5), ...replies])
		teardown.add(() => server.close())
		const daemon = await createMemoryDaemonFixture(scratch, server.url)
		teardown.add(() => daemon.close())
		const sentinel = spawn(
			process.execPath,
			[scratch.write('sentinel.ts', 'setInterval(() => {}, 1000)\n')],
			{ windowsHide: true, stdio: 'ignore' },
		)
		teardown.add(() => destroyStudySentinel(sentinel))
		scratch.write(
			'sentinel-initial.json',
			JSON.stringify({ pid: sentinel.pid, at: new Date().toISOString() }),
		)
		const fixture = await createMemoryScreenFixture(scratch, server.url, { identity: true })
		const original = fixture.profile
		const profile = parseStudyProfile({
			...original,
			name: 'r2-cpu-completion',
			provider: { ...original.provider, url: daemon.url, daemon: daemon.declaration },
			bounds: Object.fromEntries(
				Object.entries({ request: 45000, goal: 50000, trial: 60000, series: 65000 }).map(
					([key, duration]) => {
						const bound = Reflect.get(original.bounds, key)
						if (!isRecord(bound)) throw new Error('Missing actual CPU bound')
						return [key, { ...bound, duration }]
					},
				),
			),
			record: { ...original.record, duration: 60000 },
		})
		new StudyMemoryAdapter().validate({ ...fixture, profile })
		scratch.write('studies/memory/profiles/r2-cpu-completion.json', JSON.stringify(profile))
		const launcher = createMemoryScreenLauncher(fixture)
		teardown.add(() => writeFileSync(launcher.launcher, launcher.original))
		const options = {
			environment: { NODE_OPTIONS: `--import=${pathToFileURL(launcher.trace).href}` },
		}
		const frozen = join(scratch.path, 'closure')
		const freeze = await executeStudyProcess(
			[fixture.entry, 'freeze', 'r2-request-screen', '--profile', profile.name, '--to', frozen],
			scratch.path,
			60000,
			options,
		)
		scratch.write('freeze.json', JSON.stringify(freeze))
		assert.equal(freeze.code, 0, freeze.stderr)
		const selection = scratch.write(
			'selection.json',
			JSON.stringify({
				closure: frozen,
				expected: readStudyClosure(frozen).fingerprint,
				output: join(scratch.path, 'result'),
			}),
		)

		prepared.resolve({ scratch, server, daemon, sentinel, launcher, frozen, selection, options })
	}, 180000)
	afterAll(async () => {
		await teardown.destroy()
	}, 30000)
	it('contains the forced outer timeout and binds the real worker Agent to captured bytes', async () => {
		const { scratch, server, daemon, sentinel, launcher, frozen, selection, options } =
			await prepared.promise
		const receipt = join(scratch.path, 'admission.json')
		const reached = {
			executed: true,
			observations: [
				{ goal: 'r2-ivo-seed', executed: true },
				{ goal: 'r2-ivo-target', executed: true },
			],
		}
		// Exact retained R1 attempt; the earlier generic nonzero check admitted this wrong seed.
		const wrongSeed = parseJSON(
			'{"duration":15985,"executed":true,"failure":{"cause":"infrastructure","message":"Screen requires successful seed lookups"},"observations":[{"duration":230,"executed":true,"failure":{"cause":"infrastructure","message":"Screen requires successful seed lookups"},"goal":"r2-ivo-seed","usage":[{"bytes":4642,"calls":1,"duration":8,"role":"agent","tokens":12},{"bytes":4030,"calls":1,"duration":6,"role":"agent","tokens":12},{"bytes":2432,"calls":1,"duration":6,"role":"judge","tokens":11},{"bytes":1755,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":2326,"calls":1,"duration":6,"role":"judge","tokens":11},{"bytes":2331,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":2315,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":2303,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":2032,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":1355,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":1926,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":1931,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":1915,"calls":1,"duration":4,"role":"judge","tokens":11},{"bytes":1903,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":2227,"calls":1,"duration":5,"role":"judge","tokens":11},{"bytes":5731,"calls":1,"duration":6,"role":"agent","tokens":12},{"bytes":22,"calls":1,"duration":1,"role":"tool","tokens":0},{"bytes":25,"calls":1,"duration":1,"role":"tool","tokens":0}]},{"duration":0,"executed":false,"failure":{"cause":"infrastructure","message":"Goal unexecuted: Screen requires successful seed lookups"},"goal":"r2-ivo-target","usage":[]}],"trial":{"arm":"records","id":"r1-s1-a1","repetition":0,"scenario":"r2-ivo-screen"}}',
		)
		expect(() => assert.partialDeepStrictEqual(wrongSeed, reached)).toThrow(/Expected values/u)
		for (const allowance of [
			{
				name: 'pre-admission',
				value: '79999',
				admitted: false,
				reason: 'Elapsed allowance cannot contain admission and cleanup',
			},
			{
				name: 'post-admission',
				value: '95000',
				admitted: true,
				reason: 'Elapsed allowance cannot contain native check, execution and cleanup',
			},
		]) {
			const refusedReceipt = join(scratch.path, `${allowance.name}.json`)
			expect(existsSync(refusedReceipt)).toBe(false)
			const refused = await executeStudyProcess(
				[
					launcher.launcher,
					'execute',
					selection,
					hashStudyBytes(readFileSync(selection)),
					hashStudyBytes(readFileSync(launcher.physical)),
					refusedReceipt,
					allowance.value,
				],
				scratch.path,
				65000,
				options,
			)
			scratch.write(
				`${allowance.name}-control.json`,
				JSON.stringify({ result: refused, requests: server.requests, daemon: daemon.pids }),
			)
			expect(refused.code).not.toBe(0)
			expect(refused.stderr).toContain(allowance.reason)
			expect(existsSync(refusedReceipt)).toBe(allowance.admitted)
			expect(existsSync(`${refusedReceipt}.execution.json`)).toBe(false)
			expect(server.requests).toEqual([])
			expect(daemon.pids).toEqual([])
		}
		const admittedControl = parseJSON(
			readFileSync(join(scratch.path, 'post-admission.json'), 'utf8'),
		)
		expect(admittedControl).toMatchObject({ status: 0, allowance: 95000 })
		const result = await executeStudyProcess(
			[
				launcher.launcher,
				'execute',
				selection,
				hashStudyBytes(readFileSync(selection)),
				hashStudyBytes(readFileSync(launcher.physical)),
				receipt,
				'200000',
			],
			scratch.path,
			160000,
			options,
		)
		scratch.write('launcher.json', JSON.stringify(result))
		scratch.write('requests.json', JSON.stringify(server.requests))
		expect(sentinel.exitCode).toBe(null)
		expect(sentinel.signalCode).toBe(null)
		expect(result.code).not.toBe(0)
		const execution = parseJSON(readFileSync(`${receipt}.execution.json`, 'utf8'))
		expect(execution).toMatchObject({
			duration: 150000,
			reserve: 5000,
			allowance: 200000,
			error: expect.stringContaining('ETIMEDOUT'),
		})
		expect(server.requests.filter((request) => request.path === '/api/chat').length).toBe(5)
		const processes = (scratch.read('processes.jsonl') ?? '').trim().split('\n').map(parseJSON)
		const adapters = (scratch.read('adapter-hosts.jsonl') ?? '').trim().split('\n').map(parseJSON)
		expect(
			adapters.some(
				(row) => isRecord(row) && Array.isArray(row.argv) && row.argv.includes('study-worker'),
			),
		).toBe(true)
		const identities = (scratch.read('agent-identity.jsonl') ?? '')
			.trim()
			.split('\n')
			.map(parseJSON)
		const worker = identities.find(
			(row) => isRecord(row) && Array.isArray(row.argv) && row.argv.includes('study-worker'),
		)
		if (!isRecord(worker) || typeof worker.path !== 'string')
			throw new Error('Missing actual worker Agent identity')
		expect(worker.namespaceEqual).toBe(true)
		expect(realpathSync(worker.path).startsWith(realpathSync(frozen))).toBe(true)
		expect(worker.sha256).toBe(hashStudyBytes(readFileSync(worker.path)))
		expect(worker.sha256).toBe(
			hashStudyBytes(
				readFileSync(join(scratch.path, 'node_modules/@orkestrel/agent/dist/src/core/index.js')),
			),
		)
		for (const row of [...processes, ...adapters, ...identities]) {
			if (!isRecord(row) || typeof row.pid !== 'number')
				throw new Error('Malformed observed process identity')
			const pid = row.pid
			expect(() => process.kill(pid, 0)).toThrow(/ESRCH/u)
		}
		for (const pid of daemon.pids) expect(() => process.kill(pid, 0)).toThrow(/ESRCH/u)
		scratch.write(
			'sentinel.json',
			JSON.stringify({
				pid: sentinel.pid,
				alive: sentinel.exitCode === null && sentinel.signalCode === null,
				daemon: daemon.pids,
			}),
		)
		const physical = parseJSON(readFileSync(launcher.physical, 'utf8'))
		if (!isRecord(physical)) throw new Error('Missing fixture physical receipt')
		scratch.write('physical-forced.json', JSON.stringify(physical))
		writeFileSync(launcher.launcher, launcher.original)
		expect(readFileSync(launcher.launcher, 'utf8')).toBe(launcher.original)
		writeFileSync(
			launcher.physical,
			JSON.stringify({ ...physical, launcher: hashStudyBytes(readFileSync(launcher.launcher)) }),
		)

		scratch.write(
			'forced-control-complete.json',
			JSON.stringify({
				original: hashStudyBytes(launcher.original),
				restored: hashStudyBytes(readFileSync(launcher.launcher)),
			}),
		)
	}, 180000)
	it('reaches the restored native target deadline with the original launcher', async () => {
		const { scratch, server, daemon, sentinel, launcher, frozen, options } = await prepared.promise
		expect(parseJSON(scratch.read('forced-control-complete.json') ?? '')).toEqual({
			original: hashStudyBytes(launcher.original),
			restored: hashStudyBytes(launcher.original),
		})
		expect(readFileSync(launcher.launcher, 'utf8')).toBe(launcher.original)
		const reached = {
			executed: true,
			observations: [
				{ goal: 'r2-ivo-seed', executed: true },
				{ goal: 'r2-ivo-target', executed: true },
			],
		}
		const nativeRequestStart = server.requests.length
		const controlSelection = scratch.write(
			'native-selection.json',
			JSON.stringify({
				closure: frozen,
				expected: readStudyClosure(frozen).fingerprint,
				output: join(scratch.path, 'native-result'),
			}),
		)
		const controlReceipt = join(scratch.path, 'native-admission.json')
		const control = await executeStudyProcess(
			[
				launcher.launcher,
				'execute',
				controlSelection,
				hashStudyBytes(readFileSync(controlSelection)),
				hashStudyBytes(readFileSync(launcher.physical)),
				controlReceipt,
				'200000',
			],
			scratch.path,
			160000,
			options,
		)
		scratch.write('native-control.json', JSON.stringify(control))
		const native = parseJSON(readFileSync(`${controlReceipt}.execution.json`, 'utf8'))
		expect(native).toMatchObject({ duration: 150000, reserve: 5000, allowance: 200000 })
		if (!isRecord(native)) throw new Error('Missing restored native receipt')
		expect(native.error).toBeUndefined()
		expect(native.status).not.toBe(0)
		expect(
			server.requests.slice(nativeRequestStart).filter((request) => request.path === '/api/chat'),
		).toHaveLength(5)
		const trialDirectory = join(scratch.path, 'native-result/execution/trials/r1-s1-a1')
		const attempt = parseJSON(readFileSync(join(trialDirectory, 'attempt.json'), 'utf8'))
		assert.partialDeepStrictEqual(attempt, reached)
		if (!isRecord(attempt) || !Array.isArray(attempt.observations))
			throw new Error('Missing native attempt observations')
		const [seed, target] = attempt.observations
		if (!isRecord(seed) || !isRecord(target) || !isRecord(target.failure))
			throw new Error('Missing reached native target failure')
		expect(seed.failure).toBeUndefined()
		expect(target.failure.cause).toMatch(/^(deadline|budget)$/u)
		expect(target.failure.message).toMatch(/deadline|duration|budget/iu)
		const nativeEvidence = readFileSync(join(trialDirectory, 'evidence.jsonl'), 'utf8')
			.trim()
			.split('\n')
			.map(parseJSON)
		const found = nativeEvidence.filter(
			(row) =>
				isRecord(row) &&
				row.event === 'lookup' &&
				row.goal === 'r2-ivo-seed' &&
				isRecord(row.value) &&
				row.value.found === true,
		)
		expect(
			found.map((row) => (isRecord(row) && isRecord(row.value) ? row.value.id : undefined)),
		).toEqual(['order:BC-7302', 'customer:BC-4102'])
		expect(sentinel.exitCode).toBe(null)
		expect(sentinel.signalCode).toBe(null)
		scratch.write(
			'launcher-restoration.json',
			JSON.stringify({
				original: hashStudyBytes(launcher.original),
				restored: hashStudyBytes(readFileSync(launcher.launcher)),
			}),
		)
		for (const row of (scratch.read('processes.jsonl') ?? '').trim().split('\n').map(parseJSON)) {
			if (!isRecord(row) || typeof row.pid !== 'number')
				throw new Error('Malformed final process identity')
			const pid = row.pid
			expect(() => process.kill(pid, 0)).toThrow(/ESRCH/u)
		}
		for (const pid of daemon.pids) expect(() => process.kill(pid, 0)).toThrow(/ESRCH/u)
	}, 180000)
})

it('parses the frozen four-case declarations and independently refuses malformed controls', async () => {
	const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
	const scratch = createScratch({
		parent: resolve('tmp/units/r2-consumer-20261025'),
		prefix: 'declarations-',
	})
	try {
		const fixture = await createMemoryScreenFixture(scratch, 'http://127.0.0.1:1')
		new StudyMemoryAdapter().validate(fixture)
		expect(
			buildStudySchedule(fixture.definition, fixture.scenarios).map((trial) => trial.id),
		).toEqual(['r1-s1-a1', 'r1-s2-a1', 'r1-s3-a1', 'r1-s4-a1'])
		expect(fixture.scenarios).toEqual(declaration.scenarios)
		expect(fixture.rubric.criteria.map((criterion) => criterion.goal)).toEqual(
			fixture.scenarios.flatMap((scenario) => scenario.goals.map((goal) => goal.id)),
		)
		expect(() =>
			parseStudyProfile({
				...fixture.profile,
				bounds: {
					...fixture.profile.bounds,
					trial: { ...fixture.profile.bounds.trial, duration: 55000 },
				},
			}),
		).toThrow(Error)
		expect(() =>
			new StudyMemoryAdapter().validate({ ...fixture, scenarios: fixture.scenarios.slice(1) }),
		).toThrow(/population/)
		expect(() =>
			new StudyMemoryAdapter().validate({
				...fixture,
				profile: { ...fixture.profile, room: { ...fixture.profile.room, output: 2048 } },
			}),
		).toThrow(/fixed policy/)
		expect(
			isStudyMemoryOptions({
				...fixture.profile.settings,
				screen: { preparation: true, targets: [], unexpected: true },
			}),
		).toBe(false)
	} finally {
		await destroyScratch(scratch)
	}
})

it('retains a real source-hook failure without duplicate close or running an arm', async () => {
	const scratch = createScratch({
		parent: resolve('tmp/units/r2-consumer-20261025'),
		prefix: 'source-failure-',
	})
	try {
		const result = await executeMemorySourceFailure(scratch)
		scratch.write('hook-result.json', JSON.stringify(result))
		expect(result.code).toBe(1)
		expect(result.stderr).toMatch(/ENOTDIR|not a directory/iu)
		expect(result.stderr).not.toMatch(/ERR_SERVER_NOT_RUNNING|Server is not running/iu)
		if (!isRecord(result.report) || !Array.isArray(result.report.testResults))
			throw new Error('Missing source-hook child report')
		const assertions = result.report.testResults.flatMap((file) =>
			isRecord(file) && Array.isArray(file.assertionResults) ? file.assertionResults : [],
		)
		const arms = assertions.filter(
			(row) =>
				isRecord(row) &&
				typeof row.fullName === 'string' &&
				row.fullName.startsWith('prepared R2 source and matched controls '),
		)
		expect(arms.map((row) => (isRecord(row) ? row.title : undefined))).toEqual(
			['off', 'repeat', 'sham', 'on'].map(
				(name) => `seals and checks the '${name}' arm against the same prepared source`,
			),
		)
		expect(arms.map((row) => (isRecord(row) ? row.status : undefined))).toEqual([
			'skipped',
			'skipped',
			'skipped',
			'skipped',
		])
	} finally {
		// Keep the failed child's report, as the serial source keeps its native receipts.
		scratch.write('hook-parent-settled.json', JSON.stringify({ at: new Date().toISOString() }))
	}
}, 30000)

describe.sequential('prepared R2 source and matched controls', () => {
	let shared: MemoryScreenGroupFixture | undefined
	let close: (() => Promise<void>) | undefined
	beforeAll(async () => {
		const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
		const server = await createMemoryServer([
			...buildMemoryScreenResponses(declaration.scenarios),
			...Array.from({ length: 16 }, () => ({
				path: '/api/chat',
				body: '{"model":"model","message":{"role":"assistant","content":"Fresh final response."},"done":true,"done_reason":"stop","prompt_eval_count":100,"eval_count":2}\n',
			})),
		])
		close = () => server.close()
		try {
			const scratch = createScratch({
				parent: resolve(process.env.ORKESTREL_R2_SOURCE_PARENT ?? 'tmp/units/r2-consumer-20261025'),
				prefix: 'grouped-',
			})
			const fixture = await createMemoryScreenFixture(scratch, server.url)
			const frozen = join(scratch.path, 'source-closure')
			const freeze = await executeMemoryScreenProcess(fixture, [
				fixture.entry,
				'freeze',
				'r2-request-screen',
				'--profile',
				fixture.profile.name,
				'--to',
				frozen,
			])
			if (freeze.code !== 0) throw new Error(JSON.stringify(freeze))
			const closure = readStudyClosure(frozen)
			const output = join(scratch.path, 'source')
			const recipe = await admitMemoryScreen(fixture, {
				closure: frozen,
				expected: closure.fingerprint,
				output,
			})
			assert.deepEqual(server.requests, [])
			const executed = await executeMemoryScreenProcess(
				fixture,
				[fixture.entry, ...recipe.arguments],
				120000,
			)
			if (executed.code !== 0) throw new Error(JSON.stringify(executed))
			const result = await readStudyResult(output)
			if (result.status !== 'sealed') throw new Error('Source did not seal')
			assert.equal(
				result.attempts.every((trial) => trial.failure === undefined),
				true,
			)
			const admission = await readStudyMemoryAdmission({
				directory: output,
				...fixture,
				identity: result.manifest.identity,
			})
			const preparation = scratch.write(
				'prepare-selection.json',
				JSON.stringify({ directory: output, closure: frozen, seal: admission.seal }),
			)
			const prepared = await executeMemoryScreenProcess(
				fixture,
				[fixture.admission, scratch.path, fixture.entry, 'prepare', preparation],
				65000,
			)
			if (prepared.code !== 0) throw new Error(JSON.stringify(prepared))
			const population = parseJSON(prepared.stdout)
			assert(isRecord(population) && Array.isArray(population.profiles))
			assert.deepEqual(population.admission, admission)
			assert.deepEqual(
				population.profiles.map((profile) => (isRecord(profile) ? profile.name : undefined)),
				['r2-off-04011', 'r2-repeat-04011', 'r2-sham-04011', 'r2-on-04011'],
			)
			assert.deepEqual(
				admission.trials.map((trial) => trial.id),
				['r1-s1-a1', 'r1-s2-a1', 'r1-s3-a1', 'r1-s4-a1'],
			)
			const evidence = await collectStudyEvidence(result)
			for (const body of [
				buildMemoryReply({ content: '' }),
				buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'order:BC-7302' } } }],
				}),
			]) {
				const control = await createMemoryScreenReplay(fixture, admission, [
					{ path: '/api/chat', body },
				])
				try {
					const [seed, target] = control.scenario.goals
					if (seed === undefined || target === undefined)
						throw new Error('Missing replay control goals')
					await control.session.execute(seed, control.context.context)
					await assert.rejects(control.session.execute(target, control.context.context), Error)
					assert.equal(
						control.server.requests.filter((request) => request.path === '/api/chat').length,
						1,
					)
					assert.equal(
						control.server.requests.some((request) => request.path === '/api/generate'),
						false,
					)
					assert.equal(
						control.context.evidence.some(
							(row) => row.event === 'result' && row.goal === target.id,
						),
						false,
					)
					assert.partialDeepStrictEqual(
						control.context.evidence.filter((row) => row.event === 'screen').at(-1)?.value,
						{
							agent: 1,
							judge: 0,
							tokens: 8192,
							historical: { agent: 4, judge: 14, tokens: 32782 },
						},
					)
				} finally {
					await control.close()
				}
			}
			for (const trial of admission.trials) {
				const history = await readStudyExchanges(result, trial.id)
				assert.equal(history.exchanges[trial.prefix - 1]?.attempt.role, 'judge')
				assert.equal(history.exchanges[trial.prefix]?.attempt.role, 'agent')
				assert.equal(
					evidence[trial.id]?.filter(
						(row) => row.event === 'lookup' && isRecord(row.value) && row.value.found === true,
					)?.length,
					2,
				)
				assert.equal(trial.draft, 'Earlier inert draft: pending action awaits evidence.')
			}
			shared = { fixture, server, frozen, output, result, admission }
		} catch (error) {
			await server.close()
			close = undefined
			throw error
		}
	}, 300000)

	afterAll(async () => {
		await close?.()
	}, 30000)

	it.each([
		{ name: 'off', work: false, sham: false },
		{ name: 'repeat', work: false, sham: false },
		{ name: 'sham', work: false, sham: true },
		{ name: 'on', work: true, sham: false },
	])(
		'seals and checks the $name arm against the same prepared source',
		async (treatment) => {
			if (shared === undefined) throw new Error('Source hook did not complete')
			const { fixture, server, frozen, output, result, admission } = shared
			const scratch = fixture.scratch
			const profile = buildStudyMemoryMatched(fixture.profile, admission, treatment)
			new StudyMemoryAdapter().validate({ ...fixture, profile })
			scratch.write(`studies/memory/profiles/${treatment.name}.json`, JSON.stringify(profile))
			const matched = join(scratch.path, treatment.name)
			const destination = join(scratch.path, `${treatment.name}-closure`)
			const frozenArm = await executeMemoryScreenProcess(fixture, [
				fixture.entry,
				'freeze',
				'r2-request-screen',
				'--profile',
				treatment.name,
				'--to',
				destination,
			])
			if (frozenArm.code !== 0) throw new Error(JSON.stringify(frozenArm))
			const admitted = {
				closure: destination,
				expected: readStudyClosure(destination).fingerprint,
				output: matched,
				source: { directory: output, closure: frozen, seal: admission.seal },
				replay: {
					result: output,
					prefix: Object.fromEntries(admission.trials.map((trial) => [trial.id, trial.prefix])),
					offline: false,
				},
			}
			const before = server.requests.length
			const refusals =
				treatment.name === 'off'
					? [
							...[-1, 1].map((offset) => ({
								...admitted,
								replay: {
									...admitted.replay,
									prefix: {
										...admitted.replay.prefix,
										'r1-s1-a1': (admitted.replay.prefix['r1-s1-a1'] ?? 0) + offset,
									},
								},
							})),
							{ ...admitted, source: { ...admitted.source, seal: '0'.repeat(64) } },
						]
					: []
			for (const refused of refusals)
				await expect(admitMemoryScreen(fixture, refused)).rejects.toThrow(/prefix/)
			const selected = await admitMemoryScreen(fixture, admitted)
			expect(server.requests).toHaveLength(before)
			const command = await executeMemoryScreenProcess(
				fixture,
				[fixture.entry, ...selected.arguments],
				120000,
			)
			if (command.code !== 0) throw new Error(JSON.stringify({ treatment, command }))
			const read = await readStudyResult(matched)
			if (read.status !== 'sealed') throw new Error('Matched did not seal')
			const retained = await collectStudyEvidence(read)
			for (const trial of admission.trials) {
				const history = await readStudyExchanges(read, trial.id)
				const original = await readStudyExchanges(result, trial.id)
				expect(
					history.exchanges.slice(0, trial.prefix).map((exchange) => exchange.attempt),
				).toEqual(original.exchanges.slice(0, trial.prefix).map((exchange) => exchange.attempt))
				const sourceBody = parseJSON(
					Buffer.from(original.exchanges[trial.prefix]?.attempt.body ?? '', 'base64').toString(),
				)
				const actualBody = parseJSON(
					Buffer.from(history.exchanges[trial.prefix]?.attempt.body ?? '', 'base64').toString(),
				)
				expect(
					retained[trial.id]?.filter((row) => row.event === 'screen').at(-1)?.value,
				).toMatchObject({ agent: 1, judge: 0, tokens: 8192 })
				const target = fixture.scenarios.find(
					(scenario) => scenario.goals[1]?.id === trial.final.goal,
				)?.goals[1]?.input
				if (!isRecord(target) || typeof target.prompt !== 'string')
					throw new Error('Missing target')
				expect(canonicalStringify(actualBody) === canonicalStringify(sourceBody)).toBe(
					!treatment.work && !treatment.sham,
				)
				expect(
					matchesStudyMemorySham(
						Buffer.from(history.exchanges[trial.prefix]?.attempt.body ?? '', 'base64').toString(),
						target.prompt,
						hashStudyBytes(
							Buffer.from(original.exchanges[trial.prefix]?.attempt.body ?? '', 'base64'),
						),
					),
				).toBe(treatment.sham)
			}
		},
		300000,
	)
})
