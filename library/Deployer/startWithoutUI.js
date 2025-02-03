import { DEPLOYER_EVENTS } from './events/index.js';
import { processes, processSteps } from './processes/index.js';
import readline from 'readline/promises';
import chalk from 'chalk';

export async function startWithoutUI(deployer, config, cleanup) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    // Setup event handlers for status updates and logging
    deployer.on(DEPLOYER_EVENTS.STATUS_UPDATE, ({ type, data }) => {
        if (type === 'error') {
            console.log(chalk.red(`Error: ${JSON.stringify(data)}`));
        } else if (type === 'warning') {
            console.log(chalk.yellow(`Warning: ${JSON.stringify(data)}`));
        } else {
            console.log(chalk.gray(`${type}: ${JSON.stringify(data)}`));
        }
    });

    // Handle process lifecycle events
    deployer.on(DEPLOYER_EVENTS.PROCESS_START, ({ processId, name }) => {
        console.log(chalk.cyan(`\nStarting: ${name}`));
        deployer.updateStatus(processId, 'running');
    });

    deployer.on(DEPLOYER_EVENTS.PROCESS_COMPLETE, ({ processId, result }) => {
        console.log(chalk.green(`\nCompleted: ${processId}`));
        console.log(chalk.gray(JSON.stringify(result, null, 2)));
        deployer.updateStatus(processId, 'complete');
    });

    deployer.on(DEPLOYER_EVENTS.PROCESS_ERROR, ({ processId, error }) => {
        console.log(chalk.red(`\nError in ${processId}: ${error.message}`));
        deployer.updateStatus(processId, 'error');
    });

    // Handle transaction events with more detail
    deployer.on(DEPLOYER_EVENTS.TRANSACTION_START, ({ description }) => {
        console.log(chalk.blue(`\nTransaction: ${description}`));
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_HASH, ({ hash }) => {
        console.log(chalk.gray(`Transaction hash: ${hash}`));
        console.log(chalk.gray('Waiting for confirmation...'));
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_CONFIRMED, ({ hash, receipt }) => {
        console.log(chalk.green(`Transaction confirmed: ${hash}`));
        console.log(chalk.gray(`Gas used: ${receipt.gasUsed.toString()}`));
        if (receipt.contractAddress) {
            console.log(chalk.green(`Contract deployed at: ${receipt.contractAddress}`));
        }
    });

    deployer.on(DEPLOYER_EVENTS.TRANSACTION_ERROR, ({ description, error }) => {
        console.log(chalk.red(`Transaction failed: ${description}`));
        console.log(chalk.red(`Error: ${error.message}`));
    });

    deployer.on(DEPLOYER_EVENTS.INPUT_REQUIRED, async ({ prompt, type }) => {
        let input;
        
        if (type === 'password') {
            process.stdout.write(chalk.cyan(`${prompt}: `));
            
            process.stdin.setRawMode(true);
            process.stdin.resume();
            
            input = await new Promise(resolve => {
                let password = '';
                
                const keyHandler = (buffer) => {
                    // if (!key) return;
                    // console.log(chalk.cyan(`Key: ${chunk}`));
                    
                    if (buffer.toString() === '\r') {

                        console.log(chalk.cyan(`Input received: ${password}`));
                        process.stdin.removeListener('data', keyHandler);
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdout.write('\n');
                        resolve(password);
                    } else if (buffer.toString() === '\u0003' || buffer.toString() === '\u0004' || buffer.toString() === '\u0000') {
                        console.log(chalk.red('Cancelled'));
                        process.stdin.removeListener('data', keyHandler);
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdout.write('\n');
                        resolve(password);
                    } else {
                        password += buffer.toString();
                        // process.stdout.write('*');
                    }
                };
                
                process.stdin.on('data', keyHandler);
            });
        } else {
            process.stdout.write(chalk.cyan(`${prompt}: `));
            input = await rl.question('');
        }
        
        console.log(chalk.cyan(`Input received: ${input}`));
        deployer.emit(DEPLOYER_EVENTS.INPUT_RECEIVED, { input });
    });

    deployer.on(DEPLOYER_EVENTS.INPUT_RECEIVED, ({ input }) => {
        console.log(chalk.cyan(`Input received: ${input}`));
    });


    deployer.on(DEPLOYER_EVENTS.CONFIRMATION_REQUIRED, async ({ message, data }) => {
        const input = await rl.question(`${message} (y/N): `);
        deployer.emit(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, { confirmed: input === 'y' });
    });

    deployer.on(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, ({ confirmed }) => {
        console.log(chalk.cyan(`Confirmation received: ${confirmed}`));
    });

    try {
        deployer.logger.addLog('STARTING_DEPLOYMENT', {
            message: 'Starting deployment process...'
        });
        for (const step of processSteps) {
            try {
                deployer.emit(DEPLOYER_EVENTS.PROCESS_START, {
                    processId: step.id ?? 'unknown',
                    name: step.name ?? 'unknown'
                });

                const result = await processes[step.id](deployer, config);

                deployer.emit(DEPLOYER_EVENTS.PROCESS_COMPLETE, {
                    processId: step.id,
                    result
                });

                // Show current status after each step
                const status = deployer.getStatus();
                console.log(chalk.cyan('\nCurrent Deployment Status:'));
                console.log(chalk.gray(JSON.stringify(status, null, 2)));

                if (step.id !== processSteps[processSteps.length - 1].id) {
                    const shouldContinue = await deployer.requireConfirmation(
                        'Continue to next step?',
                        { nextStep: processSteps[processSteps.indexOf(step) + 1] }
                    );

                    if (!shouldContinue) {
                        console.log(chalk.yellow('Deployment paused by user'));
                        break;
                    }
                }
            } catch (error) {
                deployer.emit(DEPLOYER_EVENTS.PROCESS_ERROR, {
                    processId: step.id,
                    error
                });

                const shouldContinue = await deployer.requireConfirmation(
                    'An error occurred. Would you like to continue to the next step?',
                    { error: error.message }
                );

                if (!shouldContinue) {
                    console.log(chalk.red('Deployment cancelled due to error'));
                    break;
                }
            }
        }

        console.log(chalk.green('\nDeployment process completed'));
        console.log(chalk.cyan('Final Status:'));
        console.log(chalk.gray(JSON.stringify(deployer.getStatus(), null, 2)));
        
    } finally {
        rl.close();
        await cleanup();
    }
}