import chalk from 'chalk';

class ResultRenderer {
    constructor() {
        this.result = null;
        this.frame = null;
    }

    setFrame(frame) {
        this.frame = frame;
        return this;
    }

    setResult(result) {
        this.result = result;
        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

    render() {
        if (!this.frame) {
            return ['No frame set'];
        }

        const contentHeight = this.frame.height - 2;
        const contentWidth = this.frame.width - 40;
        const lines = [];

        // Add top border spacing
        lines.push('');

        if (!this.result) {
            lines.push('  ' + chalk.gray('No results to display...'));
            for (let i = 1; i < contentHeight; i++) {
                lines.push('  '); // Add left spacing
            }
            lines.push(''); // Add bottom border spacing
            return lines;
        }

        // Format the result nicely with proper indentation
        const formattedResult = JSON.stringify(this.result, null, 2)
            .split('\n')
            .map(line => '  ' + line.padEnd(contentWidth - 2)); // Add left spacing

        // Add formatted lines
        lines.push(...formattedResult);

        // Fill remaining space with proper spacing
        while (lines.length < contentHeight ) {
            lines.push('  '); // Add left spacing
        }

        // Add bottom border spacing
        lines.push('');

        return lines;
    }
}

export default ResultRenderer;