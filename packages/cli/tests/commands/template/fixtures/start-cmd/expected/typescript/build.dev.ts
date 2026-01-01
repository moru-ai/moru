import { Template, defaultBuildLogger } from '@moru-ai/core'
import { template } from './template'

async function main() {
  await Template.build(template, {
    alias: 'start-cmd-dev',
    cpuCount: 2,
    memoryMB: 1024,
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);