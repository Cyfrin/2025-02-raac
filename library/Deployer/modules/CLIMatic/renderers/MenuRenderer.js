import SelectableListRenderer from './SelectableListRenderer.js';
import chalk from 'chalk';

class MenuRenderer extends SelectableListRenderer {
    constructor(commandRegistry) {
        super([]);
        this.commandRegistry = commandRegistry;
        this.currentCategory = null;
        this.breadcrumbs = [];
        this.buildMainMenu();
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
                const selectedItem = this.items[this.selectedIndex];
                if (selectedItem && selectedItem.action) {
                    selectedItem.action();
                    return true;
                }
                break;
        }
        return false;
    }

    buildMainMenu() {
        const categories = this.commandRegistry.getAllCategories();
        this.setItems(categories.map(category => ({
            label: category.name,
            description: category.description,
            action: () => this.showCategory(category.name)
        })));
        this.breadcrumbs = ['Main Menu'];
    }

    showCategory(categoryName) {
        const commands = this.commandRegistry.getCommandsByCategory(categoryName);
        this.setItems([
            ...commands.map(cmd => ({
                label: cmd.label,
                description: cmd.description,
                action: () => {
                    if (cmd.execute) {
                        cmd.execute();
                    }
                }
            })),
            { label: '← Back', action: () => this.buildMainMenu() }
        ]);
        this.breadcrumbs = ['Main Menu', categoryName];
    }

    render(fullRender = false) {
        const menuContent = super.render(fullRender);
        const breadcrumbLine = chalk.gray('▸ ' + this.breadcrumbs.join(' > '));
        return [breadcrumbLine, '', ...menuContent];
    }
}

export default MenuRenderer;