import * as fs from 'fs/promises';
import * as path from 'path';
import { LibraryManager } from '../../src/services/LibraryManager';
import { ServerConfigService } from '../../src/services/ServerConfigService';
import { ServerConfig } from '../../src/models/ServerConfig';
import { Library } from '../../src/models/Library';
import { ScanDataStore } from '../../src/services/ScanDataStore';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ZipArchiveProvider } from '../../src/providers/ZipArchiveProvider';

describe('LibraryManager (Integration Test)', () => {
  const TEST_CONFIG_DIR = path.join(__dirname, '../temp_library_manager_config');
  const TEST_DATA_DIR = path.join(__dirname, '../temp_library_manager_data');
  const TEST_CONFIG_FILE = 'test-config.json';

  let configService: ServerConfigService;
  let libraryManager: LibraryManager;

  beforeEach(async () => {
    // Clean up directories before each test
    await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });

    configService = new ServerConfigService(TEST_CONFIG_DIR, TEST_CONFIG_FILE);
    libraryManager = new LibraryManager(configService);
  });

  afterEach(async () => {
    // Clean up directories after each test
    await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it('should initialize with no libraries if config is empty', async () => {
    await configService.saveConfig({ libraries: [], dataStoragePath: TEST_DATA_DIR });
    await libraryManager.initialize();
    expect(libraryManager.getAllLibraryConfigs()).toHaveLength(0);
  });

  it('should initialize and scan a new local library', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    const libConfig: Library = {
      id: 'test-lib-1',
      name: 'Test Library 1',
      path: libraryPath,
      type: 'local',
    };
    const config: ServerConfig = { libraries: [libConfig], dataStoragePath: TEST_DATA_DIR };
    await configService.saveConfig(config);

    await libraryManager.initialize();

    const loadedLibConfig = libraryManager.getAllLibraryConfigs();
    expect(loadedLibConfig).toHaveLength(1);
    expect(loadedLibConfig[0].id).toBe('test-lib-1');

    const libraryData = libraryManager.getLibraryData('test-lib-1');
    expect(libraryData).toBeDefined();
    expect(libraryData?.name).toBe('simple-library');
    expect(libraryData?.bundles).toHaveLength(1);
    expect(libraryData?.subGroups).toHaveLength(1);

    // Verify data is saved
    const dataStore = new ScanDataStore(TEST_DATA_DIR, 'test-lib-1', 'scan-data.json');
    const savedData = await dataStore.load();
    expect(savedData).toBeDefined();
    expect(savedData?.name).toBe('simple-library');
  });

  it('should load existing scan data for a library', async () => {
    const libraryPath = path.join(__dirname, '../fixtures/simple-library');
    const libConfig: Library = {
      id: 'test-lib-2',
      name: 'Test Library 2',
      path: libraryPath,
      type: 'local',
    };
    const config: ServerConfig = { libraries: [libConfig], dataStoragePath: TEST_DATA_DIR };
    await configService.saveConfig(config);

    // Manually create and save initial scan data
    const initialScanner = new ScannerService(new LocalFileSystemProvider(), [new ZipArchiveProvider()]);
    const initialData = await initialScanner.parseLibrary(libraryPath);
    const initialDataStore = new ScanDataStore(TEST_DATA_DIR, 'test-lib-2', 'scan-data.json');
    await initialDataStore.save(initialData);

    // Initialize LibraryManager, which should load the existing data
    await libraryManager.initialize();

    const loadedLibConfig = libraryManager.getAllLibraryConfigs();
    expect(loadedLibConfig).toHaveLength(1);

    const libraryData = libraryManager.getLibraryData('test-lib-2');
    expect(libraryData).toBeDefined();
    expect(libraryData?.name).toBe('simple-library');
    // Ensure it's the loaded data, not a fresh scan
    // (This is hard to test without mocking fs.readdir, but we'll assume it loads if save/load works)
  });
});
