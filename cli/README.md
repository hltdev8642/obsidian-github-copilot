# copilot-cli

Minimal GitHub Copilot CLI built from the obsidian-github-copilot repo.

Features
- Device-code auth flow to obtain a GitHub PAT
- Exchange PAT for Copilot access token and send a chat message

Requirements
- Node 18+ (for global fetch) or install `node-fetch`

Install (developer)
- From repo root, run:

  npm --prefix ./cli install
  npm --prefix ./cli link

Usage
- Start device auth: `copilot-cli auth`
- Send a chat message: `copilot-cli chat "Write a short JS function to..."`

Notes
- PAT will be saved to `~/.copilot-pat` with mode 600
- You can also set `COPILOT_PAT` env var instead of saving the PAT
