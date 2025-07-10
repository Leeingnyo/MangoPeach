import * as path from 'path';
import { ScannerService } from './ScannerService';
import { MockFileSystemProvider } from '../providers/MockFileSystemProvider';
import { ImageBundleSummary } from '../models/ImageBundleSummary';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { ZipArchiveProvider } from '../providers/ZipArchiveProvider';
import { ImageBundleDetails } from '../models/ImageBundleDetails';
import * as fs from 'fs';
import { Readable } from 'stream';

jest.mock('fs');

describe('ScannerService with MockFileSystemProvider', () => {
  it('should correctly parse a simple directory that is an ImageBundle', async () => {
    const fixture = {
      '/library': ['a'],
      '/library/a': ['1.jpg', '2.jpg'],
    };

    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    const rootGroup = await scanner.parseLibrary('/library');

    expect(rootGroup).toBeInstanceOf(ImageBundleGroup);
    expect(rootGroup.subGroups).toHaveLength(0);
    expect(rootGroup.bundles).toHaveLength(1);

    const bundleA = rootGroup.bundles[0] as ImageBundleSummary;
    expect(bundleA.name).toBe('a');
  });

  it('should parse a directory with sub-groups and bundles', async () => {
    const fixture = {
      '/library': ['a', 'b.zip'],
      '/library/a': ['1.jpg', 'sub'],
      '/library/a/sub': ['2.jpg'],
    };

    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    // Mock the parseArchive function since it's not implemented yet
    jest.spyOn(scanner, 'parseArchive').mockImplementation(async (p) => {
      return new ImageBundleSummary(p, 'zip', path.basename(p), p, '/library', 10, new Date());
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
    const scanner = new ScannerService(mockProvider, []);

    const rootGroup = await scanner.parseLibrary('/library');

    expect(rootGroup.bundles).toHaveLength(0);
    expect(rootGroup.subGroups).toHaveLength(0); // Empty groups should not be included
  });

  it('should parse an archive file as a bundle', async () => {
    const fixture = {
      '/library': ['a.zip'],
    };
    const mockProvider = new MockFileSystemProvider(fixture);

    // We need a real ZipArchiveProvider to test the interaction.
    const zipProvider = new ZipArchiveProvider();

    // Since ZipArchiveProvider uses fs.createReadStream, we mock it to avoid real file access.
    const mockStream = new Readable();
    mockStream._read = () => {};
    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    // Mock the getEntries method to return a predefined list of files.
    jest.spyOn(zipProvider, 'getEntries').mockResolvedValue([
      { name: '1.jpg', path: '1.jpg', isDirectory: false },
      { name: '2.png', path: '2.png', isDirectory: false },
    ]);

    const scanner = new ScannerService(mockProvider, [zipProvider]);
    const rootGroup = await scanner.parseLibrary('/library');

    expect(rootGroup.subGroups).toHaveLength(0);
    expect(rootGroup.bundles).toHaveLength(1);
    const bundle = rootGroup.bundles[0];
    expect(bundle.name).toBe('a.zip');
    expect(bundle.pageCount).toBe(2);
    expect(bundle.type).toBe('zip');
  });

  it('should retrieve bundle details for a directory bundle', async () => {
    const fixture = {
      '/library/a': ['1.jpg', '10.jpg', '2.jpg', 'info.txt'],
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    const details = await scanner.getBundleDetails('/library/a', 'directory');

    expect(details).toBeInstanceOf(ImageBundleDetails);
    expect(details.id).toBe('/library/a');
    expect(details.pages).toEqual([
      '/library/a/1.jpg',
      '/library/a/2.jpg',
      '/library/a/10.jpg',
    ]);
  });

  it('should retrieve bundle details for an archive bundle', async () => {
    const fixture = {
      '/library/b.zip': [], // Content mocked by ZipArchiveProvider
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const zipProvider = new ZipArchiveProvider();

    jest.spyOn(zipProvider, 'getEntries').mockResolvedValue([
      { name: 'page1.png', path: 'page1.png', isDirectory: false },
      { name: 'page10.png', path: 'page10.png', isDirectory: false },
      { name: 'page2.png', path: 'page2.png', isDirectory: false },
      { name: 'info.txt', path: 'info.txt', isDirectory: false },
    ]);

    const scanner = new ScannerService(mockProvider, [zipProvider]);

    const details = await scanner.getBundleDetails('/library/b.zip', 'zip');

    expect(details).toBeInstanceOf(ImageBundleDetails);
    expect(details.id).toBe('/library/b.zip');
    expect(details.pages).toEqual([
      path.join('/library/b.zip', 'page1.png'),
      path.join('/library/b.zip', 'page2.png'),
      path.join('/library/b.zip', 'page10.png'),
    ]);
  });
});
