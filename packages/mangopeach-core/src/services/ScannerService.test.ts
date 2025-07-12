import { ScannerService } from './ScannerService';
import { MockFileSystemProvider } from '../providers/MockFileSystemProvider';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { ZipArchiveProvider } from '../providers/ZipArchiveProvider';
import { ILibraryStore } from './data-store/ILibraryStore';

jest.mock('../providers/ZipArchiveProvider');

describe('ScannerService', () => {
  let scanner: ScannerService;
  let mockFsProvider: MockFileSystemProvider;
  let mockArchiveProvider: jest.Mocked<ZipArchiveProvider>;
  let mockDataStore: jest.Mocked<ILibraryStore>;

  beforeEach(() => {
    mockFsProvider = new MockFileSystemProvider({});
    mockArchiveProvider = new (ZipArchiveProvider as jest.MockedClass<typeof ZipArchiveProvider>)() as jest.Mocked<ZipArchiveProvider>;
    mockDataStore = {
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
    scanner = new ScannerService(mockFsProvider, [mockArchiveProvider], mockDataStore);
  });

  it('should scan a new library and add all items to the data store', async () => {
    // Arrange
    mockFsProvider.setFixture({
      '/library': ['a', 'b.zip'],
      '/library/a': ['1.jpg'],
    });
    mockArchiveProvider.supports.mockReturnValue(true);
    mockArchiveProvider.getEntries.mockResolvedValue([{ name: '1.jpg', path: '1.jpg', isDirectory: false }]);
    mockDataStore.getGroups.mockResolvedValue([]);
    mockDataStore.getBundles.mockResolvedValue([]);

    // Act
    await scanner.scanLibrary('lib1', '/library');

    // Assert
    expect(mockDataStore.upsertGroup).toHaveBeenCalledTimes(1); // root only
    expect(mockDataStore.upsertBundle).toHaveBeenCalledTimes(2); // 'a' and 'b.zip'
    expect(mockDataStore.deleteGroup).not.toHaveBeenCalled();
    expect(mockDataStore.deleteBundle).not.toHaveBeenCalled();
  });

  it('should detect and delete items that are no longer present', async () => {
    // Arrange
    const existingGroup = new ImageBundleGroup('group1', 'a', '/library/a', 'lib1');
    const existingBundle = new ImageBundleSummary('bundle1', 'zip', 'b.zip', '/library/b.zip', 'lib1', 1, new Date());
    mockDataStore.getGroups.mockResolvedValue([existingGroup]);
    mockDataStore.getBundles.mockResolvedValue([existingBundle]);
    mockFsProvider.setFixture({
      '/library': [], // empty library
    });

    // Act
    const deleted = await scanner.scanLibrary('lib1', '/library');

    // Assert
    expect(mockDataStore.deleteGroup).toHaveBeenCalledWith('group1');
    expect(mockDataStore.deleteBundle).toHaveBeenCalledWith('bundle1');
    expect(deleted).toHaveLength(1);
    expect(deleted[0].id).toBe('bundle1');
  });
});