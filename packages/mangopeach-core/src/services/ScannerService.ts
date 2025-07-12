import * as path from 'path';
import * as crypto from 'crypto';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import { ImageBundleDetails } from '../models/ImageBundleDetails';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { IFileSystemProvider, FileSystemEntry } from '../providers/IFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { isImageFile, isArchiveFile } from '../utils/file-types';
import { naturalSort } from '../utils/natural-sort';
import { ILibraryStore } from './data-store/ILibraryStore';

export class ScannerService {
  private fsProvider: IFileSystemProvider;
  private archiveProviders: IArchiveProvider[];
  private dataStore: ILibraryStore;

  constructor(fsProvider: IFileSystemProvider, archiveProviders: IArchiveProvider[], dataStore: ILibraryStore) {
    this.fsProvider = fsProvider;
    this.archiveProviders = archiveProviders;
    this.dataStore = dataStore;
  }

  private generateId(libraryId: string, fileId?: string, fallbackRelativePath?: string): string {
    const input = fileId ? `${libraryId}:${fileId}` : `${libraryId}:${fallbackRelativePath}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 12);
  }

  public async scanLibrary(libraryId: string, libraryPath: string): Promise<ImageBundleSummary[]> {
    const existingGroups = await this.dataStore.getGroups(libraryId);
    const existingBundles = await this.dataStore.getBundles(libraryId);
    const seenGroupIds = new Set<string>();
    const seenBundleIds = new Set<string>();

    const rootGroupStats = await this.fsProvider.stat(libraryPath);
    const rootGroupId = this.generateId(libraryId, rootGroupStats.fileId, '.');
    const rootGroup = new ImageBundleGroup(rootGroupId, path.basename(libraryPath), libraryPath, libraryId, undefined);
    await this.dataStore.upsertGroup(rootGroup);
    seenGroupIds.add(rootGroupId);

    await this.scanPath(libraryPath, libraryId, libraryPath, rootGroupId, seenGroupIds, seenBundleIds);

    const deletedGroups = existingGroups.filter(g => !seenGroupIds.has(g.id));
    const deletedBundles = existingBundles.filter(b => !seenBundleIds.has(b.id));

    for (const group of deletedGroups) {
      await this.dataStore.deleteGroup(group.id);
    }
    for (const bundle of deletedBundles) {
      await this.dataStore.deleteBundle(bundle.id);
    }

    return deletedBundles;
  }

  private async scanPath(dirPath: string, libraryId: string, libraryPath: string, parentId: string, seenGroupIds: Set<string>, seenBundleIds: Set<string>): Promise<void> {
    let entries;
    try {
      entries = await this.fsProvider.readdir(dirPath);
    } catch (error) {
      console.error(`Failed to read directory: ${dirPath}`, error);
      return;
    }

    for (const entry of entries) {
      const entryPath = entry.path;
      const relativePath = path.relative(libraryPath, entryPath);

      if (entry.isDirectory()) {
        const isBundle = await this.isImageBundle(entryPath);
        const hasSubdirectoriesOrArchives = await this.hasSubdirectoriesOrArchives(entryPath);
        
        let groupId: string | undefined;
        
        // Create bundle if directory contains images
        if (isBundle) {
          await this.createBundleFromDirectory(entry, libraryId, libraryPath, parentId, seenBundleIds);
        }
        
        // Create group if directory contains subdirectories/archives OR if no images (can be both bundle AND group)
        if (hasSubdirectoriesOrArchives || !isBundle) {
          const stats = await this.fsProvider.stat(entryPath);
          groupId = this.generateId(libraryId, stats.fileId, relativePath);
          const group = new ImageBundleGroup(groupId, entry.name, entryPath, libraryId, parentId);
          await this.dataStore.upsertGroup(group);
          seenGroupIds.add(groupId);
          await this.scanPath(entryPath, libraryId, libraryPath, groupId, seenGroupIds, seenBundleIds);
        }
      } else if (entry.isFile() && isArchiveFile(entry.name)) {
        await this.createBundleFromArchive(entry, libraryId, libraryPath, parentId, seenBundleIds);
      }
    }
  }

  private async createBundleFromDirectory(entry: FileSystemEntry, libraryId: string, libraryPath: string, parentId: string, seenBundleIds: Set<string>): Promise<void> {
    const stats = await this.fsProvider.stat(entry.path);
    const dirEntries = await this.fsProvider.readdir(entry.path);
    const imageFiles = dirEntries.filter(e => e.isFile() && isImageFile(e.name));
    const relativePath = path.relative(libraryPath, entry.path);
    const bundleId = this.generateId(libraryId, stats.fileId, relativePath);
    const bundle = new ImageBundleSummary(
      bundleId,
      'directory',
      entry.name,
      entry.path,
      libraryId,
      imageFiles.length,
      stats.modifiedAt,
      stats.fileId,
      parentId
    );
    await this.dataStore.upsertBundle(bundle);
    seenBundleIds.add(bundleId);
  }

  private async createBundleFromArchive(entry: FileSystemEntry, libraryId: string, libraryPath: string, parentId: string, seenBundleIds: Set<string>): Promise<void> {
    const provider = this.archiveProviders.find(p => p.supports(entry.path));
    if (!provider) {
      console.warn(`Unsupported archive type: ${entry.path}`);
      return;
    }

    const entries = await provider.getEntries(entry.path);
    const imageEntries = entries.filter(e => !e.isDirectory && isImageFile(e.name));
    const stats = await this.fsProvider.stat(entry.path);
    const relativePath = path.relative(libraryPath, entry.path);
    const bundleId = this.generateId(libraryId, stats.fileId, relativePath);
    const bundle = new ImageBundleSummary(
      bundleId,
      provider.getType(),
      path.basename(entry.path),
      entry.path,
      libraryId,
      imageEntries.length,
      stats.modifiedAt,
      stats.fileId,
      parentId
    );
    await this.dataStore.upsertBundle(bundle);
    seenBundleIds.add(bundleId);
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

  private async hasSubdirectoriesOrArchives(dirPath: string): Promise<boolean> {
    try {
      const entries = await this.fsProvider.readdir(dirPath);
      return entries.some(entry => 
        entry.isDirectory() || 
        (entry.isFile() && isArchiveFile(entry.name))
      );
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return false;
    }
  }

  public async getBundleDetails(bundleId: string): Promise<ImageBundleDetails> {
    const bundle = await this.dataStore.getBundle(bundleId);
    if (!bundle) {
      throw new Error(`Bundle with ID ${bundleId} not found`);
    }

    let pages: string[] = [];

    if (bundle.type === 'directory') {
      const entries = await this.fsProvider.readdir(bundle.path);
      pages = entries.filter(e => e.isFile() && isImageFile(e.name)).map(e => e.path);
    } else {
      const provider = this.archiveProviders.find(p => p.getType() === bundle.type);
      if (!provider) {
        throw new Error(`No archive provider found for type: ${bundle.type}`);
      }
      const entries = await provider.getEntries(bundle.path);
      pages = entries.filter(e => !e.isDirectory && isImageFile(e.name)).map(e => e.path);
    }

    return new ImageBundleDetails(bundleId, naturalSort(pages));
  }

  public async getImageData(bundleId: string, pageIndex: number): Promise<Buffer> {
    const bundle = await this.dataStore.getBundle(bundleId);
    if (!bundle) {
      throw new Error(`Bundle with ID ${bundleId} not found`);
    }
    const details = await this.getBundleDetails(bundleId);
    
    if (pageIndex < 0 || pageIndex >= details.pages.length) {
      throw new Error(`Page index ${pageIndex} out of range (0-${details.pages.length - 1})`);
    }

    const imagePath = details.pages[pageIndex];

    if (bundle.type === 'directory') {
      return await this.fsProvider.readFile(imagePath);
    } else {
      const provider = this.archiveProviders.find(p => p.getType() === bundle.type);
      if (!provider) {
        throw new Error(`No archive provider found for type: ${bundle.type}`);
      }
      return await provider.extractFile(bundle.path, imagePath);
    }
  }

  public async getImageDataByPath(bundleId: string, imagePath: string): Promise<Buffer> {
    const bundle = await this.dataStore.getBundle(bundleId);
    if (!bundle) {
      throw new Error(`Bundle with ID ${bundleId} not found`);
    }

    if (bundle.type === 'directory') {
      const fullPath = path.join(bundle.path, imagePath);
      return await this.fsProvider.readFile(fullPath);
    } else {
      const provider = this.archiveProviders.find(p => p.getType() === bundle.type);
      if (!provider) {
        throw new Error(`No archive provider found for type: ${bundle.type}`);
      }
      return await provider.extractFile(bundle.path, imagePath);
    }
  }
}
