import chalk from 'chalk';

class InputRenderer {
    constructor(config = {}) {
        this.frame = null;
        this.currentInput = '';
        this.placeholder = config.placeholder || 'Type here...';
        this.cursorPos = 0;
        this.maxLength = config.maxLength || 1000;
        this.buttonText = config.buttonText || 'Go';
        this.onSubmit = config.onSubmit || (() => {});
        this.buttonSelected = false;
    }

    setFrame(frame) {
        this.frame = frame;
        return this;
    }

    handleInput(char, key) {
        if (!this.frame?.isActive()) return;

        if((key === 'RETURN' || key === 'ENTER') && !this.buttonSelected) {
            // first time pressing enter, so we don't submit but select the button
            this.buttonSelected = true;
            this.frame?.markDirty();
            return;
        }

        if (this.buttonSelected) {
            switch(key) {
                case 'LEFT_ARROW':
                    this.buttonSelected = false;
                    this.cursorPos = this.currentInput.length;
                    break;
                case 'RETURN':
                case 'ENTER':
                case 'SPACE':
                    this.onSubmit(this.currentInput);
                    break;
                default:
                    // If any other key is pressed while button is selected,
                    // go back to input mode and handle the key press
                    this.buttonSelected = false;
                    this.cursorPos = this.currentInput.length;
                    // Re-process the input
                    this.handleInput(char, key);
                    return;
            }
            this.frame?.markDirty();
            this.frame?.region?.window?.renderDirty();
            return;
        }

        switch(key) {
            case 'BACKSPACE':
            case 'DEL':
                if (this.cursorPos > 0) {
                    this.currentInput = 
                        this.currentInput.slice(0, this.cursorPos - 1) + 
                        this.currentInput.slice(this.cursorPos);
                    this.cursorPos--;
                }
                break;

            case 'DELETE':
                if (this.cursorPos < this.currentInput.length) {
                    this.currentInput = 
                        this.currentInput.slice(0, this.cursorPos) + 
                        this.currentInput.slice(this.cursorPos + 1);
                }
                break;

            case 'LEFT_ARROW':
                if (this.cursorPos > 0) {
                    this.cursorPos--;
                }
                break;

            case 'RIGHT_ARROW':
                if (this.cursorPos < this.currentInput.length) {
                    this.cursorPos++;
                } else {
                    this.buttonSelected = true;
                }
                break;

            case 'HOME':
                this.cursorPos = 0;
                break;

            case 'END':
                this.cursorPos = this.currentInput.length;
                break;

            case 'ENTER':
                this.onSubmit(this.currentInput);
                break;

            default:
                if (char && 
                    !key.startsWith('CTRL_') && 
                    this.currentInput.length < this.maxLength) {
                    this.currentInput = 
                        this.currentInput.slice(0, this.cursorPos) + 
                        char + 
                        this.currentInput.slice(this.cursorPos);
                    this.cursorPos++;
                }
        }

        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

    getValue() {
        return this.currentInput;
    }

    setValue(value) {
        this.currentInput = value || '';
        this.cursorPos = this.currentInput.length;
        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

    clear() {
        this.setValue('');
    }

    render() {
        const contentHeight = this.frame.height - 2;
        const contentWidth = this.frame.width - 4;
        const PADDING = 2;
        const BUTTON_WIDTH = this.buttonText.length + 2;
        const textWidth = contentWidth - (PADDING * 3) - BUTTON_WIDTH;
        
        const lines = [];
        const isActive = this.frame.isActive();
        
        let displayText = this.currentInput || this.placeholder;
        
        if (displayText.length > textWidth) {
            const halfWidth = Math.floor(textWidth / 2);
            let start = Math.max(0, this.cursorPos - halfWidth);
            let end = Math.min(displayText.length, start + textWidth);
            
            if (end === displayText.length) {
                start = Math.max(0, end - textWidth);
            }
            
            displayText = displayText.slice(start, end);
            this.visibleCursorPos = this.cursorPos - start;
        } else {
            this.visibleCursorPos = this.cursorPos;
        }

        let inputLine = '';
        if (isActive && !this.buttonSelected) {
            inputLine = displayText.slice(0, this.visibleCursorPos) + 
                       '█' + 
                       (displayText.slice(this.visibleCursorPos) || ' ');
        } else {
            inputLine = displayText;
        }

        const styledInput = this.currentInput
            ? (isActive && !this.buttonSelected ? chalk.cyan(inputLine) : chalk.white(inputLine))
            : chalk.gray(inputLine);

        const buttonStyle = isActive && this.buttonSelected ? chalk.cyan.bold : chalk.white;
        const button = buttonStyle(`[${this.buttonText}]`);

        const fullLine = ' '.repeat(PADDING) + 
                        styledInput.padEnd(textWidth) + 
                        ' '.repeat(PADDING) + 
                        button + 
                        ' '.repeat(PADDING);

        lines.push(fullLine);

        for (let i = 1; i < contentHeight; i++) {
            lines.push(' '.repeat(contentWidth));
        }

        return lines;
    }
}

export default InputRenderer;