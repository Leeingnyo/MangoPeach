import * as path from 'path';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ImageBundle } from '../../src/models/ImageBundle';
import { ImageBundleGroup } from '../../src/models/ImageBundleGroup';

describe('ScannerService with LocalFileSystemProvider', () => {
  const FIXTURE_PATH = path.join(__dirname, '../fixtures/simple-library');

  it('should correctly parse the fixture directory', async () => {
    const localProvider = new LocalFileSystemProvider();
    const scanner = new ScannerService(localProvider);

    const rootGroup = await scanner.parseLibrary(FIXTURE_PATH);

    expect(rootGroup).toBeInstanceOf(ImageBundleGroup);
    expect(rootGroup.name).toBe('simple-library');
    expect(rootGroup.libraryId).toBe(FIXTURE_PATH);

    // Check for bundle 'a'
    const bundleA = rootGroup.bundles.find(b => b.name === 'a');
    expect(bundleA).toBeInstanceOf(ImageBundle);
    expect(bundleA?.pageCount).toBe(2);
    expect(bundleA?.libraryId).toBe(FIXTURE_PATH);

    // Check for group 'a'
    const groupA = rootGroup.subGroups.find(g => g.name === 'a');
    expect(groupA).toBeInstanceOf(ImageBundleGroup);
    expect(groupA?.libraryId).toBe(FIXTURE_PATH);
    expect(groupA?.subGroups).toHaveLength(0);
    expect(groupA?.bundles).toHaveLength(1);

    // Check for bundle 'b' inside group 'a'
    const bundleB = groupA?.bundles[0];
    expect(bundleB?.name).toBe('b');
    expect(bundleB?.pageCount).toBe(2);
    expect(bundleB?.libraryId).toBe(FIXTURE_PATH);
  });
});
