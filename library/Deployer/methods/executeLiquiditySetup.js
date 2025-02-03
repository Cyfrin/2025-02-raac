import { ethers } from 'ethers';

export default async function executeLiquiditySetup(config, deployedContracts) {
    const { logger } = this;
    
    console.log('Executing Liquidity Setup...');
    console.log(config);
    console.log(deployedContracts);
    logger.addLog('EXECUTE_LIQUIDITY_START', { config, deployedContracts });

    try {
        // Step 1: Deploy LPToken
        logger.addLog('DEPLOY_LP_TOKEN_START');
        const LPToken = await ethers.getContractFactory("LPToken");
        const lpToken = await LPToken.deploy(
            "RAAC-USDC LP",
            "RAAC-LP",
            deployedContracts.token.address
        );
        await lpToken.deployed();
        logger.addLog('DEPLOY_LP_TOKEN_SUCCESS', {
            address: lpToken.address,
            tx: lpToken.deployTransaction.hash
        });

        // Step 2: Set up StabilityPool
        logger.addLog('DEPLOY_STABILITY_POOL_START');
        const StabilityPool = await ethers.getContractFactory("StabilityPool");
        const stabilityPool = await StabilityPool.deploy(
            deployedContracts.token.address,
            lpToken.address
        );
        await stabilityPool.deployed();
        logger.addLog('DEPLOY_STABILITY_POOL_SUCCESS', {
            address: stabilityPool.address,
            tx: stabilityPool.deployTransaction.hash
        });

        // Step 3: Initialize liquidity with time locks
        logger.addLog('INITIALIZE_LIQUIDITY_START', { wallets: config.wallets });
        for (const wallet of config.wallets) {
            const tx = await stabilityPool.initializeLiquidity(
                wallet.address,
                ethers.utils.parseUnits(wallet.amount, 18),
                wallet.lockUntil
            );
            await tx.wait();
            logger.addLog('INITIALIZE_LIQUIDITY_SUCCESS', {
                address: wallet.address,
                amount: wallet.amount,
                lockUntil: wallet.lockUntil,
                tx: tx.hash
            });
        }

        const result = {
            lpToken: {
                address: lpToken.address,
                tx: lpToken.deployTransaction.hash
            },
            stabilityPool: {
                address: stabilityPool.address,
                tx: stabilityPool.deployTransaction.hash
            }
        };

        logger.addLog('EXECUTE_LIQUIDITY_SUCCESS', result);
        return result;

    } catch (error) {
        logger.addLog('EXECUTE_LIQUIDITY_ERROR', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
} 