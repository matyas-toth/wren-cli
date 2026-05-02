#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import figlet from 'figlet';

// We define the custom ### border shape here
const hashBorder = {
    topLeft: '#',
    topRight: '#',
    bottomLeft: '#',
    bottomRight: '#',
    horizontal: '#',
    vertical: '#'
};

const WrenTUI = () => {
    const [query, setQuery] = useState('');
    const [asciiTitle, setAsciiTitle] = useState('');

    // We generate the ASCII art on mount
    useEffect(() => {
        const art = figlet.textSync('Wren CLI', {
            font: 'Slant',
        });
        setAsciiTitle(art);
    }, []);

    return (
        <Box flexDirection="column" height={process.stdout.rows} paddingX={2} paddingY={1}>


            <Box flexDirection="column" alignItems="flex-start" marginBottom={1}>
                <Text color="#FF9900" bold>
                    {asciiTitle}
                </Text>
                <Text color="gray">
                    Agentic Core (v0.1.0)  |  Active Context: .brain/activeContext.md
                </Text>
            </Box>

            <Box flexDirection="column" flexGrow={1} overflowY="hidden">
                <Text color="#FFD700">Wren is breathing.</Text>
            </Box>

            <Box
                borderStyle={"bold"}
                borderColor="#FFCC00"
                paddingX={1}
                flexDirection="row"
            >
                <Text color="#FF9900" bold>❯ </Text>
                <Box flexGrow={1} marginLeft={1}>
                    <TextInput
                        placeholder="Ask Wren to code..."
                        value={query}
                        onChange={setQuery}
                        onSubmit={(value) => {
                            setQuery('');
                        }}
                    />
                </Box>
            </Box>

        </Box>
    );
};

// Start the app
render(<WrenTUI />);