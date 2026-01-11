# Moru JavaScript SDK

Moru SDK for JavaScript/TypeScript provides cloud sandbox environments for AI agents.

## Quick Start

### 1. Create an Account

Sign up for a free account at [moru.io/dashboard](https://moru.io/dashboard).

### 2. Get Your API Key

1. Go to the [API Keys tab](https://moru.io/dashboard?tab=keys) in your dashboard
2. Click **Create API Key**
3. Copy your new API key

### 3. Install the SDK

```bash
npm install @moru-ai/core
```

### 4. Set Your API Key

```bash
export MORU_API_KEY=your_api_key
```

### 5. Create a Sandbox and Run Commands

```ts
import Sandbox from '@moru-ai/core'

// Create a sandbox using the 'base' template (default)
const sandbox = await Sandbox.create()
console.log(`Sandbox created: ${sandbox.sandboxId}`)

// Run a command
const result = await sandbox.commands.run("echo 'Hello from Moru!'")
console.log(`Output: ${result.stdout}`)
console.log(`Exit code: ${result.exitCode}`)

// Write and read files
await sandbox.files.write("/tmp/hello.txt", "Hello from Moru!")
const content = await sandbox.files.read("/tmp/hello.txt")
console.log(`File content: ${content}`)

// Clean up
await sandbox.kill()
```

### Streaming Command Output

Stream output in real-time for long-running commands:

```ts
import Sandbox from '@moru-ai/core'

const sandbox = await Sandbox.create()

await sandbox.commands.run(
  "for i in 1 2 3; do echo $i; sleep 1; done",
  {
    onStdout: (data) => console.log(`stdout: ${data}`),
    onStderr: (data) => console.log(`stderr: ${data}`),
    timeoutMs: 30000
  }
)

await sandbox.kill()
```

### Using a Custom Template

Create templates via the [dashboard](https://moru.io/dashboard) or CLI.

```ts
// Use a custom template
const sandbox = await Sandbox.create("my-template")

const result = await sandbox.commands.run("echo 'Running in custom template'")
console.log(result.stdout)

await sandbox.kill()
```

## Documentation

For full documentation, visit [docs.moru.io](https://docs.moru.io).

## Acknowledgement

This project is a fork of [E2B](https://github.com/e2b-dev/E2B).
