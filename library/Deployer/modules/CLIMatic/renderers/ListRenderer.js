import chalk from 'chalk';
import { EventEmitter } from 'events';

class ListRenderer extends EventEmitter {
    constructor(items = []) {
        super();
        this.items = items;
        this.frame = null;
        this.selectedIndex = 0;
        this.onSelect = null;
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
                if (this.onSelect) {
                    this.onSelect(this.items[this.selectedIndex]);
                }
                return true;
            case 'LEFT_ARROW':
                this.emit('navigate:back');
                return true;
        }
        return false;
    }

    moveSelection(direction) {
        const newIndex = this.selectedIndex + direction;
        if (newIndex >= 0 && newIndex < this.items.length) {
            this.selectedIndex = newIndex;
            this.frame?.markDirty();
        }
    }

    setOnSelect(callback) {
        this.onSelect = callback;
    }

    setFrame(frame) {
        this.frame = frame;
    }

    toggleSelected() {
        if (this.items[this.selectedIndex]) {
            this.items[this.selectedIndex].checked = !this.items[this.selectedIndex].checked;
            this.frame?.markDirty();
        }
    }

    getSelectedItem() {
        return this.items[this.selectedIndex];
    }

    render() {
        const contentHeight = this.frame.height - 2;
        const contentWidth = this.frame.width - 4;
        
        return this.items.slice(0, contentHeight).map((item, index) => {
            const isSelected = index === this.selectedIndex;
            const prefix = isSelected ? '> ' : '  ';
            const checkbox = `[${item.checked ? 'x' : ' '}]`;
            const label = item.label;
            
            const baseLine = `${prefix}${checkbox} ${label}`.padEnd(contentWidth);
            
            if (isSelected && this.frame.isActive()) {
                return chalk.cyan.bold(baseLine);
            } else {
                return chalk.white(baseLine);
            }
        });
    }
}

export default ListRenderer;