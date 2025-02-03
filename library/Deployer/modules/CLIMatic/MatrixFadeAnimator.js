import chalk from 'chalk';

class MatrixFadeAnimator {
    constructor(ascii) {
        // Ensure ascii is an array and clean any existing ANSI sequences
        this.lines = (Array.isArray(ascii) ? ascii : ascii.split('\n'))
            .map(line => line.replace(/\u001b\[.*?[A-Za-z]/g, ''));
        this.time = 0;
        this.frameDelay = 200;
        this.totalDuration = 500;
        this.matrixState = [];
        this.remainingChars = 0;
        this.onComplete = null;
        this.startTime = null;
        this.initialDelay = 300; // Show original image for 1 second
        this.transitionDuration = 500; // 300ms transition phase

        // Initialize matrix state
        for (let y = 0; y < this.lines.length; y++) {
            this.matrixState[y] = [];
            for (let x = 0; x < this.lines[y].length; x++) {
                if (this.lines[y][x] !== ' ') {
                    this.remainingChars++;
                }
                this.matrixState[y][x] = {
                    falling: false,
                    fallSpeed: 0,
                    char: null,
                    hasFallen: false
                };
            }
        }

        // Simplified color palette for matrix effect
        this.matrixColors = [
            chalk.hex('#00FF00'),
            chalk.hex('#00CC00'),
            chalk.hex('#009900'),
            chalk.hex('#006600'),
        ];
    }

    renderFrame() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;

        // Show original image for initial delay
        if (elapsed < this.initialDelay) {
            return this.lines;
        }

        // Handle transition phase
        const transitionElapsed = elapsed - this.initialDelay;
        const inTransition = transitionElapsed < this.transitionDuration;
        const transitionProgress = inTransition ? transitionElapsed / this.transitionDuration : 1;

        // Calculate acceleration factor based on elapsed time, but only after transition
        const accelerationFactor = Math.pow(1.01 + (elapsed - this.initialDelay - this.transitionDuration) / 2000, Math.pow(1.5, (elapsed - this.initialDelay - this.transitionDuration) / 500));

        const styledLines = this.lines.map((line, y) => {
            return line.split('').map((char, x) => {
                if (char === ' ' || this.matrixState[y][x].hasFallen) {
                    return ' ';
                }

                // During transition, gradually introduce matrix effect
                if (inTransition) {
                    if (Math.random() < 0.05 * transitionProgress) {
                        this.matrixState[y][x].falling = true;
                        this.matrixState[y][x].fallSpeed = 0.1 * transitionProgress;
                        this.matrixState[y][x].char = '01'[Math.floor(Math.random() * 2)];
                    }
                    if (!this.matrixState[y][x].falling) {
                        return char;
                    }
                }

                return this.applyMatrixEffect(char, x, y, accelerationFactor);
            }).join('');
        });

        return styledLines;
    }

    applyMatrixEffect(char, x, y, accelerationFactor) {
        // Initialize falling with increased probability based on acceleration
        if (!this.matrixState[y][x].falling && Math.random() < 0.1 * accelerationFactor) {
            this.matrixState[y][x].falling = true;
            this.matrixState[y][x].fallSpeed = (0.1 + Math.random() * 0.3) * accelerationFactor;
            this.matrixState[y][x].char = '01'[Math.floor(Math.random() * 2)];
        }

        // Handle falling animation
        if (this.matrixState[y][x].falling) {
            this.matrixState[y][x].fallSpeed *= 1.1 * accelerationFactor;
            
            if (this.matrixState[y][x].fallSpeed > 1) {
                this.matrixState[y][x].falling = false;
                this.matrixState[y][x].hasFallen = true;
                this.remainingChars--;
                return ' ';
            }

            const fadeFactor = 1 - this.matrixState[y][x].fallSpeed;
            const colorIndex = Math.floor(fadeFactor * this.matrixColors.length);
            
            if (colorIndex >= 0 && colorIndex < this.matrixColors.length) {
                return this.matrixColors[colorIndex](this.matrixState[y][x].char);
            }
            return ' ';
        }

        return char;
    }

    start(displayerFunction) {
        if (!displayerFunction) return;
        
        this.startTime = Date.now();
        
        this.intervalId = setInterval(() => {
            const styledLines = this.renderFrame();
            displayerFunction(styledLines);
            
            if (this.remainingChars <= 32) {
                clearInterval(this.intervalId);
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        }, this.frameDelay);
    }
}

export { MatrixFadeAnimator };