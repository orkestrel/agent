// Offline probe of the judge path: imports the vendored ollama build, resolves its @orkestrel/agent
// from node_modules, and constructs a judge without calling it. A fetch that throws and logs
// stands in for the daemon; the probe exits 1 when anything calls it.
// Use: node tools/probe-judge.mjs
let calls = 0
globalThis.fetch = () => {
	calls += 1
	throw new Error('probe-judge: fetch is blocked')
}
const { createOllamaJudge, OllamaJudge } = await import('../vendor/ollama/index.js')
const agent = await import('@orkestrel/agent')
if (typeof createOllamaJudge !== 'function') throw new Error('createOllamaJudge is not a function')
const judge = createOllamaJudge({ url: 'http://127.0.0.1:1', model: 'probe-model', system: 'probe', fetch: globalThis.fetch })
if (!(judge instanceof OllamaJudge)) throw new Error('the judge is not an OllamaJudge')
if (!(judge instanceof agent.AgentJudge)) throw new Error('the judge does not extend the installed AgentJudge')
process.stdout.write(`createOllamaJudge ${typeof createOllamaJudge}; judge ${judge.constructor.name}; extends AgentJudge; fetch calls ${calls}\n`)
process.exit(calls === 0 ? 0 : 1)
