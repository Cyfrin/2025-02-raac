import ensureDirectoryExists from '../utils/ensureDirectoryExists.js';
import findDeploymentsRoot from '../utils/findDeploymentsRoot.js';
import prepareBigIntForJSON from '../utils/prepareBigIntForJSON.js';
import path from 'path';
import fs from 'fs/promises';

export default async function saveDeploymentState(state) {
    const network = this.network;
    const dirname = this.dirname;

    const deploymentsPath = await findDeploymentsRoot(dirname);

    await ensureDirectoryExists(deploymentsPath);
    
    // Extract logger state and remove it from main state
    const loggerState = state.logs;
    const stateWithoutLogs = { ...state };
    delete stateWithoutLogs.logs;

    const timestamp = state.timestamp;
    const deploymentHash = state.deploymentHash;
    if(!timestamp || !deploymentHash) {
        throw new Error('Timestamp and deployment hash are required');
    }

    // Save the main deployment state
    const deploymentPath = path.join(deploymentsPath, `${timestamp}_${deploymentHash}.json`);
    await fs.writeFile(
        deploymentPath, 
        JSON.stringify(prepareBigIntForJSON(stateWithoutLogs), null, 2)
    );
    
    const loggerPath = path.join(deploymentsPath, `${timestamp}_${deploymentHash}.logs.json`);

    if (loggerState) {
        // Save the logger state separately
        await fs.writeFile(
            loggerPath,
            JSON.stringify(prepareBigIntForJSON(loggerState), null, 2)
        );
    }
    
    return {
        deploymentPath,
        loggerPath
    };
} 