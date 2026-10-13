// Usage: node tmp/units/aggregate-successor-daemon-materialize.ts; writes a create-only deployment bound to loopback port 11435; exits 0 on success.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function main(): void {
	const root = resolve(import.meta.dirname, '../..')
	const historicalPath = resolve(root, 'tmp/units/aggregate-final-daemon-deployment.json')
	const receiptPath = resolve(root, 'tmp/units/aggregate-successor-daemon-start.json')
	const outputPath = resolve(root, 'tmp/units/aggregate-successor-daemon-deployment.json')
	const historical: unknown = JSON.parse(readFileSync(historicalPath, 'utf8'))
	const receiptBytes = readFileSync(receiptPath)
	const receipt: unknown = JSON.parse(receiptBytes.toString('utf8'))
	if (!isRecord(historical) || !isRecord(historical.receipt) ||
		typeof historical.receipt.path !== 'string' || typeof historical.receipt.hash !== 'string' ||
		!isRecord(historical.executable) || typeof historical.executable.path !== 'string' ||
		!isRecord(historical.environment) || !isRecord(receipt) ||
		typeof receipt.pid !== 'number' || !Number.isSafeInteger(receipt.pid) || receipt.pid <= 0 ||
		receipt.executable !== historical.executable.path || !Array.isArray(receipt.args) ||
		receipt.args.length !== 1 || receipt.args[0] !== 'serve' ||
		!isRecord(receipt.values) || typeof receipt.cwd !== 'string' || typeof receipt.started !== 'string')
		throw new Error('new daemon receipt or historical deployment has an incompatible shape')
	if (historical.environment.OLLAMA_HOST !== 'http://127.0.0.1:11434')
		throw new Error('historical deployment endpoint differs from the accepted service')
	const environment: Readonly<Record<string, unknown>> = { ...historical.environment, OLLAMA_HOST: 'http://127.0.0.1:11435' }
	const environmentKeys = Object.keys(environment)
	const receiptKeys = Object.keys(receipt.values)
	if (environmentKeys.length !== receiptKeys.length ||
		environmentKeys.some((key) => environment[key] !== receipt.values[key]))
		throw new Error('successor daemon environment differs from the declared port-only change')
	const receiptReference = relative(root, receiptPath).split(sep).join('/')
	const receiptHash = createHash('sha256').update(receiptBytes).digest('hex')
	const deployment = {
		...historical,
		environment,
		receipt: {
			...historical.receipt,
			path: receiptReference,
			hash: receiptHash,
		},
	}
	writeFileSync(outputPath, `${JSON.stringify(deployment, null, 4)}\n`, { flag: 'wx' })
	console.log(outputPath)
}

main()
