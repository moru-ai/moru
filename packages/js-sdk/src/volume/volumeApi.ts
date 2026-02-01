import { ConnectionConfig, ConnectionOpts } from '../connectionConfig'
import { NotFoundError } from '../errors'
import { FileInfo, VolumeInfo } from './types'

/**
 * Allowed mount path prefixes for sandbox volume attachment.
 */
export const ALLOWED_MOUNT_PREFIXES = [
  '/workspace/',
  '/data/',
  '/mnt/',
  '/volumes/',
]

/**
 * Validate volume mount path.
 *
 * @param path Mount path to validate.
 * @throws Error if path is invalid.
 */
export function validateMountPath(path: string): void {
  if (!path) {
    throw new Error('Mount path cannot be empty')
  }

  if (!path.startsWith('/')) {
    throw new Error('Mount path must be absolute (start with /)')
  }

  // Check allowed prefixes
  if (!ALLOWED_MOUNT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    throw new Error(
      `Mount path must start with one of: ${ALLOWED_MOUNT_PREFIXES.join(', ')}`
    )
  }

  // Check for directory traversal
  if (path.includes('..')) {
    throw new Error("Mount path cannot contain '..'")
  }
}

/**
 * Options for volume API requests.
 */
export interface VolumeApiOpts
  extends Partial<
    Pick<
      ConnectionOpts,
      'apiKey' | 'headers' | 'debug' | 'domain' | 'requestTimeoutMs'
    >
  > {}

interface ApiVolumeInfo {
  volumeID: string
  name: string
  totalSizeBytes?: number
  totalFileCount?: number
  createdAt: string
  updatedAt: string
}

interface ApiFileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
}

/**
 * Base class for volume API operations.
 *
 * Uses raw fetch since volume endpoints are not yet in the generated OpenAPI client.
 */
export class VolumeApi {
  protected constructor() {}

  private static async request<T>(
    config: ConnectionConfig,
    method: string,
    path: string,
    opts?: {
      body?: unknown
      signal?: AbortSignal
    }
  ): Promise<T> {
    const url = `${config.apiUrl}${path}`
    const response = await fetch(url, {
      method,
      headers: {
        ...config.headers,
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-KEY': config.apiKey }),
      },
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
      signal: opts?.signal,
    })

    if (response.status === 404) {
      throw new NotFoundError(`Resource not found: ${path}`)
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${text}`)
    }

    // Handle empty responses
    const text = await response.text()
    if (!text) {
      return {} as T
    }

    return JSON.parse(text) as T
  }

  /**
   * Create a new volume (idempotent).
   *
   * @param name Volume name.
   * @param opts Connection options.
   * @returns Volume info.
   */
  static async createVolume(
    name: string,
    opts?: VolumeApiOpts
  ): Promise<VolumeInfo> {
    const config = new ConnectionConfig(opts)

    const data = await VolumeApi.request<ApiVolumeInfo>(
      config,
      'POST',
      '/volumes',
      {
        body: { name },
        signal: config.getSignal(opts?.requestTimeoutMs),
      }
    )

    return VolumeApi.parseVolumeInfo(data)
  }

  /**
   * Get volume by ID or name.
   *
   * @param volumeIdOrName Volume ID (vol_xxx) or name.
   * @param opts Connection options.
   * @returns Volume info.
   */
  static async getVolume(
    volumeIdOrName: string,
    opts?: VolumeApiOpts
  ): Promise<VolumeInfo> {
    const config = new ConnectionConfig(opts)

    try {
      const data = await VolumeApi.request<ApiVolumeInfo>(
        config,
        'GET',
        `/volumes/${encodeURIComponent(volumeIdOrName)}`,
        {
          signal: config.getSignal(opts?.requestTimeoutMs),
        }
      )

      return VolumeApi.parseVolumeInfo(data)
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundError(`Volume '${volumeIdOrName}' not found`)
      }
      throw err
    }
  }

  /**
   * List all volumes.
   *
   * @param opts Connection options.
   * @returns List of volume info objects.
   */
  static async listVolumes(opts?: VolumeApiOpts): Promise<VolumeInfo[]> {
    const config = new ConnectionConfig(opts)

    const data = await VolumeApi.request<ApiVolumeInfo[]>(
      config,
      'GET',
      '/volumes',
      {
        signal: config.getSignal(opts?.requestTimeoutMs),
      }
    )

    return (data ?? []).map(VolumeApi.parseVolumeInfo)
  }

  /**
   * Delete a volume.
   *
   * @param volumeIdOrName Volume ID (vol_xxx) or name.
   * @param opts Connection options.
   * @returns True if deleted, false if not found.
   */
  static async deleteVolume(
    volumeIdOrName: string,
    opts?: VolumeApiOpts
  ): Promise<boolean> {
    const config = new ConnectionConfig(opts)

    try {
      await VolumeApi.request<void>(
        config,
        'DELETE',
        `/volumes/${encodeURIComponent(volumeIdOrName)}`,
        {
          signal: config.getSignal(opts?.requestTimeoutMs),
        }
      )
      return true
    } catch (err) {
      if (err instanceof NotFoundError) {
        return false
      }
      throw err
    }
  }

  /**
   * List files in a volume.
   *
   * @param volumeId Volume ID (vol_xxx).
   * @param path Directory path to list.
   * @param opts Connection options.
   * @returns List of file info objects.
   */
  static async listFiles(
    volumeId: string,
    path: string = '/',
    opts?: VolumeApiOpts
  ): Promise<FileInfo[]> {
    const config = new ConnectionConfig(opts)

    try {
      const data = await VolumeApi.request<{ files: ApiFileInfo[] }>(
        config,
        'GET',
        `/volumes/${encodeURIComponent(volumeId)}/files?path=${encodeURIComponent(path)}`,
        {
          signal: config.getSignal(opts?.requestTimeoutMs),
        }
      )

      return (data?.files ?? []).map(VolumeApi.parseFileInfo)
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundError(`Volume '${volumeId}' not found`)
      }
      throw err
    }
  }

  /**
   * Upload file content to volume.
   *
   * @param volumeId Volume ID (vol_xxx).
   * @param path Destination path in volume.
   * @param content File content as Buffer, ArrayBuffer, or ReadableStream.
   * @param opts Connection options.
   * @returns Size of uploaded file.
   */
  static async uploadFile(
    volumeId: string,
    path: string,
    content: Buffer | ArrayBuffer | ReadableStream<Uint8Array>,
    opts?: VolumeApiOpts
  ): Promise<number> {
    const config = new ConnectionConfig(opts)
    const url = `${config.apiUrl}/volumes/${encodeURIComponent(volumeId)}/files/upload?path=${encodeURIComponent(path)}`

    // Prepare headers - for streams, we use chunked transfer encoding
    const headers: Record<string, string> = {
      ...config.headers,
      'Content-Type': 'application/octet-stream',
    }

    // ReadableStream uses chunked transfer encoding (no Content-Length needed)
    // Buffer and ArrayBuffer can include Content-Length for efficiency
    if (content instanceof Buffer) {
      headers['Content-Length'] = String(content.byteLength)
    } else if (content instanceof ArrayBuffer) {
      headers['Content-Length'] = String(content.byteLength)
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: content,
      signal: config.getSignal(opts?.requestTimeoutMs),
      // Enable streaming for ReadableStream - required for Node.js fetch
      ...(content instanceof ReadableStream && { duplex: 'half' }),
    } as RequestInit)

    if (response.status === 404) {
      throw new NotFoundError(`Volume '${volumeId}' not found`)
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${text}`)
    }

    const data = await response.json() as { size?: number }
    // For ReadableStream, we can only know the size from the server response
    if (data?.size !== undefined) {
      return data.size
    }
    if (content instanceof Buffer) {
      return content.byteLength
    }
    if (content instanceof ArrayBuffer) {
      return content.byteLength
    }
    // For ReadableStream without server response, return 0
    return 0
  }

  /**
   * Download file content from volume.
   *
   * @param volumeId Volume ID (vol_xxx).
   * @param path File path in volume.
   * @param opts Connection options.
   * @returns File content as Buffer.
   */
  static async downloadFile(
    volumeId: string,
    path: string,
    opts?: VolumeApiOpts
  ): Promise<Buffer> {
    const config = new ConnectionConfig(opts)
    const url = `${config.apiUrl}/volumes/${encodeURIComponent(volumeId)}/files/download?path=${encodeURIComponent(path)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: config.headers,
      signal: config.getSignal(opts?.requestTimeoutMs),
    })

    if (response.status === 404) {
      throw new NotFoundError(
        `Volume '${volumeId}' or file '${path}' not found`
      )
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Delete file or directory from volume.
   *
   * @param volumeId Volume ID (vol_xxx).
   * @param path Path to delete.
   * @param recursive Delete directory recursively.
   * @param opts Connection options.
   * @returns True if deleted.
   */
  static async deleteFile(
    volumeId: string,
    path: string,
    recursive: boolean = false,
    opts?: VolumeApiOpts
  ): Promise<boolean> {
    const config = new ConnectionConfig(opts)
    const url = `/volumes/${encodeURIComponent(volumeId)}/files?path=${encodeURIComponent(path)}&recursive=${recursive}`

    try {
      await VolumeApi.request<void>(
        config,
        'DELETE',
        url,
        {
          signal: config.getSignal(opts?.requestTimeoutMs),
        }
      )
      return true
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new NotFoundError(
          `Volume '${volumeId}' or path '${path}' not found`
        )
      }
      throw err
    }
  }

  private static parseVolumeInfo(data: ApiVolumeInfo): VolumeInfo {
    return {
      volumeId: data.volumeID,
      name: data.name,
      totalSizeBytes: data.totalSizeBytes ?? 0,
      totalFileCount: data.totalFileCount ?? 0,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }
  }

  private static parseFileInfo(data: ApiFileInfo): FileInfo {
    return {
      name: data.name,
      path: data.path,
      type: data.type,
      size: data.size,
      modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : undefined,
    }
  }
}
