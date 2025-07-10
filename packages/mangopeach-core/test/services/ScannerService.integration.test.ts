import * as path from 'path';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ImageBundleSummary } from '../../src/models/ImageBundleSummary';
import { ImageBundleGroup } from '../../src/models/ImageBundleGroup';
import { ZipArchiveProvider } from '../../src/providers/ZipArchiveProvider';

describe('ScannerService with LocalFileSystemProvider', () => {
  const FIXTURE_PATH = path.join(__dirname, '../fixtures/simple-library');

  it('should correctly parse the fixture directory', async () => {
    const localProvider = new LocalFileSystemProvider();
    const scanner = new ScannerService(localProvider, [new ZipArchiveProvider()]);

    const rootGroup = await scanner.parseLibrary(FIXTURE_PATH);

    expect(rootGroup).toBeInstanceOf(ImageBundleGroup);
    expect(rootGroup.name).toBe('simple-library');
    expect(rootGroup.libraryId).toBe(FIXTURE_PATH);

    // Check for bundle 'a'
    const bundleA = rootGroup.bundles.find(b => b.name === 'a');
    expect(bundleA).toBeInstanceOf(ImageBundleSummary);
    expect(bundleA?.pageCount).toBe(11);
    expect(bundleA?.libraryId).toBe(FIXTURE_PATH);

    // Check for group 'a'
    const groupA = rootGroup.subGroups.find(g => g.name === 'a');
    expect(groupA).toBeInstanceOf(ImageBundleGroup);
    expect(groupA?.libraryId).toBe(FIXTURE_PATH);
    expect(groupA?.subGroups).toHaveLength(0);
    expect(groupA?.bundles).toHaveLength(2);

    // Check for bundle 'b' inside group 'a'
    const bundleB = groupA?.bundles.find(b => b.name === 'b');
    expect(bundleB).toBeInstanceOf(ImageBundleSummary);
    expect(bundleB?.name).toBe('b');
    expect(bundleB?.pageCount).toBe(2);
    expect(bundleB?.libraryId).toBe(FIXTURE_PATH);

    // Check for bundle 'c.zip' inside group 'a'
    const bundleC = groupA?.bundles.find(b => b.name === 'c.zip');
    expect(bundleC).toBeInstanceOf(ImageBundleSummary);
    expect(bundleC?.type).toBe('zip');
    // This will fail until you create the actual zip file with 3 images.
    expect(bundleC?.pageCount).toBe(3);
    expect(bundleB?.libraryId).toBe(FIXTURE_PATH);
  });
});
