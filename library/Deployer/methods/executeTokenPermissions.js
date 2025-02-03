import { ethers } from 'ethers';

export default async function executeTokenPermissions(config, deployedContracts) {
    const { logger } = this;
    
    logger.addLog('EXECUTE_TOKEN_PERMISSIONS_START', { config, deployedContracts });

    try {
        const token = await ethers.getContractAt("RAACToken", deployedContracts.token.address);

        // Step 1: Grant roles
        logger.addLog('GRANT_ROLES_START');
        for (const [role, roleConfig] of Object.entries(config.roles)) {
            // Grant to contracts
            if (roleConfig.contracts) {
                for (const contract of roleConfig.contracts) {
                    const tx = await token.grantRole(
                        ethers.utils.id(role),
                        contract.address
                    );
                    await tx.wait();
                    logger.addLog('GRANT_ROLE_SUCCESS', {
                        role,
                        to: contract.name,
                        address: contract.address,
                        tx: tx.hash
                    });
                }
            }

            // Grant to addresses
            if (roleConfig.addresses) {
                for (const address of roleConfig.addresses) {
                    const tx = await token.grantRole(
                        ethers.utils.id(role),
                        address
                    );
                    await tx.wait();
                    logger.addLog('GRANT_ROLE_SUCCESS', {
                        role,
                        to: 'address',
                        address,
                        tx: tx.hash
                    });
                }
            }
        }

        // Step 2: Configure token settings
        logger.addLog('CONFIGURE_TOKEN_START');
        
        // Enable transfers
        if (config.tokenConfig.transfersEnabled) {
            const tx1 = await token.enableTransfers();
            await tx1.wait();
            logger.addLog('ENABLE_TRANSFERS_SUCCESS', { tx: tx1.hash });
        }

        // Set transfer limits
        const tx2 = await token.setMaxTransferAmount(
            ethers.utils.parseUnits(config.tokenConfig.maxTransferAmount, 18)
        );
        await tx2.wait();
        logger.addLog('SET_TRANSFER_LIMIT_SUCCESS', { tx: tx2.hash });

        // Exclude addresses from limits
        for (const address of config.tokenConfig.excludedFromLimits) {
            const tx = await token.excludeFromLimits(address);
            await tx.wait();
            logger.addLog('EXCLUDE_FROM_LIMITS_SUCCESS', {
                address,
                tx: tx.hash
            });
        }

        const result = {
            token: deployedContracts.token.address,
            rolesConfigured: Object.keys(config.roles),
            transfersEnabled: config.tokenConfig.transfersEnabled,
            maxTransferAmount: config.tokenConfig.maxTransferAmount,
            excludedFromLimits: config.tokenConfig.excludedFromLimits
        };

        logger.addLog('EXECUTE_TOKEN_PERMISSIONS_SUCCESS', result);
        return result;

    } catch (error) {
        logger.addLog('EXECUTE_TOKEN_PERMISSIONS_ERROR', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
} 