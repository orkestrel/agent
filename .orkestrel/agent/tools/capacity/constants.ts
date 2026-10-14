import type { CapacityCell, CapacityProfile } from './types.ts'
import { resolve } from 'node:path'

/** Pins the sole emitted harness that may execute this qualification. */
export const CAPACITY_BUILD = resolve(
	import.meta.dirname,
	'../../instruments/harness-capacity/.build/build-manifest.json',
)
/** Pins the canonical emitted child entry. */
export const CAPACITY_ENTRY = resolve(
	import.meta.dirname,
	'../../instruments/harness-capacity/.build/bench5/continuous.js',
)
/** Freezes qualification population before any call. */
export const CAPACITY_CELLS: readonly CapacityCell[] = Object.freeze([
	{ key: 'q4', arm: 'records' },
	{ key: 'q4', arm: 'compaction' },
	{ key: 'q2', arm: 'records' },
	{ key: 'q2', arm: 'compaction' },
])
/** Freezes finite outer bounds over the entire population. */
export const CAPACITY_LIMITS = Object.freeze({
	wall: 1800000,
	calls: 512,
	tokens: 1000000,
	metadata: 90000,
	goal: 900000,
	requests: 128,
	recap: 2048,
})
/** Freezes the initial candidate. */
export const CAPACITY_INITIAL: CapacityProfile = Object.freeze({
	window: 12288,
	reserve: 4096,
	safety: 512,
	timeout: 180000,
})
/** Freezes the root-selected escalation candidate. */
export const CAPACITY_EXTENDED: CapacityProfile = Object.freeze({
	window: 16384,
	reserve: 8192,
	safety: 512,
	timeout: 360000,
})
/** Freezes fictitious customer identifiers and their orders. */
export const CAPACITY_CUSTOMERS = Object.freeze([
	{ name: 'Aster Example', id: 'SC-2001', order: 'SO-1001' },
	{ name: 'Beryl Example', id: 'SC-2002', order: 'SO-1002' },
	{ name: 'Cedar Example', id: 'SC-2003', order: 'SO-1003' },
])
