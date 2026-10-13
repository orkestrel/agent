import type { Limits } from './types.ts'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Locates the assigned instrument directory. */
export const UNIT = dirname(fileURLToPath(import.meta.url))
/** Locates the scaffold checkout. */
export const ROOT = resolve(UNIT, '../../..')
/** Locates the create-only prepared packet directory. */
export const PREPARED = resolve(UNIT, 'prepared')
/** Locates the frozen packet. */
export const PACKET = resolve(PREPARED, 'packet.json')
/** Names the exclusively controlled local endpoint. */
export const DAEMON = 'http://127.0.0.1:11434'
/** Names the explicit execution host condition. */
export const HOST = 'Windows; controlled attached daemon; exclusive serial client; no other service requests'
/** Freezes diagnostic operational ceilings. */
export const LIMITS: Limits = Object.freeze({ inference: 2, request: 32768, response: 262144, metadata: 1048576, timeout: 60000, snapshot: 30000, duration: 180000 })
/** Names the fixed workload order. */
export const WORKLOADS: readonly string[] = Object.freeze(['g2'])
/** Names every runtime operator file. */
export const OPERATOR_FILES: readonly string[] = Object.freeze(['types.ts', 'constants.ts', 'helpers.ts', 'Driver.ts', 'Daemon.ts', 'main.ts', 'prepare.ts', 'execute.ts', 'start.ts'])
/** Names retained evidence inputs whose bytes the packet binds. */
export const EVIDENCE_FILES: readonly string[] = Object.freeze([
	'.orkestrel/agent/instruments/units/aggregates/reports/resumption-full-admission-direction.md',
	'.orkestrel/agent/instruments/units/aggregates/reports/resumption-full-admission-clarification.md',
	'tmp/units/aggregate-capacity-startup-report.md',
	'tmp/units/aggregate-focused-screen/live-forward-reverse/01-statement-a.request.json',
	'tmp/units/aggregate-judge-counterfactual/helpers.ts',
	'tmp/units/aggregate-judge-counterfactual/constants.ts',
	'tmp/units/aggregate-capacity-probe/live1/g2-generation.request.bin',
	'tmp/units/aggregate-capacity-probe/prepared/packet.json',
])
/** Names created diagnostic input artifacts. */
export const INPUT_FILES: readonly string[] = Object.freeze(['generation.json'])
/** Locates the retained generation request whose strings remain unchanged. */
export const ORIGINAL_REQUEST = resolve(ROOT, 'tmp/units/aggregate-capacity-probe/live1/g2-generation.request.bin')
/** Declares only the nonsecret child-launch overrides the receipt retains. */
export const CHILD_VALUES: Readonly<Record<string, string>> = Object.freeze({ OLLAMA_HOST: DAEMON, OLLAMA_NUM_PARALLEL: '1', OLLAMA_MAX_LOADED_MODELS: '0', LLAMA_ARG_CONTEXT_SHIFT: '0', LLAMA_ARG_N_PARALLEL: '1' })
/** Freezes the specified diagnostic chat sampler. */
export const SAMPLER = Object.freeze({ temperature: 0, seed: 7, presence_penalty: 1.5, top_k: 20, top_p: 0.95 })
