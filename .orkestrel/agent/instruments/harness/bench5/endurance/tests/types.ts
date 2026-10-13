/** Holds a frozen invalid-artifact mutation and its required refusal. */
export interface EnduranceMutation {
	readonly id: string
	readonly target: 'runtime' | 'oracle'
	readonly path: ReadonlyArray<string | number>
	readonly value: unknown
	readonly reason: string
}
