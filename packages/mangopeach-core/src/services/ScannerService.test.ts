import * as path from 'path';
import { ScannerService } from './ScannerService';
import { MockFileSystemProvider } from '../providers/MockFileSystemProvider';
import { ImageBundle } from '../models/ImageBundle';
import { ImageBundleGroup } from '../models/ImageBundleGroup';

describe('ScannerService with MockFileSystemProvider', () => {
  it('should correctly parse a simple directory that is an ImageBundle', async () => {
    const fixture = {
      '/library': ['a'],
      '/library/a': ['1.jpg', '2.jpg'],
    };

    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider);

    const rootGroup = await scanner.parseLibrary('/library');

    expect(rootGroup).toBeInstanceOf(ImageBundleGroup);
    expect(rootGroup.subGroups).toHaveLength(0);
    expect(rootGroup.bundles).toHaveLength(1);

    const bundleA = rootGroup.bundles[0] as ImageBundle;
    expect(bundleA.name).toBe('a');
  });

  it('should parse a directory with sub-groups and bundles', async () => {
    const fixture = {
      '/library': ['a', 'b.zip'],
      '/library/a': ['1.jpg', 'sub'],
      '/library/a/sub': ['2.jpg'],
    };

    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider);

    // Mock the parseArchive function since it's not implemented yet
    jest.spyOn(scanner, 'parseArchive').mockImplementation(async (p) => {
      return new ImageBundle(p, 'zip', path.basename(p), p, '/library', 10, new Date());
    });

    const rootGroup = await scanner.parseLibrary('/library');

    expect(rootGroup.bundles).toHaveLength(2); // bundle 'a' and 'b.zip'
    expect(rootGroup.subGroups).toHaveLength(1); // group 'a'

    const groupA = rootGroup.subGroups.find(g => g.name === 'a');
    expect(groupA).toBeDefined();
    expect(groupA?.bundles).toHaveLength(1); // bundle 'sub'
    expect(groupA?.subGroups).toHaveLength(0);
  });

  it('should handle empty directories correctly by ignoring them', async () => {
    const fixture = {
      '/library': ['empty_dir'],
      '/library/empty_dir': [],
    };

    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider);

    const rootGroup = await scanner.parseLibrary('/library');

    expect(rootGroup.bundles).toHaveLength(0);
    expect(rootGroup.subGroups).toHaveLength(0); // Empty groups should not be included
  });

  it.todo('should handle archive files');
});
