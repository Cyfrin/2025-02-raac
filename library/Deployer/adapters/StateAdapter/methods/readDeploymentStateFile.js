import findDeploymentsRoot from '../utils/findDeploymentsRoot.js';
import fs from 'fs/promises';
import path from 'path';

export default async function readDeploymentStateFile() {
    const network = this.network;
    const dirname = this.dirname;

    const list = await this.listDeploymentFiles(true);

    // List of form {TS}_{TX_HASH}.json, when there is many files, select the latest one by timestamp
    const latestFile = list.sort((a, b) => b.split('_')[0] - a.split('_')[0])[0];

    if (!latestFile) {
        throw new Error(`No deployment state file found for ${network}`);
    }

    const deploymentsPath = await findDeploymentsRoot(dirname);
    const deploymentStateFile = await fs.readFile(
        path.join(deploymentsPath, `${network}/${latestFile}`), 
        'utf8'
    );

    const deploymentState = JSON.parse(deploymentStateFile);

    try {
        const loggerStateFile = await fs.readFile(
            path.join(deploymentsPath, `${network}/${latestFile}.logs.json`), 
            'utf8'
        );
        const loggerState = JSON.parse(loggerStateFile);
        deploymentState.logs = loggerState;
    } catch (error) {
        console.error(`No logger state file found for ${network}`);
    }

    return deploymentState;
}