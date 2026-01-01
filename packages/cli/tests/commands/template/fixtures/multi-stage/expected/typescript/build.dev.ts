import { Template, defaultBuildLogger } from '@moru-ai/core'
import { template } from './template'

async function main() {
  await Template.build(template, {
    alias: 'multi-stage-dev',
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);