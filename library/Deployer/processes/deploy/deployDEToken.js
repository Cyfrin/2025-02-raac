export async function deployDEToken(deployer, config, deployment) {
 
    // const wallet = deployment.getWallet();

    // const processResult = {
    //     timeStart: +new Date(),
    // };
    // deployer.logger.addLog('\x1b[36mDEPLOY_DETOKEN_START\x1b[0m', { config, timeStart: processResult.timeStart });

    // const shouldDeployDEToken = !deployment.dependencies?.DEToken?.address;

    // console.log(shouldDeployDEToken)
    // if(!shouldDeployDEToken) {

    //     const DETokenArtifact = await deployer.readArtifactFile("DEToken");
    //     const DETokenArgs = findContructorArg(deployment.constructorArgs['DEToken'], deployment.contracts);
    //     const prepared = {
    //         contractName: "DEToken",
    //         artifact: DETokenArtifact,
    //         originalArgs: DETokenArgs,
    //     }

    //     console.log(prepared);
    //     process.exit(0);

    //     // const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
    //     // deployment.contracts['DEToken'] = receipt.receipt.contractAddress;
    //     // deployment.dependencies.DEToken = {
    //     //     address: receipt.receipt.contractAddress,
    //     // };
    //     deployer.logger.addLog('DEPLOY_DETOKEN_ALREADY_DEPLOYED', { message: `DEToken is deployed at ${deployment.dependencies.DEToken.address}` });
    // } else {
    //     deployer.logger.addLog('DEPLOY_DETOKEN_ALREADY_DEPLOYED', { message: `DEToken already deployed at ${deployment.dependencies.DEToken.address}` });
    //     deployment.contracts['DEToken'] = deployment.dependencies.DEToken.address;
    // }

    // processResult.logger = deployer.logger.export();
    // processResult.timeEnd = +new Date();
    // processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    // deployment.processes.deployDEToken = processResult;

    // process.exit(0);
    // // console.log(deplo)
    // // const DEToken = await deployer.deployContract(wallet, DETokenArtifact, []);

    // // deployment.contracts['DEToken'] = DEToken.address;

    // deployer.logger.addLog('\x1b[36mDEPLOY_DETOKEN_END\x1b[0m', { config, timeEnd: processResult.timeEnd });
 
    return deployment;
}