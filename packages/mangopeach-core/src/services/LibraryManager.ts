import { ILibraryStore } from './data-store/ILibraryStore';
import { ScannerService } from './ScannerService';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { Library } from '../models/Library';
import { IFileSystemProvider } from '../providers/IFileSystemProvider';
import { LocalFileSystemProvider } from '../providers/LocalFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { ZipArchiveProvider } from '../providers/ZipArchiveProvider';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import * as cron from 'node-cron';

export class LibraryManager {
  private dataStore: ILibraryStore;
  private libraries: Map<string, {
    config: Library;
    scanner: ScannerService;
    currentData: ImageBundleGroup | null;
  }> = new Map();
  private recentlyDeleted: Map<string, ImageBundleSummary[]> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(dataStore: ILibraryStore) {
    this.dataStore = dataStore;
  }

  public async initialize(): Promise<void> {
    const libraries = await this.dataStore.getAllLibraries();
    if (libraries.length === 0) {
      console.log('No libraries configured in the data store.');
      return;
    }

    for (const libConfig of libraries) {
      // Determine FileSystemProvider based on library type
      let fsProvider: IFileSystemProvider;
      switch (libConfig.type) {
        case 'local':
          fsProvider = new LocalFileSystemProvider();
          break;
        // TODO: Add other providers like SmbFileSystemProvider, FtpFileSystemProvider
        default:
          console.warn(`Unsupported library type: ${libConfig.type}. Skipping library ${libConfig.name}.`);
          continue;
      }

      // Initialize ArchiveProviders (for now, only Zip)
      const archiveProviders: IArchiveProvider[] = [new ZipArchiveProvider()];
      // TODO: Add other archive providers like RarArchiveProvider

      const scanner = new ScannerService(fsProvider, archiveProviders);

      // Try to load existing scan data for this library
      let currentData = await this.dataStore.getLibraryData(libConfig.id);

      if (!currentData) {
        console.log(`No scan data found for ${libConfig.name}. Performing initial full scan...`);
        currentData = await scanner.parseLibrary(libConfig.path);
        await this.dataStore.saveLibraryData(libConfig.id, currentData);
      } else {
        console.log(`Existing scan data found for ${libConfig.name}. Scanning for changes...`);
        // Always scan and compare with existing data
        try {
          const newData = await scanner.parseLibrary(libConfig.path);
          const oldBundles = this.flattenBundles(currentData);
          const newBundles = this.flattenBundles(newData);

          // Simple comparison - if counts differ, update the data
          if (oldBundles.length !== newBundles.length) {
            console.log(`Library ${libConfig.name}: Bundle count changed (${oldBundles.length} -> ${newBundles.length}). Updating data...`);
            currentData = newData;
            await this.dataStore.saveLibraryData(libConfig.id, newData);
          } else {
            // TODO: More sophisticated comparison could be added here
            // For now, we'll use the existing data but the scanner is still available for real-time operations
            console.log(`Library ${libConfig.name}: No significant changes detected.`);
          }
        } catch (error) {
          console.error(`Error scanning library ${libConfig.name}:`, error);
          console.log(`Using existing scan data for ${libConfig.name}.`);
        }
      }

      this.libraries.set(libConfig.id, {
        config: libConfig,
        scanner,
        currentData,
      });
      console.log(`Library ${libConfig.name} initialized.`);
    }
    this.scheduleScans();
  }

  public async getLibraryData(libraryId: string): Promise<ImageBundleGroup | null> {
    const library = this.libraries.get(libraryId);
    if (library) {
        return library.currentData;
    }
    return await this.dataStore.getLibraryData(libraryId);
  }

  public async getAllLibraryConfigs(): Promise<Library[]> {
    return await this.dataStore.getAllLibraries();
  }

  public getRecentlyDeleted(libraryId: string): ImageBundleSummary[] {
    return this.recentlyDeleted.get(libraryId) || [];
  }

  public async rescanAndCompare(libraryId: string) {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error(`Library with ID ${libraryId} not found.`);
    }

    console.log(`Rescanning library: ${library.config.name}...`);

    const oldData = library.currentData;
    const newData = await library.scanner.parseLibrary(library.config.path);

    if (!oldData) {
      console.log('No previous data, treating all items as new.');
      library.currentData = newData;
      await this.dataStore.saveLibraryData(libraryId, newData);
      return { added: this.flattenBundles(newData), updated: [], moved: [], deleted: [] };
    }

    const oldBundles = this.flattenBundles(oldData);
    const newBundles = this.flattenBundles(newData);

    const oldBundlesByPath = new Map(oldBundles.map(b => [b.path, b]));
    const newBundlesByPath = new Map(newBundles.map(b => [b.path, b]));

    // Filter out bundles without a fileId for the next step
    const oldBundlesByFileId = new Map(oldBundles.filter(b => b.fileId).map(b => [b.fileId!, b]));
    const newBundlesByFileId = new Map(newBundles.filter(b => b.fileId).map(b => [b.fileId!, b]));

    const added: ImageBundleSummary[] = [];
    const updated: ImageBundleSummary[] = [];
    const moved: { from: ImageBundleSummary; to: ImageBundleSummary }[] = [];

    // 1. Find updated and unchanged files by path
    for (const newBundle of newBundles) {
      if (oldBundlesByPath.has(newBundle.path)) {
        const oldBundle = oldBundlesByPath.get(newBundle.path)!;
        if (oldBundle.modifiedAt.getTime() !== newBundle.modifiedAt.getTime()) {
          updated.push(newBundle);
        }
        // Remove matched items so they aren't considered for moves/adds/deletes
        oldBundlesByPath.delete(oldBundle.path);
        newBundlesByPath.delete(newBundle.path);
        if(oldBundle.fileId) oldBundlesByFileId.delete(oldBundle.fileId);
        if(newBundle.fileId) newBundlesByFileId.delete(newBundle.fileId);
      }
    }

    // 2. Find moved files by fileId
    for (const newBundle of Array.from(newBundlesByPath.values())) {
      if (newBundle.fileId && oldBundlesByFileId.has(newBundle.fileId)) {
        const oldBundle = oldBundlesByFileId.get(newBundle.fileId)!;
        moved.push({ from: oldBundle, to: newBundle });

        // Remove matched items so they aren't considered for moves/adds/deletes
        oldBundlesByPath.delete(oldBundle.path);
        newBundlesByPath.delete(newBundle.path);
        oldBundlesByFileId.delete(oldBundle.fileId as string);
        newBundlesByFileId.delete(newBundle.fileId);
      }
    }

    // 3. Remaining items are added or deleted
    const deleted = Array.from(oldBundlesByPath.values());
    added.push(...Array.from(newBundlesByPath.values()));

    // 4. Update state
    library.currentData = newData;
    await this.dataStore.saveLibraryData(libraryId, newData);
    this.recentlyDeleted.set(libraryId, deleted);

    console.log(`Scan complete for ${library.config.name}:`);
    console.log(`  - Added: ${added.length}`);
    console.log(`  - Updated: ${updated.length}`);
    console.log(`  - Moved: ${moved.length}`);
    console.log(`  - Deleted: ${deleted.length}`);

    return { added, updated, moved, deleted };
  }

  private flattenBundles(group: ImageBundleGroup): ImageBundleSummary[] {
    let bundles = [...group.bundles];
    for (const subGroup of group.subGroups) {
      bundles = bundles.concat(this.flattenBundles(subGroup));
    }
    return bundles;
  }

  public scheduleScans(): void {
    console.log('Scheduling periodic scans for libraries...');
    this.shutdown(); // Clear any existing jobs before scheduling new ones

    for (const [libraryId, library] of Array.from(this.libraries.entries())) {
      const { config } = library;
      if (config.enabled && config.scanInterval && cron.validate(config.scanInterval)) {
        const job = cron.schedule(config.scanInterval, async () => {
          console.log(`Running scheduled scan for library: ${config.name}`);
          try {
            await this.rescanAndCompare(libraryId);
          } catch (error) {
            console.error(`Error during scheduled scan for ${config.name}:`, error);
          }
        });
        this.scheduledJobs.set(libraryId, job);
        console.log(`Scheduled scan for "${config.name}" with interval "${config.scanInterval}"`);
      } else if (config.enabled && config.scanInterval) {
        console.warn(`Invalid cron expression "${config.scanInterval}" for library "${config.name}". Scan will not be scheduled.`);
      }
    }
  }

  public shutdown(): void {
    for (const [, job] of Array.from(this.scheduledJobs.entries())) {
      job.stop();
    }
    this.scheduledJobs.clear();
    console.log('All scheduled scan jobs stopped.');
  }
}
