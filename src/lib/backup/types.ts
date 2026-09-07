export interface BackupConfig {
  includeDb: boolean
  includeFiles: boolean
  includeConfig: boolean
}

export interface BackupArtifact {
  type: "db" | "files" | "config" | "schema"
  data: Buffer
  filename: string
  size: number
}

export interface BackupManifest {
  version: string
  createdAt: string
  checksum: string
  artifacts: {
    db?: { filename: string; size: number; checksum: string }
    files?: { filename: string; size: number; checksum: string; fileCount: number }
    config?: { filename: string; size: number; checksum: string }
    schema?: { filename: string; size: number }
  }
  database: {
    tableCounts: Record<string, number>
    totalRows: number
  }
}

export interface RestoreOptions {
  backupId: number
  restoreDb: boolean
  restoreFiles: boolean
  restoreConfig: boolean
  confirmationToken: string
}

export interface StorageUsage {
  usedBytes: number
  objectCount: number
  limitBytes: number
}
