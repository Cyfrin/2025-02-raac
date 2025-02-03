import { EventEmitter } from 'events';

class Screen extends EventEmitter {
    constructor() {
        super();
        // Initialize screen dimensions
        this.width = process.stdout.columns || 80;
        this.height = process.stdout.rows || 24;

        // Handle terminal resize
        process.stdout.on('resize', () => {
            this.width = process.stdout.columns;
            this.height = process.stdout.rows;
            this.emit('resize', { width: this.width, height: this.height });
        });
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getDimensions() {
        return {
            width: this.width,
            height: this.height
        };
    }

    clear() {
        console.clear();
    }
}

export default Screen;