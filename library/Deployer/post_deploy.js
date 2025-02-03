import Deployer from './Deployer.js';
import { ethers } from 'ethers';

async function main() {
    const deployer = new Deployer();

    // 1. Set up network and wallet (similar to simple_deploy.js)
    const networkName = process.env.NETWORK || 'holesky';
    const network = await deployer.readNetworkFile(networkName);
    deployer.setNetwork(network);

    const mnemonic = process.env.MNEMONIC;
    if(!mnemonic) throw new Error('MNEMONIC is not set');
    const wallet = deployer.createWallet(mnemonic, networkName);

    // 2. Load previous deployment information 
    const defaultDeploymentHash = "0xf974dc631d132c8d2444f06fc452836c4283aa149053ae07f41669a56b5a0eb0";
    const deploymentHash = process.env.DEPLOYMENT_HASH || defaultDeploymentHash;
    if(!deploymentHash) throw new Error('DEPLOYMENT_HASH is not set');

    const deploymentState = await deployer.loadDeploymentState(networkName, deploymentHash);
    console.log('Loaded deployment state:', {
        network: deploymentState.network,
        contracts: deploymentState.deployedAddresses
    });

    // 3. Prepare TGE Configuration

    const addressTeam1 = {
        identifier: 'team1',
        type: 'team',
        address:'0x2549E2E821E3413E6C0235318E3799263E643013',
        amount: '1000000',
    }

    const addressTeam2 = {
        identifier: 'team2',
        type: 'team',
        address:'0xc6822649A9959C0a45c092a329C77d16F5978426',
        amount: '1000000',
    }

    const addressDeployer = {
        identifier: 'deployer',
        type: 'deployer',
        address: wallet.address,
        amount: '1000000',
        schedules: [{
            type: "linear",
            start: Math.floor(Date.now() / 1000), // now
            end: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
        }]
    }

    const tgeConfig = {
        wallets: [
            addressTeam1,
            addressTeam2,
            addressDeployer,
        ]
    };

    // 4. Execute TGE steps
    try {
        // Prepare all configurations
        // const tgePrepared = await deployer.prepareTGE(tgeConfig);
        // console.log('TGE Preparation complete:', tgePrepared);

        // Execute TGE
        // const tgeResult = await deployer.executeTGE(tgePrepared);
        // console.log('TGE Execution complete:', tgeResult);




        
        // // Setup Liquidity
        // const liquidityResult = await deployer.executeLiquiditySetup(
        //     prepared.liquidityConfig,
        //     deploymentState.deployedAddresses
        // );
        // console.log('Liquidity Setup complete:', liquidityResult);

        // // Setup Public Sale
        // const publicSaleResult = await deployer.executePublicSale(
        //     prepared.publicSaleConfig,
        //     deploymentState.deployedAddresses
        // );
        // console.log('Public Sale Setup complete:', publicSaleResult);

        // Final state will be saved automatically through ParaLogger

    } catch (error) {
        console.error('Error during post-deployment:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });