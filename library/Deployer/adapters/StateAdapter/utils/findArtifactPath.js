import fsSync from 'fs';
import path from 'path';

export default function findArtifactPath(contractName, rootDir) {
    const entries = fsSync.readdirSync(rootDir, { withFileTypes: true });
    
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
