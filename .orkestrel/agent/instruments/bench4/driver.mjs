import { Driver } from './Driver.mjs'
import { describeError } from './helpers.mjs'

await new Driver().execute().catch((error) => {
	console.error(describeError(error))
	process.exitCode = 1
})
