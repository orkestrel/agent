import type { ComponentReading, ScreenPacket } from './types.ts'

/** Builds inert component readings for the real composition reducer.
 * @param packet - The complete prepared screen
 * @returns Exact reading membership with separated supported and unsafe scores
 * @example buildReadings(packet).length
 */
export function buildReadings(packet: ScreenPacket): readonly ComponentReading[] {
	return packet.sequence.map(entry => {
		const check = packet.checks.find(value => value.name === entry.name)
		if (check === undefined) throw new Error('Fixture check absent')
		return { ...entry, row: check.row, label: check.label, score: check.label === 'supported' ? 0.9 : 0.2 }
	})
}
