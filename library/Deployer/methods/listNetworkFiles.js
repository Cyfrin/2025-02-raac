import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findNetworksRoot(startDir) {
    let currentDir = startDir;
    const maxDepth = 5; // Prevent infinite loop
    let depth = 0;

    while (depth < maxDepth) {
        try {
            // Check if 'networks' directory exists
            const networksPath = path.join(currentDir, 'networks');
            await fs.access(networksPath);
            return networksPath; // Found it!
        } catch (error) {
            // Go up one directory
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                // We've reached the root directory
                break;
            }
            currentDir = parentDir;
            depth++;
        }
    }
    throw new Error('Could not find networks directory within 5 levels up');
}

async function listNetworkFiles(removeExtension = false) {
    const networksPath = await findNetworksRoot(__dirname);
    const files = await fs.readdir(networksPath);
    
    if (removeExtension) {
        return files.map(file => path.parse(file).name);
    }
    return files;
}

export default listNetworkFiles;