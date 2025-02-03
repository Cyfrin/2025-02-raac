import { ethers } from "ethers";

export async function linkStabilityPool(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mLINK_STABILITY_POOL_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();
   
    // deToken.setStabilityPool()
    // deToken.transferOwnership()

     /* RAAC TOKEN WHITELISTING OF Stability Pool  */
    // const RAAC = deployment.contracts['RAACToken'];
    // const RAACAddress = RAAC?.address || RAAC;
    // const RAACArtifact = await deployer.readArtifactFile("RAACToken");
    // const RAACContract = new ethers.Contract(RAACAddress, RAACArtifact.abi, wallet);
    // const isWhitelisted = await RAACContract.isWhitelisted(feeCollectorAddress);

    // if(!isWhitelisted) {
    //     deployer.logger.addLog('LINK_FEE_COLLECTOR_NOT_WHITELISTED', { message: 'FeeCollector is not whitelisted' });
      
    //     // Add to RAAC Whitelist
    //     const addToWhitelistTx = await RAACContract.manageWhitelist(feeCollectorAddress, true);
    //     const addToWhitelistReceipt = await addToWhitelistTx.wait();

    //     if(addToWhitelistReceipt.status === 1) {
    //         deployer.logger.addLog('LINK_FEE_COLLECTOR_WHITELISTED', { message: 'FeeCollector is whitelisted' });
    //     } else {
    //         deployer.logger.addLog('LINK_FEE_COLLECTOR_WHITELIST_FAILED', { message: 'FeeCollector whitelist failed' });
    //     }
    // }
    // deployer.logger.addLog('LINK_FEE_COLLECTOR_END', { message: 'FeeCollector is whitelisted' });




    // process.exit(0);
    return deployment;
}