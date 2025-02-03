import Deployer from './Deployer.js';
import tgeConfig from './tge.json' with { type: 'json' };
import readline from 'readline/promises';
import { startWithoutUI } from './startWithoutUI.js';
import { startWithUI } from './startWithUI.js';

let rl;

async function confirm(message) {
    if (!rl) {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    const answer = await rl.question(`${message} (y/N): `);
    return answer.toLowerCase() === 'y';
}

async function cleanup() {
    if (rl) {
        rl.close();
        rl = null;
    }
}

async function main() {
    console.log('RAAC Token Generation Event (TGE) Deployment Tool');
    console.log('---------------------------------------------');

    const deployer = new Deployer();

    try {
        const useUI = await confirm('Would you like to use the CLI UI interface?');
        const config = {
            network: {
                name: 'sepolia',
                chainId: 11155111
            },
            contracts: ['RAACToken'],
            settings: {
                tge: {
                    startDate: '2024-01-01',
                    endDate: '2024-01-01',
                    totalSupply: 1000000000000000000000000000
                }
            },
        };

        if (!useUI) {
            console.log('Starting with UI');
            await cleanup(); // Close readline before starting UI
            await startWithUI(deployer, config, cleanup);
        } else {
            console.log('Starting without UI');
            await startWithoutUI(deployer, config, cleanup);
        }
    } catch (error) {
        console.error('Error:', error);
        // Export logs on error for debugging
        console.log('\nDeployment Logs:');
        console.log(JSON.stringify(deployer.logger.export(), null, 2));
        await cleanup();
        process.exit(1);
    }
}

// Handle cleanup on interruption
process.on('SIGINT', async () => {
    console.log('SIGINT received');
    console.log('\nDeployment interrupted by user');
    await cleanup();
    // process.exit(0);
});

// Handle any uncaught errors
process.on('uncaughtException', async (error) => {
    console.error('Uncaught error:', error);
    await cleanup();
    // process.exit(1);
});

main().catch(async (error) => {
    console.error('Error:', error);
    await cleanup();
    // process.exit(1);
});
