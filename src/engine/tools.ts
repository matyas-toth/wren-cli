import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const toolsSchema = [
    {
        type: 'function',
        function: {
            name: 'grep',
            description: 'Search for a string pattern across files in the active workspace using ripgrep. Use this to find where variables, classes, or functions are defined or used.',
            parameters: {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'The string pattern to search for'
                    }
                },
                required: ['pattern']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Reads the complete contents of a file in the active workspace.',
            parameters: {
                type: 'object',
                properties: {
                    filepath: {
                        type: 'string',
                        description: 'The relative or absolute path to the file to read'
                    }
                },
                required: ['filepath']
            }
        }
    }
];

export async function executeTool(name: string, args: Record<string, any>, cwd: string): Promise<string> {
    try {
        if (name === 'grep') {
            const { pattern } = args;
            if (!pattern) return 'Error: pattern is required for grep.';
            
            try {
                const { stdout } = await execAsync(`rg "${pattern}" --line-number --max-count=50`, { cwd });
                return stdout || 'No matches found.';
            } catch (err: any) {
                if (err.code === 1) {
                    return 'No matches found.';
                }
                return `Error running grep: ${err.message}`;
            }
        }
        
        if (name === 'read_file') {
            const { filepath } = args;
            if (!filepath) return 'Error: filepath is required for read_file.';
            
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            const resolvedPath = path.resolve(cwd, filepath);
            
            try {
                const content = await fs.readFile(resolvedPath, 'utf8');
                if (content.length > 50000) {
                    return content.substring(0, 50000) + '\n\n...[FILE TRUNCATED FOR LENGTH]...';
                }
                return content;
            } catch (err: any) {
                return `Error reading file: ${err.message}`;
            }
        }
        
        return `Error: Tool ${name} is not recognized.`;
    } catch (e: any) {
        return `Unexpected execution error: ${e.message}`;
    }
}
