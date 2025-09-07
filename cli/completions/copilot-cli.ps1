# PowerShell tab completion for copilot-cli
using namespace System.Management.Automation
Register-ArgumentCompleter -CommandName 'copilot-cli' -ScriptBlock {
  param($commandName, $wordToComplete, $cursorPosition)
  $allCommands = @(
    @{Label='auth';       Tooltip='Start authentication flow'},
    @{Label='chat';       Tooltip='Start a chat session'},
    @{Label='read';       Tooltip='Read a file from disk'},
    @{Label='write';      Tooltip='Write a file to disk'},
    @{Label='exec';       Tooltip='Execute a shell command'},
    @{Label='agent';      Tooltip='Run an autonomous agent'},
    @{Label='completion'; Tooltip='Print completion scripts'}
  )

  $globalFlags = @(
    @{Label='--read'; Tooltip='Include file contents as system context'},
    @{Label='--exec'; Tooltip='Execute a command and include output as context'},
    @{Label='--write'; Tooltip='Write message to file before sending'},
    @{Label='--workspace'; Tooltip='Workspace path to include'},
    @{Label='--workspace-depth'; Tooltip='Max recursion depth (number)'},
    @{Label='--workspace-max-file'; Tooltip='Max file size in MB'},
    @{Label='--allow-exec'; Tooltip='Allow exec steps'},
    @{Label='--allow-write'; Tooltip='Allow write steps'},
    @{Label='--max-steps'; Tooltip='Max planning steps'},
    @{Label='--dry-run'; Tooltip='Plan only, do not execute'},
    @{Label='--simulate'; Tooltip='Simulate actions without side-effects'},
    @{Label='--yes'; Tooltip='Auto-confirm prompts'},
    @{Label='--log'; Tooltip='Path to log file'}
  )

  # parse words so far to detect subcommand
  $line = [System.Management.Automation.CommandLine]::Parse($ExecutionContext.SessionState.Path.CurrentLocation.Path + ' ' + $args -join ' ')
  $words = $line.Arguments
  $sub = if ($words.Count -ge 2) { $words[1].Value } else { '' }

  $results = @()
  if ($sub -eq 'chat') {
    foreach ($f in $globalFlags | Where-Object { $_.Label -in '--read','--exec','--write','--workspace','--workspace-depth','--workspace-max-file' }) {
      $results += [CompletionResult]::new($f.Label, $f.Label, 'ParameterName', $f.Tooltip)
    }
    if ($wordToComplete -like './*' -or $wordToComplete -like '.\*') {
      Get-ChildItem -File -Name -ErrorAction SilentlyContinue | ForEach-Object { $results += [CompletionResult]::new($_, $_, 'ParameterValue', 'file') }
    }
  } elseif ($sub -eq 'agent') {
    foreach ($f in $globalFlags) { $results += [CompletionResult]::new($f.Label, $f.Label, 'ParameterName', $f.Tooltip) }
    if ($wordToComplete -like './*' -or $wordToComplete -like '.\*') {
      Get-ChildItem -Directory -Name -ErrorAction SilentlyContinue | ForEach-Object { $results += [CompletionResult]::new($_, $_, 'ParameterValue', 'directory') }
    }
  } elseif ($sub -eq 'completion') {
    'bash','zsh','fish','powershell' | ForEach-Object { $results += [CompletionResult]::new($_, $_, 'ParameterValue', 'shell') }
  } else {
    # top-level suggestions
    foreach ($c in $allCommands) { $results += [CompletionResult]::new($c.Label, $c.Label, 'Command', $c.Tooltip) }
    foreach ($f in $globalFlags) { $results += [CompletionResult]::new($f.Label, $f.Label, 'ParameterName', $f.Tooltip) }
  }

  if ($wordToComplete) {
    $results | Where-Object { $_.CompletionText -like "$wordToComplete*" }
  } else {
    $results
  }
}
