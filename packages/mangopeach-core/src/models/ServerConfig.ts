import { Library } from './Library';

export interface ServerConfig {
  libraries: Library[];
  dataStoragePath: string;
}
