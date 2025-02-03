import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findNetworksRoot(startDir) {
    let currentDir = startDir;
    const maxDepth = 5;
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

async function readNetworkFile(network) {
    const list = await this.listNetworkFiles(true);
    const networkFile = list.find(file => 
        file.toLowerCase().includes(network.toLowerCase())
    );

    if (!networkFile) {
        throw new Error(`Network file not found for ${network}`);
    }

    const networksPath = await findNetworksRoot(__dirname);
    
    try {
        const module = await import(path.join(networksPath, `${networkFile}.js`));
        return module.default || module;
    } catch (error) {
        try {
            const networkFileContent = await fs.readFile(
                path.join(networksPath, `${networkFile}.json`), 
                'utf8'
            );
            return JSON.parse(networkFileContent);
        } catch (jsonError) {
            throw new Error(`Failed to load network configuration for ${network}: ${error.message}`);
        }
    }
}

export default readNetworkFile;