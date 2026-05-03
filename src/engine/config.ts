import os from 'node:os';
import path from 'node:path';
import { exists, readText, writeText, FileSystemError } from './fsUtils.js';

export interface ProviderConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface AppConfig {
    provider?: ProviderConfig;
}

const CONFIG_FILE_NAME = '.wrenrc.json';

function getConfigPath(): string {
    return path.join(os.homedir(), CONFIG_FILE_NAME);
}

export async function loadConfig(): Promise<AppConfig> {
    const configPath = getConfigPath();
    const configExists = await exists(configPath);

    if (!configExists) {
        return {};
    }

    try {
        const content = await readText(configPath);
        return JSON.parse(content) as AppConfig;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Failed to parse config file. Starting with empty config.');
            return {};
        }
        throw error;
    }
}

export async function saveConfig(config: AppConfig): Promise<void> {
    const configPath = getConfigPath();
    await writeText(configPath, JSON.stringify(config, null, 2));
}
