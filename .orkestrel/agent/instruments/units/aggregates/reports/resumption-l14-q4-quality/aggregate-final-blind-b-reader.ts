import { readFileSync } from 'node:fs';

const path = 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-development-blind-packet-l14-b/packet.json';
const packet: unknown = JSON.parse(readFileSync(path, 'utf8'));
if (typeof packet !== 'object' || packet === null) throw new Error('Invalid packet');
for (const [key, value] of Object.entries(packet)) {
  if (process.argv[2] === 'keys') {
    console.log(key, Array.isArray(value) ? value.length : typeof value);
  } else if (Array.isArray(value)) {
    const start = Number(process.argv[2] ?? 0);
    const end = Number(process.argv[3] ?? start + 1);
    for (let index = start; index < Math.min(end, value.length); index += 1) {
      const row: unknown = value[index];
      if (typeof row !== 'object' || row === null) throw new Error('Invalid goal');
      const visible = Object.fromEntries(Object.entries(row).filter(([name]) => name !== 'truth'));
      console.log(JSON.stringify({ pointer: `/${key}/${index}`, ...visible }));
    }
  }
}
