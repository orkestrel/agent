import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const base = 'http://127.0.0.1:11434'
const output = 'tmp/units/aggregate-capacity-observations'
const showBody = Buffer.from('{"model":"qwen3.5:2b-q4_K_M"}', 'utf8')

interface Observation {
	readonly name: string
	readonly method: 'GET' | 'POST'
	readonly path: string
	readonly requestBytes: number
	readonly requestSha256: string
	readonly startedAt: string
	readonly finishedAt: string
	readonly status: number | null
	readonly ok: boolean
	readonly redirected: boolean
	readonly responseBytes: number
	readonly responseSha256: string | null
	readonly artifact: string | null
	readonly error: string | null
}

const observations: Observation[] = []
const endpoints = [
	{ name: 'version', method: 'GET' as const, path: '/api/version' },
	{ name: 'ps', method: 'GET' as const, path: '/api/ps' },
	{ name: 'show', method: 'POST' as const, path: '/api/show' },
]

for (const endpoint of endpoints) {
	const body = endpoint.method === 'POST' ? showBody : Buffer.alloc(0)
	const startedAt = new Date().toISOString()
	try {
		const response = await fetch(`${base}${endpoint.path}`, {
			method: endpoint.method,
			...(endpoint.method === 'POST'
				? { headers: { 'content-type': 'application/json' }, body }
				: {}),
			redirect: 'manual',
			signal: AbortSignal.timeout(15000),
		})
		const bytes = Buffer.from(await response.arrayBuffer())
		const responseSha256 = createHash('sha256').update(bytes).digest('hex')
		const artifact = join(output, `${endpoint.name}.body`)
		writeFileSync(artifact, bytes, { flag: 'wx' })
		observations.push({
			name: endpoint.name,
			method: endpoint.method,
			path: endpoint.path,
			requestBytes: body.length,
			requestSha256: createHash('sha256').update(body).digest('hex'),
			startedAt,
			finishedAt: new Date().toISOString(),
			status: response.status,
			ok: response.ok,
			redirected: response.status >= 300 && response.status < 400,
			responseBytes: bytes.length,
			responseSha256,
			artifact,
			error: null,
		})
	} catch (error) {
		observations.push({
			name: endpoint.name,
			method: endpoint.method,
			path: endpoint.path,
			requestBytes: body.length,
			requestSha256: createHash('sha256').update(body).digest('hex'),
			startedAt,
			finishedAt: new Date().toISOString(),
			status: null,
			ok: false,
			redirected: false,
			responseBytes: 0,
			responseSha256: null,
			artifact: null,
			error: error instanceof Error ? error.message : String(error),
		})
	}
}

const manifest = {
	base,
	completedAt: new Date().toISOString(),
	timeoutMs: 15000,
	redirectPolicy: 'manual; 3xx body retained and not followed',
	observations,
}
writeFileSync(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
console.log(
	JSON.stringify(
		observations.map(({ name, method, path, startedAt, finishedAt, status, redirected, responseBytes, responseSha256, error }) => ({
			name,
			method,
			path,
			startedAt,
			finishedAt,
			status,
			redirected,
			responseBytes,
			responseSha256,
			error,
		})),
	),
)
