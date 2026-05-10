import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { searchFiles, readDirRecursive, findFilesByName } from './fsUtils.js';

export function getWrenTools(cwd: string, onToolStart?: (name: string, args: any) => void) {
    return {
        grep: tool({
            description: 'Search for a precise string or standard JS RegExp pattern inside file contents. Standard inputs are plain strings like "function init()" or regex like "^import .* from". This does case-insensitive line-by-line matching across all files in the workspace. Use this to find where variables, classes, or functions are defined or used.',
            inputSchema: z.object({
                pattern: z.string().describe('The standard string or RegExp pattern to search for.'),
            }),
            execute: async (args: { pattern: string }) => {
                if (onToolStart) onToolStart('grep', args);
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
        find_files: tool({
            description: 'Locate files by their filename or path pattern. Example: "router" finds "src/router.ts". Use this when you know what a file might be called but do not know exactly where it is. Do NOT use this to search file contents.',
            inputSchema: z.object({
                pattern: z.string().describe('The filename or path string/regex to match.'),
            }),
            execute: async (args: { pattern: string }) => {
                if (onToolStart) onToolStart('find_files', args);
                const { pattern } = args;
                try {
                    const matches = await findFilesByName(cwd, pattern);
                    if (matches.length === 0) return 'No files found matching that name.';
                    return matches.join('\n');
                } catch (err: any) {
                    return `Error finding files: ${err.message}`;
                }
            },
        }),
        read_file: tool({
            description: 'Reads the complete contents of a file. Use this for small to medium files. For extremely large files (thousands of lines), prefer using read_file_lines to avoid overwhelming your context window.',
            inputSchema: z.object({
                filepath: z.string().describe('The relative or absolute path to the file to read.'),
            }),
            execute: async (args: { filepath: string }) => {
                if (onToolStart) onToolStart('read_file', args);
                const { filepath } = args;
                const resolvedPath = path.resolve(cwd, filepath);
                try {
                    const content = await fs.readFile(resolvedPath, 'utf8');
                    if (content.length > 50000) {
                        return content.substring(0, 50000) + '\n\n...[FILE TRUNCATED FOR LENGTH. Use read_file_lines to read further]...';
                    }
                    return content;
                } catch (err: any) {
                    return `Error reading file: ${err.message}`;
                }
            },
        }),
        read_file_lines: tool({
            description: 'Reads a specific range of lines from a file. Extremely useful to avoid flooding your context window when a file is thousands of lines long. If you omit start_line or end_line, it defaults to reading the first 100 lines.',
            inputSchema: z.object({
                filepath: z.string().describe('The relative path to the file.'),
                start_line: z.number().default(1).describe('The line number to start reading from (1-indexed). Defaults to 1.'),
                end_line: z.number().default(100).describe('The line number to stop reading at. Defaults to 100.'),
            }),
            execute: async (args: { filepath: string; start_line: number; end_line: number }) => {
                if (onToolStart) onToolStart('read_file_lines', args);
                const { filepath, start_line, end_line } = args;
                const resolvedPath = path.resolve(cwd, filepath);
                try {
                    const content = await fs.readFile(resolvedPath, 'utf8');
                    const lines = content.split('\n');
                    const startIdx = Math.max(0, start_line - 1);
                    const endIdx = Math.min(lines.length, end_line);
                    
                    if (startIdx >= lines.length) return 'Start line is beyond the end of the file.';
                    
                    const slice = lines.slice(startIdx, endIdx);
                    return slice.map((line, idx) => `${startIdx + idx + 1}: ${line}`).join('\n');
                } catch (err: any) {
                    return `Error reading file lines: ${err.message}`;
                }
            },
        }),
        list_dir: tool({
            description: 'List all files and folders in a specific directory or the root workspace to orient yourself. Use this frequently when entering an unknown project to see what folders exist.',
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
