import listNetworkFiles from './listNetworkFiles.js';
import findNetworksRoot from '../utils/findNetworksRoot.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function readNetworkFile() {
    const network = this.network;
    const list = await listNetworkFiles(true);
    const networkFile = list.find(file => 
        file.toLowerCase().includes(network.toLowerCase())
    );

    if (!networkFile) {
        throw new Error(`Network file not found for ${network}`);
    }

    const networksPath = await findNetworksRoot(__dirname);
    
    try {
        const module = await import(path.join(networksPath, `${networkFile}`));
        return module.default || module;
    } catch (error) {
        try {
            const networkFileContent = await fs.readFile(
                path.join(networksPath, networkFile), 
                'utf8'
            );
            return JSON.parse(networkFileContent);
        } catch (jsonError) {
            throw new Error(`Failed to load network configuration for ${network}: ${error.message}`);
        }
    }
}
