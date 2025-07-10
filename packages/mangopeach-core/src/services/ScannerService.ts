import * as path from 'path';
import { ImageBundle } from '../models/ImageBundle';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { IFileSystemProvider } from '../providers/IFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { isImageFile, isArchiveFile } from '../utils/file-types';

export class ScannerService {
  private fsProvider: IFileSystemProvider;
  private archiveProviders: IArchiveProvider[];

  constructor(fsProvider: IFileSystemProvider, archiveProviders: IArchiveProvider[]) {
    this.fsProvider = fsProvider;
    this.archiveProviders = archiveProviders;
  }

  public async parseLibrary(libraryPath: string): Promise<ImageBundleGroup> {
    const libraryId = libraryPath;
    const libraryName = path.basename(libraryPath);
    const rootGroup = new ImageBundleGroup(libraryId, libraryName, libraryPath, libraryId);

    const items = await this.parsePath(libraryPath, libraryId);

    rootGroup.bundles = items.filter((item): item is ImageBundle => item instanceof ImageBundle);
    rootGroup.subGroups = items.filter((item): item is ImageBundleGroup => item instanceof ImageBundleGroup);

    return rootGroup;
  }

  private async parsePath(dirPath: string, libraryId: string): Promise<(ImageBundle | ImageBundleGroup)[]> {
    const results: (ImageBundle | ImageBundleGroup)[] = [];

    let entries;
    try {
      entries = await this.fsProvider.readdir(dirPath);
    } catch (error) {
      console.error(`Failed to read directory: ${dirPath}`, error);
      return [];
    }

    for (const entry of entries) {
      const entryPath = entry.path;

      if (entry.isDirectory()) {
        const subItems = await this.parsePath(entryPath, libraryId);

        if (await this.isImageBundle(entryPath)) {
          const stats = await this.fsProvider.stat(entryPath);
          const dirEntries = await this.fsProvider.readdir(entryPath);
          const imageFiles = dirEntries.filter(e => e.isFile() && isImageFile(e.name));
          const bundle = new ImageBundle(
            entryPath,
            'directory',
            entry.name,
            entryPath,
            libraryId,
            imageFiles.length,
            stats.modifiedAt
          );
          results.push(bundle);
        }

        if (subItems.length > 0) {
          const group = new ImageBundleGroup(entryPath, entry.name, entryPath, libraryId);
          group.bundles = subItems.filter((item): item is ImageBundle => item instanceof ImageBundle);
          group.subGroups = subItems.filter((item): item is ImageBundleGroup => item instanceof ImageBundleGroup);
          results.push(group);
        }
      } else if (entry.isFile() && isArchiveFile(entry.name)) {
        // This is where parseArchive would be called
        const bundle = await this.parseArchive(entryPath, libraryId);
        results.push(bundle);
      }
    }
    return results;
  }

  private async isImageBundle(dirPath: string): Promise<boolean> {
    try {
      const entries = await this.fsProvider.readdir(dirPath);
      return entries.some(entry => entry.isFile() && isImageFile(entry.name));
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return false;
    }
  }

  public async parseArchive(archivePath: string, libraryId: string): Promise<ImageBundle> {
    const provider = this.archiveProviders.find(p => p.supports(archivePath));
    if (!provider) {
      throw new Error(`Unsupported archive type: ${archivePath}`);
    }

    const entries = await provider.getEntries(archivePath);
    const imageEntries = entries.filter(e => !e.isDirectory && isImageFile(e.name));
    const stats = await this.fsProvider.stat(archivePath);

    return new ImageBundle(
      archivePath,
      provider.getType(),
      path.basename(archivePath),
      archivePath,
      libraryId,
      imageEntries.length,
      stats.modifiedAt
    );
  }
}
