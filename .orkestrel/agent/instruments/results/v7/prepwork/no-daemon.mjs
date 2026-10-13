// Preloaded with --import: any fetch to the Ollama daemon throws, so a probe that reached it fails loudly.
const original = globalThis.fetch
globalThis.fetch = (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (url.includes('11434')) throw new Error(`no-daemon: refused ${url}`)
	return original(input, init)
}
