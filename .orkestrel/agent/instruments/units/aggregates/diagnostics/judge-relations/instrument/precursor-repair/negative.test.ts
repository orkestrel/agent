import { strictEqual } from 'node:assert'
import { test } from 'node:test'
import { computeReplay } from './helpers.ts'

test('arithmetic direction negative control is collected and must fail', () => {
	const vector = { logprobs: [{ top_logprobs: [{ token: 'Yes', logprob: -0.2 }, { token: 'No', logprob: -2.2 }] }] }
	strictEqual(computeReplay(vector, 1), 1 / (1 + Math.exp(2)))
})
