import { parseJSON } from '@orkestrel/contract'
import { buildStudySchedule } from '@orkestrel/study'
import { readStudyDeclaration } from '@orkestrel/study/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStudyAdapter, isStudyDeskInput } from '../../../studies/desk/index.js'
import { buildStudyDeskProfile, collectStudyDeskAnswers } from '../../setupStudy.js'

const declaration = await readStudyDeclaration(resolve('.'), 'disclosure')

describe('the disclosure declaration', () => {
	it('declares the two arms over seven conversations of six requests, one repetition, with no qualification', () => {
		expect(declaration.definition).toMatchObject({
			purpose: 'mechanism',
			driver: 'desk',
			arms: ['area', 'index'],
			order: [['area', 'index']],
			retries: 0,
		})
		expect(declaration.scenarios.map((scenario) => scenario.id)).toEqual([
			'c1',
			'c2',
			'c3',
			'c4',
			'c5',
			'c6',
			'c7',
		])
		expect(declaration.scenarios.every((scenario) => scenario.goals.length === 6)).toBe(true)
		const schedule = buildStudySchedule(declaration.definition, declaration.scenarios)
		expect(schedule).toHaveLength(14)
		expect(
			schedule.filter((trial) => trial.scenario === 'c1').map((trial) => [trial.id, trial.arm]),
		).toEqual([
			['r1-s1-a1', 'area'],
			['r1-s1-a2', 'index'],
		])
	})

	it('names one tool in the goal area for every request, and keeps the tool out of the goal input', () => {
		expect(declaration.rubric.criteria).toHaveLength(42)
		const answers = collectStudyDeskAnswers(declaration)
		expect(answers.size).toBe(42)
		for (const scenario of declaration.scenarios)
			for (const goal of scenario.goals) {
				expect(isStudyDeskInput(goal.input)).toBe(true)
				expect(
					declaration.rubric.criteria.filter(
						(criterion) => criterion.scenario === scenario.id && criterion.goal === goal.id,
					),
				).toHaveLength(1)
			}
		expect(
			[...answers.values()].filter((answer) => answer.tool === 'note' || answer.tool === 'status'),
		).toHaveLength(7)
	})

	it('validates through the adapter, and refuses another purpose, an undeclared arm, or a tool outside its area', () => {
		const adapter = createStudyAdapter()
		const profile = buildStudyDeskProfile('http://127.0.0.1:9')
		const input = { ...declaration, profile }
		adapter.validate(input)
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...declaration.definition, purpose: 'quality' },
			}),
		).toThrow(/mechanism/)
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...declaration.definition, arms: ['area', 'records'] },
			}),
		).toThrow(/arms/)
		const [first, ...rest] = declaration.rubric.criteria
		if (first === undefined) throw new Error('Missing criterion')
		expect(() =>
			adapter.validate({
				...input,
				rubric: {
					...declaration.rubric,
					criteria: [{ ...first, assertion: { tool: 'payment_status', area: 'billing' } }, ...rest],
				},
			}),
		).toThrow(/assertion/)
	})

	it('pins the screen profile to the 4B alone on the available Ollama, with recording declared', () => {
		const raw = parseJSON(readFileSync('studies/desk/profiles/screen.json', 'utf8'))
		expect(raw).toMatchObject({
			name: 'screen',
			agent: 'dist/src/core/index.js',
			provider: {
				url: 'http://127.0.0.1:11434',
				model: 'qwen3.5:4b-q4_K_M',
				digest: {
					model: 'd8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04',
				},
			},
			settings: { metadata: { calls: 64, bytes: 67108864, duration: 600000 } },
			record: { duration: 480000, calls: 256 },
		})
		expect(raw).not.toHaveProperty('provider.daemon')
		expect(raw).not.toHaveProperty('settings.version')
		expect(raw).not.toHaveProperty('provider.judge')
		expect(raw).not.toHaveProperty('provider.digest.judge')
	})
})
