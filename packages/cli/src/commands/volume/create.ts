import * as commander from 'commander'

import { ensureAPIKey, connectionConfig } from 'src/api'
import { Volume } from '@moru-ai/core'

export const createVolumeCommand = new commander.Command('create')
  .description('create a new volume')
  .requiredOption('-n, --name <name>', 'volume name (unique per team, slug format)')
  .option('-f, --format <format>', 'output format: pretty, json', 'pretty')
  .action(async (options) => {
    try {
      ensureAPIKey()

      const vol = await Volume.create({
        name: options.name,
        apiKey: connectionConfig.apiKey,
      })

      if (options.format === 'json') {
        console.log(JSON.stringify({
          volumeId: vol.volumeId,
          name: vol.name,
          totalSizeBytes: vol.totalSizeBytes,
          totalFileCount: vol.totalFileCount,
        }, null, 2))
      } else {
        console.log(`Created volume: ${vol.volumeId}`)
        console.log(`Name: ${vol.name}`)
      }
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
