/**
 * Type of file system entry.
 */
export type FileType = 'file' | 'directory'

/**
 * Information about a file or directory in a volume.
 */
export interface FileInfo {
  /**
   * File or directory name.
   */
  name: string

  /**
   * Full path within volume.
   */
  path: string

  /**
   * Entry type (file or directory).
   */
  type: FileType

  /**
   * File size in bytes (only for files).
   */
  size?: number

  /**
   * Last modification time.
   */
  modifiedAt?: Date
}

/**
 * Information about a volume.
 */
export interface VolumeInfo {
  /**
   * Unique volume identifier.
   */
  volumeId: string

  /**
   * Volume name.
   */
  name: string

  /**
   * Total size of files in volume (bytes).
   */
  totalSizeBytes: number

  /**
   * Total number of files in volume.
   */
  totalFileCount: number

  /**
   * When the volume was created.
   */
  createdAt: Date

  /**
   * When the volume was last updated.
   */
  updatedAt: Date
}
