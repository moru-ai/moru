# Moru Python SDK

Moru SDK for Python provides cloud environments for AI agents.

## Installation

```bash
pip install moru
```

## Quick Start

### 1. Set your API key

```bash
export MORU_API_KEY=your_api_key
```

### 2. Create a sandbox

```python
from moru import Sandbox

with Sandbox() as sandbox:
    sandbox.run_code('print("Hello from Moru!")')
```

## Acknowledgement

This project is a fork of [E2B](https://github.com/e2b-dev/E2B).
