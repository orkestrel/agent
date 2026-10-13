import { Operator } from './Operator.ts'

if (process.argv.length === 2) new Operator().prepare()
else if (process.argv.length === 4 && process.argv[2] === '--output' && process.argv[3] !== undefined) new Operator().prepare(process.argv[3])
else throw new Error('Use prepare.ts [--output VACANT_OWNED_DIRECTORY]')
