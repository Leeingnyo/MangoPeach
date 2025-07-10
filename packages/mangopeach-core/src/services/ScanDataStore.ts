/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageBundleGroup } from '../models/ImageBundleGroup';
import { ImageBundleSummary } from '../models/ImageBundleSummary';

export class ScanDataStore {
  private dataFilePath: string;

  constructor(baseDataPath: string, libraryId: string, fileName: string = 'scan-data.json') {
    this.dataFilePath = path.join(baseDataPath, libraryId, fileName);
  }

  /**
   * Loads scan data from the JSON file.
   * @returns The loaded ImageBundleGroup or null if file does not exist or is invalid.
   */
  public async load(): Promise<ImageBundleGroup | null> {
    try {
      const data = await fs.readFile(this.dataFilePath, 'utf8');
      const parsedData = JSON.parse(data);
      // Reconstruct ImageBundleGroup and ImageBundleSummary instances from plain objects
      return this.reconstructImageBundleGroup(parsedData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`Scan data file not found at ${this.dataFilePath}.`);
      } else {
        console.error(`Error loading scan data from ${this.dataFilePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Saves scan data to the JSON file.
   * @param data The ImageBundleGroup to save.
   */
  public async save(data: ImageBundleGroup): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.dataFilePath), { recursive: true });
      await fs.writeFile(this.dataFilePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Scan data saved to ${this.dataFilePath}`);
    } catch (error) {
      console.error(`Error saving scan data to ${this.dataFilePath}:`, error);
    }
  }

  /**
   * Helper to reconstruct class instances from plain JSON objects.
   * This is necessary because JSON.parse returns plain objects, not class instances.
   */
  private reconstructImageBundleGroup(plainObject: unknown): ImageBundleGroup {
    const obj = plainObject as any; // Type assertion for easier access
    const group = new ImageBundleGroup(
      obj.id,
      obj.name,
      obj.path,
      obj.libraryId
    );
    group.bundles = obj.bundles.map((b: any) => new ImageBundleSummary(
      b.id, b.type, b.name, b.path, b.libraryId, b.pageCount, new Date(b.modifiedAt)
    ));
    group.subGroups = obj.subGroups.map((sg: any) => this.reconstructImageBundleGroup(sg));
    return group;
  }
}
