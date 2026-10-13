import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const root = '.orkestrel/agent/instruments/results/l7/q2-think0';
function readObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object');
  return Object.fromEntries(Object.entries(value));
}
function readJson(path: string): Record<string, unknown> { return readObject(JSON.parse(readFileSync(path, 'utf8'))); }
function hashFile(path: string): string { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function readArray(value: unknown): readonly unknown[] { if (!Array.isArray(value)) throw new Error('Expected array'); return value; }
const bindings = [];
for (const phase of ['full', 'resource']) {
  const path = join(root, phase, 'manifest.json');
  const manifest = readJson(path);
  bindings.push({ path, hash: hashFile(path) });
  for (const value of readArray(manifest.attempts)) {
    const attempt = readObject(value);
    for (const item of [...readArray(attempt.files), attempt.execution]) {
      const binding = readObject(item);
      if (typeof binding.path !== 'string') throw new Error('Missing path');
      const actual = hashFile(binding.path);
      if (actual !== binding.hash) throw new Error(`Hash mismatch ${binding.path}`);
      bindings.push({ path: binding.path, hash: actual, matched: true });
    }
  }
}
const frozen = readJson(join(root, 'freeze/manifest.json'));
for (const name of ['bench5/Driver.ts', 'bench5/FullViewAdapter.ts', 'bench5/matrix/Matrix.ts', 'bench5/matrix/helpers.ts', 'vendor/ollama/index.js', 'vendor/agent-0.0.30-trimmed/index.js']) {
  const path = join('.orkestrel/agent/instruments/harness', name);
  const binding = readArray(frozen.files).map(readObject).find((item) => typeof item.path === 'string' && item.path.replaceAll('\\', '/').endsWith(name));
  const actual = hashFile(path);
  if (binding?.hash !== actual) throw new Error(`Frozen source mismatch ${name}`);
  bindings.push({ path, hash: actual, matched: true });
}
const run = join(root, 'full/preflight/l6-q2-think0-full-v1');
const requests = readFileSync(join(run, 'requests.jsonl'), 'utf8').split(/\r\n|\n/).filter(Boolean).map((line) => readObject(JSON.parse(line)));
const before = readObject(requests[18]?.request);
const failed = readObject(requests[19]?.request);
const recovery = readObject(requests[20]?.request);
const prefixPreserved = isDeepStrictEqual(readArray(before.messages), readArray(failed.messages).slice(0, readArray(before.messages).length));
const recoveryPreserved = isDeepStrictEqual(readArray(failed.messages), readArray(recovery.messages).slice(0, readArray(failed.messages).length));
const record = { bindings, prefixPreserved, recoveryPreserved, requestHasXmlErrorTags: JSON.stringify(failed).includes('<function>') || JSON.stringify(failed).includes('</parameter>'), recoveryToolsPresent: Object.hasOwn(recovery, 'tools'), uniqueSequences: new Set(requests.map((request) => request.sequence)).size, sent: requests.filter((request) => request.sent === true).length };
writeFileSync('tmp/units/aggregate-q2-full-failure/custody.json', JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
