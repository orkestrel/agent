// Unloads every model the daemon holds and waits until none is loaded, so a run starts with an empty
// prompt cache: a cached prefix changes temperature-0 replies (results/v8/DIVERGENCE.md, confirmed live).
const api = 'http://127.0.0.1:11434'
const loaded = async () => (await (await fetch(`${api}/api/ps`)).json()).models.map((model) => model.name)
for (const name of await loaded()) await fetch(`${api}/api/generate`, { method: 'POST', body: JSON.stringify({ model: name, keep_alive: 0 }) })
for (let tries = 0; tries < 60; tries += 1) {
	if ((await loaded()).length === 0) {
		console.log(`cold start: no model loaded (${new Date().toISOString()})`)
		process.exit(0)
	}
	await new Promise((resolve) => setTimeout(resolve, 1000))
}
console.error('cold start: models still loaded after 60 s')
process.exit(1)
