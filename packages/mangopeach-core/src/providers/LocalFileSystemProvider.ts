import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemEntry, FileSystemStat, IFileSystemProvider } from './IFileSystemProvider';

export class LocalFileSystemProvider implements IFileSystemProvider {
  public async readdir(dirPath: string): Promise<FileSystemEntry[]> {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    return dirents.map(dirent => ({
      name: dirent.name,
      path: path.join(dirPath, dirent.name),
      isDirectory: () => dirent.isDirectory(),
      isFile: () => dirent.isFile(),
    }));
  }

  public async stat(filePath: string): Promise<FileSystemStat> {
    const stats = await fs.stat(filePath);
    return {
      fileId: stats.ino.toString(),
      modifiedAt: stats.mtime,
      createdAt: stats.ctime,
      size: stats.size,
    };
  }

  public async readFile(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath);
  }

  public async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
