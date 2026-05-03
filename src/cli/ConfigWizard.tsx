import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput, PasswordInput } from '@inkjs/ui';
import type { ProviderConfig } from '../engine/config.js';

interface ConfigWizardProps {
    onComplete: (config: ProviderConfig) => void;
}

export const ConfigWizard: React.FC<ConfigWizardProps> = ({ onComplete }) => {
    const [activeInput, setActiveInput] = useState<'baseUrl' | 'apiKey' | 'model'>('baseUrl');
    
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');

    const handleSubmitBaseUrl = (value: string) => {
        setBaseUrl(value);
        setActiveInput('apiKey');
    };

    const handleSubmitApiKey = (value: string) => {
        setApiKey(value);
        setActiveInput('model');
    };

    const handleSubmitModel = (value: string) => {
        setModel(value);
        
        // Finalize configuration
        const config: ProviderConfig = {
            baseUrl: baseUrl.trim() || 'http://localhost:11434/v1',
            apiKey: apiKey.trim(),
            model: value.trim() || 'qwen2.5-coder:7b',
        };
        onComplete(config);
    };

    return (
        <Box flexDirection="column" gap={1} padding={1}>
            <Text bold color="#FFCC00">Wren Setup: No Provider Configured</Text>
            <Text color="gray">Let's set up an OpenAI-compatible provider (e.g., LM Studio, Ollama, OpenRouter).</Text>
            
            <Box flexDirection="column" marginTop={1}>
                <Box>
                    <Text bold color={activeInput === 'baseUrl' ? 'cyan' : 'white'}>Base URL: </Text>
                    {activeInput === 'baseUrl' ? (
                        <TextInput
                            placeholder="http://localhost:11434/v1"
                            onSubmit={handleSubmitBaseUrl}
                        />
                    ) : (
                        <Text>{baseUrl || 'http://localhost:11434/v1'}</Text>
                    )}
                </Box>

                <Box>
                    <Text bold color={activeInput === 'apiKey' ? 'cyan' : 'white'}>API Key: </Text>
                    {activeInput === 'apiKey' ? (
                        <PasswordInput
                            placeholder="Leave empty if not required..."
                            onSubmit={handleSubmitApiKey}
                        />
                    ) : activeInput === 'model' || activeInput as any === 'done' ? (
                        <Text>{apiKey ? '********' : '(none)'}</Text>
                    ) : null}
                </Box>

                <Box>
                    <Text bold color={activeInput === 'model' ? 'cyan' : 'white'}>Model: </Text>
                    {activeInput === 'model' ? (
                        <TextInput
                            placeholder="qwen2.5-coder:7b"
                            onSubmit={handleSubmitModel}
                        />
                    ) : activeInput as any === 'done' ? (
                        <Text>{model}</Text>
                    ) : null}
                </Box>
            </Box>
        </Box>
    );
};
