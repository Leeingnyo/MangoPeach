export interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

export interface FileSystemStat {
  fileId?: string;
  modifiedAt: Date;
  createdAt: Date;
  size: number;
}

export interface IFileSystemProvider {
  readdir(path: string): Promise<FileSystemEntry[]>;
  stat(path: string): Promise<FileSystemStat>;
  readFile(path: string): Promise<Buffer>;
  exists(path: string): Promise<boolean>;
}
