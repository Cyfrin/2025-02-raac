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


async function loadDeploymentState(network, deploymentHash) {
    const networksPath = await findNetworksRoot(__dirname);
    const deploymentsPath = path.join(networksPath, '.deployments', network);
    
    // Load main deployment state
    const statePath = path.join(deploymentsPath, `${deploymentHash}.json`);
    const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
    
    // Load logger state if needed
    const loggerPath = path.join(deploymentsPath, `${deploymentHash}.logs.json`);
    const loggerState = JSON.parse(await fs.readFile(loggerPath, 'utf8'));
    
    this.deployedContracts = state.deployedContracts;
    return {
        ...state,
        logs: loggerState
    };
}

export default loadDeploymentState; 