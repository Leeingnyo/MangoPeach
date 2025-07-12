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
      'page1.png',
      'page2.png',
      'page10.png',
    ]);
  });

  it('should extract image data from directory bundle by page index', async () => {
    const fixture = {
      '/library/a': ['1.jpg', '2.jpg', '10.jpg'],
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    // Mock readFile to return a Buffer
    jest.spyOn(mockProvider, 'readFile').mockResolvedValue(Buffer.from('fake-image-data'));

    const imageData = await scanner.getImageData('/library/a', 'directory', 0);

    expect(imageData).toBeInstanceOf(Buffer);
    expect(mockProvider.readFile).toHaveBeenCalledWith('/library/a/1.jpg');
  });

  it('should extract image data from archive bundle by page index', async () => {
    const fixture = {
      '/library/b.zip': [],
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const zipProvider = new ZipArchiveProvider();

    jest.spyOn(zipProvider, 'getEntries').mockResolvedValue([
      { name: 'page1.png', path: 'page1.png', isDirectory: false },
      { name: 'page2.png', path: 'page2.png', isDirectory: false },
      { name: 'page10.png', path: 'page10.png', isDirectory: false },
    ]);
    jest.spyOn(zipProvider, 'extractFile').mockResolvedValue(Buffer.from('fake-image-data'));

    const scanner = new ScannerService(mockProvider, [zipProvider]);

    const imageData = await scanner.getImageData('/library/b.zip', 'zip', 1);

    expect(imageData).toBeInstanceOf(Buffer);
    expect(zipProvider.extractFile).toHaveBeenCalledWith('/library/b.zip', 'page2.png');
  });

  it('should throw error for invalid page index', async () => {
    const fixture = {
      '/library/a': ['1.jpg', '2.jpg'],
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    await expect(scanner.getImageData('/library/a', 'directory', 5)).rejects.toThrow('Page index 5 out of range');
    await expect(scanner.getImageData('/library/a', 'directory', -1)).rejects.toThrow('Page index -1 out of range');
  });

  it('should extract image data from directory bundle by path', async () => {
    const fixture = {
      '/library/a': ['image1.png'],
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    // Mock readFile to return a Buffer
    jest.spyOn(mockProvider, 'readFile').mockResolvedValue(Buffer.from('fake-image-data'));

    const imageData = await scanner.getImageDataByPath('/library/a', 'directory', 'image1.png');

    expect(imageData).toBeInstanceOf(Buffer);
    expect(mockProvider.readFile).toHaveBeenCalledWith('/library/a/image1.png');
  });

  it('should extract image data from archive bundle by path', async () => {
    const fixture = {
      '/library/b.zip': [],
    };
    const mockProvider = new MockFileSystemProvider(fixture);
    const zipProvider = new ZipArchiveProvider();

    jest.spyOn(zipProvider, 'extractFile').mockResolvedValue(Buffer.from('fake-image-data'));

    const scanner = new ScannerService(mockProvider, [zipProvider]);

    const imageData = await scanner.getImageDataByPath('/library/b.zip', 'zip', 'page1.png');

    expect(imageData).toBeInstanceOf(Buffer);
    expect(zipProvider.extractFile).toHaveBeenCalledWith('/library/b.zip', 'page1.png');
  });

  it('should throw error for unsupported archive type', async () => {
    const fixture = {};
    const mockProvider = new MockFileSystemProvider(fixture);
    const scanner = new ScannerService(mockProvider, []);

    await expect(scanner.getImageData('/library/test.rar', 'rar', 0)).rejects.toThrow('No archive provider found for type: rar');
    await expect(scanner.getImageDataByPath('/library/test.rar', 'rar', 'page1.png')).rejects.toThrow('No archive provider found for type: rar');
  });
});
