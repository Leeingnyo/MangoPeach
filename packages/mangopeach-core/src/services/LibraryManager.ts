import { ScannerService } from './ScannerService';
import { ScanDataStore } from './ScanDataStore';
import { ServerConfigService } from './ServerConfigService';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { Library } from '../models/Library';
import { IFileSystemProvider } from '../providers/IFileSystemProvider';
import { LocalFileSystemProvider } from '../providers/LocalFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { ZipArchiveProvider } from '../providers/ZipArchiveProvider';
import { ImageBundleSummary } from '../models/ImageBundleSummary';

export class LibraryManager {
  private configService: ServerConfigService;
  private libraries: Map<string, {
    config: Library;
    scanner: ScannerService;
    dataStore: ScanDataStore;
    currentData: ImageBundleGroup | null;
  }> = new Map();
  private recentlyDeleted: Map<string, ImageBundleSummary[]> = new Map();

  constructor(configService: ServerConfigService) {
    this.configService = configService;
  }

  public async initialize(): Promise<void> {
    const config = await this.configService.loadConfig();
    if (!config || config.libraries.length === 0) {
      console.log('No libraries configured. Please add libraries to config.json.');
      return;
    }

    for (const libConfig of config.libraries) {
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
      const dataStore = new ScanDataStore(config.dataStoragePath, libConfig.id, 'scan-data.json');

      // Try to load existing scan data for this library
      let currentData = await dataStore.load();

      if (!currentData) {
        console.log(`No scan data found for ${libConfig.name}. Performing initial full scan...`);
        currentData = await scanner.parseLibrary(libConfig.path);
        await dataStore.save(currentData);
      }

      this.libraries.set(libConfig.id, {
        config: libConfig,
        scanner,
        dataStore,
        currentData,
      });
      console.log(`Library ${libConfig.name} initialized.`);
    }
  }

  public getLibraryData(libraryId: string): ImageBundleGroup | null {
    return this.libraries.get(libraryId)?.currentData || null;
  }

  public getAllLibraryConfigs(): Library[] {
    return Array.from(this.libraries.values()).map(lib => lib.config);
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
      await library.dataStore.save(newData);
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
    await library.dataStore.save(newData);
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

  // TODO: Add methods for periodic scan, etc.
}
