
import { Library } from '../../models/Library';
import { ImageBundleGroup } from '../../models/ImageBundleGroup';
import { ILibraryStore } from './ILibraryStore';
import * as crypto from 'crypto';
import { ImageBundleSummary } from '../../models/ImageBundleSummary';

/**
 * An in-memory implementation of the ILibraryStore for testing and development.
 */
export class MemoryDataStore implements ILibraryStore {
  private libraries = new Map<string, Library>();
  private groups = new Map<string, ImageBundleGroup>();
  private bundles = new Map<string, ImageBundleSummary>();

  private generateLibraryId(directoryId?: string, fallbackPath?: string): string {
    const input = directoryId || fallbackPath || 'unknown';
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 12);
  }

  public async getAllLibraries(): Promise<Library[]> {
    return Array.from(this.libraries.values());
  }

  public async getLibrary(libraryId: string): Promise<Library | null> {
    return this.libraries.get(libraryId) || null;
  }

  public async findLibraryByDirectoryId(directoryId: string): Promise<Library | null> {
    let found: Library | null = null;
    this.libraries.forEach(library => {
      if (library.directoryId === directoryId) {
        found = library;
      }
    });
    return found;
  }

  public async findLibraryByPath(path: string): Promise<Library | null> {
    let found: Library | null = null;
    this.libraries.forEach(library => {
      if (library.path === path) {
        found = library;
      }
    });
    return found;
  }

  public async createLibrary(libraryData: Omit<Library, 'id' | 'createdAt' | 'updatedAt'>): Promise<Library> {
    const libraryId = this.generateLibraryId(libraryData.directoryId, libraryData.path);
    const newLibrary: Library = {
      ...libraryData,
      id: libraryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.libraries.set(newLibrary.id, newLibrary);
    return newLibrary;
  }

  public async updateLibrary(libraryId: string, libraryData: Partial<Omit<Library, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Library | null> {
    const existingLibrary = this.libraries.get(libraryId);
    if (!existingLibrary) {
      return null;
    }
    const updatedLibrary = {
      ...existingLibrary,
      ...libraryData,
      updatedAt: new Date(),
    };
    this.libraries.set(libraryId, updatedLibrary);
    return updatedLibrary;
  }

  public async deleteLibrary(libraryId: string): Promise<void> {
    this.libraries.delete(libraryId);
    // Also remove associated groups and bundles
    this.groups.forEach(group => {
      if (group.libraryId === libraryId) {
        this.groups.delete(group.id);
      }
    });
    this.bundles.forEach(bundle => {
      if (bundle.libraryId === libraryId) {
        this.bundles.delete(bundle.id);
      }
    });
  }

  public async getGroups(libraryId: string, parentId?: string): Promise<ImageBundleGroup[]> {
    return Array.from(this.groups.values()).filter(g => g.libraryId === libraryId && g.parentId === parentId);
  }

  public async getBundles(libraryId: string, parentId?: string): Promise<ImageBundleSummary[]> {
    return Array.from(this.bundles.values()).filter(b => b.libraryId === libraryId && b.parentId === parentId);
  }

  public async upsertGroup(group: ImageBundleGroup): Promise<void> {
    this.groups.set(group.id, group);
  }

  public async upsertBundle(bundle: ImageBundleSummary): Promise<void> {
    this.bundles.set(bundle.id, bundle);
  }

  public async deleteGroup(groupId: string): Promise<void> {
    this.groups.delete(groupId);
  }

  public async deleteBundle(bundleId: string): Promise<void> {
    this.bundles.delete(bundleId);
  }

  public async getGroup(groupId: string): Promise<ImageBundleGroup | null> {
    return this.groups.get(groupId) || null;
  }

  public async getBundle(bundleId: string): Promise<ImageBundleSummary | null> {
    return this.bundles.get(bundleId) || null;
  }
}
