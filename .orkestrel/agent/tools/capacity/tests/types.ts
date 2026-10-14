/** Holds protocol fixture behavior without altering the canonical harness. */
export interface CapacityDaemonOptions {
	readonly unfinished: boolean
	readonly empty: boolean
	readonly fault: boolean
}
