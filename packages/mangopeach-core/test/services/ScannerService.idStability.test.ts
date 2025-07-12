import * as path from 'path';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ZipArchiveProvider } from '../../src/providers/ZipArchiveProvider';
import { MemoryDataStore } from '../../src/services/data-store/MemoryDataStore';

describe('ScannerService ID Stability', () => {
  const FIXTURE_PATH = path.join(__dirname, '../fixtures/simple-library');

  it('should generate stable IDs across multiple scans', async () => {
    const localProvider = new LocalFileSystemProvider();
    const dataStore = new MemoryDataStore();
    const scanner = new ScannerService(localProvider, [new ZipArchiveProvider()], dataStore);

    // First scan
    await scanner.scanLibrary('lib1', FIXTURE_PATH);
    const firstScanGroups = await dataStore.getGroups('lib1');
    const firstScanBundles = await dataStore.getBundles('lib1');

    // Second scan
    await scanner.scanLibrary('lib1', FIXTURE_PATH);
    const secondScanGroups = await dataStore.getGroups('lib1');
    const secondScanBundles = await dataStore.getBundles('lib1');

    // Compare groups
    expect(firstScanGroups.length).toBe(secondScanGroups.length);
    const firstScanGroupIds = firstScanGroups.map(g => g.id).sort();
    const secondScanGroupIds = secondScanGroups.map(g => g.id).sort();
    expect(firstScanGroupIds).toEqual(secondScanGroupIds);

    // Compare bundles
    expect(firstScanBundles.length).toBe(secondScanBundles.length);
    const firstScanBundleIds = firstScanBundles.map(b => b.id).sort();
    const secondScanBundleIds = secondScanBundles.map(b => b.id).sort();
    expect(firstScanBundleIds).toEqual(secondScanBundleIds);
  });
});
