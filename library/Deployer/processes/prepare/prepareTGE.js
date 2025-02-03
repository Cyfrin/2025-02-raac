export async function prepareTGE(deployer, config, deployment) {
    const processResult = {
        timeStart: +new Date(),
    };

    deployer.logger.addLog('PREPARE_TGE_START', { config });
    
    const tokenConfig = await deployer.prepareTokenDeployment(config.tgeConfig);
    // const liquidityConfig = await deployer.prepareLiquiditySetup(config.tgeConfig);
    // const publicSaleConfig = await deployer.preparePublicSale(config.tgeConfig);

    const result = {
        tokenConfig,
        // liquidityConfig,
        // publicSaleConfig
    };

    deployer.logger.addLog('PREPARE_TGE_SUCCESS', result);

    // deployment.processes.prepareTGE = {
    //     logger: deployer.logger.export(),
    //     result,
    //     time: new Date().getTime()
    // }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    processResult.result = result;

    deployment.processes.prepareTGE = processResult;
    return deployment;
} 