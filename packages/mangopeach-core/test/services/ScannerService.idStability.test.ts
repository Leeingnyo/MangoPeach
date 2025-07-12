import * as path from 'path';
import { ScannerService } from '../../src/services/ScannerService';
import { LocalFileSystemProvider } from '../../src/providers/LocalFileSystemProvider';
import { ZipArchiveProvider } from '../../src/providers/ZipArchiveProvider';
import { ImageBundleGroup } from '../../src/models/ImageBundleGroup';
import { ImageBundleSummary } from '../../src/models/ImageBundleSummary';

describe('ScannerService ID Stability', () => {
  const FIXTURE_PATH = path.join(__dirname, '../fixtures/simple-library');

  it('should generate stable IDs across multiple scans', async () => {
    const localProvider = new LocalFileSystemProvider();
    const scanner = new ScannerService(localProvider, [new ZipArchiveProvider()]);

    // First scan
    const firstScan = await scanner.parseLibrary(FIXTURE_PATH);
    
    // Second scan 
    const secondScan = await scanner.parseLibrary(FIXTURE_PATH);

    // Root group should have same ID
    expect(firstScan.id).toBe(secondScan.id);
    expect(firstScan.name).toBe(secondScan.name);

    // All bundles should have stable IDs
    const firstBundles = flattenBundles(firstScan);
    const secondBundles = flattenBundles(secondScan);
    
    expect(firstBundles.length).toBe(secondBundles.length);
    
    // Create maps by path for comparison
    const firstBundlesByPath = new Map(firstBundles.map(b => [b.path, b]));
    const secondBundlesByPath = new Map(secondBundles.map(b => [b.path, b]));
    
    // Verify each bundle has the same ID across scans
    for (const [bundlePath, firstBundle] of firstBundlesByPath) {
      const secondBundle = secondBundlesByPath.get(bundlePath);
      expect(secondBundle).toBeDefined();
      expect(firstBundle.id).toBe(secondBundle!.id);
      expect(firstBundle.name).toBe(secondBundle!.name);
      expect(firstBundle.type).toBe(secondBundle!.type);
    }

    // All groups should have stable IDs  
    const firstGroups = flattenGroups(firstScan);
    const secondGroups = flattenGroups(secondScan);
    
    expect(firstGroups.length).toBe(secondGroups.length);
    
    const firstGroupsByPath = new Map(firstGroups.map(g => [g.path, g]));
    const secondGroupsByPath = new Map(secondGroups.map(g => [g.path, g]));
    
    for (const [groupPath, firstGroup] of firstGroupsByPath) {
      const secondGroup = secondGroupsByPath.get(groupPath);
      expect(secondGroup).toBeDefined();
      expect(firstGroup.id).toBe(secondGroup!.id);
      expect(firstGroup.name).toBe(secondGroup!.name);
    }
  });

  function flattenBundles(group: ImageBundleGroup): ImageBundleSummary[] {
    let bundles = [...group.bundles];
    for (const subGroup of group.subGroups) {
      bundles = bundles.concat(flattenBundles(subGroup));
    }
    return bundles;
  }

  function flattenGroups(group: ImageBundleGroup): ImageBundleGroup[] {
    let groups = [group];
    for (const subGroup of group.subGroups) {
      groups = groups.concat(flattenGroups(subGroup));
    }
    return groups;
  }
});