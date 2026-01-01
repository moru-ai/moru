# Moru SDK

Moru SDK provides cloud environments for AI agents. Run AI-generated code in secure isolated sandboxes in the cloud.

## What is Moru?

Moru (Korean: 모루, meaning "anvil") is an open-source infrastructure that allows you to run AI-generated code in secure isolated sandboxes in the cloud. Use our JavaScript SDK or Python SDK to start and control sandboxes.

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
