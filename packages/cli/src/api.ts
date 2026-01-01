import * as boxen from 'boxen'
import * as moru from '@moru-ai/core'

import { getUserConfig, UserConfig } from './user'
import { asBold, asPrimary } from './utils/format'

export let apiKey = process.env.MORU_API_KEY
export let accessToken = process.env.MORU_ACCESS_TOKEN

const authErrorBox = (keyName: string) => {
  let msg
  switch (keyName) {
    case 'MORU_API_KEY':
      msg = 'API key'
      break
    case 'MORU_ACCESS_TOKEN':
      msg = 'access token'
      break
  }
  // throwing error in default in switch statement results in unreachable code,
  // so we need to check if msg is defined here instead
  if (!msg) {
    throw new Error(`Unknown key name: ${keyName}`)
  }
  return boxen.default(
    `You must be logged in to use this command. Run ${asBold('moru auth login')}.

If you are seeing this message in CI/CD you may need to set the ${asBold(
      `${keyName}`
    )} environment variable.
Contact ${asPrimary('support@moru.io')} to get the ${msg}.`,
    {
      width: 70,
      float: 'center',
      padding: 0.5,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'redBright',
    }
  )
}

export function ensureAPIKey() {
  // If apiKey is not already set (either from env var or from user config), try to get it from config file
  if (!apiKey) {
    const userConfig = getUserConfig()
    apiKey = userConfig?.teamApiKey
  }

  if (!apiKey) {
    console.error(authErrorBox('MORU_API_KEY'))
    process.exit(1)
  } else {
    return apiKey
  }
}

export function ensureUserConfig(): UserConfig {
  const userConfig = getUserConfig()
  if (!userConfig) {
    console.error('No user config found, run `moru auth login` to log in first.')
    process.exit(1)
  }
  return userConfig
}

export function ensureAccessToken() {
  // If accessToken is not already set (either from env var or from user config), try to get it from config file
  if (!accessToken) {
    const userConfig = getUserConfig()
    accessToken = userConfig?.accessToken
  }

  if (!accessToken) {
    console.error(authErrorBox('MORU_ACCESS_TOKEN'))
    process.exit(1)
  } else {
    return accessToken
  }
}

const userConfig = getUserConfig()

export const connectionConfig = new moru.ConnectionConfig({
  accessToken: process.env.MORU_ACCESS_TOKEN || userConfig?.accessToken,
  apiKey: process.env.MORU_API_KEY || userConfig?.teamApiKey,
})
export const client = new moru.ApiClient(connectionConfig)
