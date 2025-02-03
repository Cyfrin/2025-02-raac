export async function verifyDeployment(deployer, config, deployment) {
    deployer.logger.addLog('VERIFY_START', { config });

    const processResult = {
        timeStart: +new Date(),
    };

    // Verify each contracts (artifacts) has been deployed (has an address)
    if(!deployment.processes.prepareContracts || !deployment.processes.prepareContracts.artifacts) {
        throw new Error('Prepare Contracts process has not been run');
    }

    const artifacts = deployment.artifacts;

    for(const artifact of Object.values(artifacts)) {
        const contract = deployment.contracts[artifact];
        if(!contract) {
            throw new Error(`Contract ${artifact} has not been deployed`);
        }
    }

    // Verify the lock happened.   
    // deployer.logger.addLog('VERIFYING_LOCK');

    // Verify the lock happened.   
    // deployer.logger.addLog('VERIFYING_LOCK');
    // const lock = await deployer.verifyLock();

    // return deployment;

    
    // // Verify contract deployments
    // deployer.logger.addLog('VERIFYING_DEPLOYMENTS');
    // // const deploymentVerification = await deployer.verifyDeployments();

    // // Check contract configurations
    // deployer.logger.addLog('CHECKING_CONFIGURATIONS');
    // // const configurationChecks = await deployer.verifyConfigurations();

    // // Perform RPC checks
    // deployer.logger.addLog('PERFORMING_RPC_CHECKS');
    // // const rpcChecks = await deployer.performRPCChecks();

    // const result = {
    //     // deploymentVerification,
    //     // configurationChecks,
    //     // rpcChecks,
    //     // success: deploymentVerification.success && 
    //     //          configurationChecks.success && 
    //     //          rpcChecks.success
    // };

    // deployer.logger.addLog('VERIFY_SUCCESS', result);
    // return result;


    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.verifyDeployment = processResult;
    deployment.logs = deployer.logger.export();
    return deployment;
} 