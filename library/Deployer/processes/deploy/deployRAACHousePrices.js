import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployRAACHousePrices(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_HOUSE_PRICES_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Release RAACHousePrices
    if(!deployment.dependencies.RAACHousePrices) {
        const RAACHousePricesArtifact = await deployer.readArtifactFile("RAACHousePrices");
        const RAACHousePricesArgs = findContructorArg(deployment.constructorArgs['RAACHousePrices'], deployment.contracts);
        const prepared = {
            contractName: "RAACHousePrices",
            artifact: RAACHousePricesArtifact,
            originalArgs: RAACHousePricesArgs,
            gasEstimate: deployment.estimatedCost.perContract['RAACHousePrices'].minCost
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RAACHousePrices'] = receipt.receipt.contractAddress;
        deployment.dependencies.RAACHousePrices = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['RAACHousePrices'] = deployment.dependencies.RAACHousePrices.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployRAACHousePrices = processResult;
    return deployment;
} 