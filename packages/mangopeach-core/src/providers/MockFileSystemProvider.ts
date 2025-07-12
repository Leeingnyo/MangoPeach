import * as path from 'path';
import { IFileSystemProvider, FileSystemEntry, FileSystemStat } from './IFileSystemProvider';

/**
 * A mock provider that simulates a file system from a predefined object fixture.
 * Useful for unit testing services without hitting the actual file system.
 */
export class MockFileSystemProvider implements IFileSystemProvider {
  private fileSystem: Map<string, FileSystemEntry[]> = new Map();
  private stats: Map<string, FileSystemStat> = new Map();

  constructor(fixture: Record<string, string[]>) {
    for (const [dirPath, entries] of Object.entries(fixture)) {
      const fsEntries: FileSystemEntry[] = entries.map(name => {
        const fullPath = path.join(dirPath, name);
        // Simple heuristic: if no dot, it's a directory.
        const isDirectory = !name.includes('.');
        return {
          name,
          path: fullPath,
          isDirectory: () => isDirectory,
          isFile: () => !isDirectory,
        };
      });

      this.fileSystem.set(dirPath, fsEntries);

      // Create mock stats for all defined paths
      const allPaths = [dirPath, ...fsEntries.map(e => e.path)];
      for (const p of allPaths) {
        if (!this.stats.has(p)) {
          this.stats.set(p, {
            modifiedAt: new Date(),
            createdAt: new Date(),
            size: 1024, // Mock size
          });
        }
      }
    }
  }

  readdir(dirPath: string): Promise<FileSystemEntry[]> {
    return Promise.resolve(this.fileSystem.get(dirPath) || []);
  }

  stat(filePath: string): Promise<FileSystemStat> {
    if (this.stats.has(filePath)) {
      return Promise.resolve(this.stats.get(filePath)!);
    }
    return Promise.reject(new Error(`ENOENT: no such file or directory, stat '${filePath}'`));
  }

  readFile(filePath: string): Promise<Buffer> {
    // Mock readFile - check if the file exists in our fixture
    const exists = Array.from(this.fileSystem.values())
      .flat()
      .some(entry => entry.path === filePath && entry.isFile());

    if (exists) {
      return Promise.resolve(Buffer.from(`mock-content-of-${path.basename(filePath)}`));
    }
    return Promise.reject(new Error(`ENOENT: no such file or directory, open '${filePath}'`));
  }

  exists(filePath: string): Promise<boolean> {
    const pathExists = this.stats.has(filePath) ||
      Array.from(this.fileSystem.values())
        .flat()
        .some(entry => entry.path === filePath);

    return Promise.resolve(pathExists);
  }
}
