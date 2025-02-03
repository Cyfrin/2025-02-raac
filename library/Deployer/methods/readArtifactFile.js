import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findArtifactsRoot(startDir) {
    let currentDir = startDir;
    const maxDepth = 5; // Prevent infinite loop
    let depth = 0;

    while (depth < maxDepth) {
        try {
            // Check if 'artifacts/contracts' exists in current directory
            const artifactsPath = path.join(currentDir, 'artifacts', 'contracts');
            fs.accessSync(artifactsPath);
            return artifactsPath; // Found it!
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
    throw new Error('Could not find artifacts directory within 5 levels up');
}

function findArtifactPath(contractName, rootDir) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        
        if (entry.isDirectory()) {
            const result = findArtifactPath(contractName, fullPath);
            if (result) return result;
        } else if (entry.isFile() && 
                   entry.name === `${contractName}.json` && 
                   fullPath.includes(`${contractName}.sol`)) {
            return fullPath;
        }
    }
    return null;
}

function readArtifactFile(contractName, overrideRootPath) {
    const rootPath = overrideRootPath || findArtifactsRoot(__dirname);
    const artifactPath = findArtifactPath(contractName, rootPath);
    
    if (!artifactPath) {
        throw new Error(`Artifact not found for contract ${contractName}`);
    }

    const artifact = fs.readFileSync(artifactPath, 'utf8');
    return JSON.parse(artifact);
}

export default readArtifactFile;