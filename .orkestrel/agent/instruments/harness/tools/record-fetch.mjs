// Preload: records every request to the Ollama daemon and its response, unchanged, to RECORD_DIR.
// Use: RECORD_DIR=/path node --import /abs/record-fetch.mjs bench.mjs ...
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.env.RECORD_DIR
if (dir) {
	mkdirSync(dir, { recursive: true })
	const original = globalThis.fetch
	let sequence = 0
	globalThis.fetch = async (input, init = {}) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
		if (!/:11434\//.test(url)) return original(input, init)
		const number = String(++sequence).padStart(5, '0')
		const started = Date.now()
		let body = init.body
		try { body = typeof body === 'string' ? JSON.parse(body) : body } catch {}
		const path = new URL(url).pathname.replace(/\//g, '_')
		writeFileSync(join(dir, `${number}${path}-request.json`), JSON.stringify({ url, method: init.method ?? 'GET', started, body }, null, 1))
		try {
			const response = await original(input, init)
			response.clone().text().then(
				(text) => writeFileSync(join(dir, `${number}${path}-response.json`), JSON.stringify({ status: response.status, ms: Date.now() - started, text }, null, 1)),
				(error) => writeFileSync(join(dir, `${number}${path}-response.json`), JSON.stringify({ status: response.status, ms: Date.now() - started, error: String(error) }, null, 1)),
			)
			return response
		} catch (error) {
			writeFileSync(join(dir, `${number}${path}-response.json`), JSON.stringify({ ms: Date.now() - started, error: String(error) }, null, 1))
			throw error
		}
	}
}
