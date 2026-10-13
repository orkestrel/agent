// Usage: node bench5/matrix.ts freeze|resource|full|pilot|plan --out PATH [phase arguments]. Exit 3 means infeasible; 1 means invalid invocation or custody.
import { Matrix } from './matrix/Matrix.js'

process.exitCode = await Matrix.execute(process.argv.slice(2))
