import { EventEmitter } from 'events';
import CursorManager from '../screen/CursorManager.js';

class Screen extends EventEmitter {
    constructor() {
        super();
        this.width = process.stdout.columns;
        this.height = process.stdout.rows;
        this.renderQueue = new Set();
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.minRenderInterval = 1000;
        this.windows = [];
        this.isDirty = true;
        this.window = null;
        this.lastRenderedState = new Map();

        process.stdout.on('resize', () => {
            this.width = process.stdout.columns;
            this.height = process.stdout.rows;
            this.isDirty = true;
            this.emit('resize', { width: this.width, height: this.height });
        });
    }

    addWindow(window) {
        this.windows.push(window);
        this.window = window;
        this.isDirty = true;
        this.screenRenderer?.requestImmediateRender(true);
        return this;
    }

    setWindow(window) {
        this.window = window;
        if (!this.windows.includes(window)) {
            this.windows.push(window);
        }
        this.isDirty = true;
        this.screenRenderer?.requestImmediateRender(true);
        return this;
    }

    start() {
        this.isDirty = true;
        this.screenRenderer?.requestImmediateRender(true);

        setInterval(() => {
            this.markDirty();
        }, this.minRenderInterval);
    }

    markDirty() {
        this.isDirty = true;
        this.screenRenderer?.requestImmediateRender(true);
    }

    queueFrame(frame) {
        this.renderQueue.add(frame);
        this.screenRenderer?.queueFrame(frame);
    }

    requestRender() {
        if (this.isRendering) return;
        
        const now = performance.now();
        if (now - this.lastRenderTime >= this.minRenderInterval) {
            this.render();
            this.lastRenderTime = now;
        } else {
            setTimeout(() => this.requestRender(), 
                this.minRenderInterval - (now - this.lastRenderTime));
        }
    }

    clear() {
        process.stdout.write('\x1b[2J');
        process.stdout.write('\x1b[0f');
    }

    render(fullRender = false) {
        console.log('Rendering screen' + +new Date().getTime());
        if (!this.window || this.window.isCleaningUp) return;
        
        this.isRendering = true;
        CursorManager.hideCursor();

        try {
            // const windowBorders = this.window.getBorders();
            // windowBorders.forEach((line, index) => {
            //     CursorManager.moveTo(0, index);
            //     process.stdout.write('\x1b[K' + line);
            // });

            this.window.getRegions().forEach(region => {
                const regionLines = region.render(fullRender);
                regionLines.forEach((line, index) => {
                    if (index < region.height) {
                        CursorManager.moveTo(region.x, region.y + index);
                        process.stdout.write('\x1b[K' + line);
                    }
                });
            });

            this.renderQueue.clear();

            if (this.window.promptPosition) {
                CursorManager.moveTo(
                    this.window.promptPosition.x, 
                    this.window.promptPosition.y
                );
                CursorManager.showCursor();
            }
        } catch (error) {
            console.error('Render error:', error);
        } finally {
            this.isRendering = false;
        }
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    setScreenRenderer(renderer) {
        this.screenRenderer = renderer;
    }

    cleanup() {
        this.window.cleanup();
    }
}

export default Screen;