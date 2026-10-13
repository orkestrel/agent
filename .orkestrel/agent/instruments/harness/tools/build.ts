import type { BuildFile, BuildManifest } from '../bench5/build/types.js'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT = join(ROOT, '.build')

function listFiles(path: string): readonly string[] {
	return readdirSync(path, { withFileTypes: true })
		.flatMap((entry) => {
			if (entry.isSymbolicLink()) throw new Error(`build refuses symlink: ${entry.name}`)
			const next = join(path, entry.name)
			return entry.isDirectory() ? listFiles(next) : [next]
		})
		.sort()
}

function hash(path: string): string {
	return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function identify(root: string, path: string): BuildFile {
	return { path: relative(root, path).split(sep).join('/'), hash: hash(path) }
}

function main(): void {
	const { values } = parseArgs({
		options: {
			compiler: { type: 'string' },
			types: { type: 'string' },
			resource: { type: 'string', multiple: true },
		},
	})
	if (values.compiler === undefined || values.types === undefined)
		throw new Error('usage: node tools/build.ts --compiler TYPESCRIPT_BIN_TSC --types TYPE_ROOT')
	const compiler = resolve(values.compiler)
	if (existsSync(OUTPUT)) {
		if (resolve(OUTPUT) !== resolve(ROOT, '.build'))
			throw new Error('invalid generated output boundary')
		rmSync(OUTPUT, { recursive: true })
	}
	const compiled = spawnSync(
		process.execPath,
		[
			compiler,
			'--project',
			join(ROOT, 'build.json'),
			'--typeRoots',
			resolve(values.types),
			'--listFiles',
		],
		{ encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	)
	if (compiled.status !== 0) {
		process.stdout.write(compiled.stdout)
		process.stderr.write(compiled.stderr)
		throw new Error(`compiler failed: ${compiled.status}`)
	}
	const external = compiled.stdout
		.split(/\r?\n/)
		.filter(
			(path) =>
				path.length > 0 &&
				(!resolve(path).startsWith(`${ROOT}${sep}`) ||
					path.replaceAll('\\', '/').includes('/node_modules/')),
		)
	const inputs = [
		...new Set([
			compiler,
			resolve(dirname(compiler), '../lib/tsc.js'),
			resolve(dirname(compiler), '../lib/_tsc.js'),
			...external,
		]),
	]
		.sort()
		.map((path) => ({ path: resolve(path), hash: hash(path) }))
	const sources = ['bench5', 'tools', 'audit', 'vendor', 'bench', 'bench3', 'data']
		.flatMap((name) => listFiles(join(ROOT, name)))
		.filter((path) => !path.includes(`${sep}node_modules${sep}`))
	sources.push(
		join(ROOT, 'build.json'),
		join(ROOT, 'package.json'),
		join(ROOT, 'package-lock.json'),
		join(ROOT, 'README.md'),
	)
	for (const path of sources) {
		if (path.endsWith('.ts') && !path.endsWith('.d.ts')) continue
		const target = join(OUTPUT, relative(ROOT, path))
		mkdirSync(dirname(target), { recursive: true })
		copyFileSync(path, target)
	}
	const version = spawnSync(process.execPath, [compiler, '--version'], { encoding: 'utf8' })
	if (version.status !== 0) throw new Error('compiler version unavailable')
	const manifest: BuildManifest = {
		version: 1,
		compiler: { path: compiler, hash: hash(compiler), version: version.stdout.trim(), inputs },
		sources: sources.sort().map((path) => identify(ROOT, path)),
		resources: [
			resolve(ROOT, '../units/aggregates/endurance/manifest.json'),
			...(values.resource ?? []).map((path) => resolve(path)),
		].map((path) => ({ path, hash: hash(path) })),
		outputs: listFiles(OUTPUT).map((path) => identify(OUTPUT, path)),
	}
	writeFileSync(join(OUTPUT, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
		flag: 'wx',
	})
	console.log(`built ${manifest.outputs.length} files from ${manifest.sources.length} exact inputs`)
}

main()
