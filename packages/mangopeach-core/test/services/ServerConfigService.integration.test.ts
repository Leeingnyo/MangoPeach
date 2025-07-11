import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerConfigService } from '../../src/services/ServerConfigService';
import { ServerConfig } from '../../src/models/ServerConfig';

describe('ServerConfigService (Integration Test)', () => {
  const TEST_CONFIG_DIR = path.join(__dirname, '../temp_config');
  const TEST_CONFIG_FILE = 'test-config.json';
  let service: ServerConfigService;

  beforeEach(async () => {
    // Ensure the test directory is clean before each test
    await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
    service = new ServerConfigService(TEST_CONFIG_DIR, TEST_CONFIG_FILE);
  });

  afterEach(async () => {
    // Clean up the test directory after each test
    await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
  });

  it('should save and load config correctly', async () => {
    const config: ServerConfig = {
      dataStoragePath: '.',
      libraries: [
        {
          id: 'lib1',
          name: 'My Comics',
          path: '/path/to/comics',
          type: 'local',
          enabled: true,
          scanInterval: '0 * * * *',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'lib2',
          name: 'My Photos',
          path: '/path/to/photos',
          type: 'smb',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    await service.saveConfig(config);
    const loadedConfig = await service.loadConfig();

    // Since dates are serialized as strings in JSON, we need to create expected config with string dates
    const expectedConfig = {
      ...config,
      libraries: config.libraries.map(lib => ({
        ...lib,
        createdAt: lib.createdAt.toISOString(),
        updatedAt: lib.updatedAt.toISOString(),
      }))
    };

    expect(loadedConfig).toEqual(expectedConfig);
  });

  it('should return null if config file does not exist', async () => {
    const loadedConfig = await service.loadConfig();
    expect(loadedConfig).toBeNull();
  });

  it('should handle empty config correctly', async () => {
    const config: ServerConfig = { dataStoragePath: '.', libraries: [] };
    await service.saveConfig(config);
    const loadedConfig = await service.loadConfig();
    expect(loadedConfig).toEqual(config);
  });
});
