import chalk from 'chalk';

class BottomRenderer {
    constructor(config = {}) {
        this.frame = null;
        this.updateInterval = null;
    }

    setFrame(frame) {
        this.frame = frame;
        this.startTimeUpdate();
        return this;
    }


    setContent(content) {
        this.content = content;
        return this;
    }

    startTimeUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        return this;
    }

    render() {
        return ['No frame set'];
    }

    update() {
        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

}

export default BottomRenderer;