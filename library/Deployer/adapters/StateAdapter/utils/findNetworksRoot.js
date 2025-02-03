import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
    
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function findNetworksRoot() {
    let currentDir = __dirname;
    const maxDepth = 6;
    let depth = 0;

    while (depth < maxDepth) {
        try {
            const networksPath = path.join(currentDir, 'networks');
            await fs.access(networksPath);
            return networksPath;
        } catch (error) {
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break;
            }
            currentDir = parentDir;
            depth++;
        }
    }
    throw new Error('Could not find networks directory within 5 levels up');
}