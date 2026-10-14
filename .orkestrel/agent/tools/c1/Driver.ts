import type { Batch, Options } from './types.ts'
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

/** Dispatches bounded blind labeling batches after validating resumable output. */
export class Driver {
	#root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
	#options: Options
	#next = 0
	#failed = false
	#pending: readonly Batch[] = []
	/** Creates the driver.
	 * @param options - Validated command-line options
	 */
	constructor(options: Options) { this.#options = options }

	/** Plans or dispatches batches; execution requires the parent-owned bench probe.
	 * @returns Completion after every launched worker finishes
	 * @example await new Driver(options).execute()
	 */
	async execute(): Promise<void> {
		const audit = dirname(this.#options.packet)
		if (createHash('sha256').update(readFileSync(this.#options.packet)).digest('hex') !== this.#options.hashes.packet)
			throw new Error('packet hash differs')
		const index: unknown = JSON.parse(readFileSync(join(audit, 'items', 'index.json'), 'utf8'))
		if (!Array.isArray(index) || index.length === 0) throw new Error('item index is empty or malformed')
		const ids: string[] = []
		for (const entry of index) {
			const id: unknown = typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'id') : undefined
			if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id) || ids.includes(id)) throw new Error('invalid or duplicate item id')
			if (!existsSync(join(audit, 'items', `${id}.json`))) throw new Error(`missing item ${id}`)
			ids.push(id)
		}
		const packet: unknown = JSON.parse(readFileSync(this.#options.packet, 'utf8'))
		const items: unknown = typeof packet === 'object' && packet !== null ? Reflect.get(packet, 'items') : undefined
		if (!Array.isArray(items) || items.length !== ids.length) throw new Error('index differs from packet item set')
		const seen = new Set<string>()
		for (const item of items) {
			const id: unknown = typeof item === 'object' && item !== null ? Reflect.get(item, 'id') : undefined
			if (typeof id !== 'string' || !ids.includes(id) || seen.has(id)) throw new Error('index differs from packet item set')
			seen.add(id)
			const split: unknown = JSON.parse(readFileSync(join(audit, 'items', `${id}.json`), 'utf8'))
			if (!isDeepStrictEqual(split, item)) throw new Error(`split item differs from packet: ${id}`)
		}
		// Sorting makes batch membership independent of index presentation order.
		ids.sort()
		const batches: Batch[] = []
		for (let at = 0; at < ids.length; at += 2) {
			const name = `batch-${String(at / 2).padStart(3, '0')}`
			batches.push({ name, ids: ids.slice(at, at + 2), output: join(audit, 'labels', `${name}.json`) })
		}
		if (this.#options.plan) {
			this.#pending = batches.filter((batch) => !existsSync(batch.output) || !this.#check(batch))
			console.log(JSON.stringify({ harness: this.#options.harness, items: ids.length, batches: batches.length, pending: this.#pending.length, concurrency: this.#options.concurrency, limit: this.#options.limit, cap: this.#options.cap, model: 'gpt-6.1-sol', effort: 'high' }))
			return
		}
		const lock = join(audit, 'c1-label.lock')
		const fd = openSync(lock, 'wx')
		writeFileSync(fd, JSON.stringify({ pid: process.pid, unit: this.#options.unit, started: new Date().toISOString() }))
		closeSync(fd)
		try {
			// Validate every existing batch before launching any paid work.
			this.#pending = batches.filter((batch) => !existsSync(batch.output) || !this.#check(batch))
			mkdirSync(join(audit, 'labels'), { recursive: true })
			await Promise.all(Array.from({ length: this.#options.concurrency }, () => this.#worker()))
			if (this.#failed) throw new Error('label dispatch failed; scheduling stopped')
		} finally { unlinkSync(lock) }
	}

	#check(batch: Batch): boolean {
		const envelope: unknown = JSON.parse(readFileSync(batch.output, 'utf8'))
		if (typeof envelope !== 'object' || envelope === null || Reflect.get(envelope, 'authority') !== 'root-adjudicated' || Reflect.get(envelope, 'packet') !== this.#options.hashes.packet || Reflect.get(envelope, 'keys') !== this.#options.hashes.keys)
			throw new Error(`${batch.name}: foreign or malformed envelope`)
		const labels: unknown = Reflect.get(envelope, 'labels')
		if (!Array.isArray(labels) || labels.length !== batch.ids.length) throw new Error(`${batch.name}: assigned ids differ`)
		const ids = labels.map((label: unknown) => typeof label === 'object' && label !== null ? Reflect.get(label, 'id') : undefined)
		if (new Set(ids).size !== batch.ids.length || !batch.ids.every((id) => ids.includes(id))) throw new Error(`${batch.name}: assigned ids differ`)
		const result = spawnSync(process.execPath, [join(this.#options.harness, '.build', 'bench5', 'continuous.js'), 'labels', '--packet', this.#options.packet, '--labels', batch.output], { cwd: this.#root, encoding: 'utf8', windowsHide: true })
		if (result.status !== 0 || !/^.*\brefused 0\b.*$/m.test(result.stdout) || /^REFUSED\b/m.test(result.stdout)) throw new Error(`${batch.name}: checker refused\n${result.stdout}${result.stderr}`)
		return true
	}

	async #worker(): Promise<void> {
		while (!this.#failed && this.#next < this.#pending.length && this.#next < (this.#options.limit ?? 0)) {
			const batch = this.#pending[this.#next++]
			if (batch === undefined) return
			try { await this.#launch(batch) } catch (error) {
				this.#failed = true
				console.error(error instanceof Error ? error.message : String(error))
			}
		}
	}

	async #launch(batch: Batch): Promise<void> {
		const attempt = `${this.#options.unit}-${batch.name}-${randomUUID()}`
		mkdirSync(join(this.#root, 'tmp', 'codex'), { recursive: true })
		const directory = join(this.#root, 'tmp', 'codex', attempt)
		mkdirSync(directory, { recursive: false })
		const brief = join(directory, 'brief.md')
		const journal = join(directory, 'journal.jsonl')
		const errors = join(directory, 'journal.err')
		const last = join(directory, 'journal-last.md')
		const checker = join(this.#options.harness, '.build', 'bench5', 'continuous.js')
		const rubric = readFileSync(join(this.#options.harness, 'tools', 'c1', 'c1-label-brief.md'), 'utf8').replace('Claude Opus 5.5', 'GPT-6.1 Sol').replace('from the scaffold root', `from ${this.#root}`).replace(/^node .+continuous\.js labels --packet PACKET_PATH --labels YOUR_LABELS_PATH$/gm, () => `node "${checker}" labels --packet PACKET_PATH --labels YOUR_LABELS_PATH`)
		writeFileSync(brief, `${rubric}\n\n## Assignment\n\nRead only these assigned item files: ${batch.ids.map((id) => join(dirname(this.#options.packet), 'items', `${id}.json`)).join(', ')}.\nWrite only ${batch.output}.\nUse packet hash ${this.#options.hashes.packet} and keys hash ${this.#options.hashes.keys}.\nRun from ${this.#root}:\n\n\`\`\`text\nnode "${checker}" labels --packet "${this.#options.packet}" --labels "${batch.output}"\n\`\`\`\n`, { flag: 'wx' })
		const code = await new Promise<number>((complete, reject) => {
			const child = spawn(process.execPath, [join(this.#root, 'node_modules/@orkestrel/scaffold/dist/agents/skills/orkestrel-dispatch/scripts/launch.js'), '--journal', journal, '--errors', errors, '--cap', String(this.#options.cap), '--status', '--', 'codex', 'exec', '--json', '-C', this.#root, '--sandbox', process.platform === 'win32' ? 'danger-full-access' : 'workspace-write', '--model', 'gpt-6.1-sol', '-c', 'model_reasoning_effort="high"', '-c', 'mcp_servers.tactica-probe.enabled=false', '--output-last-message', last, `Read ${brief} from disk and execute it exactly. Your final message is the report it specifies.`], { cwd: this.#root, shell: false, windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'] })
			child.on('error', reject)
			child.on('close', (status) => complete(status ?? 1))
		})
		const result = spawnSync(process.execPath, [join(this.#root, 'node_modules/@orkestrel/scaffold/dist/agents/skills/orkestrel-dispatch/scripts/result.js'), '--codex', journal], { cwd: this.#root, encoding: 'utf8', windowsHide: true })
		console.log(result.stdout)
		if (code !== 0 || result.status !== 0) throw new Error(`${batch.name}: process or session result failed (${code}); ${journal}`)
		this.#check(batch)
	}
}
