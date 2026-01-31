import * as moru from '@moru-ai/core'
import * as commander from 'commander'
import * as path from 'path'

import { ensureAPIKey } from 'src/api'
import { spawnConnectedTerminal } from 'src/terminal'
import { asBold, asFormattedSandboxTemplate, asPrimary } from 'src/utils/format'
import { getRoot } from '../../utils/filesystem'
import { getConfigPath, loadConfig } from '../../config'
import fs from 'fs'
import { configOption, pathOption } from '../../options'
import { validateMountPath } from '@moru-ai/core'

/**
 * `moru sandbox create` - Create a sandbox
 *
 * Creates a sandbox that stays alive. Optionally connects an interactive PTY.
 *
 * Usage:
 *   moru sandbox create <template>     - Create sandbox, print ID, exit (sandbox stays alive)
 *   moru sandbox create -it <template> - Create sandbox, connect interactive PTY (sandbox stays alive after exit)
 */
export function createCommand(
  name: string,
  alias: string
) {
  return new commander.Command(name)
    .description('create sandbox (use -it for interactive terminal)')
    .argument(
      '[template]',
      `create sandbox with ${asBold('[template]')}`
    )
    .option('-i, --interactive', 'keep stdin open')
    .option('-t, --tty', 'allocate a pseudo-TTY')
    .option('--volume <id_or_name>', 'volume ID or name to attach')
    .option('--volume-mount <path>', 'mount path for volume (required with --volume)')
    .addOption(pathOption)
    .addOption(configOption)
    .alias(alias)
    .action(
      async (
        template: string | undefined,
        opts: {
          interactive?: boolean
          tty?: boolean
          name?: string
          path?: string
          config?: string
          volume?: string
          volumeMount?: string
        }
      ) => {
        try {
          const apiKey = ensureAPIKey()
          const isInteractive = opts.interactive && opts.tty

          let templateID = template

          const root = getRoot(opts.path)
          const configPath = getConfigPath(root, opts.config)

          const config = fs.existsSync(configPath)
            ? await loadConfig(configPath)
            : undefined
          const relativeConfigPath = path.relative(root, configPath)

          if (!templateID && config) {
            console.log(
              `Found sandbox template ${asFormattedSandboxTemplate(
                {
                  templateID: config.template_id,
                  aliases: config.template_name
                    ? [config.template_name]
                    : undefined,
                },
                relativeConfigPath
              )}`
            )
            templateID = config.template_id
          }

          if (!templateID) {
            console.error('Error: missing required argument \'template\'')
            console.error('Usage: moru sandbox create <template>')
            console.error('       moru sandbox create -it <template>')
            process.exit(1)
          }

          // Validate volume options
          if (opts.volume && !opts.volumeMount) {
            console.error('Error: --volume-mount is required when --volume is specified')
            process.exit(1)
          }
          if (opts.volumeMount && !opts.volume) {
            console.error('Error: --volume is required when --volume-mount is specified')
            process.exit(1)
          }
          if (opts.volumeMount) {
            try {
              validateMountPath(opts.volumeMount)
            } catch (err: unknown) {
              console.error(`Error: ${err instanceof Error ? err.message : err}`)
              process.exit(1)
            }
          }

          // Resolve volume ID if name was provided
          let volumeId: string | undefined
          if (opts.volume) {
            const vol = await moru.Volume.get(opts.volume, { apiKey })
            volumeId = vol.volumeId
          }

          // Create the sandbox
          const sandbox = await moru.Sandbox.create(templateID, {
            apiKey,
            volumeId,
            volumeMountPath: opts.volumeMount,
          })
          if (volumeId && opts.volumeMount) {
            console.log(`Sandbox ${asPrimary(sandbox.sandboxId)} created (volume: ${volumeId} at ${opts.volumeMount})`)
          } else {
            console.log(`Sandbox ${asPrimary(sandbox.sandboxId)} created`)
          }

          if (!isInteractive) {
            // Show helpful example commands
            console.log('')
            console.log('Try:')
            console.log(`  moru sandbox exec ${sandbox.sandboxId} echo "Hello World"`)
            console.log(`  moru sandbox exec ${sandbox.sandboxId} -it`)
            console.log(`  moru sandbox logs ${sandbox.sandboxId}`)
            console.log(`  moru sandbox kill ${sandbox.sandboxId}`)
          }

          if (isInteractive) {
            // Interactive mode: connect PTY, sandbox stays alive after exit
            // Keep-alive loop to prevent sandbox from timing out during interactive session
            const intervalId = setInterval(async () => {
              await sandbox.setTimeout(30_000)
            }, 5_000)

            console.log(
              `Terminal connecting to template ${asFormattedSandboxTemplate(
                { templateID }
              )} with sandbox ID ${asBold(`${sandbox.sandboxId}`)}`
            )
            try {
              await spawnConnectedTerminal(sandbox)
            } finally {
              clearInterval(intervalId)
              console.log(
                `Closing terminal connection to template ${asFormattedSandboxTemplate(
                  { templateID }
                )} with sandbox ID ${asBold(`${sandbox.sandboxId}`)}`
              )
              // NOTE: We do NOT kill the sandbox here - it stays alive
              // Use `moru sandbox kill <id>` to destroy it
            }
          }
          // Without -it: just print the sandbox ID and exit
          // Sandbox stays alive for later use with `moru sandbox exec`

          process.exit(0)
        } catch (err: any) {
          console.error(err)
          process.exit(1)
        }
      }
    )
}
