import type { JSONValue } from '@orkestrel/contract'
import type { ToolContext } from '@orkestrel/tool'
import type {
	StudyContext,
	StudyEvidence,
	StudyGoal,
	StudyProduct,
	StudySessionInterface,
	StudyTicket,
} from '@orkestrel/study'
import type {
	ScriptedStudyOptions,
	StudyToolsAgentInterface,
	StudyToolsOperation,
	StudyToolsSessionOptions,
} from './types.js'
import { cloneJSONValue, isJSONValue, isObject, isRecord } from '@orkestrel/contract'
import { createTool, createToolManager, isToolCall } from '@orkestrel/tool'
import { errorToMessage } from '@orkestrel/workflow'
import { open, realpath, rm } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { StudyError, failStudyTicket } from '@orkestrel/study'
import { encodeStudyJSON } from '@orkestrel/study/server'
import { STUDY_TOOLS_BYTES } from './constants.js'
import { isStudyToolsRefusal, StudyToolsRefusal } from './errors.js'
import { observeStudyToolsFile, resolveStudyToolsPath } from './helpers.js'
import { parseStudyToolsInput } from './parsers.js'
import { ScriptedStudyProvider } from './ScriptedStudyProvider.js'
import { isStudyToolsAgent, isStudyToolsRead, isStudyToolsWrite } from './validators.js'

/** Retains one actual Agent and scratch-file state across the declared trial goals. */
export class StudyToolsSession implements StudySessionInterface {
	readonly #options: StudyToolsSessionOptions
	readonly #provider = new ScriptedStudyProvider()
	readonly #tools = createToolManager()
	readonly #agent: StudyToolsAgentInterface
	#active: ScriptedStudyOptions | undefined
	#work: Promise<StudyProduct> | undefined
	#closing: Promise<void> | undefined
	#trace: StudyEvidence[] = []
	#fault: unknown

	/**
	 * Constructs the actual admitted Agent with real scratch tools and an explicit authority gate.
	 * @param options - The admitted runtime namespace and fresh recorded scratch directory
	 * @throws StudyError - Thrown when the runtime lacks the required operations
	 */
	constructor(options: StudyToolsSessionOptions) {
		this.#options = { ...options }
		this.#tools.add([
			createTool({
				name: 'write',
				description: 'Creates one new bounded scratch text file',
				execute: (args, context) => this.#write(args, context),
			}),
			createTool({
				name: 'read',
				description: 'Reads one bounded scratch text file',
				execute: (args, context) => this.#read(args, context),
			}),
		])
		const agent: unknown = new options.agent.Agent(this.#provider, {
			tools: this.#tools,
			signal: options.signal,
			limit: 8,
			authority: {
				evaluate: () => ({
					zone: 'study',
					allowed: this.#active?.input.admitted ?? false,
					reason: 'Declared workload tool admission refused',
				}),
			},
			on: {
				tool: (call, result) => this.#capture('tool', { call, result }),
				deny: (call, reason) => this.#capture('denial', { call, reason }),
			},
			error: (error) => {
				this.#fault = error
			},
		})
		if (!isStudyToolsAgent(agent)) {
			this.#tools.destroy()
			throw new StudyError('CONFIG', 'Admitted Agent does not expose the consumer operations')
		}
		this.#agent = agent
	}

	/**
	 * Executes one public workload without receiving any rubric or expected verdict.
	 * @param goal - The declared public mechanism input
	 * @param context - The enclosing meter, evidence sink and operational signal
	 * @returns Actual Agent content and partial state
	 * @throws StudyError - Thrown when the session is closed or already executing
	 */
	async execute(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		if (this.#closing !== undefined || this.#active !== undefined)
			throw new StudyError('CONFIG', 'Tools session is closed or already executing')
		const work = this.#run(goal, context)
		this.#work = work
		try {
			return await work
		} finally {
			this.#work = undefined
		}
	}

	/**
	 * Cancels active work and removes only this session's recorded scratch child.
	 * @returns Completion after actual Agent work drains and scratch removal finishes
	 */
	close(): Promise<void> {
		this.#closing ??= this.#dispose()
		return this.#closing
	}

	async #run(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		context.signal.throwIfAborted()
		context.meter.signal.throwIfAborted()
		const input = parseStudyToolsInput(goal.input)
		const workload = new AbortController()
		this.#active = { input, goal: goal.id, context, workload }
		this.#trace = []
		this.#fault = undefined
		try {
			this.#provider.prepare(this.#active)
			this.#agent.context.messages.add({ role: 'user', content: input.prompt })
			const result: unknown = await this.#agent.generate({
				signal: AbortSignal.any([context.signal, context.meter.signal, workload.signal]),
			})
			context.signal.throwIfAborted()
			context.meter.signal.throwIfAborted()
			if (!isObject(result))
				throw new StudyError('FAULT', 'Admitted Agent returned invalid result fields')
			const content = 'content' in result ? result.content : undefined
			const partial = 'partial' in result ? result.partial : undefined
			if (typeof content !== 'string' || typeof partial !== 'boolean')
				throw new StudyError('FAULT', 'Admitted Agent returned invalid result fields')
			if (this.#fault !== undefined) throw new StudyError('FAULT', errorToMessage(this.#fault))
			for (const file of input.files) {
				const started = performance.now()
				const ticket = await context.meter.admit({
					role: 'metadata',
					tokens: 0,
					bytes: STUDY_TOOLS_BYTES,
				})
				try {
					ticket.signal.throwIfAborted()
					const observed = await observeStudyToolsFile(this.#options.directory, file)
					await context.evidence.append({ event: 'file', goal: goal.id, value: { ...observed } })
					ticket.finish({
						role: 'metadata',
						calls: 1,
						tokens: undefined,
						bytes: observed.bytes ?? 0,
						duration: Math.ceil(performance.now() - started),
					})
				} catch (error) {
					failStudyTicket(ticket, error, 'metadata')
					throw error
				}
			}
			await context.evidence.append({
				event: 'result',
				goal: goal.id,
				value: { content, partial },
			})
			return Object.freeze({
				value: Object.freeze({ content }),
				partial,
			})
		} finally {
			try {
				for (const row of this.#trace) await context.evidence.append(row)
			} finally {
				this.#active = undefined
			}
		}
	}

	async #write(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		return this.#executeTool(args, context, async (signal) => {
			if (!isStudyToolsWrite(args)) throw new StudyToolsRefusal('Write arguments refused')
			const target = await resolveStudyToolsPath(this.#options.directory, args.path)
			signal.throwIfAborted()
			let file
			try {
				file = await open(target, 'wx')
			} catch (error) {
				if (isObject(error) && 'code' in error && error.code === 'EEXIST')
					throw new StudyToolsRefusal('Existing scratch file refused')
				throw error
			}
			try {
				signal.throwIfAborted()
				await file.writeFile(args.content, 'utf8')
				signal.throwIfAborted()
			} finally {
				await file.close()
			}
			return `stored ${args.path}`
		})
	}

	async #read(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		return this.#executeTool(args, context, async (signal) => {
			if (!isStudyToolsRead(args)) throw new StudyToolsRefusal('Read arguments refused')
			signal.throwIfAborted()
			const file = await observeStudyToolsFile(this.#options.directory, args.path)
			signal.throwIfAborted()
			if (!file.exists || file.content === undefined)
				throw new StudyToolsRefusal('Scratch file is absent')
			return file.content
		})
	}

	async #executeTool(
		args: Readonly<Record<string, unknown>>,
		context: ToolContext,
		operation: StudyToolsOperation,
	): Promise<JSONValue> {
		const active = this.#active
		if (active === undefined) throw new StudyError('CONFIG', 'No tools workload is active')
		const request = encodeStudyJSON(args).byteLength
		if (request > STUDY_TOOLS_BYTES) throw new StudyToolsRefusal('Oversized tool arguments refused')
		const started = performance.now()
		const ticket: StudyTicket = await active.context.meter.admit({
			role: 'tool',
			tokens: 0,
			bytes: STUDY_TOOLS_BYTES,
		})
		try {
			const signal = AbortSignal.any([
				context.signal,
				active.context.signal,
				active.context.meter.signal,
				ticket.signal,
			])
			signal.throwIfAborted()
			let value: JSONValue
			try {
				value = await operation(signal)
			} catch (error) {
				if (!isStudyToolsRefusal(error)) throw error
				ticket.finish({
					role: 'tool',
					calls: 1,
					tokens: undefined,
					bytes: request + new TextEncoder().encode(error.message).byteLength,
					duration: Math.ceil(performance.now() - started),
				})
				throw error
			}
			signal.throwIfAborted()
			ticket.finish({
				role: 'tool',
				calls: 1,
				tokens: undefined,
				bytes: request + encodeStudyJSON(value).byteLength,
				duration: Math.ceil(performance.now() - started),
			})
			return value
		} catch (error) {
			failStudyTicket(ticket, error, 'tool')
			throw error
		}
	}

	#capture(event: 'tool' | 'denial', envelope: unknown): void {
		try {
			if (this.#active === undefined || !isRecord(envelope) || !isToolCall(envelope.call))
				throw new StudyError('FAULT', 'Admitted Agent supplied invalid tool observation')
			const call = envelope.call
			let value: JSONValue
			if (event === 'denial')
				value = {
					id: call.id,
					name: call.name,
					...(typeof envelope.reason === 'string' ? { reason: envelope.reason } : {}),
				}
			else {
				const result = envelope.result
				if (!isObject(result) || !('success' in result) || typeof result.success !== 'boolean')
					throw new StudyError('FAULT', 'Admitted Agent supplied invalid tool result')
				if (result.success) {
					if (!('value' in result) || !isJSONValue(result.value))
						throw new StudyError('FAULT', 'Admitted Agent supplied non-JSON tool value')
					value = {
						id: call.id,
						name: call.name,
						arguments: cloneJSONValue(call.arguments),
						success: true,
						value: cloneJSONValue(result.value),
					}
				} else {
					if (!('error' in result) || typeof result.error !== 'string')
						throw new StudyError('FAULT', 'Admitted Agent supplied invalid tool error')
					value = {
						id: call.id,
						name: call.name,
						arguments: cloneJSONValue(call.arguments),
						success: false,
						error: result.error,
					}
				}
			}
			this.#trace.push({ event, goal: this.#active.goal, value })
		} catch (error) {
			this.#fault = error
		}
	}

	async #dispose(): Promise<void> {
		this.#agent.abort(new Error('Tools session closed'))
		await this.#work?.catch(() => undefined)
		this.#tools.destroy()
		this.#agent.emitter.destroy()
		const directory = resolve(this.#options.directory)
		const parent = dirname(directory)
		if (
			!basename(directory).startsWith('trial-') ||
			relative(parent, directory) !== basename(directory) ||
			resolve(await realpath(directory)) !== directory
		)
			throw new StudyError('CUSTODY', 'Recorded scratch removal target is no longer canonical')
		await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 10 })
	}
}
