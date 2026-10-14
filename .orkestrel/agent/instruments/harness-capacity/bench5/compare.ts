// Usage: node bench5/compare.ts blind|report --base DIR --plan FILE --out FILE [audit arguments]. Exit 1 refuses malformed custody.
import { Comparison } from './matrix/Comparison.js'

process.exitCode = Comparison.execute(process.argv.slice(2))
