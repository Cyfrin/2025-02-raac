import findNetworksRoot from '../utils/findNetworksRoot.js';
import path from 'path';
import fs from 'fs/promises';

export default async function listNetworkFiles(includeExtension = false) {
    const dirname = this.dirname;
    const networksPath = await findNetworksRoot(dirname);
    console.log(networksPath);
    const files = await fs.readdir(networksPath);
    return files
        .filter(file => file.endsWith('.js') || file.endsWith('.json'))
        .map(file => includeExtension ? file : path.parse(file).name);
}