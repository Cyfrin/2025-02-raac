
export async function deployRAACToken(deployer, config, deployment) {
    let processResult = {
        timeStart: +new Date(),
    };

    deployer.logger.addLog('DEPLOY_RAACTOKEN_START', { config });

    // Deploy RAAC Token
    deployer.logger.addLog('DEPLOYING_TOKEN');    
    const wallet = deployment.getWallet();

    const args = deployment.constructorArgs['RAACToken'];


    deployer.logger.addLog('EXECUTE_RAACTOKEN_DEPLOYMENT_START', { args });

    const RAACTokenArtifact = await deployer.readArtifactFile("RAACToken");

    // Step 1: Deploy RAAC Token
    if(!deployment.dependencies.RAACToken) {
        const RAACTokenArgs = deployment.constructorArgs['RAACToken'];
        deployer.logger.addLog('DEPLOY_RAACTOKEN_START', {RAACTokenArgs});
    

        const prepared = {
            contractName: "RAACToken",
            artifact: RAACTokenArtifact,
            originalArgs: RAACTokenArgs,
            gasEstimate: deployment.estimatedCost.perContract['RAACToken'].minCost
        }    

        const results = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        const receipt = results.receipt;
        deployment.dependencies.RAACToken = {
            address: receipt.contractAddress,
        };

        deployment.contracts['RAACToken'] = receipt.contractAddress;
        deployer.logger.addLog('DEPLOY_TOKEN_SUCCESS', { 
            address: receipt.contractAddress,
            tx: receipt.transactionHash,
            receipt: receipt
        });
    } else {
        deployment.contracts['RAACToken'] = deployment.dependencies.RAACToken.address;
    }

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    
    deployer.logger.addLog('\x1b[32mDEPLOY_TOKEN_SUCCESS\x1b[0m', `${{timings:processResult.timings}}`);
    processResult.logger = deployer.logger.export();

    deployment.processes.deployToken = processResult;
    return deployment;
} 