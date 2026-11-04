import type { ConversationInterface } from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { ToolContext } from '@orkestrel/tool'
import type {
	StudyContext,
	StudyGoal,
	StudyProduct,
	StudySessionInterface,
	StudyTicket,
} from '@orkestrel/study'
import type {
	StudyToolsAgentInterface,
	StudyToolsOperation,
	StudyToolsSessionOptions,
} from './types.js'
import { errorToMessage, isObject, objectShape, stringShape } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { open, realpath, rm } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { StudyError, failStudyTicket } from '@orkestrel/study'
import {
	StudyAgentScript,
	buildStudyAgentToolDenial,
	buildStudyAgentToolResult,
	encodeStudyJSON,
} from '@orkestrel/study/server'
import {
	STUDY_TOOLS_BYTES,
	STUDY_TOOLS_LOADED,
	STUDY_TOOLS_REMEMBERED,
	STUDY_TOOLS_SKILL_PREFIX,
} from './constants.js'
import { isStudyToolsRefusal, StudyToolsRefusal } from './errors.js'
import { observeStudyToolsFile, resolveStudyToolsPath } from './helpers.js'
import { parseStudyToolsInput } from './parsers.js'
import { StudyToolsWorkload } from './StudyToolsWorkload.js'
import {
	isStudyToolsAgent,
	isStudyToolsName,
	isStudyToolsRead,
	isStudyToolsRemember,
	isStudyToolsWrite,
} from './validators.js'

/** Retains one actual Agent and scratch-file state across the declared trial goals. */
export class StudyToolsSession implements StudySessionInterface {
	readonly #options: StudyToolsSessionOptions
	readonly #provider = new StudyAgentScript({ bytes: STUDY_TOOLS_BYTES })
	readonly #tools = createToolManager()
	readonly #agent: StudyToolsAgentInterface
	readonly #live = new Set<StudyToolsWorkload>()
	readonly #flights = new Set<Promise<StudyProduct>>()
	// One instance per declared id, added once, because a same-id `add` replaces the registered one.
	readonly #conversations = new Map<string, ConversationInterface>()
	#closed: Promise<void> | undefined

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
				annotations: { consequential: true },
				contract: objectShape({ path: stringShape(), content: stringShape() }),
				execute: (args, context) => this.#write(args, context),
			}),
			createTool({
				name: 'read',
				description: 'Reads one bounded scratch text file',
				contract: objectShape({ path: stringShape() }),
				execute: (args, context) => this.#read(args, context),
			}),
			createTool({
				name: 'remember',
				description:
					'Stores one memo revision from its name, description, and content, and acknowledges it; use memo to read the content',
				annotations: { consequential: true },
				contract: objectShape({
					name: stringShape(),
					description: stringShape(),
					content: stringShape(),
				}),
				execute: (args, context) => this.#remember(args, context),
			}),
			createTool({
				name: 'memo',
				description:
					'Reads the current content of one memo by name; use remember to store a revision',
				contract: objectShape({ name: stringShape() }),
				execute: (args, context) => this.#memo(args, context),
			}),
			createTool({
				name: 'skill',
				description:
					'Loads one registered skill by name for the next run, and acknowledges it without returning the body',
				contract: objectShape({ name: stringShape() }),
				execute: (args, context) => this.#skill(args, context),
			}),
		])
		const agent: unknown = new options.agent.Agent(this.#provider, {
			tools: this.#tools,
			signal: options.signal,
			limit: 8,
			authority: {
				evaluate: () => ({
					zone: 'study',
					verdict: (this.#current()?.input.admitted ?? false) ? 'allow' : 'deny',
					reason: 'Declared workload tool admission refused',
				}),
				ask: (_context, _decision, signal) => this.#approve(signal),
			},
			on: {
				tool: (call, result) =>
					this.#capture('tool', () => buildStudyAgentToolResult(call, result)),
				deny: (call, reason) =>
					this.#capture('denial', () => buildStudyAgentToolDenial(call, reason)),
			},
			error: (error) => {
				this.#current()?.fail(error)
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
		if (this.#closed !== undefined || this.#live.size > 0)
			throw new StudyError('CONFIG', 'Tools session is closed or already executing')
		const flight = this.#executeGoal(goal, context)
		this.#flights.add(flight)
		try {
			return await flight
		} finally {
			this.#flights.delete(flight)
		}
	}

	/**
	 * Cancels active work and removes only this session's recorded scratch child.
	 * @returns Completion after actual Agent work drains and scratch removal finishes
	 */
	close(): Promise<void> {
		this.#closed ??= this.#dispose()
		return this.#closed
	}

	async #executeGoal(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		context.signal.throwIfAborted()
		context.meter.signal.throwIfAborted()
		const input = parseStudyToolsInput(goal.input)
		const workload = new StudyToolsWorkload({ input, goal: goal.id, context })
		this.#live.add(workload)
		try {
			this.#provider.prepare({
				responses: input.responses,
				goal: goal.id,
				context,
				workload: workload.controller,
			})
			if (input.skills !== undefined) this.#agent.context.skills.add(input.skills)
			if (input.scope !== undefined)
				this.#agent.context.apply(
					this.#options.agent.createScope({ name: 'libraries', ...input.scope }),
				)
			const conversation =
				input.conversation === undefined
					? this.#agent.context.messages
					: this.#bind(input.conversation)
			conversation.add({ role: 'user', content: input.prompt })
			const result: unknown = await this.#agent.generate({
				signal: AbortSignal.any([context.signal, context.meter.signal, workload.controller.signal]),
				conversation,
			})
			context.signal.throwIfAborted()
			context.meter.signal.throwIfAborted()
			if (!isObject(result))
				throw new StudyError('FAULT', 'Admitted Agent returned invalid result fields')
			const content = 'content' in result ? result.content : undefined
			const partial = 'partial' in result ? result.partial : undefined
			if (typeof content !== 'string' || typeof partial !== 'boolean')
				throw new StudyError('FAULT', 'Admitted Agent returned invalid result fields')
			if (workload.fault !== undefined)
				throw new StudyError('FAULT', errorToMessage(workload.fault))
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
			for (const name of input.memos ?? []) {
				const current = this.#agent.context.memos.memo(name)
				await context.evidence.append({
					event: 'memo',
					goal: goal.id,
					value: {
						name,
						revisions: this.#agent.context.memos.history(name).length,
						...(current === undefined ? {} : { description: current.description }),
					},
				})
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
			if (input.scope !== undefined) this.#agent.context.apply(undefined)
			try {
				for (const row of workload.trace) await context.evidence.append(row)
			} finally {
				this.#live.delete(workload)
				this.#provider.clear()
			}
		}
	}

	async #write(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		return this.#executeTool(args, context, async (signal) => {
			if (!isStudyToolsWrite(args)) throw new StudyToolsRefusal('Write arguments refused')
			const target = await resolveStudyToolsPath(this.#options.directory, args.path)
			signal.throwIfAborted()
			const file = await open(target, 'wx').catch((error: unknown) => {
				if (isObject(error) && 'code' in error && error.code === 'EEXIST')
					throw new StudyToolsRefusal('Existing scratch file refused')
				throw error
			})
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

	async #remember(
		args: Readonly<Record<string, unknown>>,
		context: ToolContext,
	): Promise<JSONValue> {
		return this.#executeTool(args, context, async (signal) => {
			if (!isStudyToolsRemember(args)) throw new StudyToolsRefusal('Remember arguments refused')
			signal.throwIfAborted()
			this.#agent.context.memos.add({
				name: args.name,
				description: args.description,
				content: args.content,
			})
			return STUDY_TOOLS_REMEMBERED
		})
	}

	async #memo(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		return this.#executeTool(args, context, async (signal) => {
			if (!isStudyToolsName(args)) throw new StudyToolsRefusal('Memo arguments refused')
			signal.throwIfAborted()
			const memo = this.#agent.context.memos.memo(args.name)
			if (memo === undefined) throw new StudyToolsRefusal('Memo is absent')
			return memo.content
		})
	}

	async #skill(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		return this.#executeTool(args, context, async (signal) => {
			if (!isStudyToolsName(args)) throw new StudyToolsRefusal('Skill arguments refused')
			signal.throwIfAborted()
			const skill = this.#agent.context.skills.skill(args.name)
			if (skill === undefined) throw new StudyToolsRefusal('Skill is absent')
			this.#agent.context.instructions.add({
				name: STUDY_TOOLS_SKILL_PREFIX + args.name,
				content: skill.content,
			})
			return STUDY_TOOLS_LOADED
		})
	}

	#bind(id: string): ConversationInterface {
		const known = this.#conversations.get(id)
		if (known !== undefined) return known
		const conversation = this.#agent.context.conversations.add({ id })
		this.#conversations.set(id, conversation)
		return conversation
	}

	async #executeTool(
		args: Readonly<Record<string, unknown>>,
		context: ToolContext,
		operation: StudyToolsOperation,
	): Promise<JSONValue> {
		const workload = this.#current()
		if (workload === undefined) throw new StudyError('CONFIG', 'No tools workload is active')
		const request = encodeStudyJSON(args).byteLength
		if (request > STUDY_TOOLS_BYTES) throw new StudyToolsRefusal('Oversized tool arguments refused')
		const started = performance.now()
		const ticket: StudyTicket = await workload.context.meter.admit({
			role: 'tool',
			tokens: 0,
			bytes: STUDY_TOOLS_BYTES,
		})
		try {
			const signal = AbortSignal.any([
				context.signal,
				workload.context.signal,
				workload.context.meter.signal,
				ticket.signal,
			])
			signal.throwIfAborted()
			const value = await operation(signal).catch((error: unknown) => {
				if (!isStudyToolsRefusal(error)) throw error
				ticket.finish({
					role: 'tool',
					calls: 1,
					tokens: undefined,
					bytes: request + new TextEncoder().encode(error.message).byteLength,
					duration: Math.ceil(performance.now() - started),
				})
				throw error
			})
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

	// Answers an asked call from the live goal's declared approval. `pending` cancels the goal's
	// workload and answers only after the run's signal aborts, so the Agent's race settles first.
	// An undeclared approval rejects, which the Agent reads as an unanswered ask.
	#approve(signal: AbortSignal): Promise<boolean> {
		const workload = this.#current()
		const approval = workload?.input.approval
		if (approval === 'approve') return Promise.resolve(true)
		if (approval === 'refuse') return Promise.resolve(false)
		if (workload === undefined || approval === undefined)
			return Promise.reject(new StudyToolsRefusal('Undeclared workload approval refused'))
		const answer = Promise.withResolvers<boolean>()
		signal.addEventListener('abort', () => answer.resolve(false), { once: true })
		workload.controller.abort()
		return answer.promise
	}

	// The session refuses a second goal while one is live, so the registry holds at most one workload.
	#current(): StudyToolsWorkload | undefined {
		const [workload] = this.#live
		return workload
	}

	#capture(event: 'tool' | 'denial', project: () => JSONValue): void {
		const workload = this.#current()
		try {
			if (workload === undefined)
				throw new StudyError('FAULT', 'Admitted Agent supplied invalid tool observation')
			const value = project()
			workload.record({ event, goal: workload.goal, value })
		} catch (error) {
			workload?.fail(error)
		}
	}

	async #dispose(): Promise<void> {
		this.#agent.abort(new Error('Tools session closed'))
		await Promise.allSettled(this.#flights)
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
