export class MouseEvent {
    static BUTTONS = {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2,
        SCROLL_UP: 64,
        SCROLL_DOWN: 65
    };

    constructor(input, charCodes, window) {
        this.input = input;
        this.charCodes = charCodes;
        this.window = window;
        this.type = 'mouse';
        this.parse();
        this.enrichWithFrameContext();
    }

    static isMouseEvent(charCodes) {
        return charCodes.length >= 6 && 
               charCodes[0] === 27 && // ESC
               charCodes[1] === 91 && // [
               charCodes[2] === 60;   // <
    }

    parse() {
        const parts = this.input.slice(3).match(/(\d+);(\d+);(\d+)[Mm]/);
        if (!parts) {
            throw new Error('Invalid mouse event format');
        }

        const [_, btn, x, y] = parts;
        const buttonCode = parseInt(btn);

        this.button = this.getButtonType(buttonCode);
        this.position = {
            x: parseInt(x) - 1,
            y: parseInt(y) - 1
        };
        this.description = `Mouse ${this.button} at (${x},${y})`;
        this.raw = {
            buttonCode,
            charCodes: this.charCodes
        };
    }

    getButtonType(code) {
        switch (code) {
            case MouseEvent.BUTTONS.LEFT:
                return 'LEFT';
            case MouseEvent.BUTTONS.MIDDLE:
                return 'MIDDLE';
            case MouseEvent.BUTTONS.RIGHT:
                return 'RIGHT';
            case MouseEvent.BUTTONS.SCROLL_UP:
                return 'SCROLL_UP';
            case MouseEvent.BUTTONS.SCROLL_DOWN:
                return 'SCROLL_DOWN';
            default:
                return 'UNKNOWN';
        }
    }

    enrichWithFrameContext() {
        // Global position (window-relative)
        const globalPos = this.position;
        
        // Find the frame at this position
        let targetFrame = null;
        let relativePos = null;
        let region = null;

        this.window.regions.forEach(r => {
            r.frames.forEach(frame => {
                const absX = r.x;
                const absY = r.y + (frame.y || 0);
                
                if (globalPos.x >= absX && 
                    globalPos.x < absX + frame.width &&
                    globalPos.y >= absY && 
                    globalPos.y < absY + frame.height) {
                    targetFrame = frame;
                    region = r;
                    relativePos = {
                        x: globalPos.x - absX,
                        y: globalPos.y - absY
                    };
                }
            });
        });

        this.context = {
            frame: targetFrame,
            region: region,
            globalPosition: globalPos,
            relativePosition: relativePos
        };

        // throw new Error('test');
        console.log('.mou.se', JSON.stringify({
            region: region?.name,
            frame: targetFrame?.name,
            globalPosition: globalPos,
            relativePosition: relativePos
        }, null, 0));
    }
}

export default MouseEvent;