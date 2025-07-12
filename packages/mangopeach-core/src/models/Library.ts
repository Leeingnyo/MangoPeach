import { LibraryType } from './LibraryConfig';

/**
 * Library entity stored in database
 * Contains runtime metadata and configuration for library management
 */
export interface Library {
  id: string;
  name: string;
  path: string;
  type: LibraryType;
  enabled: boolean;
  scanInterval: string; // Crontab-like string, e.g., '0 * * * *' for every hour
  directoryId?: string; // inode or directory unique identifier for physical matching
  createdAt: Date;
  updatedAt: Date;
}
