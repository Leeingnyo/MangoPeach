import { LibraryConfig } from './LibraryConfig';

export interface ServerConfig {
  libraries: LibraryConfig[];
  dataStoragePath: string;
}
