import { ILibraryStore } from './data-store/ILibraryStore';
import { ServerConfigService } from './ServerConfigService';
import { ScannerService } from './ScannerService';

import { Library } from '../models/Library';
import { LibraryConfig } from '../models/LibraryConfig';
import { IFileSystemProvider } from '../providers/IFileSystemProvider';
import { LocalFileSystemProvider } from '../providers/LocalFileSystemProvider';
import { IArchiveProvider } from '../providers/IArchiveProvider';
import { ZipArchiveProvider } from '../providers/ZipArchiveProvider';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import * as cron from 'node-cron';

export class LibraryManager {
  public dataStore: ILibraryStore;
  private configService: ServerConfigService;
  private libraries: Map<string, {
    config: Library;
    scanner: ScannerService;
    
  }> = new Map();
  private recentlyDeleted: Map<string, ImageBundleSummary[]> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(dataStore: ILibraryStore, configService: ServerConfigService) {
    this.dataStore = dataStore;
    this.configService = configService;
  }

  public async initialize(): Promise<void> {
    // Load server configuration to get library settings
    const serverConfig = await this.configService.loadConfig();
    if (!serverConfig || !serverConfig.libraries || serverConfig.libraries.length === 0) {
      console.log('No libraries configured in server config.');
      return;
    }

    const libraryConfigs = serverConfig.libraries;

    // Match library configs with existing libraries in DB using inode/path
    for (const libConfig of libraryConfigs) {
      const library = await this.findOrCreateLibrary(libConfig);
      await this.initializeLibrary(library);
    }

    this.scheduleScans();
  }

  /**
   * Find existing library by directory ID (inode) or create new one
   */
  private async findOrCreateLibrary(config: LibraryConfig): Promise<Library> {
    let directoryId: string | undefined;
    try {
      const fsProvider = this.createFileSystemProvider(config.type);
      if (fsProvider) {
        const stats = await fsProvider.stat(config.path);
        directoryId = stats.fileId;
      }
    } catch (error) {
      console.warn(`Failed to get directory ID for ${config.path}:`, error);
    }

    if (directoryId) {
      const matchedLibrary = await this.dataStore.findLibraryByDirectoryId(directoryId);
      if (matchedLibrary) {
        console.log(`Found existing library ${matchedLibrary.name} (${matchedLibrary.id}) for path ${config.path}`);
        const updatedLibrary: Library = {
          ...matchedLibrary,
          name: config.name,
          path: config.path,
          type: config.type,
          updatedAt: new Date(),
        };
        await this.dataStore.updateLibrary(matchedLibrary.id, updatedLibrary);
        return updatedLibrary;
      }
    }

    const pathMatchedLibrary = await this.dataStore.findLibraryByPath(config.path);
    if (pathMatchedLibrary) {
      console.log(`Found existing library ${pathMatchedLibrary.name} (${pathMatchedLibrary.id}) by path ${config.path}`);
      const updatedLibrary: Library = {
        ...pathMatchedLibrary,
        name: config.name,
        type: config.type,
        directoryId,
        updatedAt: new Date(),
      };
      await this.dataStore.updateLibrary(pathMatchedLibrary.id, updatedLibrary);
      return updatedLibrary;
    }

    console.log(`Creating new library for ${config.name} at ${config.path}`);
    return await this.dataStore.createLibrary({
      name: config.name,
      path: config.path,
      type: config.type,
      enabled: true,
      scanInterval: '0 * * * *',
      directoryId,
    });
  }

  /**
   * Initialize a single library (scan and setup)
   */
  private async initializeLibrary(libConfig: Library): Promise<void> {
    if (!libConfig.enabled) {
      console.log(`Library ${libConfig.name} is disabled. Skipping initialization.`);
      return;
    }

    const fsProvider = this.createFileSystemProvider(libConfig.type);
    if (!fsProvider) {
      console.warn(`Unsupported library type: ${libConfig.type}. Skipping library ${libConfig.name}.`);
      return;
    }

    const archiveProviders: IArchiveProvider[] = [new ZipArchiveProvider()];
    const scanner = new ScannerService(fsProvider, archiveProviders, this.dataStore);

    const rootGroups = await this.dataStore.getGroups(libConfig.id, undefined);
    if (rootGroups.length === 0) {
        console.log(`No scan data found for ${libConfig.name}. Performing initial full scan...`);
        const deletedBundles = await scanner.scanLibrary(libConfig.id, libConfig.path);
        this.recentlyDeleted.set(libConfig.id, deletedBundles);
    }

    this.libraries.set(libConfig.id, {
      config: libConfig,
      scanner,
    });
    console.log(`Library ${libConfig.name} initialized.`);
  }

  /**
   * Create file system provider based on library type
   */
  private createFileSystemProvider(type: string): IFileSystemProvider | null {
    switch (type) {
      case 'local':
        return new LocalFileSystemProvider();
      // TODO: Add other providers like SmbFileSystemProvider, FtpFileSystemProvider
      default:
        return null;
    }
  }

  public async getLibraryData(libraryId: string, parentId?: string) {
    // If no parentId specified, we want contents of the root group, not the root group itself
    if (parentId === undefined) {
      // Find the root group (the one with parentId === undefined)
      const rootGroups = await this.dataStore.getGroups(libraryId, undefined);
      const rootGroup = rootGroups[0]; // Should be exactly one root group
      
      if (!rootGroup) {
        return { groups: [], bundles: [] };
      }
      
      // Return contents of the root group
      const groups = await this.dataStore.getGroups(libraryId, rootGroup.id);
      const bundles = await this.dataStore.getBundles(libraryId, rootGroup.id);
      return { groups, bundles };
    }
    
    // For specific parentId, return its contents normally
    const groups = await this.dataStore.getGroups(libraryId, parentId);
    const bundles = await this.dataStore.getBundles(libraryId, parentId);
    return { groups, bundles };
  }

  public async getAllLibraries(): Promise<Library[]> {
    const allLibraries = await this.dataStore.getAllLibraries();
    return allLibraries;
  }

  public getScannerService(libraryId: string): ScannerService | null {
    const library = this.libraries.get(libraryId);
    return library ? library.scanner : null;
  }

  public getRecentlyDeleted(libraryId: string): ImageBundleSummary[] {
    return this.recentlyDeleted.get(libraryId) || [];
  }

  public async rescanLibrary(libraryId: string) {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error(`Library with ID ${libraryId} not found.`);
    }

    console.log(`Rescanning library: ${library.config.name}...`);
    const deletedBundles = await library.scanner.scanLibrary(library.config.id, library.config.path);
    this.recentlyDeleted.set(libraryId, deletedBundles);
    console.log(`Scan complete for ${library.config.name}.`);
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
            await this.rescanLibrary(libraryId);
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