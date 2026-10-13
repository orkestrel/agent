import type { RefitFile } from '../../refit/types.js'
import type { SustainedPreparation, SustainedSelection } from '../types.js'
import type { SustainedAuditInput, SustainedAuditPaths, SustainedKeys } from './types.js'
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { readWorkload } from '../../build/helpers.js'
import { readOracle } from '../../endurance/helpers.js'
import { hashFile, verifyFiles } from '../../refit/helpers.js'
import { readSustainedSelection, readSustainedPolicy } from '../helpers.js'
import { readSustainedPreparation, readSustainedRun } from '../parsers.js'
import { Adjudication } from './Adjudication.js'
import { Comparison } from './Comparison.js'
import { Packet } from './Packet.js'
import { SustainedAuditError } from './errors.js'
import { collectPreparations, verifyAuditIdentity, verifyOracleCustody } from './helpers.js'
import { isSustainedKeys, isSustainedLabels } from './validators.js'

/** Composes the real shared readers with create-only offline packets and reports. */
export class Audit {
	/** Executes a blind packet or custody-bound comparison without making model calls.
	 * @param argv - The operation followed by explicit named file arguments
	 * @returns Exit 0 after the create-only output completes
	 * @throws SustainedAuditError when arguments, custody, joins, or labels are refused
	 */
	static execute(argv: readonly string[]): number {
		const { values, positionals } = parseArgs({
			args: [...argv],
			allowPositionals: true,
			options: {
				selection: { type: 'string' },
				records: { type: 'string' },
				aggregate: { type: 'string' },
				oracle: { type: 'string' },
				seed: { type: 'string' },
				out: { type: 'string' },
				keys: { type: 'string' },
				packet: { type: 'string' },
				labels: { type: 'string' },
				preparation: { type: 'string', multiple: true },
			},
		})
		if (
			positionals.length !== 1 ||
			(positionals[0] !== 'blind' && positionals[0] !== 'report') ||
			values.selection === undefined ||
			values.out === undefined
		)
			throw new SustainedAuditError(
				'usage: sustained-audit.js blind|report --selection FILE --out FILE; accepted selections require --records DIR --aggregate DIR --oracle FILE and audit arguments',
			)
		const audit = new Audit()
		const reference = hashFile(resolve(values.selection))
		const selection = readSustainedSelection(reference.path)
		const out = resolve(values.out)
		if (!selection.accepted) {
			if (
				positionals[0] !== 'report' ||
				values.records !== undefined ||
				values.aggregate !== undefined ||
				values.oracle !== undefined ||
				values.keys !== undefined ||
				values.packet !== undefined ||
				values.labels !== undefined ||
				values.seed !== undefined
			)
				throw new SustainedAuditError(
					'unaccepted selection supports report without run or audit arguments',
				)
			audit.#write(
				out,
				new Comparison().inconclusive(
					selection,
					reference,
					audit.#preparation(selection, values.preparation ?? [], []),
				),
			)
			return 0
		}
		if (
			values.records === undefined ||
			values.aggregate === undefined ||
			values.oracle === undefined ||
			values.keys === undefined
		)
			throw new SustainedAuditError(
				'accepted selection requires --records DIR --aggregate DIR --oracle FILE --keys FILE',
			)
		const input = audit.#input(selection, reference, {
			records: resolve(values.records),
			aggregate: resolve(values.aggregate),
			oracle: resolve(values.oracle),
		})
		const keys = resolve(values.keys)
		if (positionals[0] === 'blind') {
			if (
				values.seed === undefined ||
				!/^-?\d+$/.test(values.seed) ||
				!Number.isSafeInteger(Number(values.seed)) ||
				values.packet !== undefined ||
				values.labels !== undefined ||
				values.preparation !== undefined
			)
				throw new SustainedAuditError(
					'blind requires --seed INTEGER and accepts no packet, labels, or preparation inputs',
				)
			audit.#blind(input, Number(values.seed), out, keys, hashFile(resolve(values.oracle)))
			return 0
		}
		if (values.packet === undefined || values.labels === undefined || values.seed !== undefined)
			throw new SustainedAuditError(
				'report requires --packet FILE --labels FILE and uses the seed bound into --keys',
			)
		audit.#report(
			input,
			keys,
			resolve(values.packet),
			resolve(values.labels),
			hashFile(resolve(values.oracle)),
			out,
			values.preparation ?? [],
		)
		return 0
	}

	#input(
		selection: SustainedSelection,
		reference: RefitFile,
		paths: SustainedAuditPaths,
	): SustainedAuditInput {
		const records = readSustainedRun(paths.records)
		const aggregate = readSustainedRun(paths.aggregate)
		const oracle = readOracle(paths.oracle)
		const workload = readWorkload(records.execution.runtime)
		verifyOracleCustody(hashFile(paths.oracle), workload.files)
		return { manifest: workload.manifest, selection, reference, records, aggregate, oracle }
	}

	#blind(
		input: SustainedAuditInput,
		seed: number,
		out: string,
		keys: string,
		oracle: RefitFile,
	): void {
		mkdirSync(dirname(out), { recursive: true })
		mkdirSync(dirname(keys), { recursive: true })
		this.#directories(out, keys)
		if (existsSync(out) || existsSync(keys))
			throw new SustainedAuditError('blind outputs are create-only')
		const blind = new Packet().build(input, seed)
		this.#write(out, blind.packet)
		const mapping: SustainedKeys = {
			protocol: 'e1',
			manifest: input.manifest,
			packet: hashFile(out),
			oracle,
			runtime: input.selection.evaluation,
			selection: input.reference,
			seed,
			keys: blind.keys,
		}
		this.#write(keys, mapping)
	}

	#report(
		input: SustainedAuditInput,
		keysPath: string,
		packetPath: string,
		labelsPath: string,
		oracle: RefitFile,
		out: string,
		preparation: readonly string[],
	): void {
		this.#directories(packetPath, keysPath)
		const keys: unknown = JSON.parse(readFileSync(keysPath, 'utf8'))
		const packet: unknown = JSON.parse(readFileSync(packetPath, 'utf8'))
		const labels: unknown = JSON.parse(readFileSync(labelsPath, 'utf8'))
		if (!isSustainedKeys(keys) || !isSustainedLabels(labels))
			throw new SustainedAuditError('malformed private keys or root adjudication')
		verifyFiles([
			keys.manifest,
			keys.packet,
			keys.oracle,
			keys.runtime,
			keys.selection,
			...keys.keys.flatMap((key) => key.files),
		])
		verifyAuditIdentity(keys, input, oracle, hashFile(packetPath))
		const blind = new Packet().build(input, keys.seed)
		if (!isDeepStrictEqual(packet, blind.packet) || !isDeepStrictEqual(keys.keys, blind.keys))
			throw new SustainedAuditError(
				'packet or private joins differ from actual frozen run products',
			)
		const adjudication = new Adjudication().read({
			packet: blind.packet,
			keys,
			labels,
			hashes: { packet: hashFile(packetPath).hash, keys: hashFile(keysPath).hash },
		})
		const report = new Comparison().build({
			...input,
			blind,
			adjudication,
			packet: hashFile(packetPath),
			labels: hashFile(labelsPath),
			preparation: this.#preparation(
				input.selection,
				preparation,
				[input.records.execution.classification, input.aggregate.execution.classification]
					.filter((file): file is RefitFile => file !== undefined)
					.map((file) => file.path),
			),
		})
		this.#write(out, report)
	}

	#preparation(
		selection: SustainedSelection,
		paths: readonly string[],
		additional: readonly string[],
	): readonly SustainedPreparation[] {
		const references = new Set([...paths.map((path) => resolve(path)), ...additional])
		const candidates =
			selection.policy === undefined
				? selection.candidates
				: [...readSustainedPolicy(selection.policy).selection.candidates, ...selection.candidates]
		for (const candidate of candidates) {
			for (const file of [
				candidate.resource,
				candidate.pilot,
				candidate.classification,
				candidate.fit,
				candidate.preparation,
				candidate.refusal,
				candidate.exploration?.diagnosis,
			])
				if (file !== undefined) references.add(file.path)
			if (candidate.exploration !== undefined) {
				for (const file of Object.values(candidate.exploration.matrix)) references.add(file.path)
			}
			for (const attempt of candidate.attempts)
				if (attempt.files.length > 0) references.add(join(attempt.run, 'run.json'))
		}
		return collectPreparations([...references].flatMap((path) => readSustainedPreparation(path)))
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
