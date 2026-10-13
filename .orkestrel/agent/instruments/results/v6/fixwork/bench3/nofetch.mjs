// Preload: refuses every fetch, so a run that reaches for the Ollama daemon fails and names the URL.
globalThis.fetch = async (input) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	process.stderr.write(`nofetch: refused ${url}\n`)
	throw new Error(`nofetch: refused ${url}`)
}
