import CursorManager from '../screen/CursorManager.js';

class ScreenRenderer {
    constructor(screen) {
        this.screen = screen;
        this.renderQueue = new Set();
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.minRenderInterval = 1000; // Base refresh rate: 60fps
        this.dirtyRenderDelay = 16;    // Dirty refresh rate: ~60fps
    }

    queueFrame(frame) {
        this.renderQueue.add(frame);
        this.requestImmediateRender(true);
    }

    requestImmediateRender(fullRender = false) {
        if (this.isRendering) return;
        setTimeout(() => this.render(fullRender), this.dirtyRenderDelay);
    }


    getRenderQueue(fullRender = false) {
        if (fullRender) {
            return [...this.renderQueue, ...this.screen.window.getRegions().flatMap(region => region.frames)];
        }
        return this.renderQueue;
    }

    render(fullRender = false) {
        if (!this.screen.window || this.screen.window.isCleaningUp) return;

        this.isRendering = true;
        CursorManager.hideCursor();

        try {
            // Save cursor position
            process.stdout.write('\x1b7');
            
            // Clear screen and reset cursor while preserving scroll position
            process.stdout.write('\x1b[2J');
            process.stdout.write('\x1b[H');
            
            // Disable scrolling
            process.stdout.write('\x1b[?1049h');
            
            // Alternative approach to prevent scrolling
            process.stdout.write('\x1b[r'); // Reset scroll margins
            process.stdout.write(`\x1b[1;${this.screen.height}r`); // Set scroll region to full screen

            // Render window borders
            // const windowBorders = this.screen.window.getBorders();
            // windowBorders.forEach((line, index) => {
            //     CursorManager.moveTo(0, index);
            //     process.stdout.write('\x1b[K' + line);  
            // });

            // Group frames by region for efficient rendering
            const regionUpdates = new Map();
            const renderQueue = this.getRenderQueue(fullRender);

            // Group frames by their regions
            renderQueue.forEach(frame => {
                const region = frame.region;
                if (!region) return;
                
                if (!regionUpdates.has(region)) {
                    regionUpdates.set(region, new Set());
                }
                regionUpdates.get(region).add(frame);
            });

            // Render each region that has updates
            regionUpdates.forEach((frames, region) => {
                const regionLines = region.render(true);
                regionLines.forEach((line, index) => {
                    if (index < region.height) {
                        CursorManager.moveTo(region.x, region.y + index);
                        process.stdout.write('\x1b[K' + line);
                    }
                });

                frames.forEach(frame => frame.markClean());
            });

            this.renderQueue.clear();

            // Restore cursor position
            if (this.screen.window.promptPosition) {
                CursorManager.moveTo(
                    this.screen.window.promptPosition.x, 
                    this.screen.window.promptPosition.y
                );
                CursorManager.showCursor();
            }
        } catch (error) {
            console.error('Render error:', error);
        } finally {
            this.isRendering = false;
        }
    }

    start() {
        // Initial render
        this.render(true);
        
        // Setup regular render interval
        setInterval(() => {
            this.requestImmediateRender(true);
        }, this.minRenderInterval);
    }
}

export default ScreenRenderer;