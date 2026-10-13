// Runs the long-scenario benchmark: node bench5/bench.ts (--run | --dry | --seed) --copy 1-8 [flags]
// Exit: 0 on success, 1 on a failed run or a settings mismatch in a dry run, 64 on usage.
import { Driver, parseFlags } from './Driver.js'
import { describeError } from './helpers.js'

const outcome = parseFlags(process.argv.slice(2))
if (outcome.success) {
	try {
		process.exitCode = await new Driver(outcome.value).execute()
	} catch (error) {
		process.stderr.write(`${describeError(error)}\n`)
		process.exitCode = 1
	}
} else {
	process.stderr.write(`${outcome.error}\n`)
	process.exitCode = 64
}
