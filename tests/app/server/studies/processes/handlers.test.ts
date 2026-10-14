import { expect, it } from 'vitest'
import { awaitStudyProcess } from '../../../../../app/server/studies/processes/handlers.js'

it('bounds real asynchronous lifecycle work and retains successful results', async () => {
	expect(await awaitStudyProcess(Promise.resolve(3), 100)).toBe(3)
	await expect(awaitStudyProcess(new Promise(() => undefined), 10)).rejects.toMatchObject({
		failure: { cause: 'deadline' },
	})
})
