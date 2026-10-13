import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { BUILD_HASH, OPERATOR_FILES, PACKET, ROOT, UNIT } from './constants.ts'
import { computeHash, computeOperator, readBinding, writeArtifact } from './helpers.ts'

/** Collects complete offline commands and their expected exit codes. */
export class Verifier {
	/** Runs the bounded offline proof suite and records every output without truncation. */
	run(): void {
		const output = resolve(UNIT, `proof-${Date.now()}`)
		mkdirSync(output)
		const files = readdirSync(UNIT).filter(name => name.endsWith('.ts') && name !== 'inspect.ts')
		const commands: { readonly name: string; readonly args: readonly string[]; readonly expected: number }[] = [
			{ name: 'default', args: [resolve(UNIT, 'offline.ts')], expected: 0 },
			{ name: 'preparation-occupied', args: [resolve(UNIT, 'prepare-offline.ts')], expected: 1 },
			{ name: 'collected-proof', args: ['--test', resolve(UNIT, 'proof.test.ts')], expected: 0 },
			{ name: 'direction-negative', args: ['--test', resolve(UNIT, 'negative.test.ts')], expected: 1 },
			{ name: 'types', args: [resolve(ROOT, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--noEmit', '--allowImportingTsExtensions', '--module', 'nodenext', '--target', 'esnext', '--strict', '--types', 'node', '--skipLibCheck', ...files.map(file => resolve(UNIT, file))], expected: 0 },
			...files.map(name => ({ name: `syntax-${name}`, args: ['--check', resolve(UNIT, name)], expected: 0 })),
		]
		const results: unknown[] = []
		for (const command of commands) {
			const started = performance.now()
			const child = spawnSync(process.execPath, [...command.args], { cwd: ROOT, encoding: 'utf8' })
			const result = { command: [process.execPath, ...command.args], name: command.name, expected: command.expected, exit: child.status, signal: child.signal, wall: performance.now() - started, stdout: child.stdout, stderr: child.stderr, error: child.error?.message ?? 'absent' }
			writeArtifact(resolve(output, `${command.name}.json`), result)
			results.push(result)
			if (child.status !== command.expected) throw new Error(`Offline proof exit mismatch: ${command.name}; see ${output}`)
		}
		const review = [...OPERATOR_FILES, 'prepare.ts', 'prepare-offline.ts', 'NetworkWitness.ts', 'offline.ts', 'proof.test.ts', 'negative.test.ts', 'Verifier.ts', 'verify.ts', 'freeze.ts', 'packet-final.json', 'plan-ready.json']
		let diff = ''
		for (const name of review) {
			const child = spawnSync('git', ['diff', '--no-index', '--', '/dev/null', resolve(UNIT, name)], { cwd: ROOT, encoding: 'utf8' })
			if (child.status !== 1) throw new Error(`Review diff failed: ${name}; ${child.stderr}`)
			diff += child.stdout
		}
		writeFileSync(resolve(output, 'review.diff'), diff, { flag: 'wx' })
		writeArtifact(resolve(output, 'summary.json'), { host: { node: process.version, platform: process.platform }, packet: readBinding(PACKET), plan: readBinding(resolve(UNIT, 'plan-ready.json')), build: BUILD_HASH, operator: computeOperator(), files: review.map(name => readBinding(resolve(UNIT, name))), proof: results, diff: readBinding(resolve(output, 'review.diff')), inference: 0, limitations: ['Forwarding and raw custody are prepared but require real local execution for transport evidence', 'Undici diagnostic witness observes native fetch requests, not arbitrary socket activity', 'Fetch exposes decoded entity-body bytes and not HTTP framing or compressed wire bytes', 'Transitive runtime dependencies beyond the explicitly bound direct judge/scorer/timeout packages are not recursively inventoried', 'Initial packet.json, plan.json, and plan-final.json are preserved drafts; packet-final.json and plan-ready.json are the frozen authority'] })
		writeArtifact(resolve(output, 'hashes.json'), readdirSync(output).map(name => ({ name, hash: computeHash(readFileSync(resolve(output, name))) })))
		console.log(JSON.stringify({ output, packet: readBinding(PACKET).hash, operator: computeOperator(), summary: readBinding(resolve(output, 'summary.json')).hash, hashes: readBinding(resolve(output, 'hashes.json')).hash, review: readBinding(resolve(output, 'review.diff')).hash, inference: 0 }))
	}
}
