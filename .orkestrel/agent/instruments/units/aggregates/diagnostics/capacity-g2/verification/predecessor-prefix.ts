import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
const root = process.cwd()
const base = resolve(root, 'tmp/units/aggregate-capacity-g2-control/predecessor-before.json')
const frozen = JSON.parse(readFileSync(base, 'utf8')) as Array<{ path: string; hash: string; bytes: number }>
const dir = resolve(root, 'tmp/units/aggregate-capacity-probe')
const all = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((x) => x.isFile()).map((x) => {
 const p = resolve(x.parentPath, x.name), b = readFileSync(p)
 return { path: relative(dir, p).split(sep).join('/'), bytes: b.byteLength, hash: createHash('sha256').update(b).digest('hex'), mtime: statSync(p).mtime.toISOString() }
}).sort((a,b)=>a.path.localeCompare(b.path))
if (all.length !== frozen.length) throw new Error(`membership count ${all.length} != ${frozen.length}`)
const map = new Map(all.map(x=>[x.path,x]))
const logs: unknown[]=[]
for (const name of ['daemon.err','daemon.log']) {
 const expected=frozen.find(x=>x.path===name), current=map.get(name)
 if (!expected || !current) throw new Error(`missing log custody row ${name}`)
 const bytes=readFileSync(resolve(dir,name))
 if(bytes.length < expected.bytes) throw new Error(`shortened ${name}`)
 const prefix=bytes.subarray(0,expected.bytes), suffix=bytes.subarray(expected.bytes)
 const prefixHash=createHash('sha256').update(prefix).digest('hex'), appendHash=createHash('sha256').update(suffix).digest('hex')
 if(prefixHash!==expected.hash) throw new Error(`altered ${name} prefix`)
 logs.push({path:name,baselineBytes:expected.bytes,baselineHash:expected.hash,actualBytes:bytes.length,actualHash:current.hash,prefixHash,appendedBytes:suffix.length,appendedHash:appendHash,observedAt:new Date().toISOString(),fileMtime:current.mtime})
}
const exempt=new Set(['daemon.err','daemon.log'])
const diffs=all.filter(x=>{const f=frozen.find(y=>y.path===x.path);return !f||(!exempt.has(x.path)&&(x.hash!==f.hash||x.bytes!==f.bytes))})
const missing=frozen.filter(x=>!map.has(x.path))
if(diffs.length||missing.length) throw new Error(`non-log predecessor mismatch: ${JSON.stringify({diffs,missing})}`)
const evidence={files:all.length,nonLogFiles:all.length-2,nonLogUnchanged:true,logs}
const out=resolve(root,'tmp/units/aggregate-capacity-g2-verification/run-2/log-prefix-custody.json')
writeFileSync(out,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({out,...evidence}))