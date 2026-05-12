import { streamText, stepCountIs, type ModelMessage } from 'ai';
import type { ProviderConfig } from './config.js';
import { getModelAdapter } from './providerAdapter.js';
import { getWrenTools } from './tools.js';

export type { ModelMessage, Output } from 'ai';

export class ProviderError extends Error {
    constructor(message: string, public readonly status?: number) {
        super(message);
        this.name = 'ProviderError';
    }
}

export async function runAgentLoop(
    messages: ModelMessage[],
    config: ProviderConfig,
    cwd: string,
    onStepFinish: (event: any) => void,
    onFinish: (event: any) => void,
    onToolStart: (name: string, args: any) => void
): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
        const model = getModelAdapter(config);
        const tools = getWrenTools(cwd, onToolStart);

        const result = streamText({
            model,
            messages,
            tools,
            stopWhen: stepCountIs(50), // Automatically loop up to 20 times for tool calling
            onStepFinish: (event) => {
                onStepFinish(event);
            },
            onFinish: (event) => {
                onFinish(event);
            }
        });

        return { success: true, result };
    } catch (error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred during chat completion' };
    }
}

