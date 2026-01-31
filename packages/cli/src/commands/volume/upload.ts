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

export const uploadCommand = new commander.Command('upload')
  .description('upload a file to a volume')
  .argument('<id_or_name>', 'volume ID or name')
  .argument('<local>', 'local file path')
  .argument('<remote>', 'remote path in volume')
  .action(async (idOrName: string, local: string, remote: string) => {
    try {
      ensureAPIKey()

      // Resolve the local path
      const localPath = path.resolve(local)

      if (!fs.existsSync(localPath)) {
        console.error(`Error: File not found: ${localPath}`)
        process.exit(1)
      }

      const stats = fs.statSync(localPath)
      if (stats.isDirectory()) {
        console.error('Error: Cannot upload directories (yet)')
        process.exit(1)
      }

      const vol = await Volume.get(idOrName, {
        apiKey: connectionConfig.apiKey,
      })

      console.log(`Uploading ${local} to ${remote}...`)

      const content = fs.readFileSync(localPath)
      await vol.upload(remote, content)

      console.log(`Uploaded ${formatBytes(content.byteLength)}`)
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
