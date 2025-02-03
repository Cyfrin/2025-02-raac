import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployveRAACToken(deployer, config, deployment) {
    let processResult = {
        timeStart: +new Date(),
    };

    deployer.logger.addLog('DEPLOY_veRAACTOKEN_START', { config });

    // Deploy veRAAC Token
    if(!deployment.dependencies.veRAACToken) {
        deployer.logger.addLog('DEPLOYING_veRAACTOKEN');    
        const wallet = deployment.getWallet();

        const veRAACTokenArtifact = await deployer.readArtifactFile("veRAACToken");

        const veRAACTokenArgs = findContructorArg(deployment.constructorArgs['veRAACToken'], deployment.contracts);
        const prepared = {
            contractName: "veRAACToken",
            artifact: veRAACTokenArtifact,
            originalArgs: veRAACTokenArgs,
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['veRAACToken'] = receipt.receipt.contractAddress;
        deployment.dependencies.veRAACToken = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['veRAACToken'] = deployment.dependencies.veRAACToken.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployveRAACToken = processResult;

    return deployment;
} 