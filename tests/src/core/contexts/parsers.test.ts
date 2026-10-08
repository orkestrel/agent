import { buildConditionKey, parseConditionKey } from '@src/core'
import { describe, expect, it } from 'vitest'

describe('parseConditionKey', () => {
	it('reads back a needed key with separator-bearing ids', () => {
		expect(parseConditionKey('["needed","standing","request"]')).toEqual([
			'needed',
			'standing',
			'request',
		])
		expect(parseConditionKey(buildConditionKey('needed', '["needed",', '"\\\n]'))).toEqual([
			'needed',
			'["needed",',
			'"\\\n]',
		])
	})

	it('returns undefined for an id that is not a needed key', () => {
		expect(parseConditionKey('other-condition')).toBeUndefined()
		expect(parseConditionKey('')).toBeUndefined()
		expect(parseConditionKey('["needed","standing"]')).toBeUndefined()
		expect(parseConditionKey('["needed","standing","request","extra"]')).toBeUndefined()
		expect(parseConditionKey('["wanted","standing","request"]')).toBeUndefined()
		expect(parseConditionKey('["needed","standing",7]')).toBeUndefined()
		expect(parseConditionKey('["needed",null,"request"]')).toBeUndefined()
		expect(parseConditionKey('{"0":"needed","1":"standing","2":"request"}')).toBeUndefined()
	})
})
