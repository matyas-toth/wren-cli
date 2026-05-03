import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import type { ProviderConfig } from '../engine/config.js';
import { chatCompletion, type ChatMessage } from '../engine/llm.js';

interface ChatProps {
    config: ProviderConfig;
}

interface MessageWithId extends ChatMessage {
    id: number;
}

export const Chat: React.FC<ChatProps> = ({ config }) => {
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

    // Scroll handling
    useInput((input, key) => {
        if (key.pageUp || (key.ctrl && key.upArrow)) {
            setScrollOffset(prev => Math.min(prev + 1, Math.max(0, messages.length - 1)));
        }
        if (key.pageDown || (key.ctrl && key.downArrow)) {
            setScrollOffset(prev => Math.max(prev - 1, 0));
        }
    });

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

    // Calculate which messages to show based on scrollOffset
    // By slicing off the end, justifyContent="flex-end" will push older messages into view
    const visibleMessages = messages.slice(0, messages.length - scrollOffset);

    return (
        <Box flexDirection="column" flexGrow={1} height="100%">
            <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflowY="hidden" marginBottom={1}>
                {visibleMessages.length === 0 && messages.length === 0 ? (
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
                    visibleMessages.map((msg) => (
                        <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                            <Text bold color={msg.role === 'user' ? 'cyan' : '#FF9900'}>
                                {msg.role === 'user' ? 'You:' : 'Wren:'}
                            </Text>
                            <Text>{msg.content}</Text>
                        </Box>
                    ))
                )}
                {error && (
                    <Box marginTop={1}>
                        <Text color="red">Error: {error}</Text>
                    </Box>
                )}
                {scrollOffset > 0 && (
                    <Box marginTop={1} alignSelf="center">
                        <Text color="gray" bold>↑ Scrolled up {scrollOffset} messages (PageDown to return) ↓</Text>
                    </Box>
                )}
            </Box>

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
                        isDisabled={isLoading}
                    />
                </Box>
            </Box>
        </Box>
    );
};
