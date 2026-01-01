import { Logger } from './logs'
import { getEnvVar, version } from './api/metadata'

export const REQUEST_TIMEOUT_MS = 60_000 // 60 seconds
export const DEFAULT_SANDBOX_TIMEOUT_MS = 300_000 // 300 seconds
export const KEEPALIVE_PING_INTERVAL_SEC = 50 // 50 seconds

export const KEEPALIVE_PING_HEADER = 'Keepalive-Ping-Interval'

/**
 * Connection options for requests to the API.
 */
export interface ConnectionOpts {
  /**
   * Moru API key to use for authentication.
   *
   * @default MORU_API_KEY // environment variable
   */
  apiKey?: string
  /**
   * Moru access token to use for authentication.
   *
   * @default MORU_ACCESS_TOKEN // environment variable
   */
  accessToken?: string
  /**
   * Domain to use for the API.
   *
   * @default MORU_DOMAIN // environment variable or `moru.io`
   */
  domain?: string
  /**
   * API Url to use for the API.
   * @internal
   * @default MORU_API_URL // environment variable or `https://api.${domain}`
   */
  apiUrl?: string
  /**
   * Sandbox Url to use for the API.
   * @internal
   * @default MORU_SANDBOX_URL // environment variable or `https://${port}-${sandboxID}.${domain}`
   */
  sandboxUrl?: string
  /**
   * If true the SDK starts in the debug mode and connects to the local envd API server.
   * @internal
   * @default MORU_DEBUG // environment variable or `false`
   */
  debug?: boolean
  /**
   * Timeout for requests to the API in **milliseconds**.
   *
   * @default 60_000 // 60 seconds
   */
  requestTimeoutMs?: number
  /**
   * Logger to use for logging messages. It can accept any object that implements `Logger` interface—for example, {@link console}.
   */
  logger?: Logger

  /**
   * Additional headers to send with the request.
   */
  headers?: Record<string, string>
}

/**
 * Configuration for connecting to the API.
 */
export class ConnectionConfig {
  public static envdPort = 49983

  readonly debug: boolean
  readonly domain: string
  readonly apiUrl: string
  readonly sandboxUrl?: string
  readonly logger?: Logger

  readonly requestTimeoutMs: number

  readonly apiKey?: string
  readonly accessToken?: string

  readonly headers?: Record<string, string>

  constructor(opts?: ConnectionOpts) {
    this.apiKey = opts?.apiKey || ConnectionConfig.apiKey
    this.debug = opts?.debug || ConnectionConfig.debug
    this.domain = opts?.domain || ConnectionConfig.domain
    this.accessToken = opts?.accessToken || ConnectionConfig.accessToken
    this.requestTimeoutMs = opts?.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
    this.logger = opts?.logger
    this.headers = opts?.headers || {}
    this.headers['User-Agent'] = `moru-js-sdk/${version}`

    this.apiUrl =
      opts?.apiUrl ||
      ConnectionConfig.apiUrl ||
      (this.debug ? 'http://localhost:3000' : `https://api.${this.domain}`)

    this.sandboxUrl = opts?.sandboxUrl || ConnectionConfig.sandboxUrl
  }

  private static get domain() {
    return getEnvVar('MORU_DOMAIN') || 'moru.io'
  }

  private static get apiUrl() {
    return getEnvVar('MORU_API_URL')
  }

  private static get sandboxUrl() {
    return getEnvVar('MORU_SANDBOX_URL')
  }

  private static get debug() {
    return (getEnvVar('MORU_DEBUG') || 'false').toLowerCase() === 'true'
  }

  private static get apiKey() {
    return getEnvVar('MORU_API_KEY')
  }

  private static get accessToken() {
    return getEnvVar('MORU_ACCESS_TOKEN')
  }

  getSignal(requestTimeoutMs?: number) {
    const timeout = requestTimeoutMs ?? this.requestTimeoutMs

    return timeout ? AbortSignal.timeout(timeout) : undefined
  }

  getSandboxUrl(
    sandboxId: string,
    opts: { sandboxDomain: string; envdPort: number }
  ) {
    if (this.sandboxUrl) {
      return this.sandboxUrl
    }

    return `${this.debug ? 'http' : 'https'}://${this.getHost(sandboxId, opts.envdPort, opts.sandboxDomain)}`
  }

  getHost(sandboxId: string, port: number, sandboxDomain: string) {
    if (this.debug) {
      return `localhost:${port}`
    }

    return `${port}-${sandboxId}.${sandboxDomain ?? this.domain}`
  }
}

/**
 * User used for the operation in the sandbox.
 */

export const defaultUsername: Username = 'user'
export type Username = string
