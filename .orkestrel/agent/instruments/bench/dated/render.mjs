import { Renderer } from './Renderer.mjs';
try {
  new Renderer().run(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
