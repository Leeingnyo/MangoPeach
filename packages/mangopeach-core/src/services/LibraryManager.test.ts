/* eslint-disable @typescript-eslint/no-explicit-any */
import { LibraryManager } from './LibraryManager';
import { ServerConfigService } from './ServerConfigService';
import { ScannerService } from './ScannerService';
import { ScanDataStore } from './ScanDataStore';
import { Library } from '../models/Library';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { ServerConfig } from '../models/ServerConfig';
import { ImageBundleSummary } from '../models/ImageBundleSummary';

// Mocking the dependencies
jest.mock('./ServerConfigService');
jest.mock('./ScannerService');
jest.mock('./ScanDataStore');

const MockedServerConfigService = ServerConfigService as jest.MockedClass<typeof ServerConfigService>;
const MockedScannerService = ScannerService as jest.MockedClass<typeof ScannerService>;
const MockedScanDataStore = ScanDataStore as jest.MockedClass<typeof ScanDataStore>;

describe('LibraryManager', () => {
  let libraryManager: LibraryManager;
  let mockConfigService: jest.Mocked<ServerConfigService>;
  let mockScannerService: jest.Mocked<ScannerService>;
  let mockScanDataStore: jest.Mocked<ScanDataStore>;

  const testLib: Library = {
    id: 'test-lib-1',
    name: 'Test Library',
    path: '/test/library',
    type: 'local',
    scanInterval: '0 * * * *',
  };

  const serverConfig: ServerConfig = {
    libraries: [testLib],
    dataStoragePath: '/test/data',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock instances
    mockConfigService = new MockedServerConfigService('') as jest.Mocked<ServerConfigService>;
    mockScannerService = new MockedScannerService({} as any, []) as jest.Mocked<ScannerService>;
    mockScanDataStore = new MockedScanDataStore('', '') as jest.Mocked<ScanDataStore>;

    // Mock the constructor of ScannerService and ScanDataStore to return our mock instances
    (ScannerService as any).mockImplementation(() => mockScannerService);
    (ScanDataStore as any).mockImplementation(() => mockScanDataStore);

    libraryManager = new LibraryManager(mockConfigService);
  });

  describe('initialize', () => {
    it('should perform an initial scan if no data exists', async () => {
      // Arrange
      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockScanDataStore.load.mockResolvedValue(null); // No existing data
      const initialScanResult = new ImageBundleGroup(testLib.id, testLib.name, testLib.path, testLib.id);
      mockScannerService.parseLibrary.mockResolvedValue(initialScanResult);

      // Act
      await libraryManager.initialize();

      // Assert
      expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(1);
      expect(mockScanDataStore.load).toHaveBeenCalledTimes(1);
      expect(mockScannerService.parseLibrary).toHaveBeenCalledWith(testLib.path);
      expect(mockScanDataStore.save).toHaveBeenCalledWith(initialScanResult);
      expect(libraryManager.getLibraryData(testLib.id)).toBe(initialScanResult);
    });

    it('should load existing data if found', async () => {
        // Arrange
        const existingData = new ImageBundleGroup(testLib.id, 'existing', testLib.path, testLib.id);
        mockConfigService.loadConfig.mockResolvedValue(serverConfig);
        mockScanDataStore.load.mockResolvedValue(existingData);
  
        // Act
        await libraryManager.initialize();
  
        // Assert
        expect(mockScanDataStore.load).toHaveBeenCalledTimes(1);
        expect(mockScannerService.parseLibrary).not.toHaveBeenCalled();
        expect(mockScanDataStore.save).not.toHaveBeenCalled();
        expect(libraryManager.getLibraryData(testLib.id)).toBe(existingData);
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

      mockConfigService.loadConfig.mockResolvedValue(serverConfig);
      mockScanDataStore.load.mockResolvedValue(oldData);
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
});