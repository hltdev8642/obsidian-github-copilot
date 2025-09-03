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

async function sendMessage(accessToken, message) {
  const body = {
    intent: false,
    model: 'gpt-4o-2024-08-06',
    temperature: 0.2,
    top_p: 1,
    n: 1,
    stream: false,
    messages: [{ role: 'user', content: message }]
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

async function doChat(message) {
  let pat = process.env.COPILOT_PAT || readPATFromFile();
  if (!pat) {
    console.error('No PAT found. Run `copilot-cli auth` first or set COPILOT_PAT env var.');
    process.exit(1);
  }

  const tokenResp = await fetchToken(pat);
  const accessToken = tokenResp.token;
  if (!accessToken) throw new Error('Failed to obtain access token from PAT');

  const resp = await sendMessage(accessToken, message);
  if (resp.choices && resp.choices[0] && resp.choices[0].message) {
    console.log('\nAssistant:');
    console.log(resp.choices[0].message.content);
  } else {
    console.log('Unexpected response:', JSON.stringify(resp, null, 2));
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('copilot-cli: minimal GitHub Copilot CLI');
    console.log('Commands: auth, chat <message>');
    process.exit(0);
  }

  const cmd = args[0];
  try {
    if (cmd === 'auth') {
      await doAuth();
    } else if (cmd === 'chat') {
      const msg = args.slice(1).join(' ');
      if (!msg) {
        console.error('Please provide a message: copilot-cli chat "Hello"');
        process.exit(1);
      }
      await doChat(msg);
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
