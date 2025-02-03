import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployTreasury(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_TREASURY_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Release Treasury
    if(!deployment.dependencies.Treasury) {
        const TreasuryArtifact = await deployer.readArtifactFile("Treasury");

        const TreasuryArgs = findContructorArg(deployment.constructorArgs['Treasury'], deployment.contracts);
        const prepared = {
            contractName: "Treasury",
            artifact: TreasuryArtifact,
            originalArgs: TreasuryArgs,
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['Treasury'] = receipt.receipt.contractAddress;
        deployment.dependencies.Treasury = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['Treasury'] = deployment.dependencies.Treasury.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployTreasury = processResult;

    return deployment;
}