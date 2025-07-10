export type LibraryType = 'local' | 'smb' | 'ftp';

export interface Library {
  id: string;
  name: string;
  path: string;
  type: LibraryType;
  scanInterval?: string; // Crontab-like string, e.g., '0 * * * *' for every hour
}
