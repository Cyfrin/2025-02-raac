import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
    
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function findDeploymentsRoot() {
    let currentDir = __dirname;
    const maxDepth = 6;
    let depth = 0;

    while (depth < maxDepth) {
        try {
            const deploymentsPath = path.join(currentDir, 'networks/.deployments');
            await fs.access(deploymentsPath);
            return deploymentsPath;
        } catch (error) {
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break;
            }
            currentDir = parentDir;
            depth++;
        }
    }
    throw new Error('Could not find deployments directory within 5 levels up');
}