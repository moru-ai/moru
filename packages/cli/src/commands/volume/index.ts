import * as commander from 'commander'

import { createVolumeCommand } from './create'
import { listVolumesCommand } from './list'
import { infoCommand } from './info'
import { deleteVolumeCommand } from './delete'
import { filesCommand } from './files'
import { uploadCommand } from './upload'
import { downloadCommand } from './download'

export const volumeCommand = new commander.Command('volume')
  .description('work with volumes')
  .alias('vol')
  .enablePositionalOptions()
  .addCommand(createVolumeCommand)
  .addCommand(listVolumesCommand)
  .addCommand(infoCommand)
  .addCommand(deleteVolumeCommand)
  .addCommand(filesCommand)
  .addCommand(uploadCommand)
  .addCommand(downloadCommand)
