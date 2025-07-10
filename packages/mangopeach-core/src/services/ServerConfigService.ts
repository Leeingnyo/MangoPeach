import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerConfig } from '../models/ServerConfig';

export class ServerConfigService {
  private configFilePath: string;

  constructor(configDirectory: string, fileName: string = 'config.json') {
    this.configFilePath = path.join(configDirectory, fileName);
  }

  public async loadConfig(): Promise<ServerConfig | null> {
    try {
      const data = await fs.readFile(this.configFilePath, 'utf8');
      return JSON.parse(data) as ServerConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`Config file not found at ${this.configFilePath}.`);
      } else {
        console.error(`Error loading config from ${this.configFilePath}:`, error);
      }
      return null;
    }
  }

  public async saveConfig(config: ServerConfig): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.configFilePath), { recursive: true });
      await fs.writeFile(this.configFilePath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`Config saved to ${this.configFilePath}`);
    } catch (error) {
      console.error(`Error saving config to ${this.configFilePath}:`, error);
    }
  }
}
