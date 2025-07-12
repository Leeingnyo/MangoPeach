import { LibraryManager } from './LibraryManager';
import { ScannerService } from './ScannerService';
import { Library } from '../models/Library';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import * as cron from 'node-cron';
import { ILibraryStore } from './data-store/ILibraryStore';

// Mocking the dependencies
jest.mock('./ScannerService');
jest.mock('node-cron');

const MockedCron = cron as jest.Mocked<typeof cron>;
const MockedScannerService = ScannerService as jest.MockedClass<typeof ScannerService>;

// Create a mock for the data store
const mockDataStore: jest.Mocked<ILibraryStore> = {
  getAllLibraries: jest.fn(),
  getLibrary: jest.fn(),
  createLibrary: jest.fn(),
  updateLibrary: jest.fn(),
  deleteLibrary: jest.fn(),
  getLibraryData: jest.fn(),
  saveLibraryData: jest.fn(),
};

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

    // Setup mock instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockScannerService = new MockedScannerService({} as any, []) as jest.Mocked<ScannerService>;

    // Mock the constructor of ScannerService to return our mock instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ScannerService as any).mockImplementation(() => mockScannerService);

    libraryManager = new LibraryManager(mockDataStore);
  });

  describe('initialize', () => {
    it('should perform an initial scan if no data exists', async () => {
      // Arrange
      mockDataStore.getAllLibraries.mockResolvedValue([testLib]);
      mockDataStore.getLibraryData.mockResolvedValue(null); // No existing data
      const initialScanResult = new ImageBundleGroup(testLib.id, testLib.name, testLib.path, testLib.id);
      mockScannerService.parseLibrary.mockResolvedValue(initialScanResult);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(mockDataStore.getAllLibraries).toHaveBeenCalledTimes(1);
      expect(mockDataStore.getLibraryData).toHaveBeenCalledWith(testLib.id);
      expect(mockScannerService.parseLibrary).toHaveBeenCalledWith(testLib.path);
      expect(mockDataStore.saveLibraryData).toHaveBeenCalledWith(testLib.id, initialScanResult);
      const data = await libraryManager.getLibraryData(testLib.id);
      expect(data).toBe(initialScanResult);
    });

    it('should load existing data and scan for changes', async () => {
        // Arrange
        const existingData = new ImageBundleGroup(testLib.id, 'existing', testLib.path, testLib.id);
        const newScanData = new ImageBundleGroup(testLib.id, 'new-scan', testLib.path, testLib.id);

        mockDataStore.getAllLibraries.mockResolvedValue([testLib]);
        mockDataStore.getLibraryData.mockResolvedValue(existingData);
        mockScannerService.parseLibrary.mockResolvedValue(newScanData);

        // Act
        await libraryManager.initialize();

        // Assert
        expect(mockDataStore.getLibraryData).toHaveBeenCalledWith(testLib.id);
        expect(mockScannerService.parseLibrary).toHaveBeenCalledWith(testLib.path);
        // Since both have same bundle count (0), existing data should be kept
        expect(mockDataStore.saveLibraryData).not.toHaveBeenCalled();
        const data = await libraryManager.getLibraryData(testLib.id);
        expect(data).toBe(existingData);
      });
  });

  describe('rescanAndCompare', () => {
    let oldData: ImageBundleGroup;
    let bundle1: ImageBundleSummary, bundle2: ImageBundleSummary;

    beforeEach(async () => {
      // Create a fresh baseline state for each test in this block
      bundle1 = new ImageBundleSummary('id1', 'zip', 'b1', '/p/b1', testLib.id, 10, new Date(2023, 1, 1), 'file1');
      bundle2 = new ImageBundleSummary('id2', 'zip', 'b2', '/p/b2', testLib.id, 10, new Date(2023, 1, 1), 'file2');
      oldData = new ImageBundleGroup(testLib.id, 'old', testLib.path, testLib.id);
      oldData.bundles.push(bundle1, bundle2);

      mockDataStore.getAllLibraries.mockResolvedValue([testLib]);
      mockDataStore.getLibraryData.mockResolvedValue(oldData);

      // Mock the initial scan during initialize to return the same data (no changes)
      mockScannerService.parseLibrary.mockResolvedValue(oldData);

      await libraryManager.initialize();
    });

    it('should detect added files', async () => {
      const newBundle = new ImageBundleSummary('id3', 'zip', 'b3', '/p/b3', testLib.id, 10, new Date(), 'file3');
      const newData = new ImageBundleGroup(testLib.id, 'new', testLib.path, testLib.id);
      newData.bundles.push(bundle1, bundle2, newBundle);
      mockScannerService.parseLibrary.mockResolvedValue(newData);

      const result = await libraryManager.rescanAndCompare(testLib.id);

      expect(result.added).toHaveLength(1);
      expect(result.added[0]).toBe(newBundle);
      expect(result.deleted).toHaveLength(0);
    });

    it('should detect deleted files', async () => {
      const newData = new ImageBundleGroup(testLib.id, 'new', testLib.path, testLib.id);
      newData.bundles.push(bundle1); // bundle2 is now deleted
      mockScannerService.parseLibrary.mockResolvedValue(newData);

      const result = await libraryManager.rescanAndCompare(testLib.id);

      expect(result.deleted).toHaveLength(1);
      expect(result.deleted[0]).toBe(bundle2);
      expect(result.added).toHaveLength(0);
    });

    it('should detect updated files', async () => {
      const updatedBundle = new ImageBundleSummary(bundle1.id, bundle1.type, bundle1.name, bundle1.path, bundle1.libraryId, 11, new Date(2023, 1, 2), bundle1.fileId);
      const newData = new ImageBundleGroup(testLib.id, 'new', testLib.path, testLib.id);
      newData.bundles.push(updatedBundle, bundle2);
      mockScannerService.parseLibrary.mockResolvedValue(newData);

      const result = await libraryManager.rescanAndCompare(testLib.id);

      expect(result.updated).toHaveLength(1);
      expect(result.updated[0]).toBe(updatedBundle);
      expect(result.deleted).toHaveLength(0);
    });

    it('should detect moved files', async () => {
      const movedBundle = new ImageBundleSummary(bundle1.id, bundle1.type, 'new-name', '/p/new-path', bundle1.libraryId, bundle1.pageCount, bundle1.modifiedAt, bundle1.fileId);
      const newData = new ImageBundleGroup(testLib.id, 'new', testLib.path, testLib.id);
      newData.bundles.push(movedBundle, bundle2);
      mockScannerService.parseLibrary.mockResolvedValue(newData);

      const result = await libraryManager.rescanAndCompare(testLib.id);

      expect(result.moved).toHaveLength(1);
      expect(result.moved[0].from).toBe(bundle1);
      expect(result.moved[0].to).toBe(movedBundle);
      expect(result.added).toHaveLength(0);
    });
  });

  describe('scheduleScans', () => {
    beforeEach(() => {
      // Ensure cron validation returns true for valid expressions in these tests
      MockedCron.validate.mockReturnValue(true);
    });

    it('should schedule scans for enabled libraries with valid intervals', async () => {
      // Arrange
      const enabledLib: Library = { ...testLib, enabled: true, scanInterval: '* * * * *' };
      mockDataStore.getAllLibraries.mockResolvedValue([enabledLib]);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(cron.schedule).toHaveBeenCalledTimes(1);
      expect(cron.schedule).toHaveBeenCalledWith(enabledLib.scanInterval, expect.any(Function));
    });

    it('should not schedule scans for disabled libraries', async () => {
      // Arrange
      const disabledLib: Library = { ...testLib, enabled: false, scanInterval: '* * * * *' };
      mockDataStore.getAllLibraries.mockResolvedValue([disabledLib]);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should not schedule scans for libraries with invalid intervals', async () => {
      // Arrange
      const invalidIntervalLib: Library = { ...testLib, enabled: true, scanInterval: 'invalid-interval' };
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
      const lib1: Library = { ...testLib, id: 'lib1', enabled: true, scanInterval: '* * * * *' };
      const lib2: Library = { ...testLib, id: 'lib2', enabled: true, scanInterval: '* * * * *' };
      mockDataStore.getAllLibraries.mockResolvedValue([lib1, lib2]);
      await libraryManager.initialize();
      expect(cron.schedule).toHaveBeenCalledTimes(2);

      // Act
      libraryManager.shutdown();

      // Assert
      expect(mockJob.stop).toHaveBeenCalledTimes(2);
    });
  });
});
