import { getEventListeners } from 'node:events'
import { waitForAbort } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { StudyControl } from '../../../../../app/core/studies/engines/index.js'
import { createStudyMeterFixture } from '../../../../setupStudy.js'

describe('study cancellation listener lifecycle', () => {
	it('removes request listeners and retains timeout attribution after timer disposal', async () => {
		const fixture = createStudyMeterFixture({
			request: { duration: 10, calls: 1, tokens: 10, bytes: 10 },
		})
		const request = fixture.meter.admit({ role: 'agent', tokens: 1, bytes: 1 })
		await waitForAbort(request.signal)
		fixture.close()
		expect(getEventListeners(request.signal, 'abort')).toHaveLength(0)
		expect(getEventListeners(fixture.control.signal, 'abort')).toHaveLength(0)
		expect(fixture.control.failure?.cause).toBe('deadline')
	})

	it('removes completed wait listeners while keeping only its lifecycle listener until closure', async () => {
		const control = new StudyControl()
		const baseline = getEventListeners(control.signal, 'abort').length
		await expect(control.wait(Promise.resolve('finished'))).resolves.toBe('finished')
		expect(getEventListeners(control.signal, 'abort')).toHaveLength(baseline)
		await expect(control.wait(Promise.reject(new Error('Rejected work')))).rejects.toThrow(
			'Rejected work',
		)
		expect(getEventListeners(control.signal, 'abort')).toHaveLength(baseline)
		control.close()
		expect(getEventListeners(control.signal, 'abort')).toHaveLength(0)
	})
})
