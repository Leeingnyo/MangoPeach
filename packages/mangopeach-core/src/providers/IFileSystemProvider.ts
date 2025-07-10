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
  // We can add more methods like exists(), readFile() etc. as needed.
}
