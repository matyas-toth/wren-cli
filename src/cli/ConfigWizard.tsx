import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput, PasswordInput, Select } from '@inkjs/ui';
import type { AppConfig, ProviderConfig } from '../engine/config.js';

interface ConfigWizardProps {
    config: AppConfig;
    onSave: (config: AppConfig) => Promise<void>;
    onClose: () => void;
}

export const ConfigWizard: React.FC<ConfigWizardProps> = ({ config, onSave, onClose }) => {
    const [menuState, setMenuState] = useState<'main' | 'add' | 'select' | 'delete'>('main');
    
    // Add new provider state
    const [activeInput, setActiveInput] = useState<'name' | 'baseUrl' | 'apiKey' | 'model'>('name');
    const [newName, setNewName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');

    const handleMainMenu = (value: string) => {
        if (value === 'close') onClose();
        else if (value === 'add') {
            setMenuState('add');
            setActiveInput('name');
            setNewName('');
            setBaseUrl('');
            setApiKey('');
        }
        else setMenuState(value as any);
    };

    const handleSelectProvider = async (id: string) => {
        if (id === 'back') {
            setMenuState('main');
            return;
        }
        await onSave({ ...config, activeProviderId: id });
        setMenuState('main');
    };

    const handleDeleteProvider = async (id: string) => {
        if (id === 'back') {
            setMenuState('main');
            return;
        }
        const newProviders = config.providers.filter(p => p.id !== id);
        const newConfig = { ...config, providers: newProviders };
        if (config.activeProviderId === id) {
            const firstProvider = newProviders[0];
            if (firstProvider) {
                newConfig.activeProviderId = firstProvider.id;
            } else {
                delete newConfig.activeProviderId;
            }
        }
        await onSave(newConfig);
        setMenuState('main');
    };

    const handleSubmitName = (value: string) => {
        setNewName(value.trim() || 'Custom Provider');
        setActiveInput('baseUrl');
    };

    const handleSubmitBaseUrl = (value: string) => {
        setBaseUrl(value.trim() || 'http://localhost:11434/v1');
        setActiveInput('apiKey');
    };

    const handleSubmitApiKey = (value: string) => {
        setApiKey(value.trim());
        setActiveInput('model');
    };

    const handleSubmitModel = async (value: string) => {
        const model = value.trim() || 'qwen2.5-coder:7b';
        const newProvider: ProviderConfig = {
            id: Date.now().toString(),
            name: newName,
            baseUrl,
            apiKey,
            model
        };
        const newConfig = {
            ...config,
            providers: [...config.providers, newProvider],
            activeProviderId: newProvider.id
        };
        await onSave(newConfig);
        setMenuState('main');
    };

    const renderMainMenu = () => {
        const options = [];
        if (config.providers.length > 0) {
            options.push({ label: 'Select Active Provider', value: 'select' });
        }
        options.push({ label: 'Add New Provider', value: 'add' });
        if (config.providers.length > 0) {
            options.push({ label: 'Delete Provider', value: 'delete' });
        }
        if (config.providers.length > 0 && config.activeProviderId) {
            options.push({ label: 'Back to Chat', value: 'close' });
        }

        return (
            <Box flexDirection="column" gap={1}>
                <Text bold color="#FFCC00">Wren Configuration</Text>
                <Select options={options} onChange={handleMainMenu} />
            </Box>
        );
    };

    const renderSelect = () => {
        const options = config.providers.map(p => ({
            label: `${p.name} (${p.model})${p.id === config.activeProviderId ? ' [ACTIVE]' : ''}`,
            value: p.id
        }));
        options.push({ label: '← Back to Menu', value: 'back' });

        return (
            <Box flexDirection="column" gap={1}>
                <Text bold color="cyan">Select Active Provider:</Text>
                <Select options={options} onChange={handleSelectProvider} />
            </Box>
        );
    };

    const renderDelete = () => {
        const options = config.providers.map(p => ({
            label: `${p.name} (${p.model})`,
            value: p.id
        }));
        options.push({ label: '← Back to Menu', value: 'back' });

        return (
            <Box flexDirection="column" gap={1}>
                <Text bold color="red">Delete Provider:</Text>
                <Select options={options} onChange={handleDeleteProvider} />
            </Box>
        );
    };

    const renderAdd = () => {
        return (
            <Box flexDirection="column" gap={1}>
                <Text bold color="green">Add New Provider</Text>
                
                <Box flexDirection="column">
                    <Box>
                        <Text bold color={activeInput === 'name' ? 'cyan' : 'white'}>Name: </Text>
                        {activeInput === 'name' ? (
                            <TextInput placeholder="e.g. Local LM Studio" onSubmit={handleSubmitName} />
                        ) : <Text>{newName}</Text>}
                    </Box>

                    {activeInput !== 'name' && (
                        <Box>
                            <Text bold color={activeInput === 'baseUrl' ? 'cyan' : 'white'}>Base URL: </Text>
                            {activeInput === 'baseUrl' ? (
                                <TextInput placeholder="http://localhost:11434/v1" onSubmit={handleSubmitBaseUrl} />
                            ) : <Text>{baseUrl}</Text>}
                        </Box>
                    )}

                    {['apiKey', 'model'].includes(activeInput) && (
                        <Box>
                            <Text bold color={activeInput === 'apiKey' ? 'cyan' : 'white'}>API Key: </Text>
                            {activeInput === 'apiKey' ? (
                                <PasswordInput placeholder="Leave empty if not required..." onSubmit={handleSubmitApiKey} />
                            ) : <Text>{apiKey ? '********' : '(none)'}</Text>}
                        </Box>
                    )}

                    {activeInput === 'model' && (
                        <Box>
                            <Text bold color="cyan">Model: </Text>
                            <TextInput placeholder="qwen2.5-coder:7b" onSubmit={handleSubmitModel} />
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Box padding={1} flexDirection="column" flexGrow={1}>
            {menuState === 'main' && renderMainMenu()}
            {menuState === 'select' && renderSelect()}
            {menuState === 'delete' && renderDelete()}
            {menuState === 'add' && renderAdd()}
        </Box>
    );
};
