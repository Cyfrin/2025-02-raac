import findArtifactsRoot from '../utils/findArtifactsRoot.js';
import findArtifactPath from '../utils/findArtifactPath.js';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function readArtifactFile(contractName, overrideRootPath) {
    const rootPath = overrideRootPath || findArtifactsRoot(__dirname);
    const artifactPath = findArtifactPath(contractName, rootPath);
    
    if (!artifactPath) {
        throw new Error(`Artifact not found for contract ${contractName}`);
    }

    const artifact = fsSync.readFileSync(artifactPath, 'utf8');
    return JSON.parse(artifact);
}