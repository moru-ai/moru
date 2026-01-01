import { Template, defaultBuildLogger } from '@moru-ai/core'
import { template } from './template'

async function main() {
  await Template.build(template, {
    alias: 'complex-python-app',
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);