import type { RefitFile } from '../../refit/types.js'
import type { ContinuousAuditInput, ContinuousKeys } from './types.js'
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readOracle } from '../../endurance/helpers.js'
import { hashFile, verifyFiles } from '../../refit/helpers.js'
import { Adjudication } from '../../sustained/audit/Adjudication.js'
import { SustainedAuditError } from '../../sustained/audit/errors.js'
import { listLabelFailures, verifyOracleCustody } from '../../sustained/audit/helpers.js'
import { isSustainedLabels } from '../../sustained/audit/validators.js'
import { readContinuousManifest, readContinuousRun, readContinuousWorkload } from '../helpers.js'
import { isContinuousKeys, isContinuousPacket } from '../validators.js'
import { Blind } from './Blind.js'
import { Report } from './Report.js'

/** Composes the shared run readers with the create-only blind packet and the comparison report, without model calls. */
export class Audit {
	/** Writes the public packet and the private keys for one manifest's runs.
	 * @param manifestPath - The frozen manifest
	 * @param runs - The run directories, one per arm
	 * @param oraclePath - The private oracle; its bytes must be pinned by the manifest's workload
	 * @param out - The packet path; create-only
	 * @param keys - The keys path; create-only, in a directory apart from the packet
	 * @throws SustainedAuditError when custody, joins, or output paths are refused
	 */
	blind(
		manifestPath: string,
		runs: readonly string[],
		oraclePath: string,
		out: string,
		keys: string,
	): void {
		const input = this.#input(manifestPath, runs, oraclePath)
		const packetPath = resolve(out)
		const keysPath = resolve(keys)
		mkdirSync(dirname(packetPath), { recursive: true })
		mkdirSync(dirname(keysPath), { recursive: true })
		this.#directories(packetPath, keysPath)
		if (existsSync(packetPath) || existsSync(keysPath))
			throw new SustainedAuditError('blind outputs are create-only')
		const blind = new Blind().build(input, input.manifest.blind)
		this.#write(packetPath, blind.packet)
		const mapping: ContinuousKeys = {
			protocol: 'c1',
			manifest: input.reference,
			workload: input.manifest.workload,
			runtime: input.manifest.runtime,
			oracle: hashFile(resolve(oraclePath)),
			packet: hashFile(packetPath),
			seed: input.manifest.blind,
			keys: blind.keys,
		}
		this.#write(keysPath, mapping)
	}

	/** Rebuilds the packet from the runs, checks the private keys and the root labels against it, and writes the report.
	 * @param manifestPath - The frozen manifest
	 * @param runs - The run directories, one per arm
	 * @param oraclePath - The private oracle
	 * @param packetPath - The public packet the adjudicators read
	 * @param keysPath - The private keys
	 * @param labelsPath - The root adjudication
	 * @param out - The report path; create-only
	 * @throws SustainedAuditError when the packet, keys, or labels differ from the actual runs
	 */
	report(
		manifestPath: string,
		runs: readonly string[],
		oraclePath: string,
		packetPath: string,
		keysPath: string,
		labelsPath: string,
		out: string,
	): void {
		const input = this.#input(manifestPath, runs, oraclePath)
		this.#directories(resolve(packetPath), resolve(keysPath))
		const keys: unknown = JSON.parse(readFileSync(keysPath, 'utf8'))
		const packet: unknown = JSON.parse(readFileSync(packetPath, 'utf8'))
		const labels: unknown = JSON.parse(readFileSync(labelsPath, 'utf8'))
		if (!isContinuousKeys(keys) || !isSustainedLabels(labels))
			throw new SustainedAuditError('malformed private keys or root adjudication')
		verifyFiles([keys.manifest, keys.workload, keys.runtime, keys.oracle, keys.packet])
		const oracle = hashFile(resolve(oraclePath))
		if (
			!isDeepStrictEqual(keys.manifest, input.reference) ||
			!isDeepStrictEqual(keys.workload, input.manifest.workload) ||
			!isDeepStrictEqual(keys.runtime, input.manifest.runtime) ||
			!isDeepStrictEqual(keys.oracle, oracle) ||
			!isDeepStrictEqual(keys.packet, hashFile(resolve(packetPath))) ||
			keys.seed !== input.manifest.blind
		)
			throw new SustainedAuditError(
				'private keys bind another manifest, workload, runtime, oracle, or packet',
			)
		const blind = new Blind().build(input, keys.seed)
		if (!isDeepStrictEqual(packet, blind.packet) || !isDeepStrictEqual(keys.keys, blind.keys))
			throw new SustainedAuditError('packet or private joins differ from the actual run products')
		const adjudication = new Adjudication().read({
			packet: blind.packet,
			keys: { keys: keys.keys, packet: keys.packet },
			labels,
			hashes: { packet: hashFile(resolve(packetPath)).hash, keys: hashFile(resolve(keysPath)).hash },
		})
		const report = new Report().build({
			...input,
			blind,
			adjudication,
			packet: hashFile(resolve(packetPath)),
			labels: hashFile(resolve(labelsPath)),
		})
		this.#write(resolve(out), report)
	}

	/** Checks a partial labels file against the public packet and prints one line per refused label.
	 * @param packetPath - The public packet
	 * @param labelsPath - A labels file holding any subset of the packet's items
	 * @returns The refused label ids with their failures, and the ids the file does not label
	 * @throws SustainedAuditError when the labels file is malformed
	 */
	labels(
		packetPath: string,
		labelsPath: string,
	): {
		readonly refused: ReadonlyArray<{ readonly id: string; readonly failures: readonly string[] }>
		readonly unlabeled: readonly string[]
	} {
		const packet: unknown = JSON.parse(readFileSync(packetPath, 'utf8'))
		const labels: unknown = JSON.parse(readFileSync(labelsPath, 'utf8'))
		if (!isContinuousPacket(packet)) throw new SustainedAuditError('malformed packet')
		if (!isSustainedLabels(labels)) throw new SustainedAuditError('malformed labels')
		const refused: Array<{ readonly id: string; readonly failures: readonly string[] }> = []
		for (const label of labels.labels) {
			const item = packet.items.find((entry) => entry.id === label.id)
			const failures =
				item === undefined ? ['label names no packet item'] : listLabelFailures(item, label)
			if (failures.length > 0) refused.push({ id: label.id, failures })
		}
		const unlabeled = packet.items
			.filter((item) => !labels.labels.some((label) => label.id === item.id))
			.map((item) => item.id)
		return { refused, unlabeled }
	}

	#input(manifestPath: string, paths: readonly string[], oraclePath: string): ContinuousAuditInput {
		const reference: RefitFile = hashFile(resolve(manifestPath))
		const { manifest } = readContinuousManifest(reference.path)
		const runs = paths.map((path) => readContinuousRun(resolve(path)))
		const oracle = readOracle(resolve(oraclePath))
		verifyOracleCustody(hashFile(resolve(oraclePath)), readContinuousWorkload(manifest.workload.path))
		return { manifest, reference, runs, oracle }
	}

	#directories(packet: string, keys: string): void {
		const publicDirectory = realpathSync(dirname(packet))
		const privateDirectory = realpathSync(dirname(keys))
		const left = statSync(publicDirectory)
		const right = statSync(privateDirectory)
		if (publicDirectory === privateDirectory || (left.dev === right.dev && left.ino === right.ino))
			throw new SustainedAuditError('packet and private key directories must differ')
	}

	#write(path: string, value: unknown): void {
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
	}
}
