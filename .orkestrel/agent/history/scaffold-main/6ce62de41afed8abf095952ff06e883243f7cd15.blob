import { Driver } from './Driver.ts'
import { describeError } from './helpers.ts'

await new Driver().execute().catch((error) => {
	console.error(describeError(error))
	process.exitCode = 1
})
