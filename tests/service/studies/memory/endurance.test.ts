import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { buildStudySchedule, parseStudyProfile, validateStudyInputs } from '@orkestrel/study'
import { createStudyAdapter, isStudyMemoryInput } from '../../../../studies/memory/index.js'
import { buildMemoryProfile, loadMemoryInputs } from '../../../setupService.js'

describe('prospective public endurance declarations', () => {
	it('preserves the complete pinned public goal and source population at their original boundaries', async () => {
		// This public archive is retained by root as an explicit durable test dependency.
		const path = '.orkestrel/agent/instruments/units/aggregates/endurance/runtime/evaluation.json'
		expect((await stat(path)).size).toBe(149851)
		const bytes = await readFile(path)
		expect(createHash('sha256').update(bytes).digest('hex')).toBe(
			'e8b4143efbbc9251166852c2d993f6b1f0b3f44eaa181f0973c27878109a47f5',
		)
		const source = parseJSON(bytes.toString('utf8'))
		const provenance = parseJSON(await readFile('studies/endurance/provenance.json', 'utf8'))
		if (
			!isRecord(source) ||
			!Array.isArray(source.goals) ||
			!Array.isArray(source.seed) ||
			!Array.isArray(source.days) ||
			!Array.isArray(source.lookups) ||
			typeof source.system !== 'string' ||
			!isRecord(provenance) ||
			!Array.isArray(provenance.substitutions)
		)
			throw new Error('Malformed public fixture')
		for (const change of provenance.substitutions) {
			if (
				!isRecord(change) ||
				typeof change.before !== 'string' ||
				typeof change.after !== 'string'
			)
				throw new Error('Invalid recorded tool substitution')
			expect(
				change.after
					.replaceAll('lookup with an id of order:<order id>', 'lookup_order with an id')
					.replaceAll(
						'lookup with an id of customer:<account id>',
						'lookup_customer with an account',
					)
					.replaceAll('lookup (id order:<order id>)', 'lookup_order')
					.replaceAll('lookup (id customer:<account id>)', 'lookup_customer'),
			).toBe(change.before)
		}
		const input = await loadMemoryInputs(
			buildMemoryProfile({ url: 'http://127.0.0.1:1' }),
			'qualification',
		)
		const goals = input.scenarios[0]?.goals
		if (goals === undefined) throw new Error('Missing prospective workload')
		expect(goals.map((goal) => goal.id)).toEqual(
			source.goals.map((goal) => {
				if (!isRecord(goal)) throw new Error('Invalid original goal')
				return goal.id
			}),
		)
		expect(goals).toHaveLength(96)
		for (const [index, goal] of goals.entries()) {
			const original = source.goals[index]
			if (
				!isRecord(original) ||
				typeof original.after !== 'number' ||
				typeof original.request !== 'string' ||
				!isStudyMemoryInput(goal.input)
			)
				throw new Error('Invalid goal boundary')
			const change = provenance.substitutions.find(
				(item) => isRecord(item) && item.field === `goals[${index}].request`,
			)
			if (change !== undefined && !isRecord(change)) throw new Error('Invalid prompt substitution')
			expect(isRecord(change) ? change.before : original.request).toBe(original.request)
			expect(goal.input.prompt).toBe(isRecord(change) ? change.after : original.request)
		}
		const arrivals = goals.flatMap((goal, position) => {
			if (!isStudyMemoryInput(goal.input)) throw new Error('Invalid public input')
			return goal.input.arrivals.map((arrival) => ({ ...arrival, position }))
		})
		expect(arrivals).toHaveLength(128)
		expect(new Set(arrivals.map((arrival) => arrival.id)).size).toBe(128)
		for (const [index, message] of source.seed.entries()) {
			if (
				!isRecord(message) ||
				typeof message.id !== 'string' ||
				typeof message.content !== 'string'
			)
				throw new Error('Invalid original source')
			const matches = arrivals.filter((arrival) => arrival.id === message.id)
			expect(matches).toHaveLength(1)
			const arrival = matches[0]
			if (arrival === undefined) throw new Error(`Missing ${message.id}`)
			const boundary = source.goals[arrival.position]
			const previous = source.goals[arrival.position - 1]
			if (!isRecord(boundary) || typeof boundary.after !== 'number')
				throw new Error('Invalid source boundary')
			expect(boundary.after).toBeGreaterThanOrEqual(index)
			if (previous !== undefined && (!isRecord(previous) || typeof previous.after !== 'number'))
				throw new Error('Invalid previous boundary')
			expect(isRecord(previous) ? previous.after : -1).toBeLessThan(index)
			const change = provenance.substitutions.find(
				(item) => isRecord(item) && item.field === `seed[${index}].content`,
			)
			if (change !== undefined && !isRecord(change)) throw new Error('Invalid source substitution')
			expect(isRecord(change) ? change.before : message.content).toBe(message.content)
			expect(arrival.content).toBe(isRecord(change) ? change.after : message.content)
		}
		for (const day of source.days) {
			if (!isRecord(day) || typeof day.date !== 'string' || typeof day.from !== 'number')
				throw new Error('Invalid workday')
			const arrival = arrivals.find((entry) => entry.id === `endurance-day:${day.date}`)
			if (arrival === undefined) throw new Error('Missing workday marker')
			expect(arrival.content).toBe(`Current workday: ${day.date}.`)
			const boundary = source.goals[arrival.position]
			const previous = source.goals[arrival.position - 1]
			if (!isRecord(boundary) || typeof boundary.after !== 'number')
				throw new Error('Invalid workday boundary')
			expect(boundary.after).toBeGreaterThanOrEqual(day.from)
			if (previous !== undefined && (!isRecord(previous) || typeof previous.after !== 'number'))
				throw new Error('Invalid preceding workday boundary')
			expect(isRecord(previous) ? previous.after : -1).toBeLessThan(day.from)
		}
		expect(arrivals[0]).toMatchObject({ id: 'endurance-desk', position: 0 })
		expect(arrivals[0]?.content).toContain(
			'lookup with an id of order:<order id> and lookup with an id of customer:<account id>',
		)
		expect(provenance.source).toMatchObject({
			path,
			size: 149851,
			sha256: 'e8b4143efbbc9251166852c2d993f6b1f0b3f44eaa181f0973c27878109a47f5',
		})
	})

	it('exposes every public lookup update exactly once at its first eligible goal and refuses future snapshots', async () => {
		const source = parseJSON(
			await readFile(
				'.orkestrel/agent/instruments/units/aggregates/endurance/runtime/evaluation.json',
				'utf8',
			),
		)
		if (!isRecord(source) || !Array.isArray(source.lookups) || !Array.isArray(source.goals))
			throw new Error('Invalid lookup archive')
		const fixture = await loadMemoryInputs(
			buildMemoryProfile({ url: 'http://127.0.0.1:1' }),
			'qualification',
		)
		const goals = fixture.scenarios[0]?.goals
		if (goals === undefined) throw new Error('Missing projected goals')
		const releases = goals.flatMap((goal, position) => {
			if (!isStudyMemoryInput(goal.input)) throw new Error('Invalid release input')
			return goal.input.records.map((record) => ({ ...record, position }))
		})
		expect(releases).toHaveLength(39)
		for (const original of source.lookups) {
			if (
				!isRecord(original) ||
				typeof original.id !== 'string' ||
				typeof original.text !== 'string' ||
				typeof original.from !== 'number' ||
				(original.tool !== 'lookup_order' && original.tool !== 'lookup_customer')
			)
				throw new Error('Invalid original lookup')
			const id = `${original.tool === 'lookup_order' ? 'order' : 'customer'}:${original.id}`
			const matches = releases.filter(
				(record) => record.id === id && record.content === original.text,
			)
			expect(matches).toHaveLength(1)
			const release = matches[0]
			if (release === undefined) throw new Error(`Dropped update ${id} at ${original.from}`)
			const earliest = source.lookups.find(
				(item) =>
					isRecord(item) &&
					item.tool === original.tool &&
					item.id === original.id &&
					item.text === original.text,
			)
			if (!isRecord(earliest) || typeof earliest.from !== 'number')
				throw new Error('Invalid original release')
			const boundary = source.goals[release.position]
			const previous = source.goals[release.position - 1]
			if (!isRecord(boundary) || typeof boundary.after !== 'number')
				throw new Error('Invalid lookup boundary')
			expect(boundary.after).toBeGreaterThanOrEqual(earliest.from)
			if (previous !== undefined && (!isRecord(previous) || typeof previous.after !== 'number'))
				throw new Error('Invalid prior lookup boundary')
			expect(isRecord(previous) ? previous.after : -1).toBeLessThan(earliest.from)
		}
		for (const release of releases)
			expect(
				source.lookups.some(
					(item) =>
						isRecord(item) &&
						`${item.tool === 'lookup_order' ? 'order' : 'customer'}:${item.id}` === release.id &&
						item.text === release.content,
				),
			).toBe(true)
	})

	it('pins independently chosen early, dormant-return, cross-case and closing boundaries', async () => {
		const fixture = await loadMemoryInputs(
			buildMemoryProfile({ url: 'http://127.0.0.1:1' }),
			'qualification',
		)
		const goals = fixture.scenarios[0]?.goals
		if (goals === undefined) throw new Error('Missing endurance goals')
		for (const [id, arrivals, records] of [
			[
				'ev-01-1',
				[
					'endurance-desk',
					'ev-opening',
					'ev-register',
					'endurance-day:2031-02-02',
					'ev-source-1-1',
					'ev-source-1-2',
					'ev-source-1-3',
					'ev-source-1-4',
				],
				['order:BC-7301', 'customer:BC-4101'],
			],
			['ev-01-2', [], []],
			[
				'ev-09-1',
				[
					'endurance-day:2031-02-10',
					'ev-source-9-1',
					'ev-source-9-2',
					'ev-source-9-3',
					'ev-source-9-4',
					'ev-side-9',
				],
				['order:BC-7309', 'customer:BC-4109', 'customer:BC-4105'],
			],
			[
				'ev-13-1',
				[
					'endurance-day:2031-02-14',
					'ev-source-13-1',
					'ev-source-13-2',
					'ev-source-13-3',
					'ev-source-13-4',
				],
				['order:BC-7301', 'customer:BC-4101'],
			],
			[
				'ev-24-1',
				[
					'endurance-day:2031-02-25',
					'ev-source-24-1',
					'ev-source-24-2',
					'ev-source-24-3',
					'ev-source-24-4',
				],
				['order:BC-7312'],
			],
			['ev-24-4', [], []],
		] as const) {
			const goal = goals.find((entry) => entry.id === id)
			if (goal === undefined || !isStudyMemoryInput(goal.input))
				throw new Error(`Missing chosen boundary ${id}`)
			expect(goal.input.arrivals.map((arrival) => arrival.id)).toEqual(arrivals)
			expect(goal.input.records.map((record) => record.id).toSorted()).toEqual(
				[...records].toSorted(),
			)
		}
		const opening = goals.find((goal) => goal.id === 'ev-01-1')
		const returned = goals.find((goal) => goal.id === 'ev-13-1')
		const closing = goals.find((goal) => goal.id === 'ev-24-1')
		if (
			opening === undefined ||
			returned === undefined ||
			closing === undefined ||
			!isStudyMemoryInput(opening.input) ||
			!isStudyMemoryInput(returned.input) ||
			!isStudyMemoryInput(closing.input)
		)
			throw new Error('Missing chosen public facts')
		expect(opening.input.records[0]?.content).toContain('paid $265.86; no refund posted')
		expect(returned.input.records[0]?.content).toContain('paid $260.35; 12% merchandise discount')
		expect(returned.input.records[1]?.content).toContain(
			'mara.ellison@repairguild.example; mara@alderbrook.example is retired',
		)
		expect(closing.input.records[0]?.content).toContain(
			'submission WR-6212 accepted GD-7312 for $1, 200.00; $80.00 freight excluded; grant cash payment unconfirmed',
		)
	})

	it('admits identical schedules and the pinned finite q4 profile while keeping semantics independently unknown', async () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:1' })
		const capacity = await loadMemoryInputs(profile, 'qualification')
		const quality = await loadMemoryInputs(profile, 'endurance')
		const q4 = parseStudyProfile(
			parseJSON(await readFile('studies/memory/profiles/q4.json', 'utf8')),
		)
		expect(q4).toMatchObject({
			name: 'q4',
			subject: 'dist/src/core/index.js',
			qualification: 'tmp/studies/endurance-capacity',
			provider: {
				entry: 'node_modules/@orkestrel/ollama/dist/src/core/index.js',
				url: 'http://127.0.0.1:11435',
				model: 'qwen3.5:4b-q4_K_M',
				judge: 'hf.co/sky7350/Mica-v0.1-4B:Q4_K_M',
				digest: {
					model: 'd8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04',
					judge: 'ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b',
				},
			},
			room: { context: 20480, output: 8192, safety: 512, recap: 2048, think: false },
			bounds: {
				request: { duration: 360000, calls: 1, tokens: 19968, bytes: 1048576 },
				goal: { duration: 900000, calls: 128, tokens: 2555904, bytes: 134217728 },
				trial: { duration: 14400000, calls: 4096, tokens: 8000000, bytes: 1073741824 },
				series: { duration: 21600000, calls: 8192, tokens: 16000000, bytes: 2147483648 },
			},
		})
		for (const input of [capacity, quality]) {
			expect(() =>
				validateStudyInputs(input.definition, input.scenarios, input.rubric, input.profile),
			).not.toThrow()
			expect(() => createStudyAdapter().validate(input)).not.toThrow()
			expect(input.definition).toMatchObject({
				driver: 'memory',
				arms: ['records', 'compaction'],
				order: [['records', 'compaction']],
				retries: 0,
			})
			expect([...new Set(input.rubric.criteria.map((criterion) => criterion.goal))]).toEqual(
				input.scenarios[0]?.goals.map((goal) => goal.id),
			)
		}
		expect(capacity.definition.purpose).toBe('capacity')
		expect(quality.definition.purpose).toBe('quality')
		expect(capacity.scenarios).toEqual(quality.scenarios)
		expect(
			capacity.rubric.criteria.every(
				(criterion) =>
					criterion.method === 'state' &&
					isRecord(criterion.assertion) &&
					criterion.assertion.observation === 'operational',
			),
		).toBe(true)
		expect(
			quality.rubric.criteria.every(
				(criterion) =>
					criterion.method === 'semantic' &&
					criterion.critical === criterion.id.endsWith('-completion'),
			),
		).toBe(true)
		const schedule = buildStudySchedule(quality.definition, quality.scenarios)
		const judgments = createStudyAdapter().grade({
			manifest: {
				version: 1,
				id: 'fixture',
				created: '2026-10-14',
				definition: quality.definition,
				scenarios: quality.scenarios,
				schedule,
				bounds: profile.bounds,
				qualification: undefined,
				host: {},
				identity: {
					subject: 'subject',
					provider: 'provider',
					instrument: 'instrument',
					fixtures: 'fixtures',
					profile: 'profile',
				},
			},
			rubric: quality.rubric,
			attempts: schedule.map((trial) => ({
				trial,
				duration: 1,
				failure: undefined,
				observations: quality.scenarios.flatMap((scenario) =>
					scenario.goals.map((goal) => ({
						goal: goal.id,
						product: { value: 'Declared completion cannot award meaning', partial: false },
						failure: undefined,
						usage: [],
						duration: 1,
					})),
				),
			})),
			evidence: {},
		})
		expect(quality.rubric.criteria).toHaveLength(384)
		expect(quality.rubric.criteria.filter((criterion) => criterion.critical)).toHaveLength(96)
		for (const goal of quality.scenarios[0]?.goals ?? [])
			expect(
				quality.rubric.criteria
					.filter((criterion) => criterion.goal === goal.id)
					.map((criterion) => criterion.id),
			).toEqual(
				['facts', 'work', 'obligations', 'completion'].map((suffix) => `${goal.id}-${suffix}`),
			)
		expect(judgments).toHaveLength(768)
		expect(
			judgments.every(
				(judgment) =>
					judgment.verdict === 'unknown' &&
					judgment.method === 'human' &&
					judgment.references.length === 0,
			),
		).toBe(true)
	})
})
