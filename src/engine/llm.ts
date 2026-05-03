import type { ProviderConfig } from './config.js';
import { toolsSchema } from './tools.js';

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    name?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ChatResponse {
    success: boolean;
    content?: string;
    error?: string;
    tool_calls?: ToolCall[];
}

export class ProviderError extends Error {
    constructor(message: string, public readonly status?: number) {
        super(message);
        this.name = 'ProviderError';
    }
}

export async function chatCompletion(
    messages: ChatMessage[],
    config: ProviderConfig,
    onUpdate?: (chunk: string) => void
): Promise<ChatResponse> {
    try {
        const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (config.apiKey && config.apiKey.trim() !== '') {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const body = JSON.stringify({
            model: config.model,
            messages,
            stream: !!onUpdate,
            tools: toolsSchema,
            tool_choice: 'auto'
        });

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
        });

        if (!response.ok) {
            throw new ProviderError(`Provider responded with status ${response.status}: ${response.statusText}`, response.status);
        }

        if (onUpdate && response.body) {
            // Streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            let fullContent = '';
            let buffer = '';
            let toolCallsBuffer: Record<number, ToolCall> = {};

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    // Keep the last partial line in the buffer
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            const dataStr = trimmedLine.slice(6);
                            if (dataStr === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(dataStr);
                                const delta = parsed.choices?.[0]?.delta;
                                if (!delta) continue;

                                const chunkContent = delta.content || '';
                                if (chunkContent) {
                                    fullContent += chunkContent;
                                    onUpdate(chunkContent);
                                }

                                if (delta.tool_calls) {
                                    for (const tc of delta.tool_calls) {
                                        const index = tc.index;
                                        if (!toolCallsBuffer[index]) {
                                            toolCallsBuffer[index] = {
                                                id: tc.id,
                                                type: 'function',
                                                function: { name: tc.function?.name || '', arguments: '' }
                                            };
                                        }
                                        if (tc.function?.arguments) {
                                            toolCallsBuffer[index].function.arguments += tc.function.arguments;
                                        }
                                    }
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete chunks just in case
                            }
                        }
                    }
                }
            }
            
            const finalToolCalls = Object.values(toolCallsBuffer);
            const res: ChatResponse = {
                success: true,
                content: fullContent,
            };
            if (finalToolCalls.length > 0) res.tool_calls = finalToolCalls;
            return res;
        } else {
            // Non-streaming response
            const data = await response.json() as any;

            if (!data.choices || !data.choices.length || !data.choices[0].message) {
                return {
                    success: false,
                    error: 'Invalid response format from provider',
                };
            }

            const res: ChatResponse = {
                success: true,
                content: data.choices[0].message.content,
            };
            if (data.choices[0].message.tool_calls) {
                res.tool_calls = data.choices[0].message.tool_calls;
            }
            return res;
        }
    } catch (error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred during chat completion' };
    }
}
