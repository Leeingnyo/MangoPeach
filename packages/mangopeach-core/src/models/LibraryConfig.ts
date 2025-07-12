export type LibraryType = 'local' | 'smb' | 'ftp';

/**
 * Library configuration stored in server config file
 * Contains only essential configuration needed to locate and connect to a library
 */
export interface LibraryConfig {
  name: string;
  path: string;
  type: LibraryType;
}