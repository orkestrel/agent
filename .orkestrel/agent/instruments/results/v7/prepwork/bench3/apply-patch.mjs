// Applies an RFC 6902 patch list of test, replace, and add operations to a one-line scenario.json in place.
import { readFileSync, writeFileSync } from 'node:fs'

const [target, patchFile] = process.argv.slice(2)
const document = JSON.parse(readFileSync(target, 'utf8'))
const patch = JSON.parse(readFileSync(patchFile, 'utf8'))
const walk = (path) => {
	const parts = path.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
	const last = parts.pop()
	let node = document
	for (const part of parts) {
		node = node[part]
		if (node === undefined) throw new Error(`no node at ${path}`)
	}
	return { node, last }
}
for (const op of patch) {
	const { node, last } = walk(op.path)
	if (op.op === 'test') {
		if (JSON.stringify(node[last]) !== JSON.stringify(op.value)) throw new Error(`test failed at ${op.path}`)
	} else if (op.op === 'replace') {
		if (!(last in node)) throw new Error(`replace target missing at ${op.path}`)
		node[last] = op.value
	} else if (op.op === 'add') {
		if (Array.isArray(node) && last === '-') node.push(op.value)
		else if (Array.isArray(node)) node.splice(Number(last), 0, op.value)
		else node[last] = op.value
	} else throw new Error(`unsupported op ${op.op}`)
}
for (const goal of document.goals) for (const source of goal.forbiddenPatterns ?? []) new RegExp(source, 'i')
writeFileSync(target, `${JSON.stringify(document)}\n`)
process.stdout.write(`applied ${patch.length} operations to ${target}\n`)
