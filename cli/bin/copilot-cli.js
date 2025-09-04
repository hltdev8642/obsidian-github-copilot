#!/usr/bin/env node
// Minimal Copilot CLI
// Usage:
//   copilot-cli auth        -> start device-code auth flow and print PAT
//   copilot-cli chat "msg" -> send a chat message using PAT stored in COPILOT_PAT env or ~/.copilot-pat

import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { exec as _exec, spawnSync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec);

function detectShell() {
  // Prefer PowerShell (pwsh/powershell) on Windows so PowerShell commands work.
  if (process.platform === 'win32') {
    const candidates = ['pwsh.exe', 'pwsh', 'powershell.exe', 'cmd.exe'];
    for (const c of candidates) {
      try {
        const which = spawnSync('where', [c], { stdio: 'ignore' });
        if (which.status === 0) return c;
      } catch (e) {
        // ignore
      }
    }
    return 'cmd.exe';
  }

  // On Unix, prefer user's SHELL or /bin/bash
  return process.env.SHELL || '/bin/bash';
}

function findExecutable(name) {
  try {
    if (process.platform === 'win32') {
      const r = spawnSync('where', [name], { stdio: 'ignore' });
      return r.status === 0;
    } else {
      const r = spawnSync('which', [name], { stdio: 'ignore' });
      return r.status === 0;
    }
  } catch (e) {
    return false;
  }
}

async function runCommand(command) {
  // On Windows, prefer wsl or bash if available for unix-style commands
  if (process.platform === 'win32') {
    if (findExecutable('wsl')) {
      return exec(`wsl ${command}`, { shell: true, windowsHide: true });
    }
    if (findExecutable('bash')) {
      // pass through bash -lc to interpret flags like -la
      // escape single quotes by closing, inserting '\'' and reopening - simple approach
      const safe = command.replace(/'/g, "'\\''");
      return exec(`bash -lc '${safe}'`, { shell: true, windowsHide: true });
    }
    // fallback to detected shell (PowerShell/cmd)
    const shell = detectShell();
    return exec(command, { shell, windowsHide: true });
  }

  // On unix-like systems, use the user's shell
  const shell = detectShell();
  return exec(command, { shell, windowsHide: true });
}

const homedir = os.homedir();
const PAT_FILE = path.join(homedir, '.copilot-pat');

async function requestJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, text };
  }
}

async function fetchDeviceCode() {
  const resp = await requestJson('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      // match headers used in plugin to avoid rejection
      'editor-version': 'Neovim/0.6.1',
      'editor-plugin-version': 'copilot.vim/1.16.0',
      'user-agent': 'GithubCopilot/1.155.0'
    },
    body: JSON.stringify({ client_id: 'Iv1.b507a08c87ecfe98', scope: 'read:user' })
  });
  if (resp.status !== 200) throw new Error('Device code request failed: ' + JSON.stringify(resp));
  return resp.json;
}

async function fetchPAT(device_code) {
  const resp = await requestJson('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      // match plugin headers
      'editor-version': 'Neovim/0.6.1',
      'editor-plugin-version': 'copilot.vim/1.16.0',
      'user-agent': 'GithubCopilot/1.155.0',
      'accept-encoding': 'gzip, deflate, br'
    },
    body: JSON.stringify({ client_id: 'Iv1.b507a08c87ecfe98', device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
  });
  if (resp.status !== 200) throw new Error('PAT request failed: ' + JSON.stringify(resp));
  return resp.json;
}

async function fetchToken(pat) {
  const resp = await requestJson('https://api.github.com/copilot_internal/v2/token', {
    method: 'GET',
    headers: {
      authorization: `token ${pat}`,
      // match plugin headers
      'editor-version': 'Neovim/0.6.1',
      'editor-plugin-version': 'copilot.vim/1.16.0',
      'user-agent': 'GithubCopilot/1.155.0'
    }
  });
  if (resp.status !== 200) throw new Error('Token request failed: ' + JSON.stringify(resp));
  return resp.json;
}

async function sendMessage(accessToken, messages) {
  const body = {
    intent: false,
    model: 'gpt-4o-2024-08-06',
    temperature: 0.2,
    top_p: 1,
    n: 1,
    stream: false,
    messages: messages
  };

  const resp = await requestJson('https://api.githubcopilot.com/chat/completions', {
    method: 'POST',
    headers: {
      Accept: '*/*',
      // use a known editor/version string expected by the API
      'editor-version': 'vscode/1.80.1',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (resp.status !== 200) throw new Error('Send message failed: ' + JSON.stringify(resp));
  return resp.json;
}

async function savePAT(pat) {
  try {
    fs.writeFileSync(PAT_FILE, pat, { mode: 0o600 });
    console.log('Saved PAT to', PAT_FILE);
  } catch (e) {
    console.error('Failed to save PAT:', e.message);
  }
}

function readPATFromFile() {
  try {
    if (fs.existsSync(PAT_FILE)) return fs.readFileSync(PAT_FILE, 'utf8').trim();
  } catch (e) {
    // ignore
  }
  return null;
}

async function doAuth() {
  const code = await fetchDeviceCode();
  console.log('Open the following URL in your browser and enter the code:');
  console.log(code.verification_uri);
  console.log('User code:', code.user_code);

  const poll = async () => {
    const start = Date.now();
    const expires = code.expires_in * 1000;
    const interval = (code.interval || 5) * 1000;
    while (Date.now() - start < expires) {
      try {
        const patResp = await fetchPAT(code.device_code);
        if (patResp.access_token) {
          console.log('Received PAT.');
          await savePAT(patResp.access_token);
          return;
        }
      } catch (e) {
        // continue polling
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error('Timed out waiting for PAT.');
  };

  await poll();
}

async function doChat(message, systemParts = []) {
  let pat = process.env.COPILOT_PAT || readPATFromFile();
  if (!pat) {
    console.error('No PAT found. Run `copilot-cli auth` first or set COPILOT_PAT env var.');
    process.exit(1);
  }

  const tokenResp = await fetchToken(pat);
  const accessToken = tokenResp.token;
  if (!accessToken) throw new Error('Failed to obtain access token from PAT');
  // Build message list: optional system parts first, then user message
  const messages = [];
  for (const part of systemParts) messages.push({ role: 'system', content: part });
  messages.push({ role: 'user', content: message });

  const resp = await sendMessage(accessToken, messages);
  if (resp.choices && resp.choices[0] && resp.choices[0].message) {
    console.log('\nAssistant:');
    console.log(resp.choices[0].message.content);
  } else {
    console.log('Unexpected response:', JSON.stringify(resp, null, 2));
  }
}

function parseInlineCommands(text) {
  const reads = [];
  const execs = [];
  const writes = [];

  // read patterns: read/show/cat "path" or read contents of path
  const readRegex = /(?:\b(?:read|show|cat|print)\b)(?:\s+(?:the\s+)?)?(?:contents\s+of\s+)?\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))/ig;
  let m;
  while ((m = readRegex.exec(text)) !== null) {
    const p = m[1] || m[2] || m[3];
    if (p) reads.push(p);
  }

  // exec patterns: exec/execute/run "cmd" or exec cmd
  const execRegex = /(?:\b(?:exec|execute|run)\b)(?:\s+(?:the\s+)?)?(?:command\s+)?\s*(?:"([^"]+)"|'([^']+)'|([^\n]+))/ig;
  while ((m = execRegex.exec(text)) !== null) {
    const c = (m[1] || m[2] || m[3] || '').trim();
    if (c) execs.push(c);
  }

  // write patterns: write "content" to path OR write content to path
  const writeRegex = /(?:\b(?:write|save)\b)\s+(?:"([^"]+)"|'([^']+)'|(.+?))\s+(?:to|into|at)\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/ig;
  while ((m = writeRegex.exec(text)) !== null) {
    const content = (m[1] || m[2] || m[3] || '').trim();
    const p = m[4] || m[5] || m[6];
    if (p) writes.push({ path: p, content });
  }

  return { reads, execs, writes };
}

function isChatIntent(text) {
  // detect if the user is asking the model to do something beyond running the command
  return /\b(summarize|explain|analyze|describe|what|how|why|please|tell|rewrite|convert|refactor)\b/i.test(text);
}

function isCommandOnly(text) {
  if (!text || text.trim().length === 0) return false;
  // reuse the same inline regexes to strip commands
  const readRegex = /(?:\b(?:read|show|cat|print)\b)(?:\s+(?:the\s+)?)?(?:contents\s+of\s+)?\s*(?:"([^"\\]+)"|'([^'\\]+)'|([^\s]+))/ig;
  const execRegex = /(?:\b(?:exec|execute|run)\b)(?:\s+(?:the\s+)?)?(?:command\s+)?\s*(?:"([^"\\]+)"|'([^'\\]+)'|([^\n]+))/ig;
  const writeRegex = /(?:\b(?:write|save)\b)\s+(?:"([^"\\]+)"|'([^'\\]+)'|(.+?))\s+(?:to|into|at)\s+(?:"([^"\\]+)"|'([^'\\]+)'|([^\s]+))/ig;

  let cleaned = text.replace(readRegex, '');
  cleaned = cleaned.replace(execRegex, '');
  cleaned = cleaned.replace(writeRegex, '');

  // remove common punctuation and whitespace
  cleaned = cleaned.replace(/^["'\s:\-]+|["'\s:\-]+$/g, '');
  return cleaned.trim().length === 0;
}

function normalizeCommand(cmd) {
  if (!cmd) return cmd;
  // Trim whitespace and surrounding quotes
  let out = cmd.trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1);
  }
  // Remove stray leading/trailing backslashes produced by Windows quoting in some shells
  out = out.replace(/^\\+|\\+$/g, '');
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const helpFlags = new Set(['help', '--help', '-help', 'h', '--h', '-h']);
  if (args.length === 0 || helpFlags.has(args[0])) {
    console.log('copilot-cli: minimal GitHub Copilot CLI');
    console.log('Usage: copilot-cli <command> [options]\n');
    console.log('Commands:');
    console.log('  auth                       Start device-code auth flow and save PAT');
    console.log('  chat [flags] <message>     Send a chat message');
    console.log('    --read <path>    Include file contents as system context');
    console.log('    --exec <cmd>     Execute a command and include output as context');
    console.log('    --write <path>   Write the message to a file before sending');
    console.log('  read <path>                Print file contents');
    console.log('  write <path> <content>     Write content to a file');
    console.log('  exec <command>             Execute a shell command');
    console.log('  agent <goal> [options]     Run autonomous agent to achieve a goal');
    console.log('    --allow-exec                 Allow exec steps (default: true)');
    console.log('    --allow-write                Allow write steps');
    console.log('    --max-steps N                Maximum steps to run (default: 5)');
    console.log('    --dry-run                    Do not execute any steps, only show plan');
    console.log('    --simulate                   Skip exec/write but allow reads');
    console.log('    --yes, -y                    Auto-confirm prompts');
    console.log('    --log <file>                 Save agent history JSON to file');
    console.log('    --no-confirm-exec            Disable confirmation for exec steps');
    console.log('    --no-confirm-write           Disable confirmation for write steps');
    process.exit(0);
  }

  const cmd = args[0];
  try {
    // file I/O and exec commands
    if (cmd === 'read') {
      const target = args[1];
      if (!target) {
        console.error('Usage: copilot-cli read <path>');
        process.exit(1);
      }
      try {
        const content = fs.readFileSync(path.resolve(target), 'utf8');
        console.log(content);
      } catch (e) {
        console.error('Failed to read file:', e.message);
        process.exit(1);
      }
      process.exit(0);
    }

    if (cmd === 'write') {
      const target = args[1];
      const data = args.slice(2).join(' ');
      if (!target || data === undefined) {
        console.error('Usage: copilot-cli write <path> <content>');
        process.exit(1);
      }
      try {
        fs.writeFileSync(path.resolve(target), data, 'utf8');
        console.log('Wrote', target);
      } catch (e) {
        console.error('Failed to write file:', e.message);
        process.exit(1);
      }
      process.exit(0);
    }

    if (cmd === 'exec') {
      const command = args.slice(1).join(' ');
      if (!command) {
        console.error('Usage: copilot-cli exec <command>');
        process.exit(1);
      }
      try {
        // Run in detected shell (PowerShell on Windows if available)
        const shell = detectShell();
        const { stdout, stderr } = await exec(command, { shell, windowsHide: true });
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
      } catch (e) {
        console.error('Command failed:', e.message);
        process.exit(1);
      }
      process.exit(0);
    }
    if (cmd === 'auth') {
      await doAuth();
    } else if (cmd === 'chat') {
      // Simple flag parsing for chat: --read <path>, --exec <command>, --write <path>
      const flags = {};
      const rest = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--read' || a === '-r') {
          flags.read = args[++i];
        } else if (a === '--exec' || a === '-x') {
          flags.exec = args[++i];
        } else if (a === '--write' || a === '-w') {
          flags.write = args[++i];
        } else {
          rest.push(a);
        }
      }

      const msg = rest.join(' ');
      if (!msg && !flags.read && !flags.exec) {
        console.error('Please provide a message or use --read/--exec: copilot-cli chat [flags] "message"');
        process.exit(1);
      }

      // prepare system context messages
      const systemParts = [];

      if (flags.read) {
        try {
          const content = fs.readFileSync(path.resolve(flags.read), 'utf8');
          systemParts.push(`File contents of ${flags.read}:\n\n${content}`);
        } catch (e) {
          console.error('Failed to read file for --read:', e.message);
          process.exit(1);
        }
      }

      if (flags.exec) {
        try {
          const shell = detectShell();
          const commandToRun = normalizeCommand(flags.exec);
          const { stdout, stderr } = await runCommand(commandToRun);
          const out = stdout ? stdout : '';
          const err = stderr ? stderr : '';
          systemParts.push(`Command output of (${flags.exec}):\n\n${out}${err}`);
        } catch (e) {
          console.error('Failed to execute command for --exec:', e.message);
          process.exit(1);
        }
      }

      // If --write provided, write the message to the file before sending
      if (flags.write) {
        try {
          fs.writeFileSync(path.resolve(flags.write), msg, 'utf8');
          console.log('Wrote message to', flags.write);
        } catch (e) {
          console.error('Failed to write file for --write:', e.message);
          process.exit(1);
        }
      }

      // Parse inline commands from the message as well
      const inline = parseInlineCommands(msg);

      // If there are inline reads/execs/writes, run them locally and decide behavior.
      let inlineParts = [];

      // run reads
      for (const r of inline.reads) {
        try {
          const content = fs.readFileSync(path.resolve(r), 'utf8');
          inlineParts.push(`File contents of ${r}:\n\n${content}`);
        } catch (e) {
          inlineParts.push(`Failed to read ${r}: ${e.message}`);
        }
      }

      // run execs
      for (const c of inline.execs) {
        try {
          const shell = detectShell();
          const commandToRun = normalizeCommand(c);
          const { stdout, stderr } = await runCommand(commandToRun);
          inlineParts.push(`Command output of (${c}):\n\n${stdout || ''}${stderr || ''}`);
        } catch (e) {
          inlineParts.push(`Failed to exec ${c}: ${e.message}`);
        }
      }

      // run writes
      for (const w of inline.writes) {
        try {
          fs.writeFileSync(path.resolve(w.path), w.content, 'utf8');
          inlineParts.push(`Wrote to ${w.path}`);
        } catch (e) {
          inlineParts.push(`Failed to write ${w.path}: ${e.message}`);
        }
      }

      // If the message is purely a command (no other chat intent), or only contains inline commands, print the inline results and exit.
      if ((isCommandOnly(msg) || (!msg || msg.trim().length === 0)) && inlineParts.length > 0) {
        console.log(inlineParts.join('\n\n'));
        process.exit(0);
      }

      // Merge flags system parts and inline parts
      const mergedSystemParts = [...systemParts, ...inlineParts];

      // If there are system parts and no explicit chat intent in the message, treat them as context and send to chat
      if (mergedSystemParts.length > 0 && isChatIntent(msg)) {
        await doChat(msg, mergedSystemParts);
      } else if (mergedSystemParts.length > 0 && !isChatIntent(msg)) {
        // If no chat intent words found, but there are inline parts, show them and still send to chat to be safe
        await doChat(msg, mergedSystemParts);
      } else {
        await doChat(msg, systemParts);
      }
    } else if (cmd === 'agent') {
      // agent <goal> [--allow-exec] [--allow-write] [--max-steps N] [--dry-run] [--yes] [--whitelist a,b]
  const flags = { allowExec: true, allowWrite: false, maxSteps: 5, dryRun: false, yes: false, whitelist: [], simulate: false, log: null, confirmExec: false, confirmWrite: true, confirmRead: false };
      const rest = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--allow-exec') flags.allowExec = true;
        else if (a === '--allow-write') flags.allowWrite = true;
        else if (a === '--max-steps') flags.maxSteps = parseInt(args[++i] || '5', 10) || 5;
        else if (a === '--dry-run') flags.dryRun = true;
        else if (a === '--yes' || a === '-y') flags.yes = true;
        else if (a === '--whitelist') flags.whitelist = (args[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
        else if (a === '--simulate') flags.simulate = true;
        else if (a === '--log') flags.log = args[++i];
        else if (a === '--confirm-exec') flags.confirmExec = true;
        else if (a === '--no-confirm-exec') flags.confirmExec = false;
        else if (a === '--confirm-write') flags.confirmWrite = true;
        else if (a === '--no-confirm-write') flags.confirmWrite = false;
        else if (a === '--confirm-read') flags.confirmRead = true;
        else if (a === '--no-confirm-read') flags.confirmRead = false;
        else rest.push(a);
      }

      const goal = rest.join(' ');
      if (!goal) {
        console.error('Usage: copilot-cli agent <goal> [--allow-exec] [--allow-write] [--max-steps N] [--dry-run] [--yes] [--whitelist a,b]');
        process.exit(1);
      }

      // helper: validate step schema
      function validateStep(step) {
        if (!step || typeof step !== 'object') return 'Step is not an object';
        if (!step.action || typeof step.action !== 'string') return 'Missing or invalid action';
        const act = step.action.toLowerCase();
        if (!['read', 'exec', 'write'].includes(act)) return `Invalid action: ${step.action}`;
        if (!step.target || typeof step.target !== 'string') return 'Missing or invalid target';
        if (act === 'write' && (typeof step.content !== 'string')) return 'Write action requires content string';
        // whitelist check if provided
        if (flags.whitelist.length > 0) {
          const ok = flags.whitelist.some(w => step.target.includes(w) || (step.content && step.content.includes(w)));
          if (!ok) return `Target not in whitelist: ${step.target}`;
        }
        return null;
      }

      // helper: ask confirmation
      function askConfirm(question) {
        if (flags.yes) return Promise.resolve(true);
        return new Promise((resolve) => {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.question(`${question} (y/n) `, (answer) => {
            rl.close();
            resolve(/^y(es)?$/i.test(answer.trim()));
          });
        });
      }

      // initial plan prompt
      const planRequest = `You are an autonomous assistant that generates a plan of actions for a runtime to perform.\nGiven the goal: ${goal}\nReturn ONLY a JSON array (no surrounding text) where each element is an object with exactly these fields:\n- action: one of \"read\", \"exec\", \"write\"\n- target: path (for read/write) or command (for exec)\n- content: (optional) for write actions\nExample: [{"action":"read","target":"./README.md"},{"action":"exec","target":"ls -la"},{"action":"write","target":"./out.txt","content":"result"}]\nOutput nothing else.`;

      // get access token
      let pat = process.env.COPILOT_PAT || readPATFromFile();
      if (!pat) {
        console.error('No PAT found. Run `copilot-cli auth` or set COPILOT_PAT.');
        process.exit(1);
      }
      const tokenResp = await fetchToken(pat);
      const accessToken = tokenResp.token;
      if (!accessToken) throw new Error('Failed to obtain access token from PAT');

      // request initial plan
      let planResp = await sendMessage(accessToken, [
        { role: 'system', content: planRequest },
        { role: 'user', content: goal }
      ]);
      let planText = planResp?.choices?.[0]?.message?.content || '';

      // parse plan
      let plan;
      try { plan = JSON.parse(planText); } catch (e) {
        const m = planText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (m) {
          try { plan = JSON.parse(m[0]); } catch (e2) { plan = null; }
        }
      }

      // retry stricter if needed
      if (!Array.isArray(plan)) {
        const strict = `You must respond with ONLY a JSON array (no explanation). Each element: {"action":"read"|"exec"|"write","target":"...","content":"..." (optional)}. Example: [{"action":"read","target":"./README.md"}]`;
        planResp = await sendMessage(accessToken, [
          { role: 'system', content: strict },
          { role: 'user', content: planText || goal }
        ]);
        planText = planResp?.choices?.[0]?.message?.content || '';
        const m2 = planText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (m2) {
          try { plan = JSON.parse(m2[0]); } catch (e3) { plan = null; }
        }
      }

      if (!Array.isArray(plan)) {
        console.error('Agent: could not parse plan JSON from model output.');
        console.log('Model output:\n', planText);
        process.exit(1);
      }

      // iterative execution: we treat plan as a queue and after each action we can ask the model for next step
      let queue = [...plan];
      let stepIndex = 0;
      const history = [];

  while (stepIndex < flags.maxSteps) {
        // if queue empty, ask model for next step given history
        if (queue.length === 0) {
          const askNext = `Given the goal: ${goal} and the history: ${JSON.stringify(history)}, return the NEXT step as a single JSON object or an empty array if done. Object format: {"action":"read"|"exec"|"write","target":"...","content":"..." (optional)}`;
          const nextResp = await sendMessage(accessToken, [ { role: 'system', content: askNext }, { role: 'user', content: goal } ]);
          const nextText = nextResp?.choices?.[0]?.message?.content || '';
          const m = nextText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          let next;
          if (m) {
            try { next = JSON.parse(m[0]); } catch (e) { next = null; }
          }
          if (!next || (Array.isArray(next) && next.length === 0)) break;
          if (!Array.isArray(next)) queue.push(next);
        }

        const s = queue.shift();
        stepIndex++;
        console.log(`Step ${stepIndex}:`, s.action, s.target || '');

        const validationError = validateStep(s);
        if (validationError) {
          console.error('Invalid step, skipping:', validationError);
          history.push({ step: s, result: `invalid: ${validationError}` });
          continue;
        }

        // dry-run: don't execute, just show
        if (flags.dryRun) {
          console.log('[dry-run] Would execute:', s.action, s.target || '', s.content || '');
          history.push({ step: s, result: '[dry-run] skipped' });
          continue;
        }

        // simulate: do not perform exec/write, but allow read
        if (flags.simulate && (s.action === 'exec' || s.action === 'write')) {
          console.log('[simulate] Would execute:', s.action, s.target || '', s.content || '');
          history.push({ step: s, result: '[simulate] skipped' });
          continue;
        }

        // confirm per-action
        let needsConfirm = false;
        if (s.action === 'exec') needsConfirm = !!flags.confirmExec;
        else if (s.action === 'write') needsConfirm = !!flags.confirmWrite;
        else if (s.action === 'read') needsConfirm = !!flags.confirmRead;

        if (needsConfirm) {
          const proceed = await askConfirm(`Execute step ${stepIndex}: ${s.action} ${s.target || ''}?`);
          if (!proceed) {
            console.log('User declined. Skipping step.');
            history.push({ step: s, result: 'user declined' });
            continue;
          }
        }

        // execute
        if (s.action === 'read') {
          try {
            const content = fs.readFileSync(path.resolve(s.target), 'utf8');
            console.log('Read output:\n', content.substring(0, 2000));
            history.push({ step: s, result: content });
          } catch (e) {
            console.error('Read failed:', e.message);
            history.push({ step: s, result: `read error: ${e.message}` });
          }
        } else if (s.action === 'exec') {
          if (!flags.allowExec) {
            console.warn('Exec not allowed. Skipping:', s.target);
            history.push({ step: s, result: 'exec not allowed' });
            continue;
          }
          try {
            const commandToRun = normalizeCommand(s.target);
            const { stdout, stderr } = await runCommand(commandToRun);
            console.log('Exec stdout:\n', stdout || '');
            if (stderr) console.error('Exec stderr:\n', stderr);
            history.push({ step: s, result: stdout || stderr || '' });
          } catch (e) {
            console.error('Exec failed:', e.message);
            history.push({ step: s, result: `exec error: ${e.message}` });
          }
        } else if (s.action === 'write') {
          if (!flags.allowWrite) {
            console.warn('Write not allowed. Skipping:', s.target);
            history.push({ step: s, result: 'write not allowed' });
            continue;
          }
          try {
            fs.writeFileSync(path.resolve(s.target), s.content || '', 'utf8');
            console.log('Wrote to', s.target);
            history.push({ step: s, result: 'written' });
          } catch (e) {
            console.error('Write failed:', e.message);
            history.push({ step: s, result: `write error: ${e.message}` });
          }
        }

        // after each step, we optionally ask the model for a next step; loop continues
      }

      // write log if requested
      if (flags.log) {
        try {
          fs.writeFileSync(path.resolve(flags.log), JSON.stringify({ goal, flags, history }, null, 2), 'utf8');
          console.log('Agent history written to', flags.log);
        } catch (e) {
          console.error('Failed to write agent log:', e.message);
        }
      }
    } else {
      console.error('Unknown command', cmd);
      process.exit(1);
    }
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
}

// Node 18+ has global fetch. For older Node, user will need to install node-fetch.
if (typeof fetch === 'undefined') {
  try {
    const nodeFetch = await import('node-fetch');
    global.fetch = nodeFetch.default;
  } catch (e) {
    console.error('Global fetch not available. Please use Node 18+ or install node-fetch.');
    process.exit(1);
  }
}

main();
