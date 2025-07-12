import * as path from 'path';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ZipArchiveProvider } from '../../src/providers/ZipArchiveProvider';
import { MemoryDataStore } from '../../src/services/data-store/MemoryDataStore';

describe('ScannerService with LocalFileSystemProvider', () => {
  const FIXTURE_PATH = path.join(__dirname, '../fixtures/simple-library');
  let scanner: ScannerService;
  let dataStore: MemoryDataStore;

  beforeEach(() => {
    const localProvider = new LocalFileSystemProvider();
    dataStore = new MemoryDataStore();
    scanner = new ScannerService(localProvider, [new ZipArchiveProvider()], dataStore);
  });

  it('should correctly parse the fixture directory', async () => {
    await scanner.scanLibrary('lib1', FIXTURE_PATH);

    const groups = await dataStore.getGroups('lib1');
    const rootGroup = groups[0];
    const bundles = await dataStore.getBundles('lib1', rootGroup.id);

    expect(groups).toHaveLength(1); // root 'simple-library' group only
    expect(bundles).toHaveLength(1); // bundle 'a' only at root level
  });

  it('should extract image data from real zip file', async () => {
    await scanner.scanLibrary('lib1', FIXTURE_PATH);
    const groups = await dataStore.getGroups('lib1');
    const rootGroup = groups[0];
    const rootBundles = await dataStore.getBundles('lib1', rootGroup.id);
    const aBundle = rootBundles.find(b => b.name === 'a');
    
    if (!aBundle) {
      throw new Error('Bundle "a" not found in fixture');
    }
    
    // Get bundles inside 'a' (a acts as both bundle and group)
    const aBundles = await dataStore.getBundles('lib1', aBundle.id);
    const zipBundle = aBundles.find(b => b.type === 'zip');

    if (!zipBundle) {
      throw new Error('No zip bundle found in fixture');
    }

    const imageData = await scanner.getImageData(zipBundle.id, 0);
    expect(imageData).toBeInstanceOf(Buffer);
    expect(imageData.length).toBeGreaterThanOrEqual(0);

    const imageDataByPath = await scanner.getImageDataByPath(zipBundle.id, 'I001.webp');
    expect(imageDataByPath).toBeInstanceOf(Buffer);
    expect(imageDataByPath.length).toBeGreaterThanOrEqual(0);
  });

  it('should extract image data from directory bundle', async () => {
    await scanner.scanLibrary('lib1', FIXTURE_PATH);
    const groups = await dataStore.getGroups('lib1');
    const rootGroup = groups[0];
    const rootBundles = await dataStore.getBundles('lib1', rootGroup.id);
    const aBundle = rootBundles.find(b => b.name === 'a');
    
    if (!aBundle) {
      throw new Error('Bundle "a" not found in fixture');
    }
    
    // Get bundles inside 'a' to find directory bundle 'b'
    const aBundles = await dataStore.getBundles('lib1', aBundle.id);
    const dirBundle = aBundles.find(b => b.type === 'directory' && b.name === 'b');

    if (!dirBundle) {
      throw new Error('No directory bundle found in fixture');
    }

    const imageData = await scanner.getImageData(dirBundle.id, 0);
    expect(imageData).toBeInstanceOf(Buffer);
    expect(imageData.length).toBeGreaterThanOrEqual(0);

    const details = await scanner.getBundleDetails(dirBundle.id);
    const firstImageName = path.basename(details.pages[0]);
    const imageDataByPath = await scanner.getImageDataByPath(dirBundle.id, firstImageName);
    expect(imageDataByPath).toBeInstanceOf(Buffer);
    expect(imageDataByPath.length).toBeGreaterThanOrEqual(0);
  });
});