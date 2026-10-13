import { Verifier } from './Verifier.ts'

if (process.argv.length === 2) new Verifier().execute()
else if (process.argv.length === 4 && process.argv[2] === '--output' && process.argv[3] !== undefined) new Verifier().execute(process.argv[3])
else throw new Error('Use verify.ts [--output VACANT_VERIFIER_DIRECTORY]')
