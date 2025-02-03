import { ethers } from 'ethers';

export async function initializeStabilityPool(deployer, config, deployment) {
    const wallet = deployment.getWallet();
    const processResult = {
        timeStart: +new Date(),
    };

    deployer.logger.addLog('\x1b[36mINITIALIZE_STABILITY_POOL_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const StabilityPool = deployment.contracts['StabilityPool'];
    const RToken = deployment.contracts['RToken'];
    const DEToken = deployment.contracts['DEToken'];
    const RAACToken = deployment.contracts['RAACToken'];
    const RAACMinter = deployment.contracts['RAACMinter'];
    const CrvUSDToken = deployment.contracts['crvUSDToken'];
    const lendingPool = deployment.contracts['RAACLendingPool'];

    const requiredContracts = {
        StabilityPool,
        RToken,
        DEToken,
        RAACToken,
        RAACMinter,
        CrvUSDToken,
        lendingPool
    };


    // Check we have all contract
    const missingContracts = Object.entries(requiredContracts)
        .filter(([_, address]) => !address)
        .map(([name]) => name);

    if (missingContracts.length > 0) {
        const error = `Missing required contracts: ${missingContracts.join(', ')}`;
        deployer.logger.addLog('STABILITY_POOL_INITIALIZATION_FAILED', { error });
        throw new Error(error);
    }

    const StabilityPoolArtifact = await deployer.readArtifactFile("StabilityPool");
    const stabilityPool = new ethers.Contract(StabilityPool, StabilityPoolArtifact.abi, wallet);

    // Check if already initialized
    try {
        const rToken = await stabilityPool.rToken();
        if (rToken !== ethers.ZeroAddress) {
            deployer.logger.addLog('STABILITY_POOL_ALREADY_INITIALIZED', { rToken });
            processResult.timeEnd = +new Date();
            processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
            processResult.logger = deployer.logger.export();
            deployment.processes.initializeStabilityPool = processResult;
            return deployment;
        }
    } catch (error) {
      deployer.logger.addLog('STABILITY_POOL_NOT_INITIALIZED');
    }
    
    // Contract not initialized yet (wouldve return above), proceed with initialization
    try {
        deployer.logger.addLog('INITIALIZING_STABILITY_POOL', {
            rToken: RToken,
            deToken: DEToken,
            raacToken: RAACToken,
            raacMinter: RAACMinter,
            crvUSDToken: CrvUSDToken,
            lendingPool: lendingPool
        });

        const initTx = await stabilityPool.initialize(
            RToken,
            DEToken,
            RAACToken,
            RAACMinter,
            CrvUSDToken,
            lendingPool
        );
        const initReceipt = await initTx.wait();
        deployer.logger.addLog('STABILITY_POOL_INITIALIZED', { tx: initReceipt });
    } catch (error) {
        deployer.logger.addLog('STABILITY_POOL_INITIALIZATION_FAILED', { 
            error: error.message,
            code: error.code,
            argument: error.argument,
            value: error.value
        });
        throw error;
    }

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    processResult.logger = deployer.logger.export();
    deployment.processes.initializeStabilityPool = processResult;
    return deployment;
}