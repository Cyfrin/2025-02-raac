import { ethers } from 'ethers';

export async function prepareDeploy(deployments = [], wallet) {
    const { logger } = this;
    logger.addLog('PREPARE_DEPLOY_START', { deployments, wallet: wallet.address });

    try {
        // Validate wallet
        if (!wallet || !wallet.provider) {
            throw new Error('Invalid wallet provided');
        }

        // Get wallet balance
        const balance = await wallet.provider.getBalance(wallet.address);
        logger.addLog('WALLET_BALANCE_CHECK', { 
            balance: ethers.formatEther(balance),
            address: wallet.address 
        });

        // Estimate total gas needed
        let totalGasNeeded = ethers.parseEther('0');
        const preparedDeployments = [];

        for (const deployment of deployments) {
            const { contractName, args = [], artifact } = deployment;
            
            // Replace placeholder args with temporary addresses for gas estimation
            const estimationArgs = args.map(arg => {
                // If the arg is a special placeholder (e.g., for contract addresses)
                if (typeof arg === 'string' && arg.startsWith('{{') && arg.endsWith('}}')) {
                    return '0x' + '1'.repeat(40); // Use dummy address for estimation
                }
                return arg;
            });

            // Get contract factory
            // const abi = // TODO: Get abi from contractName
            const abi = deployment.artifact.abi;
            const bytecode = deployment.artifact.bytecode;

            const Contract = new ethers.ContractFactory(abi, bytecode, wallet);
            
            // Estimate gas for deployment
            const deployTx = await Contract.getDeployTransaction(...estimationArgs);
            const gasEstimate = await wallet.provider.estimateGas(deployTx);
            const gasCost = gasEstimate * (await wallet.provider.getFeeData()).maxFeePerGas;
            
            totalGasNeeded = totalGasNeeded + gasCost;

            preparedDeployments.push({
                contractName,
                args,
                artifact,
                originalArgs: args, // Keep original args with placeholders
                gasEstimate,
                gasCost: ethers.formatEther(gasCost)
            });

            logger.addLog('DEPLOYMENT_PREPARED', {
                contractName,
                args,
                gasEstimate: gasEstimate.toString(),
                estimatedCost: ethers.formatEther(gasCost)
            });
        }

        // Check if wallet has enough balance
        if (totalGasNeeded > balance) {
            throw new Error(`Insufficient balance. Need ${ethers.formatEther(totalGasNeeded)} ETH but wallet only has ${ethers.formatEther(balance)} ETH`);
        }

        const result = {
            wallet: wallet.address,
            totalGasNeeded: ethers.formatEther(totalGasNeeded),
            totalBalance: ethers.formatEther(balance),
            deployments: preparedDeployments
        };

        logger.addLog('PREPARE_DEPLOY_SUCCESS', result);
        return result;

    } catch (error) {
        logger.addLog('PREPARE_DEPLOY_ERROR', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

export default prepareDeploy;