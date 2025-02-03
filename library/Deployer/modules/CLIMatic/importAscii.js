import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function scaleDownAscii(asciiLines, scale = 2) {
    const rows = asciiLines.length;
    const cols = asciiLines[0].length;
    const scaledRows = Math.floor(rows / scale);
    const scaledCols = Math.floor(cols / scale);
    const scaled = [];

    for (let i = 0; i < scaledRows; i++) {
        let newLine = '';
        for (let j = 0; j < scaledCols; j++) {
            // Get 2x2 block of characters
            const block = [
                asciiLines[i * scale][j * scale] || ' ',
                asciiLines[i * scale][j * scale + 1] || ' ',
                asciiLines[i * scale + 1]?.[j * scale] || ' ',
                asciiLines[i * scale + 1]?.[j * scale + 1] || ' '
            ];
            
            // Choose the most prominent character from the block
            const char = block.find(c => c !== ' ') || ' ';
            newLine += char;
        }
        scaled.push(newLine);
    }
    
    return scaled;
}
export function getAscii(scale = 2) {
    const ascii = fs.readFileSync(path.join(__dirname, './ascii.js'), 'utf8');
    const lines = ascii.split('\n')
        .map(line => line.replace(/\u001b\[.*?[A-Za-z]/g, '')); // Clean ANSI sequences
    return scaleDownAscii(lines, scale);
}

