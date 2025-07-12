import * as unzipper from 'unzipper';
import * as fs from 'fs';
import { IArchiveProvider, ArchiveEntry } from './IArchiveProvider';

export class ZipArchiveProvider implements IArchiveProvider {
  public supports(filePath: string): boolean {
    const lowercasedPath = filePath.toLowerCase();
    return lowercasedPath.endsWith('.zip') || lowercasedPath.endsWith('.cbz');
  }

  public getType(): 'zip' | 'rar' | '7z' {
    return 'zip';
  }

  public getEntries(filePath: string): Promise<ArchiveEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: ArchiveEntry[] = [];
      fs.createReadStream(filePath)
        .pipe(unzipper.Parse())
        .on('entry', (entry: unzipper.Entry) => {
          entries.push({
            name: entry.path,
            path: entry.path,
            isDirectory: entry.type === 'Directory',
          });
          entry.autodrain();
        })
        .on('finish', () => resolve(entries))
        .on('error', reject);
    });
  }

  public extractFile(archivePath: string, entryPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(archivePath)
        .pipe(unzipper.Parse())
        .on('entry', (entry: unzipper.Entry) => {
          if (entry.path === entryPath && entry.type === 'File') {
            const chunks: Buffer[] = [];
            entry.on('data', (chunk: Buffer) => chunks.push(chunk));
            entry.on('end', () => resolve(Buffer.concat(chunks)));
            entry.on('error', reject);
          } else {
            entry.autodrain();
          }
        })
        .on('error', reject)
        .on('finish', () => reject(new Error(`File not found: ${entryPath}`)));
    });
  }
}
