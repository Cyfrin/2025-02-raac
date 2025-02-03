export default async function prepareTokenDeployment(config) {
    const { logger } = this;
    
    logger.addLog('PREPARE_TOKEN_DEPLOYMENT_START', { config });

    // Validate token configuration
    const tokenConfig = {
        name: "RAAC Token",
        symbol: "RAAC",
        decimals: 18,
        initialSupply: config.initialSupply || "100000000", // 1 billion tokens
        owner: config.owner || config.deployer, // Fallback to deployer if owner not specified
    };

    // Validate RAACReleaseOrchestrator configuration
    const orchestratorConfig = {
        categories: {
            TEAM: {
                allocation: config.wallets
                    .filter(w => w.type === 'team')
                    .reduce((sum, w) => sum + Number(w.amount), 0),
                cliff: 90 * 24 * 60 * 60, // 90 days in seconds
                duration: 700 * 24 * 60 * 60 // 700 days in seconds
            },
            ADVISOR: {
                allocation: config.wallets
                    .filter(w => w.type === 'advisor')
                    .reduce((sum, w) => sum + Number(w.amount), 0),
                cliff: 90 * 24 * 60 * 60,
                duration: 700 * 24 * 60 * 60
            },
            TREASURY: {
                allocation: config.wallets
                    .filter(w => w.type === 'treasury')
                    .reduce((sum, w) => sum + Number(w.amount), 0),
                cliff: 0,
                duration: 700 * 24 * 60 * 60
            }
        },
        owner: config.owner || config.deployer
    };

    // Validate RAACMinter configuration
    const minterConfig = {
        initialRate: "1000000000000000000000", // 1000 RAAC per day
        minEmissionRate: "100000000000000000000", // 100 RAAC per day
        maxEmissionRate: "2000000000000000000000", // 2000 RAAC per day
        owner: config.owner || config.deployer
    };

    const preparedDeployment = {
        token: tokenConfig,
        orchestrator: orchestratorConfig,
        minter: minterConfig,
        wallets: config.wallets.map(wallet => ({
            ...wallet,
            amount: wallet.amount.toString(),
            category: wallet.type.toUpperCase(),
            schedules: wallet?.schedules?.map(schedule => ({
                ...schedule,
                startTime: Math.floor(new Date(schedule.start).getTime() / 1000),
                endTime: Math.floor(new Date(schedule.end).getTime() / 1000)
            }))
        }))
    };

    logger.addLog('PREPARE_TOKEN_DEPLOYMENT_SUCCESS', { preparedDeployment });

    return preparedDeployment;
} 