
import { Library } from '../../models/Library';
import { ImageBundleGroup } from '../../models/ImageBundleGroup';

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

  /**
   * Retrieves the entire scanned data tree for a given library.
   * @param libraryId The ID of the library whose data is to be loaded.
   * @returns The root ImageBundleGroup of the library, or null if not found.
   */
  getLibraryData(libraryId: string): Promise<ImageBundleGroup | null>;

  /**
   * Saves the entire scanned data tree for a given library,
   * replacing any previously existing data for that library.
   * @param libraryId The ID of the library to which the data belongs.
   * @param data The root ImageBundleGroup to save.
   */
  saveLibraryData(libraryId: string, data: ImageBundleGroup): Promise<void>;
}
