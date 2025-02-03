import chalk from 'chalk';
import { EventEmitter } from 'events';

class SelectableListRenderer extends EventEmitter {
    constructor(items = []) {
        super();
        this.items = items;
        this.frame = null;
        this.selectedIndex = 0;
        this.onSelect = null;
    }

    setFrame(frame) {
        this.frame = frame;
    }

    setItems(items) {
        this.items = items;
        this.selectedIndex = 0;
        this.frame?.markDirty();
        this.frame?.region?.window?.renderDirty();
    }

    setOnSelect(callback) {
        this.onSelect = callback;
    }

    moveSelection(direction) {
        const newIndex = this.selectedIndex + direction;
        if (newIndex >= 0 && newIndex < this.items.length) {
            this.selectedIndex = newIndex;
            this.frame?.markDirty();
            this.frame?.region?.window?.renderDirty();
        }
    }

    handleKeypress(event) {
        if (!this.frame?.isActive()) return false;

        switch(event.key) {
            case 'UP_ARROW':
                this.moveSelection(-1);
                return true;
            case 'DOWN_ARROW':
                this.moveSelection(1);
                return true;
            case 'ENTER':
            case 'RETURN':
            case 'SPACE':
                if (this.onSelect && this.items[this.selectedIndex]) {
                    this.onSelect(this.items[this.selectedIndex]);
                    return true;
                }
                break;
            case 'LEFT_ARROW':
                this.emit('navigate:back');
                return true;
                break;
        }
        return false;
    }

    getSelectedItem() {
        return this.items[this.selectedIndex];
    }

    render() {
        if (!this.frame) {
            return ['No frame set'];
        }

        const contentHeight = this.frame.height - 2;
        const contentWidth = this.frame.width - 4;
        
        return this.items.slice(0, contentHeight).map((item, index) => {
            const isSelected = index === this.selectedIndex;
            const prefix = isSelected ? '> ' : '  ';
            const label = item.label || item.toString();
            
            const baseLine = `${prefix}${label}`.padEnd(contentWidth);
            
            if (isSelected && this.frame.isActive()) {
                return chalk.cyan.bold(baseLine);
            } else {
                return chalk.white(baseLine);
            }
        });
    }
}

export default SelectableListRenderer;