import chalk from 'chalk';

import { calculateHiddenTextLength } from '../utils/ansii.js';

class Frame {
    constructor(name, config = {}) {
        this.name = name;
        this.relativeX = config.relativeX || 0;
        this.relativeY = config.relativeY || 0;
        this.relativeWidth = config.relativeWidth || 1;
        this.relativeHeight = config.relativeHeight || 1;
        
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        
        this.content = [];
        this.region = null;
        this.isDirty = true;
        this.contentRenderer = null;
        this.lastRenderedContent = [];
        this.renderCount = 0;
        this.previousRenderer = null;
    }

    calculateDimensions() {
        if (!this.region) return;
        
        this.width = Math.max(2, Math.floor(this.region.width * this.relativeWidth));
        this.height = Math.max(2, Math.floor(this.region.height * this.relativeHeight));
        this.x = Math.floor(this.region.width * this.relativeX);
        this.y = Math.floor(this.region.height * this.relativeY);

        this.width = Math.min(this.width, Math.max(2, this.region.width - this.x));
        this.height = Math.min(this.height, Math.max(2, this.region.height - this.y));
    }

    setRegion(region) {
        this.region = region;
        this.calculateDimensions();
        if (region.window) {
            region.window.selectionManager.registerFrame(this);
        }
        return this;
    }

    resize(relativeWidth, relativeHeight) {
        this.relativeWidth = Math.min(1, Math.max(0, relativeWidth));
        this.relativeHeight = Math.min(1, Math.max(0, relativeHeight));
        this.calculateDimensions();
        this.markDirty();
    }

    setContent(renderer) {
        this.contentRenderer = renderer;
        if(!renderer.setFrame) {
            setTimeout(() => {
                console.log(`${renderer.constructor.name} has no setFrame method, adding it`);
            }, 10);
            renderer.setFrame = (frame) => {
                renderer.frame = frame;
                return renderer;
            }
        }
        renderer.setFrame(this);
        return this;
    }

    getBorderChars() {
        const chars = {
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰',
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│'
        };

        return chars;
    }

    getBorders() {
        const lines = [];
        const selectionManager = this.region?.window?.selectionManager;
        const borderStyle = selectionManager ? 
            selectionManager.getBorderStyle(this) : 
            chalk.gray;
        
        // Ensure minimum dimensions
        const safeWidth = Math.max(2, this.width);  // Minimum width of 2
        const safeHeight = Math.max(2, this.height); // Minimum height of 2
        
        const chars = this.getBorderChars();
        
        // Calculate safe content width
        const STYLE_OVERHEAD = 5;
        const BORDER_WIDTH = 2;
        const contentWidth = Math.max(1, safeWidth - (STYLE_OVERHEAD + BORDER_WIDTH));
        
        // Create title with safe length
        const title = ` ${this.name} (${safeHeight} x ${safeWidth}. Render: ${this.renderCount}) `;
        const titleStart = Math.max(0, Math.floor((contentWidth - title.length) / 2));
        const remainingSpace = Math.max(0, contentWidth - titleStart - title.length);

        // Create top border with safe lengths
        const topBorder = chars.topLeft +
            chars.horizontal.repeat(titleStart) +
            title + 
            chars.horizontal.repeat(remainingSpace) +
            chars.topRight;
        lines.push(borderStyle(topBorder));

        // Create middle lines with safe width
        for (let i = 1; i < safeHeight - 1; i++) {
            const middleBorder = chars.vertical + 
                ' '.repeat(Math.max(0, contentWidth)) + 
                chars.vertical;
            lines.push(borderStyle(middleBorder));
        }

        // Create bottom border with safe width
        const bottomBorder = chars.bottomLeft + 
            chars.horizontal.repeat(Math.max(0, contentWidth)) + 
            chars.bottomRight;
        lines.push(borderStyle(bottomBorder));

        return lines;
    }

    render(fullRender = false) {
        this.renderCount++;
        if (this.region?.window?.cli?.isPaused) {
            return this.lastRenderedContent || [];
        }

        const borders = this.getBorders();
        const chars = this.getBorderChars();
        
        let content = [];
        if (this.contentRenderer) {
            content = this.contentRenderer.render(fullRender);
        } else {
            content = this.content;
        }
        
        const firstLine = borders[0];
        const lastLine = borders[borders.length - 1];
        const middleLines = borders.slice(1, -1);

        let logs = ['test'];
        // Process middle lines
        for(let i = 0; i < middleLines.length; i++) {
            const borderFirstAt = middleLines[i].indexOf(chars.vertical) + 1;
            const borderLastAt = middleLines[i].lastIndexOf(chars.vertical) - 1;
            
            const beginning = middleLines[i].slice(0, borderFirstAt);
            const ending = middleLines[i].slice(borderLastAt);
            // console.error(middleLines[i]);
            
            // Calculate available space for content
            // Get content for this line or use empty space
            const contentLine = content[i] || '';
            let middle;
            const hiddenLength = calculateHiddenTextLength(contentLine);
            const availableSpace = middleLines[i].length - borderFirstAt - (middleLines[i].length - borderLastAt);
            middle = contentLine.padEnd(availableSpace, ' ');
            if(hiddenLength > 0) {
                middle = middle.slice(0, middle.length - hiddenLength) + ' '.repeat(hiddenLength * 2);
            }
            middleLines[i] = beginning + middle + ending;
        }

        this.lastRenderedContent = [
            firstLine,
            ...middleLines,
            lastLine
        ];

        // console.log('Rendering frame', this.name, JSON.stringify(this.lastRenderedContent.length));

        return this.lastRenderedContent;
    }

    markDirty() {
        this.isDirty = true;
        if (this.region?.window?.screen) {
            this.region.window.screen.queueFrame(this);
        }
        return this;
    }

    markClean() {
        this.isDirty = false;
        return this;
    }

    needsUpdate() {
        return this.isDirty;
    }

    isActive() {
        const selectionManager = this.region?.window?.selectionManager;
        return selectionManager ? selectionManager.isFrameSelected(this) : false;
    }

    handleMouseEvents(event) {
        // console.log('handleMouseEvents', event);
        return false;
    }

    handleKeypress(event) {
        // Propagate to content renderer if it exists and has handleKeypress method
        if (this.contentRenderer && typeof this.contentRenderer.handleKeypress === 'function') {
            const handled = this.contentRenderer.handleKeypress(event);
            if (handled) {
                this.markDirty();
                return true;
            }
        }
        return false;
    }

    setContentRenderer(renderer) {
        if (this.contentRenderer) {
            this.contentRenderer.cleanup?.();
        }
        this.contentRenderer = renderer;
        if (renderer) {
            renderer.setFrame(this);
        }
        this.markDirty();
        return this;
    }

    // async prompt(promptText, options = {}) {
    //     const InputRenderer = (await import('../renderers/InputRenderer.js')).default;
        
    //     // Store current renderer
    //     this.previousRenderer = this.contentRenderer;
        
    //     return new Promise((resolve, reject) => {
    //         const inputRenderer = new InputRenderer({
    //             placeholder: promptText,
    //             echo: options.echo !== false,
    //             inputType: options.inputType || 'text',
    //             onSubmit: (value) => {
    //                 if (options.onComplete) {
    //                     options.onComplete();
    //                 }
    //                 resolve(value);
    //             }
    //         });
            
    //         this.setContentRenderer(inputRenderer);
    //     });
    // }
}

export default Frame;