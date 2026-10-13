import { Operator } from './Operator.ts'

if (process.argv.includes('--execute')) {
	if (process.argv.length !== 11 || process.argv[2] !== '--execute' || process.argv[3] !== '--packet' || process.argv[5] !== '--build' || process.argv[7] !== '--operator' || process.argv[9] !== '--output' || process.argv[4] === undefined || process.argv[6] === undefined || process.argv[8] === undefined || process.argv[10] === undefined) throw new Error('Use --execute --packet HASH --build HASH --operator HASH --output DIRECTORY')
	await new Operator().execute({ packet: process.argv[4], build: process.argv[6], operator: process.argv[8], output: process.argv[10] })
} else {
	if (process.argv.length !== 2) throw new Error('Default invocation is offline; only explicit execution arguments are accepted')
	console.log('Offline default: no model or network request. Run prepare.ts to create the frozen preparation.')
}
