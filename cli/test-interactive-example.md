# Interactive Agent Mode Examples

This document demonstrates the new interactive agent mode capabilities.

## Example Commands

### Basic Interactive Mode
```bash
copilot-cli agent "Analyze this project structure" --interactive --workspace ./test-workspace --dry-run
```

### Interactive Mode with Web Search
```bash
copilot-cli agent "Research JavaScript testing frameworks and create a comparison" --interactive --web-search --workspace ./docs --allow-write --log ./research.json
```

### Manual Step Format Examples

In interactive mode, you can specify manual steps using the format `action:target[:content]`:

- **Read a file**: `read:./package.json`
- **Execute a command**: `exec:ls -la`
- **Write to a file**: `write:./summary.md:# Project Analysis Summary`
- **Search the web**: `search:JavaScript testing frameworks 2024` (requires --web-search)

## Interactive Workflow

1. **Initial Plan Review**: The AI suggests an initial plan which you can accept or reject
2. **Step-by-step Control**: At each step, choose from:
   - Let AI suggest the next step
   - Specify a custom action manually
   - Exit the agent
3. **Safety Features**: 
   - All workspace restrictions still apply
   - Dry-run and simulate modes work in interactive mode
   - User confirmation prevents unwanted actions

## Safety Features

- `--dry-run`: Preview all planned actions without execution
- `--simulate`: Allow reads and searches but skip exec/write operations
- `--workspace`: Restrict operations to a specific directory
- `--interactive`: User confirmation at each step
- `--log`: Save complete execution history for review

## Web Search Capabilities

When `--web-search` is enabled:
- Uses DuckDuckGo API (no API key required)
- Returns summaries, direct answers, and related topics
- Useful for research tasks and gathering current information
- Search results are included in the agent's context for subsequent steps