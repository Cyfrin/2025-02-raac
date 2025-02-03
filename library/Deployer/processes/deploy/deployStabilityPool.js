import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployStabilityPool(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_STABILITY_POOL_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Release DEToken as dependency
    if(!deployment.dependencies.DEToken) {
        const DETokenArtifact = await deployer.readArtifactFile("DEToken");
        const DETokenArgs = findContructorArg(deployment.constructorArgs['DEToken'], deployment.contracts);
        const prepared = {
            contractName: "DEToken",
            artifact: DETokenArtifact,
            originalArgs: DETokenArgs,
        }
        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['DEToken'] = receipt.receipt.contractAddress;
        deployment.dependencies.DEToken = {
            address: receipt.receipt.contractAddress,
        };

    } else {
        deployment.contracts['DEToken'] = deployment.dependencies.DEToken.address;
    }


    // Release StabilityPool
    if(!deployment.dependencies.StabilityPool) {
        const StabilityPoolArtifact = await deployer.readArtifactFile("StabilityPool");

        const StabilityPoolArgs = findContructorArg(deployment.constructorArgs['StabilityPool'], deployment.contracts);
        const prepared = {
            contractName: "StabilityPool",
            artifact: StabilityPoolArtifact,
            originalArgs: StabilityPoolArgs,
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['StabilityPool'] = receipt.receipt.contractAddress;
        deployment.dependencies.StabilityPool = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['StabilityPool'] = deployment.dependencies.StabilityPool.address;
    }


    // Set StabilityPool to LendingPool contract 


    
    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployStabilityPool = processResult;
    return deployment;
} 