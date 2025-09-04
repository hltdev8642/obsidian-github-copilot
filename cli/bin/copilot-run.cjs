#!/usr/bin/env node
// Wrapper for running the ESM copilot-cli.js when packaged via pkg
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// In pkg, files included as 'disclosed' are accessible via path.join(__dirname, 'copilot-cli.js')
let bundledPath = path.join(__dirname, 'copilot-cli.js');

// If the file exists in the snapshot, extract it to a temp .mjs and run with node
try {
  if (fs.existsSync(bundledPath)) {
    const contents = fs.readFileSync(bundledPath, 'utf8');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-cli-'));
    const tmpFile = path.join(tmpDir, 'copilot-cli.mjs');
    const runnerFile = path.join(tmpDir, 'copilot-runner.cjs');
    fs.writeFileSync(tmpFile, contents, 'utf8');
    // runner that dynamically imports the ESM file
    const runnerContents = `const path = require('path');\n(async () => { try { const p = path.resolve(__dirname, 'copilot-cli.mjs'); await import('file://' + p); } catch (e) { console.error(e); process.exit(1); } })();`;
    fs.writeFileSync(runnerFile, runnerContents, 'utf8');
  const res = spawnSync(process.execPath, [runnerFile, ...process.argv.slice(2)], { stdio: 'inherit', env: Object.assign({}, process.env, { NODE_NO_WARNINGS: '1' }) });
    // cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
    process.exit(res.status || 0);
  }
} catch (e) {
  // fallthrough to attempt dev-mode resolution
}

// Development mode: run the local ESM file from bin/
try {
  const devPath = path.join(__dirname, 'copilot-cli.js');
  const res2 = spawnSync(process.execPath, [devPath, ...process.argv.slice(2)], { stdio: 'inherit', env: Object.assign({}, process.env, { NODE_NO_WARNINGS: '1' }) });
  process.exit(res2.status || 0);
} catch (e) {
  console.error('Failed to run copilot-cli:', e && e.message);
  process.exit(1);
}
