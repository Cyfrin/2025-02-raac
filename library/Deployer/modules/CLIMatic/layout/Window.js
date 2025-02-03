import chalk from 'chalk';
import Screen from './Screen.js';
import CursorManager from '../screen/CursorManager.js';
import { EventEmitter } from 'events';
import SelectionManager from '../managers/SelectionManager.js';
import InputManager from '../managers/InputManager.js';
import WindowLogger from '../logger/WindowLogger.js';

class Window extends EventEmitter {
    constructor(cli) {
        super();
        this.cli = cli;
        this.screen = new Screen();
        this.screen.setWindow(this);
        this.width = this.screen.getWidth();
        this.height = this.screen.getHeight();
        this.regions = [];
        this.promptPosition = CursorManager.getPromptPosition(this.height);
        this.currentInput = '';
        this.isCleaningUp = false;
        this.errors = [];
        this.lastUpdate = 0;
        this.inputPromise = null;
        this.inputMode = false;

        // global.logError = this.logError.bind(this);

        try {
            // Initialize managers with window reference
            this.inputManager = new InputManager(this);
            this.selectionManager = new SelectionManager(this.inputManager);

            // Setup input handling
            this.inputManager.on('mouse', (event) => {
                if(this.selectionManager.handleMouseEvents(event)) {
                    this.renderDirty();
                }
            });

            this.inputManager.on('keyboard', (event) => {
                if (this.selectionManager.handleKeypress(event)) {
                    this.renderDirty();
                }
            });

            // Enable input handling
            this.inputManager.enable();

            // Listen for selection changes
            this.selectionManager.on('selectionChange', ({ previous, current }) => {
                this.renderDirty();
            });

            // Handle screen resize
            this.screen.on('resize', ({ width, height }) => {
                try {
                    const oldWidth = this.width;
                    const oldHeight = this.height;
                    this.width = width;
                    this.height = height;
                    // this.promptPosition = CursorManager.getPromptPosition(this.height);
                    // this.handleResize(oldWidth, oldHeight, width, height);
                    // this.render();
                } catch (error) {
                    this.logError('Resize error', error);
                    this.cleanup(`Error handling resize: ${error}`);
                    process.exit(1);
                }
            });

            // if(this.lastUpdate === 0) {
            //     // this.promptPosition = CursorManager.getPromptPosition(this.height);
            //     // this.handleResize(this.width, this.height, this.width, this.height);
            //     se
                // this.render();
            // }

        } catch (error) {
            this.logError('Initialization error', error);
            this.cleanup();
            process.exit(1);
        }

        this.logger = new WindowLogger(this);
    }

    logError(context, error) {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            timestamp,
            context,
            message: error.message,
            stack: error.stack
        };
        this.errors.push(errorInfo);
        // console.error(`[${timestamp}] ${context}:`, error);
    }

    handleKeypress(event) {
        // console.log('Processing keypress:', {
            // key: event.key,
            // frame: event.context.frame?.name,
            // region: event.context.region
        // });

        // if (this.selectionManager.handleKeypress(event)) {
            // this.renderDirty();
        // }
    }
 
    handleMouseClick(event) {
        if (this.selectionManager.handleClick(
            event.context.globalPosition.x, 
            event.context.globalPosition.y
        )) {
            this.renderDirty();
        }
    }

    cleanup(reason = 'NO_REASON') {
        if (this.isCleaningUp) return;
        this.isCleaningUp = true;

        try {
            // Restore original console.log
            this.logger.restore();
            
            // Disable mouse tracking
            process.stdout.write('\x1b[?1000l');
            process.stdout.write('\x1b[?1006l');

            // Reset terminal state
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            process.stdin.pause();

            // Clear screen and reset cursor
            console.clear();
            process.stdout.write('\u001B[?25h');
            process.stdout.write('\u001B[2J');
            process.stdout.write('\u001B[0f');

            // Display all collected errors
            if (this.errors.length > 0) {
                console.log('\nErrors encountered during execution:');
                console.log('=====================================');
                this.errors.forEach((error, index) => {
                    console.log(`\nError #${index + 1}:`);
                    console.log(`Time: ${error.timestamp}`);
                    console.log(`Context: ${error.context}`);
                    console.log(`Message: ${error.message}`);
                    console.log('Stack trace:');
                    console.log(error.stack);
                    console.log('-------------------------------------');
                });
            }

            console.log('\nTerminal cleaned up successfully');
            console.log(`Cleanup reason: ${reason}`);
            console.log(`Total errors encountered: ${this.errors.length}`);

        } catch (error) {
            this.logError('Cleanup error', error);
            console.error('Failed to clean up properly:', error);
        }
    }

    addRegion(region) {
        region.setWindow(this);
        this.regions.push(region);
        
        // Register all frames in the region with the SelectionManager
        region.frames.forEach(frame => {
            this.selectionManager.registerFrame(frame);
            // Set the frame's region reference for proper coordinate calculation
            frame.region = region;
        });
        
        return this;
    }

    getRegions() {
        return this.regions;
    }

    render(fullRender = false) {
        // console.log('Rendering window' + +new Date().getTime());
        if (this.isCleaningUp) return;
        try {
            const lines = [];
            this.regions.forEach(region => {
                lines.push(...region.render(fullRender));
            });
            return lines;
        } catch (error) {
            this.logError('Render error', error);
            return [];
        }
    }

    getBorders() {
        const lines = [];
        
        // Window border characters
        const chars = {
            topLeft: '╔',
            topRight: '╗',
            bottomLeft: '╚',
            bottomRight: '╝',
            horizontal: '═',
            vertical: '║'
        };

        // Top border
        lines.push(chalk.gray(
            chars.topLeft + 
            chars.horizontal.repeat(this.width - 2) + 
            chars.topRight
        ));

        // Middle content
        for (let i = 1; i < this.height - 1; i++) {
            const isPromptLine = i === this.promptPosition.y;
            const isStatusLine = i === this.height - 2;
            
            lines.push(chalk.gray(
                chars.vertical + 
                (isPromptLine ? '> ' + ' '.repeat(this.width - 4) :
                 isStatusLine ? ' '.repeat(this.width - 2) : // Clear space for status
                 ' '.repeat(this.width - 2)) + 
                chars.vertical
            ));
        }

        // Bottom border
        lines.push(chalk.gray(
            chars.bottomLeft + 
            chars.horizontal.repeat(this.width - 2) + 
            chars.bottomRight
        ));

        return lines;
    }

    renderDirty(force = false) {
        try {
            CursorManager.hideCursor();
            
            // Only render regions with dirty frames
            this.regions.forEach(region => {
                const hasUpdates = region.frames.some(frame => frame.needsUpdate());
                if (hasUpdates || force) {
                    const regionLines = region.render();
                    regionLines.forEach((line, index) => {
                        CursorManager.moveTo(region.x, region.y + index);
                        process.stdout.write(line);
                    });
                }
            });
            
            CursorManager.moveTo(this.promptPosition.x, this.promptPosition.y);
            CursorManager.showCursor();
        } catch (error) {
            this.logError('Error in renderDirty', error);
            this.cleanup();
            process.exit(1);
        }
    }

    handleResize(oldWidth, oldHeight, newWidth, newHeight) {
        // Update window dimensions
        this.width = newWidth;
        this.height = newHeight;

        // Recalculate all regions and frames
        this.regions.forEach(region => {
            region.calculateDimensions();
            region.frames.forEach(frame => {
                frame.markDirty();
            });
        });

        // Update prompt position
        this.promptPosition = CursorManager.getPromptPosition(this.height);
        
        // Force a full render
        this.render(true);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.promptPosition = CursorManager.getPromptPosition(height);
    }

    renderStatusBar() {
        try {
            const message = this.logger.getCurrentMessage();
            CursorManager.moveTo(2, this.height - 2); // Position above bottom border
            process.stdout.write('\x1b[K'); // Clear the line
            process.stdout.write(chalk.gray(message));
            
            // Restore cursor to prompt position
            CursorManager.moveTo(this.promptPosition.x, this.promptPosition.y);
        } catch (error) {
            this.logError('Error in renderStatusBar', error);
        }
    }

    markDirty() {
        this.regions.forEach(region => {
            region.frames.forEach(frame => {
                frame.markDirty();
            });
        });
        if (this.screen) {
            this.screen.markDirty();
        }
    }

    drawBox(text, width = process.stdout.columns) {
        const padding = 2;
        const contentWidth = width - (padding * 2) - 2; // -2 for borders
        const lines = [];

        // Top border
        lines.push('╭' + '─'.repeat(width - 2) + '╮');
        
        // Empty line
        lines.push('│' + ' '.repeat(width - 2) + '│');

        // Content line
        const centeredText = text.padStart((width - 2 + text.length) / 2).padEnd(width - 2);
        lines.push('│' + centeredText + '│');
        
        // Input line
        lines.push('│' + ' '.repeat(width - 2) + '│');
        
        // Empty line
        lines.push('│' + ' '.repeat(width - 2) + '│');

        // Bottom border
        lines.push('╰' + '─'.repeat(width - 2) + '╯');

        return lines;
    }

    async prompt(promptText, logRenderer, options = {}) {
        if (this.inputMode) {
            throw new Error('Already in input mode');
        }

        // Store current input handler state
        const wasInputEnabled = this.inputManager?.isEnabled;
        
        try {
            // Disable normal input handling
            if (this.inputManager) {
                this.inputManager.pause();
            }

            this.inputMode = true;
            const defaultOptions = {
                echo: true,
                type: 'text'
            };

            const finalOptions = { ...defaultOptions, ...options };

            return await new Promise((resolve, reject) => {
                let input = '';
                let cursorPos = 0;

                // Calculate box dimensions
                let width = Math.min(100, process.stdout.columns - 4); // Max width of 100 or screen width - 4
                if(finalOptions.type === 'confirm') {
                    promptText = promptText + ' (y/N)';
                    width = Math.min(100, process.stdout.columns - 6); // Max width of 100 or screen width - 6
                }
                const boxLines = this.drawBox(promptText, width);
                
                // Save cursor position
                process.stdout.write('\x1B7');
                
                // Clear space for box (move up 6 lines)
                process.stdout.write('\x1B[6A');
                
                // Draw the box
                boxLines.forEach(line => {
                    process.stdout.write('\x1B[2K'); // Clear line
                    process.stdout.write(chalk.cyan(line) + '\n');
                });
                
                // Move cursor to input position (up 3 lines)
                process.stdout.write('\x1B[3A');
                // Move cursor to start of input area (2 spaces from border)
                process.stdout.write(`\x1B[${6}C`);

                const keyHandler = (str, key) => {
                    if (key.ctrl && key.name === 'c') {
                        cleanup();
                        reject(new Error('Input cancelled'));
                        return;
                    }

                    if (key.name === 'return') {
                        if(finalOptions.type === 'confirm') {
                            cleanup();
                            resolve(input === 'y');
                            return;
                        } else {
                            cleanup();
                            resolve(input);
                            return;
                        }
                    }

                    if (key.name === 'backspace') {
                        if (cursorPos > 0) {
                            input = input.slice(0, -1);
                            cursorPos--;
                            process.stdout.write('\b \b');
                        }
                        return;
                    }

                    // Only handle printable characters
                    if (str && str.length === 1 && str.charCodeAt(0) >= 32) {
                        input += str;
                        cursorPos++;
                        if (finalOptions.echo) {
                            process.stdout.write(str);
                        } else {
                            process.stdout.write('*');
                        }
                    }
                };

                const cleanup = () => {
                    this.inputMode = false;
                    process.stdin.removeListener('keypress', keyHandler);
                    process.stdin.setRawMode(false);
                    
                    // Restore cursor position
                    process.stdout.write('\x1B8');
                    
                    // Clear the box (move up 6 lines and clear each line)
                    process.stdout.write('\x1B[6A');
                    for (let i = 0; i < 6; i++) {
                        process.stdout.write('\x1B[2K'); // Clear entire line
                        if (i < 5) process.stdout.write('\n'); // Move down (except for last line)
                    }
                    
                    
                    if (wasInputEnabled && this.inputManager) {
                        this.inputManager.resume();
                        // re-render menu 
                        this.regions.forEach(region => {
                            region.frames.forEach(frame => {
                                frame.markDirty();
                            });
                        });
                    }
                    // Re-render the frame below
                    // this.renderDirty(true);
                    // 
                };

                // Setup input handling
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.on('keypress', keyHandler);
            });
        } catch (error) {
            console.log('Error in prompt', error);
            this.inputMode = false;
            if (wasInputEnabled && this.inputManager) {
                this.inputManager.resume();
            }
            throw error;
        }
    }
}

export default Window;