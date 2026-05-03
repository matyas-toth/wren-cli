import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge } from '@inkjs/ui';
import path from 'node:path';
import { readDir, isDirectory } from '../engine/fsUtils.js';

interface WorkspaceBrowserProps {
    initialPath: string;
    onSelect: (path: string) => void;
    onClose: () => void;
}

export const WorkspaceBrowser: React.FC<WorkspaceBrowserProps> = ({ initialPath, onSelect, onClose }) => {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [folders, setFolders] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        let mounted = true;
        const loadFolders = async () => {
            try {
                const items = await readDir(currentPath);
                const folderNames: string[] = [];
                // Process concurrently for speed
                await Promise.all(items.map(async (item) => {
                    const itemPath = path.join(currentPath, item);
                    if (await isDirectory(itemPath)) {
                        folderNames.push(item);
                    }
                }));
                if (mounted) {
                    setFolders(folderNames.sort());
                    setSelectedIndex(0); // Reset selection
                    setError(null);
                }
            } catch (err) {
                if (mounted) setError(String(err));
            }
        };
        loadFolders();
        return () => { mounted = false; };
    }, [currentPath]);

    const options = [
        { label: '✓ Select this directory', value: '.' },
        { label: '↵ Go up (..)', value: '..' },
        ...folders.map(f => ({ label: `📁 ${f}/`, value: f })),
        { label: '✕ Cancel', value: 'close' }
    ];

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
        } else if (key.downArrow) {
            setSelectedIndex(prev => Math.min(options.length - 1, prev + 1));
        } else if (key.return) {
            // Enter: Open Directory
            const val = options[selectedIndex]?.value;
            if (!val) return;
            if (val === 'close') {
                onClose();
            } else if (val === '.') {
                onSelect(currentPath);
            } else if (val === '..') {
                setCurrentPath(path.dirname(currentPath));
            } else {
                setCurrentPath(path.join(currentPath, val));
            }
        } else if (input === ' ') {
            // Space: Select Directory as Workspace
            const val = options[selectedIndex]?.value;
            if (!val) return;
            if (val === 'close') {
                onClose();
            } else if (val === '.') {
                onSelect(currentPath);
            } else if (val === '..') {
                onSelect(path.dirname(currentPath));
            } else {
                onSelect(path.join(currentPath, val));
            }
        }
    });

    // Handle pagination/scrolling for the visible window
    const visibleCount = 15;
    // Calculate start index so the selected item is always visible
    const startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(visibleCount / 2), options.length - visibleCount));

    return (
        <Box flexDirection="column" padding={1} flexGrow={1} height="100%">
            <Box flexDirection="column" flexGrow={1}>
                <Text bold color="#FFCC00">Select Active Workspace</Text>
                <Box marginY={1}>
                    <Text color="cyan">Current: </Text>
                    <Text>{currentPath}</Text>
                </Box>
                
                {error ? (
                    <Text color="red">Error: {error}</Text>
                ) : (
                    <Box flexDirection="column">
                        {options.map((opt, i) => {
                            if (i < startIndex || i >= startIndex + visibleCount) return null;
                            const isSelected = i === selectedIndex;
                            return (
                                <Box key={`${opt.value}-${i}`}>
                                    <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>
                                        {isSelected ? '❯ ' : '  '}{opt.label}
                                    </Text>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Status Bar */}
            <Box flexDirection="row" marginTop={1} flexShrink={0}>
                <Text color="gray" dimColor>
                    Workspace Navigation
                </Text>
                <Box flexGrow={1} />
                <Box gap={1}>
                    <Badge color="blue">↑/↓</Badge>
                    <Text color="gray">Move</Text>
                    <Badge color="blue">Enter</Badge>
                    <Text color="gray">Open Dir</Text>
                    <Badge color="yellow">Space</Badge>
                    <Text color="gray">Set Workspace</Text>
                    <Badge color="red">Ctrl+C</Badge>
                    <Text color="gray">Exit</Text>
                </Box>
            </Box>
        </Box>
    );
};
