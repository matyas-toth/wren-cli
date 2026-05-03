#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';

import { loadConfig, saveConfig, type AppConfig } from './engine/config.js';
import { ConfigWizard } from './cli/ConfigWizard.js';
import { Chat } from './cli/Chat.js';
import { WorkspaceBrowser } from './cli/WorkspaceBrowser.js';

const WrenTUI = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [view, setView] = useState<'chat' | 'config' | 'workspace'>('chat');
    const [size, setSize] = useState({
        columns: process.stdout.columns,
        rows: process.stdout.rows,
    });

    useEffect(() => {
        const onResize = () => {
            setSize({
                columns: process.stdout.columns,
                rows: process.stdout.rows,
            });
        };
        process.stdout.on('resize', onResize);
        process.stdout.write('\x1b[?1049h');

        loadConfig().then((loadedConfig) => {
            setConfig(loadedConfig);
            if (!loadedConfig.providers || loadedConfig.providers.length === 0 || !loadedConfig.activeProviderId) {
                setView('config');
            }
        }).catch((err) => {
            console.error('Failed to load config:', err);
            setConfig({ providers: [] });
            setView('config');
        });

        return () => {
            process.stdout.off('resize', onResize);
            process.stdout.write('\x1b[?1049l');
        };
    }, []);

    const handleConfigSave = async (newConfig: AppConfig) => {
        setConfig(newConfig);
        await saveConfig(newConfig);
    };

    if (config === null) {
        return (
            <Box flexDirection="column" paddingX={2} paddingY={1} width={size.columns} height={size.rows}>
                <Text color="cyan">Loading Wren...</Text>
            </Box>
        );
    }

    const activeProvider = config.providers.find(p => p.id === config.activeProviderId);

    return (
        <Box flexDirection="column" width={size.columns} height={size.rows} paddingX={2} paddingY={1}>
            <Box display={view === 'chat' ? 'flex' : 'none'} flexDirection="column" flexGrow={1}>
                {activeProvider ? (
                    <Chat 
                        config={activeProvider} 
                        appConfig={config}
                        onEditConfig={() => setView('config')} 
                        onEditWorkspace={() => setView('workspace')}
                        isActive={view === 'chat'}
                    />
                ) : (
                    <Text color="gray">No active provider. Please configure one.</Text>
                )}
            </Box>

            {view === 'config' && (
                <ConfigWizard 
                    config={config} 
                    onSave={handleConfigSave} 
                    onClose={() => setView('chat')} 
                />
            )}

            {view === 'workspace' && (
                <WorkspaceBrowser 
                    initialPath={config.activeWorkspace || process.cwd()}
                    onSelect={async (path) => {
                        await handleConfigSave({ ...config, activeWorkspace: path });
                        setView('chat');
                    }}
                    onClose={() => setView('chat')}
                />
            )}
        </Box>
    );
};

render(<WrenTUI />);