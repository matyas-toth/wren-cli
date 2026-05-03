import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import type { ProviderConfig } from '../engine/config.js';
import { chatCompletion, type ChatMessage } from '../engine/llm.js';

import { Badge } from '@inkjs/ui';

interface ChatProps {
    config: ProviderConfig;
    onEditConfig: () => void;
    isActive: boolean;
}

interface MessageWithId extends ChatMessage {
    id: number;
}

export const Chat: React.FC<ChatProps> = ({ config, onEditConfig, isActive }) => {
    const [messages, setMessages] = useState<MessageWithId[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputKey, setInputKey] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [asciiTitle, setAsciiTitle] = useState('');

    useEffect(() => {
        import('figlet').then(figlet => {
            setAsciiTitle(figlet.default.textSync('Wren CLI', { font: 'Slant' }));
        });
    }, []);

    // Scroll handling (Line-by-line via negative margin)
    useInput((input, key) => {
        if (key.ctrl && input === 'e') {
            onEditConfig();
            return;
        }

        if (key.pageUp) {
            setScrollOffset(prev => prev + 10);
        } else if (key.ctrl && key.upArrow) {
            setScrollOffset(prev => prev + 1);
        }
        
        if (key.pageDown) {
            setScrollOffset(prev => Math.max(prev - 10, 0));
        } else if (key.ctrl && key.downArrow) {
            setScrollOffset(prev => Math.max(prev - 1, 0));
        }
    }, { isActive });

    // Reset scroll when a new message is added by user
    useEffect(() => {
        if (isLoading) {
            setScrollOffset(0);
        }
    }, [isLoading]);

    const handleSubmit = async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed || isLoading) return;

        const userMsg: MessageWithId = { id: Date.now(), role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        
        // Add a placeholder assistant message that will be streamed into
        const assistantMsgId = Date.now() + 1;
        const initialAssistantMsg: MessageWithId = { id: assistantMsgId, role: 'assistant', content: '' };
        
        setMessages([...newMessages, initialAssistantMsg]);
        
        setIsLoading(true);
        setError(null);
        setInputKey(prev => prev + 1);

        const response = await chatCompletion(newMessages, config, (chunk) => {
            // Update the assistant message with the incoming chunk
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                const lastMsg = updated[lastIdx];
                if (lastMsg && lastMsg.id === assistantMsgId) {
                    updated[lastIdx] = {
                        id: lastMsg.id,
                        role: lastMsg.role,
                        content: lastMsg.content + chunk
                    };
                }
                return updated;
            });
        });
        
        setIsLoading(false);
        if (!response.success) {
            setError(response.error || 'Unknown error occurred.');
            // Remove the empty placeholder if it failed completely and was empty
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.content === '') {
                    updated.pop();
                }
                return updated;
            });
        }
    };

    return (
        <Box flexDirection="column" flexGrow={1} height="100%">
            <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflowY="hidden" marginBottom={1}>
                {/* 
                  Inner box uses marginBottom={-scrollOffset} to push lines DOWN 
                  when scrollOffset is positive, enabling line-by-line scrolling
                  for older messages.
                */}
                <Box flexDirection="column" marginBottom={-scrollOffset} flexShrink={0}>
                    {messages.length === 0 ? (
                        <Box flexDirection="column" alignItems="flex-start" flexGrow={1} flexShrink={0}>
                            <Text color="#FF9900" bold>
                                {asciiTitle}
                            </Text>
                            <Text color="gray">
                                Connected to {config.model} at {config.baseUrl}
                            </Text>
                            <Box marginTop={1} flexShrink={0}>
                                <Text color="#FFD700">Wren is breathing. Ready to chat!</Text>
                            </Box>
                        </Box>
                    ) : (
                        messages.map((msg) => (
                            <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                <Text bold color={msg.role === 'user' ? 'cyan' : '#FF9900'}>
                                    {msg.role === 'user' ? 'You:' : 'Wren:'}
                                </Text>
                                <Text>{msg.content}</Text>
                            </Box>
                        ))
                    )}
                </Box>
                {error && (
                    <Box marginTop={1} flexShrink={0}>
                        <Text color="red">Error: {error}</Text>
                    </Box>
                )}
            </Box>

            {scrollOffset > 0 && (
                <Box alignSelf="center" marginBottom={1}>
                    <Text color="gray" bold>↑ Scrolled up {scrollOffset} lines (PageDown to return) ↓</Text>
                </Box>
            )}

            <Box
                borderStyle="bold"
                borderColor="#FFCC00"
                paddingX={1}
                flexDirection="row"
                flexShrink={0}
            >
                <Text color="#FF9900" bold>❯ </Text>
                <Box flexGrow={1} marginLeft={1}>
                    <TextInput
                        key={`input-${inputKey}`}
                        placeholder={isLoading ? "Wren is thinking..." : "Ask Wren to code..."}
                        onSubmit={handleSubmit}
                        isDisabled={isLoading || !isActive}
                    />
                </Box>
            </Box>

            {/* Status Bar */}
            <Box flexDirection="row" marginTop={1} flexShrink={0} paddingX={1}>
                <Text color="gray" dimColor>
                    Connected to {config.model}
                </Text>
                <Box flexGrow={1} />
                <Box gap={1}>
                    <Badge color="blue">Ctrl+E</Badge>
                    <Text color="gray">Providers</Text>
                    <Badge color="yellow">PgUp/Dn</Badge>
                    <Text color="gray">Scroll</Text>
                    <Badge color="red">Ctrl+C</Badge>
                    <Text color="gray">Exit</Text>
                </Box>
            </Box>
        </Box>
    );
};
