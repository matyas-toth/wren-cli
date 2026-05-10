import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { searchFiles, readDirRecursive } from './fsUtils.js';

export function getWrenTools(cwd: string, onToolStart?: (name: string, args: any) => void) {
    return {
        search_files: tool({
            description: 'Search for a string pattern across files in the active workspace. Use this to find where variables, classes, or functions are defined or used.',
            inputSchema: z.object({
                pattern: z.string().describe('The string pattern to search for'),
            }),
            execute: async (args: { pattern: string }) => {
                if (onToolStart) onToolStart('search_files', args);
                const { pattern } = args;
                try {
                    const matches = await searchFiles(cwd, pattern);
                    if (matches.length === 0) return 'No matches found.';
                    return matches.join('\n');
                } catch (err: any) {
                    return `Error searching files: ${err.message}`;
                }
            },
        }),
        read_file: tool({
            description: 'Reads the complete contents of a file in the active workspace.',
            inputSchema: z.object({
                filepath: z.string().describe('The relative or absolute path to the file to read'),
            }),
            execute: async (args: { filepath: string }) => {
                if (onToolStart) onToolStart('read_file', args);
                const { filepath } = args;
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
            },
        }),
        list_dir: tool({
            description: 'List all files and folders in a specific directory or the root workspace to orient yourself.',
            inputSchema: z.object({
                dirpath: z.string().describe('The relative path of the directory to list. Leave empty string for the root workspace directory.'),
            }),
            execute: async (args: { dirpath: string }) => {
                if (onToolStart) onToolStart('list_dir', args);
                const resolvedPath = args.dirpath ? path.resolve(cwd, args.dirpath) : cwd;
                try {
                    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
                    const formatted = entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`);
                    return formatted.join('\n') || 'Directory is empty.';
                } catch (err: any) {
                    return `Error listing directory: ${err.message}`;
                }
            },
        })
    };
}
