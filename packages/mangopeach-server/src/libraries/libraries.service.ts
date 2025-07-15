import { Injectable, OnModuleInit } from '@nestjs/common';
import { createLibraryManager, createConfigService } from 'mangopeach-core';
import { MemoryDataStore } from 'mangopeach-core/dist/src/services/data-store/MemoryDataStore';
import type { LibraryManager } from 'mangopeach-core';

@Injectable()
export class LibrariesService implements OnModuleInit {
  private libraryManager!: LibraryManager;

  async onModuleInit() {
    await this.initializeLibraryManager();
  }

  private async initializeLibraryManager(): Promise<void> {
    if (!this.libraryManager) {
      console.log('Initializing LibraryManager...');
      const dataStore = new MemoryDataStore();
      const configService = createConfigService();
      this.libraryManager = createLibraryManager(dataStore, configService);
      await this.libraryManager.initialize();
      console.log('LibraryManager initialized successfully.');
    }
  }

  async getInitializedLibraryManager(): Promise<LibraryManager> {
    if (!this.libraryManager) {
      await this.initializeLibraryManager();
    }
    return this.libraryManager;
  }

  async getAllLibraries() {
    const manager = await this.getInitializedLibraryManager();
    return await manager.getAllLibraries();
  }

  async getLibraryData(libraryId: string, parentId?: string) {
    const manager = await this.getInitializedLibraryManager();
    return await manager.getLibraryData(libraryId, parentId);
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
