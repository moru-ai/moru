import * as tablePrinter from 'console-table-printer'
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

export const listVolumesCommand = new commander.Command('list')
  .description('list all volumes')
  .alias('ls')
  .option('-f, --format <format>', 'output format: pretty, json', 'pretty')
  .action(async (options) => {
    try {
      ensureAPIKey()

      const volumes = await Volume.list({
        apiKey: connectionConfig.apiKey,
      })

      if (options.format === 'json') {
        console.log(JSON.stringify(volumes, null, 2))
        return
      }

      if (!volumes.length) {
        console.log('No volumes found')
        return
      }

      const table = new tablePrinter.Table({
        title: 'Volumes',
        columns: [
          { name: 'volumeId', alignment: 'left', title: 'ID' },
          { name: 'name', alignment: 'left', title: 'Name' },
          { name: 'size', alignment: 'right', title: 'Size' },
          { name: 'files', alignment: 'right', title: 'Files' },
        ],
        style: {
          headerTop: { left: '', right: '', mid: '', other: '' },
          headerBottom: { left: '', right: '', mid: '', other: '' },
          tableBottom: { left: '', right: '', mid: '', other: '' },
          vertical: '',
        },
      })

      for (const vol of volumes) {
        table.addRow({
          volumeId: vol.volumeId,
          name: vol.name,
          size: formatBytes(vol.totalSizeBytes),
          files: vol.totalFileCount.toLocaleString(),
        })
      }

      table.printTable()
      process.stdout.write('\n')
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
