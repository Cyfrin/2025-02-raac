import { ethers } from 'ethers';

export async function finalizeDeployment(deployer, config, deployment) {
    const wallet = deployment.getWallet();
    // Transfer ownership of the contracts to the deployer
    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mFINALIZE_DEPLOYMENT_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const RAAC = deployment.contracts['RAACToken'];
    const RAACAddress = RAAC?.address || RAAC;
    const RAACMinter = deployment.contracts['RAACMinter'];
    const RAACMinterAddress = RAACMinter?.address || RAACMinter;
    const RAACArtifact = await deployer.readArtifactFile("RAACToken");
    const RAACContract = new ethers.Contract(RAACAddress, RAACArtifact.abi, wallet);
    const currentRAACOwner = await RAACContract.owner();    

    if(currentRAACOwner !== RAACMinterAddress) {    
        // const transferOwnershipTx = await RAACContract.transferOwnership(RAACMinterAddress);
        // const transferOwnershipReceipt = await transferOwnershipTx.wait();
        const transferOwnershipReceipt ={ noop: true };
        deployer.logger.addLog('LINK_RAACMINTER_TRANSFER_OWNERSHIP', { tx: transferOwnershipReceipt });
    }

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    processResult.logger = deployer.logger.export();
    deployment.processes.finalizeDeployment = processResult;
    return deployment;
}