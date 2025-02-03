import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployRAACNFT(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_NFT_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Release RAACHousePrices
    if(!deployment.dependencies.RAACNFT) {
        const RAACNFTArtifact = await deployer.readArtifactFile("RAACNFT");

        const RAACNFTArgs = findContructorArg(deployment.constructorArgs['RAACNFT'], deployment.contracts);
        const prepared = {
            contractName: "RAACNFT",
            artifact: RAACNFTArtifact,
            originalArgs: RAACNFTArgs,
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RAACNFT'] = receipt.receipt.contractAddress;
        deployment.dependencies.RAACNFT = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['RAACNFT'] = deployment.dependencies.RAACNFT.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployRAACNFT = processResult;
    return deployment;
} 