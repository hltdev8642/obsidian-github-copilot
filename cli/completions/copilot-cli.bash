# bash completion for copilot-cli
_copilot_cli_completions() {
  local cur prev words cword sub opts cmds
  _get_comp_words_by_ref -n : cur prev words cword
  cmds="auth chat read write exec agent completion"
  if [[ $cword -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )
    return 0
  fi
  sub=${words[1]}
  case "$sub" in
    chat)
      opts="--read --exec --write --workspace --workspace-depth --workspace-max-file"
      if [[ "$prev" == "--read" || "$prev" == "--write" ]]; then
        COMPREPLY=( $(compgen -f -- "$cur") ); return 0
      fi
      if [[ "$prev" == "--workspace" ]]; then
        COMPREPLY=( $(compgen -d -- "$cur") ); return 0
      fi
      if [[ "$prev" == "--workspace-depth" ]]; then
        COMPREPLY=( $(compgen -W "1 2 3 4 5 10 20 50" -- "$cur") ); return 0
      fi
      if [[ "$prev" == "--workspace-max-file" ]]; then
        COMPREPLY=( $(compgen -W "0.1 1 5 10 50 100" -- "$cur") ); return 0
      fi
      COMPREPLY=( $(compgen -W "$opts" -- "$cur") ); return 0;;
    agent)
      opts="--allow-exec --allow-write --max-steps --dry-run --simulate --yes --log --whitelist --workspace --workspace-depth --workspace-max-file"
      if [[ "$prev" == "--log" ]]; then
        COMPREPLY=( $(compgen -f -- "$cur") ); return 0
      fi
      if [[ "$prev" == "--workspace" ]]; then
        COMPREPLY=( $(compgen -d -- "$cur") ); return 0
      fi
      if [[ "$prev" == "--workspace-depth" ]]; then
        COMPREPLY=( $(compgen -W "1 2 3 5 10 20 50" -- "$cur") ); return 0
      fi
      if [[ "$prev" == "--workspace-max-file" ]]; then
        COMPREPLY=( $(compgen -W "0.1 1 5 10 50 100" -- "$cur") ); return 0
      fi
      COMPREPLY=( $(compgen -W "$opts" -- "$cur") ); return 0;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish powershell" -- "$cur") ); return 0;;
    read|write)
      COMPREPLY=( $(compgen -f -- "$cur") ); return 0;;
    exec)
      return 0;;
    *)
      COMPREPLY=( $(compgen -W "$cmds" -- "$cur") ); return 0;;
  esac
}
complete -F _copilot_cli_completions copilot-cli
