import { getAscii } from './importAscii.js';
import chalk from 'chalk';

const colors = [
    chalk.cyan,
    chalk.blue,
    chalk.magenta,
    chalk.blue,
    chalk.cyan
];

const ascii = getAscii();
const lines = ascii.split('\n');

let time = 0;
setInterval(() => {
    console.clear();
    const coloredLines = lines.map((line, y) => {
        return line.split('').map((char, x) => {
            if (char === ' ') return char;
            
            // Create a gentler wave pattern
            const wave = Math.sin((x + y + time) / 5) * 0.3 + 0.5;
            
            // Create a smoother radial pattern from center
            const centerX = lines[0].length / 2;
            const centerY = lines.length / 2;
            const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const radial = (Math.sin(distanceFromCenter / 6 - time * 0.5) + 1) / 2;
            
            // Combine patterns with slower transition
            const colorPosition = (wave + radial + time * 0.3) / 2;
            const colorIndex = Math.floor(colorPosition * colors.length) % colors.length;
            
            // Reduce brightness variations
            const bright = Math.random() > 0.97 ? chalk.bold : (str) => str;
            
            // Reduce sparkle frequency
            if (Math.random() > 0.98) {
                return chalk.white(char);
            }
            
            return bright(colors[colorIndex](char));
        }).join('');
    });
    console.log(coloredLines.join('\n'));
    time += 0.1;
}, 100);