export class KeyboardEvent {
    static KEYS = {
        TAB: 'TAB',
        ESCAPE: 'ESCAPE',
        CTRL_C: 'CTRL_C',
        CTRL_P: 'CTRL_P',
        CTRL_R: 'CTRL_R',
        RETURN: 'RETURN',
        ENTER: 'ENTER',
        BACKSPACE: 'BACKSPACE',
        DELETE: 'DELETE',
        HOME: 'HOME',
        END: 'END',
        UP_ARROW: 'UP_ARROW',
        DOWN_ARROW: 'DOWN_ARROW',
        LEFT_ARROW: 'LEFT_ARROW',
        RIGHT_ARROW: 'RIGHT_ARROW',
        SPACE: 'SPACE'
    };

    static SEQUENCES = {
        CTRL_C: [3],
        CTRL_D: [4],
        CTRL_P: [16],
        CTRL_R: [18],
        TAB: [9],
        RETURN: [13],
        ENTER: [13],
        ESCAPE: [27],
        SPACE: [32],
        BACKSPACE: [8],      // ASCII backspace
        DEL: [127],          // DEL key
        DELETE: [27, 91, 51, 126],
        HOME: [27, 91, 72],
        END: [27, 91, 70],
        UP_ARROW: [27, 91, 65],
        DOWN_ARROW: [27, 91, 66], 
        LEFT_ARROW: [27, 91, 68],
        RIGHT_ARROW: [27, 91, 67],
        CMD_C: [27, 99],     // ESC + c
        CMD_V: [27, 118],    // ESC + v
        CMD_X: [27, 120],    // ESC + x
        CMD_Z: [27, 122],    // ESC + z
        CMD_A: [27, 97],     // ESC + a
    };

    constructor(input, charCodes, window, key, meta = false) {
        this.input = input;
        this.charCodes = charCodes;
        this.window = window;
        this.type = 'keyboard';
        this.char = null;  // For printable characters
        this.key = key;   // For special keys
        this.meta = meta;
        this.ctrl = false;
        this.alt = false;
        this.shift = false;
        this.parse();
        this.enrichWithFrameContext();
    }

    static isCopyCommand(charCodes) {
        return KeyboardEvent.arraysEqual(charCodes, KeyboardEvent.SEQUENCES.CMD_C);
    }

    static isKeyboardEvent(charCodes) {
        // Check if it's a special sequence
        for (const [key, sequence] of Object.entries(KeyboardEvent.SEQUENCES)) {
            if (KeyboardEvent.arraysEqual(charCodes, sequence)) {
                return true;
            }
        }

        if (!charCodes) throw new Error('Invalid keyboard event');
        // Check if it's a sequence of printable characters
        return charCodes.every(code => 
            (code >= 32 && code <= 126) || // printable chars
            (code >= 0 && code <= 31)      // control chars
        );
    }

    static arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        return a.every((val, idx) => val === b[idx]);
    }

    parse() {
        // Check for modifier keys first
        this.ctrl = this.charCodes[0] < 32;
        
        // Special case for DEL key
        if (this.charCodes.length === 1 && this.charCodes[0] === 127) {
            this.key = 'BACKSPACE';
            return;
        }

        // Check special sequences
        for (const [key, sequence] of Object.entries(KeyboardEvent.SEQUENCES)) {
            if (KeyboardEvent.arraysEqual(this.charCodes, sequence)) {
                this.key = key;
                return;
            }
        }

        // Handle sequence of printable characters
        if (this.charCodes.every(code => code >= 32 && code <= 126)) {
            this.key = this.input;
            this.char = this.charCodes.map(code => String.fromCharCode(code)).join('');
            this.description = `Text input: ${this.char}`;
            return;
        }

        // Handle single printable character (existing case)
        if (this.charCodes.length === 1) {
            const code = this.charCodes[0];
            if (code >= 32 && code <= 126) {
                this.key = this.input;
                this.char = String.fromCharCode(code);
                this.description = `Key pressed: ${this.input}`;
            }
        }
    }

    enrichWithFrameContext() {
        // Get the currently active frame from the SelectionManager
        const activeFrame = this.window.selectionManager.getCurrentFrame();
        
        this.context = {
            frame: activeFrame,
            region: activeFrame?.region || null,
            isActive: !!activeFrame
        };
    }
}

export default KeyboardEvent;