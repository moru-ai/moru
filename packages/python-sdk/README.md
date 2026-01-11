# Moru Python SDK

Moru SDK for Python provides cloud sandbox environments for AI agents.

## Quick Start

### 1. Create an Account

Sign up for a free account at [moru.io/dashboard](https://moru.io/dashboard).

### 2. Get Your API Key

1. Go to the [API Keys tab](https://moru.io/dashboard?tab=keys) in your dashboard
2. Click **Create API Key**
3. Copy your new API key

### 3. Install the SDK

```bash
pip install moru
```

### 4. Set Your API Key

```bash
export MORU_API_KEY=your_api_key
```

### 5. Create a Sandbox and Run Commands

```python
from moru import Sandbox

# Create a sandbox using the 'base' template (default)
sandbox = Sandbox.create()
print(f"Sandbox created: {sandbox.sandbox_id}")

# Run a command
result = sandbox.commands.run("echo 'Hello from Moru!'")
print(f"Output: {result.stdout}")
print(f"Exit code: {result.exit_code}")

# Write and read files
sandbox.files.write("/tmp/hello.txt", "Hello from Moru!")
content = sandbox.files.read("/tmp/hello.txt")
print(f"File content: {content}")

# Clean up
sandbox.kill()
```

### Using Async

For async applications, use `AsyncSandbox`:

```python
import asyncio
from moru import AsyncSandbox

async def main():
    sandbox = await AsyncSandbox.create()

    result = await sandbox.commands.run("python3 --version")
    print(result.stdout)

    await sandbox.kill()

asyncio.run(main())
```

### Using a Custom Template

Create templates via the [dashboard](https://moru.io/dashboard) or CLI.

```python
# Use a custom template
sandbox = Sandbox.create("my-template")

result = sandbox.commands.run("echo 'Running in custom template'")
print(result.stdout)

sandbox.kill()
```

## Documentation

For full documentation, visit [docs.moru.io](https://docs.moru.io).

## Acknowledgement

This project is a fork of [E2B](https://github.com/e2b-dev/E2B).
