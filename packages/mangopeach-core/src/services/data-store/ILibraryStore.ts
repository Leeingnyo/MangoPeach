
import { Library } from '../../models/Library';
import { ImageBundleGroup } from '../../models/ImageBundleGroup';
import { ImageBundleSummary } from '../../models/ImageBundleSummary';

/**
 * Defines the contract for storing and retrieving library and scan data.
 */
export interface ILibraryStore {
  /**
   * Retrieves all library configurations.
   */
  getAllLibraries(): Promise<Library[]>;

  /**
   * Retrieves a single library configuration by its ID.
   * @param libraryId The ID of the library to retrieve.
   */
  getLibrary(libraryId: string): Promise<Library | null>;

  findLibraryByDirectoryId(directoryId: string): Promise<Library | null>;

  findLibraryByPath(path: string): Promise<Library | null>;

  /**
   * Creates a new library configuration.
   * @param libraryData The data for the new library.
   */
  createLibrary(libraryData: Omit<Library, 'id' | 'createdAt' | 'updatedAt'>): Promise<Library>;

  /**
   * Updates an existing library configuration.
   * @param libraryId The ID of the library to update.
   * @param libraryData The data to update.
   */
  updateLibrary(libraryId: string, libraryData: Partial<Omit<Library, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Library | null>;

  /**
   * Deletes a library configuration.
   * @param libraryId The ID of the library to delete.
   */
  deleteLibrary(libraryId: string): Promise<void>;

  getGroups(libraryId: string, parentId?: string): Promise<ImageBundleGroup[]>;

  getBundles(libraryId: string, parentId?: string): Promise<ImageBundleSummary[]>;

  upsertGroup(group: ImageBundleGroup): Promise<void>;

  upsertBundle(bundle: ImageBundleSummary): Promise<void>;

  deleteGroup(groupId: string): Promise<void>;

  deleteBundle(bundleId: string): Promise<void>;

  getGroup(groupId: string): Promise<ImageBundleGroup | null>;

  getBundle(bundleId: string): Promise<ImageBundleSummary | null>;
}
