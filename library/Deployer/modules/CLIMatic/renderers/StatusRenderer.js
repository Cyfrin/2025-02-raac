import chalk from 'chalk';

class StatusRenderer {
    constructor(config = {}) {
        this.frame = null;
        this.network = config.network || 'ethereum';
        this.updateInterval = null;
    }

    setFrame(frame) {
        this.frame = frame;
        this.startTimeUpdate();
        return this;
    }

    setNetwork(network) {
        this.network = network;
        this.frame?.markDirty();
        return this;
    }

    startTimeUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => {
            this.frame?.markDirty();
            this.frame?.region?.window?.renderDirty();
        }, 1000);
        return this;
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        return this;
    }

    render() {
        if (!this.frame) {
            return ['No frame set'];
        }
        
        const contentWidth = this.frame.width - 4;
        const currentTime = new Date().toLocaleTimeString();
        const networkInfo = `Network: ${chalk.green(this.network)}`;
        const line = `${currentTime} | ${networkInfo}`.padEnd(contentWidth);
        
        return [line];
    }
}

export default StatusRenderer;