# fish completion for copilot-cli
function __fish_copilot_cli_no_subcommand
  test (count $argv) -eq 1
end

complete -c copilot-cli -f -n '__fish_seen_subcommand_from auth' -a '--help' -d 'Show help'
complete -c copilot-cli -n '__fish_no_subcommand' -a 'auth chat read write exec agent completion' -d 'Top-level commands'

# chat subcommand options
complete -c copilot-cli -n '__fish_seen_subcommand_from chat' -a '--read' -d 'Include file contents as system context'
complete -c copilot-cli -f -n '__fish_seen_subcommand_from chat; __fish_seen_argument --read' -a '(ls -1)' -d 'Files to read' 
complete -c copilot-cli -n '__fish_seen_subcommand_from chat' -a '--write' -d 'Write message to file before sending'
complete -c copilot-cli -f -n '__fish_seen_subcommand_from chat; __fish_seen_argument --write' -a '(ls -1)' -d 'Files to write'
complete -c copilot-cli -n '__fish_seen_subcommand_from chat' -a '--exec' -d 'Execute a command and include output as context'
complete -c copilot-cli -n '__fish_seen_subcommand_from chat' -a '--workspace' -d 'Include workspace snapshot'
complete -c copilot-cli -f -n '__fish_seen_subcommand_from chat; __fish_seen_argument --workspace' -a '(ls -d */)' -d 'Workspace directory'
complete -c copilot-cli -n '__fish_seen_subcommand_from chat' -a '--workspace-depth' -d 'Max recursion depth'
complete -c copilot-cli -n '__fish_seen_subcommand_from chat' -a '--workspace-max-file' -d 'Max file size in MB'

# agent subcommand options
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--allow-exec' -d 'Allow execution of shell commands'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--allow-write' -d 'Allow write steps'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--max-steps' -d 'Max planning steps'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--dry-run' -d 'Plan only, do not execute'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--simulate' -d 'Simulate actions without side-effects'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--yes' -d 'Auto-confirm prompts'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--log' -d 'Path to log file'
complete -c copilot-cli -f -n '__fish_seen_subcommand_from agent; __fish_seen_argument --log' -a '(ls -1)' -d 'Log file path'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--whitelist' -d 'Comma-separated file globs to allow'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--workspace' -d 'Workspace path'
complete -c copilot-cli -f -n '__fish_seen_subcommand_from agent; __fish_seen_argument --workspace' -a '(ls -d */)' -d 'Workspace directory'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--workspace-depth' -d 'Max recursion depth'
complete -c copilot-cli -n '__fish_seen_subcommand_from agent' -a '--workspace-max-file' -d 'Max file size in MB'
