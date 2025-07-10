import { ScannerService } from './ScannerService';
import { ScanDataStore } from './ScanDataStore';
import { ServerConfigService } from './ServerConfigService';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { Library } from '../models/Library';
import { IFileSystemProvider } from '../providers/IFileSystemProvider';
import { LocalFileSystemProvider } from '../providers/LocalFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { ZipArchiveProvider } from '../providers/ZipArchiveProvider';

export class LibraryManager {
  private configService: ServerConfigService;
  private libraries: Map<string, { 
    config: Library;
    scanner: ScannerService;
    dataStore: ScanDataStore;
    currentData: ImageBundleGroup | null;
  }> = new Map();

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

  // TODO: Add methods for incremental scan, periodic scan, etc.
}
