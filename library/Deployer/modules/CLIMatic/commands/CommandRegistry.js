import { EventEmitter } from 'events';

class CommandRegistry extends EventEmitter {
    constructor() {
        super();
        this.commands = new Map();
        this.categories = new Map();
    }

    registerCategory(name, description) {
        this.categories.set(name, {
            name,
            description,
            commands: new Set()
        });
    }

    registerCommand(category, command) {
        if (!this.categories.has(category)) {
            this.registerCategory(category, 'Uncategorized');
        }
        
        this.commands.set(command.id, {
            ...command,
            category
        });
        
        this.categories.get(category).commands.add(command.id);
    }

    getCommandsByCategory(category) {
        return Array.from(this.categories.get(category).commands)
            .map(id => this.commands.get(id));
    }

    getAllCategories() {
        return Array.from(this.categories.values());
    }

    executeCommand(commandId, ...args) {
        const command = this.commands.get(commandId);
        if (command && command.execute) {
            return command.execute(...args);
        }
        return false;
    }
}

export default CommandRegistry;