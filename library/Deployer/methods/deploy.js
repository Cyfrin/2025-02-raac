import { ethers } from 'ethers';
import crypto from 'crypto';

export async function deploy(preparedDeployment, wallet, deployedContracts, feeData) {
    const { logger } = this;
    logger.addLog('DEPLOY_START', { preparedDeployment: {name: preparedDeployment.contractName, args: preparedDeployment.originalArgs} });

    try {
        const results = [];
        const deploymentStartTime = Date.now();
        let deploymentHash;

        // Get network information early
        const network = await wallet.provider.getNetwork();
        const networkName = network.name || String(network.chainId);

        const { contractName, originalArgs, artifact } = preparedDeployment;

            // Resolve any placeholder arguments with actual deployed addresses
            // const resolvedArgs = originalArgs.map(arg => {
            //     if (typeof arg === 'string' && arg.startsWith('{{') && arg.endsWith('}}')) {
            //         const contractRef = arg.slice(2, -2).trim(); // Remove {{ }}
            //         if (!deployedContracts[contractRef]) {
            //             throw new Error(`Contract ${contractRef} not deployed yet but required by ${contractName}`);
            //         }
            //         return deployedContracts[contractRef];
            //     }
            //     return arg;
            // });
            const resolvedArgs = originalArgs;

            logger.addLog('DEPLOYING_CONTRACT', { contractName, resolvedArgs });

            const instance = await this.executeTransaction(
                `Deploying ${contractName}`,
                async (signer) => {
                    const Contract = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
                    const opts = {
                        maxFeePerGas: feeData.maxFeePerGas,
                        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                    }

                    const contract = await Contract.deploy(...resolvedArgs, opts);

                    const deployTx = contract.deploymentTransaction();
                    if (!deployTx) {
                        throw new Error('No deployment transaction found');
                    }
                    
                    logger.addLog('DEPLOY_TRANSACTION', { transaction: deployTx });
                    // Get the deployment receipt
                    const receipt = await signer.provider.waitForTransaction(deployTx.hash);
                    console.log({receipt});
                     // Get the contract address
                     const address = await contract.getAddress();
                     logger.addLog('DEPLOY_CONTRACT_ADDRESS', { address });
                     console.log({address});
                    
                    return {
                        contract,
                        hash: deployTx.hash,
                        receipt,
                        address
                    };
                }
            );

            // Set deploymentHash from the first transaction if not set
            if (!deploymentHash) {
                deploymentHash = instance.hash;
            }

            // Store the deployed address for potential use by subsequent deployments
            // deployedContracts[contractName] = instance.address;

            // Add detailed deployment result
            results.push({
                contractName,
                address: instance.address,
                transactionHash: instance.hash,
                receipt: instance.receipt,
                constructorArgs: resolvedArgs,
                gasUsed: instance.receipt.gasUsed.toString(),
                blockNumber: instance.receipt.blockNumber,
                timestamp: (await wallet.provider.getBlock(instance.receipt.blockNumber)).timestamp,
                status: instance.receipt.status === 1 ? 'success' : 'failed'
            });

            logger.addLog('CONTRACT_DEPLOYED', {
                contractName,
                address: instance.address,
                transactionHash: instance.hash
            });
        
        const finalState = {
            timestamp: deploymentStartTime,
            network: {
                name: networkName,
                chainId: network.chainId
            },
            deployer: wallet.address,
            deploymentHash,
            results,
            deployedContracts,
            logs: logger.export(),
            success: true
        };

        logger.addLog('DEPLOY_SUCCESS', { results });

        // Save deployment state using the transaction hash
        const { deploymentPath, loggerPath } = await this.saveDeploymentState(
            networkName,
            deploymentHash,
            finalState
        );

        logger.addLog('DEPLOYMENT_STATE_SAVED', { 
            deploymentPath,
            loggerPath
        });

        return {
            success: true,
            deployments: results,
            deployedContracts,
            deploymentHash,
            statePath: deploymentPath,
            loggerPath,
            receipt: instance.receipt
        };

    } catch (error) {
        console.log(error);
        logger.addLog('DEPLOY_ERROR', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

export default deploy;