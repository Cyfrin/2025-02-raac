import chalk from 'chalk';

class TextRenderer {
    constructor(config = {}) {
        this.frame = null;
        this.text = config.text || '';
        this.alignment = config.alignment || 'left';
        this.style = config.style || chalk.white;
    }

    setFrame(frame) {
        this.frame = frame;
        return this;
    }

    setText(text) {
        this.text = text;
        this.frame?.markDirty();
        this.frame?.region?.window?.markDirty();
    }

    render() {
        if (!this.frame) {
            return ['No frame set'];
        }

        const contentWidth = this.frame.width - 4;
        const lines = Array.isArray(this.text) ? this.text : [this.text];
        
        return lines.map(line => {
            const textLine = line?.label || line?.toString() || '';
            switch(this.alignment) {
                case 'center':
                    const padding = Math.max(0, (contentWidth - textLine.length) / 2);
                    return this.style(textLine.padStart(padding + textLine.length).padEnd(contentWidth));
                case 'right':
                    return this.style(textLine.padStart(contentWidth));
                default:
                    return this.style(textLine.padEnd(contentWidth));
            }
        });
    }
}

export default TextRenderer;