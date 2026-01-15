import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

/**
 * User configuration stored in ~/.moru/config.json
 */
export interface UserConfig {
  email: string
  accessToken: string
  teamName: string
  teamId: string
  teamApiKey: string
  dockerProxySet?: boolean
}

export const USER_CONFIG_PATH = path.join(os.homedir(), '.moru', 'config.json') // TODO: Keep in Keychain
export const MORU_DOMAIN = process.env.MORU_DOMAIN || 'moru.io'

export function getUserConfig(): UserConfig | null {
  if (!fs.existsSync(USER_CONFIG_PATH)) return null
  return JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'))
}
