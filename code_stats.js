import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INCLUDE_DIRS = ['contracts/core/collectors', 'contracts/core/pools', 'contracts/core/tokens', 'contracts/core/minters', 'contracts/core/oracles', 'contracts/core/primitives']

function findSolFiles(dirs, fileList = []) {
    dirs.forEach(dir => {
        const targetDir = path.resolve(__dirname, dir);
        if (!fs.existsSync(targetDir)) {
            console.error(`Warning: Directory "${targetDir}" not found.`);
            return;
        }
        const files = fs.readdirSync(targetDir);
        files.forEach((file) => {
            const filePath = path.join(targetDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                findSolFiles([filePath], fileList);
            } else if (file.endsWith('.sol')) {
                fileList.push(filePath);
            }
        });
    });
    return fileList;
}

// Function to analyze file content
function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let stats = {
        total: lines.length,
        documentation: 0, // NatSpec and regular comments
        pragma: 0, // Pragma and import statements
        definition: 0, // Contract/interface/library definitions
        code: 0 // Actual code
    };

    let inMultilineComment = false;

    lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) return;

        //  multiline comments
        if (trimmedLine.startsWith('/*') || trimmedLine.startsWith('/**')) {
            inMultilineComment = true;
            stats.documentation++;
            return;
        }
        
        if (inMultilineComment) {
            stats.documentation++;
            if (trimmedLine.endsWith('*/')) {
                inMultilineComment = false;
            }
            return;
        }

        // Single line comments
        if (trimmedLine.startsWith('//')) {
            stats.documentation++;
            return;
        }

        // Pragma and imports
        if (trimmedLine.startsWith('pragma') || trimmedLine.startsWith('import')) {
            stats.pragma++;
            return;
        }

        // Contract/interface/library definitions
        if (trimmedLine.startsWith('contract') || 
            trimmedLine.startsWith('interface') || 
            trimmedLine.startsWith('library')) {
            stats.definition++;
            return;
        }

        // Everything else is considered code
        stats.code++;
    });

    return stats;
}

// Main function
function main(dirs) {
    const solFiles = findSolFiles(dirs);
    let totalStats = {
        total: 0,
        documentation: 0,
        pragma: 0,
        definition: 0,
        code: 0
    };

    const fileStats = solFiles.map(file => {
        const stats = analyzeFile(file);
        // Add to totals
        Object.keys(totalStats).forEach(key => {
            totalStats[key] += stats[key];
        });
        
        return {
            file: path.relative(path.resolve(__dirname, '../../'), file),
            ...stats,
            codePercentage: ((stats.code / stats.total) * 100).toFixed(2) + '%'
        };
    });

    const totalWithPercentages = {
        ...totalStats,
        codePercentage: ((totalStats.code / totalStats.total) * 100).toFixed(2) + '%'
    };

    console.log('\nFile Statistics:');
    console.table(fileStats);

    console.log('\nTotal Statistics:');
    console.table([totalWithPercentages]);
}

console.log('-------------------------------- CORE --------------------------------');
main(INCLUDE_DIRS);
console.log('-------------------------------- LIBRARIES --------------------------------');
main(['contracts/libraries']);
