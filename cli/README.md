# copilot-cli

Minimal GitHub Copilot CLI built from the obsidian-github-copilot repo.

Features

- Device-code auth flow to obtain a GitHub PAT
- Exchange PAT for Copilot access token and send a chat message

Requirements

- Node 18+ (for global fetch) or install `node-fetch`

Install (developer)

From repo root, run:

  npm --prefix ./cli install
  npm --prefix ./cli link

Usage

- Start device auth: `copilot-cli auth`
- Send a chat message: `copilot-cli chat "Write a short JS function to..."`

File and shell commands

- Read a file: `copilot-cli read ./styles.css`
- Write a file: `copilot-cli write ./tmp.txt "hello world"`
- Execute a shell command: `copilot-cli exec "echo hello"`

Workspace and agent flags

- `--workspace <dir>`: include a workspace snapshot as system context for `chat` and `agent` modes
- `--workspace-depth <N>`: max recursion depth when collecting snapshot (default: unlimited)
- `--workspace-max-file <M>`: max file size in MB to include file contents in snapshot (default: unlimited)

Agent safety flags

- `--allow-exec`: allow exec steps (default: true)
- `--allow-write`: allow write steps (agent only)
- `--dry-run`: show plan but do not execute steps
- `--simulate`: allow reads but skip exec and write steps
- `--yes, -y`: auto-confirm prompts
- `--log <file>`: save agent history JSON to file
- `--confirm-exec`, `--no-confirm-exec`, `--confirm-write`, `--no-confirm-write`: per-action confirmations

Shell completions
You can generate and install shell completions from the CLI. Example:

```bash
# Bash (current session)
copilot-cli completion bash | source

# To install for all sessions on Linux
copilot-cli completion bash > /etc/bash_completion.d/copilot-cli

# Zsh
copilot-cli completion zsh > ~/.zsh/completions/_copilot-cli
# then add that directory to $fpath and run `autoload -Uz compinit; compinit`

# Fish
copilot-cli completion fish > ~/.config/fish/completions/copilot-cli.fish

# PowerShell
copilot-cli completion powershell | Out-String | Invoke-Expression
```

Notes

- PAT will be saved to `~/.copilot-pat` with mode 600
- You can also set `COPILOT_PAT` env var instead of saving the PAT

Security note: `exec` runs arbitrary shell commands. Be careful when using it and avoid running untrusted input.
