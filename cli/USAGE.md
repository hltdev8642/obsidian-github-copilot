Quick usage

Install dependencies for the CLI and link it locally:

```powershell
npm --prefix ./cli install
npm --prefix ./cli link
```

Run auth:

```powershell
copilot-cli auth
```

Send a chat message:

```powershell
copilot-cli chat "Write a short TypeScript snippet that reverses a string"
```

Or use env var without saving PAT file:

```powershell
$env:COPILOT_PAT = 'ghp_...'
copilot-cli chat "Hello"
```

Read a file:

```powershell
copilot-cli read ./styles.css
```

Write a file:

```powershell
copilot-cli write ./tmp.txt "hello world"
```

Execute a shell command:

```powershell
copilot-cli exec "echo hello"
```
