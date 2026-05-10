import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { ProviderConfig } from './config.js';
import type { LanguageModel } from 'ai';

export function getModelAdapter(config: ProviderConfig): LanguageModel {
    if (config.providerType === 'openai') {
        const openai = createOpenAI({
            apiKey: config.apiKey,
        });
        return openai.chat(config.model);
    } else if (config.providerType === 'anthropic') {
        const anthropic = createAnthropic({
            apiKey: config.apiKey,
        });
        return anthropic(config.model);
    } else if (config.providerType === 'deepseek') {
        const deepseek = createDeepSeek({
            apiKey: config.apiKey,
        });
        return deepseek(config.model);
    } else {
        // Custom (OpenAI Compatible like LM Studio, Ollama, etc.)
        const custom = createOpenAI({
            baseURL: config.baseUrl,
            apiKey: config.apiKey || 'custom-no-key',
        });
        return custom.chat(config.model);
    }
}
