import chalk from 'chalk';

import { calculateHiddenTextLength } from '../utils/ansii.js';

class Region {
    constructor(name, config = {}) {
        this.name = name;
        this.frames = [];
        this.relativeX = config.relativeX || 0;
        this.relativeY = config.relativeY || 0;
        this.relativeWidth = config.relativeWidth || 1;
        this.relativeHeight = config.relativeHeight || 1;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.window = null;
    }

    calculateDimensions() {
        if (!this.window) return;
        
        this.width = Math.floor(this.window.width * this.relativeWidth);
        this.height = Math.floor(this.window.height * this.relativeHeight);
        this.x = Math.floor(this.window.width * this.relativeX);
        this.y = Math.floor(this.window.height * this.relativeY);

        this.frames.forEach(frame => frame.calculateDimensions());
    }

    setWindow(window) {
        this.window = window;
        return this;
    }

    addFrame(frame) {
        this.frames.push(frame);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    resize(relativeWidth, relativeHeight) {
        this.relativeWidth = Math.min(1, Math.max(0, relativeWidth));
        this.relativeHeight = Math.min(1, Math.max(0, relativeHeight));
        this.calculateDimensions();
    }

    getBorders() {
        const lines = [];
        
        // Just create empty lines for the region space
        for (let i = 0; i < this.height; i++) {
            lines.push(' '.repeat(this.width));
        }

        return lines;
    }

    render(fullRender = false) {
        this.calculateDimensions();
        const lines = this.getBorders();
        
        const hasUpdates = this.frames.some(frame => frame.needsUpdate());
        
        if (hasUpdates || fullRender) {
            this.frames.forEach(frame => {
                const frameLines = frame.render(fullRender);

                frameLines.forEach((line, index) => {
                    const lineIndex = frame.y + index;
                    if (lineIndex >= 0 && lineIndex < this.height) {

                        // Calculate start position for frame content
                        const startPos = frame.x;

                        let availableWidth;
                        //  availableWidth = this.width - startPos + calculateHiddenTextLength(line);
                         availableWidth = this.width - startPos;

                        if(calculateHiddenTextLength(line) > 0 ) {
                            availableWidth = availableWidth + calculateHiddenTextLength(line);
                        }
                        // Ensure we don't exceed region boundaries
                        const frameLine = line.slice(0, availableWidth);
                        
                        // Insert frame line at correct position
                        lines[lineIndex] = 
                            lines[lineIndex].slice(0, startPos) + 
                            frameLine + 
                            lines[lineIndex].slice(startPos + frameLine.length);
                    }
                });
                frame.markClean();
            });
        }


        return lines;
    }
}

export default Region;