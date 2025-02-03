import fsSync from 'fs';
import path from 'path';

export default function findArtifactsRoot(startDir) {
    let currentDir = startDir;
    const maxDepth = 6;
    let depth = 0;

    while (depth < maxDepth) {
        try {
            const artifactsPath = path.join(currentDir, 'artifacts', 'contracts');
            fsSync.accessSync(artifactsPath);
            return artifactsPath;
        } catch (error) {
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break;
            }
            currentDir = parentDir;
            depth++;
        }
    }
    throw new Error('Could not find artifacts directory within 5 levels up');
}
