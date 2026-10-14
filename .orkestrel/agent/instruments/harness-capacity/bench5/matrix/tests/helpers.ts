import type { MatrixFreeze, MatrixRequest, MatrixSnapshot } from '../types.js'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MODELS, SAMPLER } from '../../constants.js'
import { hashFile } from '../../refit/helpers.js'

/** Writes inert, hash-bound deployment evidence for the protocol fixture only. */
export function writeDeploymentFixture(directory: string): string {
	mkdirSync(directory, { recursive: true })
	const marker = join(directory, 'deployment-evidence.json')
	writeFileSync(marker, JSON.stringify({ fixture: true }))
	const metadata = join(directory, 'deployment-metadata.json')
	writeFileSync(metadata, JSON.stringify({ model_info: { 'fixture.context_length': 262144 } }))
	const path = join(directory, 'deployment.json')
	writeFileSync(
		path,
		JSON.stringify({
			receipt: hashFile(marker),
			executable: hashFile(marker),
			runner: hashFile(marker),
			version: 'fixture',
			environment: { OLLAMA_NUM_PARALLEL: '1' },
			exclusive: true,
			controls: [hashFile(marker)],
			models: Object.values(MODELS).map((model, at) => ({
				model,
				digest: String(at + 1).repeat(64),
				backend: 'llamacpp',
				context: 262144,
				field: 'fixture.context_length',
				metadata: hashFile(metadata),
			})),
		}),
	)
	return path
}

/** Builds inert roles whose deployment evidence the real capacity validator reads. */
export function buildCapacityFreeze(directory: string): MatrixFreeze {
	const deployment = hashFile(writeDeploymentFixture(directory))
	return {
		protocol: 'l6',
		key: 'q2',
		think: false,
		decision: { model: MODELS.q2, digest: '1'.repeat(64), think: false, sampler: SAMPLER },
		summarizer: { model: MODELS.q2, digest: '1'.repeat(64), think: false, sampler: SAMPLER },
		judge: { model: 'fixture', digest: '2'.repeat(64), think: false, sampler: {} },
		deployment,
		files: [],
		settings: deployment,
		seed: deployment,
		census: deployment,
		tags: deployment,
		configuration: { allowance: 1, predict: 1, retry: 0 },
	}
}

/** Writes exact raw snapshot evidence for a decision with optional negative-control bytes. */
export function writeCapacityRequest(
	directory: string,
	changes: Partial<MatrixRequest> = {},
	raw?: unknown,
	snapshot?: Partial<MatrixSnapshot>,
): MatrixRequest {
	const request: MatrixRequest = {
		started: 10,
		buffered: 20,
		finished: 30,
		sequence: 1,
		role: 'agent',
		goal: 'fixture',
		sent: true,
		request: {
			model: MODELS.q2,
			truncate: false,
			shift: false,
			think: false,
			options: { ...SAMPLER, num_ctx: 3072, num_predict: 512 },
			messages: [],
		},
		response: JSON.stringify({
			done: true,
			done_reason: 'stop',
			prompt_eval_count: 2559,
			eval_count: 512,
		}),
		status: 200,
		failures: [],
		wall: 10,
		...changes,
	}
	const bytes = Buffer.from(
		JSON.stringify(
			raw ?? {
				models: [
					{
						name: MODELS.q2,
						digest: '1'.repeat(64),
						runner: 'llamacpp',
						context_length: 3072,
						expires_at: '2099-01-01T00:00:00Z',
					},
				],
			},
		),
	)
	const path = join(directory, `capacity-${request.sequence}.json`)
	writeFileSync(
		path,
		JSON.stringify({
			sequence: request.sequence,
			role: 'agent',
			model: MODELS.q2,
			request: createHash('sha256').update(JSON.stringify(request.request)).digest('hex'),
			buffered: request.buffered,
			started: 21,
			finished: 25,
			status: 200,
			raw: bytes.toString('base64'),
			hash: createHash('sha256').update(bytes).digest('hex'),
			...snapshot,
		}),
	)
	return { ...request, capacity: { evidence: hashFile(path), window: 3072, wall: 4 } }
}
