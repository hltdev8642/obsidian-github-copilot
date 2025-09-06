# Interactive Agent Mode - Practical Examples

## Example 1: Code Analysis and Documentation

### Goal
Analyze a JavaScript project and create documentation

### Command
```bash
copilot-cli agent "Analyze the package.json and create a README with project overview" \
  --interactive \
  --workspace ./test-workspace \
  --allow-write \
  --log ./analysis.json
```

### Expected Interactive Flow
1. **Initial Plan Review**: AI suggests steps like:
   - `read:./package.json`
   - `read:./src/index.js` 
   - `write:./README.md:Project documentation content`

2. **User Choices at Each Step**:
   - Option 1: Accept AI plan
   - Option 2: Modify steps manually
   - Option 3: Exit

3. **Manual Step Examples**:
   - `read:./package.json` - Read project config
   - `exec:find . -name "*.js" | head -5` - List JS files
   - `write:./README.md:# Project Overview\n\nThis project...` - Create documentation

## Example 2: Research and Summary Creation

### Goal  
Research a technical topic and create a summary document

### Command
```bash
copilot-cli agent "Research Node.js testing frameworks and create a comparison document" \
  --interactive \
  --web-search \
  --workspace ./docs \
  --allow-write \
  --log ./research.json
```

### Expected Interactive Flow
1. **Research Steps**:
   - `search:Node.js testing frameworks 2024` - Get current info
   - `search:Jest vs Mocha vs Vitest comparison` - Detailed comparison
   - `search:JavaScript unit testing best practices` - Best practices

2. **Documentation Steps**:
   - `write:./testing-frameworks.md:# Testing Framework Comparison` - Create doc
   - `read:./testing-frameworks.md` - Review content
   - `write:./testing-frameworks.md:...` - Update with research findings

## Example 3: Safe Exploration

### Goal
Explore a project safely without making changes

### Command
```bash
copilot-cli agent "Understand project structure and dependencies" \
  --interactive \
  --workspace ./unknown-project \
  --simulate \
  --log ./exploration.json
```

### Benefits of Simulate Mode
- Can read files and search web safely
- No exec or write operations performed
- Perfect for exploring unfamiliar codebases
- All actions logged for review

## Example 4: Step-by-Step Debugging

### Goal
Debug an issue interactively with full control

### Command
```bash
copilot-cli agent "Debug the failing test and fix the issue" \
  --interactive \
  --workspace ./project \
  --allow-exec \
  --allow-write \
  --max-steps 10
```

### Interactive Debugging Flow
1. **Investigation**:
   - `read:./package.json` - Check test scripts
   - `exec:npm test` - Run tests to see failures
   - `read:./test/failing-test.js` - Read failing test

2. **Research** (if web-search enabled):
   - `search:common causes of [specific error]` - Research issue

3. **Fix Implementation**:
   - `read:./src/module.js` - Read source code
   - `write:./src/module.js:fixed content` - Apply fix
   - `exec:npm test` - Verify fix

## Safety Best Practices

### Always Use Workspace Restriction
```bash
--workspace ./safe-directory
```

### Start with Dry Run
```bash
--dry-run  # Preview all actions first
```

### Use Simulate for Exploration
```bash
--simulate  # Allow reads/search, block writes/exec
```

### Enable Logging
```bash
--log ./agent-history.json  # Track all actions
```

### Limit Steps
```bash
--max-steps 5  # Prevent runaway execution
```

## Manual Step Format Reference

### File Operations
- `read:./path/to/file.ext` - Read file contents
- `write:./path/to/file.ext:content here` - Write content to file

### Command Execution  
- `exec:ls -la` - List directory contents
- `exec:npm test` - Run tests
- `exec:git status` - Check git status

### Web Search (requires --web-search)
- `search:nodejs best practices` - General search
- `search:"specific error message"` - Specific search
- `search:framework comparison 2024` - Current information

## Integration with Existing Features

All existing CLI features work with interactive mode:

- **Workspace safety**: Operations restricted to workspace directory
- **Confirmation flags**: `--confirm-exec`, `--confirm-write`, etc.
- **Safety modes**: `--dry-run`, `--simulate`
- **Logging**: Complete action history saved
- **Step limits**: `--max-steps` prevents runaway execution