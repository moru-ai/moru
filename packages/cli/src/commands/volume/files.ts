import * as tablePrinter from 'console-table-printer'
import * as commander from 'commander'

import { ensureAPIKey, connectionConfig } from 'src/api'
import { Volume } from '@moru-ai/core'

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '-'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const filesCommand = new commander.Command('files')
  .description('list files in a volume')
  .argument('<id_or_name>', 'volume ID or name')
  .argument('[path]', 'path to list', '/')
  .option('-f, --format <format>', 'output format: pretty, json', 'pretty')
  .action(async (idOrName: string, path: string, options) => {
    try {
      ensureAPIKey()

      const vol = await Volume.get(idOrName, {
        apiKey: connectionConfig.apiKey,
      })

      const files = await vol.listFiles(path)

      if (options.format === 'json') {
        console.log(JSON.stringify(files, null, 2))
        return
      }

      if (!files.length) {
        console.log('No files found')
        return
      }

      const table = new tablePrinter.Table({
        title: `Files in ${path}`,
        columns: [
          { name: 'name', alignment: 'left', title: 'Name' },
          { name: 'type', alignment: 'left', title: 'Type' },
          { name: 'size', alignment: 'right', title: 'Size' },
          { name: 'modified', alignment: 'left', title: 'Modified' },
        ],
        style: {
          headerTop: { left: '', right: '', mid: '', other: '' },
          headerBottom: { left: '', right: '', mid: '', other: '' },
          tableBottom: { left: '', right: '', mid: '', other: '' },
          vertical: '',
        },
      })

      // Sort: directories first, then by name
      const sorted = [...files].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      for (const file of sorted) {
        const displayName = file.type === 'directory' ? `${file.name}/` : file.name
        table.addRow({
          name: displayName,
          type: file.type,
          size: formatBytes(file.size),
          modified: file.modifiedAt?.toISOString() ?? '-',
        })
      }

      table.printTable()
      process.stdout.write('\n')
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
