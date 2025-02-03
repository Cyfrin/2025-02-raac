import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployRepairFund(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_REPAIR_FUND_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Release RepairFund
    if(!deployment.dependencies.RepairFund) {
        const TreasuryFundArtifact = await deployer.readArtifactFile("Treasury");

        const RepairFundArgs = findContructorArg(deployment.constructorArgs['RepairFund'], deployment.contracts);
        const prepared = {
            contractName: "RepairFund",
            artifact: TreasuryFundArtifact,
            originalArgs: RepairFundArgs,
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RepairFund'] = receipt.receipt.contractAddress;
        deployment.dependencies.RepairFund = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['RepairFund'] = deployment.dependencies.RepairFund.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployRepairFund = processResult;

    return deployment;
}