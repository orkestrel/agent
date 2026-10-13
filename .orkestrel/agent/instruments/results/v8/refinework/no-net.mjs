// Preloaded with --import: any fetch the harness makes fails before it leaves the process, so a probe
// that tried to reach the daemon shows up as an error instead of a request.
globalThis.fetch = async (input) => {
	const url = typeof input === 'string' ? input : input?.url
	process.stderr.write(`no-net: blocked fetch ${url}\n`)
	throw new Error(`no-net: blocked fetch ${url}`)
}
