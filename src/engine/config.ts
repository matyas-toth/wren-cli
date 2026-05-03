import os from 'node:os';
import path from 'node:path';
import { exists, readText, writeText } from './fsUtils.js';

export interface ProviderConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface AppConfig {
    providers: ProviderConfig[];
    activeProviderId?: string;
    activeWorkspace?: string;
    provider?: any; // For backward compatibility/migration
}

const CONFIG_FILE_NAME = '.wrenrc.json';

function getConfigPath(): string {
    return path.join(os.homedir(), CONFIG_FILE_NAME);
}

export async function loadConfig(): Promise<AppConfig> {
    const configPath = getConfigPath();
    const configExists = await exists(configPath);

    if (!configExists) {
        return { providers: [] };
    }

    try {
        const content = await readText(configPath);
        const parsed = JSON.parse(content) as AppConfig;
        
        let needsSave = false;

        // Migration from single provider to multi-provider array
        if (parsed.provider && !parsed.providers) {
            const migratedProvider: ProviderConfig = {
                id: Date.now().toString(),
                name: 'Legacy Provider',
                baseUrl: parsed.provider.baseUrl || 'http://localhost:11434/v1',
                apiKey: parsed.provider.apiKey || '',
                model: parsed.provider.model || 'unknown-model',
            };
            parsed.providers = [migratedProvider];
            parsed.activeProviderId = migratedProvider.id;
            delete parsed.provider;
            needsSave = true;
        }
        
        if (!parsed.providers) {
            parsed.providers = [];
            needsSave = true;
        }

        if (needsSave) {
            // Background save to persist migration
            saveConfig(parsed).catch(console.error);
        }
        
        return parsed;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Failed to parse config file. Starting with empty config.');
            return { providers: [] };
        }
        throw error;
    }
}

export async function saveConfig(config: AppConfig): Promise<void> {
    const configPath = getConfigPath();
    const { provider, ...cleanConfig } = config; // Exclude legacy property
    await writeText(configPath, JSON.stringify(cleanConfig, null, 2));
}
