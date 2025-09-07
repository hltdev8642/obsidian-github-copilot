import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const banner = '#!/usr/bin/env node\n';
const outDir = path.resolve(process.cwd(), 'dist');
try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}

const result = await esbuild.build({
  entryPoints: [path.resolve(process.cwd(), 'cli', 'bin', 'copilot-cli.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node18'],
  sourcemap: false,
  external: [...builtins],
  outfile: path.join(outDir, 'copilot-cli.mjs'),
  logLevel: 'info',
});

// Post-process: ensure the generated file has a single shebang at top
const outFile = path.join(outDir, 'copilot-cli.mjs');
try {
  let content = fs.readFileSync(outFile, 'utf8');
  // remove any duplicate shebangs and ensure single leading shebang
  content = content.replace(/^(#!.*\r?\n)+/, '');
  content = banner + content;
  fs.writeFileSync(outFile, content, 'utf8');
  try { fs.chmodSync(outFile, 0o755); } catch (e) {}
  console.log('Wrote CLI executable to', outFile);
} catch (e) {
  console.error('Build succeeded but post-processing failed:', e.message || e);
}
process.exit(0);
