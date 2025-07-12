import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import { ImageBundleDetails } from '../models/ImageBundleDetails';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { IFileSystemProvider } from '../providers/IFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { isImageFile, isArchiveFile } from '../utils/file-types';
import { naturalSort } from '../utils/natural-sort';

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

    rootGroup.bundles = items.filter((item): item is ImageBundleSummary => item instanceof ImageBundleSummary);
    rootGroup.subGroups = items.filter((item): item is ImageBundleGroup => item instanceof ImageBundleGroup);

    return rootGroup;
  }

  private async parsePath(dirPath: string, libraryId: string): Promise<(ImageBundleSummary | ImageBundleGroup)[]> {
    const results: (ImageBundleSummary | ImageBundleGroup)[] = [];

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
          const bundle = new ImageBundleSummary(
            uuidv4(),
            'directory',
            entry.name,
            entryPath,
            libraryId,
            imageFiles.length,
            stats.modifiedAt,
            stats.fileId
          );
          results.push(bundle);
        }

        if (subItems.length > 0) {
          const group = new ImageBundleGroup(uuidv4(), entry.name, entryPath, libraryId);
          group.bundles = subItems.filter((item): item is ImageBundleSummary => item instanceof ImageBundleSummary);
          group.subGroups = subItems.filter((item): item is ImageBundleGroup => item instanceof ImageBundleGroup);
          results.push(group);
        }
      } else if (entry.isFile() && isArchiveFile(entry.name)) {
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

  public async parseArchive(archivePath: string, libraryId: string): Promise<ImageBundleSummary> {
    const provider = this.archiveProviders.find(p => p.supports(archivePath));
    if (!provider) {
      throw new Error(`Unsupported archive type: ${archivePath}`);
    }

    const entries = await provider.getEntries(archivePath);
    const imageEntries = entries.filter(e => !e.isDirectory && isImageFile(e.name));
    const stats = await this.fsProvider.stat(archivePath);

    return new ImageBundleSummary(
      uuidv4(),
      provider.getType(),
      path.basename(archivePath),
      archivePath,
      libraryId,
      imageEntries.length,
      stats.modifiedAt,
      stats.fileId
    );
  }

  /**
   * Retrieves the detailed information (page list) for a specific ImageBundleSummary.
   * @param bundleId The ID of the ImageBundleSummary (which is its path).
   * @param type The type of the bundle ('directory' or archive type).
   * @returns An ImageBundleDetails object.
   */
  public async getBundleDetails(bundleId: string, type: 'directory' | 'zip' | 'rar' | '7z'): Promise<ImageBundleDetails> {
    let pages: string[] = [];

    if (type === 'directory') {
      const entries = await this.fsProvider.readdir(bundleId);
      pages = entries.filter(e => e.isFile() && isImageFile(e.name)).map(e => e.path);
    } else {
      const provider = this.archiveProviders.find(p => p.getType() === type);
      if (!provider) {
        throw new Error(`No archive provider found for type: ${type}`);
      }
      const entries = await provider.getEntries(bundleId);
      pages = entries.filter(e => !e.isDirectory && isImageFile(e.name)).map(e => e.path);
    }

    return new ImageBundleDetails(bundleId, naturalSort(pages));
  }

  /**
   * Extracts image data from a bundle at a specific page index
   * @param bundleId The ID of the ImageBundleSummary (which is its path)
   * @param type The type of the bundle ('directory' or archive type)
   * @param pageIndex The index of the page to extract (0-based)
   * @returns The image data as a Buffer
   */
  public async getImageData(bundleId: string, type: 'directory' | 'zip' | 'rar' | '7z', pageIndex: number): Promise<Buffer> {
    const details = await this.getBundleDetails(bundleId, type);
    
    if (pageIndex < 0 || pageIndex >= details.pages.length) {
      throw new Error(`Page index ${pageIndex} out of range (0-${details.pages.length - 1})`);
    }

    const imagePath = details.pages[pageIndex];

    if (type === 'directory') {
      return await this.fsProvider.readFile(imagePath);
    } else {
      const provider = this.archiveProviders.find(p => p.getType() === type);
      if (!provider) {
        throw new Error(`No archive provider found for type: ${type}`);
      }
      // For archives, imagePath is already the relative path within the archive
      return await provider.extractFile(bundleId, imagePath);
    }
  }

  /**
   * Extracts image data from a bundle by image path
   * @param bundleId The ID of the ImageBundleSummary (which is its path)
   * @param type The type of the bundle ('directory' or archive type)
   * @param imagePath The path to the image within the bundle
   * @returns The image data as a Buffer
   */
  public async getImageDataByPath(bundleId: string, type: 'directory' | 'zip' | 'rar' | '7z', imagePath: string): Promise<Buffer> {
    if (type === 'directory') {
      const fullPath = path.join(bundleId, imagePath);
      return await this.fsProvider.readFile(fullPath);
    } else {
      const provider = this.archiveProviders.find(p => p.getType() === type);
      if (!provider) {
        throw new Error(`No archive provider found for type: ${type}`);
      }
      return await provider.extractFile(bundleId, imagePath);
    }
  }
}
