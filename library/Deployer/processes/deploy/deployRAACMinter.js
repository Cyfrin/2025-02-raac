import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployRAACMinter(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_MINTER_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    if(!deployment.dependencies.StabilityPool) {
        throw new Error("StabilityPool is not deployed. RAACMinter cannot be deployed without StabilityPool.");
    }

    // Release RAACMinter
    if(!deployment.dependencies.RAACMinter) {
        const RAACMinterArtifact = await deployer.readArtifactFile("RAACMinter");

        const RAACMinterArgs = findContructorArg(deployment.constructorArgs['RAACMinter'], deployment.contracts);
        const prepared = {
            contractName: "RAACMinter",
            artifact: RAACMinterArtifact,
            originalArgs: RAACMinterArgs,
            gasEstimate: deployment.estimatedCost.perContract['RAACMinter'].minCost
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RAACMinter'] = receipt.receipt.contractAddress;
        deployment.dependencies.RAACMinter = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['RAACMinter'] = deployment.dependencies.RAACMinter.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployRAACMinter = processResult;
    return deployment;
} 