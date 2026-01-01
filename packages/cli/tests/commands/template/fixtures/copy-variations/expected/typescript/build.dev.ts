import { Template, defaultBuildLogger } from '@moru-ai/core'
import { template } from './template'

async function main() {
  await Template.build(template, {
    alias: 'copy-test-dev',
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);