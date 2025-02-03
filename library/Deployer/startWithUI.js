import CLIMatic from '../Deployer/modules/CLIMatic/CLIMatic.js';
import Window from '../Deployer/modules/CLIMatic/layout/Window.js';
import Region from '../Deployer/modules/CLIMatic/layout/Region.js';
import Frame from '../Deployer/modules/CLIMatic/layout/Frame.js';
import LogRenderer from '../Deployer/modules/CLIMatic/renderers/LogRenderer.js';
import CommandRegistry from '../Deployer/modules/CLIMatic/commands/CommandRegistry.js';
import MenuRenderer from '../Deployer/modules/CLIMatic/renderers/MenuRenderer.js';
import { processes, processSteps } from './processes/index.js';
import { DEPLOYER_EVENTS } from './events/index.js';
import chalk from 'chalk';

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function startWithUI(deployer, config, cleanup) {
    const climatic = new CLIMatic();
    const screen = climatic.getScreen();
    const window = new Window();

    // Create regions with relative positioning
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

    // Setup renderers
    const logRenderer = new LogRenderer();
    logFrame.setContent(logRenderer);

    // Enhanced event handling
    deployer.on(DEPLOYER_EVENTS.STATUS_UPDATE, ({ type, data }) => {
        if (type === 'error') {
            logRenderer.addLog(`Error: ${JSON.stringify(data)}`);
        } else if (type === 'warning') {
            logRenderer.addLog(`Warning: ${JSON.stringify(data)}`);
        } else {
            logRenderer.addLog(`${type}: ${JSON.stringify(data)}`);
        }
    });

    deployer.on(DEPLOYER_EVENTS.PROCESS_START, ({ processId, name }) => {
        logRenderer.addLog(`\x1b[36mStarting process: ${name}\x1b[0m`);
        deployer.updateStatus(processId, 'running');
    });

    deployer.on(DEPLOYER_EVENTS.PROCESS_COMPLETE, ({ processId, result }) => {
        logRenderer.addLog(`\x1b[32mProcess complete: ${processId}\x1b[0m`);
        logRenderer.addLog(`Result: ${JSON.stringify(result, null, 2)}`);
        deployer.updateStatus(processId, 'complete');
    });

    deployer.on(DEPLOYER_EVENTS.PROCESS_ERROR, ({ processId, error }) => {
        logRenderer.addLog(`\x1b[31mProcess error in ${processId}: ${error.message}\x1b[0m`);
        deployer.updateStatus(processId, 'error');
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_START, ({ description }) => {
        logRenderer.addLog(`\x1b[36mTransaction: ${description}\x1b[0m`);
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_HASH, ({ hash }) => {
        logRenderer.addLog(`\x1b[33mTransaction hash: ${hash}\x1b[0m`);
        logRenderer.addLog('\x1b[36mWaiting for confirmation...\x1b[0m');
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_CONFIRMED, ({ hash, receipt }) => {
        logRenderer.addLog(`\x1b[32mTransaction confirmed: ${hash}\x1b[0m`);
        logRenderer.addLog(`\x1b[36mGas used: ${receipt.gasUsed.toString()}\x1b[0m`);
        if (receipt.contractAddress) {
            logRenderer.addLog(`\x1b[32mContract deployed at: ${receipt.contractAddress}\x1b[0m`);
        }
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_ERROR, ({ description, error }) => {
        logRenderer.addLog(`\x1b[31mTransaction failed: ${description}\x1b[0m`);
        logRenderer.addLog(`\x1b[31mError: ${error.message}\x1b[0m`);
    });

    deployer.on(DEPLOYER_EVENTS.INPUT_REQUIRED, async ({ prompt, type }) => {
        try {
            logRenderer.addLog('\x1b[36mInput required\x1b[0m');
            const input = await window.prompt(prompt, logRenderer, {
                type: type
            });
            logRenderer.addLog(`\x1b[36mInput received internal: ${input}\x1b[0m`);
            
            if (input !== null) {
                deployer.emit(DEPLOYER_EVENTS.INPUT_RECEIVED, { input });
            }
        } catch (error) {
            logRenderer.addLog(`\x1b[31mInput error: ${error.message}\x1b[0m`);
        }
    });

    deployer.on(DEPLOYER_EVENTS.INPUT_RECEIVED, ({ input }) => {
        logRenderer.addLog(`\x1b[36mInput received event: ${input}\x1b[0m`);
    });

    deployer.on(DEPLOYER_EVENTS.CONFIRMATION_REQUIRED, async ({ message, data }) => {
        logRenderer.addLog('\x1b[36mCONFIRMATION_REQUIRED\x1b[0m');
        const input = await window.prompt(message, logRenderer, {
            type: 'confirm'
        });
        if(input === true) {
            logRenderer.addLog(`\x1b[32mConfirmation received: ${input}\x1b[0m`);
            deployer.emit(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, { confirmed: true });
        } else {
            logRenderer.addLog(`\x1b[31mConfirmation received: ${input}\x1b[0m`);
            deployer.emit(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, { confirmed: false });
        }
    });

    deployer.on(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, ({ confirmed }) => {
        logRenderer.addLog(`\x1b[36mConfirmation received: ${confirmed}\x1b[0m`);
    });

    const commandRegistry = new CommandRegistry();

    // Register deployment categories
    commandRegistry.registerCategory('Deployment', 'Deploy RAAC Token and configure settings');
    commandRegistry.registerCategory('Status', 'View deployment status and information');

    // Register process commands
    processSteps.forEach(step => {
        commandRegistry.registerCommand('Deployment', {
            id: step.id,
            label: step.name,
            description: step.description,
            execute: async () => {
                // console.log('Executing step:', step.id);
                try {
                    deployer.emit(DEPLOYER_EVENTS.PROCESS_START, {
                        processId: step.id,
                        name: step.name
                    });

                    const result = await processes[step.id](deployer, config);

                    deployer.emit(DEPLOYER_EVENTS.PROCESS_COMPLETE, {
                        processId: step.id,
                        result
                    });

                    // Show updated status
                    const status = deployer.getStatus();
                    logRenderer.addLog('\x1b[36mCurrent Deployment Status:\x1b[0m');
                    logRenderer.addLog(JSON.stringify(status, null, 2), 'data');

                    return result;
                } catch (error) {
                    deployer.emit(DEPLOYER_EVENTS.PROCESS_ERROR, {
                        processId: step.id,
                        error
                    });
                    throw error;
                }
            }
        });
    });

    // Add status commands
    commandRegistry.registerCommand('Status', {
        id: 'show-status',
        label: 'Show Deployment Status',
        description: 'Display current deployment status',
        execute: () => {
            const status = deployer.getStatus();
            logRenderer.addLog('\x1b[36mCurrent Deployment Status:\x1b[0m');
            logRenderer.addLog(JSON.stringify(status, null, 2), 'data');
        }
    });

    // Create menu renderer
    const menuRenderer = new MenuRenderer(commandRegistry);
    commandFrame.setContent(menuRenderer);

    // Setup window structure
    logRegion.addFrame(logFrame);
    commandRegion.addFrame(commandFrame);
    window.addRegion(logRegion);
    window.addRegion(commandRegion);
    screen.addWindow(window);

    // Select command frame by default
    window.selectionManager.selectFrame(commandFrame);

    // Handle cleanup on exit
    process.on('SIGINT', async () => {
        screen.cleanup();
        await cleanup();
        // process.exit(0);
    });
    
    // Capture every errors
    process.on('uncaughtException', (error) => {
        logRenderer.addLog('\x1b[31mUncaught Exception:\x1b[0m');
        logRenderer.addLog(`\x1b[31mUncaught Exception: ${error.message}\x1b[0m`);
        logRenderer.addLog(`\x1b[31mStack: ${error.stack}\x1b[0m`);
        // console.log('Uncaught Exception:', error.message);
        // console.log('Stack:', error.stack);
        // process.exit(1);
        // force rerender
        logRenderer.requestRender();
    });

    process.on('unhandledRejection', (reason, promise) => {

        logRenderer.addLog('\x1b[31mUnhandled Rejection:\x1b[0m');
        logRenderer.addLog(`\x1b[31mUnhandled Rejection: ${reason}\x1b[0m`);
        logRenderer.addLog(`\x1b[31mPromise: ${promise}\x1b[0m`);
        // console.log('Unhandled Rejection:', reason);
        // console.log('Promise:', promise);
        // process.exit(1);
        // force rerender
        logRenderer.requestRender();
    });


    return climatic;
}