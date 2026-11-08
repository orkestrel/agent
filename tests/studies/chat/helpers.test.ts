import { readFileSync } from 'node:fs'
import { parseStudyDefinition, parseStudyRubric, parseStudyScenario } from '@orkestrel/study'
import { parseJSON } from '@orkestrel/contract'
import { isStudyChatSeal } from '../../../studies/chat/validators.js'
import { describe, expect, it } from 'vitest'
import {
	buildStudyChatConversion,
	matchesStudyChatAnswer,
	validateStudyChatConversion,
} from '../../../studies/chat/helpers.js'

describe('sealed chat conversion', () => {
	it('pins the source bytes, membership, order, prompts and primary denominator', () => {
		const source = readFileSync('studies/chat/sources/sealed.json', 'utf8')
		const converted = buildStudyChatConversion(source)
		expect(converted.scenarios).toHaveLength(38)
		expect(converted.scenarios.flatMap((scenario) => scenario.goals)).toHaveLength(294)
		expect(converted.scenarios.every((scenario) => scenario.goals.length <= 16)).toBe(true)
		expect(
			parseStudyDefinition(parseJSON(readFileSync('studies/chat/study.json', 'utf8'))).scenarios,
		).toEqual(converted.scenarios.map((scenario) => scenario.id))
		expect(
			converted.rubric.criteria.filter((criterion) => criterion.id.endsWith('primary')),
		).toHaveLength(102)
		expect(() => buildStudyChatConversion(`${source} `)).toThrow(/seal/i)
		validateStudyChatConversion(source, converted)
		validateStudyChatConversion(source, {
			scenarios: converted.scenarios.map((scenario) =>
				parseStudyScenario(
					parseJSON(readFileSync(`studies/chat/scenarios/${scenario.id}.json`, 'utf8')),
				),
			),
			rubric: parseStudyRubric(parseJSON(readFileSync('studies/chat/rubric.json', 'utf8'))),
		})
		expect(() =>
			validateStudyChatConversion(source, {
				...converted,
				scenarios: converted.scenarios.slice(1),
			}),
		).toThrow(/conversion/i)
		expect(() =>
			validateStudyChatConversion(source, {
				...converted,
				scenarios: [...converted.scenarios, ...converted.scenarios.slice(0, 1)],
			}),
		).toThrow(/conversion/i)
		const first = converted.scenarios[0]
		if (first === undefined) throw new Error('Missing first sealed conversation')
		expect(() =>
			validateStudyChatConversion(source, {
				...converted,
				scenarios: [
					{ ...first, goals: [...first.goals].reverse() },
					...converted.scenarios.slice(1),
				],
			}),
		).toThrow(/conversion/i)
		expect(() =>
			validateStudyChatConversion(source, {
				...converted,
				scenarios: [
					{
						...first,
						goals: first.goals.map((goal) => ({
							...goal,
							input: { prompt: 'moderate', accept: ['moderate'] },
						})),
					},
					...converted.scenarios.slice(1),
				],
			}),
		).toThrow(/conversion/i)
	})
})

it('preserves boundary matching and shortening without treating denials as primary failures', () => {
	expect(matchesStudyChatAnswer('', ['16'])).toBe(false)
	expect(matchesStudyChatAnswer('No information.', ['16'])).toBe(false)
	expect(matchesStudyChatAnswer('116', ['16'])).toBe(false)
	expect(matchesStudyChatAnswer('It was 16.', ['16'])).toBe(true)
	expect(matchesStudyChatAnswer('CENTRE', ['centre', 'center'])).toBe(true)
	expect(matchesStudyChatAnswer('I cannot confirm Cambridge.', ['cambridge'])).toBe(true)
	expect(matchesStudyChatAnswer('Old Norwich, replacement Cambridge.', ['cambridge'])).toBe(true)
	expect(matchesStudyChatAnswer('Norwich.', ['cambridge'])).toBe(false)
	expect(matchesStudyChatAnswer('Cambridge', ['cambridge'], 'Cambridge')).toBe(false)
	expect(matchesStudyChatAnswer('Cambridge', ['cambridge'], 'The place is Cambridge.')).toBe(true)
})

it('passes every sealed gold spelling and refuses the battery empty, unrelated, question and older-only controls', () => {
	const seal = parseJSON(readFileSync('studies/chat/sources/sealed.json', 'utf8'))
	if (!isStudyChatSeal(seal)) throw new Error('Missing seal')
	for (const probe of [...seal.picked, ...seal.changed].flatMap((dialogue) => dialogue.probes)) {
		expect(matchesStudyChatAnswer('', probe.accept)).toBe(false)
		expect(matchesStudyChatAnswer("I don't have that information.", probe.accept)).toBe(false)
		expect(matchesStudyChatAnswer(`It was ${probe.gold}.`, probe.accept)).toBe(true)
		expect(matchesStudyChatAnswer(probe.question, probe.accept)).toBe(false)
		for (const older of probe.refuse)
			expect(matchesStudyChatAnswer(`It was ${older}.`, probe.accept)).toBe(false)
	}
	for (const step of seal.scripted
		.flatMap((script) => script.steps)
		.filter((entry) => entry.accept.length > 0)) {
		expect(matchesStudyChatAnswer('', step.accept)).toBe(false)
		for (const gold of step.accept)
			expect(matchesStudyChatAnswer(`It was ${gold}.`, step.accept)).toBe(true)
		expect(matchesStudyChatAnswer(step.request, step.accept)).toBe(false)
	}
})
