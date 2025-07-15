import { Injectable } from '@nestjs/common';
import { createLibraryManager, createConfigService } from 'mangopeach-core';
import { MemoryDataStore } from 'mangopeach-core/dist/src/services/data-store/MemoryDataStore';
import type { LibraryManager } from 'mangopeach-core';

@Injectable()
export class LibrariesService {
  private libraryManager!: LibraryManager;

  async getInitializedLibraryManager(): Promise<LibraryManager> {
    if (!this.libraryManager) {
      const dataStore = new MemoryDataStore();
      const configService = createConfigService();
      this.libraryManager = createLibraryManager(dataStore, configService);
      await this.libraryManager.initialize();
    }
    return this.libraryManager;
  }

  async getAllLibraries() {
    const manager = await this.getInitializedLibraryManager();
    return await manager.getAllLibraries();
  }

  async getLibraryData(libraryId: string) {
    const manager = await this.getInitializedLibraryManager();
    return await manager.getLibraryData(libraryId);
  }

  async rescanLibrary(libraryId: string) {
    const manager = await this.getInitializedLibraryManager();
    return await manager.rescanLibrary(libraryId);
  }

  async getBundle(bundleId: string) {
    const manager = await this.getInitializedLibraryManager();
    return await manager.dataStore.getBundle(bundleId);
  }

  async getScannerService(libraryId: string) {
    const manager = await this.getInitializedLibraryManager();
    return manager.getScannerService(libraryId);
  }
}
