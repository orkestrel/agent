import type { IncomingMessage, ServerResponse } from 'node:http'
import type { CapacityExit } from '../types.ts'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CAPACITY_BUILD } from '../constants.ts'
import {
	hashCapacityFile,
	readCapacityCount,
	readCapacityJSON,
	writeCapacityJSON,
} from '../helpers.ts'

/** Reads the complete protocol request body.
 * @param request - Incoming request
 * @returns Buffered text
 */
export function readCapacityBody(request: IncomingMessage): Promise<string> {
	return new Promise((complete, reject) => {
		const chunks: Buffer[] = []
		request.on('data', (chunk: Buffer) => chunks.push(chunk))
		request.once('end', () => complete(Buffer.concat(chunks).toString('utf8')))
		request.once('error', reject)
	})
}

/** Sends a protocol JSON response.
 * @param response - HTTP response
 * @param status - Status code
 * @param value - External data
 * @returns Nothing
 */
export function sendCapacityJSON(response: ServerResponse, status: number, value: unknown): void {
	response.writeHead(status, { 'content-type': 'application/json' })
	response.end(JSON.stringify(value))
}

/** Creates test-only custody bound to the unchanged canonical emitted harness.
 * @returns Owned temporary directory and proof path
 */
export function createCapacityProof(): { readonly directory: string; readonly proof: string } {
	mkdirSync('tmp/units', { recursive: true })
	const directory = mkdtempSync(resolve('tmp/units/c1-capacity-execution-fixture-'))
	const report = join(directory, 'fixture-proof.txt')
	writeFileSync(report, 'TEST ONLY: loopback protocol fixture; no live-model authorization.\n', {
		flag: 'wx',
	})
	const proof = join(directory, 'proof.json')
	writeCapacityJSON(proof, {
		passed: true,
		build: hashCapacityFile(CAPACITY_BUILD),
		report: hashCapacityFile(report),
	})
	return { directory, proof }
}

/** Reads an actual clean canonical child exit for negative metadata controls.
 * @param path - Retained child exit artifact
 * @returns Validated recorded exit
 */
export function readCapacityExit(path: string): CapacityExit {
	const value = readCapacityJSON(path)
	if (
		value.signal !== null ||
		value.expired !== false ||
		value.error !== undefined ||
		(value.code !== 0 && value.code !== 3)
	)
		throw new Error('fixture child did not exit cleanly')
	return {
		pid: readCapacityCount(value.pid),
		code: value.code,
		signal: null,
		expired: false,
		error: undefined,
	}
}
