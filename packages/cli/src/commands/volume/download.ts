import * as commander from 'commander'
import * as fs from 'fs'
import * as path from 'path'

import { ensureAPIKey, connectionConfig } from 'src/api'
import { Volume } from '@moru-ai/core'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const downloadCommand = new commander.Command('download')
  .description('download a file from a volume')
  .argument('<id_or_name>', 'volume ID or name')
  .argument('<remote>', 'remote path in volume')
  .argument('<local>', 'local file path')
  .option('-f, --force', 'overwrite existing file')
  .action(async (idOrName: string, remote: string, local: string, options) => {
    try {
      ensureAPIKey()

      // Resolve the local path
      const localPath = path.resolve(local)

      if (fs.existsSync(localPath) && !options.force) {
        console.error(`Error: File already exists: ${localPath}`)
        console.error('Use --force to overwrite')
        process.exit(1)
      }

      const vol = await Volume.get(idOrName, {
        apiKey: connectionConfig.apiKey,
      })

      console.log(`Downloading ${remote}...`)

      const content = await vol.download(remote)

      // Ensure parent directory exists
      const parentDir = path.dirname(localPath)
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
      }

      fs.writeFileSync(localPath, content)

      console.log(`Downloaded ${formatBytes(content.byteLength)} to ${local}`)
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
