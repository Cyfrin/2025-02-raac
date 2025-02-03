import { ethers } from "ethers";

export async function linkRAACToken(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mLINK_RAAC_TOKEN_START\x1b[0m', { config, timeStart: processResult.timeStart });

    // Whitelist deployer before mint / transfer to release orchestrator is done
    const RAACTokenArtifact = await deployer.readArtifactFile("RAACToken");

    const RAACToken = new ethers.Contract(deployment.contracts['RAACToken'], RAACTokenArtifact.abi, deployment.getWallet());
    deployer.logger.addLog('LINK_RAAC_TOKEN_CHECK_WHITELIST', { address: await deployer.signer.address, RAACToken: deployment.contracts['RAACToken'] });
    let isMinterInWhitelist = false;
    try {
        isMinterInWhitelist = await RAACToken.isWhitelisted(await deployer.signer.address);
        deployer.logger.addLog('LINK_RAAC_TOKEN_CHECK_WHITELIST_RESULT', { isMinterInWhitelist });
    } catch(e) {
        // Parse data with contract.interface.parseError
        // const error = RAACToken.interface.parseError(e);
        // deployer.logger.addLog('LINK_RAAC_TOKEN_CHECK_WHITELIST_ERROR', { error });
    }

    if(!isMinterInWhitelist) {
        // Is deployer owner ?
        const isOwner = await RAACToken.owner() === await deployer.signer.address;
        if(isOwner) {
            const addMinterToWhitelistTx = await RAACToken.manageWhitelist(await deployer.signer.address, true);
            await addMinterToWhitelistTx.wait();
            deployer.logger.addLog('LINK_RAAC_TOKEN', { address: await deployer.signer.address, action: 'add' });
            // Is self minter ?
            const minter = await RAACToken.minter();
            deployer.logger.addLog('LINK_RAAC_TOKEN', { currentMinter: minter });
            if(minter !== await deployer.signer.address) {
                const setMinterTx = await RAACToken.setMinter(await deployer.signer.address);
                await setMinterTx.wait();
                deployer.logger.addLog('LINK_RAAC_TOKEN', { address: await deployer.signer.address, action: 'set' });
            }
        } else {
            deployer.logger.addLog('LINK_RAAC_TOKEN', { address: await deployer.signer.address, action: 'skip' });
        }
    }

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    processResult.logger = deployer.logger.export();

    deployment.processes.linkRAACToken = processResult;
    return deployment;
}