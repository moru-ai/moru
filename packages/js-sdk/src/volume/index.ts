import { ConnectionConfig, ConnectionOpts } from '../connectionConfig'
import { FileInfo, VolumeInfo } from './types'
import { VolumeApi, VolumeApiOpts } from './volumeApi'

export type { FileInfo, VolumeInfo } from './types'
export { VolumeApi, validateMountPath, ALLOWED_MOUNT_PREFIXES } from './volumeApi'
export type { VolumeApiOpts } from './volumeApi'

/**
 * Options for creating a volume.
 */
export interface VolumeCreateOpts extends VolumeApiOpts {
  /**
   * Volume name (unique per team, slug format: lowercase, hyphens).
   */
  name: string
}

/**
 * Moru volume is persistent storage for sandboxes.
 *
 * Volumes provide crash-durable file storage that persists across sandbox
 * lifecycle. Data is accessible even when no sandbox is running.
 *
 * @example
 * ```ts
 * import { Volume, Sandbox } from '@moru-ai/core'
 *
 * // Create a volume (idempotent - returns existing if name matches)
 * const vol = await Volume.create({ name: 'my-workspace' })
 *
 * // Attach to sandbox
 * const sbx = await Sandbox.create('base', {
 *   volumeId: vol.volumeId,
 *   volumeMountPath: '/workspace',
 * })
 *
 * // Work with files
 * const files = await vol.listFiles('/')
 * await vol.upload('/data/input.csv', Buffer.from('col1,col2\n1,2\n'))
 * const content = await vol.download('/output/result.csv')
 *
 * // Delete volume
 * await vol.delete()
 * ```
 */
export class Volume {
  /**
   * Unique volume identifier.
   */
  readonly volumeId: string

  /**
   * Volume name.
   */
  readonly name: string

  /**
   * Total size of files in volume (bytes).
   */
  private _totalSizeBytes: number

  /**
   * Total number of files in volume.
   */
  private _totalFileCount: number

  private readonly connectionConfig: ConnectionConfig

  /**
   * Use {@link Volume.create} to create a new Volume instead.
   *
   * @hidden
   */
  constructor(opts: {
    volumeId: string
    name: string
    totalSizeBytes?: number
    totalFileCount?: number
  } & VolumeApiOpts) {
    this.volumeId = opts.volumeId
    this.name = opts.name
    this._totalSizeBytes = opts.totalSizeBytes ?? 0
    this._totalFileCount = opts.totalFileCount ?? 0
    this.connectionConfig = new ConnectionConfig(opts)
  }

  /**
   * Total size of files in volume (bytes).
   */
  get totalSizeBytes(): number {
    return this._totalSizeBytes
  }

  /**
   * Total number of files in volume.
   */
  get totalFileCount(): number {
    return this._totalFileCount
  }

  /**
   * Create a new volume (idempotent).
   *
   * If a volume with the same name already exists for this team,
   * the existing volume is returned.
   *
   * @param opts Volume creation options.
   * @returns Volume instance.
   *
   * @example
   * ```ts
   * const vol = await Volume.create({ name: 'my-workspace' })
   * console.log(`Volume: ${vol.volumeId}`)
   * ```
   */
  static async create(opts: VolumeCreateOpts): Promise<Volume> {
    const info = await VolumeApi.createVolume(opts.name, opts)
    const { name: _name, ...connectionOpts } = opts

    return new Volume({
      volumeId: info.volumeId,
      name: info.name,
      totalSizeBytes: info.totalSizeBytes,
      totalFileCount: info.totalFileCount,
      ...connectionOpts,
    })
  }

  /**
   * Get a volume by ID or name.
   *
   * @param volumeIdOrName Volume ID (vol_xxx) or name.
   * @param opts Connection options.
   * @returns Volume instance.
   *
   * @example
   * ```ts
   * const vol = await Volume.get('vol_abc123')
   * // or
   * const vol = await Volume.get('my-workspace')
   * ```
   */
  static async get(
    volumeIdOrName: string,
    opts?: VolumeApiOpts
  ): Promise<Volume> {
    const info = await VolumeApi.getVolume(volumeIdOrName, opts)

    return new Volume({
      volumeId: info.volumeId,
      name: info.name,
      totalSizeBytes: info.totalSizeBytes,
      totalFileCount: info.totalFileCount,
      ...opts,
    })
  }

  /**
   * List all volumes.
   *
   * @param opts Connection options.
   * @returns List of volume info objects.
   *
   * @example
   * ```ts
   * const volumes = await Volume.list()
   * for (const vol of volumes) {
   *   console.log(`${vol.name}: ${vol.totalSizeBytes} bytes`)
   * }
   * ```
   */
  static async list(opts?: VolumeApiOpts): Promise<VolumeInfo[]> {
    return await VolumeApi.listVolumes(opts)
  }

  /**
   * Delete the volume.
   *
   * @param opts Connection options.
   * @returns True if deleted, false if not found.
   *
   * @example
   * ```ts
   * const vol = await Volume.create({ name: 'temp-workspace' })
   * await vol.delete()
   * ```
   */
  async delete(opts?: VolumeApiOpts): Promise<boolean> {
    return await VolumeApi.deleteVolume(this.volumeId, {
      ...this.connectionConfig,
      ...opts,
    })
  }

  /**
   * Get updated volume information.
   *
   * @param opts Connection options.
   * @returns Volume info with current size and file count.
   *
   * @example
   * ```ts
   * const vol = await Volume.get('my-workspace')
   * const info = await vol.getInfo()
   * console.log(`Size: ${info.totalSizeBytes} bytes, Files: ${info.totalFileCount}`)
   * ```
   */
  async getInfo(opts?: VolumeApiOpts): Promise<VolumeInfo> {
    const info = await VolumeApi.getVolume(this.volumeId, {
      ...this.connectionConfig,
      ...opts,
    })

    // Update cached values
    this._totalSizeBytes = info.totalSizeBytes
    this._totalFileCount = info.totalFileCount

    return info
  }

  /**
   * List files and directories at a path.
   *
   * Works even while volume is attached to a sandbox.
   *
   * @param path Directory path to list (default: "/").
   * @param opts Connection options.
   * @returns List of file info objects.
   *
   * @example
   * ```ts
   * const files = await vol.listFiles('/src')
   * for (const f of files) {
   *   console.log(`${f.name} (${f.type})`)
   * }
   * ```
   */
  async listFiles(path: string = '/', opts?: VolumeApiOpts): Promise<FileInfo[]> {
    return await VolumeApi.listFiles(this.volumeId, path, {
      ...this.connectionConfig,
      ...opts,
    })
  }

  /**
   * Upload file content to the volume.
   *
   * Creates parent directories as needed. Works even while volume
   * is attached to a sandbox - changes are visible immediately.
   *
   * @param path Destination path in volume.
   * @param content File content as Buffer or ArrayBuffer.
   * @param opts Connection options.
   *
   * @example
   * ```ts
   * await vol.upload('/data/input.csv', Buffer.from('col1,col2\n1,2\n'))
   * ```
   */
  async upload(
    path: string,
    content: Buffer | ArrayBuffer,
    opts?: VolumeApiOpts
  ): Promise<void> {
    await VolumeApi.uploadFile(this.volumeId, path, content, {
      ...this.connectionConfig,
      ...opts,
    })
  }

  /**
   * Download file content from the volume.
   *
   * Works even while volume is attached to a sandbox.
   *
   * @param path File path in volume.
   * @param opts Connection options.
   * @returns File content as Buffer.
   *
   * @example
   * ```ts
   * const content = await vol.download('/output/result.csv')
   * console.log(content.toString('utf-8'))
   * ```
   */
  async download(path: string, opts?: VolumeApiOpts): Promise<Buffer> {
    return await VolumeApi.downloadFile(this.volumeId, path, {
      ...this.connectionConfig,
      ...opts,
    })
  }

  /**
   * Delete file or directory from the volume.
   *
   * @param path Path to delete.
   * @param recursive Delete directory recursively.
   * @param opts Connection options.
   * @returns True if deleted.
   *
   * @example
   * ```ts
   * await vol.deleteFile('/temp/cache.txt')
   * await vol.deleteFile('/temp/', true) // recursive
   * ```
   */
  async deleteFile(
    path: string,
    recursive: boolean = false,
    opts?: VolumeApiOpts
  ): Promise<boolean> {
    return await VolumeApi.deleteFile(this.volumeId, path, recursive, {
      ...this.connectionConfig,
      ...opts,
    })
  }
}
