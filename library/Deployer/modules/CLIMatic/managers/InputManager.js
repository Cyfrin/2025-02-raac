import { EventEmitter } from 'events';
import { KeyboardEvent } from './input/KeyboardEvent.js';
import { MouseEvent } from './input/MouseEvent.js';

export class InputManager extends EventEmitter {
    constructor(window) {
        super();
        this.window = window;
        this.isEnabled = false;
        this.isPaused = false;
        this.metaPressed = false;
    }

    pause() {
        if (this.isPaused) return;
        this.isPaused = true;

        // Disable raw mode and show cursor
        if (process.stdin.isTTY) {
            // Required to be kept to capture further input
            process.stdin.setRawMode(true);
        }
        process.stdout.write('\u001b[?1000l'); // Disable mouse events
        process.stdout.write('\u001b[?1006l'); // Disable SGR mouse mode
        process.stdout.write('\u001b[?25h');   // Show cursor
        // process.stdout.write('\u001b[2J\u001b[H'); // Clear screen

        this.emit('pause');
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;

        // Restore raw mode and hide cursor
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdout.write('\u001b[?1000h'); // Enable mouse events
            process.stdout.write('\u001b[?1006h'); // Enable SGR mouse mode
        }
        process.stdout.write('\u001b[?25l');   // Hide cursor
        // process.stdout.write('\u001b[2J\u001b[H'); // Clear screen

        this.emit('resume');
    }

    isPauseActive() {
        return this.isPaused;
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;

        try {
            // Setup readline
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            // Enable mouse events
            if (process.stdin.isTTY) {
                process.stdout.write('\x1b[?1000h'); // Enable mouse click events
                process.stdout.write('\x1b[?1006h'); // Enable SGR mouse mode
            }

            // Handle input events
            process.stdin.on('data', this.handleInput.bind(this));

            // Cleanup on exit
            process.on('exit', this.cleanup.bind(this));

            // Handle Ctrl+C
            process.on('SIGINT', () => {
                this.emit('exit', 'SIGINT');
            });

        } catch (error) {
            console.error('Error enabling input manager:', error);
            throw error;
        }
    }

    handleInput(data) {
        try {
            const input = data.toString();
            const charCodes = Array.from(input).map(c => c.charCodeAt(0));
            
            let event;
            if (MouseEvent.isMouseEvent(charCodes)) {
                // console.log('Mouse event detected:', input);
                event = new MouseEvent(input, charCodes, this.window);
                this.emit('mouse', event);
            } else if (KeyboardEvent.isKeyboardEvent(charCodes)) {
                event = new KeyboardEvent(input, charCodes, this.window);
                // Add meta key state to the event
                event.meta = this.metaPressed;
                this.emit('keyboard', event);
                // Reset meta state after processing
                this.metaPressed = false;
            } else {
                console.log('Unknown event detected:', { input, charCodes });
            }

            // console.log('Input event detected - handleInput:', { input, charCodes, event: {
            //     type: event.type,
            //     key: event.key,
            //     meta: event.meta
            // } });
            this.emit('input', { input, charCodes, event });

        } catch (error) {
            console.error('Error handling input:', error);
            this.emit('error', error);
        }
    }

    cleanup() {
        if (!this.isEnabled) return;

        // Disable mouse events
        if (process.stdin.isTTY) {
            process.stdout.write('\x1b[?1000l'); // Disable mouse click events
            process.stdout.write('\x1b[?1006l'); // Disable SGR mouse mode
        }

        // Reset terminal state
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.stdin.pause();
    }
}

export default InputManager;