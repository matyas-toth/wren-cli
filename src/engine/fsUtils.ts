import fs from 'node:fs/promises';
import { constants } from 'node:fs';

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
