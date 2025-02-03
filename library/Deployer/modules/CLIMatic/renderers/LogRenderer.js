import chalk from 'chalk';
import { EventEmitter } from 'events';

class LogRenderer extends EventEmitter {
    constructor() {
        super();
        this.logs = [];
        this.frame = null;
        this.maxLogs = 1000;
        this.scrollOffset = 0;
        this.autoscroll = true;
        this.isPaused = false;
        this.queuedLogs = [];
        this.lastRenderTime = 0;
        this.minRenderInterval = 1000 / 60; // 60 FPS cap
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedText = '';
    }

    setFrame(frame) {
        this.frame = frame;
        return this;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        while (this.queuedLogs.length > 0) {
            const log = this.queuedLogs.shift();
            this._addLogDirect(log);
        }
        this.requestRender();
    }

    requestRender() {
        const now = performance.now();
        if (now - this.lastRenderTime >= this.minRenderInterval) {
            this.frame?.markDirty();
            this.frame?.region?.window?.renderDirty();
            this.lastRenderTime = now;
        } else {
            setTimeout(() => this.requestRender(), 
                this.minRenderInterval - (now - this.lastRenderTime));
        }
    }

    handleScroll(direction) {
        this.pause();
        const contentHeight = this.frame.height - 2;
        const maxScroll = Math.max(0, this.logs.length - contentHeight);
        
        if (direction === 'up' && this.scrollOffset < maxScroll) {
            this.scrollOffset++;
            this.autoscroll = false;
            this.requestRender();
        } else if (direction === 'down') {
            if (this.scrollOffset > 0) {
                this.scrollOffset--;
                this.requestRender();
            } else {
                this.autoscroll = true;
                this.resume();
            }
        }
    }

    _addLogDirect(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push(`[${timestamp}] ${message}`);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    addLog(message, forceRender = false) {
        if (this.isPaused) {
            this.queuedLogs.push(message);
            return;
        }
        this._addLogDirect(message);
        if (this.autoscroll) {
            this.scrollOffset = 0;
        }
        this.frame?.markDirty();
        if(forceRender) {
            this.requestRender();
        }
    }

    handleClick(relativeY) {
        // Ensure we're within frame boundaries
        if (relativeY < 1 || relativeY >= (this.frame?.height ?? 0) - 1) {
            return;
        }

        // Clear selection first
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedText = '';
        
        const contentHeight = this.frame.height - 2;
        const visibleLogs = this.logs.slice(-contentHeight - this.scrollOffset, this.logs.length - this.scrollOffset);
        const clickedIndex = Math.floor(relativeY) - 1;
        
        // Handle scroll regions
        if (clickedIndex < 0 || clickedIndex >= visibleLogs.length) {
            if (relativeY < contentHeight * 0.2) {
                this.handleScroll('up');
            } else if (relativeY > contentHeight * 0.8) {
                this.handleScroll('down');
            }
            return;
        }

        this.selectionStart = clickedIndex;
        this.selectionEnd = clickedIndex;
        this.selectedText = visibleLogs[clickedIndex];
        this.requestRender();
    }

    handleDoubleClick(relativeY) {
        // Ensure we're within frame boundaries
        if (relativeY < 1 || relativeY >= this.frame.height - 1) {
            return;
        }

        const contentHeight = this.frame.height - 2;
        const visibleLogs = this.logs.slice(-contentHeight - this.scrollOffset, this.logs.length - this.scrollOffset);
        const clickedIndex = Math.floor(relativeY) - 1;
        
        if (clickedIndex >= 0 && clickedIndex < visibleLogs.length) {
            this.selectionStart = clickedIndex;
            this.selectionEnd = clickedIndex;
            this.selectedText = visibleLogs[clickedIndex];
            
            if (this.selectedText) {
                process.stdout.write('\x1B]52;c;' + Buffer.from(this.selectedText).toString('base64') + '\x07');
            }
            this.requestRender();
        }
    }

    handleDrag(relativeY) {
        // Ensure we're within frame boundaries
        if (relativeY < 1 || relativeY >= this.frame.height - 1) {
            return;
        }

        if (this.selectionStart === null) return;
        
        const contentHeight = this.frame.height - 2;
        const visibleLogs = this.logs.slice(-contentHeight - this.scrollOffset, this.logs.length - this.scrollOffset);
        const dragIndex = Math.floor(relativeY) - 1;
        
        // Ensure we're within the visible logs
        if (dragIndex >= 0 && dragIndex < visibleLogs.length) {
            // Only update if we're moving to a different line
            if (dragIndex !== this.selectionEnd) {
                this.selectionEnd = dragIndex;
                const start = Math.min(this.selectionStart, this.selectionEnd);
                const end = Math.max(this.selectionStart, this.selectionEnd);
                
                // Get only the visible portion of the logs for selection
                const selectedLines = visibleLogs.slice(start, end + 1);
                this.selectedText = selectedLines.join('\n');
                this.requestRender();
            }
        }
    }

    render() {
        if (!this.frame) {
            return ['No frame set'];
        }

        const contentHeight = this.frame.height - 2;
        const contentWidth = this.frame.width - 4;
        const visibleLogs = this.logs
            .slice(-contentHeight - this.scrollOffset, this.logs.length - this.scrollOffset);
        
        return visibleLogs.map((log, index) => {
            let displayLog = log.length > contentWidth ? 
                log.substring(0, contentWidth - 3) + '...' : 
                log;
            
            // Only highlight if this line is in the selection range
            if (this.selectionStart !== null && 
                index >= Math.min(this.selectionStart, this.selectionEnd) && 
                index <= Math.max(this.selectionStart, this.selectionEnd)) {
                return chalk.bgBlue.white(displayLog);
            }
            
            return displayLog;
        });
    }

    clearLogs() {
        this.logs = [];
        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

    setLogs(messages) {
        if (!Array.isArray(messages)) {
            messages = [messages];
        }
        this.logs = messages;
        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

    getLogs() {
        return this.logs;
    }

    hasSelection() {
        return this.selectedText !== '';
    }

    copySelection() {
        throw new Error('copySelection is not implemented');
        if (this.selectedText) {
            process.stdout.write('\x1B]52;c;' + Buffer.from(this.selectedText).toString('base64') + '\x07');
            return true;
        }
        return false;
    }

    handleMouseEvents(event) {
        if(!this.frame?.isActive()) return false;

        const button = event.button;
        const isLeftClick = button === 'LEFT';
        const isRightClick = button === 'RIGHT';
        const isScrollUp = button === 'SCROLL_UP';
        const isScrollDown = button === 'SCROLL_DOWN';

        if(isLeftClick) {
            this.handleClick(event.position.y);
            return true;
        }

        if(isRightClick) {
            this.handleDoubleClick(event.position.y);
            return true;
        }

        if(isScrollUp) {
            this.handleScroll('up');
            return true;
        }

        if(isScrollDown) {
            this.handleScroll('down');
            return true;
        }
        return false;

    }

    handleKeypress(event) {
        if (!this.frame?.isActive()) return false;

        switch(event.key) {
            case 'UP_ARROW':
                this.handleScroll('up');
                return true;
            case 'DOWN_ARROW':
                this.handleScroll('down');
                return true;
            case 'PAGE_UP':
                for(let i = 0; i < this.frame.height - 2; i++) {
                    this.handleScroll('up');
                }
                return true;
            case 'PAGE_DOWN':
                for(let i = 0; i < this.frame.height - 2; i++) {
                    this.handleScroll('down');
                }
                return true;
            case 'LEFT_ARROW':
                this.emit('navigate:back');
                return true;
        }
        return false;
    }

    updateAnimationFrame(lines) {
        this.isPaused = false;
        
        // Clean the lines while preserving color codes
        const cleanLines = lines.map(line => {
            // First extract all color codes
            const colorCodes = [];
            line.replace(/\u001b\[[0-9;]*m/g, match => {
                colorCodes.push(match);
                return '';
            });
            
            // Clean all other ANSI sequences and position codes
            const cleanedLine = line
                // .replace(/\u001b\[\d+[ABCD]/g, '')  // Remove cursor movement
                // .replace(/\u001b\[\d+[JK]/g, '')    // Remove erase sequences
                // .replace(/\u001b\[\d+;\d+[Hf]/g, '') // Remove cursor position
                // .replace(/\u001b\].*?\u0007/g, '')  // Remove operating system commands
                // .replace(/\u001b\[\?.*?[hl]/g, '')  // Remove mode switches
                // .replace(/\u001b\[\d*[GFIL]/g, '')  // Remove additional cursor controls
                // .replace(/│/g, '')  // Remove vertical bars
                // .replace(/[{}\(|;)@#$%^&*+~<>]/g, '') // Remove special characters
                // .replace(/\d+;\d+H/g, '')  // Remove position codes like "24;4H"
                // .replace(/\d+;\d+/g, '')   // Remove any remaining position codes without H
                .replace(/\d+;\d+H/g, '') // Remove all position codes with H
                // .replace(/\s+/g, ' ')  // Normalize whitespace
                // .trim() // Remove leading/trailing whitespace
            // Keep color codes (\u001b[0m, \u001b[31m etc) intact
            return cleanedLine;
        });

        this.clearLogs();
        this.setLogs(cleanLines);
        this.requestRender();
    }
}

export default LogRenderer;
            