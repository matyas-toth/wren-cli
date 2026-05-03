import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Badge } from '@inkjs/ui';
import type { ProviderConfig, AppConfig } from '../engine/config.js';
import { chatCompletion, type ChatMessage } from '../engine/llm.js';
import { executeTool } from '../engine/tools.js';

interface ChatProps {
    config: ProviderConfig;
    appConfig: AppConfig;
    onEditConfig: () => void;
    onEditWorkspace: () => void;
    isActive: boolean;
}

interface MessageWithId {
    id: number;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    name?: string;
    tool_calls?: any[];
    tool_call_id?: string;
    isStatus?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ config, appConfig, onEditConfig, onEditWorkspace, isActive }) => {
    const [messages, setMessages] = useState<MessageWithId[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputKey, setInputKey] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [asciiTitle, setAsciiTitle] = useState('');

    const activeWorkspace = appConfig.activeWorkspace || process.cwd();

    useEffect(() => {
        import('figlet').then(figlet => {
            setAsciiTitle(figlet.default.textSync('Wren CLI', { font: 'Slant' }));
        });
    }, []);

    useInput((input, key) => {
        if (key.ctrl && input === 'e') {
            onEditConfig();
            return;
        }
        if (key.ctrl && input === 'w') {
            onEditWorkspace();
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

    useEffect(() => {
        if (isLoading) {
            setScrollOffset(0);
        }
    }, [isLoading]);

    const processAgentLoop = async (currentMessages: MessageWithId[]) => {
        setIsLoading(true);
        setError(null);

        const sysPrompt: ChatMessage = {
            role: 'system',
            content: `You are Wren, an expert coding assistant.\nYou are running inside the directory: ${activeWorkspace}\nUse the provided tools to navigate and read the codebase before answering.`
        };
        
        const payloadMessages: ChatMessage[] = [sysPrompt, ...currentMessages.filter(m => !m.isStatus).map(m => {
            const copy: any = { role: m.role, content: m.content || null };
            if (m.tool_calls) copy.tool_calls = m.tool_calls;
            if (m.tool_call_id) copy.tool_call_id = m.tool_call_id;
            if (m.name) copy.name = m.name;
            return copy as ChatMessage;
        })];

        const assistantMsgId = Date.now() + Math.random();
        const initialAssistantMsg: MessageWithId = { id: assistantMsgId, role: 'assistant', content: '' };
        
        setMessages([...currentMessages, initialAssistantMsg]);

        let streamContent = '';
        const response = await chatCompletion(payloadMessages, config, (chunk) => {
            streamContent += chunk;
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                const lastMsg = updated[lastIdx];
                if (lastMsg && lastMsg.id === assistantMsgId) {
                    updated[lastIdx] = { ...lastMsg, content: streamContent };
                }
                return updated;
            });
        });

        if (!response.success) {
            setIsLoading(false);
            setError(response.error || 'Unknown error occurred.');
            return;
        }

        const finalAssistantMsg: MessageWithId = {
            id: assistantMsgId,
            role: 'assistant',
            content: response.content || null,
        };
        if (response.tool_calls) {
            finalAssistantMsg.tool_calls = response.tool_calls;
        }
        
        const nextMessages = [...currentMessages.filter(m => !m.isStatus), finalAssistantMsg];
        setMessages(nextMessages);

        if (response.tool_calls && response.tool_calls.length > 0) {
            for (const tc of response.tool_calls) {
                let parsedArgs = {};
                try {
                    parsedArgs = JSON.parse(tc.function.arguments);
                } catch(e) {}
                
                // Show executing status
                setMessages([...nextMessages, { 
                    id: Date.now() + Math.random(), 
                    role: 'system', 
                    content: `[Wren is running ${tc.function.name}...]`, 
                    isStatus: true 
                }]);

                const result = await executeTool(tc.function.name, parsedArgs, activeWorkspace);
                
                nextMessages.push({
                    id: Date.now() + Math.random(),
                    role: 'tool',
                    tool_call_id: tc.id,
                    name: tc.function.name,
                    content: result
                });
                setMessages([...nextMessages]);
            }
            
            // Recurse
            await processAgentLoop(nextMessages);
        } else {
            setIsLoading(false);
            setInputKey(prev => prev + 1); // Reset input after complete loop
        }
    };

    const handleSubmit = async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed || isLoading) return;

        const userMsg: MessageWithId = { id: Date.now(), role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputKey(prev => prev + 1);
        await processAgentLoop(newMessages);
    };

    return (
        <Box flexDirection="column" flexGrow={1} height="100%">
            <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflowY="hidden" marginBottom={1}>
                <Box flexDirection="column" marginBottom={-scrollOffset} flexShrink={0}>
                    {messages.length === 0 ? (
                        <Box flexDirection="column" alignItems="flex-start" flexGrow={1} flexShrink={0}>
                            <Text color="#FF9900" bold>
                                {asciiTitle}
                            </Text>
                            <Text color="gray">
                                Connected to {config.model} at {config.baseUrl}
                            </Text>
                            <Text color="gray">
                                Workspace: {activeWorkspace}
                            </Text>
                            <Box marginTop={1} flexShrink={0}>
                                <Text color="#FFD700">Wren is breathing. Ready to chat!</Text>
                            </Box>
                        </Box>
                    ) : (
                        messages.map((msg) => {
                            if (msg.role === 'tool') {
                                return (
                                    <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                        <Text dimColor color="gray">Ran {msg.name} successfully.</Text>
                                    </Box>
                                );
                            }
                            if (msg.isStatus) {
                                return (
                                    <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                        <Text color="yellow" italic>{msg.content}</Text>
                                    </Box>
                                );
                            }
                            if (msg.role === 'system') return null; // Hide actual system prompts if any are rendered

                            const isUser = msg.role === 'user';
                            return (
                                <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                    <Text bold color={isUser ? 'cyan' : '#FF9900'}>
                                        {isUser ? 'You:' : 'Wren:'}
                                    </Text>
                                    {msg.content && <Text>{msg.content}</Text>}
                                </Box>
                            );
                        })
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
                        placeholder={isLoading ? "Wren is working..." : "Ask Wren to code..."}
                        onSubmit={handleSubmit}
                        isDisabled={isLoading || !isActive}
                    />
                </Box>
            </Box>

            {/* Status Bar */}
            <Box flexDirection="row" marginTop={1} flexShrink={0} paddingX={1}>
                <Text color="gray" dimColor>
                    {config.model} | {activeWorkspace}
                </Text>
                <Box flexGrow={1} />
                <Box gap={1}>
                    <Badge color="blue">Ctrl+E</Badge>
                    <Text color="gray">Providers</Text>
                    <Badge color="blue">Ctrl+W</Badge>
                    <Text color="gray">Workspace</Text>
                    <Badge color="yellow">PgUp/Dn</Badge>
                    <Text color="gray">Scroll</Text>
                    <Badge color="red">Ctrl+C</Badge>
                    <Text color="gray">Exit</Text>
                </Box>
            </Box>
        </Box>
    );
};
