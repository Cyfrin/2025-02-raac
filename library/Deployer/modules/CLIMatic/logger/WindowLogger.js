class WindowLogger {
    constructor(window) {
        this.window = window;
        this.currentMessage = '';
        this.originalConsoleLog = console.log;

        // Intercept console.log
        console.log = (...args) => {
            this.log(...args);
        };
    }

    log(...args) {
        // Convert all arguments to strings and join them
        this.currentMessage = args
            .map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg);
                }
                return String(arg);
            })
            .join(' ');

        // Truncate message to fit window width (accounting for borders)
        const maxWidth = this.window.width - 4; // -4 for borders and padding
        if (this.currentMessage.length > maxWidth) {
            this.currentMessage = this.currentMessage.substring(0, maxWidth - 3) + '...';
        }

        // Trigger window update
        this.window.renderStatusBar();
    }

    getCurrentMessage() {
        return this.currentMessage;
    }

    restore() {
        // Restore original console.log when cleaning up
        console.log = this.originalConsoleLog;
    }
}

export default WindowLogger;