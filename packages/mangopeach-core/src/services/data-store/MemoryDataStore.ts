
import { Library } from '../../models/Library';
import { ImageBundleGroup } from '../../models/ImageBundleGroup';
import { ILibraryStore } from './ILibraryStore';
import { randomUUID } from 'crypto';

/**
 * An in-memory implementation of the ILibraryStore for testing and development.
 */
export class MemoryDataStore implements ILibraryStore {
  private libraries = new Map<string, Library>();
  private scanData = new Map<string, ImageBundleGroup>();

  public async getAllLibraries(): Promise<Library[]> {
    return Array.from(this.libraries.values());
  }

  public async getLibrary(libraryId: string): Promise<Library | null> {
    return this.libraries.get(libraryId) || null;
  }

  public async createLibrary(libraryData: Omit<Library, 'id' | 'createdAt' | 'updatedAt'>): Promise<Library> {
    const newLibrary: Library = {
      ...libraryData,
      id: randomUUID(),
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
    this.scanData.delete(libraryId);
  }

  public async getLibraryData(libraryId: string): Promise<ImageBundleGroup | null> {
    return this.scanData.get(libraryId) || null;
  }

  public async saveLibraryData(libraryId: string, data: ImageBundleGroup): Promise<void> {
    this.scanData.set(libraryId, data);
  }
}
