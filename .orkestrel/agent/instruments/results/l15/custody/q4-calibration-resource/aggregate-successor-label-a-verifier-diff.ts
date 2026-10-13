import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const target = resolve(root, 'tmp/units/aggregate-successor-label-a-verifier-adaptation.patch')
if (existsSync(target)) throw new Error('Create-only diff already exists')
let output: string
try {
	output = execFileSync('git', ['diff', '--no-index', '--no-ext-diff', '--', 'tmp/units/aggregate-successor-label-a-check.ts', 'tmp/units/aggregate-successor-label-a-verifier-check.ts'], {
		cwd: root,
		encoding: 'utf8',
		shell: false,
		windowsHide: true,
		maxBuffer: 16 * 1024 * 1024
	})
} catch (error) {
	if (typeof error === 'object' && error !== null && 'status' in error && error.status === 1 && 'stdout' in error) {
		output = String(error.stdout)
	} else {
		throw error
	}
}
writeFileSync(target, output, { flag: 'wx' })
