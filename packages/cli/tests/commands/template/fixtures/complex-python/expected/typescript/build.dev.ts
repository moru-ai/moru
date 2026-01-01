import { Template, defaultBuildLogger } from '@moru-ai/core'
import { template } from './template'

async function main() {
  await Template.build(template, {
    alias: 'complex-python-app-dev',
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);