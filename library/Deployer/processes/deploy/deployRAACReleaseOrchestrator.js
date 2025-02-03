import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployRAACReleaseOrchestrator(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_RELEASE_ORCHESTRATOR_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Release RAACReleaseOrchestrator
    if(!deployment.dependencies.RAACReleaseOrchestrator) {
        const RAACReleaseOrchestratorArtifact = await deployer.readArtifactFile("RAACReleaseOrchestrator");

        const RAACReleaseOrchestratorArgs = findContructorArg(deployment.constructorArgs['RAACReleaseOrchestrator'], deployment.contracts);
        const prepared = {
            contractName: "RAACReleaseOrchestrator",
            artifact: RAACReleaseOrchestratorArtifact,
            originalArgs: RAACReleaseOrchestratorArgs,
            gasEstimate: deployment.estimatedCost.perContract['RAACReleaseOrchestrator'].minCost
        }

        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RAACReleaseOrchestrator'] = receipt.receipt.contractAddress;
        deployment.dependencies.RAACReleaseOrchestrator = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['RAACReleaseOrchestrator'] = deployment.dependencies.RAACReleaseOrchestrator.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployRAACReleaseOrchestrator = processResult;
    return deployment;
} 