import { getAscii } from './importAscii.js';
import chalk from 'chalk';

class AsciiAnimator {
    constructor(ascii) {
        this.ascii = ascii;
        this.lines = this.ascii;
        this.time = 0;
        this.frameDelay = 200;
        this.totalDuration = 2; // Extended for smoother transitions
        this.matrixState = []; // Track falling characters
        this.remainingChars = 0; // Track remaining non-empty characters

        // Initialize matrix state
        for (let y = 0; y < this.lines.length; y++) {
            this.matrixState[y] = [];
            for (let x = 0; x < this.lines[0].length; x++) {
                if (this.lines[y][x] !== ' ') {
                    this.remainingChars++;
                }
                this.matrixState[y][x] = {
                    falling: false,
                    fallSpeed: 0,
                    char: null,
                    hasFallen: false // Track if character has completed falling
                };
            }
        }

        // Define phases in logical order with effects and their intensities
        this.phases = [
            {
                name: 'initial',
                start: 0,
                end: 0.1,
                effects: {
                    raw: { temp: 1 }
                }
            },
            {
                name: 'fadeIn',
                start: 0.12,
                end: 0.3,
                effects: {
                    raw: { temp: 0.8 },
                    monochrome: { temp: 0.2 }
                }
            },
            {
                name: 'gentleColor',
                start: 0.25,
                end: 0.45,
                effects: {
                    monochrome: { temp: 0.7 },
                    gentle: { temp: 0.3 }
                }
            },
            {
                name: 'coloredWaves',
                start: 0.4,
                end: 0.6,
                effects: {
                    wave: { temp: 0.4 },
                    gentle: { temp: 0.6 }
                }
            },
            {
                name: 'pulsingColors',
                start: 0.55,
                end: 0.75,
                effects: {
                    wave: { temp: 0.3 },
                    pulse: { temp: 0.4 },
                    color: { temp: 0.5 }
                }
            },
            {
                name: 'complexPatterns',
                start: 0.7,
                end: 0.85,
                effects: {
                    wave: { temp: 0.3 },
                    pulse: { temp: 0.3 },
                    complex: { temp: 0.4 },
                    sparkle: { temp: 0.2 }
                }
            },
            {
                name: 'fullIntensity',
                start: 0.8,
                end: 0.9,
                effects: {
                    complex: { temp: 0.5 },
                    sparkle: { temp: 0.3 },
                    rich: { temp: 0.6 }
                }
            },
            {
                name: 'matrixFade',
                start: 0.87,
                end: 0.93,
                effects: {
                    matrix: { temp: 0.8 },
                    fade: { temp: 0.6 }
                }
            }
        ];

        this.phases = [
            {
                name: 'initial',
                start: 0,
                end: 0.5,
                effects: { raw: { temp: 1 } }
            },  
            {
                name: 'matrixFade',
                start: 0.5,
                end: 1,
                effects: {
                    matrix: { temp: 0.8 },
                    fade: { temp: 0.6 }
                }
            },
          
        ]

        this.colorPalettes = {
            monochrome: [chalk.white, chalk.gray],
            gentle: [
                chalk.hex('#E6F3FF'), // Very light blue
                chalk.hex('#CCE7FF'), // Light blue
                chalk.hex('#B3DBFF')  // Slightly darker but still light blue
            ],
            rich: [
                chalk.hex('#FFD700'),
                chalk.hex('#FFA500'),
                chalk.hex('#FF4500'),
                chalk.hex('#FF0000'),
                chalk.hex('#8B0000'),
                chalk.hex('#4169E1'),
                chalk.hex('#1E90FF'),
                chalk.hex('#00BFFF'),
                chalk.hex('#C0C0C0'),
                chalk.hex('#B8860B'),
            ],
            matrix: [
                chalk.hex('#00FF00'),
                chalk.hex('#00CC00'),
                chalk.hex('#009900'),
                chalk.hex('#006600'),
            ]
        };
    }

    getActivePhase(progress) {
        return this.phases.find(phase => 
            progress >= phase.start && progress <= phase.end
        );
    }

    getEffectStrength(effectName, progress) {
        const currentPhase = this.getActivePhase(progress);
        if (!currentPhase) return 0;

        const effect = currentPhase.effects[effectName];
        if (!effect) return 0;

        const phaseProgress = (progress - currentPhase.start) / (currentPhase.end - currentPhase.start);
        return effect.temp * this.smoothStep(phaseProgress);
    }

    smoothStep(x) {
        return x * x * (3 - 2 * x); // Smooth interpolation
    }

    renderFrame(displayerFunction) {
        console.clear();
        const progress = Math.min(1, this.time / this.totalDuration);

        const styledLines = this.lines.map((line, y) => {
            return line.split('').map((char, x) => {
                if (char === ' ' || this.matrixState[y][x].hasFallen) return ' ';
                return this.styleCharacter(char, x, y, progress);
            });
        });

        displayerFunction(styledLines.map(line => line.join('')));
        this.time += 0.1;

        // Check if animation should end (all characters have fallen)
        if (this.remainingChars === 0) {
            console.log("Animation complete - all characters have fallen");
            process.exit(0);
        }
    }

    styleCharacter(char, x, y, progress) {
        const centerX = this.lines[0].length / 2;
        const centerY = this.lines.length / 2;
        const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

        // Raw effect (unmodified character)
        const rawStrength = this.getEffectStrength('raw', progress);
        if (rawStrength > 0.8) return char;

        // Matrix fade effect with falling animation
        const matrixStrength = this.getEffectStrength('matrix', progress);
        if (matrixStrength > 0) {
            const fadeStrength = this.getEffectStrength('fade', progress);
            
            // Initialize falling if not already
            if (!this.matrixState[y][x].falling && Math.random() < matrixStrength * 0.1) {
                this.matrixState[y][x].falling = true;
                this.matrixState[y][x].fallSpeed = 0.1 + Math.random() * 0.3;
                this.matrixState[y][x].char = '01'[Math.floor(Math.random() * 2)];
            }

            // Handle falling animation
            if (this.matrixState[y][x].falling) {
                // Increase fall speed over time
                this.matrixState[y][x].fallSpeed *= 1.1;
                
                // If character has "fallen" too far, remove it
                if (this.matrixState[y][x].fallSpeed > 1) {
                    this.matrixState[y][x].falling = false;
                    this.matrixState[y][x].hasFallen = true;
                    this.remainingChars--;
                    return ' ';
                }

                // Calculate fade based on fall speed
                const fadeFactor = 1 - this.matrixState[y][x].fallSpeed;
                const colorIndex = Math.floor(fadeFactor * this.colorPalettes.matrix.length);
                
                if (colorIndex >= 0 && colorIndex < this.colorPalettes.matrix.length) {
                    return this.colorPalettes.matrix[colorIndex](this.matrixState[y][x].char);
                }
                return ' ';
            }

            // Regular matrix effect for non-falling characters
            if (Math.random() < fadeStrength) {
                return ' ';
            }
        }

        // Calculate combined wave effects
        let effectValue = 0.5;
        const waveStrength = this.getEffectStrength('wave', progress);
        if (waveStrength > 0) {
            const baseWave = Math.sin((x + y + this.time) / 5) * 0.5 + 0.5;
            effectValue = effectValue * (1 - waveStrength) + baseWave * waveStrength;
        }

        const pulseStrength = this.getEffectStrength('pulse', progress);
        if (pulseStrength > 0) {
            const pulse = (Math.sin(distanceFromCenter / 4 - this.time * 0.8) + 1) / 2;
            effectValue = effectValue * (1 - pulseStrength) + pulse * pulseStrength;
        }

        const complexStrength = this.getEffectStrength('complex', progress);
        if (complexStrength > 0) {
            const complexWave = Math.sin((x - this.time * 2) / 3) * Math.cos((y + this.time) / 4);
            effectValue = effectValue * (1 - complexStrength) + complexWave * complexStrength;
        }

        // Color selection based on active effects
        let selectedColor;
        const richStrength = this.getEffectStrength('rich', progress);
        const gentleStrength = this.getEffectStrength('gentle', progress);
        
        if (richStrength > 0) {
            const colorIndex = Math.floor((effectValue + this.time * 0.1) * this.colorPalettes.rich.length) % this.colorPalettes.rich.length;
            selectedColor = this.colorPalettes.rich[colorIndex];
        } else if (gentleStrength > 0) {
            const colorIndex = Math.floor(effectValue * this.colorPalettes.gentle.length) % this.colorPalettes.gentle.length;
            selectedColor = this.colorPalettes.gentle[colorIndex];
        } else {
            selectedColor = this.colorPalettes.monochrome[0];
        }

        // Special effects
        const sparkleStrength = this.getEffectStrength('sparkle', progress);
        if (sparkleStrength > 0 && Math.random() > (0.99 - sparkleStrength * 0.1)) {
            const specialChars = ['★', '✧', '⚡', '✦', '✴'];
            return chalk.white.bold(specialChars[Math.floor(Math.random() * specialChars.length)]);
        }

        // Apply very subtle brightness variation
        const brightness = Math.sin((x + y + this.time * 2) / 8) * Math.cos((x - y + this.time * 3) / 10);
        const finalBrightness = brightness > 0.7 ? chalk.bold : (str) => str;

        if(!selectedColor) return finalBrightness(char);
        return finalBrightness(selectedColor(char));
    }

    start(displayerFunction) {
        setInterval(() => this.renderFrame(displayerFunction), this.frameDelay);
    }
}

export default AsciiAnimator;