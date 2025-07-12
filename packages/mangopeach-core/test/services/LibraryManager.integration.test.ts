import * as path from 'path';
import { LibraryManager } from '../../src/services/LibraryManager';
import { ServerConfigService } from '../../src/services/ServerConfigService';
import { Library } from '../../src/models/Library';
import { ServerConfig } from '../../src/models/ServerConfig';
import { MemoryDataStore } from '../../src/services/data-store/MemoryDataStore';
import { ILibraryStore } from '../../src/services/data-store/ILibraryStore';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ZipArchiveProvider } from '../../src/providers/ZipArchiveProvider';

jest.mock('../../src/services/ServerConfigService');
const MockedServerConfigService = ServerConfigService as jest.MockedClass<typeof ServerConfigService>;

describe('LibraryManager (Integration Test with MemoryDataStore)', () => {
  let libraryManager: LibraryManager;
  let dataStore: ILibraryStore;
  let mockConfigService: jest.Mocked<ServerConfigService>;

  beforeEach(async () => {
    dataStore = new MemoryDataStore();
    mockConfigService = new MockedServerConfigService('') as jest.Mocked<ServerConfigService>;
    mockConfigService.loadConfig = jest.fn();
    mockConfigService.saveConfig = jest.fn();
    libraryManager = new LibraryManager(dataStore, mockConfigService);
  });

  afterEach(() => {
    // Clean up any scheduled jobs to prevent Jest from hanging
    if (libraryManager) {
      libraryManager.shutdown();
    }
  });

  it('should initialize with no libraries if server config is empty', async () => {
    // Arrange
    const emptyConfig: ServerConfig = {
      libraries: [],
      dataStoragePath: './data'
    };
    mockConfigService.loadConfig.mockResolvedValue(emptyConfig);

    // Act
    await libraryManager.initialize();
    const configs = await libraryManager.getAllLibraries();

    // Assert
    expect(configs).toHaveLength(0);
  });

  it('should initialize and perform an initial scan for a new library', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    
    const serverConfig: ServerConfig = {
      libraries: [{
        name: 'Test Library 1',
        path: libraryPath,
        type: 'local'
      }],
      dataStoragePath: './data'
    };
    mockConfigService.loadConfig.mockResolvedValue(serverConfig);

    await libraryManager.initialize();

    const loadedLibConfigs = await libraryManager.getAllLibraries();
    expect(loadedLibConfigs).toHaveLength(1);
    expect(loadedLibConfigs[0].name).toBe('Test Library 1');
    expect(loadedLibConfigs[0].path).toBe(libraryPath);

    const { groups } = await libraryManager.getLibraryData(loadedLibConfigs[0].id);
    expect(groups).toHaveLength(1);
    
    const rootGroup = groups[0];
    const { bundles } = await libraryManager.getLibraryData(loadedLibConfigs[0].id, rootGroup.id);
    expect(bundles).toHaveLength(1);
  });

  it('should load existing scan data for a library from the data store', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    
    const libConfig: Omit<Library, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test Library 2',
      path: libraryPath,
      type: 'local',
      enabled: true,
      scanInterval: '0 * * * *',
    };
    const createdLib = await dataStore.createLibrary(libConfig);

    const scanner = new ScannerService(new LocalFileSystemProvider(), [new ZipArchiveProvider()], dataStore);
    await scanner.scanLibrary(createdLib.id, libraryPath);

    const serverConfig: ServerConfig = {
      libraries: [{
        name: 'Test Library 2',
        path: libraryPath,
        type: 'local'
      }],
      dataStoragePath: './data'
    };
    mockConfigService.loadConfig.mockResolvedValue(serverConfig);

    const scannerSpy = jest.spyOn(ScannerService.prototype, 'scanLibrary');

    await libraryManager.initialize();

    const loadedLibConfigs = await libraryManager.getAllLibraries();
    expect(loadedLibConfigs).toHaveLength(1);
    expect(scannerSpy).not.toHaveBeenCalled();

    const { groups } = await libraryManager.getLibraryData(loadedLibConfigs[0].id);
    expect(groups).toHaveLength(1);
    
    const rootGroup = groups[0];
    const { bundles } = await libraryManager.getLibraryData(loadedLibConfigs[0].id, rootGroup.id);
    expect(bundles).toHaveLength(1);

    scannerSpy.mockRestore();
  });
});
