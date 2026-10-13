import { Refit } from './refit/Refit.js'

process.exitCode = await Refit.run(process.argv.slice(2))
