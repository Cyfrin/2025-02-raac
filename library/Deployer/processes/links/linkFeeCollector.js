import { ethers } from "ethers";

export async function linkFeeCollector(deployer, config, deployment) {

    const wallet = deployment.getWallet();

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mLINK_FEE_COLLECTOR_START\x1b[0m', { config, timeStart: processResult.timeStart });


    // Is FeeCollector deployed ?
    if(!deployment.dependencies.FeeCollector) {
        deployer.logger.addLog('LINK_FEE_COLLECTOR_NOT_DEPLOYED', { message: 'FeeCollector is not deployed' });
        processResult.logger = deployer.logger.export();
        processResult.timeEnd = +new Date();
        processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
        deployment.processes.linkFeeCollector = processResult;
        return deployment;
    }

    const feeCollectorAddress = deployment.contracts['FeeCollector'];
    const FeeCollectorArtifact = await deployer.readArtifactFile("FeeCollector");
    const feeCollectorContract = new ethers.Contract(feeCollectorAddress, FeeCollectorArtifact.abi, wallet);

    /* RAAC TOKEN WHITELISTING OF FEE COLLECTOR */
    const RAAC = deployment.contracts['RAACToken'];
    const RAACAddress = RAAC?.address || RAAC;
    const RAACArtifact = await deployer.readArtifactFile("RAACToken");
    const RAACContract = new ethers.Contract(RAACAddress, RAACArtifact.abi, wallet);
    const isWhitelisted = await RAACContract.isWhitelisted(feeCollectorAddress);

    if(!isWhitelisted) {
        deployer.logger.addLog('LINK_FEE_COLLECTOR_NOT_WHITELISTED', { message: 'FeeCollector is not whitelisted' });
      
        // Add to RAAC Whitelist
        const addToWhitelistTx = await RAACContract.manageWhitelist(feeCollectorAddress, true);
        const addToWhitelistReceipt = await addToWhitelistTx.wait();

        if(addToWhitelistReceipt.status === 1) {
            deployer.logger.addLog('LINK_FEE_COLLECTOR_WHITELISTED', { message: 'FeeCollector is whitelisted' });
        } else {
            deployer.logger.addLog('LINK_FEE_COLLECTOR_WHITELIST_FAILED', { message: 'FeeCollector whitelist failed' });
        }
    }
    deployer.logger.addLog('LINK_FEE_COLLECTOR_END', { message: 'FeeCollector is whitelisted' });

    // Is RAACMinter deployed and has feeCollector set ?
    const RAACMinter = deployment.contracts['RAACMinter'];
    const RAACMinterAddress = RAACMinter?.address || RAACMinter;
    const RAACMinterArtifact = await deployer.readArtifactFile("RAACMinter");
    const RAACMinterContract = new ethers.Contract(RAACMinterAddress, RAACMinterArtifact.abi, wallet);
    if(!RAACMinterAddress) {
        deployer.logger.addLog('LINK_FEE_COLLECTOR_RAACMINTER_NOT_DEPLOYED', { message: 'RAACMinter is not deployed' });
    } else {
        const RAAC = deployment.contracts['RAACToken'];
        const RAACAddress = RAAC?.address || RAAC;
        const RAACArtifact = await deployer.readArtifactFile("RAACToken");
        const RAACContract = new ethers.Contract(RAACAddress, RAACArtifact.abi, wallet);
        const RAACOwner = await RAACContract.owner();

        deployer.logger.addLog(
            'LINK_FEE_COLLECTOR_RAACMINTER_OWNER', 
            { message: `RAACMinter (${RAACMinterAddress}) is ${RAACOwner === RAACMinterAddress ? 'owner' : 'not owner'} of RAAC (${RAACAddress})` }
        );

        if(RAACOwner === RAACMinterAddress) {
            // Who is FeeCollector in RAACToken ?
            const feeCollectorInRAAC = await RAACContract.feeCollector();

            deployer.logger.addLog('LINK_FEE_COLLECTOR_RAAC_FEE_COLLECTOR',
                 { message: `RAAC feeCollector (${feeCollectorInRAAC}) is ${feeCollectorInRAAC !== feeCollectorAddress ? 'not ' : ''}FeeCollector (${feeCollectorAddress})` }
            );

            if(feeCollectorInRAAC !== feeCollectorAddress) {
                // If RAACMinter own RAAC, then we can have setFeeCollector set, lets set
                const setFeeCollectorTx = await RAACMinterContract.setFeeCollector(feeCollectorAddress);
                const setFeeCollectorReceipt = await setFeeCollectorTx.wait();
                deployer.logger.addLog('LINK_FEE_COLLECTOR_SET_RAAC_FEE_COLLECTOR', { tx: setFeeCollectorReceipt });
            }
        } else {
            deployer.logger.addLog('LINK_FEE_COLLECTOR_RAACMINTER_NOT_OWNER', { message: 'RAACMinter is not owner of RAAC - we cannot set feeCollector' });
        }
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    deployment.processes.linkFeeCollector = processResult;

    return deployment;
}