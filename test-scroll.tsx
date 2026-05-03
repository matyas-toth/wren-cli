import React from 'react';
import { render, Box, Text } from 'ink';

const Test = () => {
    return (
        <Box flexDirection="column" height={3} overflowY="hidden" justifyContent="flex-end">
            <Box flexDirection="column" marginBottom={-2}>
                <Text>Line 1</Text>
                <Text>Line 2</Text>
                <Text>Line 3</Text>
                <Text>Line 4</Text>
                <Text>Line 5</Text>
            </Box>
        </Box>
    );
};

render(<Test />);
