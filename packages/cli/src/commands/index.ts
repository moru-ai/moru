import * as commander from 'commander'

import { asPrimary } from 'src/utils/format'
import { templateCommand } from './template'
import { sandboxCommand } from './sandbox'
import { authCommand } from './auth'
import { volumeCommand } from './volume'

export const program = new commander.Command()
  .enablePositionalOptions()
  .description(
    `Create sandbox templates from Dockerfiles by running ${asPrimary(
      'moru template build'
    )} then use our SDKs to create sandboxes from these templates.

Visit ${asPrimary(
      'Moru docs (https://moru.io/docs)'
    )} to learn how to create sandbox templates and start sandboxes.
`
  )
  .addCommand(authCommand)
  .addCommand(templateCommand)
  .addCommand(sandboxCommand)
  .addCommand(volumeCommand)
