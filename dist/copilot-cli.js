#!/usr/bin/env node

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// cli/bin/copilot-cli.js
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_path = __toESM(require("path"), 1);
var import_readline = __toESM(require("readline"), 1);
var import_url = require("url");
var import_child_process = require("child_process");
var import_util = require("util");
var import_meta = {};
var exec = (0, import_util.promisify)(import_child_process.exec);
process.on("warning", (warning) => {
  try {
    if (warning && typeof warning === "object" && /Fetch API/.test(warning.message))
      return;
  } catch (e) {
  }
  console.warn(warning.name + ": " + warning.message);
});
function detectShell() {
  if (process.platform === "win32") {
    const candidates = ["pwsh.exe", "pwsh", "powershell.exe", "cmd.exe"];
    for (const c of candidates) {
      try {
        const which = (0, import_child_process.spawnSync)("where", [c], { stdio: "ignore" });
        if (which.status === 0)
          return c;
      } catch (e) {
      }
    }
    return "cmd.exe";
  }
  return process.env.SHELL || "/bin/bash";
}
function findExecutable(name) {
  try {
    if (process.platform === "win32") {
      const r = (0, import_child_process.spawnSync)("where", [name], { stdio: "ignore" });
      return r.status === 0;
    } else {
      const r = (0, import_child_process.spawnSync)("which", [name], { stdio: "ignore" });
      return r.status === 0;
    }
  } catch (e) {
    return false;
  }
}
async function runCommand(command) {
  if (process.platform === "win32") {
    if (findExecutable("wsl")) {
      const convertPathForWsl = (s) => {
        if (!s || typeof s !== "string")
          return s;
        const driveMatch = s.match(/^([A-Za-z]):[\\/](.*)$/);
        if (driveMatch) {
          const drive = driveMatch[1].toLowerCase();
          const rest = driveMatch[2].replace(/\\/g, "/");
          return `/mnt/${drive}/${rest}`;
        }
        return s.replace(/\\/g, "/");
      };
      const cmdSafe = command.replace(/([A-Za-z]:\\[^\s"']*[\\A-Za-z0-9_.-]*)/g, (m) => convertPathForWsl(m));
      const cmdSafe2 = cmdSafe.replace(/[^\s"']*\\[^\s"']*/g, (m) => convertPathForWsl(m));
      const q = cmdSafe2.replace(/'/g, "'\\''");
      return exec(`wsl bash --noprofile --norc -c '${q}'`, { shell: true, windowsHide: true });
    }
    if (findExecutable("bash")) {
      const safe = command.replace(/'/g, "'\\''");
      return exec(`bash -lc '${safe}'`, { shell: true, windowsHide: true });
    }
    const shell2 = detectShell();
    if (shell2 && shell2.toLowerCase().includes("cmd.exe")) {
      const t = translateCommandForCmd(command);
      return exec(t, { shell: shell2, windowsHide: true });
    }
    return exec(command, { shell: shell2, windowsHide: true });
  }
  const shell = detectShell();
  return exec(command, { shell, windowsHide: true });
}
function translateCommandForCmd(cmd) {
  if (!cmd || typeof cmd !== "string")
    return cmd;
  const s = cmd.trim();
  const m = s.match(/^(\S+)(?:\s+([\s\S]*))?$/);
  if (!m)
    return cmd;
  const cmd0 = m[1];
  const rest = (m[2] || "").trim();
  const parts = rest.length ? rest.match(/(?:"[^"]+"|'[^']+'|[^\s]+)/g) || [] : [];
  const nonFlags = parts.filter((p) => !p.startsWith("-"));
  switch (cmd0) {
    case "ls":
    case "ll":
      return "dir " + (nonFlags.join(" ") || "");
    case "cat":
      return "type " + (nonFlags.join(" ") || "");
    case "rm":
      if (rest.includes("-r") || rest.includes("-R") || rest.includes("-rf")) {
        return "rmdir /s /q " + (nonFlags.join(" ") || "");
      }
      return "del " + (nonFlags.join(" ") || "");
    case "mv":
      return "move " + parts.join(" ");
    case "cp":
      return "copy " + parts.join(" ");
    case "pwd":
      return "cd";
    default:
      return cmd;
  }
}
function isPathInside(parent, child) {
  const relative = import_path.default.relative(parent, child);
  return !!relative && !relative.startsWith("..") && !import_path.default.isAbsolute(relative);
}
function readDirRecursive(base, opts = {}) {
  const maxDepth = typeof opts.maxDepth === "number" ? opts.maxDepth : Infinity;
  const maxFileMB = typeof opts.maxFileMB === "number" ? opts.maxFileMB : null;
  const results = [];
  function visit(dir, depth) {
    if (depth > maxDepth)
      return;
    let entries = [];
    try {
      entries = import_fs.default.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const ent of entries) {
      const full = import_path.default.join(dir, ent.name);
      if (ent.isDirectory()) {
        visit(full, depth + 1);
      } else if (ent.isFile()) {
        try {
          const stat = import_fs.default.statSync(full);
          const sizeKB = Math.round(stat.size / 1024);
          const sizeMB = +(sizeKB / 1024).toFixed(2);
          if (maxFileMB !== null && sizeMB > maxFileMB) {
            results.push({ path: full, snippet: `<file too large: ${sizeMB}MB>` });
          } else {
            const txt = import_fs.default.readFileSync(full, "utf8");
            results.push({ path: full, snippet: txt.slice(0, 2048) });
          }
        } catch (e) {
          results.push({ path: full, snippet: `<read error: ${e.message}>` });
        }
      }
    }
  }
  visit(base, 0);
  return results;
}
function safeWriteRecursive(baseWorkspace, targetPath, content) {
  const absBase = import_path.default.resolve(baseWorkspace || ".");
  const absTarget = import_path.default.resolve(targetPath);
  if (!isPathInside(absBase, absTarget))
    throw new Error("Target path is outside of workspace");
  const dir = import_path.default.dirname(absTarget);
  import_fs.default.mkdirSync(dir, { recursive: true });
  import_fs.default.writeFileSync(absTarget, content, "utf8");
}
function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9_]+/g) || []).filter(Boolean);
}
function buildWorkspaceIndex(base, opts = {}) {
  const maxDepth = typeof opts.maxDepth === "number" ? opts.maxDepth : Infinity;
  const maxFileMB = typeof opts.maxFileMB === "number" ? opts.maxFileMB : null;
  const chunkLines = opts.chunkLines || 200;
  const docs = [];
  function visit(filePath, rel, content) {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += chunkLines) {
      const slice = lines.slice(i, i + chunkLines);
      const txt = slice.join("\n");
      const tokens = tokenize(txt);
      const tf = /* @__PURE__ */ new Map();
      for (const t of tokens)
        tf.set(t, (tf.get(t) || 0) + 1);
      docs.push({ path: filePath, rel, start: i + 1, end: Math.min(i + chunkLines, lines.length), text: txt, tf, len: tokens.length || 1 });
    }
  }
  function walk(dir, depth) {
    if (depth > maxDepth)
      return;
    let entries = [];
    try {
      entries = import_fs.default.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = import_path.default.join(dir, ent.name);
      const rel = import_path.default.relative(base, full);
      if (ent.isDirectory())
        walk(full, depth + 1);
      else if (ent.isFile()) {
        try {
          const stat = import_fs.default.statSync(full);
          const sizeMB = +(stat.size / (1024 * 1024)).toFixed(2);
          if (maxFileMB !== null && sizeMB > maxFileMB)
            continue;
          const txt = import_fs.default.readFileSync(full, "utf8");
          visit(full, rel, txt);
        } catch {
        }
      }
    }
  }
  walk(base, 0);
  return { base, docs };
}
function retrieveFromIndex(index, query, topK = 5) {
  const qTokens = tokenize(query);
  const qSet = new Set(qTokens);
  const scores = [];
  for (const d of index.docs) {
    let score = 0;
    for (const qt of qSet) {
      score += (d.tf.get(qt) || 0) / d.len;
    }
    if (score > 0)
      scores.push({ score, doc: d });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK).map((s) => ({
    path: s.doc.path,
    rel: s.doc.rel,
    range: [s.doc.start, s.doc.end],
    snippet: s.doc.text.length > 2e3 ? s.doc.text.slice(0, 2e3) + "\n...[truncated]..." : s.doc.text,
    score: +s.score.toFixed(4)
  }));
}
function makeUnifiedDiff(relPath, oldText, newText) {
  const oldLines = oldText === null || oldText === void 0 ? [] : String(oldText).split(/\r?\n/);
  const newLines = newText === null || newText === void 0 ? [] : String(newText).split(/\r?\n/);
  const header = `diff --git a/${relPath} b/${relPath}
--- a/${relPath}
+++ b/${relPath}
@@ -1,${oldLines.length} +1,${newLines.length} @@
`;
  let hunk = "";
  for (const l of oldLines)
    hunk += `-${l}
`;
  for (const l of newLines)
    hunk += `+${l}
`;
  return header + hunk;
}
function isGitRepo(dir) {
  try {
    const r = (0, import_child_process.spawnSync)("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, stdio: "ignore" });
    return r.status === 0;
  } catch (e) {
    return false;
  }
}
async function applyPatchText(patchText, baseDir) {
  const tmp = import_path.default.join(import_os.default.tmpdir(), `copilot-cli-${Date.now()}.patch`);
  import_fs.default.writeFileSync(tmp, patchText, "utf8");
  const cwd = baseDir || process.cwd();
  let applied = false;
  let outMsg = "";
  for (const pflag of ["-p0", "-p1"]) {
    try {
      const { stdout, stderr } = await exec(`git apply ${pflag} "${tmp}"`, { cwd, shell: detectShell(), windowsHide: true });
      applied = true;
      outMsg = (stdout || "") + (stderr || "");
      break;
    } catch (e) {
      outMsg = e && e.message ? e.message : String(e);
    }
  }
  try {
    import_fs.default.unlinkSync(tmp);
  } catch (e) {
  }
  return { applied, outMsg };
}
var homedir = import_os.default.homedir();
var PAT_FILE = import_path.default.join(homedir, ".copilot-pat");
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
  const resp = await requestJson("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      // match headers used in plugin to avoid rejection
      "editor-version": "Neovim/0.6.1",
      "editor-plugin-version": "copilot.vim/1.16.0",
      "user-agent": "GithubCopilot/1.155.0"
    },
    body: JSON.stringify({ client_id: "Iv1.b507a08c87ecfe98", scope: "read:user" })
  });
  if (resp.status !== 200)
    throw new Error("Device code request failed: " + JSON.stringify(resp));
  return resp.json;
}
async function fetchPAT(device_code) {
  const resp = await requestJson("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      // match plugin headers
      "editor-version": "Neovim/0.6.1",
      "editor-plugin-version": "copilot.vim/1.16.0",
      "user-agent": "GithubCopilot/1.155.0",
      "accept-encoding": "gzip, deflate, br"
    },
    body: JSON.stringify({ client_id: "Iv1.b507a08c87ecfe98", device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" })
  });
  if (resp.status !== 200)
    throw new Error("PAT request failed: " + JSON.stringify(resp));
  return resp.json;
}
async function fetchToken(pat) {
  const resp = await requestJson("https://api.github.com/copilot_internal/v2/token", {
    method: "GET",
    headers: {
      authorization: `token ${pat}`,
      // match plugin headers
      "editor-version": "Neovim/0.6.1",
      "editor-plugin-version": "copilot.vim/1.16.0",
      "user-agent": "GithubCopilot/1.155.0"
    }
  });
  if (resp.status !== 200)
    throw new Error("Token request failed: " + JSON.stringify(resp));
  return resp.json;
}
async function sendMessage(accessToken, messages) {
  const body = {
    intent: false,
    model: "gpt-4o-2024-08-06",
    temperature: 0.2,
    top_p: 1,
    n: 1,
    stream: false,
    messages
  };
  const resp = await requestJson("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: {
      Accept: "*/*",
      // use a known editor/version string expected by the API
      "editor-version": "vscode/1.80.1",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (resp.status !== 200)
    throw new Error("Send message failed: " + JSON.stringify(resp));
  return resp.json;
}
async function webSearch(query, maxResults = 5) {
  const q = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${q}`;
  const resp = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 copilot-cli" } });
  const html = await resp.text();
  const results = [];
  const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/ig;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    if (href && title)
      results.push({ title, url: href });
    if (results.length >= maxResults)
      break;
  }
  return results;
}
async function fetchPage(url, maxChars = 4e3) {
  try {
    const resp = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 copilot-cli" } });
    const text = await resp.text();
    const noTags = text.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
    return noTags.replace(/\s+/g, " ").trim().slice(0, maxChars);
  } catch (e) {
    return `Failed to fetch page: ${e.message}`;
  }
}
async function savePAT(pat) {
  try {
    import_fs.default.writeFileSync(PAT_FILE, pat, { mode: 384 });
    console.log("Saved PAT to", PAT_FILE);
  } catch (e) {
    console.error("Failed to save PAT:", e.message);
  }
}
function readPATFromFile() {
  try {
    if (import_fs.default.existsSync(PAT_FILE))
      return import_fs.default.readFileSync(PAT_FILE, "utf8").trim();
  } catch (e) {
  }
  return null;
}
async function doAuth() {
  const code = await fetchDeviceCode();
  console.log("Open the following URL in your browser and enter the code:");
  console.log(code.verification_uri);
  console.log("User code:", code.user_code);
  const poll = async () => {
    const start = Date.now();
    const expires = code.expires_in * 1e3;
    const interval = (code.interval || 5) * 1e3;
    while (Date.now() - start < expires) {
      try {
        const patResp = await fetchPAT(code.device_code);
        if (patResp.access_token) {
          console.log("Received PAT.");
          await savePAT(patResp.access_token);
          return;
        }
      } catch (e) {
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error("Timed out waiting for PAT.");
  };
  await poll();
}
async function doChat(message, systemParts = []) {
  const workspaceFromEnv = process.env.COPILOT_WORKSPACE || null;
  function extractWorkspaceFlags() {
    const a = process.argv.slice(2);
    const out = { workspace: workspaceFromEnv, depth: Infinity, maxFileMB: null };
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "--workspace")
        out.workspace = a[++i];
      else if (a[i] === "--workspace-depth") {
        const v = a[++i];
        out.depth = v ? parseInt(v, 10) || Infinity : Infinity;
      } else if (a[i] === "--workspace-max-file") {
        const v = a[++i];
        out.maxFileMB = v ? parseFloat(v) || null : null;
      }
    }
    return out;
  }
  const wsFlags = extractWorkspaceFlags();
  let pat = process.env.COPILOT_PAT || readPATFromFile();
  if (!pat) {
    console.error("No PAT found. Run `copilot-cli auth` first or set COPILOT_PAT env var.");
    process.exit(1);
  }
  const tokenResp = await fetchToken(pat);
  const accessToken = tokenResp.token;
  if (!accessToken)
    throw new Error("Failed to obtain access token from PAT");
  const messages = [];
  for (const part of systemParts)
    messages.push({ role: "system", content: part });
  messages.push({ role: "user", content: message });
  const resp = await sendMessage(accessToken, messages);
  if (resp.choices && resp.choices[0] && resp.choices[0].message) {
    console.log("\nAssistant:");
    console.log(resp.choices[0].message.content);
  } else {
    console.log("Unexpected response:", JSON.stringify(resp, null, 2));
  }
}
function parseInlineCommands(text) {
  const reads = [];
  const execs = [];
  const writes = [];
  const readRegex = /(?:\b(?:read|show|cat|print)\b)(?:\s+(?:the\s+)?)?(?:contents\s+of\s+)?\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))/ig;
  let m;
  while ((m = readRegex.exec(text)) !== null) {
    const p = m[1] || m[2] || m[3];
    if (p)
      reads.push(p);
  }
  const execRegex = /(?:\b(?:exec|execute|run)\b)(?:\s+(?:the\s+)?)?(?:command\s+)?\s*(?:"([^"]+)"|'([^']+)'|([^\n]+))/ig;
  while ((m = execRegex.exec(text)) !== null) {
    const c = (m[1] || m[2] || m[3] || "").trim();
    if (c)
      execs.push(c);
  }
  const writeRegex = /(?:\b(?:write|save)\b)\s+(?:"([^"]+)"|'([^']+)'|(.+?))\s+(?:to|into|at)\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/ig;
  while ((m = writeRegex.exec(text)) !== null) {
    const content = (m[1] || m[2] || m[3] || "").trim();
    const p = m[4] || m[5] || m[6];
    if (p)
      writes.push({ path: p, content });
  }
  return { reads, execs, writes };
}
function isChatIntent(text) {
  return /\b(summarize|explain|analyze|describe|what|how|why|please|tell|rewrite|convert|refactor)\b/i.test(text);
}
function isCommandOnly(text) {
  if (!text || text.trim().length === 0)
    return false;
  const readRegex = /(?:\b(?:read|show|cat|print)\b)(?:\s+(?:the\s+)?)?(?:contents\s+of\s+)?\s*(?:"([^"\\]+)"|'([^'\\]+)'|([^\s]+))/ig;
  const execRegex = /(?:\b(?:exec|execute|run)\b)(?:\s+(?:the\s+)?)?(?:command\s+)?\s*(?:"([^"\\]+)"|'([^'\\]+)'|([^\n]+))/ig;
  const writeRegex = /(?:\b(?:write|save)\b)\s+(?:"([^"\\]+)"|'([^'\\]+)'|(.+?))\s+(?:to|into|at)\s+(?:"([^"\\]+)"|'([^'\\]+)'|([^\s]+))/ig;
  let cleaned = text.replace(readRegex, "");
  cleaned = cleaned.replace(execRegex, "");
  cleaned = cleaned.replace(writeRegex, "");
  cleaned = cleaned.replace(/^["'\s:\-]+|["'\s:\-]+$/g, "");
  return cleaned.trim().length === 0;
}
function normalizeCommand(cmd) {
  if (!cmd)
    return cmd;
  let out = cmd.trim();
  if (out.startsWith('"') && out.endsWith('"') || out.startsWith("'") && out.endsWith("'")) {
    out = out.slice(1, -1);
  }
  out = out.replace(/^\\+|\\+$/g, "");
  return out;
}
function printGeneralHelp() {
  console.log("copilot-cli: minimal GitHub Copilot CLI");
  console.log("Usage: copilot-cli <command> [options]\n");
  console.log("Commands:");
  console.log("  auth                       Start device-code auth flow and save PAT");
  console.log("  chat [flags] <message>     Send a chat message");
  console.log("    --read <path>    Include file contents as system context");
  console.log("    --exec <cmd>     Execute a command and include output as context");
  console.log("    --write <path>   Write the message to a file before sending");
  console.log("    --workspace <dir>            Include a workspace snapshot (recursive) as system context");
  console.log("    --workspace-depth <N>        Max recursion depth for workspace snapshot (default: unlimited)");
  console.log("    --workspace-max-file <M>     Max file size (MB) to include content in snapshot (default: unlimited)");
  console.log("  read <path>                Print file contents");
  console.log("  write <path> <content>     Write content to a file");
  console.log("  exec <command>             Execute a shell command");
  console.log("  agent <goal> [options]     Run autonomous agent to achieve a goal");
  console.log("    --allow-exec                 Allow exec steps (default: true)");
  console.log("    --allow-write                Allow write steps");
  console.log("    --max-steps N                Maximum steps to run (default: 5)");
  console.log("    --dry-run                    Do not execute any steps, only show plan");
  console.log("    --simulate                   Skip exec/write but allow reads");
  console.log("    --yes, -y                    Auto-confirm prompts");
  console.log("    --log <file>                 Save agent history JSON to file");
  console.log("    --no-confirm-exec            Disable confirmation for exec steps");
  console.log("    --no-confirm-write           Disable confirmation for write steps");
  console.log("    --interactive, -i            Start interactive REPL (step/run/search)");
  console.log("    --web-results <N>            Default N results for interactive web search (default: 5)");
  console.log("    --web-fetch <K>              Default K pages to fetch after search (default: 0)");
  console.log("    --no-reflect                 Disable automatic reflection on failures");
  console.log("  completion <shell>         Output a shell completion script for bash|zsh|fish|powershell");
  console.log("                             Example: `copilot-cli completion bash > /etc/bash_completion.d/copilot-cli`");
}
function printCommandHelp(command) {
  const c = (command || "").toLowerCase();
  switch (c) {
    case "auth":
      console.log("auth \u2014 Start device-code auth flow and save PAT");
      console.log("Usage: copilot-cli auth");
      console.log("Opens a device-code URL and saves the resulting PAT to ~/.copilot-pat");
      break;
    case "chat":
      console.log("chat \u2014 Send a chat message to Copilot");
      console.log('Usage: copilot-cli chat [flags] "message"');
      console.log("Flags:");
      console.log("  --read <path>    Include file contents as system context");
      console.log("  --exec <cmd>     Execute a command and include output as context");
      console.log("  --write <path>   Write the message to a file before sending");
      console.log("  --workspace <dir>            Include a workspace snapshot (recursive) as system context");
      console.log("  --workspace-depth <N>        Max recursion depth for workspace snapshot (default: unlimited)");
      console.log("  --workspace-max-file <M>     Max file size (MB) to include content in snapshot (default: unlimited)");
      console.log("\nExamples:");
      console.log('  copilot-cli chat "Summarize the repo"');
      console.log('  copilot-cli chat --read ./README.md "Summarize this file"');
      break;
    case "read":
      console.log("read \u2014 Print file contents");
      console.log("Usage: copilot-cli read <path>");
      break;
    case "write":
      console.log("write \u2014 Write content to a file");
      console.log("Usage: copilot-cli write <path> <content>");
      break;
    case "exec":
      console.log("exec \u2014 Execute a shell command");
      console.log("Usage: copilot-cli exec <command>");
      console.log('Example: copilot-cli exec "ls -la"');
      break;
    case "agent":
      console.log("agent \u2014 Autonomous agent to perform a goal using read/exec/write steps");
      console.log("Usage: copilot-cli agent <goal> [options]");
      console.log("Options:");
      console.log("  --allow-exec            Allow exec steps (default: true)");
      console.log("  --allow-write           Allow write steps");
      console.log("  --max-steps N           Maximum steps to run (default: 5)");
      console.log("  --dry-run               Do not execute any steps, only show plan");
      console.log("  --simulate              Skip exec/write but allow reads");
      console.log("  --yes, -y               Auto-confirm prompts");
      console.log("  --log <file>            Save agent history JSON to file");
      console.log("  --no-confirm-exec       Disable confirmation for exec steps");
      console.log("  --no-confirm-write      Disable confirmation for write steps");
      console.log("  --interactive, -i       Start interactive REPL (step/run/search)");
      console.log("  --web-results <N>       Default N results for interactive web search (default: 5)");
      console.log("  --web-fetch <K>         Default K pages to fetch after search (default: 0)");
      console.log("  --no-reflect            Disable automatic reflection on failures");
      console.log("\nExamples:");
      console.log('  copilot-cli agent "Summarize README.md" --dry-run');
      console.log('  copilot-cli agent "Inspect top-level files and summarize" --simulate --log ./agent-log.json');
      break;
    default:
      console.log(`No detailed help available for '${command}'.`);
      printGeneralHelp();
  }
}
function printCompletion(shell) {
  const sh = (shell || "").toLowerCase();
  let base;
  try {
    base = import_path.default.resolve(import_path.default.dirname((0, import_url.fileURLToPath)(import_meta.url)), "..", "completions");
  } catch (e) {
    base = import_path.default.resolve(process.cwd(), "cli", "completions");
  }
  const map = {
    "bash": "copilot-cli.bash",
    "zsh": "copilot-cli.zsh",
    "fish": "copilot-cli.fish",
    "powershell": "copilot-cli.ps1"
  };
  const fname = map[sh];
  if (!fname) {
    console.log("Supported shells: bash, zsh, fish, powershell");
    return;
  }
  const full = import_path.default.join(base, fname);
  try {
    const content = import_fs.default.readFileSync(full, "utf8");
    console.log(content);
  } catch (e) {
    console.error("Completion script not found for", sh, "-", full);
  }
}
async function main() {
  const args = process.argv.slice(2);
  const helpFlags = /* @__PURE__ */ new Set(["help", "--help", "-help", "h", "--h", "-h"]);
  if (args.length === 0) {
    printGeneralHelp();
    process.exit(0);
  }
  if (helpFlags.has(args[0])) {
    if (args[1]) {
      printCommandHelp(args[1]);
    } else {
      printGeneralHelp();
    }
    process.exit(0);
  }
  if (args.slice(1).some((a) => helpFlags.has(a))) {
    printCommandHelp(args[0]);
    process.exit(0);
  }
  const cmd = args[0];
  try {
    if (cmd === "read") {
      const target = args[1];
      if (!target) {
        console.error("Usage: copilot-cli read <path>");
        process.exit(1);
      }
      try {
        const content = import_fs.default.readFileSync(import_path.default.resolve(target), "utf8");
        console.log(content);
      } catch (e) {
        console.error("Failed to read file:", e.message);
        process.exit(1);
      }
      process.exit(0);
    }
    if (cmd === "write") {
      const target = args[1];
      const data = args.slice(2).join(" ");
      if (!target || data === void 0) {
        console.error("Usage: copilot-cli write <path> <content>");
        process.exit(1);
      }
      try {
        const absTarget = import_path.default.resolve(target);
        let oldText = "";
        try {
          oldText = import_fs.default.existsSync(absTarget) ? import_fs.default.readFileSync(absTarget, "utf8") : "";
        } catch (e) {
          oldText = "";
        }
        const patch = makeUnifiedDiff(import_path.default.relative(process.cwd(), absTarget), oldText, data);
        console.log("Proposed patch:\n");
        console.log(patch);
        const rl = import_readline.default.createInterface({ input: process.stdin, output: process.stdout });
        const ok = await new Promise((res) => rl.question("Apply this patch? (y/n) ", (ans) => {
          rl.close();
          res(/^y(es)?$/i.test(ans.trim()));
        }));
        if (!ok) {
          console.log("User declined.");
          process.exit(0);
        }
        import_fs.default.writeFileSync(absTarget, data, "utf8");
        if (isGitRepo(process.cwd())) {
          try {
            const r = await applyPatchText(patch, process.cwd());
            if (!r.applied)
              console.log("Warning: git apply failed:", r.outMsg);
          } catch (e) {
          }
        }
        console.log("Wrote", target);
      } catch (e) {
        console.error("Failed to write file:", e.message);
        process.exit(1);
      }
      process.exit(0);
    }
    if (cmd === "exec") {
      const command = args.slice(1).join(" ");
      if (!command) {
        console.error("Usage: copilot-cli exec <command>");
        process.exit(1);
      }
      try {
        const shell = detectShell();
        const { stdout, stderr } = await exec(command, { shell, windowsHide: true });
        if (stdout)
          process.stdout.write(stdout);
        if (stderr)
          process.stderr.write(stderr);
      } catch (e) {
        console.error("Command failed:", e.message);
        process.exit(1);
      }
      process.exit(0);
    }
    if (cmd === "auth") {
      await doAuth();
    } else if (cmd === "chat") {
      const flags = {};
      const rest = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === "--read" || a === "-r") {
          flags.read = args[++i];
        } else if (a === "--exec" || a === "-x") {
          flags.exec = args[++i];
        } else if (a === "--write" || a === "-w") {
          flags.write = args[++i];
        } else if (a === "--workspace") {
          flags.workspace = args[++i];
        } else if (a === "--workspace-depth") {
          flags.workspaceDepth = parseInt(args[++i], 10) || Infinity;
        } else if (a === "--workspace-max-file") {
          flags.workspaceMaxFile = parseFloat(args[++i]) || null;
        } else {
          rest.push(a);
        }
      }
      const msg = rest.join(" ");
      if (!msg && !flags.read && !flags.exec) {
        console.error('Please provide a message or use --read/--exec: copilot-cli chat [flags] "message"');
        process.exit(1);
      }
      const wsFlags = {
        workspace: flags.workspace || process.env.COPILOT_WORKSPACE || null,
        depth: flags.workspaceDepth || Infinity,
        maxFileMB: flags.workspaceMaxFile || null
      };
      const systemParts = [];
      if (flags.read) {
        try {
          const content = import_fs.default.readFileSync(import_path.default.resolve(flags.read), "utf8");
          systemParts.push(`File contents of ${flags.read}:

${content}`);
        } catch (e) {
          console.error("Failed to read file for --read:", e.message);
          process.exit(1);
        }
      }
      if (wsFlags.workspace) {
        try {
          const wsPath = import_path.default.resolve(wsFlags.workspace);
          const files = readDirRecursive(wsPath, { maxDepth: wsFlags.depth, maxFileMB: wsFlags.maxFileMB });
          systemParts.push(`Workspace ${wsPath} snapshot (maxDepth=${wsFlags.depth === Infinity ? "unlimited" : wsFlags.depth}, maxFileMB=${wsFlags.maxFileMB === null ? "unlimited" : wsFlags.maxFileMB}MB):

${files.map((f) => `${f.path}:
${f.snippet}
`).join("\n")}`);
        } catch (e) {
          console.error("Failed to read workspace for --workspace:", e.message);
          process.exit(1);
        }
      }
      if (flags.exec) {
        try {
          const shell = detectShell();
          const commandToRun = normalizeCommand(flags.exec);
          const { stdout, stderr } = await runCommand(commandToRun);
          const out = stdout ? stdout : "";
          const err = stderr ? stderr : "";
          systemParts.push(`Command output of (${flags.exec}):

${out}${err}`);
        } catch (e) {
          console.error("Failed to execute command for --exec:", e.message);
          process.exit(1);
        }
      }
      if (flags.write) {
        try {
          import_fs.default.writeFileSync(import_path.default.resolve(flags.write), msg, "utf8");
          console.log("Wrote message to", flags.write);
        } catch (e) {
          console.error("Failed to write file for --write:", e.message);
          process.exit(1);
        }
      }
      const inline = parseInlineCommands(msg);
      let inlineParts = [];
      for (const r of inline.reads) {
        try {
          const content = import_fs.default.readFileSync(import_path.default.resolve(r), "utf8");
          inlineParts.push(`File contents of ${r}:

${content}`);
        } catch (e) {
          inlineParts.push(`Failed to read ${r}: ${e.message}`);
        }
      }
      for (const c of inline.execs) {
        try {
          const shell = detectShell();
          const commandToRun = normalizeCommand(c);
          const { stdout, stderr } = await runCommand(commandToRun);
          inlineParts.push(`Command output of (${c}):

${stdout || ""}${stderr || ""}`);
        } catch (e) {
          inlineParts.push(`Failed to exec ${c}: ${e.message}`);
        }
      }
      for (const w of inline.writes) {
        try {
          import_fs.default.writeFileSync(import_path.default.resolve(w.path), w.content, "utf8");
          inlineParts.push(`Wrote to ${w.path}`);
        } catch (e) {
          inlineParts.push(`Failed to write ${w.path}: ${e.message}`);
        }
      }
      if ((isCommandOnly(msg) || (!msg || msg.trim().length === 0)) && inlineParts.length > 0) {
        console.log(inlineParts.join("\n\n"));
        process.exit(0);
      }
      const mergedSystemParts = [...systemParts, ...inlineParts];
      if (mergedSystemParts.length > 0 && isChatIntent(msg)) {
        await doChat(msg, mergedSystemParts);
      } else if (mergedSystemParts.length > 0 && !isChatIntent(msg)) {
        await doChat(msg, mergedSystemParts);
      } else {
        await doChat(msg, systemParts);
      }
    } else if (cmd === "completion") {
      const shell = args[1] || "bash";
      printCompletion(shell);
      process.exit(0);
    } else if (cmd === "agent") {
      let validateStep = function(step) {
        if (!step || typeof step !== "object")
          return "Step is not an object";
        if (!step.action || typeof step.action !== "string")
          return "Missing or invalid action";
        const act = step.action.toLowerCase();
        if (!["read", "exec", "write", "retrieve", "apply_patch"].includes(act))
          return `Invalid action: ${step.action}`;
        if (act !== "apply_patch" && (!step.target || typeof step.target !== "string"))
          return "Missing or invalid target";
        if (act === "write" && typeof step.content !== "string")
          return "Write action requires content string";
        if (act === "apply_patch" && typeof step.content !== "string")
          return "apply_patch requires diff content string";
        if (flags.whitelist.length > 0) {
          const ok = flags.whitelist.some((w) => step.target.includes(w) || step.content && step.content.includes(w));
          if (!ok)
            return `Target not in whitelist: ${step.target}`;
        }
        return null;
      }, askConfirm = function(question) {
        if (flags.yes)
          return Promise.resolve(true);
        return new Promise((resolve) => {
          const rl = import_readline.default.createInterface({ input: process.stdin, output: process.stdout });
          rl.question(`${question} (y/n) `, (answer) => {
            rl.close();
            resolve(/^y(es)?$/i.test(answer.trim()));
          });
        });
      }, extractWorkspaceFlagsAgent = function() {
        const a = process.argv.slice(2);
        const out = { workspace: process.env.COPILOT_WORKSPACE || null, depth: Infinity, maxFileMB: null };
        for (let i = 0; i < a.length; i++) {
          if (a[i] === "--workspace")
            out.workspace = a[++i];
          else if (a[i] === "--workspace-depth") {
            const v = a[++i];
            out.depth = v ? parseInt(v, 10) || Infinity : Infinity;
          } else if (a[i] === "--workspace-max-file") {
            const v = a[++i];
            out.maxFileMB = v ? parseFloat(v) || null : null;
          }
        }
        return out;
      };
      const flags = { allowExec: true, allowWrite: false, maxSteps: 5, dryRun: false, yes: false, whitelist: [], simulate: false, log: null, confirmExec: false, confirmWrite: true, confirmRead: false, interactive: false, webResults: 5, webFetch: 0, reflect: true };
      const rest = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === "--allow-exec")
          flags.allowExec = true;
        else if (a === "--allow-write")
          flags.allowWrite = true;
        else if (a === "--max-steps")
          flags.maxSteps = parseInt(args[++i] || "5", 10) || 5;
        else if (a === "--dry-run")
          flags.dryRun = true;
        else if (a === "--yes" || a === "-y")
          flags.yes = true;
        else if (a === "--whitelist")
          flags.whitelist = (args[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
        else if (a === "--simulate")
          flags.simulate = true;
        else if (a === "--log")
          flags.log = args[++i];
        else if (a === "--confirm-exec")
          flags.confirmExec = true;
        else if (a === "--no-confirm-exec")
          flags.confirmExec = false;
        else if (a === "--confirm-write")
          flags.confirmWrite = true;
        else if (a === "--no-confirm-write")
          flags.confirmWrite = false;
        else if (a === "--confirm-read")
          flags.confirmRead = true;
        else if (a === "--no-confirm-read")
          flags.confirmRead = false;
        else if (a === "--interactive" || a === "-i")
          flags.interactive = true;
        else if (a === "--web-results")
          flags.webResults = parseInt(args[++i] || "5", 10) || 5;
        else if (a === "--web-fetch")
          flags.webFetch = parseInt(args[++i] || "0", 10) || 0;
        else if (a === "--no-reflect")
          flags.reflect = false;
        else
          rest.push(a);
      }
      let goal = rest.join(" ");
      if (!goal) {
        console.error("Usage: copilot-cli agent <goal> [--allow-exec] [--allow-write] [--max-steps N] [--dry-run] [--yes] [--whitelist a,b]");
        process.exit(1);
      }
      const planRequest = `You are an autonomous assistant that generates a plan of actions for a runtime to perform.
Given the goal: ${goal}
Return ONLY a JSON array (no surrounding text) where each element has:
- action: one of "read", "exec", "write", "retrieve", "apply_patch"
- target: path (for read/write), command (for exec), query (for retrieve), or description (for apply_patch)
- content: (optional) for write and apply_patch (unified diff as text)
- topK: (optional, number) for retrieve
Example: [{"action":"retrieve","target":"top functions in src","topK":5},{"action":"read","target":"./README.md"},{"action":"exec","target":"ls -la"},{"action":"apply_patch","target":"refactor foo","content":"diff --git a/src/a.js b/src/a.js
..."}]
Output nothing else.`;
      let pat = process.env.COPILOT_PAT || readPATFromFile();
      if (!pat) {
        console.error("No PAT found. Run `copilot-cli auth` or set COPILOT_PAT.");
        process.exit(1);
      }
      const tokenResp = await fetchToken(pat);
      const accessToken = tokenResp.token;
      if (!accessToken)
        throw new Error("Failed to obtain access token from PAT");
      let planResp = await sendMessage(accessToken, [
        { role: "system", content: planRequest },
        { role: "user", content: goal }
      ]);
      let planText = planResp?.choices?.[0]?.message?.content || "";
      let plan;
      try {
        plan = JSON.parse(planText);
      } catch (e) {
        const m = planText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (m) {
          try {
            plan = JSON.parse(m[0]);
          } catch (e2) {
            plan = null;
          }
        }
      }
      if (!Array.isArray(plan)) {
        const strict = `You must respond with ONLY a JSON array (no explanation). Each element: {"action":"read"|"exec"|"write","target":"...","content":"..." (optional)}. Example: [{"action":"read","target":"./README.md"}]`;
        planResp = await sendMessage(accessToken, [
          { role: "system", content: strict },
          { role: "user", content: planText || goal }
        ]);
        planText = planResp?.choices?.[0]?.message?.content || "";
        const m2 = planText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (m2) {
          try {
            plan = JSON.parse(m2[0]);
          } catch (e3) {
            plan = null;
          }
        }
      }
      if (!Array.isArray(plan)) {
        console.error("Agent: could not parse plan JSON from model output.");
        console.log("Model output:\n", planText);
        process.exit(1);
      }
      let queue = [...plan];
      let stepIndex = 0;
      const history = [];
      const wsFlagsAgent = extractWorkspaceFlagsAgent();
      let wsIndex = null;
      if (wsFlagsAgent.workspace) {
        try {
          wsIndex = buildWorkspaceIndex(import_path.default.resolve(wsFlagsAgent.workspace), { maxDepth: wsFlagsAgent.depth, maxFileMB: wsFlagsAgent.maxFileMB, chunkLines: 200 });
        } catch (e) {
          console.warn("Index build failed:", e.message);
        }
      }
      if (flags.interactive) {
        console.log('Interactive agent mode. Type "help" for commands. Goal:', goal);
        const rl = import_readline.default.createInterface({ input: process.stdin, output: process.stdout, historySize: 1e3 });
        let lastSearch = [];
        const prompt = () => rl.prompt();
        rl.setPrompt("agent> ");
        rl.on("line", async (line) => {
          const input = line.trim();
          if (!input)
            return prompt();
          const [cmd0, ...restParts] = input.split(" ");
          const argStr = restParts.join(" ").trim();
          try {
            switch (cmd0.toLowerCase()) {
              case "h":
              case "help":
                console.log("Commands:");
                console.log("  plan                Regenerate plan from goal");
                console.log("  next                Ask model for next step and enqueue");
                console.log("  run                 Execute next step in queue");
                console.log("  run all             Execute steps until queue empty or max-steps");
                console.log("  show                Show queued steps");
                console.log("  history             Show step history");
                console.log("  read <path>         Read a file (workspace constrained if set)");
                console.log("  write <path> <txt>  Write text to file (allow-write required)");
                console.log("  exec <cmd>          Execute a shell command (allow-exec required)");
                console.log("  search <query>      Web search via DuckDuckGo");
                console.log("  open <n>            Fetch nth result from last search");
                console.log("  goal <new text>     Update the goal");
                console.log("  quit/exit           Quit interactive mode");
                break;
              case "plan": {
                const planResp2 = await sendMessage(accessToken, [{ role: "system", content: planRequest }, { role: "user", content: goal }]);
                const txt = planResp2?.choices?.[0]?.message?.content || "";
                let p;
                const m3 = txt.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (m3) {
                  try {
                    p = JSON.parse(m3[0]);
                  } catch {
                  }
                }
                if (Array.isArray(p)) {
                  queue = [...p];
                  console.log("Plan updated. Steps:", p.length);
                } else
                  console.log("Failed to parse plan. Raw:", txt.substring(0, 500));
                break;
              }
              case "next": {
                const askNext = `Given the goal: ${goal} and the history: ${JSON.stringify(history)}, return the NEXT step as a single JSON object or an empty array if done. Object format: {"action":"read"|"exec"|"write","target":"...","content":"..." (optional)}`;
                const nextResp = await sendMessage(accessToken, [{ role: "system", content: askNext }, { role: "user", content: goal }]);
                const nextText = nextResp?.choices?.[0]?.message?.content || "";
                const m4 = nextText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (m4) {
                  try {
                    const n = JSON.parse(m4[0]);
                    if (!Array.isArray(n))
                      queue.push(n);
                    console.log("Enqueued next step.");
                  } catch {
                    console.log("Failed to parse next step.");
                  }
                } else
                  console.log("No next step.");
                break;
              }
              case "show":
                console.log("Queue:", queue);
                break;
              case "history":
                console.log("History length:", history.length);
                for (let i = 0; i < history.length; i++)
                  console.log(`#${i + 1}`, history[i].step, String(history[i].result).slice(0, 200));
                break;
              case "read": {
                const target = argStr;
                if (!target) {
                  console.log("Usage: read <path>");
                  break;
                }
                const s = { action: "read", target };
                const err = validateStep(s);
                if (err) {
                  console.log("Invalid:", err);
                  break;
                }
                try {
                  const full = import_path.default.resolve(target);
                  if (wsFlagsAgent.workspace && !isPathInside(import_path.default.resolve(wsFlagsAgent.workspace), full))
                    throw new Error("Read target outside of workspace");
                  const content = import_fs.default.readFileSync(full, "utf8");
                  console.log(content.substring(0, 4e3));
                  history.push({ step: s, result: content });
                } catch (e) {
                  console.log("Read failed:", e.message);
                }
                break;
              }
              case "write": {
                const sp = argStr.split(" ");
                const target = sp.shift();
                const text = sp.join(" ");
                if (!target || text === void 0) {
                  console.log("Usage: write <path> <text>");
                  break;
                }
                if (!flags.allowWrite) {
                  console.log("Write not allowed. Enable --allow-write.");
                  break;
                }
                try {
                  const absTarget = wsFlagsAgent.workspace ? import_path.default.resolve(wsFlagsAgent.workspace, target) : import_path.default.resolve(target);
                  let oldText = "";
                  try {
                    oldText = import_fs.default.existsSync(absTarget) ? import_fs.default.readFileSync(absTarget, "utf8") : "";
                  } catch (e) {
                    oldText = "";
                  }
                  const patch = makeUnifiedDiff(import_path.default.relative(wsFlagsAgent.workspace || process.cwd(), absTarget), oldText, text);
                  console.log("Proposed patch:\n");
                  console.log(patch);
                  const doApply = await askConfirm("Apply this patch?");
                  if (!doApply) {
                    console.log("User declined.");
                    break;
                  }
                  if (wsFlagsAgent.workspace)
                    safeWriteRecursive(wsFlagsAgent.workspace, target, text);
                  else
                    import_fs.default.writeFileSync(absTarget, text, "utf8");
                  if (isGitRepo(wsFlagsAgent.workspace || process.cwd())) {
                    try {
                      const r = await applyPatchText(patch, wsFlagsAgent.workspace || process.cwd());
                      if (!r.applied)
                        console.log("Patch write applied but git apply failed:", r.outMsg);
                    } catch (e) {
                    }
                  }
                  console.log("Wrote to", target);
                  history.push({ step: { action: "write", target, content: text }, result: "written" });
                } catch (e) {
                  console.log("Write failed:", e.message);
                }
                break;
              }
              case "exec": {
                const cmdline = argStr;
                if (!cmdline) {
                  console.log("Usage: exec <command>");
                  break;
                }
                if (!flags.allowExec) {
                  console.log("Exec not allowed. Enable --allow-exec.");
                  break;
                }
                try {
                  const { stdout, stderr } = await runCommand(normalizeCommand(cmdline));
                  if (stdout)
                    process.stdout.write(stdout);
                  if (stderr)
                    process.stderr.write(stderr);
                  history.push({ step: { action: "exec", target: cmdline }, result: (stdout || stderr || "").slice(0, 4e3) });
                } catch (e) {
                  console.log("Exec failed:", e.message);
                }
                break;
              }
              case "search": {
                const q = argStr || goal;
                if (!q) {
                  console.log("Usage: search <query>");
                  break;
                }
                const res = await webSearch(q, flags.webResults);
                lastSearch = res;
                if (!res.length) {
                  console.log("No results.");
                  break;
                }
                res.forEach((r, i) => console.log(`${i + 1}. ${r.title} - ${r.url}`));
                if (flags.webFetch > 0) {
                  const k = Math.min(flags.webFetch, res.length);
                  for (let i = 0; i < k; i++) {
                    console.log(`
Fetching [${i + 1}] ${res[i].url}`);
                    const content = await fetchPage(res[i].url, 2e3);
                    console.log(content);
                    history.push({ step: { action: "read", target: res[i].url }, result: content });
                  }
                }
                break;
              }
              case "retrieve": {
                const q = argStr || goal;
                if (!q) {
                  console.log("Usage: retrieve <query>");
                  break;
                }
                try {
                  if (!wsIndex && wsFlagsAgent.workspace) {
                    wsIndex = buildWorkspaceIndex(import_path.default.resolve(wsFlagsAgent.workspace), { maxDepth: wsFlagsAgent.depth, maxFileMB: wsFlagsAgent.maxFileMB, chunkLines: 200 });
                  }
                  const res = wsIndex ? retrieveFromIndex(wsIndex, q, 5) : [];
                  if (!res.length) {
                    console.log("(no results)");
                    break;
                  }
                  res.forEach((r, i) => {
                    console.log(`${i + 1}. ${r.rel}:${r.range[0]}-${r.range[1]} (score=${r.score})`);
                    console.log(r.snippet);
                    console.log();
                  });
                  history.push({ step: { action: "retrieve", target: q, topK: 5 }, result: JSON.stringify(res) });
                } catch (e) {
                  console.log("Retrieve failed:", e.message);
                }
                break;
              }
              case "open": {
                const idx = parseInt(argStr, 10) || 0;
                if (idx < 1 || idx > lastSearch.length) {
                  console.log("Usage: open <n> (from last search)");
                  break;
                }
                const r = lastSearch[idx - 1];
                console.log("Fetching", r.url);
                const content = await fetchPage(r.url, 4e3);
                console.log(content);
                history.push({ step: { action: "read", target: r.url }, result: content });
                break;
              }
              case "goal":
                if (!argStr) {
                  console.log("Current goal:", goal);
                  break;
                }
                goal = argStr;
                queue = [];
                console.log("Goal updated.");
                break;
              case "run": {
                const restRun = argStr.toLowerCase();
                const runOne = async () => {
                  if (queue.length === 0) {
                    console.log("Queue empty. Use next or plan.");
                    return;
                  }
                  const s = queue.shift();
                  stepIndex++;
                  console.log(`Step ${stepIndex}:`, s.action, s.target || "");
                  const validationError = validateStep(s);
                  if (validationError) {
                    console.log("Invalid step:", validationError);
                    history.push({ step: s, result: `invalid: ${validationError}` });
                    return;
                  }
                  if (s.action === "read") {
                    try {
                      const full = import_path.default.resolve(s.target);
                      if (wsFlagsAgent.workspace && !isPathInside(import_path.default.resolve(wsFlagsAgent.workspace), full))
                        throw new Error("Read target outside of workspace");
                      const content = import_fs.default.readFileSync(full, "utf8");
                      console.log(content.substring(0, 2e3));
                      history.push({ step: s, result: content });
                    } catch (e) {
                      console.log("Read failed:", e.message);
                      history.push({ step: s, result: `read error: ${e.message}` });
                    }
                  } else if (s.action === "exec") {
                    if (!flags.allowExec) {
                      console.log("Exec not allowed.");
                      history.push({ step: s, result: "exec not allowed" });
                    } else {
                      try {
                        const { stdout, stderr } = await runCommand(normalizeCommand(s.target));
                        console.log(stdout || "");
                        if (stderr)
                          console.error(stderr);
                        history.push({ step: s, result: stdout || stderr || "" });
                      } catch (e) {
                        console.log("Exec failed:", e.message);
                        history.push({ step: s, result: `exec error: ${e.message}` });
                      }
                    }
                  } else if (s.action === "write") {
                    if (!flags.allowWrite) {
                      console.log("Write not allowed.");
                      history.push({ step: s, result: "write not allowed" });
                    } else {
                      try {
                        if (wsFlagsAgent.workspace)
                          safeWriteRecursive(wsFlagsAgent.workspace, s.target, s.content || "");
                        else
                          import_fs.default.writeFileSync(import_path.default.resolve(s.target), s.content || "", "utf8");
                        console.log("Wrote to", s.target);
                        history.push({ step: s, result: "written" });
                      } catch (e) {
                        console.log("Write failed:", e.message);
                        history.push({ step: s, result: `write error: ${e.message}` });
                      }
                    }
                  }
                };
                if (restRun === "all") {
                  let count = 0;
                  while (count < flags.maxSteps) {
                    if (queue.length === 0)
                      break;
                    await runOne();
                    count++;
                  }
                } else {
                  await runOne();
                }
                break;
              }
              case "quit":
              case "exit":
                rl.close();
                return;
              default:
                console.log('Unknown command. Type "help".');
            }
          } catch (e) {
            console.log("Error:", e.message);
          } finally {
            prompt();
          }
        }).on("close", () => {
          console.log("Exiting interactive agent.");
          if (flags.log) {
            try {
              import_fs.default.writeFileSync(import_path.default.resolve(flags.log), JSON.stringify({ goal, flags, history }, null, 2), "utf8");
              console.log("Agent history written to", flags.log);
            } catch (e) {
              console.error("Failed to write agent log:", e.message);
            }
          }
          process.exit(0);
        });
        prompt();
        return;
      }
      while (stepIndex < flags.maxSteps) {
        if (queue.length === 0) {
          const askNext = `Given the goal: ${goal} and the history: ${JSON.stringify(history)}, return the NEXT step as a single JSON object or an empty array if done. Object format: {"action":"read"|"exec"|"write","target":"...","content":"..." (optional)}`;
          const nextResp = await sendMessage(accessToken, [{ role: "system", content: askNext }, { role: "user", content: goal }]);
          const nextText = nextResp?.choices?.[0]?.message?.content || "";
          const m = nextText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          let next;
          if (m) {
            try {
              next = JSON.parse(m[0]);
            } catch (e) {
              next = null;
            }
          }
          if (!next || Array.isArray(next) && next.length === 0)
            break;
          if (!Array.isArray(next))
            queue.push(next);
        }
        const s = queue.shift();
        stepIndex++;
        console.log(`Step ${stepIndex}:`, s.action, s.target || "");
        const validationError = validateStep(s);
        if (validationError) {
          console.error("Invalid step, skipping:", validationError);
          history.push({ step: s, result: `invalid: ${validationError}` });
          continue;
        }
        if (flags.dryRun) {
          console.log("[dry-run] Would execute:", s.action, s.target || "", s.content || "");
          history.push({ step: s, result: "[dry-run] skipped" });
          continue;
        }
        if (flags.simulate && (s.action === "exec" || s.action === "write")) {
          console.log("[simulate] Would execute:", s.action, s.target || "", s.content || "");
          history.push({ step: s, result: "[simulate] skipped" });
          continue;
        }
        let needsConfirm = false;
        if (s.action === "exec")
          needsConfirm = !!flags.confirmExec;
        else if (s.action === "write")
          needsConfirm = !!flags.confirmWrite;
        else if (s.action === "read")
          needsConfirm = !!flags.confirmRead;
        if (needsConfirm) {
          const proceed = await askConfirm(`Execute step ${stepIndex}: ${s.action} ${s.target || ""}?`);
          if (!proceed) {
            console.log("User declined. Skipping step.");
            history.push({ step: s, result: "user declined" });
            continue;
          }
        }
        if (s.action === "read") {
          try {
            const full = import_path.default.resolve(s.target);
            if (wsFlagsAgent.workspace && !isPathInside(import_path.default.resolve(wsFlagsAgent.workspace), full)) {
              throw new Error("Read target outside of workspace");
            }
            const content = import_fs.default.readFileSync(full, "utf8");
            console.log("Read output:\n", content.substring(0, 2e3));
            history.push({ step: s, result: content });
          } catch (e) {
            console.error("Read failed:", e.message);
            history.push({ step: s, result: `read error: ${e.message}` });
          }
        } else if (s.action === "exec") {
          if (!flags.allowExec) {
            console.warn("Exec not allowed. Skipping:", s.target);
            history.push({ step: s, result: "exec not allowed" });
            continue;
          }
          try {
            const commandToRun = normalizeCommand(s.target);
            const { stdout, stderr } = await runCommand(commandToRun);
            console.log("Exec stdout:\n", stdout || "");
            if (stderr)
              console.error("Exec stderr:\n", stderr);
            history.push({ step: s, result: stdout || stderr || "" });
          } catch (e) {
            console.error("Exec failed:", e.message);
            history.push({ step: s, result: `exec error: ${e.message}` });
          }
        } else if (s.action === "write") {
          if (!flags.allowWrite) {
            console.warn("Write not allowed. Skipping:", s.target);
            history.push({ step: s, result: "write not allowed" });
            continue;
          }
          try {
            if (wsFlagsAgent.workspace) {
              safeWriteRecursive(wsFlagsAgent.workspace, s.target, s.content || "");
            } else {
              import_fs.default.writeFileSync(import_path.default.resolve(s.target), s.content || "", "utf8");
            }
            console.log("Wrote to", s.target);
            history.push({ step: s, result: "written" });
          } catch (e) {
            console.error("Write failed:", e.message);
            history.push({ step: s, result: `write error: ${e.message}` });
          }
        } else if (s.action === "retrieve") {
          try {
            const q = s.target || "";
            const k = typeof s.topK === "number" ? s.topK : 5;
            if (!wsIndex && wsFlagsAgent.workspace) {
              wsIndex = buildWorkspaceIndex(import_path.default.resolve(wsFlagsAgent.workspace), { maxDepth: wsFlagsAgent.depth, maxFileMB: wsFlagsAgent.maxFileMB, chunkLines: 200 });
            }
            const results = wsIndex ? retrieveFromIndex(wsIndex, q, k) : [];
            const text = results.map((r) => `${r.rel}:${r.range[0]}-${r.range[1]} (score=${r.score})
${r.snippet}`).join("\n\n");
            console.log("Retrieve results:\n", text.substring(0, 4e3) || "(none)");
            history.push({ step: s, result: text });
          } catch (e) {
            console.error("Retrieve failed:", e.message);
            history.push({ step: s, result: `retrieve error: ${e.message}` });
          }
        } else if (s.action === "apply_patch") {
          if (!flags.allowWrite) {
            console.warn("Apply patch not allowed (requires --allow-write). Skipping.");
            history.push({ step: s, result: "apply_patch not allowed" });
          } else {
            try {
              const patchText = s.content || "";
              if (!patchText.trim())
                throw new Error("Empty patch content");
              const pathsInPatch = Array.from(patchText.matchAll(/^\+\+\+\s+\S*?([^\s\n]+)$/gm)).map((m) => m[1]).filter(Boolean);
              if (wsFlagsAgent.workspace && pathsInPatch.length) {
                const base = import_path.default.resolve(wsFlagsAgent.workspace);
                for (const p of pathsInPatch) {
                  const clean = p.replace(/^a\//, "").replace(/^b\//, "");
                  const abs = import_path.default.resolve(base, clean);
                  if (!isPathInside(base, abs))
                    throw new Error(`Patch modifies path outside workspace: ${clean}`);
                }
              }
              const proceed = flags.yes ? true : await new Promise((resolve) => {
                const rl2 = import_readline.default.createInterface({ input: process.stdin, output: process.stdout });
                rl2.question("Apply patch? (y/n) ", (ans) => {
                  rl2.close();
                  resolve(/^y(es)?$/i.test(ans.trim()));
                });
              });
              if (!proceed) {
                console.log("User declined patch.");
                history.push({ step: s, result: "user declined patch" });
              } else {
                console.log("Patch preview:\n");
                console.log(patchText.substring(0, 2e4));
                const proceedApply = flags.yes ? true : await new Promise((resolve) => {
                  const rl3 = import_readline.default.createInterface({ input: process.stdin, output: process.stdout });
                  rl3.question("Apply patch? (y/n) ", (ans) => {
                    rl3.close();
                    resolve(/^y(es)?$/i.test(ans.trim()));
                  });
                });
                if (!proceedApply) {
                  console.log("User declined patch.");
                  history.push({ step: s, result: "user declined patch" });
                } else {
                  let appliedObj = { applied: false, outMsg: "" };
                  if (isGitRepo(wsFlagsAgent.workspace || process.cwd())) {
                    appliedObj = await applyPatchText(patchText, wsFlagsAgent.workspace || process.cwd());
                    if (!appliedObj.applied)
                      throw new Error("git apply failed: " + appliedObj.outMsg);
                  } else {
                    try {
                      const m = patchText.match(/\+\+\+ b\/(.+)\n([\s\S]*)$/m);
                      if (m) {
                        const rel = m[1].trim();
                        const newLines = patchText.split(/\r?\n/).filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
                        const newText = newLines.join("\n");
                        const abs = wsFlagsAgent.workspace ? import_path.default.resolve(wsFlagsAgent.workspace, rel) : import_path.default.resolve(rel);
                        if (wsFlagsAgent.workspace && !isPathInside(import_path.default.resolve(wsFlagsAgent.workspace), abs))
                          throw new Error("Patch target outside workspace");
                        import_fs.default.mkdirSync(import_path.default.dirname(abs), { recursive: true });
                        import_fs.default.writeFileSync(abs, newText, "utf8");
                        appliedObj.applied = true;
                        appliedObj.outMsg = "wrote file(s) directly (fallback)";
                      } else
                        throw new Error("Patch format not recognized for fallback");
                    } catch (e) {
                      throw new Error("Fallback write failed: " + e.message);
                    }
                  }
                  console.log("Patch applied.");
                  history.push({ step: s, result: "patch applied" });
                }
              }
            } catch (e) {
              console.error("Apply patch failed:", e.message);
              history.push({ step: s, result: `apply_patch error: ${e.message}` });
            }
          }
        }
        const last = history[history.length - 1];
        if (flags.reflect && last && typeof last.result === "string" && /\b(error|failed)\b/i.test(last.result)) {
          try {
            const reflectPrompt = `Previous step failed. Goal: ${goal}. Last step: ${JSON.stringify(last.step)}. Error: ${last.result}. Suggest ONE next step as a JSON object: {"action":"read"|"exec"|"write"|"retrieve"|"apply_patch","target":"...","content":"..." (optional),"topK":(optional number)}. Output JSON only.`;
            const r = await sendMessage(accessToken, [{ role: "system", content: reflectPrompt }, { role: "user", content: goal }]);
            const txt = r?.choices?.[0]?.message?.content || "";
            const m = txt.match(/\{[\s\S]*\}/);
            if (m) {
              try {
                const obj = JSON.parse(m[0]);
                queue.unshift(obj);
                console.log("Reflection enqueued a recovery step.");
              } catch {
              }
            }
          } catch (e) {
          }
        }
      }
      if (flags.log) {
        try {
          import_fs.default.writeFileSync(import_path.default.resolve(flags.log), JSON.stringify({ goal, flags, history }, null, 2), "utf8");
          console.log("Agent history written to", flags.log);
        } catch (e) {
          console.error("Failed to write agent log:", e.message);
        }
      }
    } else {
      console.error("Unknown command", cmd);
      process.exit(1);
    }
  } catch (e) {
    console.error("Error:", e.message || e);
    process.exit(1);
  }
}
main();
