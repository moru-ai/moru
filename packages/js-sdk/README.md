# Moru JavaScript SDK

Moru SDK for JavaScript/TypeScript provides cloud environments for AI agents.

## Installation

```bash
npm install @moru-ai/core
```

## Quick Start

### 1. Set your API key

```bash
export MORU_API_KEY=your_api_key
```

### 2. Create a sandbox

```ts
import { Sandbox } from '@moru-ai/core'

const sandbox = await Sandbox.create()
await sandbox.runCode('x = 1')

const execution = await sandbox.runCode('x+=1; x')
console.log(execution.text)  // outputs 2
```

## Acknowledgement

This project is a fork of [E2B](https://github.com/e2b-dev/E2B).
