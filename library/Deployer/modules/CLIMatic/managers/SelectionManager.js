import { EventEmitter } from 'events';
import chalk from 'chalk';
import { KeyboardEvent } from './input/KeyboardEvent.js';
import clipboard from '../utils/clipboard.js';

class SelectionManager extends EventEmitter {
    constructor(inputManager) {
        super();
        this.selectedFrame = null;
        this.frames = new Set();
        this.pressedKeys = new Set();
        this.inputManager = inputManager;
        
        // Listen to mouse events
        inputManager.on('mouse', this.handleMouseEvents.bind(this));
    }

    getCurrentFrame() {
        return this.selectedFrame;
    }

    registerFrame(frame) {
        this.frames.add(frame);
        return this;
    }

    selectFrame(frame) {
        if (!frame) {
            console.log('Invalid frame selection attempt');
            return false;
        }
        
        if (this.selectedFrame === frame) {
            return false;
        }
        
        const previousFrame = this.selectedFrame;
        
        // Mark both previous and new frame as dirty
        if (previousFrame) {
            previousFrame.markDirty();
        }
        frame.markDirty();
        
        this.selectedFrame = frame;
        this.emit('selectionChange', { previous: previousFrame, current: frame });
        return true;
    }

    getFrameAt(x, y) {
        for (const frame of this.frames) {
            const region = frame.region;
            if (!region) {
                continue;
            }

            const frameAbsX = region.x;
            const frameAbsY = region.y;
            
            const checking = {
                position: { x: frameAbsX, y: frameAbsY },
                size: { width: frame.width, height: frame.height },
                click: { x, y },
                inBounds: {
                    x: x >= frameAbsX && x < frameAbsX + frame.width,
                    y: y >= frameAbsY && y < frameAbsY + frame.height
                }
            }

            if (checking.inBounds.x && checking.inBounds.y) {
                return frame;
            }
        }
        
        return null;
    }

    isSelected(frame) {
        if (this.inputManager?.isPauseActive()) {
            return false;
        }
        return this.selectedFrame === frame;
    }

    getBorderStyle(frame) {
        if (this.inputManager?.isPauseActive()) {
            return chalk.gray;
        }
        return this.isSelected(frame) ? chalk.blue : chalk.gray;
    }

    handleKeypress(event) {
        if (this.inputManager?.isPauseActive()) {
            return false;
        }

        // Handle copy command
        if (KeyboardEvent.isCopyCommand(event.charCodes)) {
            const selectedText = this.getSelectedText();
            if (selectedText) {
                clipboard.copy(selectedText);
                return true;
            }
        }

        if (event.meta) {
            return false;
        }

        // Handle tab navigation between frames
        if (event.key === KeyboardEvent.KEYS.TAB) {
            const frames = Array.from(this.frames);
            const currentIndex = frames.indexOf(this.selectedFrame);
            const nextIndex = (currentIndex + 1) % frames.length;
            this.selectFrame(frames[nextIndex]);
            return true;
        } else if (event.key === KeyboardEvent.KEYS.ESCAPE || 
                   event.key === KeyboardEvent.KEYS.CTRL_C) {
            process.exit(0);
        }

        // Propagate keyboard event to selected frame if it has a handleKeypress method
        if (this.selectedFrame && typeof this.selectedFrame.handleKeypress === 'function') {
            return this.selectedFrame.handleKeypress(event);
        }
        
        return false;
    }

    handleClick(x, y) {
        if (this.inputManager?.isPauseActive()) {
            return false;
        }
        const clickedFrame = this.getFrameAt(x, y);
        if (clickedFrame) {
            return this.selectFrame(clickedFrame);
        }
        return false;
    }

    isFrameSelected(frame) {
        return this.selectedFrame === frame;
    }

    handleMouseEvents(event) {
        if(this.inputManager?.isPauseActive()) {
            return false;
        }

        // const isLeftClick = event.button === 'LEFT';
        // const isRightClick = event.button === 'RIGHT';

        // const concernedFrame = this.getFrameAt(event.x, event.y);
        // if(concernedFrame) {
        //     if (isLeftClick) {
        //         this.selectFrame(concernedFrame);
        //         if (concernedFrame.contentRenderer?.handleClick) {
        //             const relativeY = event.y - concernedFrame.region.y;
        //             concernedFrame.contentRenderer.handleClick(relativeY);
        //         }
        //         return true;
        //     }
        // }
        // return false;
        const button = event.button;
        const isLeftClick = button === 'LEFT';
        const isScrollUp = button === 'SCROLL_UP';
        const isScrollDown = button === 'SCROLL_DOWN';
        const isRightClick = button === 'RIGHT';
        if (this.inputManager?.isPauseActive()) return false;
        
        const frameAtMouse = this.getFrameAt(event.position.x, event.position.y);
        if(!frameAtMouse) return false;

        if (frameAtMouse && isLeftClick) {
            this.selectFrame(frameAtMouse);
            if (frameAtMouse.contentRenderer?.handleClick) {
                const relativeY = event.position.y - frameAtMouse.region.y;
                // frameAtMouse.contentRenderer.handleClick(relativeY);
            }
            return true;
        }

        if(frameAtMouse && isScrollUp) {
            frameAtMouse.contentRenderer?.handleScroll('up');
            // return true;
        }

        if(frameAtMouse && isScrollDown) {
            frameAtMouse.contentRenderer?.handleScroll('down');
            return true;
        }

        return false;
    }
}

export default SelectionManager;