import type { ProviderConfig } from './config.js';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    success: boolean;
    content?: string;
    error?: string;
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
                                const chunkContent = parsed.choices?.[0]?.delta?.content || '';
                                if (chunkContent) {
                                    fullContent += chunkContent;
                                    onUpdate(chunkContent);
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete chunks just in case
                            }
                        }
                    }
                }
            }
            return {
                success: true,
                content: fullContent,
            };
        } else {
            // Non-streaming response
            const data = await response.json() as any;

            if (!data.choices || !data.choices.length || !data.choices[0].message) {
                return {
                    success: false,
                    error: 'Invalid response format from provider',
                };
            }

            return {
                success: true,
                content: data.choices[0].message.content,
            };
        }
    } catch (error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred during chat completion' };
    }
}
