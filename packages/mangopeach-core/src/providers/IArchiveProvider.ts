export interface ArchiveEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface IArchiveProvider {
  /**
   * Checks if this provider supports the given file path (e.g., by extension).
   * @param filePath The path to the archive file.
   */
  supports(filePath: string): boolean;

  /**
   * Reads the list of entries from the archive without full extraction.
   * @param filePath The path to the archive file.
   */
  getEntries(filePath: string): Promise<ArchiveEntry[]>;

  /**
   * Extracts a specific file from the archive and returns its content as a buffer.
   * @param archivePath The path to the archive file.
   * @param entryPath The path of the file inside the archive.
   */
  extractFile(archivePath: string, entryPath: string): Promise<Buffer>;

  /**
   * Returns the specific type of the archive this provider handles.
   */
  getType(): 'zip' | 'rar' | '7z'; // Add more types as needed
}
