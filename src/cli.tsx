#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import figlet from 'figlet';

import { loadConfig, saveConfig, type AppConfig, type ProviderConfig } from './engine/config.js';
import { ConfigWizard } from './cli/ConfigWizard.js';
import { Chat } from './cli/Chat.js';

const WrenTUI = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [size, setSize] = useState({
        columns: process.stdout.columns,
        rows: process.stdout.rows,
    });

    useEffect(() => {
        // Handle terminal resize
        const onResize = () => {
            setSize({
                columns: process.stdout.columns,
                rows: process.stdout.rows,
            });
        };
        process.stdout.on('resize', onResize);

        // Enter alternate screen buffer for full-screen experience
        process.stdout.write('\x1b[?1049h');

        loadConfig().then((loadedConfig) => {
            setConfig(loadedConfig);
        }).catch((err) => {
            console.error('Failed to load config:', err);
            setConfig({});
        });

        return () => {
            process.stdout.off('resize', onResize);
            // Leave alternate screen buffer on exit
            process.stdout.write('\x1b[?1049l');
        };
    }, []);

    const handleConfigComplete = async (providerConfig: ProviderConfig) => {
        const newConfig = { ...config, provider: providerConfig };
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

    return (
        <Box flexDirection="column" width={size.columns} height={size.rows} paddingX={2} paddingY={1}>
            {config.provider ? (
                <Chat config={config.provider} />
            ) : (
                <ConfigWizard onComplete={handleConfigComplete} />
            )}
        </Box>
    );
};

// Start the app with alternate screen clearing optimization disabled to avoid flickering
// Since we manually handle alt screen, we can just render normal
render(<WrenTUI />);