import * as commander from 'commander'
import * as readline from 'readline'

import { ensureAPIKey, connectionConfig } from 'src/api'
import { Volume } from '@moru-ai/core'

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

export const deleteVolumeCommand = new commander.Command('delete')
  .description('delete a volume')
  .alias('rm')
  .argument('<id_or_name>', 'volume ID or name')
  .option('-f, --force', 'skip confirmation prompt')
  .action(async (idOrName: string, options) => {
    try {
      ensureAPIKey()

      // Get volume first to show the ID
      const vol = await Volume.get(idOrName, {
        apiKey: connectionConfig.apiKey,
      })

      if (!options.force) {
        const confirmed = await confirm(
          `Are you sure you want to delete volume '${vol.name}'?`
        )
        if (!confirmed) {
          console.log('Aborted')
          return
        }
      }

      const deleted = await vol.delete()

      if (deleted) {
        console.log(`Deleted volume: ${vol.volumeId}`)
      } else {
        console.log('Volume not found')
        process.exit(1)
      }
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  })
