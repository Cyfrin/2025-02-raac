import { ethers } from 'ethers';

export default async function executeTGE(tgePrepared) {
    const { logger } = this;
    logger.addLog('EXECUTE_TGE_START', { tgePrepared });

    const { totalSupply, wallets } = tgePrepared;
    
    // Basic validations
    if(totalSupply === 0) {
        logger.addLog('EXECUTE_TGE_ERROR', { error: 'Total supply is 0' });
        throw new Error('Total supply is 0');
    }
    if(totalSupply > 100000000000){
        logger.addLog('EXECUTE_TGE_ERROR', { error: 'Total supply is too high' });
        throw new Error('Total supply is too high');
    }

    if(wallets.length === 0) {
        logger.addLog('EXECUTE_TGE_ERROR', { error: 'No wallets to distribute' });
        throw new Error('No wallets to distribute');
    }

    if(totalSupply !== wallets.reduce((acc, wallet) => acc + Number(wallet.amount), 0)) {
        logger.addLog('EXECUTE_TGE_ERROR', { error: 'Total supply does not match the sum of wallets amounts' });
        throw new Error('Total supply does not match the sum of wallets amounts');
    }

    // Get contract instances from deployment state
    const tokenContract = this.getContract('RAACToken');
    // const orchestratorContract = await this.getContractArtifact('RAACOrchestrator');

    // Set deployer as minter
    console.log(tokenContract);
    // Check if minter is already set
    const minter = await tokenContract.minter();
    if(minter !== await this.signer.getAddress()) {
        // Set minter
        const setMinterTx = await tokenContract.setMinter(await this.signer.getAddress());
        await setMinterTx.wait();
        logger.addLog('EXECUTE_TGE_SET_MINTER', { address: await this.signer.getAddress() });
    }
    
    // Check if minter is already in whitelist
    const isMinterInWhitelist = await tokenContract.isWhitelisted(await this.signer.getAddress());
    if(!isMinterInWhitelist) {
        // Add minter to whitelist
        const addMinterToWhitelistTx = await tokenContract.manageWhitelist(await this.signer.getAddress(), true);
        await addMinterToWhitelistTx.wait();
        logger.addLog('EXECUTE_TGE_WHITELIST', { address: await this.signer.getAddress(), action: 'add' });
    }

    // console.log(setMinterTx);

    // Mint total supply to deployer first
    const deployerAddress = await this.signer.getAddress();
    logger.addLog('EXECUTE_TGE_MINT', { totalSupply, to: deployerAddress });
    
    const totalSupplyWAD = ethers.parseEther(totalSupply.toString());
    const mintTx = await tokenContract.mint(deployerAddress, totalSupplyWAD);
    await mintTx.wait();

    // Process each wallet distribution
    for(const wallet of wallets) {
        const { address, amount, type, schedules } = wallet;
        
        // if (schedules && schedules.length > 0) {
        //     // This is a locked allocation
        //     logger.addLog('EXECUTE_TGE_LOCKING', { address, amount, type, schedules });
            
        //     // First approve orchestrator to spend tokens
        //     const approveTx = await tokenContract.approve(orchestratorContract.address, amount);
        //     await approveTx.wait();

        //     // For each schedule, create a lock
        //     for (const schedule of schedules) {
        //         const { start, end, type: scheduleType } = schedule;
                
        //         const lockTx = await orchestratorContract.createLock(
        //             tokenContract.address,
        //             address,
        //             amount,
        //             start,
        //             end,
        //             scheduleType
        //         );
        //         await lockTx.wait();
                
        //         logger.addLog('EXECUTE_TGE_LOCKED', { 
        //             address, 
        //             amount, 
        //             start, 
        //             end, 
        //             scheduleType 
        //         });
        //     }
        // } else {
            // This is a direct transfer
            logger.addLog('EXECUTE_TGE_TRANSFER', { address, amount, type });
            
            const transferTx = await tokenContract.transfer(address, ethers.parseEther(amount.toString()));
            await transferTx.wait();
        // }
    }

    logger.addLog('EXECUTE_TGE_SUCCESS', { tgePrepared });
    return { success: true, totalSupply, distributedWallets: wallets.length };
}