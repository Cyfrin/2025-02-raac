import chalk from 'chalk';
import { EventEmitter } from 'events';

class OptionRenderer extends EventEmitter {
    constructor(items = []) {
        super();
        this.items = items;
        this.frame = null;
        this.selectedIndex = 0;
        this.selectedOption = null;
        this.onSelect = null;
    }

    setFrame(frame) {
        this.frame = frame;
    }

    moveSelection(direction) {
        const newIndex = this.selectedIndex + direction;
        if (newIndex >= 0 && newIndex < this.items.length) {
            this.selectedIndex = newIndex;
            this.frame?.markDirty();
            this.frame?.region?.window?.renderDirty();
        }
    }

    toggleSelected() {
        if (this.items[this.selectedIndex]) {
            // Set all items to unchecked
            this.items.forEach(item => item.checked = false);
            // Set only the selected item to checked
            this.items[this.selectedIndex].checked = true;
            this.selectedOption = this.items[this.selectedIndex];
            
            if (this.onSelect) {
                this.onSelect(this.items[this.selectedIndex]);
            }
            
            this.frame?.markDirty();
            this.frame?.region?.window?.renderDirty();
        }
    }

    setOnSelect(callback) {
        this.onSelect = callback;
        this.emit('onSelect', this.items[this.selectedIndex]);
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
            const radio = `(${item.checked ? '●' : '○'})`;
            const label = item.label;
            
            const baseLine = `${prefix}${radio} ${label}`.padEnd(contentWidth);
            
            if (isSelected && this.frame.isActive()) {
                return chalk.cyan.bold(baseLine);
            } else {
                return chalk.white(baseLine);
            }
        });
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
                this.toggleSelected();
                return true;
            case 'LEFT_ARROW':
                this.emit('navigate:back');
                return true;
        }
        return false;
    }
}

export default OptionRenderer;