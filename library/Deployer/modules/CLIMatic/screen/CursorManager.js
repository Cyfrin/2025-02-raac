class CursorManager {
    static hideCursor() {
        process.stdout.write('\u001B[?25l');
    }

    static showCursor() {
        process.stdout.write('\u001B[?25h');
    }

    static moveToTop() {
        process.stdout.write('\u001B[0;0H');
    }

    static moveToBottom() {
        process.stdout.write(`\u001B[${process.stdout.rows};0H`);
    }

    static moveUp(lines = 1) {
        process.stdout.write(`\u001B[${lines}A`);
    }

    static clearLine() {
        process.stdout.write('\u001B[2K');
    }

    static clearScreen() {
        process.stdout.write('\u001B[2J');
    }

    static moveTo(x, y) {
        process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
    }

    static saveCursor() {
        process.stdout.write('\u001B7');
    }

    static restoreCursor() {
        process.stdout.write('\u001B8');
    }

    static getPromptPosition(windowHeight) {
        return {
            x: 1,
            y: windowHeight - 2  // One line up from bottom border
        };
    }
}

export default CursorManager;