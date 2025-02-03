export default async function prepareTokenPermissions(config, deployedContracts) {
    const { logger } = this;
    
    logger.addLog('PREPARE_TOKEN_PERMISSIONS_START', { config, deployedContracts });

    const permissionsConfig = {
        // Core contract roles
        roles: {
            MINTER_ROLE: {
                contracts: [
                    { name: 'RAACMinter', address: deployedContracts.minter.address },
                ]
            },
            PAUSER_ROLE: {
                addresses: [config.owner || config.deployer]
            },
            BURNER_ROLE: {
                contracts: [
                    { name: 'RAACMinter', address: deployedContracts.minter.address }
                ]
            }
        },

        // Initial token configurations
        tokenConfig: {
            transfersEnabled: true,
            maxTransferAmount: "1000000000", // 1B tokens
            excludedFromLimits: [
                deployedContracts.orchestrator.address,
                deployedContracts.minter.address,
                deployedContracts.publicSale.address
            ]
        }
    };

    logger.addLog('PREPARE_TOKEN_PERMISSIONS_SUCCESS', { permissionsConfig });
    
    return permissionsConfig;
} 