import { ethers } from 'ethers';

export default async function executePublicSale(config, deployedContracts) {
    const { logger } = this;
    
    logger.addLog('EXECUTE_PUBLIC_SALE_START', { config, deployedContracts });

    try {
        // Step 1: Deploy Public Sale contract
        logger.addLog('DEPLOY_PUBLIC_SALE_START');
        const PublicSale = await ethers.getContractFactory("RAACPublicSale");
        const publicSale = await PublicSale.deploy(
            deployedContracts.token.address,
            deployedContracts.orchestrator.address,
            ethers.utils.parseUnits(config.tokenPrice, 6) // Assuming USDC decimals
        );
        await publicSale.deployed();
        logger.addLog('DEPLOY_PUBLIC_SALE_SUCCESS', {
            address: publicSale.address,
            tx: publicSale.deployTransaction.hash
        });

        // Step 2: Configure sale parameters
        logger.addLog('CONFIGURE_SALE_START');
        const tx1 = await publicSale.configureSale(
            ethers.utils.parseUnits(config.minPurchase, 6),
            ethers.utils.parseUnits(config.maxPurchase, 6),
            config.privateStart,
            config.privateEnd,
            config.publicStart,
            config.publicEnd
        );
        await tx1.wait();
        logger.addLog('CONFIGURE_SALE_SUCCESS', { tx: tx1.hash });

        // Step 3: Set allocations
        logger.addLog('SET_ALLOCATIONS_START');
        const tx2 = await publicSale.setAllocations(
            ethers.utils.parseUnits(config.privateAllocation.toString(), 18),
            ethers.utils.parseUnits(config.publicAllocation.toString(), 18)
        );
        await tx2.wait();
        logger.addLog('SET_ALLOCATIONS_SUCCESS', { tx: tx2.hash });

        // Step 4: Add whitelist addresses in batches
        logger.addLog('ADD_WHITELIST_START', { count: config.whitelist.length });
        const BATCH_SIZE = 100;
        for (let i = 0; i < config.whitelist.length; i += BATCH_SIZE) {
            const batch = config.whitelist.slice(i, i + BATCH_SIZE);
            const tx = await publicSale.addToWhitelist(
                batch.map(w => ({
                    buyer: w.address,
                    allocation: ethers.utils.parseUnits(w.allocation, 18),
                    vestingStart: w.vestingStart,
                    vestingEnd: w.vestingEnd
                }))
            );
            await tx.wait();
            logger.addLog('ADD_WHITELIST_BATCH_SUCCESS', {
                batchNumber: Math.floor(i / BATCH_SIZE) + 1,
                addresses: batch.length,
                tx: tx.hash
            });
        }

        const result = {
            publicSale: {
                address: publicSale.address,
                tx: publicSale.deployTransaction.hash
            }
        };

        logger.addLog('EXECUTE_PUBLIC_SALE_SUCCESS', result);
        return result;

    } catch (error) {
        logger.addLog('EXECUTE_PUBLIC_SALE_ERROR', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
} 