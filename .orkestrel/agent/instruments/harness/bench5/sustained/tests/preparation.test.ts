import { writeDeploymentFixture } from '../../matrix/tests/helpers.js'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { HARNESS, MODELS } from '../../constants.js'
import { MatrixPeer } from '../../tests/matrixFixture.js'
import { Comparison } from '../../matrix/Comparison.js'
import { Refit } from '../../refit/Refit.js'
import { buildOptions } from '../../tests/refit/helpers.js'
import { hashFile, readRefitAssessment } from '../../refit/helpers.js'
import { isRefitGeneration, isRefitItem, isRefitAttempt } from '../../refit/validators.js'
import { readFrozen } from '../../matrix/helpers.js'
import { computeDigest, readJSON, readRows } from '../../helpers.js'
import { readPreparationFailure, readPilotFeasibility, readSustainedSelection } from '../helpers.js'
import { readSustainedPreparation } from '../parsers.js'
import { Peer } from './Peer.js'
import { runCommand } from './helpers.js'

it('retains authentic exposure-only pilots and rejected fits through ranked inconclusive reporting', async () => {
	const parent = resolve('tmp/units/aggregate-preparation-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'proof-'))
	const workload = resolve('tmp/units/aggregate-runtime-workload-audit-2')
	const runtime = join(workload, 'runtime/development.json')
	const evaluation = join(workload, 'runtime/evaluation.json')
	const peer = new Peer()
	const matrix = new MatrixPeer()
	const url = await peer.start()
	const matrixURL = await matrix.start()
	const candidates: string[] = []
	let generationHash = ''
	try {
		writeFileSync(join(directory, 'seed.jsonl'), '')
		writeFileSync(join(directory, 'empty-plan.json'), '[]')
		for (const key of ['q4', 'g4', 'q2', 'g2']) {
			const base = join(directory, key)
			const frozen = join(base, 'freeze/manifest.json')
			const resource = join(base, 'resource/manifest.json')
			const pilot = join(base, 'pilot/manifest.json')
			assert.equal(
				await runCommand('matrix', [
					'freeze',
					'--deployment',
					writeDeploymentFixture(directory),
					'--key',
					key,
					'--think',
					'false',
					'--seed',
					join(directory, 'seed.jsonl'),
					'--settings',
					join(HARNESS, 'bench5/settings.json'),
					'--out',
					join(base, 'freeze'),
					'--live',
					'--url',
					matrixURL,
				]),
				0,
			)
			assert.equal(
				await runCommand('matrix', [
					'resource',
					'--frozen',
					frozen,
					'--out',
					join(base, 'resource'),
					'--live',
					'--url',
					matrixURL,
				]),
				0,
			)
			const configuration = readFrozen(hashFile(frozen))
			const fit = join(base, 'fixture-fit.json')
			writeFileSync(
				fit,
				JSON.stringify({
					agree: 0.8,
					change: 0.56,
					separated: true,
					matrix: {
						summarizer: configuration.summarizer,
						judge: configuration.judge,
						files: configuration.files,
						settings: configuration.settings.hash,
						seed: configuration.seed.hash,
					},
				}),
			)
			assert.equal(
				await runCommand('matrix', [
					'pilot',
					'--frozen',
					frozen,
					'--resource',
					resource,
					'--fit',
					fit,
					'--out',
					join(base, 'pilot'),
					'--live',
					'--url',
					matrixURL,
				]),
				3,
			)
			const refused = readJSON(pilot)
			assert.ok(isRecord(refused) && isRecord(refused.attempt))
			assert.equal(refused.accepted, false)
			assert.equal(refused.attempt.accepted, true)
			assert.deepEqual(refused.attempt.failures, [])
			assert.equal(
				readPilotFeasibility(hashFile(pilot), hashFile(frozen), hashFile(resource)),
				false,
			)
			const forged = join(base, 'forged-pilot.json')
			writeFileSync(forged, JSON.stringify({ ...refused, accepted: true, failures: [] }))
			assert.throws(
				() => readPilotFeasibility(hashFile(forged), hashFile(frozen), hashFile(resource)),
				/contradicts raw/,
			)
			if (key !== 'q4')
				assert.throws(
					() =>
						readPilotFeasibility(
							hashFile(pilot),
							hashFile(join(directory, 'q4/freeze/manifest.json')),
							hashFile(resource),
						),
					/configuration|custody/,
				)
			const candidate = join(base, 'candidate.json')
			assert.equal(
				await runCommand('sustained', [
					'candidate',
					'--frozen',
					frozen,
					'--resource',
					resource,
					'--pilot',
					pilot,
					'--out',
					candidate,
				]),
				3,
			)
			candidates.push('--candidate', candidate)
			if (key !== 'q4') continue
			assert.equal(
				await runCommand(
					'sustained',
					[
						'select',
						'--development',
						runtime,
						'--evaluation',
						evaluation,
						...candidates,
						'--seed',
						'17',
						'--out',
						join(base, 'incomplete.json'),
					],
					/selection contradicts ranked feasibility evidence/,
				),
				1,
			)
			const classification = join(base, 'filing/classification.json')
			const corpus = join(base, 'corpus')
			assert.equal(
				await runCommand('sustained', [
					'filing',
					'--frozen',
					frozen,
					'--resource',
					resource,
					'--runtime',
					runtime,
					'--out',
					join(base, 'filing'),
					'--live',
					'--url',
					url,
				]),
				0,
			)
			const common = [
				'--frozen',
				frozen,
				'--runtime',
				runtime,
				'--classification',
				classification,
				'--model',
				MODELS.q4,
			]
			assert.equal(
				await runCommand('refit', [
					'freeze',
					...common,
					'--cache',
					join(base, 'filing/cache'),
					'--out',
					corpus,
				]),
				0,
			)
			const before = peer.calls.length
			const unsent: string[] = []
			for (const phase of ['aborted', 'offline']) {
				const out = join(base, phase)
				assert.equal(
					await new Refit(
						buildOptions(out, {
							phase: 'generate',
							corpus,
							frozen,
							runtime,
							classification,
							model: MODELS.q4,
							cache: join(base, `${phase}-cache`),
							live: false,
							url,
						}),
					).execute(
						phase === 'aborted' ? AbortSignal.abort(new Error('pre-send control')) : undefined,
					),
					3,
				)
				assert.equal(peer.calls.length, before)
				const costs = readSustainedPreparation(join(out, 'manifest.json'))[0]
				unsent.push('--preparation', join(out, 'manifest.json'))
				assert.ok(costs !== undefined && costs.failures.length > 0)
				assert.ok(costs.costs.wire.every((cost) => cost.requests === 0 && cost.missing === 0))
				assert.throws(
					() =>
						readPreparationFailure(
							hashFile(join(out, 'manifest.json')),
							hashFile(runtime),
							hashFile(frozen),
						),
					/operational generation fault/,
				)
				const report = join(base, `${phase}-matrix-costs.json`)
				assert.equal(
					Comparison.execute([
						'report',
						'--base',
						base,
						'--plan',
						join(directory, 'empty-plan.json'),
						'--preparation',
						join(out, 'manifest.json'),
						'--out',
						report,
					]),
					0,
				)
				const matrixCosts = readJSON(report)
				assert.ok(isRecord(matrixCosts) && Array.isArray(matrixCosts.preparation))
				const calibration: unknown = matrixCosts.preparation[0]
				assert.ok(isRecord(calibration) && Array.isArray(calibration.wire))
				assert.ok(
					calibration.wire.every(
						(cost: unknown) => isRecord(cost) && cost.requests === 0 && cost.missing === 0,
					),
				)
			}
			const distinct = join(base, 'distinct-matrix-costs.json')
			assert.equal(
				Comparison.execute([
					'report',
					'--base',
					base,
					'--plan',
					join(directory, 'empty-plan.json'),
					...unsent,
					'--out',
					distinct,
				]),
				0,
			)
			const distinctCosts = readJSON(distinct)
			assert.ok(isRecord(distinctCosts) && Array.isArray(distinctCosts.preparation))
			assert.equal(distinctCosts.preparation.length, 2)
			const generated = join(base, 'generated')
			assert.equal(
				await runCommand('refit', [
					'generate',
					...common,
					'--corpus',
					corpus,
					'--cache',
					join(base, 'generation-cache'),
					'--out',
					generated,
					'--live',
					'--url',
					url,
				]),
				0,
			)
			const manifest = readJSON(join(generated, 'manifest.json'))
			const attempts = readRows(join(generated, 'attempts.jsonl'))
			const packet = readRows(join(generated, 'packet.jsonl'))
			assert.ok(
				isRefitGeneration(manifest) && attempts.every(isRefitAttempt) && packet.every(isRefitItem),
			)
			generationHash = hashFile(join(generated, 'manifest.json')).hash
			const generationCosts = readSustainedPreparation(join(generated, 'manifest.json'))[0]
			assert.ok(generationCosts !== undefined)
			assert.equal(
				generationCosts.costs.wire.reduce((total, cost) => total + cost.requests, 0),
				peer.calls.length - before,
			)
			const labels = join(base, 'ambiguous-labels.json')
			writeFileSync(
				labels,
				JSON.stringify({
					authority: 'root-adjudicated',
					corpus: manifest.corpus,
					attempts: manifest.attempts,
					packet: manifest.packet,
					manifest: generationHash,
					labels: packet.map((item) => ({
						id: item.id,
						item: computeDigest(item),
						verdict: 'ambiguous',
						propositions: [
							{
								text: attempts.find((attempt) => attempt.id === item.id)?.prose ?? '',
								verdict: 'ambiguous',
								evidence: [item.sources[0]?.text ?? ''],
							},
						],
					})),
				}),
			)
			const fitted = join(base, 'fitted')
			assert.equal(
				await runCommand('refit', [
					'fit',
					...common,
					'--corpus',
					corpus,
					'--attempts',
					generated,
					'--labels',
					labels,
					'--out',
					fitted,
				]),
				3,
			)
			assert.equal(existsSync(join(fitted, 'fit.json')), false)
			const diagnosis = join(fitted, 'diagnosis.json')
			const assessment = readRefitAssessment(hashFile(diagnosis))
			assert.equal(assessment.accepted, false)
			readPreparationFailure(hashFile(diagnosis), hashFile(runtime), hashFile(frozen))
			const costs = readSustainedPreparation(diagnosis)[0]
			assert.equal(costs?.identity, generationHash)
			assert.deepEqual(costs?.costs, generationCosts.costs)
			assert.deepEqual(costs?.failures, assessment.reasons)
			for (const [at, aliases] of [
				[join(generated, 'manifest.json'), diagnosis],
				[diagnosis, join(generated, 'manifest.json')],
			].entries()) {
				const report = join(base, `alias-matrix-costs-${at}.json`)
				assert.equal(
					Comparison.execute([
						'report',
						'--base',
						base,
						'--plan',
						join(directory, 'empty-plan.json'),
						...aliases.flatMap((path) => ['--preparation', path]),
						'--out',
						report,
					]),
					0,
				)
				const value = readJSON(report)
				assert.ok(isRecord(value) && Array.isArray(value.preparation))
				assert.equal(value.preparation.length, 1)
				const calibration: unknown = value.preparation[0]
				assert.ok(isRecord(calibration))
				assert.equal(calibration.identity, generationHash)
				assert.deepEqual(
					calibration.wire,
					generationCosts.costs.wire.filter((cost) => cost.phase === 'trajectory'),
				)
				assert.ok(Array.isArray(calibration.controls))
				assert.deepEqual(
					calibration.controls.map((cost: unknown) => {
						assert.ok(isRecord(cost))
						return { ...cost, phase: 'calibration' }
					}),
					generationCosts.costs.wire.filter((cost) => cost.phase === 'calibration'),
				)
			}
			const altered = join(base, 'altered-diagnosis.json')
			writeFileSync(altered, JSON.stringify({ ...assessment, reasons: ['invented refusal'] }))
			assert.throws(() => readRefitAssessment(hashFile(altered)), /contradicts bound/)
			writeFileSync(
				altered,
				JSON.stringify({
					...assessment,
					preparation: { ...assessment.preparation, labels: hashFile(fit) },
				}),
			)
			assert.throws(() => readRefitAssessment(hashFile(altered)), /label contract|custody/)
			assert.throws(
				() => readPreparationFailure(hashFile(diagnosis), hashFile(evaluation), hashFile(frozen)),
				/custody differs/,
			)
			const failed = join(base, 'fit-candidate.json')
			assert.equal(
				await runCommand('sustained', [
					'candidate',
					'--frozen',
					frozen,
					'--resource',
					resource,
					'--runtime',
					runtime,
					'--preparation',
					diagnosis,
					'--out',
					failed,
				]),
				3,
			)
			candidates[candidates.length - 1] = failed
		}
		const selection = join(directory, 'selection.json')
		assert.equal(
			await runCommand('sustained', [
				'select',
				'--development',
				runtime,
				'--evaluation',
				evaluation,
				...candidates,
				'--seed',
				'17',
				'--out',
				selection,
			]),
			3,
		)
		assert.equal(readSustainedSelection(selection).accepted, false)
		const report = join(directory, 'report.json')
		assert.equal(
			await runCommand('sustained-audit', ['report', '--selection', selection, '--out', report]),
			0,
		)
		const output = readJSON(report)
		assert.ok(isRecord(output) && Array.isArray(output.preparation))
		assert.equal(output.recommendation, 'inconclusive')
		assert.equal(
			output.preparation.filter(
				(entry: unknown) => isRecord(entry) && entry.identity === generationHash,
			).length,
			1,
		)
		console.log(`PREPARATION_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
		await matrix.destroy()
	}
})
