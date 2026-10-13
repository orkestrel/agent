// Preload: any global fetch is refused and logged, so a probe that uses its own stub transport reaches no daemon.
import { appendFileSync } from 'node:fs'
globalThis.fetch = async (input) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	appendFileSync(new URL('./refused.txt', import.meta.url), `${url}\n`)
	throw new Error(`refuse: ${url}`)
}
