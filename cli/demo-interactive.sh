#!/bin/bash

# Demo script showing the new interactive agent mode
# Note: This script shows the commands, but requires authentication to actually run

echo "=== Interactive Agent Mode Demo ==="
echo ""

echo "1. Setting up test workspace..."
mkdir -p demo-workspace
echo "# Demo Project" > demo-workspace/README.md
echo '{"name": "demo", "version": "1.0.0"}' > demo-workspace/package.json

echo "2. Basic interactive mode (dry-run):"
echo "   copilot-cli agent 'Analyze this project' --interactive --workspace ./demo-workspace --dry-run"
echo ""

echo "3. Interactive mode with web search:"
echo "   copilot-cli agent 'Research testing frameworks and document findings' \\"
echo "     --interactive --web-search --workspace ./demo-workspace --allow-write --log ./demo.json"
echo ""

echo "4. Safe exploration mode:"
echo "   copilot-cli agent 'Understand project structure' \\"
echo "     --interactive --workspace ./demo-workspace --simulate"
echo ""

echo "=== Interactive Mode Features ==="
echo ""
echo "In interactive mode, you will see prompts like:"
echo ""
echo "=== Interactive Agent Mode ==="
echo "Goal: Analyze this project"
echo ""
echo "AI suggested initial plan:"
echo "  1. read ./package.json"
echo "  2. read ./README.md"
echo "  3. write ./analysis.md (content: # Project Analysis...)"
echo ""
echo "Would you like to use this plan? (y/n)"
echo ""
echo "Then at each step:"
echo "  What would you like to do next?"
echo "  Options:"
echo "    1. Let AI suggest next step"
echo "    2. Specify custom action manually"
echo "    3. Finish/exit"
echo ""
echo "For manual actions, use format: action:target[:content]"
echo "Examples:"
echo "  - read:./src/index.js"
echo "  - exec:npm test"
echo "  - write:./notes.md:My findings..."
echo "  - search:nodejs best practices (if --web-search enabled)"
echo ""

echo "=== Safety Features ==="
echo ""
echo "All existing safety features work with interactive mode:"
echo "- --workspace: Restricts operations to specific directory"
echo "- --dry-run: Shows planned actions without executing"
echo "- --simulate: Allows reads/search but blocks writes/exec"
echo "- --log: Saves complete execution history"
echo "- --max-steps: Limits number of operations"
echo ""

echo "Clean up demo workspace..."
rm -rf demo-workspace

echo "Demo complete! Try running the commands above with proper authentication."