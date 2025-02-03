import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

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

// Helper function to handle BigInt serialization
function prepareBigIntForJSON(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    ));
}

async function saveDeploymentState(network, deploymentHash, state) {
    const networksPath = await findNetworksRoot(__dirname);
    const deploymentsPath = path.join(networksPath, '.deployments', network);
    
    // Ensure the deployments directory exists
    await ensureDirectoryExists(deploymentsPath);
    
    // Extract logger state and remove it from main state
    const loggerState = state.logs;
    const stateWithoutLogs = { ...state };
    delete stateWithoutLogs.logs;

    // Save the main deployment state
    const deploymentPath = path.join(deploymentsPath, `${deploymentHash}.json`);
    await fs.writeFile(
        deploymentPath, 
        JSON.stringify(prepareBigIntForJSON(stateWithoutLogs), null, 2)
    );
    
    // Save the logger state separately
    const loggerPath = path.join(deploymentsPath, `${deploymentHash}.logs.json`);
    await fs.writeFile(
        loggerPath,
        JSON.stringify(prepareBigIntForJSON(loggerState), null, 2)
    );
    
    return {
        deploymentPath,
        loggerPath
    };
}

export default saveDeploymentState; 