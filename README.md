<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/moru-ai/.github/main/logo/moru-logo-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/moru-ai/.github/main/logo/moru-logo.svg">
    <img alt="Moru" src="https://raw.githubusercontent.com/moru-ai/.github/main/logo/moru-logo.svg" width="200">
  </picture>
</p>

<p align="center">
  <b>Open-source cloud infrastructure for AI agents.</b><br>
  Give your AI agents a full Linux VM to work with.
</p>

---

Moru provides isolated VMs for AI agents to run commands, write files, and execute code

## Quick Start

### Install

```bash
curl -fsSL https://moru.io/cli/install.sh | bash
```

### Hello world

```bash
# Login
moru auth login

# Run a command in ephemeral sandbox
moru sandbox run base echo 'hello world!'

# List sandboxes
moru sandbox list

# View logs
moru sandbox logs <id>
```

### Persistent Sandbox

```bash
# Create persistent sandbox
moru sandbox create base

# Write a file
moru sandbox exec <id> 'sh -c "echo Hello Moru > /tmp/note.txt"'

# Read it back (persisted!)
moru sandbox exec <id> cat /tmp/note.txt

# Clean up
moru sandbox kill <id>
```

## Using SDKs

### Install

**JavaScript / TypeScript:**

```bash
npm install @moru-ai/core
```

**Python:**

```bash
pip install moru
```

### API Key set up

```bash
export MORU_API_KEY=your_api_key
```

**Go to the [API Keys tab](https://moru.io/dashboard?tab=keys)** if you didn't create an API key yet.

### Create a Sandbox and Run Commands

**JavaScript / TypeScript:**

```ts
import Sandbox from '@moru-ai/core'

// Create a sandbox using the 'base' template (default)
const sandbox = await Sandbox.create()
console.log(`Sandbox created: ${sandbox.sandboxId}`)

// Run a command
const result = await sandbox.commands.run("echo 'Hello from Moru!'")
console.log(`Output: ${result.stdout}`)

// Clean up
await sandbox.kill()
```

**Python:**

```python
from moru import Sandbox

# Create a sandbox using the 'base' template (default)
sandbox = Sandbox.create()
print(f"Sandbox created: {sandbox.sandbox_id}")

# Run a command
result = sandbox.commands.run("echo 'Hello from Moru!'")
print(f"Output: {result.stdout}")

# Clean up
sandbox.kill()
```

### Monitor Sandbox Logs

After running your sandbox, you can view logs, monitor activity, and debug issues from the [Sandboxes tab](https://moru.io/dashboard?tab=sandboxes) in your dashboard.

## Using a Custom Template

You can specify a custom template when creating a sandbox. See the [templates documentation](https://moru.io/docs/templates/overview) for how to create templates.

```python
# Python
sandbox = Sandbox.create("my-template")
```

```ts
// JavaScript
const sandbox = await Sandbox.create('my-template')
```

## Documentation

For more information, visit [moru.io/docs](https://moru.io/docs).

## Examples

- [Maru](https://github.com/moru-ai/maru) - A research assistant using Claude Agent SDK and Moru

## Related Repositories

- [Sandbox Infrastructure](https://github.com/moru-ai/sandbox-infra) - Open-source Firecracker-based sandbox infrastructure

## Acknowledgement

This project is a fork of [E2B](https://github.com/e2b-dev/E2B).

## License

See [LICENSE](LICENSE) file.
