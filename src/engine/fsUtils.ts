import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import * as path from 'node:path';

export class FileSystemError extends Error {
    constructor(message: string, public readonly originalError?: unknown) {
        super(message);
        this.name = 'FileSystemError';
    }
}

export async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function readText(path: string): Promise<string> {
    try {
        return await fs.readFile(path, 'utf8');
    } catch (error) {
        throw new FileSystemError(`Failed to read file at ${path}`, error);
    }
}

export async function writeText(path: string, content: string): Promise<void> {
    try {
        await fs.writeFile(path, content, 'utf8');
    } catch (error) {
        throw new FileSystemError(`Failed to write file at ${path}`, error);
    }
}

export async function readDir(path: string): Promise<string[]> {
    try {
        return await fs.readdir(path);
    } catch (error) {
        throw new FileSystemError(`Failed to read directory at ${path}`, error);
    }
}

export async function isDirectory(path: string): Promise<boolean> {
    try {
        const stats = await fs.stat(path);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.wren', '.brain', '.idea', '.vscode']);

export async function readDirRecursive(dirPath: string): Promise<string[]> {
    const results: string[] = [];
    async function crawl(currentPath: string) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (IGNORED_DIRS.has(entry.name)) continue;
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    await crawl(fullPath);
                } else {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore permission errors or unreadable directories
        }
    }
    await crawl(dirPath);
    return results;
}

export async function searchFiles(cwd: string, pattern: string): Promise<string[]> {
    const files = await readDirRecursive(cwd);
    const matches: string[] = [];
    const regex = new RegExp(pattern, 'i'); // Case insensitive search
    
    // Process files in batches to avoid memory issues with large repos
    const BATCH_SIZE = 50;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (filePath) => {
            try {
                // Read a chunk to check if it's binary or too large? For now we just read text.
                const content = await fs.readFile(filePath, 'utf8');
                if (regex.test(content)) {
                    // We can also extract the exact line if we wanted, but for now returning the file paths that match
                    // Or we can return line snippets:
                    const lines = content.split('\n');
                    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                        if (regex.test(lines[lineNum]!)) {
                            const relativePath = path.relative(cwd, filePath);
                            matches.push(`${relativePath}:${lineNum + 1}: ${lines[lineNum]!.trim()}`);
                            // Stop after max 3 matches per file to avoid huge outputs
                            if (matches.filter(m => m.startsWith(relativePath)).length >= 3) break;
                        }
                    }
                }
            } catch (err) {
                // Ignore binary files or read errors
            }
        }));
        
        if (matches.length > 50) break; // Limit total results to keep context small
    }
    
    return matches.slice(0, 50);
}
