import { LibraryManager } from './services/LibraryManager';
import { ServerConfigService } from './services/ServerConfigService';

// Define a default data path. This could be overridden by environment variables in a real app.
const dataPath = process.env.MANGOPEACH_DATA_PATH || './data';

console.log(`Using data path: ${dataPath}`);

// Create singleton instances of the services.
const configService = new ServerConfigService(dataPath);
const libraryManager = new LibraryManager(configService);

/**
 * Initializes the core services.
 * This must be called once when the application starts.
 */
export const initializeCore = async () => {
  console.log('Initializing MangoPeach Core...');
  await libraryManager.initialize();
  console.log('MangoPeach Core initialized successfully.');
};

// Export the singleton instances for use in other parts of the application.
export { libraryManager, configService };