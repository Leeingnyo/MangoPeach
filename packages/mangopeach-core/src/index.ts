import { LibraryManager } from './services/LibraryManager';
import { ServerConfigService } from './services/ServerConfigService';

/**
 * Creates an instance of ServerConfigService.
 * @param dataPath The path to the data directory. If not provided, it will be read from the environment variable or a default will be used.
 * @returns A new instance of ServerConfigService.
 */
export function createConfigService(dataPath?: string): ServerConfigService {
  const path = dataPath || process.env.MANGOPEACH_DATA_PATH || './data';
  return new ServerConfigService(path);
}

/**
 * Creates an instance of LibraryManager.
 * @param configService An instance of ServerConfigService.
 * @returns A new instance of LibraryManager.
 */
export function createLibraryManager(configService: ServerConfigService): LibraryManager {
  return new LibraryManager(configService);
}

// Also export the types for convenience
export type { LibraryManager } from './services/LibraryManager';
export type { ServerConfigService } from './services/ServerConfigService';