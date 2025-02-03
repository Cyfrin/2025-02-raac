import readNetworkFile from './methods/readNetworkFile.js';
import readArtifactFile from './methods/readArtifactFile.js';
import listNetworkFiles from './methods/listNetworkFiles.js';
import saveDeploymentState from './methods/saveDeploymentState.js';
import listDeploymentFiles from './methods/listDeploymentFiles.js';
import readDeploymentStateFile from './methods/readDeploymentStateFile.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StateAdapter {
    constructor(network) {
        this.network = network;
        this.dirname = __dirname;
    }
}

StateAdapter.prototype.listNetworkFiles = listNetworkFiles;
StateAdapter.prototype.listDeploymentFiles = listDeploymentFiles;
StateAdapter.prototype.readNetworkFile = readNetworkFile;
StateAdapter.prototype.readArtifactFile = readArtifactFile;
StateAdapter.prototype.saveDeploymentState = saveDeploymentState;
StateAdapter.prototype.readDeploymentStateFile = readDeploymentStateFile;

export default StateAdapter;