import * as path from 'path';
import { LibraryManager } from '../../src/services/LibraryManager';
import { Library } from '../../src/models/Library';
import { MemoryDataStore } from '../../src/services/data-store/MemoryDataStore';
import { ILibraryStore } from '../../src/services/data-store/ILibraryStore';

describe('LibraryManager (Integration Test with MemoryDataStore)', () => {
  let libraryManager: LibraryManager;
  let dataStore: ILibraryStore;

  beforeEach(async () => {
    // Use MemoryDataStore for integration tests
    dataStore = new MemoryDataStore();
    libraryManager = new LibraryManager(dataStore);
  });

  it('should initialize with no libraries if data store is empty', async () => {
    await libraryManager.initialize();
    const configs = await libraryManager.getAllLibraryConfigs();
    expect(configs).toHaveLength(0);
  });

  it('should initialize and perform an initial scan for a new library', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    const libConfig: Omit<Library, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test Library 1',
      path: libraryPath,
      type: 'local',
      enabled: true,
      scanInterval: undefined,
    };
    
    // Pre-seed the data store with a library configuration
    const createdLib = await dataStore.createLibrary(libConfig);

    await libraryManager.initialize();

    const loadedLibConfigs = await libraryManager.getAllLibraryConfigs();
    expect(loadedLibConfigs).toHaveLength(1);
    expect(loadedLibConfigs[0].id).toBe(createdLib.id);

    const libraryData = await libraryManager.getLibraryData(createdLib.id);
    expect(libraryData).toBeDefined();
    expect(libraryData?.name).toBe('simple-library');
    expect(libraryData?.bundles).toHaveLength(1);
    expect(libraryData?.subGroups).toHaveLength(1);

    // Verify data is saved in the data store
    const savedData = await dataStore.getLibraryData(createdLib.id);
    expect(savedData).toBeDefined();
    expect(savedData?.name).toBe('simple-library');
  });

  it('should load existing scan data for a library from the data store', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    const libConfig: Omit<Library, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test Library 2',
      path: libraryPath,
      type: 'local',
      enabled: true,
      scanInterval: undefined,
    };
    const createdLib = await dataStore.createLibrary(libConfig);

    // Manually create and save initial scan data to the data store
    const { ScannerService } = await import('../../src/services/ScannerService');
    const { LocalFileSystemProvider } = await import('../../src/providers/LocalFileSystemProvider');
    const { ZipArchiveProvider } = await import('../../src/providers/ZipArchiveProvider');
    const initialScanner = new ScannerService(new LocalFileSystemProvider(), [new ZipArchiveProvider()]);
    const initialData = await initialScanner.parseLibrary(libraryPath);
    await dataStore.saveLibraryData(createdLib.id, initialData);

    // Spy on the scanner to ensure it's not called during initialization
    const scannerSpy = jest.spyOn(ScannerService.prototype, 'parseLibrary');

    // Initialize LibraryManager, which should load the existing data
    await libraryManager.initialize();

    const loadedLibConfigs = await libraryManager.getAllLibraryConfigs();
    expect(loadedLibConfigs).toHaveLength(1);
    expect(scannerSpy).not.toHaveBeenCalled(); // Crucial check

    const libraryData = await libraryManager.getLibraryData(createdLib.id);
    expect(libraryData).toBeDefined();
    expect(libraryData?.name).toBe('simple-library');
    expect(libraryData).toEqual(initialData);

    scannerSpy.mockRestore();
  });
});
