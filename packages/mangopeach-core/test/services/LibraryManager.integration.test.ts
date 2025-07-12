import * as path from 'path';
import { LibraryManager } from '../../src/services/LibraryManager';
import { ServerConfigService } from '../../src/services/ServerConfigService';
import { Library } from '../../src/models/Library';
import { ServerConfig } from '../../src/models/ServerConfig';
import { MemoryDataStore } from '../../src/services/data-store/MemoryDataStore';
import { ILibraryStore } from '../../src/services/data-store/ILibraryStore';

jest.mock('../../src/services/ServerConfigService');
const MockedServerConfigService = ServerConfigService as jest.MockedClass<typeof ServerConfigService>;

describe('LibraryManager (Integration Test with MemoryDataStore)', () => {
  let libraryManager: LibraryManager;
  let dataStore: ILibraryStore;
  let mockConfigService: jest.Mocked<ServerConfigService>;

  beforeEach(async () => {
    // Use MemoryDataStore for integration tests
    dataStore = new MemoryDataStore();
    
    // Create mock config service
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
    const configs = await libraryManager.getAllLibraryConfigs();

    // Assert
    expect(configs).toHaveLength(0);
  });

  it('should initialize and perform an initial scan for a new library', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    
    // Mock server config with library configuration
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

    const loadedLibConfigs = await libraryManager.getAllLibraryConfigs();
    expect(loadedLibConfigs).toHaveLength(1);
    expect(loadedLibConfigs[0].name).toBe('Test Library 1');
    expect(loadedLibConfigs[0].path).toBe(libraryPath);

    const libraryData = await libraryManager.getLibraryData(loadedLibConfigs[0].id);
    expect(libraryData).toBeDefined();
    expect(libraryData?.name).toBe('simple-library');
    expect(libraryData?.bundles).toHaveLength(1);
    expect(libraryData?.subGroups).toHaveLength(1);

    // Verify data is saved in the data store
    const savedData = await dataStore.getLibraryData(loadedLibConfigs[0].id);
    expect(savedData).toBeDefined();
    expect(savedData?.name).toBe('simple-library');
  });

  it('should load existing scan data for a library from the data store', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    
    // Pre-create library in data store
    const libConfig: Omit<Library, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test Library 2',
      path: libraryPath,
      type: 'local',
      enabled: true,
      scanInterval: '0 * * * *',
    };
    const createdLib = await dataStore.createLibrary(libConfig);

    // Manually create and save initial scan data to the data store
    const { ScannerService } = await import('../../src/services/ScannerService');
    const { LocalFileSystemProvider } = await import('../../src/providers/LocalFileSystemProvider');
    const { ZipArchiveProvider } = await import('../../src/providers/ZipArchiveProvider');
    const initialScanner = new ScannerService(new LocalFileSystemProvider(), [new ZipArchiveProvider()]);
    const initialData = await initialScanner.parseLibrary(libraryPath);
    await dataStore.saveLibraryData(createdLib.id, initialData);

    // Mock server config that matches the library
    const serverConfig: ServerConfig = {
      libraries: [{
        name: 'Test Library 2',
        path: libraryPath,
        type: 'local'
      }],
      dataStoragePath: './data'
    };
    mockConfigService.loadConfig.mockResolvedValue(serverConfig);

    // Spy on the scanner to ensure it's called during initialization
    const scannerSpy = jest.spyOn(ScannerService.prototype, 'parseLibrary');

    // Initialize LibraryManager, which should load the existing data
    await libraryManager.initialize();

    const loadedLibConfigs = await libraryManager.getAllLibraryConfigs();
    expect(loadedLibConfigs).toHaveLength(1);
    expect(scannerSpy).toHaveBeenCalled(); // Now we always scan to check for changes

    const libraryData = await libraryManager.getLibraryData(loadedLibConfigs[0].id);
    expect(libraryData).toBeDefined();
    expect(libraryData?.name).toBe('simple-library');
    // Data might be updated after scan, so we just check it exists

    scannerSpy.mockRestore();
  });
});
