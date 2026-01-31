import * as commander from 'commander'

import { ensureAPIKey, connectionConfig } from 'src/api'
import { Volume } from '@moru-ai/core'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const infoCommand = new commander.Command('info')
  .description('show volume details')
  .argument('<id_or_name>', 'volume ID or name')
  .option('-f, --format <format>', 'output format: pretty, json', 'pretty')
  .action(async (idOrName: string, options) => {
    try {
      ensureAPIKey()

      const vol = await Volume.get(idOrName, {
        apiKey: connectionConfig.apiKey,
      })

      const info = await vol.getInfo()

      if (options.format === 'json') {
        console.log(JSON.stringify(info, null, 2))
        return
      }

      console.log(`ID:        ${info.volumeId}`)
      console.log(`Name:      ${info.name}`)
      console.log(`Size:      ${formatBytes(info.totalSizeBytes)}`)
      console.log(`Files:     ${info.totalFileCount.toLocaleString()}`)
      console.log(`Created:   ${info.createdAt.toISOString()}`)
      console.log(`Updated:   ${info.updatedAt.toISOString()}`)
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
