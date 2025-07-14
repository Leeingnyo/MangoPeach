import { cache } from 'react';
import { createLibraryManager, createConfigService, LibraryManager, ServerConfigService } from 'mangopeach-core';
import { MemoryDataStore } from 'mangopeach-core/src/services/data-store/MemoryDataStore';

// Define a type for our global singleton container
declare global {
  // eslint-disable-next-line no-var
  var __mangopeach_container: {
    configService: ServerConfigService;
    dataStore: MemoryDataStore;
    libraryManager: LibraryManager;
    initializationPromise?: Promise<void>;
  };
}

// This function ensures that the core instances are created only once.
function initializeSingleton() {
  if (globalThis.__mangopeach_container) {
    return;
  }
  console.log('Initializing singleton container for MangoPeach Core...');

  const configService = createConfigService();
  const dataStore = new MemoryDataStore();
  const libraryManager = createLibraryManager(dataStore, configService);

  const initializeCore = async () => {
    console.log('Initializing MangoPeach Core...');
    await libraryManager.initialize();
    console.log('MangoPeach Core initialized successfully.');
  };

  globalThis.__mangopeach_container = {
    configService,
    dataStore,
    libraryManager,
    initializationPromise: initializeCore(),
  };
}

// Run the singleton initialization when this module is first loaded.
initializeSingleton();

/**
 * A cached function to get the initialized LibraryManager instance.
 * Using React's `cache` ensures the initialization promise is awaited only once per request.
 */
export const getInitializedLibraryManager = cache(async () => {
  await globalThis.__mangopeach_container.initializationPromise;
  return globalThis.__mangopeach_container.libraryManager;
});

// You can also export the raw instances if needed elsewhere, 
// but prefer using the cached getter in components.
export const libraryManager = globalThis.__mangopeach_container.libraryManager;
export const configService = globalThis.__mangopeach_container.configService;
export const dataStore = globalThis.__mangopeach_container.dataStore;