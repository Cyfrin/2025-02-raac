export async function setupLinks(deployer, config, deployment) {
    deployer.logger.addLog('SETUP_LINKS_START', { config });

    const processResult = {
        timeStart: +new Date(),
    };

    // Link contracts
    // deployer.logger.addLog('LINKING_CONTRACTS');
    // await deployer.linkMinterToToken();
    // await deployer.linkOrchestratorToToken();
    // await deployer.linkPublicSaleToToken();

    // // Lock TGE allocations
    // deployer.logger.addLog('LOCKING_TGE');
    // const lockResult = await deployer.lockTGEAllocations(config.tgeConfig);

    // const result = {
    //     links: {
    //         minter: true,
    //         orchestrator: true,
    //         publicSale: true
    //     },
    //     lockResult
    // };

    // deployer.logger.addLog('SETUP_LINKS_SUCCESS', result);
    // return result;

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.setupLinks = processResult;
    return deployment;
} 