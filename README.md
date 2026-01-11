<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/moru-ai/.github/main/logo/moru-logo-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/moru-ai/.github/main/logo/moru-logo.svg">
    <img alt="Moru" src="https://raw.githubusercontent.com/moru-ai/.github/main/logo/moru-logo.svg" width="200">
  </picture>
</p>

<p align="center">
  <b>Open-source cloud infrastructure for AI agents.</b><br>
  Give your AI agents a full Linux computer to work with.
</p>

---

Moru provides isolated cloud sandboxes for AI agents that need full computer access—like [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)—to run commands, write files, and execute code.

## Installation

### JavaScript / TypeScript

```bash
npm install @moru-ai/core
```

### Python

```bash
pip install moru
```

## Quick Start

### 1. Set your API key

```bash
export MORU_API_KEY=your_api_key
```

### 2. Create a sandbox

JavaScript / TypeScript:
```ts
import { Sandbox } from '@moru-ai/core'

const sandbox = await Sandbox.create()
await sandbox.runCode('print("Hello from Moru!")')
await sandbox.close()
```

Python:
```python
from moru import Sandbox

with Sandbox() as sandbox:
    sandbox.run_code('print("Hello from Moru!")')
```

## Packages

This monorepo contains:

- `packages/js-sdk` - JavaScript/TypeScript SDK
- `packages/python-sdk` - Python SDK
- `packages/cli` - Command-line interface

## Acknowledgement

This project is a fork of [E2B](https://github.com/e2b-dev/E2B).

## License

See [LICENSE](LICENSE) file.
