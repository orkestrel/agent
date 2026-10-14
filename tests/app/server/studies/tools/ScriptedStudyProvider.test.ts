import type { Message } from '@orkestrel/agent'
import type { StudyEvidence } from '../../../../../app/core/studies/types.js'
import { createRecorder } from '@orkestrel/test'
import { expect, it } from 'vitest'
import { ScriptedStudyProvider } from '../../../../../app/server/studies/tools/ScriptedStudyProvider.js'
import { parseStudyToolsInput } from '../../../../../app/server/studies/tools/parsers.js'
import { createStudyMeterFixture } from '../../../../setupStudy.js'

it('serves an actual mechanism provider boundary with metered bytes and accountable unknown token usage', async () => {
	const limit = { duration: 1000, calls: 4, tokens: 100, bytes: 1000 }
	const meter = createStudyMeterFixture({
		request: { ...limit, calls: 1 },
		goal: limit,
		trial: limit,
		series: limit,
	})
	try {
		const rows = createRecorder<readonly [StudyEvidence]>()
		const provider = new ScriptedStudyProvider()
		const workload = new AbortController()
		const input = parseStudyToolsInput({
			prompt: 'Continue',
			admitted: true,
			files: [],
			responses: [{ content: '', calls: [], consume: 'actual-call', bytes: 1000 }],
		})
		provider.prepare({
			input,
			goal: 'continue',
			workload,
			context: {
				signal: meter.control.signal,
				meter: meter.meter,
				evidence: {
					append: async (row) => {
						rows.handler(row)
					},
				},
			},
		})
		const messages: readonly Message[] = [
			{ id: 'm1', role: 'tool', content: 'actual-result', call: 'actual-call' },
		]
		expect(await provider.generate(messages, meter.control.signal)).toEqual({
			content: 'actual-result',
		})
		expect(rows.calls[0]?.[0].event).toBe('provider')
		expect(meter.meter.usage[0]).toMatchObject({ role: 'agent', calls: 1, tokens: undefined })
		expect(meter.meter.usage[0]?.bytes).toBeGreaterThan(0)
		expect(workload.signal.aborted).toBe(false)
		await expect(provider.generate(messages, meter.control.signal)).rejects.toThrow('exhausted')
	} finally {
		meter.close()
	}
})
