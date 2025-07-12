import { LibraryManager } from './LibraryManager';
import { ScannerService } from './ScannerService';
import { ServerConfigService } from './ServerConfigService';
import { Library } from '../models/Library';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import { ServerConfig } from '../models/ServerConfig';
import * as cron from 'node-cron';
import { ILibraryStore } from './data-store/ILibraryStore';

// Mocking the dependencies
jest.mock('./ScannerService');
jest.mock('./ServerConfigService');
jest.mock('node-cron');

const MockedCron = cron as jest.Mocked<typeof cron>;
const MockedScannerService = ScannerService as jest.MockedClass<typeof ScannerService>;

// Create a mock for the data store
const mockDataStore: jest.Mocked<ILibraryStore> = {
  getAllLibraries: jest.fn(),
  getLibrary: jest.fn(),
  findLibraryByDirectoryId: jest.fn(),
  findLibraryByPath: jest.fn(),
  createLibrary: jest.fn(),
  updateLibrary: jest.fn(),
  deleteLibrary: jest.fn(),
  getGroups: jest.fn(),
  getBundles: jest.fn(),
  upsertGroup: jest.fn(),
  upsertBundle: jest.fn(),
  deleteGroup: jest.fn(),
  deleteBundle: jest.fn(),
  getGroup: jest.fn(),
  getBundle: jest.fn(),
};

// Create a mock for the config service
const mockConfigService = {
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
} as unknown as jest.Mocked<ServerConfigService>;

describe('LibraryManager', () => {
  let libraryManager: LibraryManager;
  let mockScannerService: jest.Mocked<ScannerService>;

  const testLib: Library = {
    id: 'test-lib-1',
    name: 'Test Library',
    path: '/test/library',
    type: 'local',
    enabled: true,
    scanInterval: '0 * * * *',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock return values
    mockDataStore.getAllLibraries.mockResolvedValue([]);
    mockDataStore.getGroups.mockResolvedValue([]);
    mockDataStore.getBundles.mockResolvedValue([]);
    mockConfigService.loadConfig.mockResolvedValue(null);

    // Setup default mock job for cron.schedule
    const mockJob = { stop: jest.fn() };
    MockedCron.schedule.mockReturnValue(mockJob as unknown as cron.ScheduledTask);

    // Setup mock instances
    mockScannerService = new MockedScannerService({} as IFileSystemProvider, [], {} as ILibraryStore) as jest.Mocked<ScannerService>;

    // Mock the constructor of ScannerService to return our mock instance
    (ScannerService as jest.Mock).mockImplementation(() => mockScannerService);

    libraryManager = new LibraryManager(mockDataStore, mockConfigService);
  });

  afterEach(() => {
    // Clean up any scheduled jobs to prevent Jest from hanging
    if (libraryManager) {
      libraryManager.shutdown();
    }
  });

  describe('initialize', () => {
    it('should perform an initial scan if no data exists', async () => {
      // Arrange
      const serverConfig: ServerConfig = {
        libraries: [{
          name: testLib.name,
          path: testLib.path,
          type: testLib.type
        }],
        dataStoragePath: './data'
      };
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockDataStore.getAllLibraries.mockResolvedValue([]); // No existing libraries
      mockDataStore.createLibrary.mockResolvedValue(testLib); // Returns created library
      mockDataStore.getGroups.mockResolvedValue([]); // No existing data
      mockScannerService.scanLibrary.mockResolvedValue([]);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(1);
      expect(mockDataStore.createLibrary).toHaveBeenCalledWith({
        name: testLib.name,
        path: testLib.path,
        type: testLib.type,
        enabled: true,
        scanInterval: '0 * * * *',
        directoryId: undefined
      });
      expect(mockDataStore.getGroups).toHaveBeenCalledWith(testLib.id, undefined);
      expect(mockScannerService.scanLibrary).toHaveBeenCalledWith(testLib.id, testLib.path);
    });

    it('should load existing data and not scan for changes if data exists', async () => {
        // Arrange
        const existingGroup = new ImageBundleGroup(testLib.id, 'existing', testLib.path, testLib.id);

        const serverConfig: ServerConfig = {
          libraries: [{
            name: testLib.name,
            path: testLib.path,
            type: testLib.type
          }],
          dataStoragePath: './data'
        };
        
        mockConfigService.loadConfig.mockResolvedValue(serverConfig);
        mockDataStore.getAllLibraries.mockResolvedValue([testLib]); // Library exists
        mockDataStore.getGroups.mockResolvedValue([existingGroup]);

        // Act
        await libraryManager.initialize();

        // Assert
        expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(1);
        expect(mockDataStore.getGroups).toHaveBeenCalledWith(testLib.id, undefined);
        expect(mockScannerService.scanLibrary).not.toHaveBeenCalled();
      });
  });

  describe('getAllLibraries', () => {
    it('should return libraries from data store', async () => {
      // Arrange
      mockDataStore.getAllLibraries.mockResolvedValue([testLib]);

      // Act
      const result = await libraryManager.getAllLibraries();

      // Assert
      expect(mockDataStore.getAllLibraries).toHaveBeenCalledTimes(1);
      expect(result).toEqual([testLib]);
    });

    it('should return empty array if no libraries in data store', async () => {
      // Arrange
      mockDataStore.getAllLibraries.mockResolvedValue([]);

      // Act
      const result = await libraryManager.getAllLibraries();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('rescanLibrary', () => {
    beforeEach(async () => {
      const serverConfig: ServerConfig = {
        libraries: [{
          name: testLib.name,
          path: testLib.path,
          type: testLib.type
        }],
        dataStoragePath: './data'
      };
      
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockDataStore.getAllLibraries.mockResolvedValue([testLib]);
      await libraryManager.initialize();
    });

    it('should call the scanner and update recently deleted', async () => {
      const deletedBundles = [new ImageBundleSummary('id1', 'zip', 'b1', '/p/b1', testLib.id, 10, new Date(), 'file1')];
      mockScannerService.scanLibrary.mockResolvedValue(deletedBundles);

      await libraryManager.rescanLibrary(testLib.id);

      expect(mockScannerService.scanLibrary).toHaveBeenCalledWith(testLib.id, testLib.path);
      expect(libraryManager.getRecentlyDeleted(testLib.id)).toEqual(deletedBundles);
    });
  });

  describe('scheduleScans', () => {
    beforeEach(() => {
      // Ensure cron validation returns true for valid expressions in these tests
      MockedCron.validate.mockReturnValue(true);
    });

    it('should schedule scans for enabled libraries with valid intervals', async () => {
      // Arrange
      const enabledLib: Library = { ...testLib, enabled: true, scanInterval: '0 * * * *' };
      const serverConfig: ServerConfig = {
        libraries: [{
          name: enabledLib.name,
          path: enabledLib.path,
          type: enabledLib.type
        }],
        dataStoragePath: './data'
      };
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockDataStore.getAllLibraries.mockResolvedValue([enabledLib]);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(cron.schedule).toHaveBeenCalledTimes(1);
      expect(cron.schedule).toHaveBeenCalledWith(enabledLib.scanInterval, expect.any(Function));
    });

    it('should not schedule scans for disabled libraries', async () => {
      // Arrange
      const libConfig = { name: 'Test Library', path: '/test', type: 'local' as const };
      const serverConfig: ServerConfig = {
        libraries: [libConfig],
        dataStoragePath: './data'
      };
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      
      // Return no existing libraries, then return a disabled library after creation
      mockDataStore.getAllLibraries.mockResolvedValue([]);
      const createdLib: Library = { ...testLib, enabled: false, scanInterval: '0 * * * *' };
      mockDataStore.createLibrary.mockResolvedValue(createdLib);
      mockDataStore.updateLibrary.mockResolvedValue(createdLib);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should not schedule scans for libraries with invalid intervals', async () => {
      // Arrange
      const invalidIntervalLib: Library = { ...testLib, enabled: true, scanInterval: 'invalid-interval' };
      const serverConfig: ServerConfig = {
        libraries: [{
          name: invalidIntervalLib.name,
          path: invalidIntervalLib.path,
          type: invalidIntervalLib.type
        }],
        dataStoragePath: './data'
      };
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockDataStore.getAllLibraries.mockResolvedValue([invalidIntervalLib]);
      MockedCron.validate.mockReturnValue(false); // Mock invalid cron expression

      // Act
      await libraryManager.initialize();

      // Assert
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('shutdown should stop all scheduled jobs', async () => {
      // Arrange
      const mockJob = { stop: jest.fn() } as unknown as jest.Mocked<cron.ScheduledTask>;
      (cron.schedule as jest.Mock).mockReturnValue(mockJob);
      const lib1: Library = { ...testLib, id: 'lib1', name: 'Library 1', path: '/path1', enabled: true, scanInterval: '0 * * * *' };
      const lib2: Library = { ...testLib, id: 'lib2', name: 'Library 2', path: '/path2', enabled: true, scanInterval: '0 * * * *' };
      const serverConfig: ServerConfig = {
        libraries: [
          { name: lib1.name, path: lib1.path, type: lib1.type },
          { name: lib2.name, path: lib2.path, type: lib2.type }
        ],
        dataStoragePath: './data'
      };
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockDataStore.getAllLibraries.mockResolvedValue([]);
      mockDataStore.findLibraryByPath.mockResolvedValue(null);
      mockDataStore.findLibraryByDirectoryId.mockResolvedValue(null);
      mockDataStore.createLibrary.mockResolvedValueOnce(lib1).mockResolvedValueOnce(lib2);
      await libraryManager.initialize();
      expect(cron.schedule).toHaveBeenCalledTimes(2);

      // Act
      libraryManager.shutdown();

      // Assert
      expect(mockJob.stop).toHaveBeenCalledTimes(2);
    });
  });
});
