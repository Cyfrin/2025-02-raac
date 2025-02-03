import findDeploymentsRoot from '../utils/findDeploymentsRoot.js';
import fs from 'fs/promises';
import path from 'path';

export default async function listDeploymentFiles(includeExtension = false) {
    const dirname = this.dirname;
    const deploymentsPath = await findDeploymentsRoot(dirname);

    // if the folder does not exist, return an empty array
    if (!(await fs.access(`${deploymentsPath}/${this.network}`).then(() => true).catch(() => false))) {
        return [];
    }

    const files = await fs.readdir(`${deploymentsPath}/${this.network}`);
    return files
        .filter(file => file.endsWith('.js') || file.endsWith('.json'))
        .map(file => includeExtension ? file : path.parse(file).name);
}