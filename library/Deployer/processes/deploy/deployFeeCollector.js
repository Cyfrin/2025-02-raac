import findContructorArg from '../../utils/findContructorArg.js';

export async function deployFeeCollector(deployer, config, deployment) {

    // Require RAAC + veRAAC + Treasury + RepairFund.
    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_FEE_COLLECTOR_START\x1b[0m', { config, timeStart: processResult.timeStart });


    const wallet = deployment.getWallet();

    // Release RepairFund
    if(!deployment.dependencies.FeeCollector) {
        const FeeCollectorArtifact = await deployer.readArtifactFile("FeeCollector");

        const FeeCollectorArgs = findContructorArg(deployment.constructorArgs['FeeCollector'], deployment.contracts);
        const prepared = {
            contractName: "FeeCollector",
            artifact: FeeCollectorArtifact,
            originalArgs: FeeCollectorArgs,
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['FeeCollector'] = receipt.receipt.contractAddress;
        deployment.dependencies.FeeCollector = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['FeeCollector'] = deployment.dependencies.FeeCollector.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployFeeCollector = processResult;

    return deployment;
}