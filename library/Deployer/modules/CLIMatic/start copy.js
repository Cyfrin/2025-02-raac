import chalk from 'chalk';
import Window from './layout/Window.js';
import Region from './layout/Region.js';
import Frame from './layout/Frame.js';
import LogRenderer from './renderers/LogRenderer.js';
import CLIMatic from './CLIMatic.js';
import SelectableListRenderer from './renderers/SelectableListRenderer.js';
import OptionRenderer from './renderers/OptionRenderer.js';
import ListRenderer from './renderers/ListRenderer.js';
import { getAscii } from './importAscii.js';
import CommandRegistry from './commands/CommandRegistry.js';
import MenuRenderer from './renderers/MenuRenderer.js';
import { AsciiAnimator } from './AsciiAnimator.js'; // Add this import

// const ascii = getAscii();
async function showStartupAnimation() {
    const animator = new AsciiAnimator();
    
    // Return a promise that resolves when animation is complete
    return new Promise((resolve) => {
        animator.onComplete = () => {
            console.clear();
            resolve();
        };
        animator.start();
    });
}

await showStartupAnimation();
const climatic = new CLIMatic();
const screen = climatic.getScreen();
const window = new Window();

// Create regions with the same configuration
const logRegion = new Region('LogRegion', {
    relativeX: 0.01,
    relativeY: 0.01,
    relativeWidth: 0.98,
    relativeHeight: 0.80
});

const commandRegion = new Region('CommandRegion', {
    relativeX: 0.01,
    relativeY: 0.81,
    relativeWidth: 0.98,
    relativeHeight: 0.20
});

// Create frames
const logFrame = new Frame('LogFrame', {
    relativeX: 0,
    relativeY: 0,
    relativeWidth: 1,
    relativeHeight: 1
});

const commandFrame = new Frame('CommandFrame', {
    relativeX: 0,
    relativeY: 0,
    relativeWidth: 1,
    relativeHeight: 1
});

// Setup log renderer with no initial logs
const logRenderer = new LogRenderer();
logFrame.setContent(logRenderer);
// logRenderer.setLogs(ascii);

logRenderer.addLog(deploymentSteps[deploymentSteps.length - 1].message);


const commandRegistry = new CommandRegistry();

// Register categories
commandRegistry.registerCategory('Smart Contracts', 'Manage and deploy smart contracts');
commandRegistry.registerCategory('Settings', 'Configure application settings');
commandRegistry.registerCategory('Tools', 'Additional utilities');

// Register commands
commandRegistry.registerCommand('Smart Contracts', {
    id: 'deploy',
    label: 'Deploy Smart Contract',
    description: 'Deploy a new smart contract to the network',
    execute: () => {
        // logRenderer.clearLogs(); // Clear existing logs
        simulateDeployment(logRenderer);
    }
});

commandRegistry.registerCommand('Settings', {
    id: 'network',
    label: 'Network Selection',
    description: 'Choose the blockchain network',
    execute: () => {
        const networkMenu = new OptionRenderer([
            { label: 'Ethereum Mainnet', checked: true },
            { label: 'Goerli Testnet', checked: false },
            { label: 'Sepolia Testnet', checked: false }
        ]);
        
        networkMenu.setOnSelect((item) => {
            logRenderer.addLog(`Selected network: ${item.label}`);
            // go back to the main menu
            networkMenu.emit('navigate:back');
        });

        
        setupNavigationHandlers(networkMenu, commandFrame);
        commandFrame.setContent(networkMenu);
    }
});

commandRegistry.registerCommand('Settings', {
    id: 'deploy-options',
    label: 'Deployment Options',
    description: 'Configure deployment settings',
    execute: () => {
        const deployMenu = new ListRenderer([
            { label: 'Verify on Etherscan', checked: true },
            { label: 'Run post-deploy scripts', checked: true },
            { label: 'Generate documentation', checked: false }
        ]);

        deployMenu.setOnSelect((item) => {
            item.checked = !item.checked;
            logRenderer.addLog(`${item.label}: ${item.checked ? 'Enabled' : 'Disabled'}`);
            // Optional: go back to main menu after toggling
            // deployMenu.emit('navigate:back');
        });
        
        setupNavigationHandlers(deployMenu, commandFrame);
        commandFrame.setContent(deployMenu);
    }
});

// Create menu renderer with command registry
const menuRenderer = new MenuRenderer(commandRegistry);
commandFrame.setContent(menuRenderer);

// Settings renderers
const networkOptions = new OptionRenderer([
    { label: 'Ethereum Mainnet', checked: true },
    { label: 'Goerli Testnet', checked: false },
    { label: 'Sepolia Testnet', checked: false }
]);

const deployOptions = new ListRenderer([
    { label: 'Verify on Etherscan', checked: true },
    { label: 'Run post-deploy scripts', checked: true },
    { label: 'Generate documentation', checked: false }
]);

// Deployment simulation steps
import { deploymentSteps } from './steps.js';

async function simulateDeployment(logRenderer) {
    for (const step of deploymentSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        logRenderer.addLog(step.message);
    }
}

function showSettings(frame, networkOptions, deployOptions) {
    const settingsMenu = new SelectableListRenderer([
        { label: 'Network Selection', action: 'network' },
        { label: 'Deploy Options', action: 'deploy-options' },
        { label: 'Back to Main Menu', action: 'back' }
    ]);

    settingsMenu.setOnSelect((item) => {
        switch(item.action) {
            case 'network':
                frame.setContent(networkOptions);
                break;
            case 'deploy-options':
                frame.setContent(deployOptions);
                break;
            case 'back':
                frame.setContent(commandRenderer);
                break;
        }
    });

    frame.setContent(settingsMenu);
}

function setupNavigationHandlers(renderer, frame) {
    renderer.on('navigate:back', () => {
        // Create a new instance of the main menu
        const mainMenu = new MenuRenderer(commandRegistry);
        frame.setContent(mainMenu);
    });
}

// Setup window structure
logRegion.addFrame(logFrame);
commandRegion.addFrame(commandFrame);
window.addRegion(logRegion);
window.addRegion(commandRegion);
screen.addWindow(window);

// Select command frame by default
window.selectionManager.selectFrame(commandFrame);

// Start the CLI
climatic.start();

// Handle cleanup
process.on('SIGINT', () => {
    window.cleanup();
    process.exit(0);
});