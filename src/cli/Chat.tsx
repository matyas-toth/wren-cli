import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Badge } from '@inkjs/ui';
import type { ProviderConfig, AppConfig } from '../engine/config.js';
import { runAgentLoop, type ModelMessage } from '../engine/llm.js';
import { MarkdownRenderer } from './renderers/MarkdownRenderer.js';



interface ChatProps {
    config: ProviderConfig;
    appConfig: AppConfig;
    onEditConfig: () => void;
    onEditWorkspace: () => void;
    isActive: boolean;
}

type MessageWithId = ModelMessage & {
    id: number;
    isStatus?: boolean;
    statusText?: string;
};

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

        const sysPrompt: ModelMessage = {
            role: 'system',
            content: `
You are Wren, an expert autonomous coding reasoning agent (“Thinker”) operating in: ${activeWorkspace}

Your role is to investigate, reason about, and deeply understand code, systems, architecture, bugs, and implementation strategy. You do NOT write code, edit files, or execute commands. You think, explore, and produce accurate technical understanding for the Executor agent or user.

You use evidence, not assumptions. Neither you nor the user is always correct; accuracy comes from investigation.

---

# BEHAVIOR

For coding, debugging, architecture, implementation, or project questions:
- act autonomously
- use tools aggressively (grep, find_files, read_file, read_file_lines, list_dir)
- prioritize reasoning through evidence
- prefer exploration over speculation
- prefer action over discussion

For casual conversation:
→ respond naturally and concisely
→ do not over-investigate unless needed

---

# HARD RULES

- NEVER ask for permission, confirmation, or next steps when information can be found yourself
- NEVER output “Should I…”, “Do you want me to…”, or similar
- NEVER guess when tools can resolve uncertainty
- NEVER stop before sufficient understanding is reached
- NEVER loop on the same file/path without new evidence

If uncertain:
→ search deeper
→ expand scope
→ change direction
→ do NOT ask unnecessarily

---

# REASONING WORKFLOW

Missing context:
→ search first

General understanding:
→ broad exploration first

Specific implementation:
→ narrow to files/functions

Deep understanding:
→ inspect relevant code directly

Always:
broad → narrow → deep → expand

---

# COMPLETION

Stop only when:
- the system/problem is sufficiently understood
- evidence supports a confident answer
- or no meaningful new information remains

---

# OUTPUT

- concise
- technically dense
- evidence-based
- minimal filler
- conclusions over narration
- reasoning over speculation

---

# GOLDEN RULE

If you are about to ask the user something you can discover yourself:
→ stop
→ investigate instead
`
        };

        // Filter out status messages for the LLM
        const payloadMessages: ModelMessage[] = [
            sysPrompt,
            ...currentMessages.filter(m => !m.isStatus).map(m => {
                // Remove UI-specific properties
                const { id, isStatus, statusText, ...core } = m;
                return core as ModelMessage;
            })
        ];

        const assistantMsgId = Date.now() + Math.random();
        const initialAssistantMsg: MessageWithId = { id: assistantMsgId, role: 'assistant', content: '' };

        setMessages(prev => [...prev, initialAssistantMsg]);

        let streamContent = '';

        const { success, result, error } = await runAgentLoop(
            payloadMessages,
            config,
            activeWorkspace,
            (event) => {
                // onStepFinish
            },
            (event) => {
                // onFinish
            },
            (name) => {
                // onToolStart
                setMessages(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    role: 'system',
                    content: '',
                    isStatus: true,
                    statusText: `[Wren is running ${name}...]`
                }]);
            }
        );

        if (!success || !result) {
            setIsLoading(false);
            setError(error || 'Unknown error occurred.');
            return;
        }

        try {
            for await (const chunk of result.textStream) {
                streamContent += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    const lastMsg = updated[lastIdx];

                    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.isStatus) {
                        updated[lastIdx] = { ...lastMsg, content: streamContent };
                    } else {
                        // If a status message was pushed, append a new assistant message for the continued stream
                        updated.push({ id: Date.now() + Math.random(), role: 'assistant', content: streamContent });
                    }
                    return updated;
                });
            }

            // Once stream is completely finished, fetch the final structured messages from the SDK
            // This includes all tool calls and tool results automatically generated during maxSteps!
            const finalResponse = await result.response;
            const finalMessages = finalResponse.messages;

            // We append the new messages generated in this turn to our UI state
            setMessages(prev => {
                // Remove the temporary streaming assistant messages from this turn
                const withoutTemps = prev.filter(m => m.id !== assistantMsgId && !(m.role === 'assistant' && typeof m.content === 'string' && m.content === streamContent));

                // Map the new messages to our UI type
                const newUIMessages = finalMessages.map((m: ModelMessage) => ({
                    ...m,
                    id: Date.now() + Math.random()
                }));

                return [...withoutTemps, ...newUIMessages];
            });

        } catch (err: any) {
            setError(err.message || 'Stream reading error');
        } finally {
            setIsLoading(false);
            setInputKey(prev => prev + 1);
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
                            if (msg.isStatus) {
                                return (
                                    <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                        <Text color="yellow" italic>{msg.statusText}</Text>
                                    </Box>
                                );
                            }
                            if (msg.role === 'tool') {
                                // Vercel AI SDK tool result message
                                const toolNames = Array.isArray(msg.content) ? msg.content.map((c: any) => c.toolName).join(', ') : 'tools';
                                return (
                                    <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                        <Text dimColor color="gray">Ran {toolNames} successfully.</Text>
                                    </Box>
                                );
                            }
                            if (msg.role === 'system') return null; // Hide actual system prompts

                            const isUser = msg.role === 'user';

                            // Extract text content from Vercel AI SDK message (it can be an array of parts for assistant messages with tool calls)
                            let textContent = '';
                            if (typeof msg.content === 'string') {
                                textContent = msg.content;
                            } else if (Array.isArray(msg.content)) {
                                textContent = msg.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
                            }

                            if (!textContent && msg.role === 'assistant') return null; // Skip empty assistant messages (like pure tool calls)

                            return (
                                <Box key={msg.id} flexDirection="column" marginBottom={1} flexShrink={0}>
                                    <Text bold color={isUser ? 'cyan' : '#FF9900'}>
                                        {isUser ? 'You:' : 'Wren:'}
                                    </Text>
                                    {textContent && <MarkdownRenderer content={textContent}></MarkdownRenderer>}
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
