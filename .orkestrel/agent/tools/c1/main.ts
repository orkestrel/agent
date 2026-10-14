import { Driver } from './Driver.ts'
import { parseOptions } from './parsers.ts'

try { await new Driver(parseOptions(process.argv.slice(2))).execute() } catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 3
}
