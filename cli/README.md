# copilot-cli

Minimal GitHub Copilot CLI built from the obsidian-github-copilot repo.

Features
- Device-code auth flow to obtain a GitHub PAT
- Exchange PAT for Copilot access token and send a chat message
- Interactive agent mode with workspace read/write/exec capabilities
- Optional web search tools for enhanced research capabilities
- Safety confirmations and dry-run/simulate modes

Requirements
- Node 18+ (for global fetch) or install `node-fetch`

Install (developer)
- From repo root, run:

  npm --prefix ./cli install
  npm --prefix ./cli link

Usage
- Start device auth: `copilot-cli auth`
- Send a chat message: `copilot-cli chat "Write a short JS function to..."`

File and shell commands
- Read a file: `copilot-cli read ./styles.css`
- Write a file: `copilot-cli write ./tmp.txt "hello world"`
- Execute a shell command: `copilot-cli exec "echo hello"`

Interactive Agent Mode
The CLI includes an interactive agent mode that can help accomplish complex goals through a series of read/write/exec operations.

Basic agent usage:
- Autonomous mode: `copilot-cli agent "List files and create a summary" --workspace ./my-project --dry-run`
- Interactive mode: `copilot-cli agent "Analyze this project" --interactive --workspace ./my-project`

Agent options:
- `--interactive, -i`: Interactive mode where the user is asked for confirmation/input at each step
- `--web-search`: Enable web search capabilities for research tasks
- `--workspace <dir>`: Restrict operations to a specific directory
- `--dry-run`: Show planned steps without executing them
- `--simulate`: Allow reads and searches but skip destructive operations (exec/write)
- `--allow-write`: Enable file write operations
- `--max-steps N`: Limit number of steps (default: 5)
- `--log <file>`: Save execution history to JSON file

Interactive mode features:
- Review AI-suggested plans before execution
- Manual step input with format: `action:target[:content]`
- Step-by-step confirmation and control
- Option to let AI suggest next steps or specify manually

Example interactive session:
```bash
# Start interactive agent with web search enabled
copilot-cli agent "Research Node.js best practices and create a summary" \
  --interactive --web-search --workspace ./docs --allow-write --log ./agent.json

# The agent will:
# 1. Show initial AI-suggested plan
# 2. Ask for user confirmation at each step
# 3. Allow manual step specification
# 4. Support web searches for research
# 5. Save all actions to agent.json
```

Security considerations:
- Always test agent runs in a sandboxed workspace before running on sensitive data
- Use `--dry-run` to preview actions without execution
- The workspace flags help reduce accidental access but are not a substitute for careful review
- Interactive mode provides additional safety through user confirmation

Notes
- PAT will be saved to `~/.copilot-pat` with mode 600
- You can also set `COPILOT_PAT` env var instead of saving the PAT

Security note: `exec` runs arbitrary shell commands. Be careful when using it and avoid running untrusted input.
