import * as commander from 'commander'

import { asBold } from './utils/format'

export const pathOption = new commander.Option(
  '-p, --path <path>',
  `change root directory where command is executed to ${asBold(
    '<path>'
  )} directory`
)

export const configOption = new commander.Option(
  '--config <moru-toml>',
  `specify path to the Moru config toml. By default Moru tries to find ${asBold(
    './moru.toml'
  )} in root directory.`
)

export const selectOption = new commander.Option(
  '-s, --select',
  'select multiple sandbox templates from interactive list'
)

export const selectMultipleOption = new commander.Option(
  '-s, --select',
  'select sandbox template from interactive list'
)

export const teamOption = new commander.Option(
  '-t, --team <team-id>',
  'specify the team ID that the operation will be associated with. You can find team ID in the team settings in the Moru dashboard (https://dashboard.moru.io).'
)
